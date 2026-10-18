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
| Clarifications | Questions and answers attached to the revision, with an explicit resolve step |
| Audit trail | Every action recorded with user and time |
| Access control | Per-project roles, private files, expiring signed links |

Acknowledgment means *receipt*, not approval or understanding. The UI says so.

## Tech stack

React 19 + Vite · Express 5 · MongoDB Atlas (Mongoose) · Supabase Storage · JWT auth · Vercel + Render

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
npm run seed              # optional demo data
npm run dev               # http://localhost:5000

# Client
cd client
cp .env.example .env
npm install
npm run dev               # http://localhost:5173
```

Create a **private** Supabase bucket called `drawing-revisions` first.

## Tests

```bash
cd server && npm test     # currency logic + API access rules
cd client && npm run lint
```

## API overview

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register`, `/login` | Account access |
| GET/POST | `/api/projects` | List / create projects |
| GET | `/api/projects/:id` | Project and team |
| POST | `/api/projects/:id/members` | Add a team member (supervisor) |
| GET | `/api/projects/:id/currency` | Revision currency matrix (supervisor) |
| GET | `/api/projects/:id/activity` | Audit trail |
| POST | `/api/drawings/upload` | Upload a draft revision |
| POST | `/api/drawings/:id/publish` | Publish to recipients |
| POST | `/api/drawings/revision/:id/recipients` | Issue to people left off |
| GET | `/api/drawings/revision/:id` | Revision detail |
| POST | `/api/drawings/revision/:id/open` | Signed file link, records first view |
| POST | `/api/acknowledgments/:id/acknowledge` | Acknowledge receipt |
| POST | `/api/acknowledgments/:id/remind/:userId` | Record a reminder |
| POST/PATCH | `/api/clarifications/...` | Ask, answer, resolve |

## Documentation

[Problem analysis](docs/problem-analysis.md) · [Evidence register](docs/evidence-register.md) · [Requirements](docs/requirements.md) · [Architecture](docs/system-architecture.md) · [**Design decisions and trade-offs**](docs/design-decisions.md) · [Demo script](docs/demo-script.md) · [Deployment](docs/deployment.md) · [Defense notes](docs/defense-notes.md)

## Known limitations

No offline mode, no email/SMS delivery, no member removal, JWT stored in `localStorage`. See [design decisions](docs/design-decisions.md#5-constraints-and-honest-limitations).
