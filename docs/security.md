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
| Session theft by injected script | The session token lives in an `HttpOnly` cookie (`Secure`, `SameSite=None` in production), 8-hour lifetime, cleared on sign-out. Nothing is kept in `localStorage` |
| Cross-site requests (CSRF) | CORS allow-list from `CLIENT_URL`: browsers send an `Origin` header on cross-site writes and unknown origins are refused |
| Former team members | Removal takes effect at once: every permission check reads the project's member list; their history is kept |
| Data loss | Verified, optionally encrypted backups with a tested restore (`docs/backup-restore.md`) |
| Spreadsheet formula injection | CSV cells beginning with `= + - @` are neutralised |
| Deactivated users | Account status checked on every request |
| Lost audit data | Publish writes its audit entry inside the same transaction |

## Known gaps (documented, not hidden)

- Sessions are stateless: signing out clears the cookie, but a copied token stays valid until it expires (8 hours) unless the account is deactivated. A server-side session list would allow instant revocation.
- Because the cookie is cross-site (Render + Vercel), some browsers that block third-party cookies (e.g. Safari) may refuse it. Serving the API from a subdomain of the web app's domain, with `COOKIE_SAMESITE=lax`, avoids this.
- The rate limiter is in memory and per instance; use a shared store (e.g. Redis) when scaling out.
- No email verification or password reset yet.
- Backups are run by hand (or by a scheduler you set up); they are not automatic. Run `npm run backup:verify` after each one and rehearse a restore into a scratch database before relying on it.
- Email goes out as plain notifications only; there is no WhatsApp channel and no per-user opt-out yet.
