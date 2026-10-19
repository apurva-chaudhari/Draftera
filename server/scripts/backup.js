/**
 * Back up the database (and the drawing PDFs) into one file.
 *
 *   npm run backup                     database + PDFs
 *   npm run backup -- --no-files       database only
 *   npm run backup -- --out D:\backups choose the folder (default server/backups)
 *
 * Set BACKUP_PASSPHRASE in .env to encrypt the file (recommended: it holds
 * names, emails and password hashes). KEEP THAT PASSPHRASE SAFE: without it
 * an encrypted backup cannot be opened by anyone.
 *
 * The finished file is immediately re-read and verified.
 */
require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");

const { createBackup, verifyBackup } = require("../utils/backup");
const rt = require("../utils/backupRuntime");

async function main() {
  const { flags } = rt.parseArgs(process.argv.slice(2), ["out"]);
  const passphrase = process.env.BACKUP_PASSPHRASE || null;
  const withFiles = !flags["no-files"];
  const dir = path.resolve(flags.out || rt.defaultBackupDir());
  fs.mkdirSync(dir, { recursive: true });

  const file = path.join(dir, `draftera-${rt.timestamp()}.dbk`);
  const client = await rt.openClient(process.env.MONGODB_URI);

  try {
    const db = client.db();
    console.log(`Backing up database "${db.databaseName}"${withFiles ? " and drawing files" : " (database only)"}...`);

    const result = await createBackup({
      db,
      collections: rt.collectionNames(),
      file,
      passphrase,
      ejson: rt.ejson(),
      fileSource: withFiles ? rt.storageFiles().fileSource : null,
      databaseName: db.databaseName,
    });

    const check = await verifyBackup(file, { passphrase });
    if (!check.ok) throw new Error(`The new backup failed its own check:\n - ${check.problems.join("\n - ")}`);

    console.log(`\nBackup written and verified: ${file}`);
    console.log(`  size: ${(fs.statSync(file).size / 1024).toFixed(1)} KB, ${result.encrypted ? "encrypted" : "NOT encrypted (set BACKUP_PASSPHRASE)"}`);
    for (const [name, count] of Object.entries(result.counts)) console.log(`  ${name}: ${count}`);
    if (withFiles) console.log(`  drawing files: ${result.files.count}`);

    if (result.missingFiles.length) {
      console.error(`\nWARNING: ${result.missingFiles.length} drawing file(s) listed in the database were not found in storage:`);
      result.missingFiles.forEach((key) => console.error(`  - ${key}`));
      process.exitCode = 2;
    }
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error("Backup failed:", error.message);
  process.exitCode = 1;
});
