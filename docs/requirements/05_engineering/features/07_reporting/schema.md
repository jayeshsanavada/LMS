# Reporting — Database Schema

---

## 1. Design Principles

- Reporting is read-only — all source data owned by other modules
- Two owned tables: `report_exports` (async job tracking) + `reporting_snapshots` (pre-computed cache)
- `compliance_status` table owned by Assignment Engine — read here for compliance reports
- Export files retained for 24 hours; background job purges expired jobs
- Snapshot cache refreshed by background job; used for heavy org-wide aggregations

---

## 2. Common Columns Standard

| Column | Type | Purpose |
|---|---|---|
| `id` | UUID | Primary key |
| `created_at` | TIMESTAMP | Record creation time |
| `created_by` | UUID | FK → `users.id` or system |
| `updated_at` | TIMESTAMP | Last update time |
| `updated_by` | UUID | FK → `users.id` or system |
| `is_active` | BOOLEAN | Active flag |

---

## 3. Tables Owned by Reporting Module

---

### Table: `report_exports`

**Purpose**
Tracks async export jobs. One row per export request. Stores job status, file reference, and expiry.

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `requested_by_user_id` | UUID | No | FK → `users.id` |
| `report_type` | VARCHAR(100) | No | `assignments` / `compliance` / `completions` / `overdue` / `sessions_attendance` / `certificates` / `approvals` |
| `export_format` | VARCHAR(50) | No | `EXCEL` / `PDF` |
| `request_filters_json` | TEXT | Yes | JSON snapshot of filters applied at job creation |
| `job_status` | VARCHAR(50) | No | `PENDING` / `PROCESSING` / `READY` / `FAILED` |
| `file_reference` | TEXT | Yes | Storage path to generated file; set when READY |
| `file_name` | VARCHAR(255) | Yes | Suggested download filename |
| `error_message` | TEXT | Yes | Set on FAILED |
| `expires_at` | TIMESTAMP | Yes | Set to `created_at + 24h` when READY; null while pending |
| `created_at` | TIMESTAMP | No | |
| `completed_at` | TIMESTAMP | Yes | Set when READY or FAILED |

**Business Rules**
- Export file retained for 24 hours after `completed_at`
- Background job purges records where `expires_at < now()`
- Only the requesting user or ADMIN can poll or download
- Failed jobs can be re-triggered by the user (creates a new row)
- `export_format` restricted to `EXCEL` and `PDF`

**Indexes**
- `(requested_by_user_id, job_status)` (my export jobs)
- `job_status` (worker pickup — find PENDING)
- `expires_at` (purge job)

---

### Table: `reporting_snapshots`

**Purpose**
Pre-computed aggregation cache for heavy org-wide dashboard metrics. Refreshed by background job on a schedule. Prevents live heavy queries on dashboard load.

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `snapshot_type` | VARCHAR(100) | No | e.g. `admin_dashboard` / `compliance_summary` / `completion_rates` |
| `snapshot_date` | DATE | No | Date the snapshot represents |
| `snapshot_payload` | TEXT | No | JSON blob of pre-computed metrics |
| `expires_at` | TIMESTAMP | No | When snapshot is considered stale (e.g. `snapshot_date + 1 day`) |
| `created_at` | TIMESTAMP | No | |

**Business Rules**
- One active snapshot per `(snapshot_type, snapshot_date)`
- If snapshot is stale or missing, live query used as fallback
- Background job regenerates snapshots daily
- Old snapshots purged when `expires_at < now()`

**Indexes**
- `(snapshot_type, snapshot_date)` (lookup by type + date)
- `expires_at` (purge job)

---

## 4. Referenced Tables (Read by Reporting — Owned by Other Modules)

| Table | Owning Module | Used In Report |
|---|---|---|
| `users` | User Management | All reports — employee name, department, designation |
| `user_hierarchy` | User Management | Manager scope (TEAM_ONLY) enforcement |
| `assignments` | Assignment Engine | Assignment Status Report, Overdue Report |
| `compliance_status` | Assignment Engine | Compliance Status Report, dashboard compliance widgets |
| `mandatory_assignment_rules` | Assignment Engine | Compliance grouping reference |
| `training_items` | Training Management | Training title, type, mandatory flag |
| `training_completions` | Training Management | Training Completion Report |
| `certificates` | Training Management | Certificate Report |
| `resource_progress` | Training Management | Employee learning history progress % |
| `assignment_requests` | Assignment Engine | Approval Request Report |
| `sessions` | Sessions | Session Attendance Report |
| `session_participants` | Sessions | Session Attendance Report |
| `session_attendance` | Sessions | Session Attendance Report — ONLINE/OFFLINE breakdown |

---

## 5. Enum Values

### `report_type`
- `assignments`
- `compliance`
- `completions`
- `overdue`
- `sessions_attendance`
- `certificates`
- `learning_history`
- `approvals`

### `export_format`
- `EXCEL`
- `PDF`

### `job_status`
- `PENDING` — job created, not yet picked up by worker
- `PROCESSING` — worker is generating the file
- `READY` — file generated and available for download
- `FAILED` — generation failed

### `snapshot_type`
- `admin_dashboard`
- `compliance_summary`
- `completion_rates`

---

## 6. Cross-Check Notes

Verified against:
- `07_reporting.md` — all data requirements covered including compliance module absorption (C1-C5) and all 8 enterprise additions
- `02_database_schema.md` §6.2 — all master tables present
- `06_compliance.md` — compliance module removed as standalone; all relevant data requirements absorbed

**Additions vs master schema:**
- `report_exports.file_name` — download filename for UX
- `report_exports.error_message` — failure diagnostic
- `report_exports.expires_at` — 24h file retention enforcement (R8)
- `reporting_snapshots.expires_at` — stale cache detection (previously marked "optional" in master; promoted to required)
- Compliance reporting reads `compliance_status` (owned by Assignment Engine) — no duplicate table needed here
- Export format restricted to `EXCEL` / `PDF` — CSV excluded per product decision
