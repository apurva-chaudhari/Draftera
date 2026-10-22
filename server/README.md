# Draftera API

Express 5 + MongoDB (Mongoose) + Supabase Storage. See the [root README](../README.md) for the product overview and API table.

```bash
cp .env.example .env     # fill in the values; the server refuses to start if required ones are missing
npm install
npm run dev              # http://localhost:5000
npm test                 # unit + smoke; the workflow suite also runs when TEST_MONGODB_URI is set
```

| Script | Purpose |
| --- | --- |
| `npm start` | Production start (used by Render) |
| `npm run seed` | Local demo data. Refuses to run in production without `--allow-production` |
| `npm run backup`, `backup:verify`, `restore` | See [docs/backup-restore.md](../docs/backup-restore.md) |
| `npm run notify:overdue` | Email overdue reminders (see [docs/notifications.md](../docs/notifications.md)) |

Required environment: `MONGODB_URI`, `JWT_SECRET` (32+ characters), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and in production `CLIENT_URL`. Optional: `GEMINI_API_KEY`/`GEMINI_MODEL` (AI assistant), `BREVO_API_KEY`/`MAIL_FROM` (email), `BACKUP_PASSPHRASE`, `APP_URL`, `COOKIE_SAMESITE`. Details in [docs/deployment.md](../docs/deployment.md).
