# Audit — Database Schema

---

## 1. Design Principles

- `audit_logs` is immutable — INSERT only, no UPDATE or DELETE ever
- Sensitive fields masked before write (email partial, tokens/keys fully redacted)
- Async write via worker queue — audit failures never block originating operations
- Failed writes go to `audit_write_failures` (dead-letter) for retry
- 5-year retention for audit logs; migration logs permanent; dead-letter 90 days
- `correlation_id` links all events from a single HTTP request across modules

---

## 2. Common Columns Standard

| Column | Type | Purpose |
|---|---|---|
| `id` | UUID | Primary key |
| `created_at` | TIMESTAMP | Record creation time |

> Note: Audit tables do not use `updated_at`, `updated_by`, or `is_active` — they are immutable append-only records.

---

## 3. Tables Owned by Audit Module

---

### Table: `audit_logs`

**Purpose**
Central immutable store for all LMS system events. Every module emits events; this table stores all of them. Records are never updated or deleted (except by retention purge after 5 years, or exempt if `legal_hold = true`).

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `event_code` | VARCHAR(100) | No | From master event catalog (e.g. `ASSIGNMENT_CREATED`) |
| `module_name` | VARCHAR(100) | No | e.g. `assignment_engine`, `sessions`, `user_management` |
| `action_name` | VARCHAR(100) | No | Human-readable action (e.g. `create_assignment`) |
| `actor_user_id` | UUID | Yes | FK → `users.id`; null for SYSTEM / INTEGRATION events |
| `actor_type` | VARCHAR(50) | No | `USER` / `SYSTEM` / `INTEGRATION` |
| `entity_type` | VARCHAR(100) | Yes | e.g. `assignment`, `user`, `session` |
| `entity_id` | UUID | Yes | FK to the record the event is about |
| `previous_value_json` | TEXT | Yes | JSON snapshot of state before change — masked |
| `new_value_json` | TEXT | Yes | JSON snapshot of state after change — masked |
| `source_system` | VARCHAR(100) | Yes | e.g. `ZOHO`, `EMPLOYEE_DB`, `PES`; null for LMS-originated |
| `correlation_id` | UUID | Yes | Links all events from one HTTP request or job run |
| `ip_address` | VARCHAR(45) | Yes | IPv4 or IPv6; set for USER actor events |
| `http_method` | VARCHAR(10) | Yes | e.g. `POST`, `PATCH`; set for USER actor events |
| `legal_hold` | BOOLEAN | No | Default false; if true, exempt from retention purge |
| `created_at` | TIMESTAMP | No | Event timestamp |

**Business Rules**
- INSERT only — no UPDATE or DELETE permitted at application or DB layer
- `previous_value_json` and `new_value_json` are masked before write:
  - `email` → partial mask: `j***@company.com`
  - `password`, `token`, `access_token`, `refresh_token`, `api_key`, `client_secret` → `[REDACTED]`
- Retention purge: background job deletes records where `created_at < now() - 5 years` AND `legal_hold = false`
- Records from `MIGRATION_*` event codes have `legal_hold = true` by default (permanent)
- PostgreSQL `tsvector` index on `event_code + action_name` for full-text search

**Indexes**
- `(actor_user_id, created_at DESC)` (user activity timeline)
- `(entity_type, entity_id)` (events for a specific record)
- `correlation_id` (trace all events from one request)
- `(module_name, event_code)` (module-level filter)
- `(actor_type, created_at)` (system / integration event filter)
- `created_at` (retention purge)
- `legal_hold` (purge exclusion filter)
- Full-text: `GIN` index on `to_tsvector('english', event_code || ' ' || action_name)` (search)

---

### Table: `audit_write_failures`

**Purpose**
Dead-letter store for audit events that could not be written to `audit_logs` after 3 retry attempts. Background job retries hourly. Admin monitors and can manually retry.

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `event_payload_json` | TEXT | No | Full JSON of the audit event that failed to write |
| `failure_reason` | TEXT | No | Error message from last failed write attempt |
| `retry_count` | INTEGER | No | Default 0; incremented on each attempt |
| `status` | VARCHAR(50) | No | `PENDING_RETRY` / `PERMANENTLY_FAILED` / `RESOLVED` |
| `last_attempted_at` | TIMESTAMP | Yes | When last retry was attempted |
| `resolved_at` | TIMESTAMP | Yes | Set when successfully written or manually resolved |
| `created_at` | TIMESTAMP | No | When event first failed |
| `updated_at` | TIMESTAMP | No | |

**Business Rules**
- Created when audit write fails after 3 retries
- Background job retries `PENDING_RETRY` records hourly
- After 24 hours unresolved: status set to `PERMANENTLY_FAILED`; Admin notified
- On successful retry: status = `RESOLVED`; audit event written to `audit_logs`
- Retained for 90 days then purged

**Indexes**
- `status` (worker pickup — find PENDING_RETRY)
- `created_at` (90-day purge job)
- `(status, last_attempted_at)` (hourly retry job)

---

### Table: `audit_export_jobs`

**Purpose**
Tracks async export jobs for audit log downloads. Separate from `report_exports` to keep audit exports independently auditable.

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `requested_by_user_id` | UUID | No | FK → `users.id` |
| `export_format` | VARCHAR(50) | No | `EXCEL` / `PDF` |
| `request_filters_json` | TEXT | Yes | JSON snapshot of applied filters |
| `job_status` | VARCHAR(50) | No | `PENDING` / `PROCESSING` / `READY` / `FAILED` |
| `file_reference` | TEXT | Yes | Storage path to generated file |
| `file_name` | VARCHAR(255) | Yes | Suggested download filename |
| `error_message` | TEXT | Yes | Set on FAILED |
| `expires_at` | TIMESTAMP | Yes | `completed_at + 24h`; set when READY |
| `created_at` | TIMESTAMP | No | |
| `completed_at` | TIMESTAMP | Yes | Set when READY or FAILED |

**Business Rules**
- Export file available for 24 hours after completion
- Background purge job deletes records where `expires_at < now()`
- HR access: filters validated against allowed event types before job is created

**Indexes**
- `(requested_by_user_id, job_status)` (my export jobs)
- `job_status` (worker pickup)
- `expires_at` (purge job)

---

## 4. Referenced Tables (Owned by Other Modules)

| Table | Owning Module | Used By |
|---|---|---|
| `users` | User Management | `audit_logs.actor_user_id` — actor name resolution |

> All other entity IDs (`entity_id`) reference records in their respective modules. No FK constraints are enforced on `entity_id` — audit logs must survive even if the referenced entity is later soft-deleted.

---

## 5. Enum Values

### `actor_type`
- `USER` — action performed by a logged-in LMS user
- `SYSTEM` — action performed by background job or internal service
- `INTEGRATION` — action performed by an external system (Zoho, PES, Employee DB)

### `job_status` (audit_export_jobs)
- `PENDING`
- `PROCESSING`
- `READY`
- `FAILED`

### `status` (audit_write_failures)
- `PENDING_RETRY` — awaiting retry by background job or admin
- `PERMANENTLY_FAILED` — unresolved after 24 hours
- `RESOLVED` — successfully written to `audit_logs`

### `export_format`
- `EXCEL`
- `PDF`

---

## 6. Sensitive Field Masking Reference

Applied by audit service before any write to `audit_logs.previous_value_json` / `new_value_json`:

| Field Name Pattern | Masking Applied |
|---|---|
| `email` | Partial: `j***@company.com` |
| `password` | `[REDACTED]` |
| `token`, `access_token`, `refresh_token` | `[REDACTED]` |
| `api_key`, `client_secret`, `client_id` | `[REDACTED]` |
| `teams_meeting_link` | Stored as-is |

---

## 7. Cross-Check Notes

Verified against:
- `08_audit.md` — all data requirements covered including all 8 enterprise additions
- `02_database_schema.md` §6.3 — master table present

**Additions vs master schema:**
- `audit_logs.ip_address` + `http_method` — security event context (A5)
- `audit_logs.legal_hold` — permanent record protection for migration logs and admin-flagged records
- `audit_logs` GIN full-text index — search support (master had no index definition)
- `audit_write_failures` table (new) — dead-letter for failed writes (A6)
- `audit_export_jobs` table (new) — export job tracking, separate from `report_exports` (A2)
- No FK on `entity_id` by design — audit records must outlive referenced entities
- 5-year retention confirmed (resolves conflict with 90-day PRD reference — 90 days applies to notifications only)
