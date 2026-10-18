# Security Notes

## If secrets have been shared, rotate them

A `.env` file contains the database password, JWT secret and Supabase service-role key. If it was ever zipped, uploaded, pasted into a chat or emailed, treat those values as exposed:

1. **MongoDB Atlas:** Database Access → edit the user → set a new password; update `MONGODB_URI`.
2. **JWT secret:** generate a new one (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`). Changing it signs everyone out.
3. **Supabase:** Project settings → API → regenerate the service-role key; update `SUPABASE_SERVICE_ROLE_KEY`.
4. Update the values in `server/.env` and in Render's environment settings.
5. Never zip or share `.env`. Share `.env.example` instead. `.gitignore` already excludes `.env`; the repository history was checked and it has never been committed.

## Controls in place

| Threat | Control |
| --- | --- |
| Password theft from a database leak | bcrypt hashes |
| Brute-force login | Rate limit on `/auth/login` and `/auth/register` |
| Privilege escalation at sign-up | Public sign-up cannot create admin or supervisor accounts |
| Reading other projects | Membership check on every project, revision, clarification and file endpoint |
| File leaks | Private bucket, 120-second signed URLs, drafts hidden from the team |
| Malicious uploads | PDF magic-byte check, 10 MB limit, sanitised file names |
| Cross-site requests | CORS allow-list from `CLIENT_URL` |
| Spreadsheet formula injection | CSV cells beginning with `= + - @` are neutralised |
| Deactivated users | Account status checked on every request |
| Lost audit data | Publish writes its audit entry inside the same transaction |

## Known gaps (documented, not hidden)

- The JWT is stored in `localStorage`, so a cross-site-scripting bug could read it. A production system should use `HttpOnly` cookies with CSRF protection.
- The rate limiter is in memory and per instance; use a shared store (e.g. Redis) when scaling out.
- No email verification or password reset yet.
- No automated backup/restore test; rely on Atlas backups and verify a restore before real use.
