# Testing

## How testing is organised

| Layer | Tool | What it proves | Needs |
| --- | --- | --- | --- |
| Pure logic | `node:test` | Revision currency, overdue rules, CSV report, access rules, rate limiter, formatting helpers | Nothing |
| Config and AI assistant | `node:test`, fake fetch and storage | Startup config check, Gemini request and error handling, assistant access rules and input limits, per-person rate limit | Nothing |
| API smoke | `node:test` | Auth required on every route, forged tokens rejected, CORS allow-list, privileged sign-up refused | Nothing |
| Workflow (end to end) | `node:test` + real MongoDB, fake storage | The whole business flow, permissions, and edge cases below | `TEST_MONGODB_URI` |
| Static checks | ESLint, Vite build | No unused/undefined code, bundle builds | Nothing |
| Manual | Checklist below | Screens on phone, tablet and laptop | A browser |

```bash
cd server && npm test                 # unit + smoke (workflow suite skips without a DB)
cd client && npm test && npm run lint && npm run build
```

### Running the workflow suite

The suite **drops its database**, so it refuses to run unless the database name ends in `_test`. It needs a MongoDB replica set because publishing uses transactions (Atlas works; locally start `mongod --replSet rs0` and run `rs.initiate()`).

```bash
# Windows PowerShell
$env:TEST_MONGODB_URI="mongodb+srv://USER:PASS@cluster.mongodb.net/draftera_test"
npm test
```

Use a separate throwaway database, never the one holding your real data. CI runs this suite automatically against a MongoDB service container.

## Automated test cases

| # | Area | Case | Expected |
| --- | --- | --- | --- |
| A1 | Auth | Request without a session cookie to every protected route | 401 |
| A2 | Auth | Forged token | 401 |
| A3 | Auth | Register as `admin` | 403 |
| A4 | Auth | Duplicate email | 409 |
| A5 | Auth | Wrong password | 401 |
| A6 | Auth | Deactivated user with a valid token | 401 |
| A7 | CORS | Unknown origin | 403 |
| P1 | Projects | Subcontractor creates project | 403 |
| P2 | Projects | Duplicate project code | 409 |
| P3 | Projects | Code is upper-cased | `GVA-001` |
| P4 | Team | Non-supervisor adds a member | 403 |
| P5 | Team | Add the same person twice | 409 |
| P6 | Team | Unregistered email | 404 |
| P7 | Team | Assign `project_supervisor` role | 400 |
| P8 | Access | Outsider opens project / lists projects | 403 / empty |
| U1 | Upload | Duplicate revision number | 409 |
| U2 | Upload | Non-supervisor uploads | 403 |
| U3 | Upload | File that is not a PDF | 400 |
| U4 | Drafts | Team member lists or opens a draft | hidden / 404 |
| R1 | Publish | Empty recipient list | 400 |
| R2 | Publish | Non-supervisor publishes | 403 |
| R3 | Publish | Recipient outside the project | 400 |
| R4 | Publish | Invalid deadline | 400 |
| R5 | Publish | Publish the same revision twice | 409 |
| R6 | Publish | Audit entry exists after publish (written in the same transaction) | present |
| R7 | Publish | New revision supersedes the old one | old = `superseded` |
| C1 | Currency | Person left off distribution | `not_issued` |
| C2 | Currency | Acknowledged Rev A, not Rev B | `pending` + `atRisk`, last = A |
| C3 | Currency | Supervisor is not in the audience | excluded |
| C4 | Currency | Non-supervisor requests the matrix | 403 |
| C5 | Deadlines | Pending after deadline / before / acknowledged / not issued / no deadline | overdue / not / not / not / not |
| K1 | Acknowledge | Before opening the file | 409 |
| K2 | Acknowledge | By someone who is not a recipient | 403 |
| K3 | Acknowledge | Twice | 200 (idempotent) |
| K4 | Acknowledge | A superseded revision | 409 |
| K5 | Open | Outsider requests a file link | 403 |
| K6 | Open | First view logged once, not per click | 1 entry |
| K7 | Late add | Issue to a person left off, then again | 200, then 409 |
| M1 | Reminder | Non-supervisor | 403 |
| M2 | Reminder | Twice within an hour | 429 |
| M3 | Reminder | Person already acknowledged | 409 |
| Q1 | Clarification | Non-supervisor answers | 403 |
| Q2 | Clarification | Resolve before answered | 409 |
| Q3 | Clarification | Resolve by unrelated person | 403 |
| Q4 | Clarification | Edit after resolved | 409 |
| D1 | Dashboard | Stale Rev A task counted as work | not counted |
| D2 | History | Old revision stays readable with `supersededBy` | yes |
| X1 | Report | Non-supervisor downloads CSV | 403 |
| X2 | Report | Supervisor CSV: headers, BOM, quoting | valid |
| X3 | Report | Names starting with `=` `+` `-` `@` | neutralised |
| L1 | Audit | Every action type appears in the project trail | all present |
| S1 | Session | Cookie is `HttpOnly`; `Secure` + `SameSite=None` in production; cleared on sign-out | yes |
| S2 | Session | `Authorization: Bearer` header is ignored; expired, forged or deactivated-user cookie | 401 |
| R1 | Members | Supervisor removes a member; they lose access at once; history is kept | 200, then 403 |
| R2 | Members | Non-supervisor removes / supervisor removed / not on team / bad id | 403 / 400 / 404 / 400 |
| R3 | Members | Removed person acknowledges, is reminded, or is issued the revision | 403 / refused / 409 |
| N1 | Email | Publish emails recipients but never the publisher; provider failure never breaks the action | yes |
| N2 | Email | Reminder reports honestly whether an email went out; demo addresses skipped | yes |
| B1 | Backup | Backup verifies and restores exactly; encrypted file holds no readable data | identical |
| B2 | Backup | Wrong passphrase, tampering, truncation, damaged PDF, invalid file | refused, nothing written |
| B3 | Backup | Restore into non-empty database refused; `--replace` swaps; large collections in batches | yes |
| P1 | Status | Supervisor sets hold / completed / archived / active; others cannot; invalid and empty requests; same status is a no-op | 200 / 403 / 400 / "No changes" |
| P2 | Status | Hold refuses upload, publish, issue, remind, add member; people can still acknowledge and ask | 409, then 200 / 201 |
| P3 | Status | Completed refuses acknowledge and questions; record stays readable; adds no work to tasks or the overview | 409, 200, 0 pending |
| P4 | Status | The project code cannot be changed; name and description are validated | code unchanged |
| V1 | Roles | Subcontractor never sees, opens or fetches a drawing not issued to them | 404 |
| V2 | Roles | Members see `myStatus`, never team counts; engineers see all issued drawings | yes |
| V3 | Roles | Activity feeds hide other people's opens, acknowledgments, reminders and draft uploads | hidden |
| V4 | Roles | Overview reports `supervisedProjects`; the client shows risks only to supervisors | yes |
| E1 | Email | Status change emails the team except the actor; question emails the supervisor; answer emails the asker | yes |

## Configuration and AI assistant test cases

| # | Area | Case | Expected |
| --- | --- | --- | --- |
| C1 | Config | Missing database, Supabase or JWT settings | Startup refused, each problem listed |
| C2 | Config | Production with empty or localhost-only `CLIENT_URL` | Startup refused |
| C3 | Config | Trailing slash / `http://` in `CLIENT_URL`, missing Gemini or Brevo keys | Warning only |
| G1 | Assistant | Valid question | Answer returned; key sent in a header, never in the URL |
| G2 | Assistant | Gemini 429 / 404 / 500, empty or blocked answer, file missing from storage | Friendly message with the right status; Gemini not called when the file is missing |
| G3 | Assistant | Question shorter than 3 or longer than 500 characters | 400, nothing sent to Google |
| G4 | Assistant | No `GEMINI_API_KEY` | 503 "not set up" |
| G5 | Assistant | Outsider / subcontractor not issued the drawing / non-supervisor on a draft | 403 / 404 / 404 |
| G6 | Assistant | Same office IP, two people | Each gets their own rate limit |
| G7 | Assistant | No session | 401 |
| S1 | Seed | `NODE_ENV=production` without `--allow-production` | Refused before touching the database |

## Manual test checklist (phone, tablet, laptop)

Check each page at **360 px** (phone), **768 px** (tablet) and **1280 px** (laptop). In Chrome DevTools use the device toolbar.

| Check | Phone | Tablet | Laptop |
| --- | --- | --- | --- |
| Sign in and register: blueprint panel stacks above the form | | | |
| Bottom navigation visible on phone, sidebar on laptop | | | |
| Overview: cards wrap, no horizontal scroll | | | |
| Tables turn into labelled cards on phone | | | |
| Title block readable, drawing number prominent | | | |
| Publish: confirmation step appears, deadline selectable | | | |
| Open drawing: PDF opens in a new tab | | | |
| Acknowledge disabled until opened | | | |
| Superseded banner and struck-through revision chip | | | |
| Report downloads and opens in Excel with correct columns | | | |
| Buttons are at least 44 px tall on phone | | | |
| Keyboard: Tab reaches every control, orange focus ring visible | | | |
| Loading, empty and error states each appear at least once | | | |
