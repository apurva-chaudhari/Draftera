# Draftera

**Make sure everyone on site is working from the latest drawing revision.**

Built for Synckraft Technologies' internship assessment *SK-SEL-03: Drawing Revision Confusion*.

## The problem

A subcontractor builds from an old drawing while the supervisor assumes everyone received the latest one. Rework and disputes follow. The root cause is that **"sent" gets mistaken for "received"**. Draftera records evidence at every step so that gap becomes visible.

## What it does

| Capability | How |
| --- | --- |
| Controlled revisions | Upload a PDF as a draft, publish with a change summary; older revisions become *Superseded* but stay in history |
| Explicit recipients | The supervisor picks who receives each revision; omissions show up as **Not issued** |
| Delivery evidence | A recipient is "opened" only when they open the file through Draftera |
| Acknowledgment | Per person, per revision; blocked until the drawing is opened; never carries over to a new revision |
| **Revision currency** | For every drawing, who is current, pending, or **at risk** (confirmed an old revision, not the new one) |
| Deadlines | Optional "acknowledge by" time per revision; late people are flagged **Overdue** |
| Clarifications | Questions and answers attached to the revision, with an explicit resolve step |
| Revision history | Every revision of a drawing with its change note, so "what changed?" is one click |
| Distribution report | One-click CSV: who received, opened, acknowledged, who is overdue or at risk |
| AI drawing assistant | Ask a question about a revision's PDF (Google Gemini). Answers cite pages, never count as "opened", and are rate-limited per person; off unless `GEMINI_API_KEY` is set |
| Audit trail | Every action recorded with user and time; publishing writes its audit entry in the same transaction |
| Access control | Per-project roles, private files, expiring signed links |

Acknowledgment means *receipt*, not approval or understanding. The UI says so.

## Design

A light "drafting table" theme: drawing-paper background with a faint grid, blueprint-navy ink, safety-orange accents, monospaced drawing numbers, and a drawing-sheet **title block** on every revision. It works on phones (bottom navigation, card-style tables, 44 px touch targets), tablets and laptops.

## Languages

The interface is available in **English, हिन्दी (Hindi) and मराठी (Marathi)**. A language menu sits on the sign-in and register pages and in the sidebar. The choice is remembered in the browser, and the first visit follows the browser's language. Dates and times are formatted for the chosen language too.

To add or fix a translation, edit `client/src/i18n/locales/*.js`. `en.js` is the source; a unit test fails if `hi.js` or `mr.js` is missing a key or drops a `{placeholder}`. To add another language, copy `en.js`, translate the values, and register it in `client/src/i18n/core.js`.

Text that comes from the API (error messages, the activity feed, emails) is still English. See [design decisions](docs/design-decisions.md#5-constraints-and-honest-limitations).

## Tech stack

React 19 + Vite · Express 5 · MongoDB Atlas (Mongoose) · Supabase Storage · JWT auth · Google Gemini (optional) · Vercel + Render

## Project structure

```
client/src
  components/   layout, ui, projects, revisions, currency, activity
  pages/        Dashboard, Projects, ProjectDetail, RevisionDetail, MyTasks, Clarifications, Login, Register
  services/     API wrappers (one file per area)
  hooks/        useResource (data loading)
  styles/       tokens, base, layout, components, auth
server
  controllers/  request handling
  models/       Mongoose schemas
  routes/       URL to controller mapping
  middleware/   auth, upload, rate limiting
  services/     currencyService
  utils/        auth, activity log, project access, currency logic (pure, tested)
  scripts/      seed.js (demo data)
  tests/        node:test unit and smoke tests
docs/           analysis, evidence, requirements, architecture, design decisions, deployment
```

## Run locally

```bash
# API
cd server
cp .env.example .env      # fill in MongoDB, JWT secret, Supabase
npm install
npm run seed              # optional local demo data (blocked when NODE_ENV=production)
npm run dev               # http://localhost:5000

# Client
cd client
cp .env.example .env
npm install
npm run dev               # http://localhost:5173
```

Create a **private** Supabase bucket called `drawing-revisions` first.

## Environment variables

| Where | Variable | Required | Purpose |
| --- | --- | --- | --- |
| API | `MONGODB_URI`, `JWT_SECRET` (32+ chars), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | yes | The server refuses to start without them |
| API | `CLIENT_URL` | production | Allowed web origins, https, no trailing slash |
| API | `GEMINI_API_KEY`, `GEMINI_MODEL` | no | AI assistant (default model `gemini-3.1-flash-lite`) |
| API | `BREVO_API_KEY`, `MAIL_FROM` | no | Email notifications |
| API | `APP_URL`, `COOKIE_SAMESITE`, `BACKUP_PASSPHRASE` | no | Email links, cookie mode, encrypted backups |
| Client | `VITE_API_BASE_URL` | yes | API address, e.g. `https://<api>.onrender.com/api` |

## Deploying

Vercel (client) + Render (API, `render.yaml`) + MongoDB Atlas + Supabase. Step by step, with a post-deploy checklist: [docs/deployment.md](docs/deployment.md). Test sign-in on an iPhone/Safari: cross-site cookies are the main deployment risk.

## Tests

```bash
cd server && npm test                    # unit + API smoke (+ workflow suite if TEST_MONGODB_URI is set)
cd client && npm test && npm run lint && npm run build
```

The end-to-end workflow suite needs a throwaway MongoDB replica set; CI provides one. See [docs/testing.md](docs/testing.md) for every test case and the manual device checklist.

## API overview

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register`, `/login` | Account access |
| GET/POST | `/api/projects` | List / create projects |
| GET | `/api/projects/:id` | Project and team |
| POST | `/api/projects/:id/members` | Add a team member (supervisor) |
| GET | `/api/projects/:id/currency` | Revision currency matrix (supervisor) |
| GET | `/api/projects/:id/activity` | Audit trail |
| GET | `/api/projects/:id/report.csv` | Distribution report download (supervisor) |
| POST | `/api/drawings/upload` | Upload a draft revision |
| POST | `/api/drawings/:id/publish` | Publish to recipients |
| POST | `/api/drawings/revision/:id/recipients` | Issue to people left off |
| GET | `/api/drawings/revision/:id` | Revision detail |
| POST | `/api/drawings/revision/:id/open` | Signed file link, records first view |
| POST | `/api/drawings/revision/:id/ask` | Ask the AI assistant about the PDF (does not count as opening) |
| POST | `/api/acknowledgments/:id/acknowledge` | Acknowledge receipt |
| POST | `/api/acknowledgments/:id/remind/:userId` | Record a reminder |
| POST/PATCH | `/api/clarifications/...` | Ask, answer, resolve |

## Documentation

[Problem analysis](docs/problem-analysis.md) · [Evidence register](docs/evidence-register.md) · [Requirements](docs/requirements.md) · [Architecture](docs/system-architecture.md) · [**Design decisions and trade-offs**](docs/design-decisions.md) · [Testing](docs/testing.md) · [Security](docs/security.md) · [Demo script](docs/demo-script.md) · [Deployment](docs/deployment.md) · [Notifications](docs/notifications.md) · [Backup and restore](docs/backup-restore.md) · [Defense notes](docs/defense-notes.md)

## Known limitations

Interface translated, but server messages and emails are English only; AI assistant sends the drawing PDF to Google (see [security](docs/security.md)); no offline mode, no WhatsApp/SMS (email only), manual backups, stateless 8-hour cookie sessions. See [design decisions](docs/design-decisions.md#5-constraints-and-honest-limitations).
