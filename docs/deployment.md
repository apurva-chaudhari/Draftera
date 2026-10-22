# Deployment Guide

Architecture: **Vercel** (React client) → **Render** (Express API) → **MongoDB Atlas** + **Supabase Storage**. Optional: Brevo (email), Google Gemini (AI assistant).

## 1. Database (MongoDB Atlas)
1. Create a free cluster, a database user, and allow network access from `0.0.0.0/0` (Render IPs change).
2. Copy the connection string into `MONGODB_URI`. Use a replica-set cluster (Atlas default); publishing uses transactions.

## 2. Storage (Supabase)
1. Create a project, then a **private** bucket named `drawing-revisions`.
2. Copy the project URL and the `service_role` key. The key must only ever live in the API's environment.

## 3. API on Render
1. New → Blueprint (or Web Service) → connect the GitHub repo. `render.yaml` preconfigures it (root dir `server`, Node 22, `npm ci`, `npm start`, health check).
2. Set the environment variables:

| Variable | Required | Notes |
| --- | --- | --- |
| `MONGODB_URI` | yes | Atlas string, database name at the end |
| `JWT_SECRET` | yes | 32+ random characters: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | yes | From step 2 |
| `CLIENT_URL` | yes | Your Vercel address, https, no trailing slash. Comma separated for several |
| `NODE_ENV` | yes | `production` (set by `render.yaml`) |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | no | AI assistant. Default model `gemini-3.1-flash-lite`. Empty key = assistant off |
| `BREVO_API_KEY`, `MAIL_FROM` | no | Email, see `notifications.md` |
| `APP_URL`, `COOKIE_SAMESITE` | no | Email links; cookie mode (section 5) |

   **The API refuses to start if a required value is missing or wrong** and lists the problems in the Render log. Optional features that are off are logged as warnings.
3. Check `https://<api>.onrender.com/api/health` returns `database: "connected"`. Free instances sleep: the first request after idle can take ~30 s.

### Gemini models retire
Google retires models on a schedule. If asking the assistant fails and the Render log shows `404 ... model ... not available`, set `GEMINI_MODEL` to a current model (check Google's *Gemini deprecations* page) and redeploy. No code change is needed.

## 4. Client on Vercel
1. Import the repo, set **Root Directory** to `client`.
2. Environment variable: `VITE_API_BASE_URL=https://<api>.onrender.com/api`.
3. Deploy. `client/vercel.json` rewrites all routes to `index.html` (deep links) and adds security headers.
4. Add the Vercel URL to `CLIENT_URL` on Render and redeploy the API.

## 5. Sign-in cookie (the main deployment risk)
The session is an `HttpOnly` cookie. With the API on Render and the app on Vercel it is sent cross-site, which works in Chrome/Edge/Firefox because production uses `SameSite=None; Secure`. **Safari and iOS block third-party cookies, so sign-in may appear to succeed and then bounce back to the login page.** Test on an iPhone before launch.

If sign-in loops: first check `CLIENT_URL` exactly matches the Vercel address. If it does and Safari still fails, make the API same-site:
- **Vercel proxy:** add a rewrite `{ "source": "/api/(.*)", "destination": "https://<api>.onrender.com/api/$1" }` before the catch-all in `client/vercel.json`, set `VITE_API_BASE_URL=/api` on Vercel and `COOKIE_SAMESITE=lax` on Render. Test a 10 MB PDF upload through the proxy.
- **Custom domain:** serve both from one registrable domain (e.g. `app.example.com` and `api.example.com`) and set `COOKIE_SAMESITE=lax`.

## 6. Demo data (local only)
`npm run seed` creates demo accounts whose password is public in this repository. **Never seed a database real people use.** The script refuses to run when `NODE_ENV=production` unless you add `--allow-production`. There are no demo buttons on the sign-in page.

## 7. Post-deploy checklist
- [ ] `/api/health` shows `database: "connected"`; Render log shows no `Config warning` you did not expect
- [ ] Register, sign in, create a project; sign in works on a phone and on Safari
- [ ] Upload, publish, open and acknowledge a revision
- [ ] A second user who is not on the project gets a 403
- [ ] Opening a PDF link after 2 minutes fails (signed URL expired)
- [ ] Switch the language to Hindi and Marathi; the choice survives a reload
- [ ] If enabled: ask the assistant a question; confirm the revision is not marked as opened
- [ ] If enabled: a reminder email arrives (use a real, non-demo address)

Firebase Hosting is a valid alternative for the client: `firebase init hosting`, public dir `client/dist`, single-page rewrite to `/index.html`.
