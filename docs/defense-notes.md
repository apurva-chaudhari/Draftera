# Questions to Be Ready For

**Why not just use WhatsApp / email / a shared folder?**
They record that something was sent, not who saw the *current* version. Draftera keeps one source of truth, shows which revision is current, and records opened/acknowledged per person.

**Does acknowledgment prove people follow the drawing?**
No. It proves receipt. The product says so on screen. It narrows the gap between "sent" and "received"; it cannot enforce behaviour on site.

**Is this validated with real users?**
Not with interviews: time did not allow it. The analysis is hypothesis-driven with cited standards (ISO 19650, UK BIM Framework CDE guidance). The next step would be 3–5 short interviews with site engineers and subcontractors.

**What if subcontractors have poor signal or never log in?**
That is the biggest adoption risk. Mitigations: mobile-first layout, small PDFs, supervisor visibility of who has not opened it. A real fix needs notifications and offline access (future work).

**What would you build next?** See "Future work" in `design-decisions.md`.

**What are the security measures?**
Hashed passwords (bcrypt), JWT with issuer/audience, project-membership checks on every endpoint, no public sign-up for privileged roles, private storage with 120 s signed URLs, PDF signature + size validation, Helmet, CORS allow-list, login rate limiting.

**What is weak?**
Token in `localStorage`, in-memory rate limiter (single instance), no integration tests, no member removal, reminders are not delivered outside the app.
