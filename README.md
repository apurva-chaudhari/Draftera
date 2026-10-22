# Draftera

**Make sure everyone on site is working from the latest drawing revision.**

Draftera is a construction drawing revision and acknowledgment platform built for Synckraft Technologies' internship assessment, **SK-SEL-03: Drawing Revision Confusion**.

It helps project supervisors distribute controlled drawing revisions, track recipient activity, record acknowledgments, and identify people who may still be working from an outdated revision.

**Live application:** [Open Draftera](https://draftera.vercel.app/login)  
**Backend API:** [Draftera API](https://draftera-api.onrender.com/api/health)

---

## Table of Contents

- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [Key Features](#key-features)
- [System Workflow](#system-workflow)
- [User Interface and Accessibility](#user-interface-and-accessibility)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Configuration](#environment-configuration)
- [API Overview](#api-overview)
- [Testing](#testing)
- [Deployment](#deployment)
- [Backup and Recovery](#backup-and-recovery)
- [Documentation](#documentation)
- [Known Limitations](#known-limitations)

## The Problem

On a construction site, a subcontractor may continue working from an outdated drawing while the supervisor assumes that everyone has received the latest revision.

This communication gap can lead to rework, delays, conflicting instructions, and disputes.

The underlying problem is that **sending a drawing does not prove that it was opened or acknowledged**.

Draftera addresses this gap by maintaining revision-specific distribution records, opening evidence, acknowledgment status, and an audit trail.

## The Solution

Draftera provides a centralized workflow for managing drawing revisions and tracking whether the intended recipients have acknowledged them.

Instead of relying only on informal communication, the platform makes distribution status visible and helps supervisors identify outstanding acknowledgments and revision-related risks.

## Key Features

### Drawing and Revision Management

- **Controlled revisions:** Upload drawing PDFs as drafts and publish revisions with a change summary.
- **Revision history:** Keep older revisions available for historical reference while marking them as superseded.
- **Explicit distribution:** Select the recipients who should receive each published revision.
- **Missing-recipient visibility:** Identify people who have not been issued the relevant revision.

### Recipient Tracking and Accountability

- **Opening evidence:** Record a recipient's first opening through the application's drawing-access workflow.
- **Revision-specific acknowledgment:** Require recipients to open a drawing before acknowledging receipt.
- **No acknowledgment carryover:** Acknowledging an older revision does not acknowledge a newer one.
- **Revision currency matrix:** Help supervisors identify current, pending, and at-risk recipients.
- **Deadline tracking:** Set acknowledgment deadlines and flag overdue recipients.
- **Clarifications:** Associate questions and answers with the relevant revision, with an explicit resolution step.
- **Distribution reports:** Export a CSV report containing recipient and acknowledgment status.

### Security and Auditability

- **Project-level access control:** Restrict project information and actions according to assigned roles.
- **Private drawing files:** Use private storage and temporary signed links where configured.
- **Audit trail:** Record relevant actions with the associated user and timestamp.
- **Publishing audit consistency:** Record the publishing audit entry in the same database transaction, as implemented by the application.

### AI Drawing Assistant

- Ask questions about a drawing revision using Google Gemini when the integration is configured.
- Receive answers with page references to help locate relevant drawing information.
- Keep AI-assisted questions separate from drawing-opening evidence.
- Apply per-person rate limiting.

The AI integration is optional and requires the relevant Gemini configuration.

**Important distinction:** An acknowledgment represents receipt of a revision, not approval of the drawing, confirmation of understanding, or verification that construction work complies with it.

## System Workflow

1. **Create a project:** Establish the project and manage its authorized team members.
2. **Upload a draft:** Upload the drawing PDF and prepare its revision details.
3. **Publish a revision:** Add a change summary and select the intended recipients.
4. **Access the drawing:** Recipients open the published drawing through Draftera.
5. **Acknowledge receipt:** Recipients acknowledge the specific revision after opening it.
6. **Monitor distribution:** Supervisors review pending acknowledgments, overdue recipients, missing distribution, and revision-related risks.
7. **Manage clarifications:** Record questions, answers, and resolution status against the relevant revision.
8. **Review the history:** Inspect earlier revisions and use distribution reports and the audit trail to understand what happened.

When a new revision is published, acknowledgment status is tracked separately for that revision.

## User Interface and Accessibility

Draftera uses a light, drafting-table-inspired interface with:

- Drawing-paper backgrounds and a subtle grid.
- Blueprint-navy typography and safety-orange accents.
- Monospaced drawing identifiers.
- Drawing-sheet-style title blocks.
- Responsive layouts for mobile, tablet, and desktop screens.
- Mobile-friendly navigation and touch targets.

### Multilingual Interface

The interface supports:

- English
- हिन्दी (Hindi)
- मराठी (Marathi)

The selected language is remembered in the browser, and the first visit can follow the browser's language preference. Dates and times are formatted according to the selected language.

Translation files are maintained in `client/src/i18n/locales/`, with `en.js` serving as the source locale.

To add or update translations, edit the relevant locale file and register any new language in `client/src/i18n/core.js`.

**Current limitation:** API error messages, activity-feed content, and email messages remain in English.

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite |
| Backend | Node.js, Express 5 |
| Database | MongoDB Atlas, Mongoose |
| File storage | Supabase Storage |
| Authentication | JWT-based authentication |
| AI integration | Google Gemini, optional |
| Email integration | Brevo, optional |
| Frontend hosting | Vercel |
| Backend hosting | Render |
| Version control | Git and GitHub |
| Testing | Node.js test runner and client test/lint/build scripts |

## System Architecture

The application separates the user interface, API, database, and file storage.

```text
                    User / Browser
                          |
                          v
                 React + Vite Client
                     (Vercel)
                          |
                    HTTPS API calls
                          |
                          v
                Node.js + Express API
                     (Render)
                    /     |      \
                   /      |       \
                  v       v        v
           MongoDB Atlas Supabase  External
           Application   Storage   Services
           Records       PDF Files Gemini / Brevo
```

MongoDB Atlas stores application records, while Supabase Storage is used for drawing files. The backend coordinates application operations and access to the configured services.

Gemini and Brevo are optional integrations and require their respective configuration.

## Project Structure

```text
Draftera/
├── .github/
├── client/
│   └── src/
│       ├── components/    # Shared UI, layout, project and revision components
│       ├── pages/         # Application pages
│       ├── services/      # API wrappers
│       ├── hooks/         # Shared React hooks
│       ├── styles/        # Design tokens and component styles
│       └── i18n/          # Internationalization and locale files
├── server/
│   ├── controllers/       # Request handling
│   ├── models/            # Mongoose schemas
│   ├── routes/            # API route definitions
│   ├── middleware/        # Authentication, upload and rate limiting
│   ├── services/          # External service integrations
│   ├── utils/             # Shared business and utility logic
│   ├── scripts/           # Demo data and maintenance scripts
│   └── tests/             # Backend tests
├── docs/
│   ├── problem-analysis.md
│   ├── evidence-register.md
│   ├── requirements.md
│   ├── system-architecture.md
│   ├── design-decisions.md
│   ├── testing.md
│   ├── security.md
│   ├── deployment.md
│   ├── notifications.md
│   ├── backup-restore.md
│   └── defense-notes.md
└── README.md
```

This structure reflects the documented organization; individual files may change as the project evolves.

## Getting Started

### Prerequisites

Install the following before running the project locally:

- Node.js and npm
- Git
- A MongoDB database
- A Supabase project with Storage enabled
- A code editor such as Visual Studio Code

Optional services such as Gemini and Brevo are only needed when their corresponding integrations are enabled.

### 1. Clone the repository

Replace the placeholder with the actual GitHub repository URL.

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd Draftera
```

### 2. Configure the backend

```bash
cd server
npm install
```

Create a `.env` file based on the provided example:

```bash
cp .env.example .env
```

On Windows Command Prompt, you can use:

```cmd
copy .env.example .env
```

Set the required backend environment variables using your own credentials.

### 3. Configure file storage

In your Supabase project, create a private Storage bucket named:

```text
drawing-revisions
```

Confirm that the application uses this bucket and that access is mediated by the backend as intended. Do not make the bucket public merely to make PDF links work.

### 4. Start the backend

From the `server` directory:

```bash
npm run dev
```

The local API is expected at:

`http://localhost:5000`

If you want demo data, inspect the seed script and its prerequisites before running:

```bash
npm run seed
```

Use demo seeding only with a development database.

### 5. Configure the frontend

Open a second terminal:

```bash
cd client
npm install
```

Create the client `.env` file using the provided example:

```bash
cp .env.example .env
```

For Windows Command Prompt:

```cmd
copy .env.example .env
```

Set the API base URL in the client environment file:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### 6. Start the frontend

From the `client` directory:

```bash
npm run dev
```

Open the local URL printed by Vite, normally:

`http://localhost:5173`

The frontend and backend must both be running for the complete application workflow to function.

## Environment Configuration

Never commit `.env` files, passwords, database connection strings, API keys, or service-role credentials to GitHub.

| Variable | Location | Purpose |
|---|---|---|
| `MONGODB_URI` | Backend | MongoDB connection string |
| `JWT_SECRET` | Backend | Signing and verifying authentication tokens |
| `SUPABASE_URL` | Backend | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend | Server-side Supabase access; keep secret |
| `CLIENT_URL` | Backend | Allowed frontend origin in production |
| `APP_URL` | Backend | Public application URL used in links |
| `GEMINI_API_KEY` | Backend | Optional AI assistant integration |
| `GEMINI_MODEL` | Backend | Optional Gemini model selection |
| `BREVO_API_KEY` | Backend | Optional email integration |
| `MAIL_FROM` | Backend | Configured sender address |
| `COOKIE_SAMESITE` | Backend | Cookie policy, where supported by the implementation |
| `BACKUP_PASSPHRASE` | Backend or backup environment | Encryption passphrase if supported by the backup implementation |
| `VITE_API_BASE_URL` | Frontend | Backend API base URL |

The exact required variables depend on the application configuration. Refer to `server/.env.example`, `client/.env.example`, and the deployment documentation for the current values and defaults.

Variables prefixed with `VITE_` are exposed to the client bundle. Never put server secrets in frontend environment variables.

## API Overview

The following table summarizes the documented API routes. Refer to the route definitions and deployment version for the exact request and response formats.

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/auth/register` | Register an account |
| `POST` | `/api/auth/login` | Sign in |
| `GET`, `POST` | `/api/projects` | List and create projects |
| `GET` | `/api/projects/:id` | Retrieve project details and team |
| `POST` | `/api/projects/:id/members` | Add a project team member |
| `GET` | `/api/projects/:id/currency` | Retrieve revision currency status |
| `GET` | `/api/projects/:id/activity` | Retrieve the project activity log |
| `GET` | `/api/projects/:id/report.csv` | Export a distribution report |
| `POST` | `/api/drawings/upload` | Upload a draft drawing |
| `POST` | `/api/drawings/:id/publish` | Publish a revision |
| `POST` | `/api/drawings/revision/:id/recipients` | Issue a revision to additional recipients |
| `GET` | `/api/drawings/revision/:id` | Retrieve revision details |
| `POST` | `/api/drawings/revision/:id/open` | Request drawing access and record opening evidence |
| `POST` | `/api/drawings/revision/:id/ask` | Ask the optional AI assistant about a drawing |
| `POST` | `/api/acknowledgments/:id/acknowledge` | Acknowledge receipt |
| `POST` | `/api/acknowledgments/:id/remind/:userId` | Record or initiate a reminder, according to implementation |
| `POST`, `PATCH` | `/api/clarifications/...` | Manage clarification questions, answers, and resolution |

Endpoints must be called with the appropriate authentication and project permissions. The API health endpoint is available at:

`https://draftera-api.onrender.com/api/health`

## Testing

Run the backend test suite:

```bash
cd server
npm test
```

Run the frontend tests, linting, and production build:

```bash
cd client
npm test
npm run lint
npm run build
```

The backend workflow suite can use a dedicated test MongoDB replica set when `TEST_MONGODB_URI` is configured. Use an isolated test database rather than production data.

For detailed test cases and manual device checks, see [Testing Documentation](docs/testing.md).

## Deployment

The production deployment uses the following services:

- **Vercel:** React frontend.
- **Render:** Express API.
- **MongoDB Atlas:** Application database.
- **Supabase Storage:** Drawing file storage.

The Gemini and Brevo integrations are configured separately when required.

Follow the project-specific instructions in [Deployment Documentation](docs/deployment.md).

After deployment, verify registration, login, project access, drawing upload, publication, recipient acknowledgment, revision history, and access-control behavior. Also test the deployed application on mobile browsers, including Safari where available.

## Backup and Recovery

Draftera's backup and recovery process should protect both application records and uploaded drawing files.

### What needs to be backed up?

| Data | Backup consideration |
|---|---|
| MongoDB records | Back up users, projects, revisions, acknowledgments, and other application records |
| Drawing PDFs | Back up the actual files in Supabase Storage separately from database metadata |
| Source code | Preserve the repository and its Git history on GitHub |
| Configuration | Keep a secure record of deployment configuration and recovery requirements without exposing secrets |

A database export alone does not back up PDF contents stored in external file storage.

The current project documentation describes backups as **manual**. Do not assume that scheduled backups, automated restoration, or point-in-time recovery are enabled without verifying the relevant service configuration.

For backup procedures, restore instructions, and recovery checks, see [Backup and Restore Documentation](docs/backup-restore.md).

## Documentation

The `docs/` directory contains the project's supporting technical and assessment documentation.

- [Problem Analysis](docs/problem-analysis.md)
- [Evidence Register](docs/evidence-register.md)
- [Requirements](docs/requirements.md)
- [System Architecture](docs/system-architecture.md)
- [Design Decisions and Trade-offs](docs/design-decisions.md)
- [Testing](docs/testing.md)
- [Security](docs/security.md)
- [Demo Script](docs/demo-script.md)
- [Deployment](docs/deployment.md)
- [Notifications](docs/notifications.md)
- [Backup and Restore](docs/backup-restore.md)
- [Defense Notes](docs/defense-notes.md)

## Known Limitations

- The interface supports English, Hindi, and Marathi, but server messages, activity-feed content, and email content remain in English.
- The AI assistant sends drawing content to Google for processing when that feature is used. Review the security documentation before uploading confidential construction drawings.
- The application does not currently provide an offline mode.
- WhatsApp and SMS notifications are not supported; email is the intended notification channel where configured.
- Backups are manual according to the current project documentation.
- Authentication uses stateless eight-hour cookie sessions, as documented by the project.
- Opening evidence establishes that the drawing was accessed through the application; it does not prove that the recipient read, understood, or followed the drawing.

See [Design Decisions and Trade-offs](docs/design-decisions.md) and [Security Documentation](docs/security.md) for additional details.

---

**Built as part of Synckraft Technologies' software developer internship assessment.**

Draftera is designed to make drawing distribution more traceable, revision status more visible, and construction communication more accountable.
