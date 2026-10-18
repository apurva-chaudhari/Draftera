# Draftera — System Architecture

## 1. Purpose

Draftera is a web-based construction drawing revision coordination system. It is designed to help construction teams identify the latest published drawing revision, review revision history, acknowledge receipt of a specific revision, and raise or resolve revision-related clarifications.

The system will use a client-server architecture with a persistent database and controlled drawing-file storage.

## 2. Architecture Principles

- Maintain a clear separation between the frontend, backend, database, and file storage.
- Enforce authentication and authorization on the server.
- Keep drawing metadata and revision history persistent.
- Track acknowledgment separately for every recipient and revision.
- Link clarifications to the exact drawing revision they concern.
- Never treat an acknowledgment as proof that a drawing was understood, approved, or implemented.
- Keep the implementation small enough to complete and test within the assessment period.
- Protect credentials, secrets, and private drawing files.

## 3. Proposed Technology Stack

The final stack will be confirmed after evaluating implementation effort, deployment compatibility, and available free-tier services.

### Frontend

- React
- Vite
- JavaScript
- CSS for a consistent, responsive light-mode interface
- React Router for page navigation

Responsibilities:

- Render dashboards, project pages, drawing revision details, acknowledgment actions, and clarification forms.
- Collect user input and display loading, success, and error states.
- Call backend API endpoints.
- Avoid making authorization decisions solely in the browser.

### Backend

- Node.js
- Express.js
- REST API
- Server-side request validation and authorization

Responsibilities:

- Authenticate users.
- Enforce role and project-level permissions.
- Manage projects, drawings, revisions, acknowledgments, and clarifications.
- Validate uploaded files and metadata.
- Return consistent responses and meaningful error messages.

### Database

- MongoDB Atlas will provide the hosted database for Draftera.
- The application will use a dedicated database named `draftera` within the Draftera cluster.
- Collections will store users, projects, project memberships, drawings, revisions, acknowledgments, clarifications, and activity events.
- Database access will use environment-based connection configuration. Credentials must never be committed to source control.

### Drawing-File Storage

- Drawing files will be stored separately from ordinary database metadata where practical.
- The database will retain the file reference and relevant metadata.
- File access must be controlled; private drawings must not be exposed through unrestricted public URLs.
- Upload size, file type, and access permissions must be validated.

### Deployment

- The frontend and backend may be deployed as separate services.
- The database and file storage will use suitable hosted services.
- Deployment configuration, environment variables, and CORS settings must be documented.
- The project should have a public application URL for assessment demonstrations without requiring a purchased custom domain.

## 4. High-Level Component Flow

1. A user opens the React frontend.
2. The frontend sends API requests to the Express backend.
3. The backend authenticates the user and checks their permissions.
4. The backend reads or updates persistent database records.
5. When drawing files are involved, the backend or a controlled storage mechanism handles authorized file access.
6. The backend returns the result to the frontend.
7. The frontend displays the updated drawing status, acknowledgment state, clarification status, or error message.

## 5. Core Data Concepts

### User

Represents a person who can sign in to Draftera.

### Project

Represents a construction project with authorized members.

### Project Membership

Associates a user with a project and defines the user's role and permissions within that project.

### Drawing

Represents a logical drawing identified by a drawing number and title within a project.

### Drawing Revision

Represents a specific published revision of a drawing. It records the revision identifier, issue date, revision summary, file reference, publisher, and publication status.

### Revision Acknowledgment

Represents an acknowledgment by a specific recipient for a specific published revision. The record includes the acknowledgment status and timestamp. A new revision must not inherit the previous revision's acknowledgment records.

### Clarification

Represents a question or issue associated with a specific drawing revision. It records the author, question, responses where supported, status, and relevant timestamps.

### Activity Event

Represents a relevant action such as publishing a revision, acknowledging a revision, or updating a clarification. Activity records must not be presented as proof of actions that were never recorded.

## 6. Important Business Rules

- A user must not access a project merely by changing an identifier in a URL or API request.
- Only authorized users can publish revisions.
- Publishing a new revision must preserve previous revision records.
- The system must clearly identify the latest published revision.
- Superseded revisions remain available to authorized users for history and traceability.
- Acknowledgment belongs to a specific user and revision.
- Clarifications remain linked to the revision on which they were raised.
- Acknowledgment, approval, understanding, and implementation are different concepts.
- Dashboard counts must be calculated from persisted records rather than hard-coded sample values.
- Every important operation must handle invalid input and unauthorized requests safely.

## 7. Security Considerations

- Store password hashes rather than plaintext passwords.
- Protect authenticated API endpoints.
- Enforce role and project membership checks on the backend.
- Validate all user input on the server.
- Keep database credentials, authentication secrets, and storage credentials out of source control.
- Restrict cross-origin requests to the deployed frontend where appropriate.
- Apply file type and size limits and prevent unauthorized file downloads.
- Return safe error messages without exposing secrets or internal stack traces.
- Use HTTPS in the deployed application.
- Avoid storing sensitive authentication tokens in unsafe locations without evaluating the associated risks.

## 8. Initial Deployment Requirements

- Frontend builds and loads successfully from its deployed URL.
- Backend health endpoint responds successfully.
- The deployed frontend can communicate with the deployed backend.
- Database connectivity works in the deployed environment.
- Required environment variables are configured outside source control.
- Authentication, permissions, revision publishing, acknowledgment, and clarification flows are tested after deployment.
- No private drawing file can be downloaded by an unauthorized user.

## 9. Architecture Decisions Still to Confirm

- Database technology and hosting provider.
- Authentication approach and session/token storage.
- Drawing-file storage provider.
- Hosting providers for the frontend and backend.
- Whether email notifications are feasible within the assessment timeline.

These decisions must be made before implementation based on the assessment deadline, service limits, and security requirements.
