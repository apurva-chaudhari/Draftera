/**
 * Restore a backup file.
 *
 *   npm run restore -- <file>                      restore into an EMPTY database
 *   npm run restore -- <file> --db draftera_new    ...a different database name
 *   npm run restore -- <file> --replace --yes      overwrite what is there
 *   npm run restore -- <file> --no-files           skip uploading drawing PDFs
 *
 * Safest routine: restore into a NEW database name with --db, check the app
 * against it, then point MONGODB_URI at it. --replace deletes the current
 * data of the backed-up collections first and needs --yes.
 *
 * Encrypted backups need BACKUP_PASSPHRASE in the environment.
 */
require("dotenv").config();

const path = require("node:path");

const { restoreBackup, verifyBackup } = require("../utils/backup");
const rt = require("../utils/backupRuntime");

async function main() {
  const { flags, positional } = rt.parseArgs(process.argv.slice(2), ["db"]);
  const file = positional[0] && path.resolve(positional[0]);
  const passphrase = process.env.BACKUP_PASSPHRASE || null;

  if (!file) {
    console.error("Usage: npm run restore -- <backup-file> [--db name] [--replace --yes] [--no-files]");
    process.exitCode = 1;
    return;
  }

  console.log("Checking the backup file...");
  const check = await verifyBackup(file, { passphrase });
  if (!check.ok) throw new Error(`Backup failed verification, nothing was restored:\n - ${check.problems.join("\n - ")}`);

  const client = await rt.openClient(process.env.MONGODB_URI);

  try {
    const db = flags.db ? client.db(flags.db) : client.db();

    console.log(`Backup from ${check.header.createdAt} (database "${check.header.database}"), ${Object.values(check.counts).reduce((a, b) => a + b, 0)} documents, ${check.files.count} files.`);
    console.log(`Restoring into database "${db.databaseName}"${flags.replace ? " (REPLACING existing data)" : ""}.`);

    if (flags.replace && !flags.yes) {
      throw new Error(`--replace deletes the current data in "${db.databaseName}". Add --yes to confirm.`);
    }

    const withFiles = !flags["no-files"] && check.files.count > 0;

    const result = await restoreBackup(file, {
      db,
      passphrase,
      ejson: rt.ejson(),
      replace: Boolean(flags.replace),
      fileSink: withFiles ? rt.storageFiles().fileSink : null,
    });

    await rt.createIndexes(db);

    console.log("\nRestore complete and verified against the backup:");
    for (const [name, count] of Object.entries(result.counts)) console.log(`  ${name}: ${count}`);
    if (withFiles) console.log(`  drawing files uploaded: ${result.restoredFiles}`);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error("Restore failed:", error.message);
  process.exitCode = 1;
});
