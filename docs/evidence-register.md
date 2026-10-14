\# Draftera — Research Evidence Register



\*\*Project:\*\* Draftera

\*\*Assessment:\*\* Synckraft Technologies Pvt. Ltd. — SK-SEL-03

\*\*Document status:\*\* Initial desk research

\*\*Version:\*\* 1.0

\*\*Research date:\*\* 14 October 2026



\## 1. Purpose



This register records the initial sources reviewed while investigating construction drawing revision confusion. It separates source-supported information from project hypotheses and proposed design decisions.



\## 2. Source Register



\### Source E1 — ISO 19650-1



\- \*\*Title:\*\* Organization and digitization of information about buildings and civil engineering works — Information management using building information modelling — Part 1: Concepts and principles.

\- \*\*Publisher:\*\* International Organization for Standardization (ISO).

\- \*\*Official source:\*\* https://www.iso.org/standard/68078.html

\- \*\*Relevant subject:\*\* Information exchange, recording, versioning, and organization.

\- \*\*Finding:\*\* The standard provides a framework for managing information throughout the lifecycle of built assets.

\- \*\*Relevance to Draftera:\*\* Supports investigating controlled drawing revisions, structured information records, and traceable information exchange.

\- \*\*Limitation:\*\* “ISO 19650-1:2018 remains the current published edition as of this research check, but a replacement is under development. Verify the status again before making compliance claims



\### Source E2 — UK BIM Framework, Guidance Part C



\- \*\*Title:\*\* Facilitating the Common Data Environment — Workflow and Technical Solutions.

\- \*\*Publisher:\*\* UK BIM Framework.

\- \*\*Publication:\*\* Edition 1, September 2020.

\- \*\*Source:\*\* https://ukbimframework.org/wp-content/uploads/2021/02/Guidance-Part-C\_Facilitating-the-common-data-environment-workflow-and-technical-solutions\_Edition-1.pdf

\- \*\*Relevant subject:\*\* Common data environments, metadata, revision control, and status allocation.

\- \*\*Finding:\*\* The guidance describes structured approaches to managing information containers and their revisions and statuses.

\- \*\*Relevance to Draftera:\*\* Informs the proposed revision history, visible status indicators, and controlled information workflow.

\- \*\*Limitation:\*\* This is implementation guidance. It does not independently validate Draftera's proposed features or establish their effectiveness for the assessment scenario.



\### Source E3 — Cloud-Based System for Pre-Tender Drawing Revision Management



\- \*\*Authors:\*\* Lim Shi Kei, Tay Sin Yee, Mohammad Fakhrul Haiqal Bin Azman, Khairi Aziman Bin Kamal Arifin, Aiman Haziq Bin Khairul Rizal, and Norhazren Izatie Mohd.

\- \*\*Publication:\*\* International Journal of Research and Innovation in Social Science (IJRISS), 2026.

\- \*\*DOI:\*\* https://doi.org/10.47772/IJRISS.2026.1014MG0036

\- \*\*Article:\*\* https://rsisinternational.org/journals/ijriss/view/cloud-based-system-for-pre-tender-drawing-revision-management

\- \*\*Relevant subject:\*\* Drawing revision management in pre-tender workflows.

\- \*\*Finding:\*\* The abstract discusses manual drawing management, fragmented records, version-control difficulties, and potential human error.

\- \*\*Relevance to Draftera:\*\* Provides a research lead for examining whether structured digital revision management can address problems associated with manual processes.

\- \*\*Limitation:\*\* The paper concerns a particular pre-tender context. Its methodology, results, and limitations must be reviewed before drawing broader conclusions.



\## 3. Evidence-to-Design Mapping



| Research topic | Proposed design implication |

|---|---|

| Information versioning | Give each drawing revision a clear identifier and retain its history. |

| Structured information management | Record revision metadata such as issue date, change summary, and responsible user. |

| Information status | Distinguish draft, published, and superseded revisions where applicable. |

| Information exchange | Record intended recipients and the communication associated with each revision. |

| Accountability and traceability | Keep user-attributed timestamps for acknowledgment and clarification events. |

| Access management | Restrict project drawings and records according to user permissions. |



These are proposed design implications, not claims that the cited sources require this exact application design.



\## 4. Initial Hypotheses Requiring Validation



1\. Stakeholders may not always have a clear indication of which revision is current.

2\. Sending a revision may be mistaken for confirming that the intended recipient received it.

3\. Clarification requests may become separated from the drawing revision they concern.

4\. Communication history may be fragmented across different channels.

5\. A centralized revision and acknowledgment history may improve visibility of outstanding communication.



These hypotheses should be validated against the assessment's problem statement, realistic scenarios, and stakeholder feedback where available.



\## 5. Important Terminology



\- \*\*Published:\*\* The revision has been formally made available through the application's workflow.

\- \*\*Delivered:\*\* Delivery has been confirmed by an available technical signal; it must not be inferred from publication alone.

\- \*\*Acknowledged:\*\* The recipient has explicitly recorded acknowledgment.

\- \*\*Clarification requested:\*\* The recipient has submitted a question associated with the revision.

\- \*\*Clarification resolved:\*\* The clarification has been explicitly marked resolved according to the defined workflow.

\- \*\*Approved:\*\* A formal approval state, which must not be inferred from acknowledgment.



An acknowledgment does not prove that the recipient understood the revision, obtained approval, or used that revision during construction.



\## 6. Research Limitations



\- This is initial desk research, not a systematic literature review.

\- The sources cover information management and drawing revisions but do not establish the frequency of the specific failure scenario in the assessment.

\- No site interviews or observations are claimed in this register.

\- No industry-wide statistics or measured improvement claims are made.

\- The cited standards and guidance do not establish that Draftera is compliant with ISO 19650.

\- Further research should examine the actual assessment requirements, relevant workflows, security expectations, and practical site constraints.



\## 7. Conclusion



The initial sources support investigating structured information management, revision control, status visibility, and traceable communication as relevant design concerns.



Draftera will use these concepts to guide requirements development. The proposed features and their expected benefits remain hypotheses until tested against the assessment scenario and realistic user workflows.

