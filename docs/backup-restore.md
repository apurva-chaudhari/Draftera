# Backup and restore

A backup is **one file** holding every database record and every stored drawing PDF, compressed and (recommended) encrypted with AES-256. A footer carries checksums, so a damaged or edited backup is detected before anything is restored.

All commands run in `server/` with the same `.env` as the API.

## Make a backup
```
npm run backup
```
Writes `backups/draftera-<date>.dbk` (the folder is git-ignored: backups contain personal data). Set `BACKUP_PASSPHRASE` in `.env` first to encrypt it, and keep a copy of the passphrase somewhere safe: without it the file cannot be read.

## Prove it works (do this monthly and after each deployment)
```
npm run backup:verify
```
Makes a fresh backup, restores it into a throw-away database on the same cluster, reads every restored record back and compares it with the backup, then deletes the throw-away database. Your live data is only read. A backup nobody has restored is only a hope.

## Restore
Safest routine: restore into a **new** database name, look at it, then switch over.
```
npm run restore -- backups/<file>.dbk --db draftera_restored
```
Then set `MONGODB_URI` to point at `draftera_restored`. Other options:
- Restoring into a database that already has data is refused.
- `--replace --yes` wipes the backed-up collections first and restores over them.
- `--no-files` skips re-uploading the PDFs.

The restore verifies the backup first, writes nothing if it is invalid, and afterwards reads the data back and compares it to the backup.

## What is tested
`tests/backup.test.js` (15 tests, no database needed) proves: an exact round trip; encryption works and a wrong passphrase is refused; tampering, truncation and corrupt PDFs are detected; an invalid backup writes nothing; large collections restore without loss or duplicates.

## Rehearsal (do this once before you rely on it)
1. `npm run backup`, then `npm run backup:verify`.
2. `npm run restore -- backups/<file>.dbk --db draftera_rehearsal`.
3. Temporarily set `MONGODB_URI` to the `draftera_rehearsal` database, start the app, sign in and open a drawing PDF.
4. Restore the original `MONGODB_URI` and drop the rehearsal database in Atlas.
