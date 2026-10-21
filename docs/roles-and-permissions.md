# Roles and permissions

Roles belong to a **project**, not to a person. The same account can supervise one project and be a subcontractor on another. Whoever starts a project becomes its **project supervisor**; the supervisor then adds other people as **site engineers** or **subcontractors**.

At sign-up a person chooses *site engineer or project lead* (can start projects) or *subcontractor* (is invited onto projects). Nobody can sign up as an administrator.

## What each role can do

| Capability | Supervisor | Site engineer | Subcontractor |
| --- | :---: | :---: | :---: |
| Start a project | yes (own projects) | yes (becomes its supervisor) | no |
| Change project status, name, description | yes | no | no |
| Add / remove team members | yes | no | no |
| Upload a drawing revision (draft) | yes | no | no |
| Publish a revision, choose recipients and deadline | yes | no | no |
| Issue an already-published revision to someone left off | yes | no | no |
| Send a reminder | yes | no | no |
| See drafts | yes | no | no |
| See every issued drawing in the project | yes | **yes** | **no, only drawings issued to them** |
| Open the PDF | yes | yes | only issued drawings |
| Acknowledge a revision | not applicable | yes, if issued to them | yes, if issued to them |
| See who has opened / acknowledged | everyone | **own status only** | **own status only** |
| Revision currency matrix, "possibly on an old revision" | yes | no | no |
| Download the CSV report, print the issue record | yes | no | no |
| Ask a question about a revision | yes | yes | yes (on drawings they can see) |
| Answer a question | yes | no | no |
| Resolve a question | yes | the person who asked | the person who asked |
| Activity feed | everything | team events + own actions | team events about their drawings + own actions |

### Why subcontractors only see what was issued to them
Subcontractors work to a narrow scope. Showing them every drawing is noise, and it would hide the central warning this product exists to give: *"you were not issued the latest revision"*. A drawing that was not issued to a subcontractor does not appear for them at all; asking for it answers "not found" rather than "forbidden", so they cannot probe for drawing numbers.

### Why members see only their own status
A team progress count such as "1 of 2 acknowledged" means nothing to someone who cannot see who the other person is, and showing who has not responded is a supervisor's tool, not a team scoreboard. Members see their own standing instead: *Acknowledged*, *Opened, not acknowledged* or *Not opened*, with the deadline.

## What a project's status allows

| Action | Active | On hold | Completed | Archived |
| --- | :---: | :---: | :---: | :---: |
| Upload, publish, issue to more people | yes | no | no | no |
| Add team members, send reminders | yes | no | no | no |
| Remove team members | yes | yes | no | no |
| Acknowledge, raise / answer / resolve questions | yes | yes | no | no |
| Read drawings, history, reports | yes | yes | yes | yes |
| Counts toward "waiting on you", risks, overdue | yes | yes | no | no |
| Shown in the default project list | yes | yes | no | no |

*On hold* pauses new work but lets people finish what they already hold. *Completed* and *archived* are read-only. The supervisor can set any status back to *Active* at any time. Every change is written to the activity log and emailed to the team.

## Rules that apply to everyone
- Drafts are private to the supervisor until published.
- Acknowledging needs the drawing to have been opened first.
- A superseded revision cannot be acknowledged; the newer one must be.
- Removing a person takes effect immediately; their history stays as part of the record.
