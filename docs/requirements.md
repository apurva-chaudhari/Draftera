\# Draftera — Product Requirements



\*\*Project:\*\* Draftera  

\*\*Assessment:\*\* Synckraft Technologies Pvt. Ltd. — SK-SEL-03  

\*\*Document status:\*\* Initial requirements baseline  

\*\*Version:\*\* 1.0  

\*\*Date:\*\* 14 October 2026



\## 1. Purpose



This document defines the initial functional requirements, security expectations, priorities, and acceptance criteria for Draftera.



The purpose is to deliver a focused, demonstrable construction drawing revision and communication workflow within the six-day assessment period.



Priorities use the MoSCoW method:



\- \*\*Must:\*\* Required for the core workflow.

\- \*\*Should:\*\* Important, but may follow after all must-have requirements pass.

\- \*\*Could:\*\* Optional if time and stability permit.

\- \*\*Won't for this assessment:\*\* Explicitly excluded from the initial release.



\## 2. User Roles



\### Project Supervisor



Can manage assigned project information, publish drawing revisions, select intended recipients, review acknowledgment status, and respond to clarification requests.



\### Site Engineer



Can access authorized project drawings, review revisions, acknowledge receipt, and raise clarification requests.



\### Subcontractor



Can access revisions shared with them, acknowledge receipt, and raise clarification requests for their assigned work.



\### Administrator



Can manage authorized user accounts and project access according to the application's permission model.



Role permissions must be enforced by the backend, not merely by hiding frontend buttons.



\## 3. Functional Requirements



\### FR-01 — Authentication and access control



\*\*Priority:\*\* Must



Users must be able to sign in and access only the projects and actions permitted by their assigned roles.



\*\*Acceptance criteria:\*\*

\- Valid users can authenticate.

\- Invalid credentials are rejected.

\- Protected endpoints reject unauthenticated requests.

\- Users cannot access another project's restricted records by changing an identifier in a request.

\- Passwords are not stored as plaintext.



\### FR-02 — Project management



\*\*Priority:\*\* Must



Authorized users must be able to create or access a project and identify its authorized participants.



\*\*Acceptance criteria:\*\*

\- Each project has a unique identifier and name.

\- Project participants have defined roles.

\- Users outside the project cannot view its restricted information.

\- Project membership can be checked before sensitive actions.



\### FR-03 — Drawing registration and revision publishing



\*\*Priority:\*\* Must



An authorized supervisor must be able to register a drawing revision and publish it to selected recipients.



\*\*Required revision information:\*\*

\- Drawing title or drawing number.

\- Revision identifier.

\- Issue date.

\- Change summary.

\- Drawing file.

\- Publishing user.

\- Intended recipients.



\*\*Acceptance criteria:\*\*

\- Required metadata is validated.

\- Each revision belongs to the correct project and drawing.

\- A published revision is associated with its intended recipients.

\- The application does not silently overwrite the previous revision.

\- Unauthorized users cannot publish revisions.



\### FR-04 — Revision history and current status



\*\*Priority:\*\* Must



Users with appropriate permissions must be able to view a drawing's revision history and identify its latest published revision.



\*\*Acceptance criteria:\*\*

\- Earlier revisions remain traceable.

\- The latest published revision is clearly identified.

\- Superseded revisions are visibly marked when a newer revision is published.

\- Revision identifiers and publication timestamps are displayed consistently.

\- The application does not silently treat a draft as published.



\### FR-05 — Recipient acknowledgment



\*\*Priority:\*\* Must



An authorized recipient must be able to acknowledge a specific published revision.



\*\*Acceptance criteria:\*\*

\- Acknowledgment is associated with a specific user and revision.

\- The system records the acknowledgment timestamp.

\- The supervisor can see each intended recipient's status.

\- One recipient's acknowledgment does not acknowledge the revision on behalf of other recipients.

\- A new revision has its own acknowledgment records.

\- The application never marks a recipient as acknowledged without an actual recorded acknowledgment action.



\### FR-06 — Clarification workflow



\*\*Priority:\*\* Must



Authorized recipients must be able to submit clarification requests linked to a specific revision, and authorized users must be able to respond.



\*\*Acceptance criteria:\*\*

\- Each clarification references the relevant revision.

\- The request and response remain available in the authorized project history.

\- Request and response timestamps are recorded.

\- The clarification has a visible status.

\- A clarification is not marked resolved without an explicit resolution action.



\### FR-07 — Pending-action dashboard



\*\*Priority:\*\* Must



The supervisor must be able to identify outstanding acknowledgments and unresolved clarification requests.



\*\*Acceptance criteria:\*\*

\- Pending acknowledgments can be distinguished from completed ones.

\- Unresolved clarification requests are visible.

\- Statuses reflect saved records rather than hardcoded demonstration data.

\- The dashboard is restricted to authorized project information.



\### FR-08 — Revision search and filtering



\*\*Priority:\*\* Should



Users should be able to find revisions using relevant identifiers and filter by status.



\*\*Acceptance criteria:\*\*

\- Search results match the entered drawing or revision information.

\- Status filters return the appropriate records.

\- Search results respect project access permissions.



\### FR-09 — Activity timeline



\*\*Priority:\*\* Should



The application should display relevant revision, acknowledgment, and clarification events in chronological order.



\*\*Acceptance criteria:\*\*

\- Events identify the relevant action and timestamp.

\- User attribution is displayed where appropriate.

\- The timeline does not invent events or imply actions that were not recorded.



\### FR-10 — Optional notifications and enhancements



\*\*Priority:\*\* Could



Email notifications, dashboard charts, drawing comparison, or AI-assisted summaries may be considered after the core workflow is tested.



\*\*Acceptance criteria:\*\*

\- Optional features do not block or weaken core workflows.

\- AI-generated information is clearly identified as generated content and can be reviewed.

\- Notifications must not be represented as confirmed delivery or acknowledgment.



\## 4. Non-Functional Requirements



\### NFR-01 — Security



Protect credentials, project records, and drawing files. Validate user permissions on the server and avoid exposing secrets in client code or Git.



\### NFR-02 — Data integrity



Preserve revision history and maintain correct relationships between projects, drawings, revisions, recipients, acknowledgments, and clarifications.



\### NFR-03 — Usability



Use a consistent, professional light-mode interface with clear labels, visible status indicators, useful validation messages, and responsive layouts.



\### NFR-04 — Reliability



Show loading, success, empty, and error states. Failed operations must not be displayed as successful.



\### NFR-05 — Traceability



Record meaningful user actions with timestamps. Do not fabricate delivery, acknowledgment, approval, or resolution states.



\### NFR-06 — Maintainability



Use a clear project structure, reusable components, validated API inputs, meaningful error handling, and focused Git commits.



\### NFR-07 — Deployment



The application should be deployable to publicly accessible hosting using environment variables for configuration and secrets. Public access must not mean public access to restricted project data.



\## 5. Explicit Scope Exclusions



The initial release will not attempt to:

\- Replace formal engineering approval or document-control processes.

\- Certify that a drawing is safe for construction.

\- Prove that a recipient understood or physically used a revision.

\- Guarantee offline operation.

\- Implement a full building information modelling platform.

\- Add AI functionality before the core workflow is reliable.



\## 6. End-to-End Acceptance Scenario



1\. A supervisor signs in and opens an authorized project.

2\. The supervisor registers and publishes drawing revision A.

3\. The supervisor selects two authorized recipients.

4\. Each recipient signs in and views revision A.

5\. Recipient 1 acknowledges revision A.

6\. Recipient 2 submits a clarification request about revision A.

7\. The supervisor sees recipient 1 as acknowledged and recipient 2's acknowledgment as pending.

8\. The supervisor responds to the clarification.

9\. The relevant user resolves the clarification according to the defined workflow.

10\. The supervisor publishes revision B.

11\. The application retains revision A in history and identifies revision B as the latest published revision.

12\. Revision B has separate acknowledgment records; revision A's acknowledgments are not copied to revision B.

13\. An unauthorized user attempts to access the project and is denied.



The scenario passes only when the persisted application state and visible interface agree with the recorded actions.



\## 7. Prioritization and Delivery Rule



Implement and test all must-have requirements before investing significant time in optional features.



If time becomes limited, reduce optional functionality rather than weakening access control, revision history, acknowledgment integrity, or clarification tracking.



\## 8. Open Decisions



The following decisions require further technical planning:

\- Backend and frontend technology choices.

\- Database schema and revision relationships.

\- Drawing file storage and access strategy.

\- Authentication and session strategy.

\- Deployment architecture.

\- Automated test coverage and demonstration data.



These decisions should be made before implementation and documented with their rationale.



\## 9. Definition of Done



A requirement is complete only when:

\- Its intended behavior is implemented.

\- Relevant validation and permission checks work.

\- Success, failure, and empty states are handled.

\- Its acceptance criteria have been tested.

\- The change is committed to Git.

\- No secrets or unintended project files are included in the commit.

