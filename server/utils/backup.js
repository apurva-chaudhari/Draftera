/**
 * Backup and restore engine.
 *
 * A backup is ONE file:
 *   newline-delimited JSON  ->  gzip  ->  (optional) AES-256-GCM encryption
 *
 * Lines, in order:
 *   header  format version, time, database name
 *   doc     one per database document (MongoDB Extended JSON, canonical, so
 *           ObjectIds and Dates survive exactly)
 *   file    one per stored drawing PDF (base64, with size and sha256)
 *   footer  per-collection counts and digests, plus a sha256 over every
 *           line above it
 *
 * The footer is what makes a backup trustworthy: restoring first re-reads
 * the whole file and checks the checksum, counts, digests and every PDF, and
 * only then writes anything. After writing, the restored data is read back
 * from the database and compared to the same digests.
 *
 * This module never talks to MongoDB or Supabase directly. It is handed:
 *   db          anything with db.collection(name) -> { find(), insertMany(),
 *               countDocuments(), drop() } (the MongoDB driver's Db fits)
 *   ejson       MongoDB's EJSON (mongoose.mongo.BSON.EJSON)
 *   fileSource  async (storageKey) => Buffer | null   (backup)
 *   fileSink    async (storageKey, Buffer) => void     (restore)
 * which keeps it testable without a database.
 */
const fs = require("node:fs");
const crypto = require("node:crypto");
const zlib = require("node:zlib");
const { once } = require("node:events");
const { PassThrough, Readable, pipeline } = require("node:stream");
const { pipeline: pipelineAsync } = require("node:stream/promises");

const FORMAT = "draftera-backup";
const VERSION = 1;
const MAGIC = Buffer.from("DFTENC1\0"); // marks an encrypted backup
const SALT_BYTES = 16;
const IV_BYTES = 12;
const CHECK_BYTES = 16;
const TAG_BYTES = 16;
const HEADER_BYTES = MAGIC.length + SALT_BYTES + IV_BYTES + CHECK_BYTES;
const BATCH_SIZE = 500;

const sha256 = (data) => crypto.createHash("sha256").update(data).digest("hex");

function defaultFileKey(collection, doc) {
  return collection === "drawingrevisions" ? doc?.file?.storageKey || null : null;
}

/** Order-independent fingerprint of a set of documents (XOR of hashes). */
function makeDigest() {
  const acc = Buffer.alloc(32);
  return {
    add(text) {
      const h = crypto.createHash("sha256").update(text).digest();
      for (let i = 0; i < 32; i += 1) acc[i] ^= h[i];
    },
    hex: () => acc.toString("hex"),
  };
}

function deriveKey(passphrase, salt) {
  return crypto.scryptSync(passphrase, salt, 32);
}

/**
 * Stored in the header so a wrong passphrase is reported as such straight
 * away, instead of surfacing later as confusing decompression noise.
 */
function keyCheck(key) {
  return crypto.createHmac("sha256", key).update("draftera-backup-key-check").digest().subarray(0, CHECK_BYTES);
}

const noop = () => {};

// ---------------------------------------------------------------- writing

async function openWriter(file, passphrase) {
  const source = new PassThrough();
  const gzip = zlib.createGzip();
  const out = fs.createWriteStream(file);

  let stages;
  if (passphrase) {
    const salt = crypto.randomBytes(SALT_BYTES);
    const iv = crypto.randomBytes(IV_BYTES);
    const key = deriveKey(passphrase, salt);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

    stages = [
      source,
      gzip,
      async function* encrypt(input) {
        yield MAGIC;
        yield salt;
        yield iv;
        yield keyCheck(key);
        for await (const chunk of input) yield cipher.update(chunk);
        yield cipher.final();
        yield cipher.getAuthTag();
      },
      out,
    ];
  } else {
    stages = [source, gzip, out];
  }

  const finished = pipelineAsync(...stages);
  finished.catch(noop); // surfaced by write()/close(); avoids an unhandled rejection

  return {
    async write(line) {
      if (!source.write(`${line}\n`)) {
        await Promise.race([once(source, "drain"), finished]);
      }
    },
    async close() {
      source.end();
      await finished;
    },
    abort() {
      source.destroy();
    },
  };
}

/**
 * Write a backup file. Returns { file, counts, digests, files, missingFiles }.
 * The file is written under a temporary name and renamed only on success, so
 * a half-written backup can never be mistaken for a good one.
 */
async function createBackup({
  db,
  collections,
  file,
  passphrase = null,
  ejson,
  fileSource = null,
  fileKeyOf = defaultFileKey,
  databaseName = "",
  now = new Date(),
}) {
  const partial = `${file}.partial`;
  const writer = await openWriter(partial, passphrase);
  const hash = crypto.createHash("sha256");
  const counts = {};
  const digests = {};
  const fileKeys = new Set();

  const emit = async (line) => {
    hash.update(`${line}\n`);
    await writer.write(line);
  };

  try {
    await emit(
      JSON.stringify({ t: "header", format: FORMAT, version: VERSION, createdAt: now.toISOString(), database: databaseName, collections })
    );

    for (const name of collections) {
      const digest = makeDigest();
      let count = 0;

      for await (const doc of db.collection(name).find({})) {
        const text = ejson.stringify(doc, { relaxed: false });
        digest.add(text);
        count += 1;
        const key = fileKeyOf(name, doc);
        if (key) fileKeys.add(key);
        await emit(`{"t":"doc","c":${JSON.stringify(name)},"d":${text}}`);
      }

      counts[name] = count;
      digests[name] = digest.hex();
    }

    const files = { count: 0, bytes: 0 };
    const missingFiles = [];

    if (fileSource) {
      for (const key of fileKeys) {
        let buffer = null;
        try {
          buffer = await fileSource(key);
        } catch {
          buffer = null;
        }

        if (!buffer) {
          missingFiles.push(key);
          continue;
        }

        files.count += 1;
        files.bytes += buffer.length;
        await emit(JSON.stringify({ t: "file", key, size: buffer.length, sha256: sha256(buffer), data: buffer.toString("base64") }));
      }
    }

    const footer = { t: "footer", counts, digests, files, missingFiles, filesIncluded: Boolean(fileSource), sha256: hash.digest("hex") };
    await writer.write(JSON.stringify(footer));
    await writer.close();
    fs.renameSync(partial, file);

    return { file, counts, digests, files, missingFiles, encrypted: Boolean(passphrase) };
  } catch (error) {
    writer.abort();
    fs.rmSync(partial, { force: true });
    throw error;
  }
}

// ---------------------------------------------------------------- reading

/** Yield the lines of a backup, decrypting and decompressing as needed. */
async function* readLines(file, passphrase) {
  const size = fs.statSync(file).size;
  const fd = fs.openSync(file, "r");
  let encrypted = false;
  let head = Buffer.alloc(0);

  try {
    head = Buffer.alloc(HEADER_BYTES);
    fs.readSync(fd, head, 0, HEADER_BYTES, 0);
    encrypted = head.subarray(0, MAGIC.length).equals(MAGIC);
  } finally {
    fs.closeSync(fd);
  }

  const gunzip = zlib.createGunzip();
  let text;

  if (encrypted) {
    if (!passphrase) throw new Error("This backup is encrypted. Set BACKUP_PASSPHRASE to open it.");
    if (size < HEADER_BYTES + TAG_BYTES) throw new Error("The backup file is truncated.");

    const tagFd = fs.openSync(file, "r");
    const tag = Buffer.alloc(TAG_BYTES);
    fs.readSync(tagFd, tag, 0, TAG_BYTES, size - TAG_BYTES);
    fs.closeSync(tagFd);

    const salt = head.subarray(MAGIC.length, MAGIC.length + SALT_BYTES);
    const iv = head.subarray(MAGIC.length + SALT_BYTES, MAGIC.length + SALT_BYTES + IV_BYTES);
    const check = head.subarray(HEADER_BYTES - CHECK_BYTES, HEADER_BYTES);
    const key = deriveKey(passphrase, salt);

    if (!crypto.timingSafeEqual(check, keyCheck(key))) {
      throw new Error("Wrong passphrase for this backup.");
    }

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);

    const body = fs.createReadStream(file, { start: HEADER_BYTES, end: size - TAG_BYTES - 1 });
    const decrypted = Readable.from(
      (async function* decrypt() {
        try {
          for await (const chunk of body) yield decipher.update(chunk);
          yield decipher.final();
        } catch (error) {
          if (/authenticate/i.test(error.message)) {
            throw new Error("Wrong passphrase, or the backup file is damaged.");
          }
          throw error;
        }
      })()
    );
    text = pipeline(decrypted, gunzip, noop);
  } else {
    text = pipeline(fs.createReadStream(file), gunzip, noop);
  }

  text.setEncoding("utf8");
  let pending = "";

  try {
    for await (const chunk of text) {
      pending += chunk;
      let index;
      while ((index = pending.indexOf("\n")) !== -1) {
        const line = pending.slice(0, index);
        pending = pending.slice(index + 1);
        if (line) yield line;
      }
    }
  } catch (error) {
    if (/incorrect (header|data) check|unexpected end of file|invalid/i.test(error.message)) {
      throw new Error("The backup file is damaged or is not a Draftera backup.");
    }
    throw error;
  }

  if (pending.trim()) yield pending;
}

const DOC_PREFIX = /^\{"t":"doc","c":("(?:[^"\\]|\\.)*"),"d":/;

/**
 * Read the whole backup and check it is intact. Nothing is written anywhere.
 * Returns { ok, problems, header, footer, counts, files }.
 */
async function verifyBackup(file, { passphrase = null } = {}) {
  const problems = [];
  const hash = crypto.createHash("sha256");
  const counts = {};
  const digests = {};
  const files = { count: 0, bytes: 0 };
  let header = null;
  let footer = null;

  try {
    for await (const line of readLines(file, passphrase)) {
      if (footer) {
        problems.push("Unexpected data after the end of the backup.");
        break;
      }

      if (line.startsWith('{"t":"footer"')) {
        footer = JSON.parse(line);
        continue;
      }

      hash.update(`${line}\n`);

      if (line.startsWith('{"t":"doc"')) {
        const match = DOC_PREFIX.exec(line);
        if (!match) {
          problems.push("A document line is malformed.");
          continue;
        }
        const name = JSON.parse(match[1]);
        digests[name] ??= makeDigest();
        digests[name].add(line.slice(match[0].length, -1));
        counts[name] = (counts[name] || 0) + 1;
      } else if (line.startsWith('{"t":"file"')) {
        const entry = JSON.parse(line);
        const buffer = Buffer.from(entry.data, "base64");
        if (buffer.length !== entry.size || sha256(buffer) !== entry.sha256) {
          problems.push(`Stored file ${entry.key} does not match its checksum.`);
        }
        files.count += 1;
        files.bytes += buffer.length;
      } else if (line.startsWith('{"t":"header"')) {
        header = JSON.parse(line);
      }
    }
  } catch (error) {
    problems.push(error.message);
  }

  if (!header || header.format !== FORMAT) problems.push("This is not a Draftera backup.");
  else if (header.version !== VERSION) problems.push(`Unsupported backup version ${header.version}.`);

  if (!footer) {
    problems.push("The backup is incomplete (no end marker).");
  } else {
    if (footer.sha256 !== hash.digest("hex")) problems.push("The backup checksum does not match: the file was altered or damaged.");

    for (const name of Object.keys(footer.counts)) {
      if ((counts[name] || 0) !== footer.counts[name]) {
        problems.push(`${name}: expected ${footer.counts[name]} documents, found ${counts[name] || 0}.`);
      }
      if ((digests[name]?.hex() ?? makeDigest().hex()) !== footer.digests[name]) {
        problems.push(`${name}: document fingerprint mismatch.`);
      }
    }

    if (files.count !== footer.files.count) {
      problems.push(`Expected ${footer.files.count} stored files, found ${files.count}.`);
    }
  }

  return { ok: problems.length === 0, problems, header, footer, counts, files };
}

/** Read every restored document back and compare it to the backup footer. */
async function verifyRestored(db, footer, { ejson }) {
  const problems = [];

  for (const name of Object.keys(footer.counts)) {
    const digest = makeDigest();
    let count = 0;

    for await (const doc of db.collection(name).find({})) {
      digest.add(ejson.stringify(doc, { relaxed: false }));
      count += 1;
    }

    if (count !== footer.counts[name]) problems.push(`${name}: restored ${count} documents, expected ${footer.counts[name]}.`);
    else if (digest.hex() !== footer.digests[name]) problems.push(`${name}: restored data differs from the backup.`);
  }

  return { ok: problems.length === 0, problems };
}

/**
 * Restore a backup into `db`.
 *
 * Safety rules:
 *  1. The backup is fully verified before anything is written.
 *  2. By default the target must be EMPTY. `replace: true` drops the backed-up
 *     collections first. The caller is responsible for confirming that.
 *  3. After writing, the restored data is read back and compared.
 */
async function restoreBackup(file, { db, passphrase = null, ejson, replace = false, fileSink = null }) {
  const check = await verifyBackup(file, { passphrase });
  if (!check.ok) {
    const error = new Error(`Backup failed verification, nothing was restored:\n - ${check.problems.join("\n - ")}`);
    error.problems = check.problems;
    throw error;
  }

  const names = Object.keys(check.footer.counts);

  if (!replace) {
    for (const name of names) {
      if ((await db.collection(name).countDocuments()) > 0) {
        throw new Error(`The target database is not empty (${name} has data). Restore into an empty database, or pass --replace.`);
      }
    }
  } else {
    for (const name of names) {
      try {
        await db.collection(name).drop();
      } catch (error) {
        if (!/ns not found|NamespaceNotFound/i.test(`${error.codeName} ${error.message}`)) throw error;
      }
    }
  }

  const batches = new Map();
  const flush = async (name) => {
    const batch = batches.get(name);
    if (batch && batch.length) {
      await db.collection(name).insertMany(batch, { ordered: true });
      batches.set(name, []);
    }
  };

  let restoredFiles = 0;

  for await (const line of readLines(file, passphrase)) {
    if (line.startsWith('{"t":"doc"')) {
      const match = DOC_PREFIX.exec(line);
      const name = JSON.parse(match[1]);
      const doc = ejson.deserialize(JSON.parse(line.slice(match[0].length, -1)), { relaxed: false });
      if (!batches.has(name)) batches.set(name, []);
      const batch = batches.get(name);
      batch.push(doc);
      if (batch.length >= BATCH_SIZE) await flush(name);
    } else if (line.startsWith('{"t":"file"') && fileSink) {
      const entry = JSON.parse(line);
      await fileSink(entry.key, Buffer.from(entry.data, "base64"));
      restoredFiles += 1;
    }
  }

  for (const name of names) await flush(name);

  const readBack = await verifyRestored(db, check.footer, { ejson });
  if (!readBack.ok) {
    throw new Error(`Restore finished but the data does not match the backup:\n - ${readBack.problems.join("\n - ")}`);
  }

  return { counts: check.footer.counts, restoredFiles, header: check.header, footer: check.footer };
}

module.exports = { createBackup, verifyBackup, restoreBackup, verifyRestored, FORMAT, VERSION };
