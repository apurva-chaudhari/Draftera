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

### D8. Reminders are recorded, not emailed
A reminder writes to the activity log and is rate limited to one per person
per revision per hour. *Alternative:* email/WhatsApp. *Deferred* because it
needs a provider, verified sender and consent handling, which does not fit the
time box. It is the first item in "Future work".

## 3. Technology choices

| Choice | Reason | Alternative considered |
| --- | --- | --- |
| React + Vite | Fast, common, easy to deploy to Vercel | Next.js: SSR is not needed for a logged-in tool |
| Express + MongoDB (Mongoose) | Flexible documents for revisions and logs, Atlas free tier | PostgreSQL: stronger relational integrity, slower to set up in the time box |
| MongoDB transactions for publish | Publishing, superseding and creating acknowledgments must succeed together | Sequential writes: could leave a half-published revision |
| Supabase Storage | Private buckets and signed URLs with little setup | S3: more configuration; Firebase Storage: fine, but Supabase was already integrated |
| JWT in `localStorage` | Simple SPA flow | httpOnly cookies are safer against XSS; listed as a known risk |
| Vercel (client) + Render (API) | Free tiers, Git-based deploys | Firebase Hosting works for the client as well |

## 4. Stakeholder perspectives considered

- **Supervisor:** wants proof of who has the drawing without chasing people. → currency view, recipient table, reminders.
- **Site engineer:** wants to know what changed, quickly. → change summary shown first, "waiting on you" list.
- **Subcontractor:** often on a phone, low connectivity, limited time. → responsive layout, one-screen task, small PDF-only uploads.
- **Document controller / management:** wants an audit trail. → activity log of every action with user and time.

## 5. Constraints and honest limitations

- Six-day assessment: no formal user interviews or site observation were possible. Causes in `problem-analysis.md` are hypotheses grounded in the sources in `evidence-register.md`, not measured findings.
- No offline mode. Poor connectivity on real sites is a genuine risk (see Future work).
- No email/SMS delivery, so "Not opened" means "no evidence of opening in Draftera", not "not received by any channel".
- PDF only, 10 MB limit; no markup, comparison or CAD formats.
- Removing a team member is not implemented.
- Acknowledgment is not a legal sign-off and Draftera does not replace a formal document-control procedure.
- Automated tests cover the revision-currency logic and API access rules. The full database workflow was verified manually, not with an automated integration suite.

## 6. Future work, in priority order

1. Email / WhatsApp notifications on publish and on overdue acknowledgments.
2. Offline-friendly PWA so site staff can read the latest drawing without signal.
3. Visual comparison between revisions (highlight what changed).
4. Acknowledgment deadlines and escalation.
5. httpOnly cookie sessions and refresh tokens.
6. Integration tests against a test database.
