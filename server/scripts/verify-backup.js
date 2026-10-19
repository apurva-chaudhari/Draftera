/**
 * Prove that backup and restore work, using your real data.
 *
 *   npm run backup:verify
 *
 * It makes a backup, restores it into a throw-away database on the same
 * cluster, reads every restored document back and compares it with the
 * backup, then deletes the throw-away database. Your live data is only read.
 * Run it after any deployment, and monthly. A backup nobody has restored is
 * only a hope.
 */
require("dotenv").config();

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { createBackup, restoreBackup, verifyBackup } = require("../utils/backup");
const rt = require("../utils/backupRuntime");

async function main() {
  const passphrase = process.env.BACKUP_PASSPHRASE || null;
  const client = await rt.openClient(process.env.MONGODB_URI);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "draftera-verify-"));
  const file = path.join(dir, "check.dbk");

  const live = client.db();
  const scratch = client.db(`${live.databaseName}_restorecheck_${rt.timestamp().replace("-", "")}`);

  try {
    console.log(`1/4 Backing up "${live.databaseName}" (database only)...`);
    const backup = await createBackup({
      db: live,
      collections: rt.collectionNames(),
      file,
      passphrase,
      ejson: rt.ejson(),
      databaseName: live.databaseName,
    });

    console.log("2/4 Checking the backup file...");
    const check = await verifyBackup(file, { passphrase });
    if (!check.ok) throw new Error(check.problems.join("; "));

    console.log(`3/4 Restoring into a temporary database "${scratch.databaseName}"...`);
    const restored = await restoreBackup(file, { db: scratch, passphrase, ejson: rt.ejson() });
    await rt.createIndexes(scratch);

    console.log("4/4 Comparing restored data with the backup... identical.\n");
    console.log("PASS: backup and restore work.");
    for (const name of Object.keys(restored.counts)) {
      console.log(`  ${name}: ${backup.counts[name]} backed up, ${restored.counts[name]} restored`);
    }
    console.log("\nDrawing PDFs are not part of this check; run `npm run backup` to include them.");
  } finally {
    await scratch.dropDatabase().catch(() => {});
    await client.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error("\nFAIL:", error.message);
  process.exitCode = 1;
});
