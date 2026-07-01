# User Management — Database Schema

---

## 1. Design Principles

- Single relational database (modular monolith)
- User records never hard-deleted — deactivated only (`is_active = false`)
- Zoho and Employee DB data treated as read-only sync targets in LMS
- All hierarchy and allocation data fully replaced on each sync (no partial merge)
- Audit and compliance records retained for minimum 5 years

---

## 2. Common Columns Standard

These columns apply to all tables unless noted:

| Column | Type | Purpose |
|---|---|---|
| `id` | UUID | Primary key |
| `created_at` | TIMESTAMP | Record creation time |
| `created_by` | VARCHAR(100) | User ID or system actor |
| `updated_at` | TIMESTAMP | Last update time |
| `updated_by` | VARCHAR(100) | User ID or system actor |
| `is_active` | BOOLEAN | Active / inactive flag |

---

## 3. Tables Owned by User Management Module

---

### Table: `users`

**Purpose**
Core user record. Maps authenticated Keycloak identity to LMS employee data. Single source of truth for user identity within the LMS.

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `employee_id` | VARCHAR(50) | No | Unique business identifier from Zoho |
| `keycloak_user_id` | VARCHAR(100) | Yes | External identity reference; set after first login |
| `email` | VARCHAR(255) | No | Unique; from Zoho |
| `full_name` | VARCHAR(255) | No | From Zoho |
| `department` | VARCHAR(150) | Yes | From Zoho |
| `designation` | VARCHAR(150) | Yes | From Employee DB |
| `capability` | VARCHAR(150) | Yes | From Employee DB; single primary capability for backward compat |
| `bu_head_id` | UUID | Yes | FK → `users.id`; BU Head for this user; synced from Employee DB |
| `phone` | VARCHAR(50) | Yes | Optional; user-editable via PATCH /users/me |
| `location` | VARCHAR(150) | Yes | Optional |
| `joining_date` | DATE | Yes | From Zoho |
| `employment_status` | VARCHAR(50) | No | `ACTIVE` / `INACTIVE` / `EXITED` |
| `employment_type` | VARCHAR(50) | No | `PERMANENT` / `CONTRACT` / `INTERN`; default `PERMANENT` |
| `employment_phase` | VARCHAR(50) | No | `PROBATION` / `CONFIRMED` / `EXITED`; default `CONFIRMED` |
| `probation_end_date` | DATE | Yes | Set when `employment_phase = PROBATION`; null for non-probationers |
| `global_role` | VARCHAR(50) | No | `ADMIN` / `HR` / `EMPLOYEE`; cached from Keycloak |
| `source_system` | VARCHAR(50) | No | `ZOHO` / `MANUAL` |
| `last_login_at` | TIMESTAMP | Yes | Updated by auth middleware on each successful login |
| `policy_accepted` | BOOLEAN | No | First login policy acceptance flag |
| `policy_accepted_version` | VARCHAR(50) | Yes | Version of accepted policy |
| `policy_accepted_at` | TIMESTAMP | Yes | When policy was last accepted |
| `is_active` | BOOLEAN | No | LMS participation flag; false = deactivated |
| `created_at` | TIMESTAMP | No | |
| `updated_at` | TIMESTAMP | No | |

**Business Rules**
- `employee_id` must be unique
- `email` must be unique
- `keycloak_user_id` must be unique when present
- Users are never deleted — only `is_active = false`
- `source_system = MANUAL` records are overwritten by Zoho sync on matching `employee_id`
- `global_role` is a cache of Keycloak role — `role_mappings` table is the authoritative source
- `employment_type` must be set on creation — defaults to `PERMANENT`
- `employment_phase` defaults to `CONFIRMED`; set to `PROBATION` for new joiners who are on probation
- `probation_end_date` set at user creation when `employment_phase = PROBATION`; null otherwise
- `last_login_at` updated on every successful `GET /auth/me` call by auth middleware
- `bu_head_id` populated by Employee DB sync; null for users not mapped to a BU; the referenced user must be `is_active = true`
- PII fields (`full_name`, `email`, `keycloak_user_id`) must support anonymization (set to anonymized placeholder) for Phase 2 data privacy compliance

**Indexes**
- `employee_id` (unique)
- `email` (unique)
- `keycloak_user_id` (unique, nullable)
- `is_active` (filter)
- `department` (filter)
- `employment_status` (filter)
- `employment_phase` (filter — probation dashboard)
- `bu_head_id` (filter — BU-wise reports)

---

### Table: `user_source_references`

**Purpose**
Tracks source-system identifiers for each user across Zoho, Employee DB, and Keycloak. Used for sync reconciliation — maps external IDs to LMS user IDs.

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `user_id` | UUID | No | FK → `users.id` |
| `source_system` | VARCHAR(50) | No | `ZOHO` / `EMPLOYEE_DB` / `KEYCLOAK` |
| `source_record_id` | VARCHAR(150) | No | External identifier in that system |
| `is_current` | BOOLEAN | No | Only one current mapping per source per user |
| `created_at` | TIMESTAMP | No | |

**Business Rules**
- One current mapping per `(user_id, source_system)` combination
- Old mappings set `is_current = false` when source ID changes
- Used to resolve conflicts and troubleshoot sync mismatches

**Indexes**
- `(user_id, source_system)` (lookup)
- `(source_system, source_record_id, is_current)` (sync reconciliation)

---

### Table: `user_hierarchy`

**Purpose**
Stores reporting relationships derived from Employee DB. Used for all hierarchy-based authorization — team visibility, approval routing, assignment authority.

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `user_id` | UUID | No | FK → `users.id` |
| `manager_user_id` | UUID | No | FK → `users.id` (reporting manager) |
| `effective_from` | DATE | No | Start of this reporting relationship |
| `effective_to` | DATE | Yes | Null = currently active |
| `is_current` | BOOLEAN | No | True for active relationship |
| `source_system` | VARCHAR(50) | No | Always `EMPLOYEE_DB` |
| `created_at` | TIMESTAMP | No | |
| `updated_at` | TIMESTAMP | No | |

**Business Rules**
- One current hierarchy row per user at any time (`is_current = true`)
- On manager change: old row `effective_to` set to change date + `is_current = false`; new row inserted
- Manager is never stored as a role — this table is the sole source of manager capability
- Phase 1: team access uses direct reports only (depth = 1)

**Indexes**
- `user_id` (FK + lookup)
- `manager_user_id` (find direct reports)
- `(user_id, is_current)` (current manager lookup)
- `(manager_user_id, is_current)` (team members lookup)

---

### Table: `user_project_allocations`

**Purpose**
Stores user project allocation details from Employee DB. Used for assignment rules and reporting filters. Fully replaced on each Employee DB sync.

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `user_id` | UUID | No | FK → `users.id` |
| `project_code` | VARCHAR(100) | No | From Employee DB |
| `project_name` | VARCHAR(255) | Yes | From Employee DB |
| `allocation_percent` | DECIMAL(5,2) | Yes | 0–100; null if not tracked |
| `effective_from` | DATE | No | |
| `effective_to` | DATE | Yes | Null = currently active |
| `is_current` | BOOLEAN | No | |
| `source_system` | VARCHAR(50) | No | Always `EMPLOYEE_DB` |
| `created_at` | TIMESTAMP | No | |
| `updated_at` | TIMESTAMP | No | |

**Business Rules**
- On each Employee DB sync: all rows for user set `is_current = false`, new rows inserted as current
- Multiple current allocations per user allowed (user can be on multiple projects)
- Used by Assignment Engine for attribute-based rule matching

**Indexes**
- `user_id` (FK + lookup)
- `(user_id, is_current)` (current allocations)
- `project_code` (filter)

---

### Table: `user_attributes_sync_log`

**Purpose**
Tracks field-level changes made to user records during sync. Records sync conflicts (Zoho vs Employee DB field value differences). Used for troubleshooting and audit.

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `user_id` | UUID | No | FK → `users.id` |
| `source_system` | VARCHAR(50) | No | `ZOHO` / `EMPLOYEE_DB` |
| `sync_job_id` | UUID | Yes | FK → `integration_jobs.id` |
| `changed_fields_json` | JSON | Yes | Field names and old/new values |
| `conflict_fields_json` | JSON | Yes | Fields where Zoho and Employee DB conflicted; resolved value recorded |
| `sync_status` | VARCHAR(50) | No | `SYNCED` / `CONFLICT_RESOLVED` / `FAILED` |
| `created_at` | TIMESTAMP | No | |

**Business Rules**
- One row per user per sync job
- `conflict_fields_json` populated when Zoho and Employee DB send different values for same field
- Zoho value always wins on conflict; this is recorded here for traceability

**Indexes**
- `user_id` (lookup)
- `sync_job_id` (sync job audit)
- `sync_status` (filter failed syncs)

---

---

### Table: `user_field_overrides`

**Purpose**
Tracks which user profile fields have been manually overridden by Admin, preventing sync from overwriting corrected data. When Admin clears an override, the field is removed from this table and sync can overwrite it again.

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `user_id` | UUID | No | FK → `users.id` |
| `field_name` | VARCHAR(100) | No | e.g. `full_name`, `department`, `designation`, `location` |
| `overridden_value` | TEXT | No | The admin-set value |
| `original_value` | TEXT | Yes | The value before override (from last sync) |
| `overridden_by` | UUID | No | FK → `users.id` (Admin who made the change) |
| `overridden_at` | TIMESTAMP | No | |
| `is_active` | BOOLEAN | No | False = override cleared, sync can overwrite again |
| `cleared_by` | UUID | Yes | FK → `users.id` (Admin who cleared the override) |
| `cleared_at` | TIMESTAMP | Yes | |

**Business Rules**
- One active override row per `(user_id, field_name)` at any time
- When `clear_overrides = true` on PATCH request: all rows for user set `is_active = false`
- Sync job checks this table before updating a field — skips fields with active override

**Indexes**
- `(user_id, field_name, is_active)` (sync check)
- `user_id` (admin view of all overrides for a user)

---

### Table: `user_probation`

**Purpose**
Tracks each probation period for a user — start/end dates, current status, and HR confirmation. One active row per user at any time. Created automatically when a user is onboarded with `employment_phase = PROBATION`.

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `user_id` | UUID | No | FK → `users.id` |
| `probation_start_date` | DATE | No | Set at user creation; typically `joining_date` |
| `probation_end_date` | DATE | No | `probation_start_date` + configured days (default 90) |
| `probation_status` | VARCHAR(50) | No | `PROBATION` / `CONFIRMED` / `EXTENDED` / `TERMINATED` |
| `extended_until` | DATE | Yes | Set when HR extends the probation deadline |
| `extension_reason` | TEXT | Yes | HR-provided reason for extension |
| `confirmed_at` | TIMESTAMP | Yes | When HR confirmed probation completion |
| `confirmed_by` | UUID | Yes | FK → `users.id` — HR actor who confirmed |
| `created_at` | TIMESTAMP | No | |
| `created_by` | UUID | No | FK → `users.id` or system |
| `updated_at` | TIMESTAMP | No | |
| `updated_by` | UUID | No | FK → `users.id` or system |

**Business Rules**
- One `user_probation` row per user per probation period; new row created for each new probation period
- `probation_status = PROBATION` is the active state; transitions to `CONFIRMED`, `EXTENDED`, or `TERMINATED`
- HR can only confirm when all `is_probation_gate = true` assignments for the user are `COMPLIANT`
- `EXTENDED` status creates a new `extended_until` date and logs the reason
- When confirmed: `users.employment_phase` updated to `CONFIRMED`
- `TERMINATED` status does not auto-confirm probation; handled via HR workflow

**Indexes**
- `user_id` (lookup)
- `(user_id, probation_status)` (active probation check)
- `probation_end_date` (deadline-approaching alerts)

---

### Table: `user_capabilities`

**Purpose**
Stores the set of capabilities (skills/tracks) associated with a user. Multi-value: each row is one capability for one user. Used for capability-scoped training assignments, compliance reporting, and capability-wise analytics.

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `user_id` | UUID | No | FK → `users.id` |
| `capability_name` | VARCHAR(150) | No | e.g. `Java Backend`, `AWS`, `HR Ops` |
| `source` | VARCHAR(50) | No | `MANUAL` — Admin added; `ZOHO` — synced from Zoho/Employee DB |
| `is_active` | BOOLEAN | No | False = removed but retained for audit |
| `created_at` | TIMESTAMP | No | |
| `created_by` | VARCHAR(100) | No | User ID or system actor |
| `updated_at` | TIMESTAMP | No | |

**Business Rules**
- One row per `(user_id, capability_name)` combination — no duplicates
- `source = ZOHO` rows: fully replaced on each Employee DB sync (set `is_active = false` for removed capabilities, insert new ones)
- `source = MANUAL` rows: not overwritten by sync; only Admin can deactivate
- The `users.capability` column retains the single primary capability for backward compatibility; `user_capabilities` is the authoritative multi-value store
- Used by Assignment Engine: `CAPABILITY` scope in assignment rules joins against this table

**Indexes**
- `user_id` (FK + lookup)
- `(user_id, capability_name, is_active)` (unique active capability per user)
- `capability_name` (filter — capability-wise reports)

---

## 4. Referenced Tables (Owned by Other Modules)

These tables are referenced by FK from User Management tables but are not owned by this module:

| Table | Owning Module | Used By |
|---|---|---|
| `role_mappings` | Auth | `users.global_role` is cached from here |
| `integration_jobs` | Integrations | `user_attributes_sync_log.sync_job_id` |
| `admin_settings` | Admin | Policy version comparison (read only) |
| `background_jobs` | Platform | Sync job tracking via `POST /users/sync` |

---

## 5. Enum Values

### `employment_status`
- `ACTIVE`
- `INACTIVE`
- `EXITED`

### `employment_type`
- `PERMANENT`
- `CONTRACT`
- `INTERN`

### `employment_phase`
- `PROBATION` — actively in probation period
- `CONFIRMED` — probation passed or not applicable
- `EXITED` — user has left the organisation

### `probation_status` (user_probation table)
- `PROBATION` — active probation, gate trainings not yet complete
- `CONFIRMED` — all gate trainings complete; HR confirmed
- `EXTENDED` — deadline extended by HR
- `TERMINATED` — employment terminated during probation

### `global_role` (cached on users table)
- `ADMIN`
- `HR`
- `EMPLOYEE`

### `source_system`
- `ZOHO`
- `EMPLOYEE_DB`
- `KEYCLOAK`
- `MANUAL`

### `sync_status`
- `SYNCED`
- `CONFLICT_RESOLVED`
- `FAILED`

---

## 6. Cross-Check Notes

Verified against:
- `02_user_management.md` — all data requirements covered
- `02_database_schema.md` §5.1 — all tables present; the following additions derived from the spec:
  - `users.global_role` column added (cached role for fast access; authoritative source remains `role_mappings`)
  - `users.source_system` column added (to distinguish `ZOHO` vs `MANUAL` users)
  - `user_attributes_sync_log.conflict_fields_json` column added (required by sync conflict resolution rule BR-20)
- `01_api_list.md` §8 — all data read/written by the 7 endpoints is covered

**Additions vs master schema (all derived from spec + enterprise review):**
- `users.employment_type` — required for compliance rule scoping (U5)
- `users.last_login_at` — required for inactive user tracking (U3)
- `users.source_system` — required to distinguish ZOHO vs MANUAL users
- `users.global_role` — cached role for fast access
- `user_attributes_sync_log.conflict_fields_json` — sync conflict resolution (BR-20)
- `user_field_overrides` table (new) — admin attribute override with sync protection (U2)
- `users.employment_phase` — probation gate feature (BR-P01); tracks PROBATION → CONFIRMED lifecycle
- `users.probation_end_date` — quick deadline check without joining `user_probation`
- `user_probation` table (new) — full probation period record with HR confirmation tracking
- `users.bu_head_id` — FK to BU Head user; synced from Employee DB; enables BU-wise compliance and reporting
- `user_capabilities` table (new) — multi-value capability store per user; synced from Zoho/Employee DB; supports capability-scoped assignment rules and analytics
