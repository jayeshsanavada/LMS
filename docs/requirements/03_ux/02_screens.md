# 02_Screens.md

---

## How to Use This File

This file defines every UI screen in the LMS — what it shows, what actions it supports, which APIs it calls, and how it connects to other screens.

### Who uses it and how

| Reader | How to use |
|---|---|
| **Frontend developer** | Use as the implementation blueprint per screen — UI elements, actions, API calls, validation rules, and navigation targets are all defined here |
| **Backend developer** | Verify that every screen's data requirements are met by the API responses; confirm no screen is calling an endpoint that doesn't exist |
| **QA engineer** | Derive test scenarios from Validations and Actions per screen; each validation rule is a test case |
| **AI coding assistant** | Feed the relevant screen definition alongside the corresponding `api.md` + `schema.md` to generate accurate, spec-aligned frontend code |

### What this file is NOT

- Not a visual design or wireframe document — no pixel-level layout
- Not an API reference — use `engineering/features/XX/api.md` for request/response detail
- Not a UX flow document — for end-to-end sequences use `02_ux/01_ux_flows.md`

### How it fits with other engineering files

```
engineering/features/XX/api.md     →  Request/response detail for each endpoint
02_ux/01_ux_flows.md               →  End-to-end user flows and cross-module sequences
02_ux/02_screens.md                →  Per-screen UI elements, actions, API mapping, navigation
engineering/00_apisix_routes.md    →  All routes for gateway configuration
```

For AI code generation: feed this screen definition + the relevant `api.md` sections. Add the UX flow only when the screen spans multiple modules.

---

# 1. Screen Overview

This document defines the primary user interface screens required for the Enterprise LMS. It translates product requirements and UX flows into a screen-level blueprint that can be used for:

* AI-based frontend code generation
* API contract design
* Backend-to-UI mapping
* Validation planning
* Navigation consistency

This is **not a visual design document**. It is a structured functional screen definition document intended for engineering, architecture, QA, and AI-assisted implementation.

---

# 2. Design Principles for Screens

All screens must follow these principles:

* Use **role-aware rendering**
* Respect **hybrid authorization**
  * Global roles from Keycloak (`realm_access.roles`: ADMIN / HR / EMPLOYEE)
  * Hierarchy-based access from Employee DB (manager scope = direct reports only, depth=1)
  * Manager is NOT a role — any EMPLOYEE with direct reports is a manager
* Use **consistent navigation patterns**
* Prefer **server-driven data loading**
* Keep forms validation-aware
* Support **on-prem deployment constraints**
* Integrate with APIs through **APISIX**
* Align with **ReactJS frontend + FastAPI backend**

---

# 3. Global Navigation Structure

## Primary Navigation Areas

### Employee Navigation

* Dashboard
* My Training
* Learning Catalog
* My Sessions
* Notifications
* My Profile

### Manager Navigation

* Dashboard
* My Training *(managers are also employees with their own assignments)*
* Team Training
* Team Assignments *(assign training to direct reports)*
* Approvals
* Team Sessions
* Reports *(team-scoped: compliance matrix for direct reports, team progress chart)*
* Notifications
* My Profile

### HR Navigation

* Dashboard
* Users *(org-wide read; can view user detail and training history)*
* Training Catalog
* Compliance *(compliance matrix + non-compliant list + expiring soon)*
* Reports *(org-wide: completion, compliance, sessions)*
* Audit Logs
* Notifications
* My Profile

### Admin Navigation

* Dashboard
* My Training *(Admin is also an employee with own assignments)*
* Users
* Training *(includes Training Resources management per course)*
* Sessions
* Assignments
* Reports *(org-wide: completion, compliance with dept drill-down, sessions)*
* Compliance
* Integrations
* Audit Logs
* Settings
* Notifications
* My Profile

---

# 4. Common UI Components

These components should be reusable across screens:

* Global Header (with notification bell + unread count badge)
* Role-aware Sidebar
* Search Bar (with typeahead suggestions)
* Filter Panel
* Data Table
* Summary Cards
* Status Badge
* Notification Bell + Unread Count
* Pagination
* Export Action (Excel / PDF only)
* Confirmation Modal
* Error State Panel
* Empty State Panel
* Loading Skeleton
* Audit Timeline Drawer
* Before/After Diff Viewer (audit detail)

---

# 5. Screen Definitions

---

## Screen 1: Login Redirect / Access Entry

### Actors

Employee, Manager, HR, Admin

### Purpose

Acts as the LMS entry point. Users are redirected to Keycloak for authentication. This is not a custom login form — no credentials are entered in LMS.

### UI Elements

* LMS branding
* "Sign in with SSO" action
* Authentication unavailable message area

### Actions

* Redirect to Keycloak PKCE flow
* Show auth failure message

### API / Integration Dependency

* Keycloak (PKCE flow — outside LMS)
* `GET /api/v1/auth/me` — called after token received to load LMS user context

### Validations

* No local credentials accepted
* Access blocked if Keycloak unavailable

### Prototype Note

> The `login.html` prototype contains a second "Sign In" button with a credential form. This is a **demo-only shortcut** for prototype navigation and must NOT be implemented in production. The production UI shows only the "Sign in with SSO" button (BR-01).

### Navigation

* Redirect to Keycloak on load
* On success → Policy Acceptance (first login) or Dashboard
* On failure → Stay on entry page with error message

---

## Screen 2: First Login Policy Acceptance

### Actors

Employee, Manager, HR, Admin

### Purpose

Requires policy acceptance on first successful login before allowing access to LMS. Shown when `policy_acceptance.requires_re_acceptance = true` in `/auth/me` response.

### UI Elements

* Policy content area
* Accept button
* Decline / logout action

### Actions

* Accept policy → `POST /api/v1/auth/policy-acceptance`
* Logout → `POST /api/v1/auth/logout`

### API Dependency

* `POST /api/v1/auth/policy-acceptance`
* `POST /api/v1/auth/logout`

### Validations

* User cannot proceed to any other screen without acceptance
* Policy version submitted must match current active version

### Navigation

* On accept → Dashboard
* On decline → Logout → Login entry page

---

## Screen 3: Employee Dashboard

### Actors

Employee

### Purpose

Personal learning summary — assigned training, overdue items, compliance status, upcoming sessions, recent completions, and expiring certificates. Probation-phase employees additionally see a gate training progress banner.

### UI Elements

* Assignments In Progress card (count)
* Overdue Assignments card (count + alert style if > 0)
* Compliance Status badge (`PENDING` / `COMPLIANT` / `NON_COMPLIANT`)
* Certificates Expiring Soon count
* Upcoming Sessions list (next 2–3 sessions)
* Recent Completions list
* Quick action: Resume Training
* **Probation Banner** _(visible only when `employment_phase = PROBATION`)_:
  * Probation end date
  * Gate training progress bar (n / total complete)
  * Per-training checklist: ✓ Completed / ⏰ In Progress / ○ Not Started, each with due date
  * CTA: "View Gate Trainings" → My Training (filtered to `is_probation_gate = true`)
  * Dismissible (session only — reappears on next login)

### Actions

* Start / Resume training → Training Detail
* View session details → Session Detail
* Open notifications → Notification Center
* View gate trainings → My Training (probation filter)

### API Dependency

* `GET /api/v1/dashboard/me`
* `GET /api/v1/probation/{user_id}` _(called when `employment_phase = PROBATION` to fetch gate training checklist)_

### Validations

* Show only own data (SELF_ONLY)
* No admin or manager actions visible
* Probation banner shown only when `users.employment_phase = PROBATION`

### Navigation

* My Training
* My Sessions
* Learning Catalog
* Training Detail
* Notification Center

---

## Screen 4: Manager Dashboard

### Actors

Manager (any EMPLOYEE with direct reports)

### Purpose

Team-level visibility into training completion, overdue assignments, compliance, pending approvals, and upcoming sessions for direct reports.

### UI Elements

* Team Size count
* Team Completion Rate (%)
* Overdue Count card
* Non-Compliant Team Members count
* Pending Approvals count (badge with action)
* Upcoming Team Sessions list

### Actions

* View team training → Team Training
* Open approvals → Approvals Inbox
* Open reports → Reports
* Review overdue users → Reports (Overdue filter)

### API Dependency

* `GET /api/v1/dashboard/team`

### Validations

* Team scope derived from `user_hierarchy` (direct reports only, depth=1)
* No access to users outside reporting hierarchy

### Navigation

* Team Training
* Approvals Inbox
* Reports
* Team Sessions

---

## Screen 5: Admin Dashboard

### Actors

Admin

### Purpose

System-wide operational visibility — users, completions, overdue assignments, sessions, approvals, integration health, and pending exports.

### UI Elements

* **Primary stat tiles (row 1):** Total Users, Published Trainings, Overdue (Org), Org Compliance %
* **Content Library tiles (row 2, 7 tiles):**
  * Curriculums — total count (draft / published breakdown)
  * Learning Paths — total count (draft / published breakdown)
  * Courses — total count (draft / published breakdown)
  * Curriculum Approvals Pending — amber badge, links to Training > Cert Approvals tab
  * Learning Path Approvals Pending — amber badge, links to Training > Cert Approvals tab
  * Course Approvals Pending — red badge, links to Training > Cert Approvals tab
  * **Cert Approvals Pending** — amber badge, count of certificates awaiting admin download approval; links to Training > Cert Approvals tab
* **Quarterly Training Statistics panel** — Q1/Q2/Q3/Q4 tab switcher; each quarter shows: Completions, Compliance Rate, Sessions Held, Certificates Issued; monthly completions bar chart within the selected quarter; future quarters show "data not yet available"
* **BU-wise Compliance Overview panel** — one row per BU Head showing: name, BU name, user count, compliance % progress bar, overdue count badge
* Upcoming Sessions table (next 3 sessions with date, location, participant fill)
* Recent System Activity feed
* Integration Health summary (HEALTHY / DEGRADED / DOWN per integration)

### Actions

* View reports → Reports
* Open integration dashboard → Integration Health
* Review migration → Migration Control
* Open audit logs → Audit Log Search
* Click "View full compliance →" → Compliance screen

### API Dependency

* `GET /api/v1/dashboard/admin`
* `GET /api/v1/integrations/health`

### Validations

* Admin-only access

### Navigation

* Users Management
* Integration Health Dashboard
* Reports
* Audit Log Search
* Admin Settings

---

## Screen 6: HR Dashboard

### Actors

HR

### Purpose

Org-wide compliance and mandatory training readiness summary.

### UI Elements

* Total Active Users count
* Compliant Users count
* Non-Compliant Users count
* Pending (not yet due) count
* Mandatory Completion Rate (%)
* Overdue Mandatory count

### Actions

* Open compliance report → Compliance Report
* Export report → Reports Export
* View training history → Reports

### API Dependency

* `GET /api/v1/dashboard/hr`

### Validations

* HR-role access only
* No admin configuration actions

### Navigation

* Compliance Report
* Learning Reports
* Audit Logs

> **Note on probation monitoring:** Probation tracking for individual employees is presented on Screen 34 (HR Probation Dashboard — `prototype/hr-probation.html`), not embedded in Screen 6. Screen 6 covers org-wide compliance metrics only. This is intentional — probation is an HR workflow concern distinct from general compliance reporting.

---

## Screen 7: My Training List

### Actors

Employee

### Purpose

Shows all of the current user's assignments — in progress, overdue, assigned, completed, and cancelled.

### UI Elements

* Tabs: All / Assigned / In Progress / Overdue / Completed / Cancelled
* Filter panel: mandatory toggle, training type, due date range
* Training cards / table rows: title, type, due date, status badge, progress bar
* Status badges: ASSIGNED / IN_PROGRESS / COMPLETED / OVERDUE / CANCELLED
* Progress indicator per item

### Actions

* Start training → Resource Player
* Resume training → Resource Player
* View details → Training Detail

### API Dependency

* `GET /api/v1/assignments/me`

### Validations

* Employee sees only own assignments (SELF_ONLY)

### Navigation

* Training Detail
* Dashboard

---

## Screen 8: Learning Catalog

### Actors

Employee, Manager, HR, Admin

### Purpose

Discovers and browses published training. Supports self-enrollment and approval requests. No keyword required for browsing — search is optional.

### UI Elements

* Search bar with typeahead suggestions (min 2 chars to trigger)
* Filter panel: Category, Training Type (Course / Learning Path / Curriculum), Difficulty, Tags, Mandatory toggle
* Sort: Mandatory First (default), then Alphabetical
* Training cards: title, type, category, difficulty, mandatory badge, `assignment_status` badge if already enrolled
* Self-Enroll button (for `requires_approval = false` training)
* Request Approval button (for `requires_approval = true` training)

### Actions

* View details → Training Detail
* Self-enroll → `POST /api/v1/assignments/self-enroll`
* Request approval → `POST /api/v1/approvals/requests`
* Assign (Admin/Manager) → Assign Training modal

### API Dependency

* `GET /api/v1/search/catalog` — browse without keyword
* `GET /api/v1/search/training` — keyword search with filters
* `GET /api/v1/search/suggestions` — typeahead (max 10 results)
* `POST /api/v1/assignments/self-enroll`
* `POST /api/v1/approvals/requests`

### Validations

* Employee / Manager / HR: PUBLISHED training only
* Admin: all lifecycle states visible (with state badge)
* Approval-required training shows Request button, not Enroll
* Already-enrolled training shows `assignment_status` badge instead of action buttons
* Duplicate enrollment blocked at API level

### Navigation

* Training Detail
* Dashboard
* My Training

---

## Screen 9: Training Detail

### Actors

Employee, Manager, Admin, HR

### Purpose

Full training information — description, resources, structure, prerequisites, progress, and available actions.

### UI Elements

* Training title, code, type, category, tags, difficulty
* Version info (current version number)
* Mandatory / approval-required badges
* Estimated duration
* Description
* Prerequisites list (with completion status per prerequisite)
* Resource list (title, type, duration, completion status)
* Progress bar (if assignment exists)
* Due date + assignment status badge
* Certificate section (if completed)
* Sessions linked to this training (upcoming)

### Actions

* Start / Resume → Resource Player
* Self-enroll → `POST /api/v1/assignments/self-enroll`
* Request approval → `POST /api/v1/approvals/requests`
* Download certificate → `GET /api/v1/certificates/{id}/download`
* Assign training (Admin/Manager) → Assign Training modal
* Publish / Inactivate (Admin) → `POST /api/v1/trainings/{id}/publish` / `/inactivate`

### API Dependency

* `GET /api/v1/trainings/{training_id}`
* `GET /api/v1/trainings/{training_id}/resources`
* `GET /api/v1/trainings/{training_id}/structure`

### Validations

* Employee: PUBLISHED only; prerequisite check before resource access
* Admin / HR: all states
* Actions shown based on assignment state and role

### Navigation

* Resource Player
* Session Detail
* My Training
* Catalog

---

## Screen 10: Resource Player / Resource Viewer

### Actors

Employee

### Purpose

Delivers training resource content streamed from OneDrive. Tracks progress as the user consumes the resource.

### UI Elements

* Resource title
* Viewer area (video player / PDF viewer / SCORM frame / external link)
* Progress indicator
* Next / Previous resource navigation
* Completion state indicator
* Error message panel (OneDrive unavailable)

### Resource Types Supported

* VIDEO — streamed from OneDrive
* PDF — rendered from OneDrive
* SCORM — embedded SCORM player *(Phase 2 — not in Phase 1 scope)*
* EXTERNAL\_LINK — opens in new tab

### Actions

* Consume resource (auto-tracks progress)
* Report progress → `POST /api/v1/resources/{resource_id}/progress`
* Navigate next / previous resource
* Return to Training Detail

### API Dependency

* `GET /api/v1/resources/{resource_id}` — gets OneDrive stream URL
* `POST /api/v1/resources/{resource_id}/progress` — tracks progress (0–100%)

### Validations

* Access only if user has active assignment for parent training
* Prerequisite training must be completed before accessing resources
* OneDrive errors shown gracefully; progress already saved is retained

### Navigation

* Back to Training Detail

---

## Screen 11: My Sessions

### Actors

Employee

### Purpose

Shows sessions where the current user is an INVITED participant — upcoming and past.

### UI Elements

* Upcoming Sessions tab
* Past Sessions tab
* Per session: session code, title, linked training title, date/time, instructor, physical location, Teams meeting link (online), session state
* Attendance status badge (past sessions): ATTENDED / NOT\_ATTENDED
* Mode indicator: HYBRID (online + in-person)

### Actions

* Join session → opens `teams_meeting_link` in new tab
* View details → Session Detail

### API Dependency

* `GET /api/v1/sessions/me`

### Validations

* Sessions where user is INVITED or NOMINATED participant visible (SELF_ONLY)
* Teams link shown only if `teams_link_status` is not PENDING\_MANUAL

### Navigation

* Session Detail
* Training Detail

---

## Screen 12: Session Detail

### Actors

Employee, Manager, Admin, HR

### Purpose

Full session details — schedule, location, Teams link, participants, and attendance summary.

### UI Elements

* Session code (SES-001)
* Title and linked training
* State badge: SCHEDULED / COMPLETED / CANCELLED
* Date, time, duration
* Physical location (always shown — hybrid sessions)
* Teams meeting link (if available) / "Link pending" message
* Instructor name
* Max participants / current participant count
* Participant list (Admin only)
* Attendance summary (Admin: attended count vs not attended)
* Notes

### Actions

* Join session (Employee) → opens Teams link
* Reschedule session (Admin) → `PUT /api/v1/sessions/{id}`
* Cancel session (Admin) → `POST /api/v1/sessions/{id}/cancel`
* Complete session (Admin) → `POST /api/v1/sessions/{id}/complete`
* Set Teams link manually (Admin) → `PUT /api/v1/sessions/{id}/teams-link`
* Record attendance (Admin) → Attendance screen

### API Dependency

* `GET /api/v1/sessions/{session_id}`
* `GET /api/v1/sessions/{session_id}/participants` (Admin)
* `GET /api/v1/sessions/{session_id}/attendance` (Admin)

### Validations

* Employee: only sessions they are INVITED to
* Manager: sessions with at least one direct-report participant
* Admin / HR: any session
* Reschedule / Cancel actions: Admin or HR, SCHEDULED sessions only
* Complete action: Admin only, SCHEDULED sessions only

### Navigation

* Sessions list
* Attendance Management (Admin)
* Training Detail

---

## Screen 13: Session Attendance Management

### Actors

Admin, HR

### Purpose

Admin or HR records and reviews attendance for a session — both online (Teams auto-pull) and offline (manual entry or Excel import).

### UI Elements

* Participant list with attendance status per person
* Attendance mode per record: ONLINE / OFFLINE
* Attendance status: ATTENDED / NOT\_ATTENDED
* Attendance source: TEAMS\_AUTO / ADMIN\_MANUAL / ADMIN\_OVERRIDE
* "Fetch Teams Attendance" button (triggers auto-pull; Admin only)
* Unmatched Teams attendees alert (attendees not found in LMS)
* Bulk offline attendance form (mark multiple as ATTENDED / NOT\_ATTENDED)
* Override toggle per record
* "Download Template" button (pre-filled Excel with one row per enrolled participant)
* "Import from Excel" button (upload completed attendance sheet)
* Import preview panel (shows matched rows, warnings for unmatched IDs or invalid values)

### Actions

* Fetch online attendance from Teams → `POST /api/v1/sessions/{id}/attendance/fetch-teams` (Admin only)
* Bulk record offline attendance → `PUT /api/v1/sessions/{id}/attendance`
* Override auto-recorded attendance (sets source = ADMIN\_OVERRIDE)
* Download Excel template → `GET /api/v1/sessions/{id}/attendance/template`
* Import offline attendance from Excel → `POST /api/v1/sessions/{id}/attendance/import`

### API Dependency

* `GET /api/v1/sessions/{session_id}/attendance`
* `PUT /api/v1/sessions/{session_id}/attendance`
* `POST /api/v1/sessions/{session_id}/attendance/fetch-teams`
* `GET /api/v1/sessions/{session_id}/attendance/template`
* `POST /api/v1/sessions/{session_id}/attendance/import`

### Validations

* Admin and HR can record/import attendance
* Fetch Teams Attendance: Admin only
* Session must not be CANCELLED to record attendance
* Override allowed at any time before and after Teams auto-pull
* Excel import: `.xlsx` or `.xls` only; max 5 MB; matching by `employee_id`

### Navigation

* Session Detail
* Session Management List

---

## Screen 14: Approvals Inbox

### Actors

Manager, Admin

### Purpose

Shows pending training approval requests. Manager sees only requests from direct reports. Admin sees all pending requests.

### UI Elements

* Request table: employee name, training title, request date, request reason, expiry date, status badge
* Filter: by status (PENDING / APPROVED / REJECTED / EXPIRED), by training
* Approve / Reject action per row
* Due date selector (on approve)
* Rejection reason field (on reject)

### Actions

* Approve → `POST /api/v1/approvals/{request_id}/approve` (sets due date)
* Reject → `POST /api/v1/approvals/{request_id}/reject` (requires reason)
* View requester profile → User Detail
* View training detail → Training Detail

### API Dependency

* `GET /api/v1/approvals/pending`
* `POST /api/v1/approvals/{request_id}/approve`
* `POST /api/v1/approvals/{request_id}/reject`

### Validations

* Manager: only requests from direct reports (TEAM_ONLY)
* Admin: all pending requests (ORG_WIDE)
* Expired requests shown with EXPIRED badge; no action available

### Navigation

* Team Training
* Training Detail
* User Detail

---

## Screen 15: Team Training

### Actors

Manager

### Purpose

Manager's view of all team member assignments — with overdue indicators, completion rates, and direct assignment capability.

### UI Elements

* Team member selector (filter by direct report)
* Assignment table: training title, status badge, due date, progress %, overdue indicator
* Compliance indicator per team member
* Overdue count summary
* Assign Training button

### Actions

* Assign training → Assign Training modal → `POST /api/v1/assignments`
* View assignment detail → Assignment Detail
* Update due date → `PATCH /api/v1/assignments/{id}/due-date`
* Cancel assignment → `POST /api/v1/assignments/{id}/cancel`
* View team member profile → User Detail

### API Dependency

* `GET /api/v1/assignments/team`
* `POST /api/v1/assignments`
* `PATCH /api/v1/assignments/{assignment_id}/due-date`
* `POST /api/v1/assignments/{assignment_id}/cancel`

### Validations

* Scope restricted to direct reports only (hierarchy depth = 1)
* Cannot assign outside hierarchy

### Navigation

* Manager Dashboard
* Assign Training modal
* Reports
* Team Sessions

---

## Screen 16: Assign Training Modal

### Actors

Manager, Admin

### Purpose

Creates a training assignment for one or more users.

### UI Elements

* User / team selector (Manager: direct reports only; Admin: any user)
* Training search and selector (PUBLISHED only)
* Due date picker
* Assignment note field
* Submit / Cancel

### Actions

* Create assignment → `POST /api/v1/assignments`

### API Dependency

* `POST /api/v1/assignments`
* `GET /api/v1/trainings` (for training selector)
* `GET /api/v1/users/team-members` (Manager) or `GET /api/v1/users` (Admin)

### Validations

* Manager cannot include users outside direct reports
* Only PUBLISHED training selectable
* Duplicate assignment prevented (shown as warning with skip option)
* Maximum 100 users per assignment operation

### Navigation

* Team Training
* Admin Users
* Training Detail

---

## Screen 17: Compliance Report

### Actors

HR, Admin, Manager

### Purpose

Shows mandatory training compliance state per user — PENDING / COMPLIANT / NON\_COMPLIANT. Also surfaces probation gate compliance for new joiners via a dedicated tab.

### UI Elements

* Summary cards: Fully Compliant, Non-Compliant, In Progress, Active Probationers, Probation Overdue, **Probation Ends This Month** _(certificate validity removed — certificates do not expire)_
* **Tab: Compliance Matrix** — full employee × mandatory training grid with status icons (✓ / ✗ / ⌛); filters: search, department, status (Compliant / Non-Compliant / In Progress), **BU Head**
* **Tab: Non-Compliant** — list of employees with missing trainings; bulk "Send Reminder" action
* **Tab: BU Summary** — one expandable card per BU Head showing: BU name, user count, compliance %, breakdown counters (Compliant / In Progress / Overdue), top missing trainings with count; Export button
* **Tab: Probation Gate** _(HR / Admin only)_:
  * Info banner: description only — no link to HR Probation Dashboard (avoids confusion with standalone Probation screen)
  * Filter: search, status (On Track / At Risk / Overdue / Extended / Confirmable)
  * Table columns: Employee, Designation / Dept, Joined On, Probation Ends, Gate Trainings (n / total + progress bar + per-training icon row), Readiness badge, **Probation Status** badge (Active / Overdue / Extended / Confirmed), Actions (**View Detail only** — no inline Confirm or Extend buttons)
  * **View Detail** → opens inline **Probation Detail slide-over panel** (right drawer) — **read-only**:
    * Header: name, emp ID, designation, dept
    * Summary strip: Joined date, Probation Ends, Probation Status badge, Gate Progress (n / total)
    * Gate Training Checklist: per training — icon (✓ / ⏰ / ○), title, status date
    * Footer: Close button only. No Confirm, Extend, or informational notes.
  * Confirm and Extend actions are only available on the **HR Probation Dashboard** (`hr-probation.html`)
* Export button (Excel / PDF)

### Actions

* Filter report (all tabs)
* Export → `POST /api/v1/reports/export` (report\_type: compliance)
* View user detail → User Detail
* View training detail → Training Detail
* **Probation tab**: View detail → opens inline slide-over panel (no page navigation — read-only; no Confirm or Extend actions here)

### API Dependency

* `GET /api/v1/reports/compliance`
* `POST /api/v1/reports/export`
* `GET /api/v1/probation` _(for Probation Gate tab — read-only; Confirm and Extend are on HR Probation Dashboard only)_

### Validations

* Manager: team members only (TEAM_ONLY)
* HR / Admin: org-wide (ORG_WIDE)
* Probation Gate tab visible to HR and Admin only
* `is_migrated_basis` shown as indicator on migrated completion records
* Confirm action enabled only when all `is_probation_gate` assignments are `COMPLIANT`

### Navigation

* Reporting Dashboard
* User Detail
* Training Detail

---

## Screen 18: Reporting Dashboard

### Actors

Admin, HR, Manager, Employee

### Purpose

Entry point for all reports. Links to 8 typed reports plus export management.

### UI Elements

* Report type cards / links:
  * Assignment Status Report
  * Compliance Status Report
  * Training Completion Report
  * Overdue Training Report
  * Session Attendance Report
  * Certificate Report
  * My Learning History (Employee)
  * Approval Request Report
* Recent export jobs list (status + download link)
* Export job expiry indicator (24h)

> **Note:** The Reports screen is role-aware. Admin/HR see a **BU & Capability tab** for BU-wise and capability-wise completion analysis. Managers see a **My Team tab** instead (no BU/Capability tab). See Screen 17 for Compliance and [reports.html](../../../prototype/reports.html) for the full tab layout.

### Manager Stat Tiles (above tabs, persistent)

Shown only when role = `manager`. Visible regardless of which tab is active:

| Tile | Value | Description |
|---|---|---|
| Team Members | Count | Total direct reports |
| Non-Compliant Members | Count | Members with compliance issues (actionable) |
| Pending Approvals | Count | Enrollment requests awaiting manager review |
| At Risk | Count | Members with training due ≤7 days, not yet completed |

### Tab Layout by Role

| Tab | Admin / HR | Manager |
|---|---|---|
| Overview | ✓ Org-wide dept bar chart + Top 5 Trainings + Recent Completions | ✓ Team bar chart + Assignment Summary + Team member table + Missing Trainings + Pending Approvals |
| Completion | ✓ | ✓ (team-scoped) |
| Compliance | ✓ Dept-grouped matrix | ✓ Direct-report matrix |
| BU & Capability | ✓ | — (hidden) |
| Sessions | ✓ | ✓ (team-scoped) |

> Note: Manager has no separate "My Team" tab. All team detail (member table, missing trainings, pending approvals) is merged into the Overview tab. The persistent stat tiles above the tab bar provide always-visible team health context.

### Actions

* Open report → respective report screen
* Download completed export → `GET /api/v1/reports/export/{job_id}/download`
* Poll export status → `GET /api/v1/reports/export/{job_id}`

### API Dependency

* `GET /api/v1/reports/export/{job_id}` — poll
* `GET /api/v1/reports/export/{job_id}/download`

### Validations

* Role + hierarchy filtering enforced per report type
* Employee: only sees "My Learning History"
* Manager: sees assignment, compliance, completion, overdue, sessions, certificates, approvals (team-scoped); BU & Capability tab hidden; My Team tab shown
* HR / Admin: all reports (org-wide); My Team tab hidden
* Expired export files (24h) show "Re-export" action

### Navigation

* Compliance Report
* Assignment Status Report
* Training Completion Report
* Overdue Training Report
* Session Attendance Report
* Certificate Report
* My Learning History
* Approval Request Report

---

## Screen 18A: Assignment Status Report

### Actors

Admin, HR, Manager, Employee

### Purpose

Filterable list of all assignments with current status. Scope is enforced per role: Employee sees own assignments; Manager sees direct reports; HR and Admin see org-wide.

### UI Elements

* Filter panel: department, designation, capability, project, training item, assignment status, assignment source, is_mandatory, due date range
* Paginated assignment table: employee name, training title, assignment source, status badge, due date, assigned by, assigned at, completed at
* Export button (Excel / PDF)

### Actions

* Filter and browse → `GET /api/v1/reports/assignments`
* Export → `POST /api/v1/reports/export` (report_type: assignments)

### API Dependency

* `GET /api/v1/reports/assignments`
* `POST /api/v1/reports/export`
* `GET /api/v1/reports/export/{job_id}`
* `GET /api/v1/reports/export/{job_id}/download`

### Validations

* Employee: own assignments only (SELF_ONLY)
* Manager: direct reports only (TEAM_ONLY)
* HR / Admin: org-wide (ORG_WIDE)

### Navigation

* Reporting Dashboard

---

## Screen 18B: Overdue Training Report

### Actors

Admin, HR, Manager

### Purpose

Lists all overdue assignments with escalation levels. Scope is TEAM_ONLY for Manager, ORG_WIDE for HR and Admin.

### UI Elements

* Filter panel: department, designation, training item, days overdue minimum, escalation level
* Paginated table: employee name, training title, due date, days overdue, escalation level, manager name
* Export button (Excel / PDF)

### Actions

* Filter and browse → `GET /api/v1/reports/overdue`
* Export → `POST /api/v1/reports/export` (report_type: overdue)

### API Dependency

* `GET /api/v1/reports/overdue`
* `POST /api/v1/reports/export`
* `GET /api/v1/reports/export/{job_id}`
* `GET /api/v1/reports/export/{job_id}/download`

### Validations

* Manager: direct reports only (TEAM_ONLY)
* HR / Admin: org-wide (ORG_WIDE)
* Employee: no access

### Navigation

* Reporting Dashboard

---

## Screen 18C: Certificate Report

### Actors

Admin, HR, Manager, Employee

### Purpose

Shows issued certificates filtered by status (APPROVED / PENDING_APPROVAL / REJECTED). Certificates do not expire — all are permanent records.

### UI Elements

* Filter panel: department, training item, issued date range, certificate status (APPROVED / PENDING_APPROVAL / REJECTED)
* Paginated table: employee name, training title, certificate number, issued at, certificate status badge
* Export button (Excel / PDF)

### Actions

* Filter and browse → `GET /api/v1/reports/certificates`
* Export → `POST /api/v1/reports/export` (report_type: certificates)

### API Dependency

* `GET /api/v1/reports/certificates`
* `POST /api/v1/reports/export`
* `GET /api/v1/reports/export/{job_id}`
* `GET /api/v1/reports/export/{job_id}/download`

### Validations

* Employee: own certificates only (SELF_ONLY)
* Manager: direct reports only (TEAM_ONLY)
* HR / Admin: org-wide (ORG_WIDE)

### Navigation

* Reporting Dashboard

---

## Screen 18D: My Learning History

### Actors

Employee (SELF_ONLY)

### Purpose

Employee's personal view of all training activity — in progress, completed, overdue, and certificates earned.

### UI Elements

* In Progress section: training title, due date, progress % bar
* Completed section: training title, completed at date, certificate link (if issued)
* Overdue section: training title, due date, days overdue badge
* Certificates section: training title, certificate number, issued at

### Actions

* View → `GET /api/v1/reports/me/learning-history`

### API Dependency

* `GET /api/v1/reports/me/learning-history`

### Validations

* SELF_ONLY — always scoped to authenticated user

### Navigation

* Reporting Dashboard

---

## Screen 18E: Approval Request Report

### Actors

Admin, Manager

### Purpose

Shows the history of training approval requests. Manager sees requests they approve (TEAM_ONLY); Admin sees all (ORG_WIDE).

### UI Elements

* Filter panel: request status (PENDING / APPROVED / REJECTED / EXPIRED), training item, approver, date range
* Paginated table: employee name, training title, request date, status badge, approver name, decision date, rejection reason
* Export button (Excel / PDF)

### Actions

* Filter and browse → `GET /api/v1/reports/approvals`
* Export → `POST /api/v1/reports/export` (report_type: approvals)

### API Dependency

* `GET /api/v1/reports/approvals`
* `POST /api/v1/reports/export`
* `GET /api/v1/reports/export/{job_id}`
* `GET /api/v1/reports/export/{job_id}/download`

### Validations

* Manager: requests they approve (TEAM_ONLY)
* Admin: org-wide (ORG_WIDE)
* HR / Employee: no access

### Navigation

* Reporting Dashboard

---

## Screen 19: Audit Log Search

### Actors

Admin, HR, Manager (scoped)

### Purpose

Search and investigate audit events. Admin sees all; HR sees compliance-relevant events only; Manager sees assignment/approval/session events for direct reports only.

### UI Elements

* Filter panel: event\_code (with prefix matching e.g. `ASSIGNMENT_*`), module\_name, actor\_user\_id, entity\_type, entity\_id, date range, correlation\_id, source\_system, actor\_type
* Audit table: timestamp, event code, module, actor name, entity type, IP address
* Record detail drawer: before/after values (masked), http\_method, full correlation ID, source system
* Correlation ID trace button → opens full operation trace
* Export button (Excel / PDF)

### Actions

* Search / filter → `GET /api/v1/audit`
* View detail → `GET /api/v1/audit/{event_id}`
* Trace full operation → `GET /api/v1/audit/trace/{correlation_id}`
* Export → `POST /api/v1/audit/export`
* View write failures → Admin — Audit Write Failures screen

### API Dependency

* `GET /api/v1/audit`
* `GET /api/v1/audit/{event_id}`
* `GET /api/v1/audit/trace/{correlation_id}`
* `POST /api/v1/audit/export`
* `GET /api/v1/audit/export/{job_id}`
* `GET /api/v1/audit/export/{job_id}/download`

### Validations

* Admin: all event types, all users
* HR: compliance-relevant events only (ASSIGNMENT\_\*, TRAINING\_COMPLETED, etc.)
* Manager: assignment/approval/session events for direct reports only
* Employee: no access
* Sensitive fields (email, name) shown masked

### Navigation

* Admin Dashboard
* Reporting Dashboard
* Audit Write Failures (Admin)

---

## Screen 20: Users Management

### Actors

Admin

### Purpose

Operational user visibility and control — search, filter, create, deactivate, and trigger sync.

### UI Elements

* User table: checkbox, full name + email + EMP-ID, department, role, manager, compliance progress, status badge, actions (Edit · View Training History)
* Search bar
* Filter dropdowns: Department · Role · Status · **BU Head** (BU Head filter kept at top; BU info removed from user row)
* Bulk actions bar (appears when ≥1 checkbox checked): **Assign Training** (opens modal) · Export · Deactivate
* Create User button + Export button
* `bi-journal-bookmark` icon opens `user-detail.html` (View Training History)

#### Add / Edit User Modal Fields

| Field | Type | Notes |
|---|---|---|
| First Name / Last Name | Text | Required |
| Work Email | Email | Required; identity key |
| Department | Select + ⚙ Manage | Pick from dropdown; gear icon opens Manage Departments modal |
| Role | Select | Options: `Employee` / `HR` / `Admin` only. Manager is NOT a Keycloak role — it is derived at runtime from `user_hierarchy`. Never show "Manager" as a selectable global_role. |
| Designation | Select + ⚙ Manage | Pick from dropdown; gear icon opens Manage Designations modal |
| Manager | Select | Sets reporting hierarchy; synced from Zoho |
| **BU Head** | Select | Business Unit Head; used for BU-wise reporting and stats |
| Employee ID | Text | Auto-generated if blank |
| **Capabilities** | Tag pills + manage | Admin can add/remove capabilities manually (saved via `PUT /api/v1/users/{id}/capabilities`); "Sync from Zoho" button replaces all pills with Employee DB data (`POST /api/v1/users/{id}/capabilities/sync`) |
| **Employment Phase** | Select | `CONFIRMED` (default) / `PROBATION` / `INTERN` |
| **Joining Date** | Date | Shown and required only when Employment Phase = `PROBATION`; used to compute probation end date (joining\_date + 90 days) |

* **Department / Designation Manage modal:** Opens from the ⚙ gear icon next to each field. Lists all existing values with per-item Rename (inline edit) and Delete actions. Add New button at bottom creates a new value, adds it to the dropdown, and auto-selects it in the form. Rename updates the dropdown option in place and preserves the current selection.
* **Capabilities UI:** tag-pill display with add/remove controls; Admin can manually add capabilities (tag input) or remove existing ones; "Sync from Zoho" button replaces all ZOHO-sourced pills with Employee DB data and shows confirmation toast; MANUAL-sourced capabilities are unaffected by sync
* When **Employment Phase = PROBATION** is selected:
  * Joining Date field appears (required)
  * Info banner: _"Probation gate activated — gate trainings will be auto-assigned on save based on the user's designation and capability."_
  * On save: `user_probation` record created, `EMPLOYMENT_PHASE` rules evaluated, gate assignments created
* Note: Employment Phase is sourced from Zoho for synced users and is read-only after first sync. Manual creation uses this field as the seed value.

### Actions

* View user → User Detail
* Create user manually → `POST /api/v1/users`
* Deactivate user → `POST /api/v1/users/{id}/deactivate`
* Bulk deactivate → `POST /api/v1/users/bulk-deactivate`
* Trigger sync → `POST /api/v1/users/sync`
* Export users → `POST /api/v1/users/export`

### API Dependency

* `GET /api/v1/users`
* `POST /api/v1/users` _(includes `employment_phase` and `joining_date` in request body)_
* `POST /api/v1/users/{user_id}/deactivate`
* `POST /api/v1/users/bulk-deactivate`
* `POST /api/v1/users/sync`
* `POST /api/v1/users/export`
* `GET /api/v1/users/export/{job_id}/download`
* `GET /api/v1/users/{user_id}/capabilities` — load capabilities in Add/Edit modal
* `PUT /api/v1/users/{user_id}/capabilities` — save manually added/removed capabilities
* `POST /api/v1/users/{user_id}/capabilities/sync` — "Sync from Zoho" button

### Validations

* Admin only
* Source system fields (Zoho/Employee DB) displayed as read-only after first sync
* `employment_phase` not overrideable via Edit once sourced from Zoho (system-managed)
* Joining Date required when Employment Phase = `PROBATION`
* Bulk deactivate max 100 users per operation

### Navigation

* User Detail
* Admin Dashboard

---

## Screen 21: User Detail

### Actors

Admin, Manager, HR, Employee

### Purpose

Full user profile — training history, assignments, sessions, certificates, compliance summary, and hierarchy info.

### UI Elements

* Profile section: name, employee ID, email, department, designation, capability, location, joining date, status, source system, role
* Manually overridden fields indicator
* Hierarchy section: reporting manager name, direct reports count
* Project allocations list
* Assignment section (tabbed)
* Completion history
* Sessions (upcoming / past)
* Certificates list
* Compliance summary

### Actions

* Override attributes (Admin) → `PATCH /api/v1/users/{user_id}`
* Assign role (Admin) → Role Management (Admin Settings)
* Download certificate → `GET /api/v1/certificates/{id}/download`
* Deactivate / Reactivate (Admin) → `POST /api/v1/users/{id}/deactivate` / `/reactivate`
* View training detail → Training Detail

### API Dependency

* `GET /api/v1/users/{user_id}`
* `PATCH /api/v1/users/{user_id}` (Admin override)
* `GET /api/v1/assignments/{assignment_id}`
* `GET /api/v1/certificates/{certificate_id}`

### Validations

* Employee: own profile only (SELF_ONLY)
* Manager: direct reports only (TEAM_ONLY)
* HR / Admin: all users (ORG_WIDE)
* Admin override only on overridable fields (full\_name, department, designation, location)

### Navigation

* Users Management
* Team Training
* Reports
* Role Management (Admin)

---

## Screen 22: Training Management List

### Actors

Admin

### Purpose

Administrative listing of all training items across all lifecycle states.

### UI Elements

* Search bar
* Filter: training type, category
* Tabs: All · Published · Draft · Mandatory · Archived · **Cert Approvals** (red badge with pending count)
* Table: training code, title, type, category, assigned count, completion progress bar + "Change rule" link, state badge, actions column
* Bulk actions bar (appears when ≥1 checkbox checked): Assign Selected · Archive Selected · Export Selected
* Actions per row:
  * Published/Draft: Edit · Manage Resources · Assignments (viewer modal) · Assign · Archive
  * Archived: Restore
* Create Training button
* Export button

#### Cert Approvals Tab

Shown when "Cert Approvals" tab is selected. The training table is hidden; a dedicated approvals panel replaces it.

* Info banner: explains that employees earn a certificate on completion but can only download after admin approves
* Approvals table columns: Employee · Training · Completed date · Score · Cert ID · Actions
* Actions per row:
  * **Approve** — certificate status → APPROVED; employee notified and can now download
  * **Reject** — opens Reject modal requiring a rejection reason; reason sent to employee as notification; certificate status → REJECTED
* Reject modal fields: rejection reason (required free-text); confirm or cancel

### Actions

* Create training → Training Editor (wizard)
* Edit training → Training Editor (wizard, pre-filled)
* Publish draft → status update in-row
* Assignments → read-only assignments viewer modal (employee list, status, progress, due date)
* Assign → Assign Training modal (scope: All / Specific Department / Specific Users — each shows a conditional multi-select panel)
* Archive → row archived, status badge updated
* Bulk: Assign Selected · Archive Selected · Export Selected
* Change rule → Completion Rule modal (dropdown: All resources / Minimum resources / Admin override)
* Export catalog → `POST /api/v1/trainings/export`

### API Dependency

* `GET /api/v1/trainings`
* `GET /api/v1/trainings/{id}/assignments`
* `POST /api/v1/assignments` (Assign modal)
* `POST /api/v1/trainings/{id}/archive`
* `POST /api/v1/trainings/{id}/restore`
* `POST /api/v1/trainings/export`
* `PUT /api/v1/trainings/{id}` (completion mode update)
* `POST /api/v1/certificates/{id}/approve`
* `POST /api/v1/certificates/{id}/reject`

### Validations

* Admin only
* Cannot publish training with no resources attached
* Cannot update INACTIVE/ARCHIVED training
* Assign modal — Due Date required; when scope ≠ ALL, at least one selection required

### Navigation

* Training Editor
* Training Detail

---

## Screen 23: Training Editor

### Actors

Admin

### Purpose

Create and maintain training items — courses, learning paths, and curriculums — including resources and structure.

### UI Elements

* 4-step wizard: Basic Info → Resources/Structure → Settings → Review & Publish
* **Step 1 — Basic Info:** title, training code (auto-generated, readonly), description, type, category (with inline "+ Add new category" option), difficulty level, estimated duration, tags
* **Step 2 — Resources / Structure (label changes by type):**
  * **Course** — ordered resource list; Add Resource buttons (Video · Document · Assessment · Link · Session); each button opens a **popup modal** with the resource form
    * Video / Document modals include title, OneDrive URL + Browse button, duration/type, Required toggle
    * Link modal includes title, URL, description, Required toggle
    * Session modal links to a scheduled session from the Sessions module
    * **Assessment modal** — includes settings (title, passing score %, max attempts, time limit, randomisation flags) **plus an inline question builder**: add MCQ (4 options, single correct — radio), MSQ (4 options, multiple correct — checkboxes, one or more correct required), or True/False questions; at least one question must be added before the assessment can be saved; each added question shows in a list with a remove button; saved resource row displays question count
  * **Learning Path** — course list with drag-reorder, Required/Optional per course, remove; Add Course select (published courses only)
  * **Curriculum** — learning path list with drag-reorder, Required/Optional per LP, expandable to view constituent courses, remove; Add Learning Path select (published LPs only)
* **Step 3 — Settings:** Mandatory toggle (shows Assignment Rule section when ON), Completion Mode dropdown, Prerequisites pill input, Require Manager Approval toggle, **Issue Certificate on Completion toggle** — when ON, a certificate is generated on completion but the employee can only download it after admin approves it from the Cert Approvals tab
* **Step 4 — Review:** read-only summary of Steps 1–3 before Save Draft / Publish

### Actions

* Save draft → `PUT /api/v1/trainings/{id}`
* Publish → `POST /api/v1/trainings/{id}/publish`
* Inactivate → `POST /api/v1/trainings/{id}/inactivate`
* Add resource → `POST /api/v1/resources`
* Remove resource → `DELETE /api/v1/resources/{id}`
* Reorder resources → `PATCH /api/v1/trainings/{id}/resources/reorder`
* Update structure → `PUT /api/v1/trainings/{id}/structure`

### API Dependency

* `POST /api/v1/trainings` (create)
* `PUT /api/v1/trainings/{training_id}` (update)
* `POST /api/v1/trainings/{id}/publish`
* `POST /api/v1/resources`
* `DELETE /api/v1/resources/{id}`
* `PATCH /api/v1/trainings/{id}/resources/reorder`
* `PUT /api/v1/trainings/{id}/structure`
* `GET /api/v1/trainings/{id}/versions`

### Validations

* Cannot publish with no resources
* Cannot edit INACTIVE training
* Version created only on re-publish after changes
* Only PUBLISHED training can be made mandatory-assignable

### Navigation

* Training Management List
* Training Detail

---

## Screen 24: Session Management List

### Actors

Admin, HR

### Purpose

Full operational control over all sessions. Admin and HR can create and manage sessions (`admin-sessions.html`). Employee and Manager see a read-only session list (`sessions.html`) with no create capability.

### UI Elements

* Session table: session code, title, linked training, instructor, start date/time, state badge, participant count, attended count (completed sessions)
* Filter: state, training, instructor, date range, **BU Head**
* Create Session button
* Include Cancelled toggle
* Row actions (Upcoming): Edit (opens popup modal), Manage Attendance (opens popup modal), Review Nominations (badge count of pending nominations — shown only when nomination window is active)
* Row actions (Ongoing): Mark Attendance, Complete
* Row actions (Completed): View Attendance, Export Report
* Row actions (Cancelled): Reschedule
* Participant attendance panel (inside session detail): additional filters for **Department** and **BU Head** to narrow participant list
* Nominations modal (per session): table of NOMINATED participants with Confirm / Reject actions per row; rejection requires reason input

### Actions

* Create session → Session Editor
* Reschedule session → `PUT /api/v1/sessions/{id}`
* Cancel session → `POST /api/v1/sessions/{id}/cancel`
* Complete session → `POST /api/v1/sessions/{id}/complete`
* Open detail → Session Detail
* Export → `POST /api/v1/sessions/export`
* Confirm nomination → `POST /api/v1/sessions/{id}/nominations/{user_id}/decide` (decision: CONFIRMED)
* Reject nomination → `POST /api/v1/sessions/{id}/nominations/{user_id}/decide` (decision: REJECTED, reason required)

### API Dependency

* `GET /api/v1/sessions`
* `POST /api/v1/sessions/{id}/cancel`
* `POST /api/v1/sessions/{id}/complete`
* `POST /api/v1/sessions/export`
* `POST /api/v1/sessions/{id}/nominations/{user_id}/decide`

### Validations

* Admin and HR only — New Session button not shown to Employee or Manager
* Cancel / Reschedule only for SCHEDULED sessions
* Complete only for SCHEDULED sessions
* Nomination confirm/reject: Admin only; session must not be COMPLETED

### Navigation

* Session Editor
* Session Detail
* Session Attendance Management

---

## Screen 25: Session Editor

### Actors

Admin, HR

### Purpose

Create and reschedule hybrid sessions.

### UI Elements

* Linked training selector (PUBLISHED only)
* Title field
* Facilitator selector (from managed facilitator list — LMS user or external; ⚙ icon opens Manage Facilitators modal)
* Start date/time picker
* End date/time picker
* Venue selector (from managed venue list; ⚙ icon opens Manage Venues modal)
* Venue capacity warning (shown if max\_participants exceeds venue capacity — warning only, not a block)
* Max participants field
* Nomination window toggle (optional) — when enabled, shows:
  * Nomination open date/time
  * Nomination close date/time (must be before session start)
* Notes field
* Teams meeting link section:
  * Teams link status indicator: AUTO\_CREATED / PENDING\_MANUAL / MANUAL
  * Manual link field (shown when teams\_link\_status = PENDING\_MANUAL or MANUAL)
* Session code (auto-generated, read-only after creation)

### Actions

* Save / Create → `POST /api/v1/sessions`
* Reschedule (update) → `PUT /api/v1/sessions/{id}`
* Set manual Teams link → `PUT /api/v1/sessions/{id}/teams-link`
* Manage facilitators (⚙) → `GET /api/v1/facilitators`, `POST /api/v1/facilitators`, `PUT /api/v1/facilitators/{id}`, `POST /api/v1/facilitators/{id}/deactivate`
* Manage venues (⚙) → `GET /api/v1/venues`, `POST /api/v1/venues`, `PUT /api/v1/venues/{id}`, `POST /api/v1/venues/{id}/deactivate`

### API Dependency

* `POST /api/v1/sessions`
* `PUT /api/v1/sessions/{session_id}`
* `PUT /api/v1/sessions/{session_id}/teams-link`
* `GET /api/v1/facilitators`
* `GET /api/v1/venues`

### Validations

* Training must be PUBLISHED
* Start time must be in the future
* Venue required (selected from managed list)
* Nomination window open/close must both be before session start when provided
* If Teams auto-create fails: session saved with PENDING\_MANUAL status, manual link required before participants can join online
* Rescheduling only for SCHEDULED sessions

### Navigation

* Session Management List
* Session Detail

---

## Screen 26: Integration Health Dashboard

### Actors

Admin

### Purpose

Real-time monitoring of all external integration health with manual trigger capability and field mapping configuration for Zoho HR.

### UI Elements

* Integration status cards (one per integration): name, status badge (HEALTHY / DEGRADED / DOWN), last success time, last failure time, consecutive failures count
* Status badge colors: HEALTHY = green, DEGRADED = amber, DOWN = red
* Integrations shown: ZOHO, EMPLOYEE\_DB, KEYCLOAK, TEAMS, ONEDRIVE, PES
* Manual sync / retry action per integration
* **Zoho HR card** additionally shows:
  * "New joiners (probation)" count from the last sync run
  * **Field Mapping summary panel** (inline, collapsible): lists Zoho field → LMS field pairs; "Edit mapping" link
* **Zoho Field Mapping Modal** (opened via "Edit mapping"):
  * **Employment Phase Mapping table**: maps Zoho `employee_status` values to LMS `employment_phase` enum and the system action triggered:
    * `"Probation"` / `"New Joiner"` → `PROBATION` → creates `user_probation` + auto-assigns gate trainings
    * `"Active"` → `CONFIRMED` → standard assignment rules
    * `"Intern"` → `INTERN` → no probation gate
    * `"Resigned"` / `"Terminated"` → `EXITED` → deactivates user; terminates probation if active
  * **All Field Mappings table**: Zoho field, LMS field, Admin override allowed (Yes / No)
  * Fields marked "No override": `employee_id`, `email`, `employment_phase`, `joining_date`
  * Fields marked "Yes override": `full_name`, `department`, `designation`, `capability`, `manager_id`
* Integration Event Log: filterable by system and log level

### Actions

* Trigger Zoho sync → `POST /api/v1/integrations/zoho/sync`
* Trigger Employee DB sync → `POST /api/v1/integrations/employee-db/sync`
* Retry last failed job → `POST /api/v1/integrations/{name}/retry`
* View detail → Integration Detail / Logs screen
* Edit Zoho field mapping → opens Field Mapping Modal

### API Dependency

* `GET /api/v1/integrations/health`
* `POST /api/v1/integrations/zoho/sync`
* `POST /api/v1/integrations/employee-db/sync`
* `POST /api/v1/integrations/{integration_name}/retry`
* `GET /api/v1/integrations/zoho/field-mapping`
* `PUT /api/v1/integrations/zoho/field-mapping`

### Validations

* Admin only
* Manual sync blocked if sync already running (`SYNC_ALREADY_RUNNING`)
* Retry blocked if last job not in FAILED state (`NO_FAILED_JOB`)
* `employment_phase` mapping is system-managed — value translation rules cannot be deleted, only extended for custom Zoho status values

### Navigation

* Admin Dashboard
* Integration Detail / Logs
* Audit Log Search

---

## Screen 27: Integration Detail / Logs

### Actors

Admin

### Purpose

Per-integration job history with per-record error detail for diagnosing sync failures.

### UI Elements

* Integration summary: current status, last success, last failure, consecutive failures, last error summary
* Job history table: job ID, type, status, triggered by, started at, completed at, records processed, records failed
* Filter: job status, job type, date range
* Job detail drawer: per-record error logs (level, message, reference key, timestamp)

### Actions

* View job detail / logs → `GET /api/v1/integrations/{name}/logs/{job_id}`
* Retry failed job → `POST /api/v1/integrations/{name}/retry`

### API Dependency

* `GET /api/v1/integrations/{integration_name}`
* `GET /api/v1/integrations/{integration_name}/logs`
* `GET /api/v1/integrations/{integration_name}/logs/{job_id}`

### Validations

* Admin only

### Navigation

* Integration Health Dashboard

---

## Screen 28: Notification Center

### Actors

Employee, Manager, HR, Admin

### Purpose

In-app notification inbox — view, read, and manage notifications.

### UI Elements

* Notification list (most recent first): event type, title, message, timestamp, read/unread state, linked entity reference
* Unread count badge (in header bell icon)
* Filter: unread only toggle, event\_code filter
* "Mark all as read" button
* Link to Notification Preferences

### Actions

* Mark single as read → `POST /api/v1/notifications/{id}/read`
* Mark all as read → `POST /api/v1/notifications/me/read-all`
* Click notification → navigate to linked entity (assignment, session, training)
* Open preferences → Notification Preferences screen

### API Dependency

* `GET /api/v1/notifications/me`
* `GET /api/v1/notifications/me/unread-count`
* `POST /api/v1/notifications/{notification_id}/read`
* `POST /api/v1/notifications/me/read-all`

### Validations

* Only own notifications visible (SELF_ONLY)
* Marking already-read notification is idempotent (no error)

### Navigation

* Linked assignment / session / training
* Notification Preferences

---

## Screen 29: Notification Preferences

### Actors

Employee, Manager, HR, Admin

### Purpose

User controls which notification types they receive per channel (in-app, email). Mandatory notifications cannot be opted out.

### UI Elements

* Preferences table: event type label, In-App toggle, Email toggle, mandatory badge (if non-optable)
* Save button
* "Mandatory — cannot be disabled" label for mandatory events

### Actions

* Update preferences → `PUT /api/v1/notifications/me/preferences`

### API Dependency

* `GET /api/v1/notifications/me/preferences`
* `PUT /api/v1/notifications/me/preferences`

### Validations

* Mandatory event types: toggles disabled (always on)
* Non-mandatory: user can disable either or both channels independently

### Navigation

* Notification Center
* Dashboard

---

## Screen 30: My Certificates

### Actors

Employee, Manager, HR, Admin (all roles — each sees their own personal certificates)

### Purpose

Personal certificate history with download capability. Accessible from the main nav for all roles.

### UI Elements

* **Summary tiles:** Total Certificates · Active · Pending Approval · Rejected
* **Filter pills:** All · Active · Pending Approval · Rejected
* **Certificate cards grid** — one card per certificate:
  * **Active** — green ribbon; shows View, Download, Share buttons
  * **Pending Approval** — amber ribbon; info message "Download will be available once an admin approves it"; Download button replaced with locked "Download Locked" indicator
  * **Rejected** — red ribbon; shows rejection reason from admin; Re-attempt button links to training

> Note: Certificates do not expire in this system. There are no EXPIRING\_SOON or EXPIRED states.

### Certificate States

| State | Description | Employee Action |
|---|---|---|
| `PENDING_APPROVAL` | Cert generated; awaiting admin approval | Wait; Download locked |
| `APPROVED` / Active | Admin approved; employee can download | View · Download · Share |
| `REJECTED` | Admin rejected with reason | Re-attempt the training |

### Actions

* View certificate preview → opens preview modal
* Download certificate → `GET /api/v1/certificates/{certificate_id}/download` (only when APPROVED)
* Share → copy share link
* Re-attempt (Rejected) → links to My Training / Catalog
* Download All → ZIP of all approved certificates

### API Dependency

* `GET /api/v1/certificates/me`

### Validations

* SELF_ONLY — each user sees only their own certificates
* Download endpoint returns 403 if certificate status ≠ APPROVED

### Navigation

* Dashboard
* My Training

---

## Screen 31: Admin Settings

### Actors

Admin

### Purpose

System configuration management — view and update all configurable settings, manage global roles, and manage mandatory assignment rules.

### Section A: System Settings

#### UI Elements

* Settings grouped by module (Assignment / Notification / System)
* Per setting: key name, description, current value, value type, default value, last changed by, last changed at
* Edit field per setting
* Save button
* Change History link per setting

#### Settings Catalog

| Setting | Module | Default |
|---|---|---|
| Overdue escalation — manager (days) | Assignment | 7 |
| Overdue escalation — HR/Admin (days) | Assignment | 30 |
| Approval expiry (days) | Assignment | 30 |
| Due date reminder (days before) | Notification | 7 |
| Session reminder — first (hours before) | Notification | 24 |
| Session reminder — final (hours before) | Notification | 1 |
| Export file retention (hours) | System | 24 |
| Notification retention (days) | System | 90 |
| Audit log retention (days) | System | 1825 |
| Policy current version | System | v1 |

#### Actions

* Update setting → `PUT /api/v1/admin/settings/{setting_key}`
* View change history → `GET /api/v1/admin/settings/history`

#### API Dependency

* `GET /api/v1/admin/settings`
* `PUT /api/v1/admin/settings/{setting_key}`
* `GET /api/v1/admin/settings/history`

---

### Section B: Role Management

#### UI Elements

* User search field
* Selected user's current roles list
* Assign role dropdown: ADMIN / HR / EMPLOYEE
* Remove role action
* Confirmation modal for role removal

#### Actions

* Search user → `GET /api/v1/search/users`
* View user roles → `GET /api/v1/admin/users/{user_id}/roles`
* Assign role → `POST /api/v1/admin/users/{user_id}/roles`
* Remove role → `DELETE /api/v1/admin/users/{user_id}/roles/{role}`

#### Validations

* Cannot remove ADMIN role from last active Admin (`LAST_ADMIN_PROTECTED` error shown)
* Role changes effective on user's next login (JWT refresh)

---

### Section C: Mandatory Rules Management

#### UI Elements

* Rules table: linked training title, target type, target value, active badge, last evaluated at
* Create Rule button
* Deactivate action per rule

#### Actions

* Create rule → `POST /api/v1/admin/mandatory-rules`
* Edit rule → `PUT /api/v1/admin/mandatory-rules/{rule_id}`
* Deactivate rule → `DELETE /api/v1/admin/mandatory-rules/{rule_id}`

#### Validations

* Training must be PUBLISHED to create a mandatory rule
* Deactivating a rule does not cancel existing in-progress assignments

---

### API Dependency (all sections)

* `GET /api/v1/admin/settings`
* `PUT /api/v1/admin/settings/{setting_key}`
* `GET /api/v1/admin/settings/history`
* `GET /api/v1/admin/users/{user_id}/roles`
* `POST /api/v1/admin/users/{user_id}/roles`
* `DELETE /api/v1/admin/users/{user_id}/roles/{role}`
* `GET /api/v1/admin/mandatory-rules`
* `POST /api/v1/admin/mandatory-rules`
* `PUT /api/v1/admin/mandatory-rules/{rule_id}`
* `DELETE /api/v1/admin/mandatory-rules/{rule_id}`

### Navigation

* Admin Dashboard
* User Detail (from role management search)

---

## Screen 32: Admin — Notification Failures

### Actors

Admin

### Purpose

Monitor and retry notifications that have permanently failed delivery.

### UI Elements

* Failed notifications table: notification ID, event code, recipient name, channel (IN\_APP / EMAIL), retry count, last error, last attempted at, status badge
* Filter: event\_code, channel, date range
* Retry action per row

### Actions

* Retry notification → `POST /api/v1/notifications/admin/failures/{id}/retry`

### API Dependency

* `GET /api/v1/notifications/admin/failures`
* `POST /api/v1/notifications/admin/failures/{notification_id}/retry`

### Validations

* Admin only
* Retry only available for PERMANENTLY\_FAILED status

### Navigation

* Admin Dashboard
* Notification Center

---

## Screen 33: Admin — Audit Write Failures

### Actors

Admin

### Purpose

Monitor and retry audit events that failed to write (dead-letter queue).

### UI Elements

* Write failures table: failure ID, event payload summary, retry count, last error, status (PENDING\_RETRY / PERMANENTLY\_FAILED), created at
* Filter: status, date range
* Retry action per row

### Actions

* Retry write failure → `POST /api/v1/audit/admin/write-failures/{failure_id}/retry`

### API Dependency

* `GET /api/v1/audit/admin/write-failures`
* `POST /api/v1/audit/admin/write-failures/{failure_id}/retry`

### Validations

* Admin only
* Retry blocked if already resolved (`ALREADY_RESOLVED`)

### Navigation

* Audit Log Search
* Admin Dashboard

---

## Screen 34: Migration Control

### Actors

Admin, HR

### Purpose

Controls one-time migration execution and validation.

### UI Elements

* Migration status indicator (NOT\_STARTED / IN\_PROGRESS / COMPLETED / FAILED)
* Record counts: users, training items, assignments, completions
* Validation summary
* Failed records list
* Migration report download

### Actions

* Start migration
* Validate results
* View failed records
* Download migration report

### API Dependency

* Migration control API (Migration module — spec separate)

### Validations

* Re-execution blocked after COMPLETED status
* Restricted to Admin / HR only

### Navigation

* Admin Dashboard
* Audit Log Search

---

# 6. Screen-to-API Mapping Reference

| Screen | Primary APIs Called |
|---|---|
| Login Entry | `GET /auth/me` |
| Policy Acceptance | `POST /auth/policy-acceptance` |
| Employee Dashboard | `GET /dashboard/me` |
| Manager Dashboard | `GET /dashboard/team` |
| HR Dashboard | `GET /dashboard/hr` |
| Admin Dashboard | `GET /dashboard/admin`, `GET /integrations/health` |
| My Training | `GET /assignments/me` |
| Learning Catalog | `GET /search/catalog`, `GET /search/suggestions` |
| Training Detail | `GET /trainings/{id}`, `GET /trainings/{id}/resources` |
| Resource Player | `GET /resources/{id}`, `POST /resources/{id}/progress` |
| My Sessions | `GET /sessions/me` |
| Session Detail | `GET /sessions/{id}`, `GET /sessions/{id}/participants` |
| Session Attendance | `GET /sessions/{id}/attendance`, `PUT /sessions/{id}/attendance`, `POST /sessions/{id}/attendance/fetch-teams` |
| Approvals Inbox | `GET /approvals/pending`, `POST /approvals/{id}/approve`, `POST /approvals/{id}/reject` |
| Team Training | `GET /assignments/team` |
| Compliance Report | `GET /reports/compliance`, `POST /reports/export` |
| Reporting Dashboard | `GET /reports/export/{job_id}`, `GET /reports/export/{job_id}/download` |
| Audit Log Search | `GET /audit`, `GET /audit/{id}`, `GET /audit/trace/{correlation_id}` |
| Users Management | `GET /users`, `POST /users`, `POST /users/sync` |
| User Detail | `GET /users/{id}`, `PATCH /users/{id}` |
| Training Management | `GET /trainings`, `POST /trainings/{id}/publish` |
| Session Management | `GET /sessions` |
| Integration Health | `GET /integrations/health` |
| Notification Center | `GET /notifications/me`, `POST /notifications/me/read-all` |
| Notification Preferences | `GET /notifications/me/preferences`, `PUT /notifications/me/preferences` |
| Admin Settings | `GET /admin/settings`, `PUT /admin/settings/{key}`, `GET /admin/settings/history` |
| Role Management | `GET /admin/users/{id}/roles`, `POST /admin/users/{id}/roles`, `DELETE /admin/users/{id}/roles/{role}` |
| Mandatory Rules | `GET /admin/mandatory-rules`, `POST /admin/mandatory-rules` |

---

# 7. Validation and Authorization Reference

## Global Role Driven (from Keycloak JWT)

* ADMIN — full system access
* HR — org-wide read; compliance and reporting focus
* EMPLOYEE — own data + catalog access

## Hierarchy Driven (from Employee DB)

* Any EMPLOYEE with direct reports in `user_hierarchy` has manager-scope visibility
* Manager scope: direct reports only (depth = 1)
* Manager is NOT a Keycloak role — derived at runtime

## Fail-Safe Rule

If required authorization context is missing (hierarchy unavailable, role claim absent):
* Deny access by default — never grant by default

---

---

## Screen 35: My Profile

### Actors

Employee, Manager, HR, Admin

### Purpose

Allows any authenticated user to view their own profile, edit mutable fields (name, phone, location), and manage notification preferences. Role-specific fields and notification options are shown/hidden based on the user's global role and whether they have direct reports. Note: password change is not available — the LMS uses Keycloak SSO exclusively (no local passwords).

### UI Elements

* Avatar with upload trigger
* Role badge (Employee / Manager / HR / Admin) — display only; not editable here
* Personal information panel: full name, email, phone, department (read-only), designation (read-only), employee ID (read-only), joining date, manager name
* Inline edit mode toggle for mutable fields (full name, phone, location)
* Notification preferences section with per-type toggles:
  * Training assignments
  * Due date reminders
  * Completion certificates
  * Session reminders
  * Compliance alerts
  * Team alerts *(visible for Manager, HR, Admin)*
  * System alerts *(visible for HR, Admin)*
* Training summary sidebar: assigned / completed / in progress / overdue / certificates count
* Recent certificates widget (last 3)
* Quick links to My Training, Certificates, Notifications

### Actions

* Toggle edit mode → enable/disable inline field inputs
* Save changes → `PATCH /api/v1/users/me`
* Cancel edit → revert inputs to saved values
* Save notification preferences → `PUT /api/v1/notifications/me/preferences` (Notifications module)
* Download certificate → `GET /api/v1/certificates/{id}/download`

### API Calls

* `GET /api/v1/users/me` — load profile data
* `PATCH /api/v1/users/me` — save mutable field edits
* `GET /api/v1/certificates/me` — load recent certificates

### Validations

* Full name: required, max 255 characters
* Phone: optional, format validated
* Mutable fields only; system-owned fields (department, designation, email, employee ID) rendered as read-only

### Navigation

* Back to Dashboard
* Quick links to My Training / Certificates / Notifications

---

## Screen 36: Team Assignments (Manager)

### Actors

Manager

### Purpose

Allows a manager to view all training assignments across their direct reports, monitor completion and compliance status per team member, and assign new training to one or more team members in a single modal flow.

### UI Elements

* KPI cards: team size, active assignments, overdue count, team completion rate
* Team members grid: 1 card per direct report showing avatar, role, compliance status badge, completion progress bar, overdue count — click to pre-select in assign modal
* Search + status filter (all / non-compliant / compliant / expiring / in-progress)
* Assignments table: member name, training, type (mandatory/optional), assigned date, due date, status badge, progress bar, Remind action
* Member filter + status filter for table
* Export button

### Actions

* Click team member card → open Assign Training modal pre-selecting that member
* "Assign Training" button → open Assign Training modal (no pre-selection)
* Remind button (per row) → `POST /api/v1/notifications/send` or toast only
* Export → `POST /api/v1/assignments/export`

### Assign Training Modal (3-step)

1. **Select members** — checkbox-select one or more direct reports; selected shown as removable pills
2. **Choose training** — searchable list from catalog; single selection with visual check indicator
3. **Assignment details** — due date (date picker), priority (normal/high/urgent), optional note to team

### API Calls

* `GET /api/v1/users/team-members` — load direct reports list
* `GET /api/v1/assignments/team` — load all team assignments
* `POST /api/v1/assignments` — create assignment(s) on modal submit
* `POST /api/v1/assignments/export` → `GET /api/v1/assignments/export/{job_id}/download`
* `GET /api/v1/trainings` — populate training catalog in assign modal

### Validations

* At least one team member must be selected before submitting
* A training must be selected before submitting
* Due date: required; cannot be in the past
* Manager can only assign to their own direct reports — backend enforces hierarchy

### Navigation

* Remind button → navigable to notifications
* Assign Training modal confirms with toast on submit

---

## Screen 37: Admin Training Resources Management

### Actors

Admin

### Purpose

Allows Admin to manage the resources (content items) attached to a specific training course. Resources are the leaf-level learning objects: videos, documents, assessments, external links, and sessions. The screen is accessed from the Training Management list by clicking the Resources icon on a training row.

### UI Elements

* Breadcrumb: Training → [Training Title] → Resources
* Resource list: ordered drag-and-drop list with sequence number, type icon, title, required/optional badge, duration, action buttons (edit, delete, reorder)
* "Add Resource" button
* Resource type summary bar (count by type)

### Add / Edit Resource Modal (2-step)

**Step 1 — Select Type**
Tile selection: VIDEO · DOCUMENT · ASSESSMENT · LINK · SESSION
*(SCORM not shown — deferred to Phase 2)*

Edit path: clicking Edit on a resource row skips Step 1 and opens Step 2 pre-filled with the resource's current values. Modal title changes to "Edit Resource — [Type]".

**Step 2 — Configure Resource** (fields vary by type)

| Type | Fields |
|---|---|
| VIDEO | Title, OneDrive URL + Browse OneDrive button, duration (min), required toggle |
| DOCUMENT | Title, OneDrive URL + Browse OneDrive button, document type, required toggle, access mode |
| ASSESSMENT | Title, passing score %, max attempts, time limit, randomize flags, question builder |
| LINK | Title, URL, description, required toggle |
| SESSION | Title, linked session (dropdown of scheduled sessions) |

### Actions

* Add resource → `POST /api/v1/resources`
* Edit resource → opens Add Resource modal pre-filled → `PUT /api/v1/resources/{resource_id}`
* Delete resource → `DELETE /api/v1/resources/{resource_id}` (with confirm)
* Reorder → drag-and-drop → `PATCH /api/v1/trainings/{training_id}/resources/reorder`

### API Calls

* `GET /api/v1/trainings/{training_id}/resources` — load resource list
* `POST /api/v1/resources` — add new resource
* `PUT /api/v1/resources/{resource_id}` — update resource
* `DELETE /api/v1/resources/{resource_id}` — remove resource
* `PATCH /api/v1/trainings/{training_id}/resources/reorder` — save new order
* `GET /api/v1/resources/{resource_id}/assessment` / `PUT` — assessment config

### Validations

* Training must be in DRAFT or PUBLISHED state to manage resources
* At least one resource required before training can be published
* LINK type: URL format validated
* SESSION type: linked session must be SCHEDULED or COMPLETED
* Assessment: passing score 1–100; max attempts ≥ 1 (or 0 for unlimited); minimum 1 question

### Navigation

* Breadcrumb back to Training list
* On delete confirm → resource removed from list
* On save → return to resource list

---

# 8. Future Screen Enhancements

* Skills Dashboard
* Learning Recommendations Hub
* AI Search Experience
* Org Learning Heatmap
* Delegated Administration Console
* Config Change Approval Workflow (for critical settings)

---

## Screen 38: HR Probation Dashboard

### Actors
- HR
- Admin (read access)

### Access
- HR nav → ORGANISATION → Probation
- Admin nav → REPORTS & AUDIT → Probation (read only)

### Purpose
Gives HR visibility into all employees currently in probation. Allows HR to confirm probation completion or extend deadlines.

### Layout

**Top stat cards:**
- Active Probationers (count)
- Confirmable Now (gates all complete)
- Overdue Probationers (past deadline)

**Filter bar:** Status (PROBATION / EXTENDED / CONFIRMED / TERMINATED), Department, Designation, "Overdue only" toggle

**Probation list table:**
| Employee | Designation | Dept | Start | End / Extended Until | Gates | Readiness | Actions |
|---|---|---|---|---|---|---|---|
| Rahul Sharma | SE | Engineering | Jan 15 | Apr 15 | 1/3 | ⚠ AT_RISK | View |

Readiness badge: `ON_TRACK` (green) / `AT_RISK` (amber, deadline < 14 days) / `OVERDUE` (red)

**Per-employee probation detail (slide-over or separate view):**
- Employee info (name, designation, capability, joining date)
- Probation timeline bar (start → end)
- Gate training checklist:
  - Each row: Training name · Due date · Status (✓ COMPLIANT / ⏰ PENDING / ✗ NON_COMPLIANT)
- "Confirm Probation" button — enabled only when all gates COMPLIANT
- "Extend Deadline" button — opens modal with new date + reason input

### API Calls
- `GET /api/v1/probation` (list)
- `GET /api/v1/probation/{user_id}` (detail)
- `POST /api/v1/probation/{user_id}/confirm`
- `POST /api/v1/probation/{user_id}/extend`

### Navigation
- **HR**: ORGANISATION section → Probation
- **Admin**: REPORTS & AUDIT section → Probation (read-only)

### Future Enhancements
- Export probation status report
- Bulk confirmation for employees with all gates complete

---

## Prototype Coverage Notes (Phase 1)

The prototype set intentionally prioritizes core operational screens. Some screen definitions are represented as states or inline panels inside existing prototype pages.

**Coverage rule for audits:**
- A screen is treated as "covered" if it has either:
  1) a dedicated prototype HTML page, or
  2) an explicitly documented inline/state implementation inside another prototype page.
- Screens outside Phase 1 scope may be marked as intentionally not prototyped.

| Screen | Prototype Coverage | Notes |
|---|---|---|
| Screen 1: Login Redirect / Access Entry | `prototype/login.html`, `prototype/index.html` | Covered |
| Screen 2: First Login Policy Acceptance | `prototype/login.html` (integrated first-login state) | Implemented as login flow state; no separate HTML file |
| Screen 3-6: Role Dashboards | `prototype/dashboard-employee.html`, `prototype/dashboard-manager.html`, `prototype/dashboard-admin.html`, `prototype/dashboard-hr.html` | Covered |
| Screen 7-10: Learning experience | `prototype/my-training.html`, `prototype/catalog.html`, `prototype/course-detail.html` | Covered (resource player state embedded in course/training pages) |
| Screen 11-13: Sessions | `prototype/sessions.html`, `prototype/session-detail.html`, `prototype/admin-sessions.html` | Covered |
| Screen 14-16: Approvals/Team assignment | `prototype/approvals.html`, `prototype/team-assignments.html` | Covered (assign modal represented inline) |
| Screen 17-19: Compliance/Reporting/Audit | `prototype/compliance.html`, `prototype/reports.html`, `prototype/audit-logs.html` | Covered |
| Screen 20-23: User + training admin | `prototype/admin-users.html`, `prototype/user-detail.html`, `prototype/admin-training.html` | Covered |
| Screen 24-27: Session + integrations admin | `prototype/admin-sessions.html`, `prototype/admin-integrations.html` | Covered |
| Screen 28-33: Notifications + admin ops | `prototype/notifications.html`, `prototype/admin-settings.html` | Covered (failure views represented as admin subsections) |
| Screen 34: Migration Control | No dedicated prototype (Phase 2 deferred) | Intentional |
| Screen 35: My Profile | `prototype/profile.html` | Covered |
| Screen 36: Team Assignments (Manager) | `prototype/team-assignments.html` | Covered |
| Screen 37: Admin Training Resources Management | `prototype/admin-training-resources.html` | Covered |
| Screen 38: HR Probation Dashboard | `prototype/hr-probation.html` | Covered |

**Intentional non-standalone implementations (not gaps):**
- Screen 2 (Policy Acceptance): implemented as first-login state in `prototype/login.html`
- Screen 10 (Resource Player / Viewer): represented within course/training experience pages
- Screen 16 (Assign Training Modal): represented as modal state in manager/admin assignment flows
- Screen 32 and Screen 33 (Admin failure views): represented as admin subsections in current prototype set
- Screen 34 (Migration Control): Phase 2 deferred; no prototype required for Phase 1 audit

---

# Navigation Updates

## HR Navigation (Updated)

| Section | Items |
|---|---|
| MAIN | Dashboard, My Training, Training Catalog |
| ORGANISATION | Users, Sessions, **Probation** *(new)*, Compliance, Reports, Audit Logs |
| ACCOUNT | Notifications, Profile |

## Admin Navigation (No Change Required)
Probation is accessible via existing Reports & Audit section. No structural nav change needed for Admin.

---

# Screen 5 Update: Training Add/Edit (Wizard)

Screen 5 (Admin Training Add/Edit) has been upgraded from a single-panel modal to a **4-step wizard**:

| Step | Label | Key Fields |
|---|---|---|
| 1 | Basic Info | Title, Code (auto), Type, Category, Description, Tags |
| 2 | Resources | Inline resource list with add/reorder/delete; skippable |
| 3 | Settings | Mandatory + Assignment Rule (incl. "New Joiners (Probation)" scope with designation/capability filters + probation gate toggle) · Validity days · Completion mode · Prerequisites · Requires approval · Certificate · is_probation_gateway toggle |
| 4 | Review & Publish | Summary + Save as Draft / Publish |

**"Manage Resources" button** remains on the training list for direct resource editing without the full wizard.

---

# End of Document
