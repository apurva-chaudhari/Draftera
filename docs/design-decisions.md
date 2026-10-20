# Draftera — Design Decisions, Alternatives and Trade-offs

This document records *why* Draftera works the way it does. It answers the
assessment's request for reasoning, alternatives considered, constraints and
the basis for conclusions.

## 1. How the problem was framed

The brief describes a subcontractor acting on an old drawing while a
supervisor assumes everyone has the latest. The key observation is that this
is a **belief gap**, not a file-storage gap: the supervisor believes "sent
means received". Draftera therefore tracks *evidence* at each step instead of
assuming it.

| Step | What can be wrong | What Draftera records |
| --- | --- | --- |
| Issued | Someone was left off the list | Explicit recipient list; "Not issued" state |
| Delivered | Message sent, never seen | `viewedAt`, set only when the file is opened through the app |
| Acknowledged | Clicked without looking | Acknowledge is blocked until the file has been opened |
| Understood | Unclear instruction | Clarifications attached to the revision |
| Still current | New revision replaces old | Previous acknowledgments never carry over |

## 2. Key decisions

### D1. Acknowledgment requires opening the file
*Alternative:* a plain "I acknowledge" button. *Rejected* because it measures
a click, not access to the drawing. *Trade-off:* one extra step for the
recipient. *Limit:* opening a PDF still does not prove the person read it.
The UI says acknowledgment is **receipt, not approval or understanding**.

### D2. Acknowledgments never carry over to a new revision
Publishing Rev B creates fresh records and marks Rev A superseded. Rev A's
acknowledgments stay as history. This is the rule that exposes the exact
failure in the brief: someone who confirmed Rev A is **not** current on Rev B.

### D3. The "revision currency" view
The supervisor's main question is "who is on the right drawing?" The matrix
answers it per drawing and person, and flags **at risk** anyone who
acknowledged an older revision but not the current one. The logic is a pure
function (`server/utils/currency.js`) with unit tests.

### D4. Roles are per project
One person can supervise project A and be a subcontractor on project B.
Roles live on project membership, not only on the account. Public sign-up
cannot grant supervisor or admin rights.

### D5. Supervisor-only publishing, shared clarifications
Only the supervisor publishes (single accountable issuer). Clarification
threads are visible to the whole project team so one answer serves everyone.

### D6. Signed, expiring file links
Drawings sit in a private bucket. The API issues a 120-second signed URL after
checking project membership. Draft revisions are hidden from non-supervisors.

### D7. Superseded drawings stay visible but are marked
Hiding old revisions would break traceability and prevent audits, so they stay
readable with a clear "Do not build from this" banner. Acknowledging a
superseded revision is refused.

### D8. Reminders are recorded and emailed
A reminder writes to the activity log, is rate limited to one per person per
revision per hour, and is emailed when email is configured. The supervisor is
told honestly whether an email went out. Email uses Brevo's HTTPS API (Render's
free plan blocks SMTP) and is best-effort: a mail failure never fails the
action. *Alternative:* WhatsApp. *Not done*: it needs the WhatsApp Business API,
an approved sender and message templates. See `notifications.md`.

### D9. Optional deadlines and an "overdue" state
A supervisor can require acknowledgment within 24 h, 48 h, 3 or 7 days. Overdue
applies only to people who were issued the drawing and are still pending or
only opened it; someone who was never issued it is *not issued*, not late.
*Trade-off:* a deadline is a nudge, not enforcement. It exists so silence is
visible rather than invisible.

### D10. Audit entries inside the publish transaction
Publishing supersedes the old revision, creates the acknowledgments and writes
the audit record in one transaction. If the audit write fails, nothing is
published, so a state change can never exist without its trail. Other events
(opened, reminded, question) are logged best-effort so a logging failure never
blocks a person doing their job.

### D11. A CSV report instead of PDF
A supervisor usually needs the status in a spreadsheet or an email. CSV opens
everywhere. Cells beginning with `= + - @` are neutralised because names and
titles are user input and could otherwise run as spreadsheet formulas.

### D12. A confirmation step before publishing
Publishing supersedes the previous revision and asks people to act, and it
cannot be undone from the UI. The confirm screen states who will receive it,
what it supersedes and who is being left out.

### D13. Subcontractors see only what was issued to them
Site engineers see every issued drawing; subcontractors see only the drawings
issued to them, their history, and team events about those drawings. Drawings
outside their scope answer "not found". *Why:* subcontractors work to a narrow
scope, and an empty or unexpected drawing list is itself the clearest signal of
"you were not issued the latest revision". *Alternative:* show everything to
everyone, simpler but noisy and weaker on need-to-know.

### D14. Members see their own status, not the team's
A subcontractor used to see "1/2 acknowledged" with no way to know who the
other person was. Only the supervisor sees other people's progress; everyone
else sees their own standing and deadline. The same rule applies to the
activity feeds: opens, acknowledgments, reminders and draft uploads are the
supervisor's view.

### D15. Project status is a rule table, not a label
`on hold`, `completed` and `archived` change behaviour (see
`roles-and-permissions.md`). The rules live in one file
(`server/utils/projectRules.js`) so every endpoint agrees. On hold pauses new
work but lets people finish what they hold; completed and archived are
read-only; finished projects stop adding to anyone's "waiting on you".
*Alternative:* a cosmetic label, which looked like a feature but did nothing.

### D16. A printable issue record
Site offices keep a transmittal on file as proof of who was told what. The
supervisor can print one per revision: what changed, what it replaced, and each
person's opened and acknowledged times.

## 3. Technology choices

| Choice | Reason | Alternative considered |
| --- | --- | --- |
| React + Vite | Fast, common, easy to deploy to Vercel | Next.js: SSR is not needed for a logged-in tool |
| Express + MongoDB (Mongoose) | Flexible documents for revisions and logs, Atlas free tier | PostgreSQL: stronger relational integrity, slower to set up in the time box |
| MongoDB transactions for publish | Publishing, superseding and creating acknowledgments must succeed together | Sequential writes: could leave a half-published revision |
| Supabase Storage | Private buckets and signed URLs with little setup | S3: more configuration; Firebase Storage: fine, but Supabase was already integrated |
| Session in an `HttpOnly` cookie | Page scripts (and any injected script) cannot read it; CORS allow-list doubles as CSRF defence | `localStorage` token: simpler, but readable by XSS. Trade-off: stateless, so sign-out cannot revoke a copied token before it expires (8 h) |
| Vercel (client) + Render (API) | Free tiers, Git-based deploys | Firebase Hosting works for the client as well |

## 4. Stakeholder perspectives considered

- **Supervisor:** wants proof of who has the drawing without chasing people. → currency view, recipient table, reminders.
- **Site engineer:** wants to know what changed, quickly. → change summary shown first, "waiting on you" list.
- **Subcontractor:** often on a phone, low connectivity, limited time. → responsive layout, one-screen task, small PDF-only uploads.
- **Document controller / management:** wants an audit trail. → activity log of every action with user and time.

## 5. Constraints and honest limitations

- Six-day assessment: no formal user interviews or site observation were possible. Causes in `problem-analysis.md` are hypotheses grounded in the sources in `evidence-register.md`, not measured findings.
- No offline mode. Poor connectivity on real sites is a genuine risk (see Future work).
- Email only (no WhatsApp/SMS), so "Not opened" means "no evidence of opening in Draftera", not "not received by any channel".
- PDF only, 10 MB limit; no markup, comparison or CAD formats.
- Removing a team member keeps their past acknowledgments, questions and audit entries on purpose: they are the record of who was told what.
- Backups are manual; see `backup-restore.md`.
- Acknowledgment is not a legal sign-off and Draftera does not replace a formal document-control procedure.
- Automated tests cover the revision-currency logic, report, deadlines and access rules. An end-to-end workflow suite exists (`server/tests/workflow.integration.test.js`) and runs against a real test database in CI; it has not been run in every environment, so run it locally before relying on it.
- Component rendering was checked with a render harness, not a real browser. Test each page on a phone, tablet and laptop (see `docs/testing.md`).

## 6. Future work, in priority order

1. WhatsApp notifications (email is done).
2. Offline-friendly PWA so site staff can read the latest drawing without signal.
3. Visual comparison between revisions (highlight what changed).
4. Acknowledgment deadlines and escalation.
5. Server-side session list for instant sign-out of every device.
6. Visual comparison of two PDF revisions.
7. Change a member's role on a project (removal is done).
