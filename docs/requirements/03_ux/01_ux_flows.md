# 01_UX_Flows.md

---

## How to Use This File

This file describes end-to-end user flows across the LMS — how features connect, what triggers what, and what happens in alternate or failure scenarios.

### Who uses it and how

| Reader | How to use |
|---|---|
| **Frontend developer** | Understand the sequence of API calls for a screen, what states to handle, what the user sees at each step, and what error/empty paths to show |
| **Backend developer** | Understand what a module must trigger after its own logic completes — audit events, notifications, compliance updates, downstream side effects |
| **QA engineer** | Derive test cases — every bullet under "Alternate / Exception Flows" is a test scenario |
| **AI coding assistant** | Feed the relevant flow section alongside `api.md` + `schema.md` when the logic spans multiple modules or the sequence matters |

### What this file is NOT

- Not a wireframe or UI design — no screen layouts here
- Not an API reference — use `engineering/features/XX/api.md` for request/response detail
- Not a test script — flows describe scenarios, not step-by-step test instructions

### How it fits with other engineering files

```
engineering/features/XX/api.md     →  What each endpoint does (request, response, errors)
engineering/features/XX/schema.md  →  Table structures, indexes, constraints
engineering/00_apisix_routes.md    →  All routes for gateway configuration
02_ux/01_ux_flows.md               →  How the pieces connect end-to-end
```

For AI-assisted code generation: feed `api.md` + `schema.md` as the primary context. Add the relevant flow section when the feature crosses module boundaries or the sequence of operations matters.

---

## 1. Employee Onboarding & First Login Flow

### Actors

Employee, Admin

### Description

Handles user creation from Zoho + Employee DB, first login via SSO, and initial setup including policy acceptance and mandatory assignments.

### Primary Flow

Zoho HR updates employee data
→ System sync job fetches Zoho + Employee DB data
→ User created/updated (State: Active, hierarchy mapped)
→ Employee opens LMS
→ System redirects user to Keycloak SSO
→ Employee authenticates through Keycloak / Azure AD
→ System validates token
→ System maps authenticated identity to LMS user

→ System checks first login

IF first login
→ Policy displayed
→ Employee accepts
→ System updates `PolicyAccepted = true`

→ Dashboard loaded
→ System evaluates compliance rules
→ Mandatory assignments created (State: Assigned)
→ Notification event created → queued → delivered

### Alternate / Exception Flows

* Sync failure → Retry → Admin alerted
* Missing hierarchy → User created without manager → flagged
* Duplicate user → Conflict flagged for admin resolution
* Policy not accepted → Access blocked except for policy screen
* Keycloak unavailable → Login blocked, user shown authentication unavailable message
* Azure AD authentication fails → User remains on Keycloak login flow, no LMS session created
* Token invalid → Access denied, re-authentication required
* User authenticated in Keycloak but not found in LMS → Access denied, admin intervention required
* User inactive in LMS → Login blocked after token validation
* Session already active → User redirected directly to dashboard

### System Notes

* Background Jobs: Zoho sync + employee DB sync
* Integrations: Zoho, Employee DB, Keycloak, Azure AD
* Authorization uses hierarchy + global roles
* No passwords stored in LMS
* Audit logging required for login success, login failure, access denied, and first policy acceptance

### Data Impact

* User (created/updated)
* Hierarchy mapping (created/updated)
* Policy acceptance flag (updated)
* Assignment (created)
* Notification (created → queued)
* Audit log (created)

---

## 1A. Session Validation & Token Expiry Flow

### Actors

Employee, Admin

### Description

Handles session continuity, token expiry, and re-authentication after the user has already logged in.

### Primary Flow

Employee performs LMS action
→ System checks access token validity
→ Token valid
→ Request processed
→ Response returned

### Alternate / Exception Flows

* Access token expired and refresh is supported by identity flow → System redirects through authentication refresh path → New token issued → Request retried
* Access token expired and refresh not available → User redirected to Keycloak login
* Token tampered / invalid signature → Access denied, session cleared, re-authentication required
* User deactivated after login → Current request denied, session invalidated, user redirected to login
* Role changed in Keycloak after login → New authorization applied on next validated session / re-login
* Hierarchy changed in employee DB after login → Team-based access recalculated on next request, no need to wait for logout

### System Notes

* Token validation occurs on protected requests
* LMS must not trust cached identity beyond token/session rules
* Authorization is recalculated using latest available role + hierarchy context
* Audit logging required for token expiry, invalid token, forced session invalidation

### Data Impact

* Session state (validated / invalidated)
* Audit log (created)
* No business records changed unless request proceeds

---

## 1B. Logout Flow

### Actors

Employee, Admin

### Description

Ensures logout clears LMS access and terminates the identity session correctly.

### Primary Flow

Employee clicks logout
→ LMS clears local session / token context
→ User redirected to Keycloak logout endpoint
→ Identity session terminated
→ User redirected to login page or public entry page

### Alternate / Exception Flows

* Keycloak logout endpoint unavailable → LMS clears local session and informs user that central logout may not be complete
* Session already expired → User redirected to login without error

### System Notes

* Logout must clear LMS session state even if external logout fails
* Audit logging required for logout events

### Data Impact

* Session state cleared
* Audit log created

---

## 1C. Access Denied / Unauthorized Access Flow

### Actors

Employee, Manager, HR, Admin

### Description

Handles cases where a user is authenticated but not authorized to access a page, record, or action.

### Primary Flow

User attempts protected action
→ System validates identity
→ System evaluates authorization using global role + hierarchy
→ Authorization fails
→ Access denied response returned
→ User shown restricted access message

### Alternate / Exception Flows

* Manager attempts access to non-team record → Denied
* Employee attempts admin/reporting action → Denied
* HR attempts access outside allowed compliance/reporting scope → Denied
* User role valid but hierarchy data missing → Restrictive access applied by default

### System Notes

* Authorization model is hybrid:
  * Global roles from Keycloak
  * Hierarchy from Employee DB
* Access denial must fail safe: deny by default if required authorization context is missing
* Audit logging required for denied access and permission violations

### Data Impact

* No business data changed
* Audit log created

---

## 2. Mandatory Training Assignment Flow

### Actors

Employee, Admin

### Description

Automatically assigns mandatory training based on compliance rules and employee attributes. Owned by the Assignment Engine — compliance status is computed and stored by the same module.

### Primary Flow

User created/updated
→ System evaluates rules (designation, capability, project)
→ Training identified
→ Assignment created (State: Assigned, DueDate set)
→ Compliance status initialized (State: Pending)
→ Notification queued

### Alternate / Exception Flows

* Duplicate assignment → Skipped
* Missing rule → No assignment

### System Notes

* Trigger: User update or sync
* Uses Employee DB attributes
* Compliance status owned by Assignment Engine (not a separate module)

### Data Impact

* Assignment (created)
* Compliance status (created: Pending)

---

## 3. Training Completion Flow

### Actors

Employee, Admin

### Description

Handles completion lifecycle and compliance status updates.

### Primary Flow

Employee opens training
→ System fetches content from OneDrive
→ Progress updated (State: In Progress)

→ Employee completes all required resources
→ System validates completion
→ Completion stored (State: Completed)

→ Compliance status recalculated by Assignment Engine

IF completed within due date → Compliant
IF completed after due date → Non-Compliant
IF not yet completed and not overdue → Pending

→ Certificate issued
→ Notification event queued

### Alternate / Exception Flows

* OneDrive failure → Retry / show error; progress saved
* Partial progress → Saved; can resume later
* Admin override completion → Forced completion recorded; certificate issued; compliance updated

### System Notes

* Integration: OneDrive (content streaming)
* Background Job: Compliance re-evaluation
* Compliance status owned by Assignment Engine

### Data Impact

* Progress (updated)
* Completion (created)
* Compliance status (updated)
* Certificate (issued)
* Notification (queued)

---

## 4. Self-Enrollment & Course Request Flow

### Actors

Employee, Manager, Admin

### Description

Handles optional course enrollment — direct enrollment for non-approval training, and approval workflow for approval-required training.

### Primary Flow

Employee selects course from catalog
→ System checks approval rule

IF no approval required
→ Assignment created directly (State: Assigned)
→ Notification queued

IF approval required
→ Request created (State: Pending)
→ Manager identified via hierarchy
→ Notification sent to manager
→ Request expires after 30 days if no decision (configurable via Admin settings)

Manager reviews request

IF approved
→ Assignment created (State: Assigned)
→ Request = Approved
→ Employee notified

IF rejected
→ Request = Rejected
→ Employee notified with reason

### Alternate / Exception Flows

* Manager missing in hierarchy → Admin intervention required
* Manager no response within expiry period → Request = Expired → Employee notified
* Employee re-applies after expiry → New request created (previous retained in history)
* Duplicate open request → Blocked; employee shown existing pending request

### System Notes

* Manager derived from hierarchy — NOT a role
* Approval expiry configurable: `assignment.approval_expiry_days` (default 30 days)
* Background job handles expiry evaluation daily

### Data Impact

* Request (created/updated)
* Assignment (created if approved)
* Notification (queued)

---

## 5. Manager Assignment Flow

### Actors

Manager, Employee

### Description

Allows manager to directly assign training to their direct reports based on hierarchy.

### Primary Flow

Manager selects team member
→ System validates hierarchy (direct report check)
→ Manager selects training
→ Sets due date
→ Assignment created (State: Assigned)
→ Notification queued to employee

### Alternate / Exception Flows

* Target user not in direct reports → Access denied
* Duplicate assignment → Skipped; manager shown existing assignment
* Training not published → Blocked

### System Notes

* Authorization is hierarchy-based only — no Manager role check
* Manager can only assign to depth=1 direct reports

### Data Impact

* Assignment (created)
* Notification (queued)

---

## 6. Classroom Session Flow

### Actors

Admin, HR, Manager, Employee

### Description

Handles creation, scheduling, participant management (direct add + Manager nominations), attendance recording, and completion for hybrid classroom sessions. All sessions are hybrid — participants can join physically (offline) or via Microsoft Teams (online).

### Primary Flow

**Session Creation**

Admin or HR creates session
→ Selects facilitator from managed list; selects venue from managed list
→ Sets max_participants, optional nomination window (open/close dates)
→ System auto-generates session code
→ System calls Teams Graph API to create meeting

IF Teams success
→ Session created (State: SCHEDULED, teams_meeting_link stored)

IF Teams failure
→ Session created (State: SCHEDULED, teams_link_status = PENDING_MANUAL)
→ Admin manually enters Teams meeting link before session goes live

→ Admin adds participants directly (status: INVITED)
→ Participants notified with Teams link + venue location

**Session Reminders**

Background job runs
→ First reminder sent 24 hours before session (configurable: `notification.session_reminder_hours_first`)
→ Final reminder sent 1 hour before session (configurable: `notification.session_reminder_hours_second`)

**Manager Nomination Flow (if nomination window configured)**

Nomination window opens (Admin-configured dates)
→ Manager opens upcoming sessions list → sees sessions with open nomination window
→ Manager nominates direct reports → `participant_status = NOMINATED`
→ Employee notified: "You have been nominated for [session]"
→ Admin notified for review

Admin reviews nominations
→ Confirms → `participant_status = CONFIRMED` → Employee + Manager notified
→ Rejects → `participant_status = REJECTED_NOMINATION` → Employee + Manager notified with reason

Manager cancels nomination (while window is still open)
→ Nomination withdrawn → Employee notified of cancellation

Nomination window closes
→ Admin notified with summary of pending (unreviewed) nominations

**Session Day — Attendance Recording**

ONLINE attendance (Teams):
→ After session end time passes, background job or Admin triggers Teams attendance pull
→ System calls Teams Graph API for attendance report
→ Auto-matches attendees to LMS users by email / AAD ID
→ Attendance recorded (source: TEAMS_AUTO)
→ Unmatched attendees logged; Admin reviews

OFFLINE attendance (in-person):
→ Admin or HR manually marks each participant as ATTENDED or NOT_ATTENDED
→ OR: Admin/HR downloads pre-filled Excel template → fills from paper sign-in sheet → uploads file
→ System parses Excel, previews matched records, HR confirms → records applied
→ Attendance recorded (source: ADMIN_MANUAL)

Admin override:
→ Admin can override any auto-recorded attendance
→ Source updated to ADMIN_OVERRIDE

**Session Completion**

Admin marks session COMPLETED
→ Unmarked offline participants default to NOT_ATTENDED
→ Training resource progress updated to COMPLETED for all ATTENDED participants
→ Assignment completion evaluated per participant
→ Notifications queued

### Alternate / Exception Flows

* Teams attendance pull fails → Admin or HR records attendance manually or imports via Excel
* Session cancelled → All INVITED + NOMINATED + CONFIRMED participants notified; assignments remain incomplete
* Participant removed before session → Participant notified
* Session rescheduled → Teams meeting updated; all INVITED + CONFIRMED participants re-notified with new details
* Capacity reached → No further participants can be added or nominations confirmed
* Nomination window closes with pending nominations → Admin notified to review

### System Notes

* All sessions are HYBRID — online + offline attendance both supported
* Participant statuses: INVITED (direct add), NOMINATED (Manager-submitted), CONFIRMED (Admin approved), REJECTED_NOMINATION (Admin rejected)
* Nomination window is optional — if not set, only Admin can add participants directly
* Session code auto-generated (SES-001, SES-002, …)
* Integrations: Microsoft Teams (Graph API)
* Reminder timing configurable via Admin settings: `notification.session_reminder_hours_first` (default 24h), `notification.session_reminder_hours_second` (default 1h)

### Data Impact

* Session (created/updated)
* Session participants (created/removed/status updated)
* Session attendance (created/updated)
* Training completion (updated for ATTENDED participants)
* Compliance status (re-evaluated)
* Notification (queued)
* Audit log (created)

---

## 7. Overdue & Escalation Flow

### Actors

Employee, Manager, HR, Admin

### Description

Detects overdue training assignments and triggers staged escalation notifications.

### Primary Flow

Scheduled background job runs daily
→ System checks all active assignments

IF due date passed and assignment not completed
→ Assignment status = Overdue
→ Compliance status = Non-Compliant

→ Escalation Level 1 (Day 7 from due date, configurable):
→ Notification queued to Employee + Manager

→ Escalation Level 2 (Day 30 from due date, configurable):
→ Notification queued to HR + Admin

### Alternate / Exception Flows

* Employee completes after overdue → Compliance updated to Non-Compliant (completed late); escalation stops
* Manager hierarchy missing → Level 1 notification sent to Admin instead
* Due date extended by Admin/Manager → Escalation counter resets

### System Notes

* Background Job: Overdue evaluator (daily)
* Escalation thresholds configurable via Admin settings:
  * `assignment.overdue_escalation_day_manager` (default 7 days)
  * `assignment.overdue_escalation_day_hr_admin` (default 30 days)

### Data Impact

* Assignment (updated: status = Overdue)
* Compliance status (updated: Non-Compliant)
* Notification (queued)
* Audit log (created)

---

## 8. Compliance Evaluation Flow

### Actors

Admin, HR, PES (external)

### Description

Assignment Engine evaluates and maintains compliance status for each user per mandatory training. PES reads this data via API — LMS never pushes to PES.

### Primary Flow

Trigger event (training completion / assignment update / scheduled job / sync)
→ Assignment Engine evaluates assignment status

States:
* Assignment not yet due → Pending
* Completed within due date → Compliant
* Overdue or incomplete after due date → Non-Compliant

→ Compliance status stored (Assignment Engine — `compliance_status` table)

→ PES calls LMS API on-demand to fetch compliance
→ LMS returns compliance state per employee per mandatory training
→ PES uses this for performance evaluation

### Alternate / Exception Flows

* Migrated completion data → Treated as completed; `is_migrated_basis = true` flag set
* Hierarchy unavailable → Mandatory rule evaluation deferred; last known state retained
* PES service account token invalid → 403 returned; PES must re-authenticate via Keycloak

### System Notes

* Compliance is NOT a standalone feature — owned by Assignment Engine
* `compliance_status` table maintained by Assignment Engine
* PES access via Keycloak Client Credentials (M2M); rate-limited at 100 req/min
* Every PES API call logged as `PES_API_ACCESSED` audit event
* No push from LMS to PES — PES pulls on demand

### Data Impact

* Compliance status (updated — owned by Assignment Engine)
* Audit log (created for PES access)

---

## 9. Reporting & Export Flow

### Actors

Admin, Manager, HR, Employee

### Description

Provides role-specific dashboards and paginated reports with hierarchy-based data scoping. Export is async.

### Primary Flow

**Dashboard**

User opens dashboard
→ System determines role and serves appropriate dashboard:

* Employee dashboard → Personal assignments in progress, overdue count, upcoming sessions, recent completions, certificates expiring soon, own compliance status
* Manager dashboard → Team completion rate, team overdue count, team non-compliant count, pending approvals, upcoming team sessions
* HR dashboard → Org-wide compliance summary, mandatory completion rate, non-compliant count, overdue mandatory count
* Admin dashboard → System-wide metrics: total users, completion rate, overdue assignments, pending approvals, upcoming sessions, export jobs pending

**Report**

User selects report type
→ System applies role-based scope:
  * Employee → own data only (SELF)
  * Manager → direct reports only (TEAM)
  * HR / Admin → org-wide (ORG)

→ Filters applied
→ Paginated results displayed

Available report types: Assignment Status, Compliance Status, Training Completion, Overdue Training, Session Attendance, Certificates, Learning History (Employee), Approval Requests

**Export**

User requests export
→ Export job created (State: Pending)
→ Job ID returned
→ Background worker generates file (Excel or PDF only)
→ User polls for status
→ Status = Ready → User downloads file
→ File expires after 24 hours (configurable via `system.export_file_retention_hours`)

### Alternate / Exception Flows

* No data matching filters → Empty state shown (not an error)
* Export job fails → Status = Failed → User re-submits
* Export file expired → User re-submits export request
* Manager attempts to export outside team scope → Scope enforced; extra filters ignored

### System Notes

* Export formats: Excel (.xlsx) and PDF only (no CSV)
* Export retention: 24 hours (configurable)
* Authorization enforced per report type and filter scope
* Background Job: Export file generation

### Data Impact

* Report export job (created)
* Export file (generated, stored temporarily)

---

## 10. Zoho & Employee Sync Flow

### Actors

Admin

### Description

Handles user and hierarchy synchronization from Zoho HR and Employee DB. Includes access-impacting updates.

### Primary Flow

Scheduled job runs (daily at 02:00 for Zoho, 02:30 for Employee DB)
→ Fetch Zoho HR data (employee identity, department, status)
→ Fetch Employee DB data (reporting manager, capability, designation, project allocations)
→ Merge and deduplicate by employee_id
→ Update users (Admin-overridden fields preserved — not overwritten)
→ Update hierarchy
→ Recalculate effective access context
→ Trigger mandatory assignment re-evaluation if attributes changed

### Alternate / Exception Flows

* Sync failure → Retry up to 3 times same day → Admin alerted on 3rd failure
* Partial data → Logged; unaffected records proceed
* User exists in Keycloak but no longer in source systems → Flagged for Admin review or deactivated per lifecycle rule
* Manager hierarchy removed → Manager-based approvals and visibility restricted until corrected
* Admin-overridden field conflicts with sync data → Conflict logged; override preserved

### System Notes

* Dual source sync (Zoho + Employee DB)
* Idempotent updates — re-running produces same result
* Sync schedule configurable; Admin can also trigger manually
* Admin-overridden fields (`user_field_overrides`) not overwritten by sync
* Access-related hierarchy changes affect future requests immediately

### Data Impact

* User (updated)
* Hierarchy (updated)
* Project allocations (full replace per sync)
* Access context (re-evaluated)
* Assignment (created if applicable)
* Audit log (created)

---

## 11. Migration Execution Flow

### Actors

Admin, HR

### Description

One-time controlled migration of legacy LMS data into the new system.

### Primary Flow

Admin starts migration
→ System validates pre-conditions (no prior migration run)
→ Extract legacy data (users, training, assignments, completions)
→ Transform and map identities to LMS schema
→ Load into LMS
→ Validate results (counts, errors)
→ Admin reviews summary

IF validation passes
→ Migration marked complete
→ Migrated completions flagged with `is_migrated_basis = true`
→ Go-live

### Alternate / Exception Flows

* Duplicate users → Flagged; deduplication by employee_id
* Validation failure → Admin reviews failure log; re-run after fix
* Re-execution attempted → Blocked by migration status check

### System Notes

* One-time process — re-execution blocked
* Migrated completion data treated as valid basis for compliance
* No notifications triggered for migrated records

### Data Impact

* Users (created)
* Training items (created)
* Assignments (created)
* Completions (created, flagged as migrated)
* Compliance status (initialized)

---

## 12. Notification Processing Flow

### Actors

Admin, Employee

### Description

Handles asynchronous notification delivery across in-app and email channels, with user preferences, retry logic, and Admin failure monitoring.

### Primary Flow

Business event occurs (assignment created, session reminder, approval decision, etc.)
→ Module publishes event with payload + idempotency key
→ Notification service checks idempotency key — silently discards if duplicate
→ Notification service checks user preferences per channel

IF user has opted out of this event type for a channel
→ That channel skipped

→ In-app notification record created (State: Queued)
→ Email queued if email channel enabled

Background worker processes queue
→ Attempts delivery per channel

IF success
→ Status updated: Delivered

IF failure
→ Retry (up to 3 attempts)
→ Status: Retrying

IF max retries exceeded
→ Status: Permanently Failed
→ Admin visible in failure monitoring dashboard

### Alternate / Exception Flows

* Mandatory event type (e.g. ASSIGNMENT_CREATED) → User cannot opt out; always delivered on all channels
* Email server unavailable → Retry; in-app delivery unaffected
* User deactivated → Notification not delivered; record retained
* Admin retries a permanently failed notification → Status reset to Queued; worker re-attempts

### System Notes

* Two delivery channels: In-App (bell icon) and Email
* Idempotency key format: `event_code:entity_id:user_id:date_bucket`
* Some notification types are mandatory (cannot be opted out)
* Notification records retained for 90 days (configurable via `system.notification_retention_days`)
* Reminder timing configurable via Admin settings

### Data Impact

* Notification (created/updated)
* Delivery log (created per attempt)
* Audit log (created for permanently failed notifications)

---

## 13. Search & Catalog Browse Flow

### Actors

Employee, Manager, HR, Admin

### Description

Enables users to discover training through catalog browsing (no keyword) or keyword search. All results are filtered by role and visibility rules.

### Primary Flow

**Catalog Browse (no keyword)**

User opens training catalog
→ System loads all PUBLISHED training (Employee/Manager/HR view)
→ Admin sees all lifecycle states
→ User applies optional filters (category, type, mandatory, tag, difficulty)
→ Results sorted: mandatory first, then alphabetical
→ User views training detail

**Keyword Search**

User types in search bar
→ System shows typeahead suggestions (prefix match, max 10, < 200ms)
→ User submits query (min 2 characters)
→ System executes full-text search across training, sessions (and users for Admin)
→ Results ranked by relevance + mandatory boost
→ Each result shows type indicator (training / session / user)
→ User clicks result → navigates to detail

### Alternate / Exception Flows

* Query < 2 characters → Typeahead shown; full search not triggered
* No results found → Empty state with suggested filters
* Admin searches users → Results include all lifecycle states and user records
* Employee searches → PUBLISHED training only; own sessions only

### System Notes

* Search engine: PostgreSQL full-text search (tsvector / GIN indexes) — no external search engine
* Catalog browse uses B-tree indexes on training_items
* Typeahead uses ILIKE prefix match on title
* Results filtered by role: Employee/Manager/HR see training + sessions; Admin also sees users
* `assignment_status` shown in catalog if user has an active assignment for the training

### Data Impact

* No writes (read-only flow)

---

## 14. Certificate View & Download Flow

### Actors

Employee, Manager, HR, Admin

### Description

Employee views and downloads their training completion certificate. Managers, HR, and Admin can view certificates for users within their scope.

### Primary Flow

Training assignment completed
→ System generates certificate (certificate number assigned: CERT-2026-001)
→ Certificate linked to completion record with expiry date (if training has validity period)
→ Employee notified

Employee opens My Certificates
→ System returns list of certificates (active, expiring soon, expired)
→ Employee selects certificate
→ Employee downloads PDF

### Alternate / Exception Flows

* Certificate expired (validity_period_days elapsed) → Shown as expired; recertification assignment auto-created by background job
* Manager views team member certificate → Scoped to direct reports only
* Admin / HR views any certificate → ORG_WIDE access

### System Notes

* Certificate validity driven by training `validity_period_days` setting
* Background job checks expiry daily; creates recertification assignments
* Certificate PDF generated at completion time; stored for download
* Expiry status: ACTIVE / EXPIRING_SOON (within 30 days) / EXPIRED

### Data Impact

* Certificate (created at completion)
* Assignment (recertification created on expiry)
* Notification (queued on expiry)

---

## 15. Admin Settings Management Flow

### Actors

Admin

### Description

Admin views and updates system configuration settings that control behaviour across all LMS modules. Changes apply immediately without restart.

### Primary Flow

Admin opens Settings page
→ System returns all settings grouped by module (Assignment, Notification, System)
→ Each setting shows: key, current value, type, default value, description, last changed by

Admin updates a setting
→ Enters new value
→ System validates value type (INTEGER, BOOLEAN, STRING, JSON)

IF invalid → Error shown; change not applied

IF valid
→ Previous value saved to change history
→ New value applied immediately
→ `ADMIN_CONFIG_UPDATED` audit event emitted
→ Downstream workers use new value on next execution

Admin views change history
→ Filtered by setting or module
→ Shows: who changed, old value, new value, timestamp

### Alternate / Exception Flows

* Invalid value type (e.g. text entered for INTEGER field) → Rejected with validation error
* Setting not found → 404 returned
* Admin attempts to delete a setting → Not permitted (settings are seeded, not deletable)

### System Notes

* Settings catalog (10 configurable settings):
  * `assignment.overdue_escalation_day_manager` — default 7 days
  * `assignment.overdue_escalation_day_hr_admin` — default 30 days
  * `assignment.approval_expiry_days` — default 30 days
  * `notification.due_date_reminder_days` — default 7 days
  * `notification.session_reminder_hours_first` — default 24 hours
  * `notification.session_reminder_hours_second` — default 1 hour
  * `system.export_file_retention_hours` — default 24 hours
  * `system.notification_retention_days` — default 90 days
  * `system.audit_log_retention_days` — default 1825 days (5 years)
  * `system.policy_current_version` — default v1 (current active policy version; compared against user's accepted version during login)
* Change history is permanent — never purged
* All settings have factory defaults — system runs without manual configuration

### Data Impact

* Admin settings (updated in place)
* Admin settings history (created — permanent)
* Audit log (created)

---

## 16. Integration Health Monitoring Flow

### Actors

Admin

### Description

Admin monitors the health of all external integrations and can trigger manual sync or retry failed jobs.

### Primary Flow

Admin opens Integration Health dashboard
→ System returns current status for all integrations:
  * HEALTHY — last job succeeded
  * DEGRADED — last job failed but success within 24h
  * DOWN — failed and no success in > 24h OR 3+ consecutive failures

Admin selects an integration
→ Views: last success time, last failure time, consecutive failures, last error summary
→ Views job history (paginated list of sync jobs with status)
→ Drills into a specific job → Views per-record error logs

IF integration is DEGRADED or DOWN
→ Admin triggers manual sync or retry
→ Job created (State: Pending)
→ Background worker executes
→ Health status updated on completion

### Alternate / Exception Flows

* Manual sync triggered while one already running → Blocked (`SYNC_ALREADY_RUNNING` error)
* Retry triggered when last job not in FAILED state → Blocked (`NO_FAILED_JOB` error)
* Health transitions to DOWN → Admin notified automatically

### System Notes

* Integrations monitored: ZOHO, EMPLOYEE_DB, KEYCLOAK, TEAMS, ONEDRIVE, PES
* Health status: updated after every job completion or failure
* Job logs retained for 90 days; health status is permanent
* PES API access also logged as integration jobs (job_type = API_ACCESS)

### Data Impact

* Integration health status (updated after each job)
* Integration jobs (created on manual trigger)
* Integration job logs (created per error/warning)
* Audit log (created)

---

## 17. Audit Log Search Flow

### Actors

Admin, HR, Manager

### Description

Admin searches the full audit trail. HR and Manager have scoped access to audit events relevant to their role.

### Primary Flow

User opens Audit Log screen
→ Applies filters: event type, module, actor, entity, date range, correlation ID
→ System returns paginated results (scoped by role):
  * Admin → all event types, all users
  * HR → compliance-relevant events only, all users
  * Manager → assignment/approval/session events for direct reports only

User selects an audit record
→ Views full detail: before/after values, IP address, HTTP method, correlation ID
→ Sensitive fields (email, name) shown masked per masking rules

Admin traces a full operation
→ Enters correlation ID
→ System returns all events sharing that correlation ID in chronological order
→ Full cross-module trace of one request visible

Admin exports audit logs
→ Selects filters + format (Excel or PDF)
→ Export job created asynchronously
→ User downloads when ready
→ File expires after 24 hours

### Alternate / Exception Flows

* HR attempts to view non-compliance event type → Access denied (403)
* Manager attempts to view events for non-direct-report → Access denied (403)
* Correlation ID has no matching events → 404 returned
* Export file expired → User re-submits export request
* Audit write failure (dead-letter) → Admin views in write-failure monitoring dashboard; can retry manually

### System Notes

* Retention: 5 years (configurable via `system.audit_log_retention_days`)
* `legal_hold = true` records never purged regardless of retention setting
* Email and sensitive fields masked in API response layer
* Dead-letter queue (`audit_write_failures`) captures events that fail to write — separate Admin view
* Correlation ID links all events from one request across modules

### Data Impact

* No writes during search (read-only)
* Audit export job (created on export request)

---

## 18. User Profile View & Edit Flow

### Actors

Employee, Manager, HR, Admin

### Description

Any authenticated user can view and edit their own profile. System-owned fields (department, designation, email, employee ID) are read-only and sourced from Zoho / Employee DB. Mutable fields (full name, phone, location) can be updated by the user directly.

### Primary Flow

User opens My Profile (sidebar nav → Profile)
→ `GET /api/v1/users/me` — loads full profile including hierarchy, summary stats
→ Profile screen rendered with identity, mutable fields, training summary, recent certificates
→ User clicks Edit
→ Mutable fields switch to input mode
→ User updates name / phone / location
→ User clicks Save
→ `PATCH /api/v1/users/me` — saves changes
→ Fields return to display mode; success toast shown

### Alternate / Exception Flows

* User tries to edit read-only field (department, email) → field remains disabled; tooltip explains it is managed by HR system
* Validation fails (e.g. name empty) → inline error shown; save blocked
* User clicks Cancel → inputs reverted to last saved values; no API call made
* Change password attempt → redirect to Keycloak account management page (LMS has no password endpoint — BR-01: LMS never stores passwords)

### System Notes

* `department`, `designation`, `capability` sourced from Employee DB via sync — not editable by user
* `email` and `employee_id` are identity fields — not editable by anyone except via Admin PATCH /users/{id}
* Notification preferences are stored separately; `PUT /api/v1/notifications/me/preferences`
* Role-specific options shown: Manager/HR/Admin see Team Alerts toggle; HR/Admin see System Alerts toggle

### Data Impact

* `users` table: `full_name`, `phone`, `location` updated
* Audit event `USER_SELF_PROFILE_UPDATED` emitted

---

## 19. Manager Team Assignment Flow

### Actors

Manager, Employee (notification recipient)

### Description

Manager assigns training to one or more direct reports from the Team Assignments screen. Assignment source is set to `MANAGER`. Duplicate prevention is enforced server-side.

### Primary Flow

Manager opens Team Assignments screen
→ `GET /api/v1/users/team-members` — loads direct reports list
→ `GET /api/v1/assignments/team` — loads existing assignments for context
→ Manager clicks "Assign Training" (or clicks a team member card)
→ Assign Training modal opens

Step 1 — Select members:
→ Manager selects one or more team members (checkboxes)
→ Selected members shown as pills

Step 2 — Choose training:
→ `GET /api/v1/trainings?lifecycle_state=PUBLISHED` — loads catalog
→ Manager searches and selects one training

Step 3 — Assignment details:
→ Manager sets due date, priority, optional note
→ Manager clicks "Assign Training"

→ `POST /api/v1/assignments` with `{ training_id, user_ids: [...], due_date, note }`
→ Backend enforces hierarchy — rejects any user_id not in manager's direct reports
→ Duplicate check run per user — skipped_users returned for duplicates
→ `ASSIGNMENT_CREATED` audit events emitted per user
→ Notification queued for each assigned user
→ Modal closes; success toast shown
→ Assignments table refreshes

### Alternate / Exception Flows

* No team members selected → submit blocked with inline error
* No training selected → submit blocked with inline error
* Due date in the past → validation error
* Some users have duplicate live assignments → partial success returned; skipped_users shown in toast
* Manager tries to assign to non-direct-report → `ACCESS_DENIED` (403) returned; error toast shown
* Training not published → `TRAINING_NOT_PUBLISHED` (400) returned

### System Notes

* `assignment_source = MANAGER` set by backend
* Manager can assign up to 100 users per request (enforced by backend)
* No approval required — manager assignment creates assignment directly

### Data Impact

* `assignments` created (source = MANAGER)
* `notifications` queued per user
* Audit events emitted

---

## 20. Offline Session Attendance Marking (Admin / HR)

### Actors

Admin, HR

### Description

For classroom sessions, online attendance cannot be auto-fetched from Teams. Participants sign a physical paper sheet. HR transfers this to an Excel file and imports it, or marks attendance manually per participant. Both paths result in the same `OFFLINE / ADMIN_MANUAL` attendance records.

### Primary Flow — Excel Import (Preferred for Classroom)

Admin or HR opens Session Management (admin-sessions.html)
→ Clicks "Mark Attendance" on a classroom session row → attendance modal opens
→ Clicks "Import Excel"
→ Import modal opens

Step 1 — Upload:
→ `GET /api/v1/sessions/{session_id}/attendance/template` → downloads pre-filled template
→ HR fills `attendance` column from physical sign-in sheet (ATTENDED / NOT_ATTENDED)
→ HR drags & drops or browses to select the completed .xlsx file
→ Clicks "Preview Records"

Step 2 — Preview & Confirm:
→ File sent to `POST /api/v1/sessions/{session_id}/attendance/import` (multipart)
→ Server parses file → returns parsed rows with matched/unmatched status + warnings
→ Preview table shown: attended count, absent count, warning rows highlighted
→ HR reviews warnings (unmatched IDs, invalid values — those rows skipped)
→ Clicks "Confirm Import"
→ Valid rows applied: `attendance_mode = OFFLINE`, `attendance_source = ADMIN_MANUAL`
→ Success toast: "X records imported"

### Alternate Path — Manual Per-Row Marking

Admin or HR opens attendance modal
→ Attendance table shown with participant list
→ Admin / HR clicks "Mark Attended" or "Edit" per row
→ Clicks "Save Attendance"
→ `PUT /api/v1/sessions/{session_id}/attendance` with `{ attendance_mode: "OFFLINE", records: [...] }`
→ Backend sets `attendance_source = ADMIN_MANUAL`

→ When ready: Admin clicks "Complete Session"
→ `POST /api/v1/sessions/{session_id}/complete`
→ Unmarked participants default to NOT_ATTENDED
→ ATTENDED participants: training resource progress → COMPLETED
→ Completion evaluation triggered per assignment
→ `SESSION_COMPLETED` audit event emitted
→ Notifications sent to attendees

### Alternate / Exception Flows

* Session is CANCELLED → `PUT /sessions/{id}/attendance` returns `SESSION_ALREADY_CANCELLED` (422)
* User not a participant → `USER_NOT_SESSION_PARTICIPANT` (422)
* Teams attendance already auto-fetched → Admin can override individual records; sets `attendance_source = ADMIN_OVERRIDE`
* HR marks attendance but Admin completes session → both actions valid; backend merges attendance records

### System Notes

* `attendance_mode = OFFLINE` set in request body
* Bulk update — all records sent in one call (not per-participant API calls)
* HR access is limited to viewing attendance and recording offline marks — cannot complete or cancel sessions

### Data Impact

* `session_attendance` rows created/updated
* `assignment_resource_progress` updated on session complete
* Compliance status recomputed on completion
* Audit events: `SESSION_ATTENDANCE_RECORDED` per record, `SESSION_COMPLETED`

---

## 21. Training Creation — Multi-Step Wizard

### Actors
- Admin

### Entry Point
- "New Training" button (top right of Training Management page)

### Flow

```
Admin clicks "New Training"
→ 4-step wizard opens as full-page overlay

Step 1: Basic Info
  → Admin enters: Title, selects Type (Course/LP/Curriculum), Category
  → Code auto-generated (e.g. TRN-050)
  → Optionally: Description, Difficulty, Duration, Tags
  → Clicks "Next: Resources"

Step 2: Resources
  → Admin adds resources inline: Video, Document, Assessment, Link, Session
  → Can drag-and-drop to reorder; mark each as required/optional
  → Can skip (add resources later via "Manage Resources" in training list)
  → Clicks "Next: Settings"

Step 3: Settings
  → Mandatory toggle ON/OFF
    → If ON: Assignment Rule section expands
      → "Assign To" dropdown:
          All Employees / Specific Department / Designation / Capability / Project / New Joiners (Probation)
      → If "New Joiners (Probation)" selected:
          → Designation filter (optional)
          → Capability filter (optional)
          → "Required for probation completion" toggle (auto-checked)
          → Due days pre-fills to 90
      → is_probation_gateway toggle appears (marks training eligible for probation rules)
  → Validity period days (blank = permanent)
  → Completion mode dropdown
  → Prerequisites multi-select
  → Requires manager approval toggle
  → Issue certificate toggle
  → Clicks "Next: Review"

Step 4: Review & Publish
  → Summary of all data (Basic Info + Resources count + Settings)
  → "Save as Draft" / "Publish"
  → Wizard closes; training appears in list
```

### Edit Flow
- "Edit" (pencil icon) → wizard opens pre-populated on Step 1
- "Manage Resources" (collection icon) → navigates to `admin-training-resources.html` directly

### API Calls
- `POST /api/v1/trainings`
- `POST /api/v1/trainings/{id}/resources` (per resource in Step 2)
- `POST /api/v1/assignments/rules` (if mandatory rule in Step 3)

---

## 22. New Employee Probation Training Auto-Assignment

### Actors
- System (automated)
- Employee (receives notifications)

### Trigger
- User created with `employment_phase = PROBATION` (Zoho sync or manual Admin creation)

### Flow

```
User created with employment_phase = PROBATION
→ System creates user_probation record
    → probation_start_date = joining_date
    → probation_end_date = joining_date + 90 days (default)
    → probation_status = PROBATION

→ Assignment Engine evaluates active rules with rule_scope = EMPLOYMENT_PHASE
    → Matches by designation_filter and capability_filter (null = match all)
    → For each matched rule: assignment created with is_probation_gate = true
    → due_date = joining_date + rule.due_date_days_from_assignment

→ PROBATION_STARTED audit event emitted
→ Employee notified: "X training(s) required for probation — due by [date]"
→ Employee sees gate trainings in "My Training" with probation badge
```

### API Calls
- System-internal: `POST /api/v1/assignments` per matched rule

---

## 23. Probation Completion Evaluation (HR)

### Actors
- HR
- System

### Entry Point
- HR nav → Probation → Employee list → "View Details"

### Flow

```
HR opens Probation Dashboard
→ List of probationers: name, designation, X/Y gates complete, readiness badge
→ Readiness: ON_TRACK / AT_RISK / OVERDUE

HR clicks "View Details" on an employee
→ Gate training checklist:
    → ✓ COMPLIANT / ⏰ PENDING / ✗ NON_COMPLIANT per training
→ "Confirm Probation" button — enabled only when ALL gates COMPLIANT
→ "Extend Deadline" button — available always

IF all gates COMPLIANT:
  → HR clicks "Confirm Probation"
  → POST /api/v1/probation/{user_id}/confirm
  → user_probation.probation_status = CONFIRMED
  → users.employment_phase = CONFIRMED
  → PROBATION_COMPLETED audit event emitted

IF gates incomplete:
  → "Confirm Probation" disabled with message
  → HR clicks "Extend Deadline" → enters new date + reason
  → POST /api/v1/probation/{user_id}/extend
  → probation_status = EXTENDED
  → Employee notified of new deadline
```

### API Calls
- `GET /api/v1/probation`
- `GET /api/v1/probation/{user_id}`
- `POST /api/v1/probation/{user_id}/confirm`
- `POST /api/v1/probation/{user_id}/extend`

---

## 24. Manual User Creation with Probation Phase (Admin)

### Actors
- Admin (creates user)
- System (auto-triggers probation gate)
- Employee (receives notification)

### Trigger
- Admin clicks "Add User" on the Users Management screen for a new joiner not yet in Zoho, or for a user whose Zoho record is pending.

### Flow

```
Admin opens Add User modal
→ Fills in: Full Name, Work Email, Department, Designation, Capability, Role, Employee ID (optional)

→ Selects Employment Phase = "Probation — New Joiner"
    → Joining Date field appears (required)
    → Probation info banner shown:
       "Probation gate activated — gate trainings will be auto-assigned on save"

→ Admin enters Joining Date (defaults to today)
→ Admin clicks "Save User"

→ POST /api/v1/users
    Body includes: employment_phase = "PROBATION", joining_date

→ System creates user record (source_system = MANUAL)
→ Keycloak account provisioned (async)
→ System creates user_probation record:
    probation_start_date = joining_date
    probation_end_date   = joining_date + 90 days
    probation_status     = PROBATION

→ Assignment Engine evaluates active EMPLOYMENT_PHASE rules
    → Matches by designation_filter and capability_filter (null = match all)
    → Creates assignments with is_probation_gate = true

→ PROBATION_STARTED audit event emitted
→ Employee notified: "Welcome — X training(s) required for probation confirmation by [date]"
→ Employee sees gate trainings in "My Training" with probation badge
→ Probation banner shown on Employee Dashboard
```

### Key Difference from Zoho Sync Path
- Zoho sync sets `employment_phase` automatically from `employee_status` field mapping
- Manual creation requires Admin to explicitly select "Probation" in the Employment Phase dropdown
- Both paths produce identical downstream behavior: same `user_probation` record, same gate assignment logic, same notifications
- If the user is later synced from Zoho (matching `employee_id`), `source_system` updates to `ZOHO_HR`; manually overridden fields tagged `manually_overridden = true` are preserved until Admin clears them

### API Calls
- `POST /api/v1/users`
- _(async)_ Assignment Engine: `POST /api/v1/assignments/rules` evaluation
- _(async)_ `POST /api/v1/probation` (internal — created by system, not directly by Admin)

---

# End of Document
