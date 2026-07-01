# Feature: Reporting (Learning Analytics & Compliance Visibility)

---

# 1. Feature Overview

## Purpose

The Reporting feature provides structured visibility into training activities, learning progress, compliance status, and organizational performance through dashboards and exportable reports.

It serves as the **insight and decision-making layer** of the LMS by transforming operational data into actionable information for managers, HR, and administrators.

Compliance status reporting is owned here — the `compliance_status` table (owned by Assignment Engine) drives all compliance-related reports and dashboards.

---

## Why Business Needs It

Organizations require reliable reporting to:

* Ensure compliance with mandatory training
* Track employee learning progress
* Support performance evaluation (via PES)
* Enable manager-level visibility into team performance
* Support audits and regulatory requirements
* Drive data-based decision making

---

## Problems This Feature Solves

* Lack of visibility into compliance
* Difficulty tracking team performance
* Manual audit preparation
* Inconsistent reporting across systems
* Limited insight into training effectiveness

---

## Integration with Other LMS Modules

| Module              | Role in Reporting                           |
| ------------------- | ------------------------------------------- |
| User Management     | Provides user attributes + hierarchy        |
| Assignment Engine   | Provides assignment lifecycle + compliance_status |
| Training Management | Provides training structure + completions   |
| Sessions            | Provides attendance records                 |
| Audit               | Provides traceability                       |

> Note: Compliance is not a standalone module — `compliance_status` is computed by the Assignment Engine background job and read by Reporting.
> PES compliance API is documented in the Integrations module.

---

# 2. Actors

## Employee

* View personal learning history
* View own compliance status
* Track progress and due dates
* Download certificates

---

## Manager

Derived from hierarchy (NOT a role)

* View team training status
* Monitor overdue assignments
* Track team compliance
* Export team reports

Access limited to direct reports (hierarchy depth = 1).

---

## Admin

* View system-wide reports
* Export any report
* Monitor trends and completion rates
* View compliance by department / designation / capability / project

---

## HR

* Verify mandatory training compliance
* Generate compliance audit reports
* View non-compliant users
* Support PES evaluation with compliance data

---

# 2A. User Scenarios

(No major change — already correct)

---

# 3. Functional Overview

Reporting is a **read-only** feature. It aggregates data from Assignment Engine, Training Management, Sessions, and User Management. It does not write to any source tables.

### Flow

```
User requests report / opens dashboard
→ System validates access (role + hierarchy)
→ Data fetched from LMS (live query or pre-computed snapshot)
→ Filters applied
→ Aggregations calculated
→ Results displayed or exported (PDF / Excel)
```

### Compliance State Definitions

Compliance state is computed by the Assignment Engine background job and stored in `compliance_status`. Reporting reads this table directly:

| State | Meaning |
|---|---|
| `PENDING` | Mandatory assignment exists; not yet due; not completed |
| `COMPLIANT` | Mandatory assignment completed on or before due date (or no due date) |
| `NON_COMPLIANT` | Assignment is OVERDUE, or completed after due date |

Rules:
- Inactive users are **excluded** from active compliance reports but **visible** in historical reports
- Migrated completions (`is_migrated_basis = true`) are treated as valid compliance basis
- Compliance grouping supported by: Department / Designation / Capability / Project (from Employee DB attributes)

---

# 4. Functional Requirements

## 4.1 Dashboard Analytics

### Admin Dashboard
| Widget | Data Source |
|---|---|
| Total active users | `users` |
| Overall completion rate (%) | `assignments` |
| Overdue assignments count | `assignments` |
| Non-compliant users count | `compliance_status` |
| Upcoming sessions (next 7 days) | `sessions` |
| Pending approval requests | `assignment_requests` |
| Recent completions (last 7 days) | `training_completions` |

### Manager Dashboard
| Widget | Data Source |
|---|---|
| Team completion rate (%) | `assignments` (team scope) |
| Overdue team assignments | `assignments` (team scope) |
| Non-compliant team members | `compliance_status` (team scope) |
| Pending team approval requests | `assignment_requests` (team scope) |
| Team upcoming sessions | `sessions` (team scope) |

### Employee Dashboard
| Widget | Data Source |
|---|---|
| My assignments (in progress / overdue) | `assignments` |
| My compliance status | `compliance_status` |
| My upcoming sessions | `sessions` |
| My recent completions | `training_completions` |
| My certificates | `certificates` |

---

## 4.1A Dashboard Overview — Role-Aware Chart Rendering

The Reports Overview tab renders different primary charts depending on the viewer's role:

| Role | Primary Chart | Secondary |
|---|---|---|
| Admin / HR | Completion Rate by Department (bar chart, 7 depts) | Assignment Summary stats |
| Manager | My Team — Training Progress (per-member bar chart, direct reports only) | Assignment Summary stats (team-scoped) |

KPI cards on the Reports page are also scoped:

| Metric | Admin / HR value | Manager value |
|---|---|---|
| Completions | Org-wide this month | Team completions this month |
| Completion Rate | Org overall % | Team % |
| Overdue Assignments | Org-wide count | Team overdue count |
| Compliance Rate | Org % | Team % |

---

## 4.2 Report Type Catalog

### Report 1: Assignment Status Report
**Purpose:** Shows all assignments with current status.
**Access:** Admin (ORG_WIDE), Manager (TEAM_ONLY), Employee (SELF_ONLY)
**Filters:** user, department, designation, capability, project, training_item, assignment_status, due_date range, assignment_source, mandatory flag
**Columns:** Employee name, Training title, Assignment source, Status, Due date, Assigned by, Assigned at, Completed at

---

### Report 2: Compliance Status Report
**Purpose:** Shows mandatory training compliance state per user.
**Access:** Admin (ORG_WIDE), HR (ORG_WIDE), Manager (TEAM_ONLY)
**Filters:** compliance_state (PENDING / COMPLIANT / NON_COMPLIANT), department, designation, capability, project, training_item, include_inactive_users
**Columns:** Employee name, Department, Designation, Training title, Compliance state, Due date, Completion date, Days overdue (if applicable)
**Notes:**
- Inactive users excluded by default; `include_inactive_users=true` shows historical
- Migrated completions flagged with `(Migrated)` indicator

**UI Presentation by role:**
- **Admin / HR**: Results grouped by department. Each department row shows aggregate stats (total, compliant, non-compliant, rate). Clicking a department row opens a drill-down popup modal showing per-employee compliance status across all mandatory trainings (per-training ✓/✗/⟳ matrix). Filterable by name and status within the modal.
- **Manager**: Results shown directly as a per-employee matrix — no dept grouping. Each direct report shown as a row with compliance status per mandatory training and an overall status badge (Compliant / Non-Compliant / In Progress). Remind and Assign buttons available per row. Warning banner shown when non-compliant team members exist, linking to Team Assignments screen.
- Note: certificates do not expire in this system — "Expiring Soon" status and related counts are not applicable.

---

### Report 3: Training Completion Report
**Purpose:** Shows completion rates per training item.
**Access:** Admin (ORG_WIDE), HR (ORG_WIDE), Manager (TEAM_ONLY)
**Filters:** training_item, training_type, department, date range, mandatory flag
**Columns:** Training title, Type, Total assigned, Completed, In progress, Overdue, Completion rate (%)

---

### Report 4: Overdue Training Report
**Purpose:** Shows all overdue assignments and escalation status.
**Access:** Admin (ORG_WIDE), HR (ORG_WIDE), Manager (TEAM_ONLY)
**Filters:** department, designation, days_overdue_min, training_item, escalation_level
**Columns:** Employee name, Training title, Due date, Days overdue, Escalation level, Manager name

---

### Report 5: Session Attendance Report
**Purpose:** Shows attendance records per session.
**Access:** Admin (ORG_WIDE), HR (ORG_WIDE), Manager (TEAM_ONLY)
**Filters:** session_id, training_item, date range, attendance_status, attendance_mode (ONLINE / OFFLINE), facilitator_id
**Columns:** Session code, Session title, Training title, Date, Facilitator, Participant name, Attendance mode, Attendance status, Attendance source

---

### Report 6: Certificate Report
**Purpose:** Shows issued certificates — all certificates are permanent (certificates do not expire).
**Access:** Admin (ORG_WIDE), HR (ORG_WIDE), Manager (TEAM_ONLY), Employee (SELF_ONLY)
**Filters:** user, department, training_item, issued_date range, certificate_status (APPROVED / PENDING_APPROVAL / REJECTED)
**Columns:** Employee name, Training title, Certificate number, Issued at, Certificate status
**Notes:** Certificates do not expire. Certificate status reflects admin approval state, not validity period.

---

### Report 7: My Learning History (Employee)
**Purpose:** Employee's personal view of all training, progress, completions, and certificates.
**Access:** Employee (SELF_ONLY)
**No filters** (always scoped to authenticated user)
**Sections:**
- In Progress assignments (title, due date, progress %)
- Completed trainings (title, completed at, certificate link)
- Overdue assignments (title, days overdue)
- Certificates (title, issued at, expires at)

---

### Report 8: Approval Request Report
**Purpose:** Shows approval request lifecycle.
**Access:** Admin (ORG_WIDE), Manager (TEAM_ONLY — requests they approve)
**Filters:** request_status, training_item, date range, approver
**Columns:** Employee name, Training title, Request date, Status, Approver name, Decision date, Rejection reason

---

## 4.3 Export Capability

Supported formats: **Excel (.xlsx)** and **PDF** only.

Export follows async job pattern:
1. `POST /reports/export` → `{ "job_id": "uuid" }` (report_type + filters in request body)
2. `GET /reports/export/{job_id}` → poll until `status = READY`
3. `GET /reports/export/{job_id}/download` → stream file

All reports support export. Export includes all filtered rows (no pagination limit).

---

## 4.4 Performance Handling

- Live queries for dashboard widgets (indexed queries; < 2s target)
- Pre-computed snapshots optional for heavy aggregations (Admin org-wide metrics)
- All report list endpoints are paginated
- Export is always async — never blocking
- `reporting_snapshots` table used for caching org-wide aggregations (refreshed by background job)

---

## 4.5 Access Control

| Role | Scope |
|---|---|
| Employee | SELF_ONLY — own assignments, completions, certificates |
| Manager | TEAM_ONLY — direct reports only (hierarchy depth = 1) |
| Admin | ORG_WIDE — all users |
| HR | ORG_WIDE — compliance and completion reports only |

Manager scope derived dynamically from `user_hierarchy` — not a role.

---

# 5. Business Rules

## Source of Truth

BR-01 Assignment Engine owns `compliance_status` — Reporting reads it
BR-02 Employee DB provides hierarchy for scoping
BR-03 Reporting is read-only — never writes to source tables

---

## Compliance Reporting Rules

BR-04 Compliance states: PENDING / COMPLIANT / NON_COMPLIANT (computed by AE background job)
BR-05 Inactive users excluded from active compliance reports by default
BR-06 Inactive users visible in historical reports when `include_inactive_users = true`
BR-07 Migrated completions (`is_migrated_basis = true`) count as valid compliance basis
BR-08 Compliance grouping supported by: Department / Designation / Capability / Project

---

## Export Rules

BR-09 Export formats: Excel (.xlsx) and PDF only
BR-10 All exports are async — POST creates job, poll for status, download when READY
BR-11 Export job results retained for 24 hours then purged
BR-12 Export includes all rows matching filters (no row limit)

---

## Authorization Rules

BR-13 Role + hierarchy enforced on every report endpoint
BR-14 Manager scope = direct reports only (hierarchy depth = 1)
BR-15 HR can view ORG_WIDE compliance and completion reports; not assignment management reports
BR-16 Employee sees only own data

---

## Certificate Reporting Rules

BR-17 Certificates do not expire — no EXPIRING_SOON or EXPIRED status on certificates
BR-18 Certificate report shows all certificates by approval status (APPROVED / PENDING_APPROVAL / REJECTED); historical records retained permanently

---

## Performance Rules

BR-19 Dashboard widgets use indexed live queries; target response < 2 seconds
BR-20 Async export for all full-dataset reports
BR-21 Snapshot cache refreshed by background job for heavy org-wide aggregations

---

# 6. Workflows

## Dashboard Load

User opens dashboard
→ Role + hierarchy validated
→ Scoped widget queries executed (indexed)
→ Metrics returned and rendered

---

## Report Generation

User selects report type + applies filters
→ Access validated (role + hierarchy scope)
→ Paginated data returned

---

## Compliance Report (HR / Admin)

HR opens compliance report
→ Filters by department / compliance_state
→ `compliance_status` table queried (joined with users + training_items)
→ PENDING / COMPLIANT / NON_COMPLIANT rows returned
→ Inactive users excluded (unless filter enabled)

---

## Export Flow

User clicks export
→ `POST /reports/{type}/export` with format (excel/pdf) + filters
→ `job_id` returned
→ Background worker processes query → generates file → stores reference
→ User polls → status READY → downloads file

---

# 7. Data Rules

## Data Ownership

| System      | Data                                    |
| ----------- | --------------------------------------- |
| LMS         | All reporting source data               |
| Employee DB | Hierarchy + department / designation / capability / project |
| PES         | Consumes compliance via Integrations API |

---

## Edit Rules

* All reporting endpoints are read-only
* Source data owned by respective modules

---

## Retention

* Historical data retained permanently
* Export job files retained 24 hours
* `reporting_snapshots` refreshed on schedule; old snapshots purged

---

# 8. Edge Cases

## Missing Hierarchy

Manager report scope returns empty or partial results. No error — displays what is accessible.

---

## Inactive Users in Compliance Report

Excluded from active view by default. Visible with `include_inactive_users = true`.

---

## Migrated Completion

Counted as COMPLIANT. `is_migrated_basis = true` flagged in exported data.

---

## Large Data Queries

Export always async. Live report lists are paginated (max 100 rows per page).

---

## Export Job Failure

Job status = FAILED. User can re-trigger export. Admin notified via notification system.

---

# 9. Acceptance Criteria

* Admin dashboard widgets accurate and load within 2 seconds
* Manager sees only direct reports' data
* HR can view ORG_WIDE compliance and completion reports
* Employee sees only own data
* All 8 report types work with correct filters and columns
* Compliance report displays PENDING / COMPLIANT / NON_COMPLIANT correctly
* Inactive users excluded from active compliance; visible in historical
* Migrated completions count as valid compliance basis
* Session attendance report shows ONLINE / OFFLINE attendance modes
* Certificate report shows ACTIVE / EXPIRING_SOON / EXPIRED
* Export generates Excel and PDF correctly via async job
* Role + hierarchy enforced on all endpoints

---

# 10. Dependencies

* Assignment Engine (`compliance_status`, `assignments`, `assignment_requests`)
* Training Management (`training_completions`, `certificates`, `training_items`)
* Sessions (`session_attendance`, `session_participants`)
* User Management (`users`, `user_hierarchy`)
* Employee DB (department / designation / capability / project attributes)
* Worker service (export jobs, snapshot refresh)

---

# 11. Assumptions

* < 1000 users; single tenant
* On-prem deployment; SSO mandatory
* Hierarchy depth = 1 for manager scope
* Compliance states computed by Assignment Engine background job — Reporting reads pre-computed values
* PES compliance API documented in Integrations spec

---

# 12. Audit Events

| Event | event_code | Minimum Data Captured |
|---|---|---|
| Report exported | `REPORT_EXPORTED` | report_type, format, filters_json, exported_by, job_id, correlation_id, timestamp |
| Dashboard accessed | `DASHBOARD_ACCESSED` | dashboard_type, accessed_by, correlation_id, timestamp |

---

# 13. Future Enhancements

* AI-powered analytics and predictions
* Predictive compliance risk scoring
* Scheduled automated report delivery (email)
* Advanced visualization (charts, trend lines)
* Learning effectiveness metrics
* Skills gap analysis reports

---

# End of Document
