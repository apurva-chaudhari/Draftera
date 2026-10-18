# Demo Script (about 5 minutes)

Run `npm run seed` in `server/` first. All demo passwords: `Draftera#2026`.

1. **The problem, live.** Sign in as `supervisor@draftera.demo`. Overview shows a red card: people possibly on an old revision.
2. Open the project **DEMO-TOWER → Revision currency**. STR-101 is at Rev B. Imran (steel) acknowledged Rev A but has not opened Rev B, flagged *"May still be working from it"*. Priya (electrical) is **Not issued** on ARC-204. Click **Issue to them**.
3. Press **Remind** on Imran. Open the **Activity** tab to show the audit trail.
4. Sign in as `steel@draftera.demo`. **My tasks** shows Rev B waiting. Open it: *Acknowledge* is disabled until the drawing is opened. Open the PDF, then acknowledge.
5. Ask a clarification as the engineer, answer it as the supervisor, resolve it.
6. Back as supervisor: currency view now shows everyone current. Upload **Rev C** and publish. Everyone drops back to "Not opened" and Rev B becomes **Superseded**. This is the central idea: confirmation never carries over.
