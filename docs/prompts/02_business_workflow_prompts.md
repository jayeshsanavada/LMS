# AZ-LMS — Business Workflow Diagram Generation Prompts

**Instructions:**
- Run each prompt in a separate conversation to generate one workflow at a time
- Save each output to `docs/visual_diagrams/workflows/`
- These prompts are written for BUSINESS users — output should be clear, jargon-free swimlane diagrams
- Reference the listed feature spec files before running each prompt

---

## WORKFLOW 1 — Role & Persona Overview

```
You are generating a role and capabilities overview diagram for the AZ-LMS system.

Read the files:
- docs/requirements/01_product/master_prd.md
- docs/requirements/04_architecture/03_modules.md (Section 11: Authorization)
- docs/requirements/02_features/02_user_management.md (Section 2: Actors)

Generate a Mermaid diagram or formatted table showing the 4 user roles and their key capabilities.

ROLES AND CAPABILITIES:

ADMIN (Global Role — assigned via Keycloak):
Can do:
- Create and manage all training (Courses, Learning Paths, Curricula)
- Publish / archive training content
- Assign training to any user or group
- Create, reschedule, and cancel classroom sessions
- Manage facilitator list and venue list (via ⚙ icon)
- Add/remove participants from sessions
- Confirm or reject manager nominations for sessions
- Record and update session attendance (online/offline)
- Configure all system settings (9 configurable settings)
- Assign and remove global roles (HR, ADMIN) via Keycloak
- Create and deactivate users manually
- Trigger Zoho HR and Employee DB sync manually
- View all audit logs and approve certificates
- View all reports (all users, all teams, all sessions)
- Monitor integration health

HR (Global Role — assigned via Keycloak):
Can do:
- View org-wide compliance status for all employees
- Run compliance, attendance, assignment, completion reports
- Export reports (Excel or PDF, async)
- View and monitor probation status for all employees
- Confirm probation completion
- Extend probation deadline (with reason)
- Mark offline session attendance (when Admin unavailable)
- Manage mandatory training assignments (with Admin coordination)
Cannot do:
- Create or publish training content
- Modify system settings
- Assign roles

MANAGER (Derived from Employee DB hierarchy — NOT a Keycloak role):
Can do:
- View their team's training assignments and completion status
- Assign training to direct reports only (depth = 1)
- Approve or reject training requests from direct reports
- Nominate direct reports for sessions within a nomination window
- Cancel nominations while the window is open
- View team compliance and overdue reports
Cannot do:
- View employees outside their direct reports
- Create training or sessions
- Change system settings
- Access admin functions

EMPLOYEE (Default role for all users):
Can do:
- View their own training dashboard and assignments
- Browse the published training catalog
- Self-enroll in training without approval
- Submit a request for approval-required training
- Join sessions via Teams link
- Download certificates (when approved)
- Update notification preferences
- View their own compliance status
Cannot do:
- See other employees' data
- Approve requests
- Create or assign training

IMPORTANT NOTES:
- "Manager" is NOT a Keycloak role — it is dynamically derived from the reporting hierarchy
- All employees also have the EMPLOYEE role; managers with HR responsibilities may also be HR
- Admin can never be reduced to 0 — last Admin protection enforced (LAST_ADMIN_PROTECTED error)

Output as:
1. A Mermaid flowchart or table showing roles and capabilities side by side
2. A short paragraph (3-5 sentences) explaining the role model in plain English for business stakeholders
```

---

## WORKFLOW 2 — Employee Onboarding Workflow

```
You are generating an employee onboarding workflow diagram for the AZ-LMS system.

Read the files:
- docs/requirements/02_features/02_user_management.md (Section 6: Workflows)
- docs/requirements/03_ux/01_ux_flows.md (Flow 1: Employee Onboarding & First Login)

Generate a Mermaid swimlane diagram (flowchart with subgraph per actor).

ACTORS (swimlanes):
1. Zoho HR System
2. Admin
3. LMS System (automated)
4. Employee

FLOW STEPS:

Zoho HR System lane:
1. New employee added to Zoho HR

LMS System lane:
2. Daily sync job fetches employee data from Zoho HR (+ Employee DB for hierarchy)
3. LMS creates user record (status = Active, role = EMPLOYEE)
4. Employee DB sync maps reporting manager → user_hierarchy created
5. Mandatory training rules evaluated automatically
6. Assignment(s) created (status = ASSIGNED, due_date set based on rule config)
7. Notification queued → Employee receives "Training Assigned" notification

Employee lane:
8. Employee opens LMS in browser
9. Keycloak redirect → Azure AD login
10. Employee authenticates via SSO
11. First login: Policy acceptance screen shown
12. Employee accepts policy
13. Dashboard loads: shows assigned training with due dates

Admin lane (parallel / exception path):
- If user not synced automatically: Admin can create user manually (employee_id, email, full_name, department)
- If hierarchy missing: User flagged — admin reviews; user can login but manager capabilities restricted

RESULTS:
- Employee has confirmed identity in LMS
- Mandatory training assigned with due dates
- Employee can access training catalog
- Manager can see employee in their team view

SHOW alternate paths:
- Sync fails → Retry up to 3 times → Admin alerted
- Employee not in Zoho/LMS → 401 USER_NOT_PROVISIONED → Admin creates manually
- User deactivated → 403 USER_DEACTIVATED

Output as a Mermaid flowchart using subgraph for each actor swimlane.
Add a plain-English summary (4-5 sentences) for business stakeholders at the end.
```

---

## WORKFLOW 3 — Training Lifecycle Workflow (Admin)

```
You are generating a training content lifecycle workflow diagram for AZ-LMS.

Read the files:
- docs/requirements/02_features/03_training_management.md (Sections 3, 6)
- docs/requirements/03_ux/01_ux_flows.md (Flow 3: Training Completion)

Generate a Mermaid swimlane diagram.

ACTORS (swimlanes):
1. Admin
2. LMS System (automated)
3. Employee

TRAINING LIFECYCLE STATES:
DRAFT → PUBLISHED → INACTIVE (ARCHIVED)
Note: There is NO "REVIEW" state in Phase 1 — Admin directly publishes from DRAFT.

FLOW STEPS — TRAINING CREATION:

Admin lane:
1. Admin opens Training Management
2. Admin uses 4-step wizard:
   Step 1: Fills Basic Info (Title, Type[Course/Learning Path/Curriculum], Category, Description, Difficulty, Tags)
   Step 2: Adds Resources (Video URL from OneDrive, PDF uploaded to OneDrive, Assessment questions, External Link, or Session link)
   Step 3: Sets Settings (Mandatory toggle, Assignment rules/scope, Completion mode, Requires approval, Prerequisites, Certificate toggle, Probation gateway toggle)
   Step 4: Reviews and saves as DRAFT or publishes
3. Training saved as DRAFT (not visible to employees)
4. Admin reviews and clicks "Publish"

LMS System lane:
5. Training status → PUBLISHED
6. Training visible in employee catalog
7. New assignments automatically use this version

FLOW — TRAINING UPDATE (after first publish):

Admin lane:
8. Admin edits a PUBLISHED training (opens wizard pre-populated)
9. Admin saves changes → stored as a draft state (no version increment yet)
10. Admin clicks "Publish" again

LMS System lane:
11. NEW VERSION CREATED (version_no incremented)
12. Existing employee assignments on OLD version: unaffected (still valid)
13. New assignments going forward: reference the new version

FLOW — TRAINING INACTIVATION:

Admin lane:
14. Admin clicks "Archive" on a published training

LMS System lane:
15. Training status → INACTIVE
16. Existing in-progress assignments: employees can still complete
17. New assignments to inactive training: BLOCKED
18. Employees see "Retired" badge on their active assignment
19. Certificates still generated on completion of inactive training

SHOW as side note:
- Training hierarchy: Curriculum → Learning Path → Course → Resource
- Resource types: Video (mp4/URL), PDF/Document (OneDrive), Assessment (built-in quiz), External Link, Session
- Sequential lock: Resources can be locked until previous ones are completed
- Clone: Admin can clone training → creates new DRAFT with new code and version 1

Output as a Mermaid flowchart with swimlanes.
Add a plain-English summary (4-5 sentences) for business stakeholders.
```

---

## WORKFLOW 4 — Training Completion Workflow (Employee)

```
You are generating an employee training completion workflow diagram for AZ-LMS.

Read the files:
- docs/requirements/02_features/03_training_management.md (Section 6: Workflows — Training Completion)
- docs/requirements/02_features/04_assignment_engine.md (Section 6: Completion Flow)
- docs/requirements/03_ux/01_ux_flows.md (Flow 3: Training Completion Flow)

Generate a Mermaid swimlane diagram.

ACTORS (swimlanes):
1. Employee
2. LMS System (automated)
3. Admin (exception path)

PRIMARY FLOW:

Employee lane:
1. Employee opens "My Training" dashboard
2. Sees assigned training with due date and status (ASSIGNED / IN PROGRESS / OVERDUE)
3. Employee clicks on a training
4. System checks prerequisites (if any training prerequisites defined → must be completed first)
5. Employee accesses resources:
   - Video: watches until 100% completion
   - PDF/Document: opens file (single open = marked complete)
   - Assessment: takes quiz, must achieve passing score within allowed attempts
   - External Link: clicks link (single click = marked complete)
   - Session: marked complete via attendance confirmation
6. Progress auto-saved after each resource

LMS System lane:
7. Each resource completed → progress updated
8. When ALL required resources in Course are complete → Course status = COMPLETED
9. If Course is part of Learning Path → LP completion evaluated
10. If LP is part of Curriculum → Curriculum completion evaluated
11. IF training has issue_certificate = true:
    → Certificate generated with status = PENDING_APPROVAL
    → Admin notified to approve
12. Compliance status recalculated:
    - Completed within due date → COMPLIANT
    - Completed after due date → NON_COMPLIANT (late)
13. Assignment status → COMPLETED
14. Employee receives "Training Completed" notification

Admin lane (certificate approval):
15. Admin sees pending certificate in "Cert Approvals" tab
16. Admin reviews and: 
    APPROVE → certificate status = APPROVED, employee can download
    REJECT → admin enters rejection reason → employee notified → can re-attempt

Employee lane (download):
17. Employee goes to Certificates screen
18. If APPROVED: downloads PDF certificate
19. If PENDING: sees "Pending Approval" badge (download locked)
20. If REJECTED: sees rejection reason + Re-attempt link

EXCEPTION PATHS:
- Assessment attempts exhausted → Course blocked from auto-completion → Admin can reset attempts OR override completion
- Admin manual completion override → Completion recorded (source = ADMIN) → Certificate generated
- OneDrive unavailable → Employee sees "File temporarily unavailable" → saves progress when available
- Prerequisites not met → Access blocked with error PREREQUISITE_NOT_MET

Note: If training has validity_period_days set → background job monitors expiry → when expired:
→ Compliance reverts to PENDING
→ New assignment auto-created
→ Employee notified to re-complete

Output as a Mermaid flowchart with swimlanes.
Add a plain-English summary (4-5 sentences) for business stakeholders.
```

---

## WORKFLOW 5 — Assignment & Approval Workflow

```
You are generating a training assignment and approval workflow diagram for AZ-LMS.

Read the files:
- docs/requirements/02_features/04_assignment_engine.md (Sections 3, 6)
- docs/requirements/03_ux/01_ux_flows.md (Flows 4, 5)

Generate a Mermaid swimlane diagram with THREE sub-flows.

ACTORS (swimlanes):
1. Employee
2. Manager (via hierarchy — NOT a role)
3. Admin
4. LMS System (automated)

--- SUB-FLOW A: MANDATORY AUTO-ASSIGNMENT ---

LMS System lane:
1. User created OR user attributes updated (designation/capability/project change)
2. Assignment Engine evaluates all active mandatory assignment rules
3. Rules matched by: rule_scope [GLOBAL, DEPARTMENT, DESIGNATION, CAPABILITY, PROJECT, EMPLOYMENT_PHASE]
4. Deduplication: only ONE assignment per user per training (highest priority rule wins)
5. Assignment(s) created (source = MANDATORY, status = ASSIGNED)
6. Due date = assigned_at + rule's due_date_days_from_assignment
7. Employee notified immediately

Notes:
- No approval needed for mandatory assignments
- Applies to: new joiner creation, designation change, capability update, project allocation change, completion expiry (recertification)

--- SUB-FLOW B: MANAGER ASSIGNMENT ---

Manager lane:
1. Manager opens Team Assignments
2. Manager selects one or more direct reports (depth=1 only)
3. Manager selects a PUBLISHED training from the catalog
4. Manager sets due date (optional) and adds a note
5. Manager submits assignment

LMS System lane:
6. System validates: target user is a direct report of the manager
7. Duplicate check: same user + same training with active status → blocked (409 DUPLICATE_ASSIGNMENT)
8. Assignment created (source = MANAGER, status = ASSIGNED)
9. Employee notified

--- SUB-FLOW C: EMPLOYEE SELF-ENROLLMENT & APPROVAL ---

PATHWAY 1 — Training WITHOUT approval required:
Employee lane:
1. Employee browses catalog (only PUBLISHED training visible)
2. Employee clicks "Enroll" on training without requires_approval flag

LMS System lane:
3. Duplicate check run
4. Assignment created (source = SELF_ENROLLED, status = ASSIGNED)
5. Employee notified with confirmation

PATHWAY 2 — Training WITH approval required:
Employee lane:
1. Employee clicks "Request" on training with requires_approval = true

LMS System lane:
2. Request created (status = PENDING)
3. Manager identified via reporting hierarchy (user_hierarchy table)
4. Manager notified

Manager lane:
5. Manager reviews request in "Approvals" screen
IF APPROVED:
6. Assignment created (source = SELF_APPROVED, status = ASSIGNED)
7. Employee notified with approval
IF REJECTED:
8. Request closed (status = REJECTED)
9. Employee notified with rejection reason
IF NO ACTION IN 30 DAYS (configurable via Admin settings):
10. Request expires (status = EXPIRED)
11. Employee notified — can re-submit

ASSIGNMENT CANCELLATION:
Admin can cancel ANY non-completed assignment
Manager can cancel assignments THEY created within their hierarchy
Cancelled assignments are kept in history (never deleted)
Employee notified on cancellation
Status = CANCELLED (COMPLETED assignments cannot be cancelled)

Output as a Mermaid flowchart with swimlanes showing all three sub-flows clearly separated.
Add a plain-English summary (4-5 sentences) for business stakeholders.
```

---

## WORKFLOW 6 — Overdue & Escalation Workflow

```
You are generating an overdue training escalation workflow diagram for AZ-LMS.

Read the files:
- docs/requirements/02_features/04_assignment_engine.md (Sections 4, 6 — Overdue Flow)
- docs/requirements/02_features/06_notifications.md (Overdue notification events)
- docs/requirements/03_ux/01_ux_flows.md (Flow 7: Overdue & Escalation Flow)

Generate a Mermaid swimlane timeline/sequence diagram.

ACTORS (swimlanes):
1. LMS System (Background Job)
2. Employee
3. Manager (via hierarchy)
4. HR
5. Admin

FLOW:

LMS System lane:
1. Background job runs DAILY
2. Identifies all assignments where: due_date < today AND status IN (ASSIGNED, IN_PROGRESS)
3. Status updated from IN_PROGRESS → OVERDUE
4. Compliance status updated to NON_COMPLIANT

ESCALATION CHAIN:

Day 0 — Due date passes, not complete:
LMS System: Sends ASSIGNMENT_OVERDUE_D0 notification
Employee lane: Receives overdue notification — "Your training [Title] is now overdue"

Day 7 — Still overdue (7 days after due date):
Threshold configurable via Admin: assignment.overdue_escalation_day_manager (default 7)
LMS System: Sends ASSIGNMENT_OVERDUE_D7 notification
Manager lane: Receives escalation — "[Employee Name]'s training [Title] is 7 days overdue"
Employee lane: No additional notification at this step

Day 30 — Critical overdue (30 days after due date):
Threshold configurable via Admin: assignment.overdue_escalation_day_hr_admin (default 30)
LMS System: Sends ASSIGNMENT_OVERDUE_D30 notification
HR lane: Receives critical escalation notice
Admin lane: Receives critical escalation notice
All notifications include: employee name, training name, due date, days overdue

RESOLUTION PATHS:

Path A — Employee completes training:
Employee completes → Assignment = COMPLETED
Compliance status recalculated:
  If completed late → NON_COMPLIANT (completed after due date)
Escalation notifications STOP automatically
Certificate generated if applicable

Path B — Manager reassigns / extends due date:
Manager updates due date → escalation counter resets from new due date
Employee notified of due date change

Path C — Admin cancels assignment:
Assignment = CANCELLED (retained in history)
Employee notified
Escalation stops

EDGE CASES to show:
- If manager hierarchy missing at Day 7 → notification sent to Admin instead
- Overdue escalation paused for deactivated users
- On reactivation → mandatory training re-evaluation triggered

Note at bottom:
"Escalation thresholds are configurable in Admin Settings:
- assignment.overdue_escalation_day_manager (default: 7 days)
- assignment.overdue_escalation_day_hr_admin (default: 30 days)"

Output as a Mermaid swimlane flowchart.
Add a plain-English explanation (4-5 sentences) for business stakeholders.
```

---

## WORKFLOW 7 — Classroom Session Workflow

```
You are generating a classroom session management workflow diagram for AZ-LMS.

Read the files:
- docs/requirements/02_features/05_sessions.md (Sections 3, 4, 6)
- docs/requirements/03_ux/01_ux_flows.md (Flow 6: Classroom Session Flow)

Generate a Mermaid swimlane diagram covering the FULL session lifecycle.

ACTORS (swimlanes):
1. Admin
2. Manager
3. Employee
4. LMS System (automated)
5. Microsoft Teams

LIFECYCLE STATES: SCHEDULED → COMPLETED / CANCELLED

--- PHASE 1: SESSION CREATION ---

Admin lane:
1. Admin opens Sessions → New Session
2. Fills in:
   - Title
   - Linked training (MUST be PUBLISHED — Course, Learning Path, or Curriculum)
   - Facilitator (selected from managed list; ⚙ to manage list)
   - Venue (selected from managed list; ⚙ to manage list)
   - Date/Time (cannot be in the past)
   - Max participants (capacity cap — no waitlist)
   - Optional: Nomination window (open date → close date, both before session start)
   - Optional: Notes
3. Clicks Save

LMS System lane:
4. Auto-generates session code (SES-001, SES-002, ...)
5. Attempts Teams meeting creation via Graph API

Microsoft Teams lane:
IF success:
6. Teams meeting created → link stored (teams_link_status = AUTO_CREATED)
IF failure:
6b. teams_link_status = PENDING_MANUAL → Admin must provide link manually

LMS System continues:
7. Session status = SCHEDULED

--- PHASE 2: PARTICIPANT MANAGEMENT ---

Admin lane (Direct add path):
8. Admin selects users → status = INVITED
9. LMS sends SESSION_INVITED notification to each participant with Teams link

Manager lane (Nomination path — only if nomination window configured):
10. Manager opens Sessions → sees session with open nomination window
11. Manager selects direct reports to nominate → status = NOMINATED
12. LMS notifies: Employee (nominated), Admin (nomination submitted for review)

Admin lane:
13. Admin reviews nominations in session management
    CONFIRM → status = CONFIRMED → Employee + Manager notified
    REJECT → status = REJECTED_NOMINATION → Employee + Manager notified with reason
14. Manager can CANCEL a nomination while window is open → Employee notified

--- PHASE 3: SESSION REMINDERS ---

LMS System lane:
15. Background job runs hourly
16. 24 hours before session: SESSION_REMINDER_24H sent to all INVITED + CONFIRMED participants
17. 1 hour before session: SESSION_REMINDER_1H sent to all INVITED + CONFIRMED participants
(Timing configurable via Admin: notification.session_reminder_hours_first, notification.session_reminder_hours_second)

--- PHASE 4: SESSION DAY & ATTENDANCE ---

ONLINE ATTENDANCE (Teams automatic):
LMS System lane:
18. After session end time passes → background job triggers Teams attendance pull
19. Fetches attendance report from Teams Graph API
20. Matches participants by email/AAD ID → creates session_attendance records (source = TEAMS_AUTO)
Admin lane:
21. Admin can override any individual attendance record (source = ADMIN_OVERRIDE)

OFFLINE ATTENDANCE (manual or Excel import):
Admin/HR lane:
22. Admin or HR opens attendance view for the session
23. Option A: Manually marks each participant ATTENDED / NOT_ATTENDED
24. Option B: Downloads Excel template → HR fills from paper sign-in sheet → uploads file
25. System parses Excel, previews with warnings for unmatched rows → HR confirms
26. Valid rows applied as ATTENDED / NOT_ATTENDED (source = ADMIN_MANUAL)

--- PHASE 5: COMPLETION ---

Admin lane:
27. Admin clicks "Mark Session Completed"

LMS System lane:
28. All unmarked offline participants default → NOT_ATTENDED
29. For each ATTENDED participant:
    → Training resource progress → COMPLETED
    → Assignment completion evaluated
    → Compliance status re-evaluated
    → Certificate generated if applicable
30. Session status → COMPLETED (locked — no further changes)
31. TRAINING_COMPLETED notifications queued for all attendees

--- EXCEPTION PATH: RESCHEDULING ---

Admin lane:
- Admin updates date/time/venue
- LMS attempts Teams meeting update
- All INVITED + CONFIRMED participants re-notified (SESSION_RESCHEDULED)

--- EXCEPTION PATH: CANCELLATION ---

Admin lane:
- Admin cancels session
- Session → CANCELLED
- All INVITED + NOMINATED + CONFIRMED participants notified immediately
- Training assignments for session remain incomplete (no completion credit)
- SESSION_CANCELLED audit event emitted

Output as a Mermaid flowchart with swimlanes.
Add a plain-English summary (4-5 sentences) for business stakeholders.
```

---

## WORKFLOW 8 — Probation Management Workflow

```
You are generating a probation management workflow diagram for AZ-LMS.

Read the files:
- docs/requirements/02_features/12_probation_management.md (Sections 3, 6)
- docs/requirements/02_features/04_assignment_engine.md (Probation Training Assignment Flow)

Generate a Mermaid swimlane diagram.

ACTORS (swimlanes):
1. Admin (configures rules)
2. LMS System (automated)
3. Employee (Probationer)
4. HR

--- PHASE 1: RULE CONFIGURATION (one-time setup by Admin) ---

Admin lane:
1. Admin opens Training Management → creates/edits a training
2. Enables "Mandatory Training" → sets Assign To = "New Joiners (Probation)"
3. Optionally filters by: Designation and/or Capability
4. Sets "Due in days" (default: 90)
5. Enables "Required for probation completion" toggle (is_probation_gate = true)
6. Training must have is_probation_gateway = true to be eligible

--- PHASE 2: PROBATION INITIATION ---

LMS System lane:
7. New user created with employment_phase = PROBATION (via Zoho sync or Admin manual creation)
8. LMS automatically creates user_probation record:
   - probation_status = PROBATION
   - probation_end_date = joining_date + 90 days (configurable)
9. Rule engine evaluates all active EMPLOYMENT_PHASE rules
10. Matches rules against user's designation + capability (null filter = match all)
11. For each matched rule: creates assignment with is_probation_gate = true
12. Due date = joining_date + rule's due_date_days_from_assignment

Employee lane:
13. Employee receives notification: "Probation started — required gate trainings assigned"
14. Employee sees gate training list in My Training with deadline

--- PHASE 3: PROBATION MONITORING ---

Employee lane:
15. Employee completes gate training assignments one by one
16. Each completion is recorded and compliance evaluated per training

HR lane:
17. HR opens HR Probation dashboard
18. Sees list of all probationers with:
    - Training completion status (COMPLIANT / PENDING / NON_COMPLIANT per gate)
    - Probation status badge: On Track / At Risk / Overdue
    - Start date, end date, number of gate trainings complete

--- PHASE 4: PROBATION CONFIRMATION ---

NORMAL PATH (all gate trainings COMPLIANT):
HR lane:
19. HR opens per-employee probation detail → sees checklist
20. All gates show COMPLIANT → "Confirm Probation" button enabled
21. HR clicks "Confirm Probation"

LMS System lane:
22. System validates: all is_probation_gate = true assignments are COMPLIANT
23. user_probation.probation_status → CONFIRMED
24. users.employment_phase → CONFIRMED
25. PROBATION_COMPLETED audit event emitted
26. Employee notified: "Probation confirmed — you are now a confirmed employee"

EXTENSION PATH (deadline approaching, not all gates complete):
HR lane:
27. HR clicks "Extend Deadline" → enters new date + reason
28. POST /api/v1/probation/{user_id}/extend

LMS System lane:
29. user_probation.extended_until = new_date, probation_status → EXTENDED
30. Employee notified of extension with new deadline

TERMINATION PATH (employee exits during probation):
LMS System lane:
31. Zoho sync detects employment_status = EXITED
32. user_probation.probation_status → TERMINATED
33. users.employment_phase → EXITED
34. No training completion generated

EDGE CASES to show:
- No matching rules → no gate assignments → HR can confirm immediately
- Admin CANNOT bypass gate validation — only HR can confirm
- Rules added AFTER probation started: NOT retroactively applied

SHOW compliance gate requirement:
→ "Confirm Probation blocked if ANY gate training is not COMPLIANT (PENDING or NON_COMPLIANT)"

Output as a Mermaid flowchart with swimlanes.
Add a plain-English summary (4-5 sentences) for business stakeholders.
```

---

## WORKFLOW 9 — Notification Event Map

```
You are generating a notification event catalog diagram for AZ-LMS.

Read the file:
- docs/requirements/02_features/06_notifications.md (Section 4: Notification Event Catalog)

Generate a formatted Mermaid diagram OR a detailed table showing ALL notification events.

Format: Mermaid mindmap or table with these columns:
- Event Code
- When It Triggers
- Who Receives It
- Channel (In-App + Email)
- Can User Opt Out? (Yes / No — Mandatory)
- Timing

ASSIGNMENT EVENTS:
| ASSIGNMENT_CREATED | Assignment created for employee | Employee | Both | NO (mandatory) | Immediate |
| ASSIGNMENT_CANCELLED | Assignment cancelled | Employee | Both | NO (mandatory) | Immediate |
| ASSIGNMENT_DUE_REMINDER | X days before due date | Employee | Both | YES | Default: 7 days before (configurable) |
| ASSIGNMENT_OVERDUE_D0 | Due date passed, not complete | Employee | Both | NO | Day 0 (immediate on overdue detection) |
| ASSIGNMENT_OVERDUE_D7 | Still overdue after 7 days | Manager (via hierarchy) | Both | NO | Day 7 (configurable) |
| ASSIGNMENT_OVERDUE_D30 | Still overdue after 30 days | HR + Admin | Both | NO | Day 30 (configurable) |

APPROVAL EVENTS:
| APPROVAL_REQUEST_SUBMITTED | Employee submits request | Manager (via hierarchy) | Both | NO (mandatory) | Immediate |
| APPROVAL_REQUEST_APPROVED | Manager approves | Employee | Both | NO (mandatory) | Immediate |
| APPROVAL_REQUEST_REJECTED | Manager rejects | Employee | Both | NO (mandatory) | Immediate with reason |
| APPROVAL_REQUEST_EXPIRED | No decision in 30 days | Employee | Both | NO (mandatory) | On expiry |

SESSION EVENTS:
| SESSION_INVITED | Added to a session | Employee | Both | NO (mandatory) | Immediate — includes Teams link |
| SESSION_RESCHEDULED | Session date/time/venue changed | All INVITED + CONFIRMED | Both | NO (mandatory) | Immediate |
| SESSION_CANCELLED | Session cancelled | All INVITED + CANCELLED + CONFIRMED | Both | NO (mandatory) | Immediate with reason |
| SESSION_REMINDER_24H | 24 hours before session | Employee | Both | YES | 24h before (configurable) |
| SESSION_REMINDER_1H | 1 hour before session | Employee | Both | YES | 1h before (configurable) |
| SESSION_PARTICIPANT_REMOVED | Removed from session | Employee | Both | NO (mandatory) | Immediate |

COMPLETION EVENTS:
| TRAINING_COMPLETED | Assignment marked COMPLETED | Employee | Both | YES | Immediate |

PROBATION EVENTS:
| PROBATION_STARTED | New joiner enters probation | Employee | Both | NO | On user creation |
| PROBATION_EXTENDED | Probation deadline extended by HR | Employee | Both | NO | Immediate |
| CERTIFICATE_APPROVED | Admin approves certificate | Employee | In-App + Email | NO | Immediate |
| CERTIFICATE_REJECTED | Admin rejects certificate with reason | Employee | In-App + Email | NO | Immediate with reason |

DELIVERY NOTES:
- All notifications are asynchronous (worker queue — never inline)
- Idempotency key: {event_code}:{entity_id}:{recipient_user_id}:{date_bucket}
- Failed emails retried 3 times with 15-minute backoff
- Admin can view failed notifications and trigger manual retry
- Migrated historical data does NOT trigger any notifications

CONFIGURABLE TIMINGS (Admin Settings):
- notification.due_date_reminder_days = 7 (Days before due date)
- notification.session_reminder_hours_first = 24 (Hours before session — first reminder)
- notification.session_reminder_hours_second = 1 (Hours before session — second reminder)
- system.notification_retention_days = 90 (Days to retain notification records)

Output as a clear table or Mermaid mindmap node diagram.
Add a 3-sentence explanation for business stakeholders on how the notification system works.
```

---

## WORKFLOW 10 — Compliance & Reporting Workflow

```
You are generating a compliance tracking and reporting workflow diagram for AZ-LMS.

Read the files:
- docs/requirements/02_features/07_reporting.md
- docs/requirements/03_ux/01_ux_flows.md (Flows 8, 9)

Generate a Mermaid swimlane diagram.

ACTORS (swimlanes):
1. Employee
2. Manager
3. HR
4. Admin
5. LMS System / PES (External)

--- COMPLIANCE STATUS LIFECYCLE ---

LMS System lane:
1. Assignment created → compliance_status initialized = PENDING
2. On each state change (training progress, completion, overdue detection):
   System re-evaluates per-user compliance per mandatory training:
   - Assignment not yet due → PENDING
   - Completed within due date → COMPLIANT
   - Overdue / incomplete after due date → NON_COMPLIANT
3. compliance_status table updated (owned by Assignment Engine)

--- ROLE-BASED DASHBOARD ACCESS ---

Employee lane:
4. Opens Employee Dashboard → sees:
   - Own assignments in progress
   - Overdue count
   - Upcoming sessions
   - Own compliance status
   - Recent completions and certificates

Manager lane:
5. Opens Manager Dashboard → sees:
   - Team completion rate (direct reports only — depth=1)
   - Team overdue count
   - Team NON-COMPLIANT count
   - Pending approval requests
   - Upcoming team sessions

HR lane:
6. Opens HR Dashboard → sees:
   - Org-wide compliance summary
   - Mandatory training completion rate (COMPLIANT %)
   - Non-compliant count (by department, capability, BU)
   - Overdue mandatory training count
   - Probation tracking statistics

Admin lane:
7. Opens Admin Dashboard → sees:
   - All system metrics (all users, all assignments)
   - Pending certificate approvals
   - Export jobs in progress
   - Integration health status
   - Notification failure count

--- REPORT GENERATION & EXPORT ---

All roles (scoped by access):
8. User selects Report Type:
   Available: Assignment Status, Compliance Status, Training Completion,
   Overdue Training, Session Attendance, Certificates, Learning History, Approval Requests
9. Applies filters (date range, department, training item, status, etc.)
10. Views paginated results in UI

EXPORT (async pattern):
11. User clicks "Export" → chooses format: Excel (.xlsx) or PDF (CSV NOT supported)

LMS System lane:
12. Export job created (status = PENDING) → returns job_id immediately
13. Background worker generates file
14. User polls for status using job_id:
    PENDING → PROCESSING → COMPLETED / FAILED
15. When COMPLETED: user downloads file
16. File deleted automatically after 24 hours (configurable: system.export_file_retention_hours)

DATA SCOPE BY ROLE:
- Employee → own data ONLY
- Manager → direct reports only (hierarchy depth = 1)
- HR → all users / org-wide
- Admin → all users / org-wide + system metrics

PES INTEGRATION:
LMS System / PES lane:
17. PES system calls LMS API on-demand:
    GET /api/v1/integrations/pes/compliance/{employee_id}
18. LMS returns compliance_state per mandatory training per employee
    (PENDING / COMPLIANT / NON_COMPLIANT, plus due_date, completion_date)
19. PES uses this for their performance evaluation system
20. Every PES call logged: PES_API_ACCESSED audit event
21. LMS NEVER pushes to PES — PES always pulls on demand

Output as a Mermaid swimlane diagram.
Add a plain-English summary (4-5 sentences) for business stakeholders.
```

---

## WORKFLOW 11 — Audit & Traceability Flow

```
You are generating an audit trail workflow diagram for AZ-LMS.

Read the file:
- docs/requirements/02_features/08_audit.md

Generate a Mermaid swimlane diagram.

ACTORS (swimlanes):
1. User / System (any actor performing an action)
2. LMS System (audit capture)
3. Admin / HR (audit viewer)

FLOW:

User/System lane:
1. Any state-changing operation occurs in LMS:
   Examples: User created, training published, assignment created/cancelled,
   session completed, role changed, settings updated, attendance recorded,
   certificate approved, PES API accessed

LMS System lane:
2. Operation executes (DB write, API response)
3. Immediately after: audit event emitted (ASYNC — does NOT block the main operation)
4. Audit worker picks up event from queue
5. Sensitive fields masked before write:
   - Email: only first 3 chars + @domain shown (jay***@company.com)
   - Tokens: fully redacted
6. Writes to audit_logs table (INSERT ONLY — no UPDATE, no DELETE ever)
7. Each log entry contains:
   - event_code (e.g. ASSIGNMENT_CREATED, USER_DEACTIVATED, SESSION_COMPLETED)
   - actor_user_id (who triggered the action)
   - entity_type + entity_id (what was affected)
   - old_value_json (before state)
   - new_value_json (after state)
   - correlation_id (links all events from ONE HTTP request)
   - created_at (immutable timestamp)
   - legal_hold (boolean — permanent retention override)

FAILURE PATH:
8. If audit write fails:
   → Write to audit_write_failures dead-letter table
   → Worker retries hourly
   → Admin can see failure count in Admin Dashboard
   → "Audit write failures NEVER block the originating operation"

RETENTION:
9. Background job runs WEEKLY
10. Purges audit_logs older than system.audit_log_retention_days (default: 1825 = 5 years)
11. EXCEPTION: legal_hold = true records are PERMANENTLY retained (exempt from purge)

Admin/HR lane:
12. Admin opens Audit Logs screen
13. Can search/filter by: event_code, actor_user_id, entity_type, date range, correlation_id
14. Can see full before/after state for any logged event
15. Can view audit dead-letter failures

ROLE-BASED VISIBILITY:
- Admin: sees ALL audit events
- HR: sees org-level events (user sync, compliance changes, session completions)
- Manager: limited visibility (only events relevant to their direct reports)

KEY AUDIT EVENTS to show as examples on diagram:
AUTH_LOGIN_SUCCESS / AUTH_LOGIN_FAILURE
USER_CREATED_SYNC / USER_DEACTIVATED / USER_ROLE_CHANGED
TRAINING_PUBLISHED / TRAINING_COMPLETED
ASSIGNMENT_CREATED / ASSIGNMENT_COMPLETED / ASSIGNMENT_CANCELLED
SESSION_CREATED / SESSION_COMPLETED / SESSION_CANCELLED
APPROVAL_REQUEST_APPROVED / APPROVAL_REQUEST_REJECTED
PROBATION_COMPLETED / PROBATION_EXTENDED
PES_API_ACCESSED
ADMIN_SETTINGS_CHANGED

Output as a Mermaid swimlane diagram.
Add a plain-English summary (3-4 sentences) for business stakeholders on why the audit trail exists and what it enables.
```

---

*Last updated: 2026-04-11*
*Base path: `c:\Users\jayesh.sanavada\OneDrive - Azilen Technologies Pvt. Ltd\Development\AZ-LMS\lms_rad\`*
