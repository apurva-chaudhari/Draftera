/**
 * Backup / restore engine tests. They use an in-memory fake database and a
 * small stand-in for MongoDB's EJSON, so they need no MongoDB. The real
 * round trip against your own database is `npm run backup:verify`.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const zlib = require("node:zlib");

const { createBackup, verifyBackup, restoreBackup, verifyRestored } = require("../utils/backup");

// ---- stand-ins -----------------------------------------------------------

class Oid { constructor(hex) { this.hex = hex; } }

const ejson = {
  stringify(value) {
    const ser = (v) => {
      if (v instanceof Oid) return { $oid: v.hex };
      if (v instanceof Date) return { $date: { $numberLong: String(v.getTime()) } };
      if (Array.isArray(v)) return v.map(ser);
      if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, ser(x)]));
      return v;
    };
    return JSON.stringify(ser(value));
  },
  deserialize(value) {
    const de = (v) => {
      if (v && typeof v === "object") {
        if ("$oid" in v) return new Oid(v.$oid);
        if ("$date" in v) return new Date(Number(v.$date.$numberLong));
        if (Array.isArray(v)) return v.map(de);
        return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, de(x)]));
      }
      return v;
    };
    return de(value);
  },
};

// structuredClone would strip class identity (Oid), so copy by hand.
function clone(v) {
  if (v instanceof Oid) return new Oid(v.hex);
  if (v instanceof Date) return new Date(v.getTime());
  if (Array.isArray(v)) return v.map(clone);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clone(x)]));
  return v;
}

class FakeDb {
  constructor(data = {}) { this.data = data; this.inserts = 0; }
  collection(name) {
    const db = this;
    db.data[name] ??= [];
    return {
      find: () => (async function* () { for (const d of db.data[name]) yield clone(d); })(),
      insertMany: async (batch) => { db.inserts += 1; db.data[name].push(...batch); },
      countDocuments: async () => db.data[name].length,
      drop: async () => { db.data[name] = []; },
    };
  }
}

const sampleDb = () =>
  new FakeDb({
    users: [
      { _id: new Oid("a".repeat(24)), name: "Imran Khan", email: "imran@gmail.com", createdAt: new Date("2026-10-01T10:00:00Z") },
      { _id: new Oid("b".repeat(24)), name: "Priya \"P\" Nair ✓", email: "priya@gmail.com", createdAt: new Date("2026-10-02T10:00:00Z") },
    ],
    projects: [{ _id: new Oid("c".repeat(24)), code: "DEMO", members: [{ user: new Oid("a".repeat(24)), role: "subcontractor" }] }],
    drawingrevisions: [{ _id: new Oid("d".repeat(24)), revisionNumber: "B", file: { storageKey: "p/rev-b.pdf" } }],
  });

const COLLECTIONS = ["users", "projects", "drawingrevisions", "acknowledgments"];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "draftera-backup-test-"));
test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
let n = 0;
const newFile = () => path.join(tmp, `b${(n += 1)}.dbk`);

// Compare databases by serialising both sides the same way.
const snapshot = (db) => JSON.stringify(Object.fromEntries(COLLECTIONS.map((c) => [c, db.data[c]?.map((d) => ejson.stringify(d)) ?? []])));

const PDF = Buffer.from("%PDF-1.4 fake drawing bytes");
const fileSource = async (key) => (key === "p/rev-b.pdf" ? PDF : null);

// ---- tests ---------------------------------------------------------------

test("a backup verifies and restores into an empty database exactly", async () => {
  const source = sampleDb();
  const file = newFile();
  const result = await createBackup({ db: source, collections: COLLECTIONS, file, ejson, fileSource });

  assert.deepEqual(result.counts, { users: 2, projects: 1, drawingrevisions: 1, acknowledgments: 0 });
  assert.equal(result.files.count, 1);
  assert.deepEqual(result.missingFiles, []);

  const check = await verifyBackup(file);
  assert.equal(check.ok, true, check.problems.join("; "));

  const target = new FakeDb();
  const sunk = new Map();
  const restored = await restoreBackup(file, { db: target, ejson, fileSink: async (k, b) => sunk.set(k, b) });

  assert.equal(snapshot(target), snapshot(source));
  assert.equal(restored.restoredFiles, 1);
  assert.ok(sunk.get("p/rev-b.pdf").equals(PDF), "PDF bytes are identical after restore");
  assert.ok(target.data.users[0]._id instanceof Oid, "ObjectIds come back as ObjectIds");
  assert.ok(target.data.users[0].createdAt instanceof Date, "dates come back as dates");
  assert.equal(target.data.users[1].name, 'Priya "P" Nair ✓', "unicode and quotes survive");
});

test("no temporary file is left behind and the final file only appears on success", async () => {
  const file = newFile();
  const broken = { collection: () => ({ find: () => (async function* () { throw new Error("db went away"); })() }) };
  await assert.rejects(() => createBackup({ db: broken, collections: ["users"], file, ejson }), /db went away/);
  assert.equal(fs.existsSync(file), false);
  assert.equal(fs.existsSync(`${file}.partial`), false);
});

test("encrypted backups round-trip, and the file does not contain readable data", async () => {
  const source = sampleDb();
  const file = newFile();
  const result = await createBackup({ db: source, collections: COLLECTIONS, file, ejson, passphrase: "correct horse battery" });
  assert.equal(result.encrypted, true);

  const raw = fs.readFileSync(file);
  assert.ok(!raw.includes("imran@gmail.com"));
  assert.ok(!raw.toString("latin1").includes("Imran"));

  assert.equal((await verifyBackup(file, { passphrase: "correct horse battery" })).ok, true);

  const target = new FakeDb();
  await restoreBackup(file, { db: target, ejson, passphrase: "correct horse battery" });
  assert.equal(snapshot(target), snapshot(source));
});

test("a wrong or missing passphrase is refused with a clear message", async () => {
  const file = newFile();
  await createBackup({ db: sampleDb(), collections: COLLECTIONS, file, ejson, passphrase: "right-one" });

  const wrong = await verifyBackup(file, { passphrase: "wrong-one" });
  assert.equal(wrong.ok, false);
  assert.match(wrong.problems[0], /Wrong passphrase/);

  const missing = await verifyBackup(file);
  assert.equal(missing.ok, false);
  assert.match(missing.problems[0], /encrypted/);

  const target = new FakeDb();
  await assert.rejects(() => restoreBackup(file, { db: target, ejson, passphrase: "wrong-one" }), /nothing was restored/);
  assert.equal(target.inserts, 0);
});

test("tampering with an encrypted backup is detected", async () => {
  const file = newFile();
  await createBackup({ db: sampleDb(), collections: COLLECTIONS, file, ejson, passphrase: "pw" });
  const raw = fs.readFileSync(file);
  raw[Math.floor(raw.length / 2)] ^= 0xff;
  fs.writeFileSync(file, raw);
  assert.equal((await verifyBackup(file, { passphrase: "pw" })).ok, false);
});

test("corruption, truncation and non-backup files are all detected", async () => {
  const file = newFile();
  await createBackup({ db: sampleDb(), collections: COLLECTIONS, file, ejson });
  const good = fs.readFileSync(file);

  const flipped = newFile();
  const copy = Buffer.from(good);
  copy[Math.floor(copy.length / 2)] ^= 0xff;
  fs.writeFileSync(flipped, copy);
  assert.equal((await verifyBackup(flipped)).ok, false);

  const truncated = newFile();
  fs.writeFileSync(truncated, good.subarray(0, Math.floor(good.length / 2)));
  assert.equal((await verifyBackup(truncated)).ok, false);

  const junk = newFile();
  fs.writeFileSync(junk, "this is not a backup");
  assert.equal((await verifyBackup(junk)).ok, false);

  const gzipOfOtherText = newFile();
  fs.writeFileSync(gzipOfOtherText, zlib.gzipSync('{"hello":"world"}\n'));
  const other = await verifyBackup(gzipOfOtherText);
  assert.equal(other.ok, false);
});

test("an edit to the data inside a validly compressed file is caught by the checksum", async () => {
  const file = newFile();
  await createBackup({ db: sampleDb(), collections: COLLECTIONS, file, ejson });

  const text = zlib.gunzipSync(fs.readFileSync(file)).toString("utf8");
  assert.ok(text.includes("Imran Khan"));
  const forged = newFile();
  fs.writeFileSync(forged, zlib.gzipSync(text.replace("Imran Khan", "Imran Kham")));

  const check = await verifyBackup(forged);
  assert.equal(check.ok, false);
  assert.ok(check.problems.some((p) => /checksum/.test(p)), check.problems.join("; "));
});

test("a damaged stored PDF is caught", async () => {
  const file = newFile();
  await createBackup({ db: sampleDb(), collections: COLLECTIONS, file, ejson, fileSource });

  const lines = zlib.gunzipSync(fs.readFileSync(file)).toString("utf8").split("\n");
  const index = lines.findIndex((l) => l.startsWith('{"t":"file"'));
  const entry = JSON.parse(lines[index]);
  entry.data = Buffer.from("%PDF-1.4 other bytes!!!!!!!!!").toString("base64");
  lines[index] = JSON.stringify(entry);

  const forged = newFile();
  fs.writeFileSync(forged, zlib.gzipSync(lines.join("\n")));
  const check = await verifyBackup(forged);
  assert.equal(check.ok, false);
});

test("restore refuses to write into a database that already has data", async () => {
  const file = newFile();
  await createBackup({ db: sampleDb(), collections: COLLECTIONS, file, ejson });

  const target = sampleDb();
  const before = snapshot(target);
  await assert.rejects(() => restoreBackup(file, { db: target, ejson }), /not empty/);
  assert.equal(snapshot(target), before, "existing data untouched");
});

test("--replace swaps the existing data for the backup", async () => {
  const source = sampleDb();
  const file = newFile();
  await createBackup({ db: source, collections: COLLECTIONS, file, ejson });

  const target = new FakeDb({ users: [{ _id: new Oid("e".repeat(24)), name: "Stale" }], acknowledgments: [{ _id: new Oid("f".repeat(24)) }] });
  await restoreBackup(file, { db: target, ejson, replace: true });
  assert.equal(snapshot(target), snapshot(source));
});

test("an invalid backup writes nothing, even with replace", async () => {
  const file = newFile();
  fs.writeFileSync(file, zlib.gzipSync("garbage\n"));
  const target = new FakeDb({ users: [{ _id: new Oid("e".repeat(24)), name: "Keep me" }] });
  await assert.rejects(() => restoreBackup(file, { db: target, ejson, replace: true }), /nothing was restored/);
  assert.equal(target.data.users.length, 1);
  assert.equal(target.inserts, 0);
});

test("a file listed in the database but missing from storage is reported", async () => {
  const file = newFile();
  const result = await createBackup({ db: sampleDb(), collections: COLLECTIONS, file, ejson, fileSource: async () => null });
  assert.deepEqual(result.missingFiles, ["p/rev-b.pdf"]);
  assert.equal(result.files.count, 0);
  assert.equal((await verifyBackup(file)).ok, true, "the backup itself is still valid");
});

test("large collections restore in batches without losing or duplicating anything", async () => {
  const docs = Array.from({ length: 1234 }, (_, i) => ({ _id: new Oid(String(i).padStart(24, "0")), i }));
  const source = new FakeDb({ users: docs });
  const file = newFile();
  await createBackup({ db: source, collections: ["users"], file, ejson });

  const target = new FakeDb();
  const result = await restoreBackup(file, { db: target, ejson });
  assert.equal(result.counts.users, 1234);
  assert.equal(target.data.users.length, 1234);
  assert.ok(target.inserts >= 3, "inserted in batches");
  assert.deepEqual(target.data.users.map((d) => d.i), docs.map((d) => d.i), "order preserved");
});

test("restored data that differs from the backup is flagged", async () => {
  const source = sampleDb();
  const file = newFile();
  await createBackup({ db: source, collections: COLLECTIONS, file, ejson });
  const { footer } = await verifyBackup(file);

  const target = new FakeDb();
  await restoreBackup(file, { db: target, ejson });
  assert.equal((await verifyRestored(target, footer, { ejson })).ok, true);

  target.data.users[0].name = "Changed after restore";
  const drift = await verifyRestored(target, footer, { ejson });
  assert.equal(drift.ok, false);
  assert.match(drift.problems[0], /users/);
});

test("backing up an empty database works and restores to empty", async () => {
  const file = newFile();
  await createBackup({ db: new FakeDb(), collections: COLLECTIONS, file, ejson });
  assert.equal((await verifyBackup(file)).ok, true);
  const target = new FakeDb();
  const result = await restoreBackup(file, { db: target, ejson });
  assert.deepEqual(Object.values(result.counts), [0, 0, 0, 0]);
});
