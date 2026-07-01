# Integrations — Database Schema

---

## 1. Design Principles

- Three tables track all integration activity: jobs, per-record logs, and current health state
- `integration_jobs` is the primary execution ledger — one row per sync or API access event
- `integration_job_logs` stores per-record detail (errors, warnings) linked to a job
- `integration_health_status` is a live summary table — one row per integration, updated after each job
- PES compliance data read from `compliance_status` (owned by Assignment Engine) — no separate table here
- Integration job logs retained for 90 days (configurable); health status is permanent

---

## 2. Common Columns Standard

| Column | Type | Purpose |
|---|---|---|
| `id` | UUID | Primary key |
| `created_at` | TIMESTAMP | Record creation time |

> Integration tables do not use `updated_at` or `is_active` — they are append-only execution records (except `integration_health_status` which is updated in place).

---

## 3. Tables Owned by Integrations Module

---

### Table: `integration_jobs`

**Purpose**
Tracks every integration execution — scheduled syncs, manual triggers, retry attempts, and PES API access events. One row per execution. The authoritative log of all integration activity.

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `integration_name` | VARCHAR(100) | No | `ZOHO` / `EMPLOYEE_DB` / `KEYCLOAK` / `TEAMS` / `ONEDRIVE` / `PES` |
| `job_type` | VARCHAR(100) | No | `SYNC` / `RETRY` / `HEALTHCHECK` / `API_ACCESS` |
| `job_status` | VARCHAR(50) | No | `PENDING` / `RUNNING` / `COMPLETED` / `FAILED` |
| `triggered_by` | VARCHAR(50) | No | `SCHEDULER` / `ADMIN` / `SYSTEM` / `EXTERNAL` |
| `triggered_by_user_id` | UUID | Yes | FK → `users.id`; set when Admin manually triggers |
| `started_at` | TIMESTAMP | Yes | Set when worker picks up job |
| `completed_at` | TIMESTAMP | Yes | Set on COMPLETED or FAILED |
| `records_processed` | INTEGER | No | Default 0 |
| `records_failed` | INTEGER | No | Default 0 |
| `retry_count` | INTEGER | No | Default 0; incremented for retry attempts |
| `next_retry_at` | TIMESTAMP | Yes | Next scheduled retry time for FAILED jobs |
| `parent_job_id` | UUID | Yes | FK → `integration_jobs.id`; set for RETRY jobs |
| `error_summary` | TEXT | Yes | High-level error description on FAILED |
| `last_error` | TEXT | Yes | Latest detailed error message used for retry diagnostics |
| `correlation_id` | UUID | Yes | Links to audit event for this job run |
| `request_metadata_json` | TEXT | Yes | For `API_ACCESS` jobs: PES employee_id(s), request IP |
| `created_at` | TIMESTAMP | No | |

**Business Rules**
- Scheduler creates a new row per scheduled run — does not reuse
- `triggered_by = EXTERNAL` for PES API access jobs
- `records_processed` and `records_failed` updated by worker on completion
- `retry_count` increments for each RETRY execution in the same failure chain
- `parent_job_id` links a retry job back to the original failed job
- `next_retry_at` set only for FAILED jobs that are eligible for automatic retry
- `integration_health_status` updated after every job completion or failure
- Retained for 90 days; purge job deletes older records

**Indexes**
- `(integration_name, job_status)` (current running job check — prevent duplicate sync)
- `(integration_name, created_at DESC)` (job history per integration)
- `parent_job_id` (retry lineage lookup)
- `job_status` (worker pickup — find PENDING)
- `created_at` (90-day purge)

---

### Table: `integration_job_logs`

**Purpose**
Per-record detail logs for a sync job. One row per significant event within a job execution (error, warning, skipped record). Admin uses this to diagnose individual sync failures.

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `integration_job_id` | UUID | No | FK → `integration_jobs.id` |
| `log_level` | VARCHAR(20) | No | `INFO` / `WARNING` / `ERROR` |
| `message` | TEXT | No | Human-readable description of event |
| `reference_key` | VARCHAR(255) | Yes | e.g. employee ID, session ID — the record this log line is about |
| `created_at` | TIMESTAMP | No | |

**Business Rules**
- Only ERROR and WARNING rows written by default (INFO optional, configurable)
- `reference_key` used for filtering logs by specific record
- Retained for 90 days (same as parent `integration_jobs`)

**Indexes**
- `integration_job_id` (all logs for one job)
- `(integration_job_id, log_level)` (filter errors only)
- `reference_key` (find all logs for a specific employee/record)
- `created_at` (90-day purge)

---

### Table: `integration_health_status`

**Purpose**
Live health summary — one row per integration. Updated after every job execution. Powers the Admin health dashboard. Never purged — permanent record.

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `integration_name` | VARCHAR(100) | No | Unique — one row per integration |
| `current_status` | VARCHAR(50) | No | `HEALTHY` / `DEGRADED` / `DOWN` |
| `last_success_at` | TIMESTAMP | Yes | Timestamp of last COMPLETED job |
| `last_failure_at` | TIMESTAMP | Yes | Timestamp of last FAILED job |
| `last_job_id` | UUID | Yes | FK → `integration_jobs.id` — most recent job |
| `consecutive_failures` | INTEGER | No | Default 0; reset on success |
| `remarks` | TEXT | Yes | Last error summary |
| `updated_at` | TIMESTAMP | No | Updated after every job |

**Business Rules**
- One row per `integration_name` — upsert pattern
- `HEALTHY` — last job succeeded
- `DEGRADED` — last job failed but previous success exists (< 24h ago)
- `DOWN` — last job failed AND no success in > 24h OR `consecutive_failures` ≥ 3
- `consecutive_failures` incremented on FAILED, reset to 0 on COMPLETED
- Admin notified when status transitions to `DOWN`

**Indexes**
- `integration_name` (unique — health lookup per integration)
- `current_status` (dashboard filter — find DEGRADED / DOWN)

---

## 4. Referenced Tables (Owned by Other Modules)

| Table | Owning Module | Used By |
|---|---|---|
| `users` | User Management | `integration_jobs.triggered_by_user_id` — Admin who triggered sync |
| `compliance_status` | Assignment Engine | PES API reads compliance data from here — no copy in Integrations module |

---

## 5. Enum Values

### `integration_name`
- `ZOHO`
- `EMPLOYEE_DB`
- `KEYCLOAK`
- `TEAMS`
- `ONEDRIVE`
- `PES`

### `job_type`
- `SYNC` — scheduled or manually triggered data sync
- `RETRY` — explicit retry of a failed job
- `HEALTHCHECK` — periodic connectivity check
- `API_ACCESS` — external system called LMS API (PES)

### `job_status`
- `PENDING` — queued, not started
- `RUNNING` — worker in progress
- `COMPLETED` — finished successfully
- `FAILED` — finished with errors

### `triggered_by`
- `SCHEDULER` — cron job
- `ADMIN` — manual trigger via API
- `SYSTEM` — internal trigger (e.g. post-session Teams attendance pull)
- `EXTERNAL` — external system API access (PES)

### `current_status` (health)
- `HEALTHY`
- `DEGRADED`
- `DOWN`

### `log_level`
- `INFO`
- `WARNING`
- `ERROR`

---

## 6. Cross-Check Notes

Verified against:
- `03_architecture/04_integrations.md` — all integration patterns covered
- `02_database_schema.md` §6.5 — all master tables present

**Additions vs master schema:**
- `integration_jobs.triggered_by` — `SCHEDULER` / `ADMIN` / `SYSTEM` / `EXTERNAL` (master had no trigger source)
- `integration_jobs.request_metadata_json` — PES request context (employee IDs, IP) for API_ACCESS jobs
- `integration_jobs.correlation_id` — links to audit event for cross-module trace
- `integration_health_status.last_job_id` — FK to most recent job for dashboard drill-down
- `integration_health_status.consecutive_failures` — drives DEGRADED → DOWN transition logic (master had no failure counter)
- Health status transition rules (HEALTHY / DEGRADED / DOWN) fully defined — master had no definition

> Note: `11_integrations.md` in `01_features/` should be deleted — it has been replaced by:
> - `03_architecture/04_integrations.md` (architecture reference)
> - `engineering/features/10_integrations/api.md` + `schema.md` (implementation spec)
