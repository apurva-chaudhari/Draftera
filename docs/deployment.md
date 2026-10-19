# Deployment Guide

Architecture: **Vercel** (React client) → **Render** (Express API) → **MongoDB Atlas** + **Supabase Storage**.

## 1. Database (MongoDB Atlas)
1. Create a free cluster, a database user, and allow network access from `0.0.0.0/0` (Render IPs change).
2. Copy the connection string into `MONGODB_URI`. Use a replica-set cluster (Atlas default); publishing uses transactions.

## 2. Storage (Supabase)
1. Create a project, then a **private** bucket named `drawing-revisions`.
2. Copy the project URL and the `service_role` key. The key must only ever live in the API's environment.

## 3. API on Render
1. New → Web Service → connect the GitHub repo. `render.yaml` in the repo root preconfigures it (root dir `server`, build `npm install`, start `npm start`).
2. Set environment variables: `MONGODB_URI`, `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CLIENT_URL` (your Vercel URL, no trailing slash), `NODE_ENV=production`. Optional: `BREVO_API_KEY` + `MAIL_FROM` for email (see `docs/notifications.md`), `APP_URL`, `COOKIE_SAMESITE`.
3. Check `https://<api>.onrender.com/api/health` returns `database: "connected"`.
   Free instances sleep: the first request after idle can take ~30 s.

## 4. Client on Vercel
1. Import the repo, set **Root Directory** to `client`.
2. Environment variables: `VITE_API_BASE_URL=https://<api>.onrender.com/api` and optionally `VITE_SHOW_DEMO=true`.
3. Deploy. `client/vercel.json` rewrites all routes to `index.html` so deep links work.
4. Add the Vercel URL to `CLIENT_URL` on Render and redeploy the API.

## 5. Sign-in cookie
The session is an `HttpOnly` cookie. With the API on Render and the app on Vercel it is sent cross-site, which works because production uses `SameSite=None; Secure` and the API allows credentials for the origins in `CLIENT_URL`. If sign-in succeeds but you are sent straight back to the login page, check that `CLIENT_URL` exactly matches the Vercel address (https, no trailing slash) and that the browser allows third-party cookies for the site.

## 5b. Demo data (optional)
Run locally with production credentials in `server/.env`: `npm run seed`.

## 6. Post-deploy checklist
- [ ] Register, sign in, create a project
- [ ] Upload, publish, open and acknowledge a revision
- [ ] A second user who is not on the project gets a 403
- [ ] Opening a PDF link after 2 minutes fails (signed URL expired)

Firebase Hosting is a valid alternative for the client: `firebase init hosting`, public dir `client/dist`, single-page rewrite to `/index.html`.
