# Demo Script (about 5 minutes)

Run `npm run seed` in `server/` first, against a **local or throwaway database only** (it is blocked in production). The sign-in page has no demo buttons: type the email and the shared password `Draftera#2026`.

1. **The problem, live.** Sign in as `supervisor@draftera.demo`. Overview shows a red card: people possibly on an old revision.
2. Open the project **DEMO-TOWER → Revision currency**. STR-101 is at Rev B. Imran (steel) acknowledged Rev A but has not opened Rev B, flagged *"May still be working from it"*. Priya (electrical) is **Not issued** on ARC-204. *(Optional: in a private window sign in as `electrical@draftera.demo`. ARC-204 is not in her list at all: subcontractors only see what was issued to them.)* Click **Issue to them**, and ARC-204 now appears for her.
3. Press **Remind** on Imran. Open the **Activity** tab to show the audit trail.
4. Sign in as `steel@draftera.demo`. **My tasks** shows Rev B waiting. Open it: *Acknowledge* is disabled until the drawing is opened. Open the PDF, then acknowledge.
5. In **Revision currency**, note the **Overdue** badge on Imran (the deadline was yesterday). Press **Download report (CSV)** and open it in Excel.
6. Ask a clarification as the engineer, answer it as the supervisor, resolve it.
7. Back as supervisor: currency view now shows everyone current. Upload **Rev C**, choose a deadline and press *Review and publish*: the confirmation shows what will be superseded. Publish. Everyone drops back to "Not opened" and Rev B becomes **Superseded**. This is the central idea: confirmation never carries over.
8. **Roles.** Sign in as `engineer@draftera.demo`: the drawing list shows *Your status*, not the team's progress bar, and there is no Revision currency tab. The overview has no "Revision risks": that is the supervisor's view.
9. **Project status.** As supervisor open **Settings**, choose **On hold** and confirm. A banner appears on the project, *Upload revision* disappears, and the team is emailed. Try *Remind*: it is refused while on hold. As the engineer you can still acknowledge and ask questions. Set it back to **Active**. Choose **Completed** to show it becomes read-only and drops out of everyone's tasks.
10. **Paper trail.** Open a published revision and press **Print issue record**: a one-page transmittal of who was issued the drawing, when each person opened it and when they confirmed.
