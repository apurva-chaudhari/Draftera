# Email notifications

Draftera emails people when something needs their attention:

| Event | Who is emailed |
| --- | --- |
| A revision is published | Everyone on its distribution (not the person who published it) |
| Supervisor presses **Remind** | That person. The supervisor is told whether the email really went out |
| Someone is issued an already-published revision | That person |
| Added to / removed from a project | That person |
| Acknowledgment is overdue | That person, once per 24 hours (daily job, below) |

Sending is best-effort: a mail problem is logged and never fails the action that caused it. Nobody is emailed about their own action. Demo and reserved addresses (`@draftera.demo`, `.test`, `example.com` …) are skipped.

## Setup (free, about 10 minutes)
Email uses Brevo's HTTPS API rather than SMTP, because Render's free plan blocks SMTP ports.

1. Create a free account at brevo.com and verify a sender address (Senders & IP).
2. SMTP & API → API keys → create a key.
3. In `server/.env` and in Render's environment set:
   - `BREVO_API_KEY=<the key>`
   - `MAIL_FROM=Draftera <your verified address>`
   - `APP_URL=<your Vercel address>` (so links in emails open the real app)
4. Restart the API. Press **Remind** on a real (non-demo) account to test.

With the two Brevo values empty, email is simply off and the app behaves as before.

## Overdue reminders
`npm run notify:overdue` (in `server/`) emails every person who is past a deadline. It is safe to run repeatedly. To run it daily on Render, add a Cron Job with root directory `server`, command `npm run notify:overdue`, and the same environment variables.

## WhatsApp
Not included. WhatsApp needs the WhatsApp Business Cloud API (a Meta business account, an approved sender number and pre-approved message templates), which cannot be set up for a student/demo project quickly. Notifications go through one function (`services/mailer.js` → `sendMail`), so a WhatsApp sender can be added beside it later.
