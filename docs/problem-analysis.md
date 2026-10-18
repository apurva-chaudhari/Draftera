# Draftera — Problem Analysis

**Project:** Draftera  

**Assessment:** Synckraft Technologies Pvt. Ltd. — SK-SEL-03  

**Domain:** Construction drawing revision and communication  

**Document status:** Initial research and analysis  

**Version:** 1.0

## 1. Executive Summary

Draftera is proposed as a construction drawing revision and communication platform focused on improving the traceability of changing instructions between supervisors, site engineers, and subcontractors.

The assessment describes a situation in which a subcontractor may act on an older drawing while a supervisor assumes the latest revision has reached everyone.

The proposed investigation focuses on how revisions are issued, communicated, acknowledged, clarified, and tracked. The objective is to reduce uncertainty about who received a revision, who responded, and which communication remains outstanding.

## 2. Problem Statement

Construction projects involve multiple stakeholders who depend on current drawings and instructions to coordinate their work.

When a drawing is revised, the change must reach the appropriate people in a timely and unambiguous manner. If communication relies on disconnected channels, informal follow-ups, unclear revision labels, or assumptions about receipt, different stakeholders may work with different information.

This can contribute to rework, delays, disagreements, and uncertainty about responsibility.

These potential causes and consequences are hypotheses to investigate, not established findings for every construction project.

## 3. Scope and Boundaries

### In scope

- Recording drawing revisions and their identifiers.
- Communicating revision instructions to responsible stakeholders.
- Tracking acknowledgment status.
- Recording clarification requests and responses.
- Maintaining a traceable revision and communication history.
- Identifying outstanding acknowledgments.
- Controlling access to project information according to user roles.

### Out of scope

- Automated defect inspection.
- Purchase orders and procurement workflows.
- Replacing approved engineering drawings or formal document-control procedures.
- Automatically certifying that a drawing is safe to use.
- Treating acknowledgment as proof that a person fully understands an instruction.

## 4. Initial Stakeholder Analysis

### Project supervisor

Needs to issue revisions clearly, identify intended recipients, monitor responses, and follow up on outstanding acknowledgments.

### Site engineer

Needs to access the correct revision, understand the associated instructions, and coordinate changes with site activities.

### Subcontractor

Needs to identify the revision relevant to their work, access the associated instructions, acknowledge receipt, and request clarification when information is unclear.

### Project or document-control administrator

May need to maintain project records, manage access, and review revision history. The exact responsibilities depend on the project's operating procedures.

## 5. Potential Causes to Investigate

1. Revisions may be distributed through several communication channels.
2. Revision identifiers may not be sufficiently prominent or consistent.
3. Recipients may be omitted from distribution lists.
4. A sent message may be mistaken for confirmed receipt.
5. Acknowledgment may not be recorded in a shared location.
6. Clarification requests may become separated from the relevant revision.
7. Superseded drawings may remain accessible without a clear status indicator.
8. Site personnel may face connectivity, device-access, language, or time constraints.

These are initial hypotheses. Research and stakeholder feedback are required before determining which causes matter most.

## 6. Proposed Solution Direction

Draftera will explore a centralized workflow in which a supervisor publishes a drawing revision with a unique identifier, change summary, issue date, and intended recipients.

The system will provide:

- A clear revision history.
- A visible indication of the latest published revision.
- Recipient-specific acknowledgment tracking.
- Clarification requests linked to the relevant revision.
- Recorded responses and timestamps.
- A dashboard for pending communication.
- Access controls for project drawings and records.

The system should distinguish between published, delivered where delivery evidence is available, acknowledged, clarification requested, and clarification resolved. These statuses must reflect actual system events rather than assumptions.

## 7. Research Approach

The investigation will use the following approach:

1. Review relevant information-management standards and authoritative guidance.
2. Identify stakeholder needs and potential failure points.
3. Compare centralized revision tracking with informal communication and basic shared-folder approaches.
4. Document assumptions, constraints, and unresolved questions.
5. Define requirements and acceptance criteria based on the findings.
6. Validate the proposed workflow against realistic construction scenarios.

Where direct interviews or site observations are not possible, that limitation must be disclosed. Hypotheses must not be presented as interview findings or measured industry statistics.

## 8. Initial Assumptions

- A project can have multiple drawings and multiple revisions per drawing.
- Different stakeholders have different responsibilities and access requirements.
- A revision may require acknowledgment from more than one recipient.
- Clarification requests need to remain linked to the revision that prompted them.
- A reliable history should identify the user and timestamp associated with each recorded action.
- Connectivity and device availability may vary across construction sites.

These assumptions must be validated or revised as the design develops.

## 9. Practical Constraints

- Limited implementation time for the six-day assessment.
- Need for a straightforward interface for busy site personnel.
- Secure handling of construction drawings and project information.
- Potentially unreliable internet access at some sites.
- Risk of confusing a technical acknowledgment with formal approval.
- Need to avoid duplicate, ambiguous, or conflicting revision records.

## 10. Preliminary Success Criteria

The proposed solution should allow a reviewer to verify that:

- A revision has a clear identifier and associated drawing.
- Intended recipients can be identified.
- Each recipient's acknowledgment status is visible.
- Clarification requests and responses remain associated with the relevant revision.
- Revision and communication history can be reviewed.
- Unauthorized users cannot access restricted project records.
- The application does not silently represent an unacknowledged revision as acknowledged.

Quantitative targets should be set only after the scope and realistic test scenarios have been defined.

## 11. Current Conclusion

The initial analysis suggests that revision confusion should be approached as a communication, traceability, and coordination problem rather than merely a file-storage problem.

A centralized revision workflow with explicit acknowledgment, clarification tracking, and accessible history is a plausible solution direction. Its usefulness will depend on clear responsibilities, accurate records, usable workflows, and fit with existing site procedures.

Further research and requirements analysis are needed before treating this approach as validated.

## 12. References and Evidence Register

- ISO 19650-1, information management using building information modelling — concepts and principles. Official overview: https://www.iso.org/standard/68078.html
- ISO 19650-5, security-minded approach to information management. Official overview: https://www.iso.org/standard/74206.html

**Evidence note:** These standards are relevant background references. The specific causes listed in this document remain hypotheses until supported by additional evidence. Verify the applicable editions and detailed requirements before making claims about compliance.
