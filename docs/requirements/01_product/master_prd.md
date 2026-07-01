# Enterprise Learning Management System (LMS)
# Master Product Requirements Document

---

## About This Document

This document is the **master product requirements summary** for the Enterprise LMS. It is written for business stakeholders and client review.

**Who should read this:**
- Client stakeholders and product owners — to verify the system does what the business needs
- Project managers — to understand the full scope and delivery plan
- QA teams — to understand the expected behavior from a business perspective
- New team members — to get a complete picture of what is being built and why

**What this document covers:**
- Product goals and business objectives
- All user personas and their capabilities
- Full feature scope and behavior
- Integration landscape
- Technical approach (non-technical summary)
- What is out of scope for Phase 1

**What this document does NOT cover:**
- API endpoint specifications (see `docs/requirements/engineering/features/`)
- Database table design (see `docs/requirements/engineering/features/`)
- Screen-by-screen UI layouts (see `docs/requirements/02_ux/02_screens.md`)
- Detailed UX flows (see `docs/requirements/02_ux/01_ux_flows.md`)

**How to read this document:**
Read sections 1–4 for the big picture. Sections 5–17 cover each functional area in detail. Section 18 onwards covers technical approach and constraints.

---

# 1. Product Overview

## Product Name
Enterprise Learning Management System (LMS)

## What We Are Building

A centralized, enterprise-grade Learning Management System that allows the organization to:

- Manage all employee training in one place
- Automatically assign and track mandatory compliance training
- Support hybrid classroom sessions (in-person + Microsoft Teams)
- Integrate seamlessly with existing HR, identity, and performance systems
- Give managers, HR, and Admins real-time visibility into training progress and compliance
- Reduce manual tracking and automate routine training operations

## Integrated Systems

| System | Role in LMS |
|---|---|
| **Zoho HR** | Source of employee master data (identity, department, employment status) |
| **Employee / Timesheet DB** | Source of organizational hierarchy (reporting manager, capability, designation, project) |
| **Keycloak + Azure AD** | Identity and authentication provider (Single Sign-On) |
| **PES (Performance Evaluation System)** | Reads LMS compliance data via API |
| **Microsoft Teams** | Delivers virtual component of hybrid training sessions |
| **OneDrive** | Stores all training resource files |

---

# 2. Product Objectives

## Business Objectives

| Objective | How LMS Achieves It |
|---|---|
| Improve compliance visibility | Real-time compliance status per user; HR and Admin dashboards; PES integration |
| Automate training assignment | Mandatory rules auto-assign training on hire or attribute change |
| Reduce manual tracking | Automated completion, certificate generation, attendance pull from Teams |
| Enable manager-driven learning | Managers assign training and approve requests within their team |
| Support hybrid training model | All sessions combine physical attendance with Teams-based virtual delivery |
| Provide audit trail for compliance | Immutable 5-year audit log; all key actions recorded |

## Technical Objectives

- Single Sign-On (SSO) via Keycloak — no separate LMS passwords
- API-first architecture — all features accessible via documented REST APIs
- Integration-first design — external system failures never block LMS operation
- Modular, maintainable codebase designed for long-term evolution
- Secure training content storage via OneDrive
- On-premise deployment capability
- Enterprise reporting with export to Excel and PDF

---

# 3. User Personas

## Employee (Trainee)

Any active LMS user. All system users are Employees by default.

**Capabilities:**
- View all assigned training with status, due dates, and progress
- Browse the training catalog (published courses, learning paths, curricula)
- Self-enroll in courses that don't require approval
- Request enrollment in approval-required courses (manager approves)
- Attend hybrid classroom sessions (in-person and/or via Teams)
- Track learning progress with percentage completion
- Download certificates upon training completion
- View full learning history and past completions

---

## Manager

A Manager is not a separate role — it is a user who has direct reports assigned under them in the organizational hierarchy. Manager access is derived automatically from the reporting structure, not from a manually assigned role.

**Capabilities (in addition to Employee capabilities):**
- Approve or reject course enrollment requests from direct reports
- Assign training to team members
- View team training progress and compliance status
- Receive alerts when a team member's training is overdue (Day 7 past due date)
- Receive reminders for pending approval requests

---

## HR

HR users have organization-wide visibility into training and compliance data.

**Capabilities:**
- View compliance reports across all employees and departments
- Track mandatory training completion rates
- Monitor overdue training counts with escalation alerts (Day 30 past due date)
- Verify compliance data before PES integration consumes it
- View user management data (read-only)
- Access org-level audit trail for compliance investigations
- Export reports to Excel or PDF

---

## Admin

Administrators have full system access for configuration and management.

**Capabilities:**
- Create and manage all training content (courses, learning paths, curricula)
- Manage user accounts and assign/remove global roles (Admin, HR, Employee)
- Configure system settings (reminder timings, retention periods, escalation thresholds)
- Define mandatory assignment rules (which training is auto-assigned to which employees)
- Create and manage hybrid classroom sessions
- Monitor integration health (Zoho, Teams, OneDrive, Employee DB) and trigger manual syncs
- View and export all reports
- Access full audit logs and manage audit write failures
- Manage notification delivery failures
- Manually enter offline attendance for sessions

---

# 4. Product Scope

## Phase 1 — In Scope

| Area | Included |
|---|---|
| User Management | Full lifecycle, hierarchy sync, Admin override |
| Training Management | Courses, learning paths, curricula, resources, certificates |
| Assignment Engine | All assignment types, mandatory rules, approval workflow, overdue detection, compliance status, recertification |
| Classroom Sessions | Hybrid (Teams + in-person), attendance, scheduling, reschedule, cancellation, manager nomination |
| Notification Engine | In-app + email, reminders, escalations, preferences |
| Integrations | Zoho HR, Employee DB, Keycloak, Teams, OneDrive, PES API |
| Reporting | Role-scoped dashboards, compliance reports, Excel/PDF export |
| Audit Logs | Immutable 5-year log, Admin + HR access |
| Search | Training catalog search, typeahead suggestions |
| Admin Configuration | System settings, role management, mandatory rules |
| Probation Management | Training gate for new joiners, HR confirmation flow, probation extension |

## Phase 1 — Out of Scope

| Feature | Status |
|---|---|
| Mobile app | Future phase |
| AI-based training recommendations | Future phase |
| Gamification (badges, leaderboards) | Future phase |
| External marketplace content | Future phase |
| Multi-tenant support | Not planned |
| SCORM package support | Not in Phase 1 |
| Recording storage/playback | Not in scope |
| Data migration from legacy LMS | Phase 2 (planned but deferred) |

---

# 5. Training Structure

## Content Hierarchy

```
Curriculum
  └── Learning Path(s)
        └── Course(s)
              └── Resource(s)
                    └── Session(s) [for classroom-based courses]
```

## Resource Types (Supported in Phase 1)

| Type | Description |
|---|---|
| **Video** | MP4 files stored in OneDrive, streamed to browser |
| **Document** | PDF files stored in OneDrive |
| **Presentation** | PPTX files stored in OneDrive |
| **External Link** | URL-based content (opens in browser) |
| **Classroom Session** | Hybrid Teams + in-person session |

## Training Lifecycle

All training items go through a defined lifecycle before they can be assigned:

```
DRAFT → REVIEW → PUBLISHED → ARCHIVED
```

Only PUBLISHED training can be assigned to employees. Archiving a training does not affect existing assignments or completions.

## Session Types

**Phase 1: Hybrid sessions only.** Every session has both:
- A physical venue (location required)
- A Microsoft Teams meeting link (auto-created; manual fallback if Teams is unavailable)

---

# 6. User Management

## How Users Enter the System

| Source | How |
|---|---|
| Zoho HR | Auto-created when employee appears in Zoho sync |
| Manual creation | Admin creates individual user in LMS |
| Hierarchy | Pulled from Employee / Timesheet DB (reporting manager, capability, etc.) |

## User Attributes

Every user has: Employee ID, Name, Email, Department, Designation, Capability, Project Allocation, Location, Joining Date, Reporting Manager, and Active/Inactive status.

Attribute source of truth:
- HR attributes (name, email, department) → Zoho HR
- Hierarchy attributes (manager, capability, designation, project) → Employee / Timesheet DB
- Admin may override specific attributes; overrides are preserved across syncs

## User Lifecycle

| Event | What Happens |
|---|---|
| New employee joins (Zoho sync) | User auto-created and activated; mandatory training auto-assigned |
| Employee leaves | User deactivated; history retained; no new assignments |
| Attribute change (e.g. department, manager) | Synced from source system; mandatory rule re-evaluated if targeting changes |

## Roles

Three global roles managed by Admin:

| Role | Access Level |
|---|---|
| **EMPLOYEE** | Default role — own training, sessions, certificates |
| **HR** | Org-wide visibility — all reports, compliance data, user list |
| **ADMIN** | Full system — all management functions |

Manager access is not a role. It is automatically granted to any user who has direct reports in the organizational hierarchy.

---

# 7. Training Management

## Training Properties

Each training item has:
- Title, description, category (single), difficulty level, tags
- Mandatory flag (auto-assigns to matching employees if a mandatory rule exists)
- Approval required flag (employee must get manager approval before enrollment)
- Training code (auto-generated, unique)
- Version history (edits create new versions; old completions remain valid)

## Completion Rules

A training item is completed when:
- All resources within it are completed
- OR Admin manually marks the assignment as complete

## Progress Calculation

Progress is resource-based:
- 5 resources = 20% completion per resource
- Video: marked complete when watched
- Document/Presentation: marked complete when opened
- Session: marked complete based on attendance

## Completion Validity and Recertification

Training items can define a **validity period** (`validity_period_days`):

- If set, a completion expires after that many days (e.g., 365 = 1-year validity)
- On expiry, the system auto-creates a new assignment so the employee must repeat the training
- `validity_period_days = null` means the completion is permanent and never expires
- The previous COMPLIANT record is retained in history; a new PENDING assignment is created for the next cycle

## Certificates

- Automatically generated when a training assignment reaches COMPLETED status
- Visible in the employee's profile
- Includes completion date, training title, and employee name
- **Certificates do not expire** — even if a training completion expires and triggers recertification, the original certificate remains valid in history

---

# 8. Assignment Engine

## Who Can Assign Training

| Actor | Can Assign |
|---|---|
| **Admin** | Any employee, any training |
| **Manager** | Their direct reports only (no transitive hierarchy) |
| **Employee** | Self-enrollment (approval-required courses go to manager) |
| **System (mandatory rules)** | All matching employees automatically |

## Assignment Types

| Type | Source Value | Trigger |
| --- | --- | --- |
| **Mandatory auto-assignment** | `MANDATORY` | System evaluates mandatory rules nightly; assigns all matching employees automatically |
| **Manager assignment** | `MANAGER` | Manager manually assigns to a direct report |
| **Admin assignment** | `ADMIN` | Admin manually assigns to any employee |
| **Self-enrollment** | `SELF_ENROLLED` | Employee self-enrolls from the catalog (no approval required) |
| **Approval-based enrollment** | `SELF_APPROVED` | Employee requests; manager approves; assignment created on approval |
| **Recertification** | `RECERTIFICATION` | System auto-creates when a previous completion expires (validity period elapsed) |

## Assignment Lifecycle

The assignment engine manages two separate state machines:

**1. Assignment status** (`assignments.assignment_status`):

```text
ASSIGNED  →  IN_PROGRESS  →  COMPLETED
          →  OVERDUE (due date passed) →  COMPLETED (late)
                                       →  CANCELLED
          →  CANCELLED
```

- **ASSIGNED** — created, employee has not yet opened any resource
- **IN_PROGRESS** — employee has opened at least one resource
- **COMPLETED** — all required resources done (terminal)
- **OVERDUE** — due date passed without completion; escalation notifications begin
- **CANCELLED** — cancelled by Admin or Manager before completion (terminal); retained in history

**2. Approval request status** (`assignment_requests.request_status`) — only for training with approval required:

```text
PENDING  →  APPROVED  →  (ASSIGNED assignment auto-created)
         →  REJECTED
         →  EXPIRED (no decision within 30 days)
```

- **Approval expiry:** If a manager does not respond within 30 days, the request expires. The employee can re-submit.
- **On approval:** A new ASSIGNED assignment is created with source = SELF_APPROVED.
- Mandatory, Manager, and Admin assignments bypass the approval flow entirely.

## Overdue Escalation

| Threshold | Action |
|---|---|
| 7 days past due date | Manager notified of employee's overdue training |
| 30 days past due date | HR and Admin notified of escalated overdue |

Both thresholds are configurable by Admin.

## Compliance Status

Compliance is tracked **per assignment**, not as a single user-level flag. Each assignment row carries a `compliance_state`:

| State | Meaning |
| --- | --- |
| **PENDING** | Assignment active; due date has not passed yet (or no due date set) |
| **COMPLIANT** | Completed on or before the due date (or completed with no due date) |
| **NON_COMPLIANT** | Due date passed without completion (OVERDUE), or completed after the due date. Permanent for that assignment record. |

- NON_COMPLIANT is permanent for the assignment that was missed. The only path back to COMPLIANT is a new assignment (recertification or re-assignment), which starts as PENDING.
- Compliance is re-evaluated nightly by a background job and also immediately on completion events.
- This per-assignment compliance data is what PES reads when checking employee compliance.

## Mandatory Assignment Rules

Admins define rules that auto-assign training based on employee attributes:

| Rule Scope | Example |
| --- | --- |
| **GLOBAL** | Safety Compliance 2026 → all active employees |
| **DEPARTMENT** | Data Privacy → Engineering department only |
| **DESIGNATION** | Leadership Training → Senior Engineers only |
| **CAPABILITY** | Tools Training → specific capability group |
| **PROJECT** | Project Onboarding → employees on a specific project |
| **EMPLOYMENT_PHASE** | Probation Gate Training → new joiners with `employment_phase = PROBATION` (supports designation and capability sub-filters) |

When a rule is active, the system automatically assigns the linked training to any matching employee who doesn't already have an active assignment for it. EMPLOYMENT_PHASE rules also set `is_probation_gate = true` on the created assignments, which are required for probation confirmation.

---

# 9. Classroom Sessions

## Session Model

All sessions in Phase 1 are **hybrid** — they combine a physical in-person venue with a Microsoft Teams meeting.

Every session has:
- A unique session code (auto-generated)
- A physical location (required)
- A Microsoft Teams meeting link (auto-created on publish; manual fallback available)
- An instructor name
- A maximum participant count
- Participant list (Admin invites employees directly, or Manager nominates direct reports within a configured nomination window)

## Session Lifecycle

```text
SCHEDULED  →  COMPLETED
           →  CANCELLED
```

- **SCHEDULED** — created and upcoming; participants can be added; nominations can be submitted and reviewed
- **COMPLETED** — Admin marks the session complete; attendance finalised; training progress updated for all ATTENDED participants (terminal)
- **CANCELLED** — session did not occur; no completion credit granted; all participants notified (terminal)

There is no IN_PROGRESS state. Sessions remain SCHEDULED until the Admin explicitly marks them COMPLETED after the event.

## Participant Enrollment

Participants are added to a session through two paths:

| Path | Flow |
| --- | --- |
| **Admin invite** | Admin directly adds employee → status = INVITED. Fully enrolled immediately. |
| **Manager nomination** | Manager nominates a direct report within the nomination window → status = NOMINATED. Admin reviews and confirms (→ CONFIRMED) or rejects (→ REJECTED_NOMINATION). Manager can cancel while the window is open. |

- INVITED and CONFIRMED participants are treated as fully enrolled.
- NOMINATED participants count against `max_participants` capacity during review to prevent overbooking.
- Admin can add participants directly regardless of whether a nomination window is configured.

## Attendance

| Mode | How It Works |
| --- | --- |
| **Online attendance** | Automatically pulled from Microsoft Teams after the session ends (Teams Graph API) |
| **Offline attendance** | Manually entered by Admin or HR for in-person participants |

Both modes are tracked per participant. Only participants marked as ATTENDED receive training completion credit.

| Attendance Status | Effect |
| --- | --- |
| **ATTENDED** | Training resource marked complete; assignment completion evaluated; compliance recalculated |
| **NOT_ATTENDED** | No completion triggered; assignment remains ASSIGNED or IN_PROGRESS |

## Completion

Session attendance counts toward training completion. If a session is cancelled, no completion credit is granted.

## Session Reminders

Participants receive automatic reminders:
- 24 hours before the session
- 1 hour before the session

Both reminder timings are configurable by Admin.

## Reschedule and Cancellation

- **Reschedule:** Admin updates the session date/time. The Teams meeting is updated automatically. All participants are notified.
- **Cancellation:** Teams meeting is cancelled. All participants are notified. The training assignment remains active (employee still needs to complete it via another path).

---

# 10. Notification System

## When Notifications Are Sent

| Event | Recipient(s) |
|---|---|
| Training assigned | Employee |
| Approval request submitted | Manager |
| Approval approved / rejected | Employee |
| Approval request expired (30 days) | Employee |
| Training due date approaching | Employee |
| Training overdue (Day 7) | Employee + Manager |
| Training overdue (Day 30 escalation) | Employee + Manager + HR + Admin |
| Session invitation | Employee |
| Session reminder (24h and 1h before) | Employee |
| Session rescheduled | All session participants |
| Session cancelled | All session participants |
| Training completed | Employee |
| Integration sync failure | Admin |
| Probation started | Employee (list of required gate trainings + deadline) |
| Probation deadline approaching | Employee + HR |
| Probation confirmed | Employee |
| Probation extended | Employee + HR |
| Session nomination submitted | Admin |
| Session nomination confirmed / rejected | Manager + Employee |

## Delivery Channels

All notifications are delivered via:
- **In-app** — visible in the notification center (bell icon in header)
- **Email** — sent to the user's registered email address

## Notification Rules

- Users can configure their notification preferences for non-critical events
- Mandatory events (assignment, session invitation, overdue escalation) are always delivered regardless of preferences
- Reminders stop automatically once the training is completed
- Email delivery failures are retried automatically; persistent failures are visible to Admin

## Notification Center

- Accessible via the notification bell in the header
- Shows unread count badge
- Supports Mark All as Read
- Supports Mark individual notifications as read
- Supports links to the relevant training, session, or assignment

---

# 11. Integrations

## Zoho HR

- **Purpose:** Provides employee master data to LMS
- **Direction:** Zoho sends; LMS receives (LMS does not push back to Zoho)
- **Schedule:** Daily automated sync
- **Data:** Employee ID, name, email, department, designation, employment status, joining date
- **Failure behavior:** LMS continues with last-known data; sync failure logged and retried; Admin alerted

---

## Employee / Timesheet Database

- **Purpose:** Provides organizational hierarchy and capability attributes
- **Direction:** Employee DB sends; LMS receives
- **Schedule:** Daily automated sync
- **Data:** Reporting manager, capability, designation, project allocation
- **Used for:** Manager authorization (who can see whose data), mandatory rule targeting, reporting filters
- **Failure behavior:** LMS continues with last-known hierarchy; Admin alerted

---

## Keycloak + Azure AD

- **Purpose:** Authentication and identity management (Single Sign-On)
- **Direction:** Users authenticate through Keycloak; LMS reads identity from JWT token
- **LMS capability:** Admin can assign/remove global roles (Admin, HR, Employee) via the LMS UI — changes take effect on user's next login
- **No LMS passwords:** All authentication is handled by Keycloak/Azure AD

---

## PES (Performance Evaluation System)

- **Purpose:** PES reads employee compliance status from LMS
- **Direction:** PES calls LMS APIs; LMS does not push data to PES
- **What PES can read:** Single employee compliance status; bulk compliance status (up to 100 employees per request)
- **Auth:** PES uses a dedicated service account (no user login required)

---

## Microsoft Teams

- **Purpose:** Delivers the virtual component of all hybrid sessions
- **Triggered by:** Session publish, reschedule, or cancellation
- **LMS manages:** Teams meeting creation, update, and cancellation via Microsoft Graph API
- **Attendance:** After each session ends, LMS automatically pulls attendance data from Teams
- **Fallback:** If Teams API is unavailable, Admin can enter a manual meeting link; attendance entered manually

---

## OneDrive

- **Purpose:** Stores all training resource files (videos, documents, presentations)
- **How it works:** Files are uploaded to OneDrive; LMS stores only the file reference and metadata
- **Access:** LMS generates secure access links for streaming/viewing — no file download by default
- **Failure behavior:** If OneDrive is unavailable, resource viewing fails gracefully; other LMS functions continue

---

## Integration Monitoring

Admin dashboard provides:
- Current health status per integration (Healthy / Degraded / Down)
- Last successful sync time and last failure
- Job-level logs per integration
- Manual sync trigger per integration

---

# 12. Compliance Management

Compliance management in LMS is not a standalone feature — it is the result of the Assignment Engine evaluating each employee's training assignments against mandatory rules and due dates.

## How Compliance Works

1. Admin defines **mandatory assignment rules** (which training is required for which employees)
2. The system **auto-assigns** the mandatory training to matching employees
3. The system computes `compliance_state` per assignment: **PENDING** → **COMPLIANT** or **NON_COMPLIANT**
4. Compliance is re-evaluated nightly and on every completion event
5. Compliance data is available to: employee (own), manager (team), HR (all), Admin (all), and PES (via API)

## Compliance and Recertification

When a training completion expires (validity period elapsed):

- The old COMPLIANT record is retained with `is_expired = true`
- A new assignment is auto-created (source = RECERTIFICATION or MANDATORY) with `compliance_state = PENDING`
- If the employee completes on time → new COMPLIANT record
- If the employee misses the deadline → NON_COMPLIANT on the new assignment (the old COMPLIANT record is unaffected)

## Overdue and Escalation Flow

| Timeline | Action |
|---|---|
| Training due date passes | Assignment status → OVERDUE |
| 7 days overdue | Manager notified |
| 30 days overdue | HR + Admin notified (escalation) |

## Training Versions and Compliance

If a training item is updated (new version created):
- Existing completions on the old version remain valid
- The compliance engine counts the old completion as meeting the requirement
- Employees do not need to repeat training they already completed

## PES Compliance API

PES can query LMS at any time to get compliance status for one or more employees. LMS returns the current calculated status. PES cannot modify compliance data.

---

# 13. Reporting

## Role-Based Access

| Role | Can See |
|---|---|
| Employee | Own training history and progress only |
| Manager | Own data + direct reports only (no transitive hierarchy) |
| HR | All employees across the organization |
| Admin | All employees across the organization |

## Available Reports

| Report | Who Can Access |
|---|---|
| My Training Progress | Employee, Manager, HR, Admin |
| Team Training Status | Manager, HR, Admin |
| Compliance Summary (per user) | Manager, HR, Admin |
| Overdue Training Report | HR, Admin |
| Session Attendance Report | Admin, HR |
| User Activity Report | Admin, HR |
| Mandatory Training Completion | HR, Admin |

## Dashboards

**Employee Dashboard:** My assigned training, upcoming sessions, overdue count, completion rate

**Manager Dashboard:** Team training status, pending approval requests, overdue team members, upcoming team sessions

**HR Dashboard:** Org-wide compliance rate, overdue count, department breakdown

**Admin Dashboard:** Total users, overall completion rate, overdue count, upcoming sessions, system health summary

## Export

All reports can be exported asynchronously to:
- **Excel (.xlsx)**
- **PDF**

Export files are available for download for 24 hours after generation. CSV format is not supported.

---

# 14. Search and Discovery

## What Can Be Searched

- Training catalog (all published courses, learning paths, curricula)

## Search Capabilities

| Capability | Description |
|---|---|
| Keyword search | Search by title, description, tags |
| Typeahead suggestions | As-you-type suggestions based on training title |
| Catalog browse | Filtered list of all published training |
| Filters | Category, mandatory/optional, difficulty level, assignment status |

## Catalog Browse

The training catalog shows all published training with:
- Assignment status badge (assigned, completed, not started, overdue)
- Mandatory indicator
- Difficulty level and category

---

# 15. Audit Logs

## What Is Logged

All critical system actions are recorded in the audit log:

- Login and logout events
- Training content creation, update, and archival
- Assignment creation, completion, cancellation
- Approval decisions (approve, reject, expire)
- Admin configuration changes
- User creation, deactivation, role changes
- Integration sync events and failures
- PES API access events

Each audit record captures: **Who** (user), **When** (timestamp), **What** (action), and (where applicable) **Before / After** values.

## Retention

Audit logs are retained for **5 years** by default. This can be configured by Admin. Records placed on legal hold are retained permanently.

## Access

- **Admin:** Full audit log access across all users and modules
- **HR:** Organization-level event access (user actions, compliance-related events)

## Export

Audit logs can be exported to **Excel**. CSV is not supported.

## Data Protection

Sensitive data is automatically masked in audit records:
- Email addresses: partially masked (e.g. `j***@domain.com`)
- Authentication tokens and API keys: fully redacted

---

# 16. Probation Management

The Probation Management feature enforces a mandatory training gate for new joiners. Employees on probation must complete designated trainings before HR can confirm their probation.

## How It Works

When a new employee is created with `employment_phase = PROBATION`:

1. The system creates a probation record with a start date and end date (joining date + configured days, default 90)
2. All active mandatory rules with scope `EMPLOYMENT_PHASE` are evaluated against the employee's designation and capability
3. Matched trainings are auto-assigned with `is_probation_gate = true`
4. The employee is notified with the list of required trainings and the probation deadline

## Probation Gate

HR can confirm probation only when **all** `is_probation_gate = true` assignments for the employee are `COMPLIANT`. The system blocks confirmation if any gate assignment is PENDING or NON_COMPLIANT.

## Probation Lifecycle

```text
PROBATION  →  CONFIRMED  (HR confirms after all gate trainings COMPLIANT)
           →  EXTENDED   (HR extends deadline; probation_end_date updated)
           →  TERMINATED (employment ends during probation)
```

## Actors

| Actor | Capabilities |
| --- | --- |
| **Employee** | Views gate training assignments; receives probation start and deadline notifications |
| **HR** | Monitors all employees in probation; confirms, extends, or terminates probation |
| **Admin** | Configures probation gate trainings via mandatory assignment rules (scope = EMPLOYMENT_PHASE) |

## Key Rules

- Admin cannot override the gate validation — confirmation must go through the HR flow
- Probation extension records the reason and the new end date
- All probation lifecycle events (start, confirm, extend, terminate) are recorded in the audit log
- Probation gate assignments use the same compliance evaluation as all other assignments

---

# 17. Data Migration (Phase 2 — Deferred)

Migration of data from the legacy LMS is planned but deferred to Phase 2.

**Planned migration scope:**
- Existing users (with employment history)
- Existing training content
- Completion history and certificates
- Past session records

**Migration approach:**
- One-time controlled process run during a maintenance window
- Validation report generated before go-live confirmation
- Rollback supported if validation fails
- Migrated historical records remain valid for compliance purposes (old completions count)
- Migration does not trigger notifications to employees

---

# 18. Technical Approach

This section summarizes the technical approach for client and stakeholder awareness. Detailed technical specifications are in separate engineering documents.

## Architecture

- **Style:** Domain-Driven Design (DDD) Modular Monolith — a single application with clearly separated internal modules. Designed so that individual modules can be extracted as independent services in the future if needed.
- **Backend:** Python (FastAPI framework)
- **Frontend:** ReactJS (single-page application)
- **Database:** PostgreSQL — single database with modular table ownership
- **API Gateway:** APISIX — handles all incoming API traffic, JWT validation, rate limiting
- **Authentication:** Keycloak + Azure AD (Single Sign-On, no LMS-managed passwords)
- **File Storage:** Microsoft OneDrive (training resources stored externally; LMS stores metadata only)
- **Background Processing:** Separate worker service for scheduled jobs (daily syncs, nightly compliance evaluation, reminders)
- **Deployment:** On-premise / local server

## API Strategy

- All features are API-first — every function available through documented REST APIs
- APIs are versioned (`/api/v1/`) for future compatibility
- OpenAPI documentation auto-generated
- PES has a dedicated API for reading compliance data

## Security Summary

- Single Sign-On via Keycloak — no passwords stored in LMS
- Every API request is authenticated via JWT token
- Authorization is hybrid: global roles (Admin, HR, Employee) plus hierarchy-based access for managers
- All communication is encrypted (HTTPS/TLS)
- Sensitive data masked in logs
- Last Admin protection: cannot remove the only remaining Admin account
- Full audit trail for all configuration and data changes

---

# 19. Non-Functional Requirements Summary

| Requirement | Target |
|---|---|
| Standard API response time | ≤ 300 ms |
| Complex report response time | ≤ 800 ms |
| Search response time | ≤ 500 ms |
| Concurrent users supported | 200–300 |
| System uptime target | ≥ 99% (on-premise) |
| Audit log retention | 5 years (configurable) |
| Notification retention | 90 days (configurable) |
| Export file availability | 24 hours after generation |
| Integration failure behavior | LMS continues with last-known data; no user-visible disruption |

Detailed non-functional requirements are documented in `docs/requirements/03_architecture/02_nfr.md`.

---

# 20. What Happens If External Systems Are Unavailable

| System | Impact on LMS |
|---|---|
| Keycloak is down | Users cannot log in; active sessions continue until token expires |
| Zoho HR is down | LMS uses last-synced user data; no impact on logged-in users |
| Employee DB is down | LMS uses last-synced hierarchy; manager access uses last-known data |
| Microsoft Teams is down | Sessions proceed with manual meeting link; attendance entered manually |
| OneDrive is down | Training resource viewing temporarily unavailable; all other LMS functions continue |
| PES is unavailable | No impact on LMS; PES cannot read compliance data but LMS operates normally |

No external system failure will block employees from viewing their training, managers from approving requests, or Admins from managing content.

---

*Document version: Phase 1 scope. Last updated: 2026-04-16.*
*For detailed technical specifications, see `docs/requirements/engineering/` and `docs/requirements/03_architecture/`.*
