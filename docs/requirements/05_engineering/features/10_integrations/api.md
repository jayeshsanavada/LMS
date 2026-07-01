# Integrations — API Specification

> This file covers two concerns:
> 1. **Admin-facing integration management APIs** — health monitoring, sync triggers, job logs
> 2. **PES-facing compliance API** — the endpoints PES calls to pull compliance data from LMS

---

## Common Header

### Base Path
```
/api/v1
```

### Authentication
- JWT Bearer token required on all Admin endpoints
- Token issued by Keycloak via PKCE flow
- Validated at APISIX gateway and FastAPI
- `X-Correlation-ID` (UUID v4) required; echoed in response

### PES Authentication
- PES uses Keycloak **Client Credentials** grant (M2M service account)
- PES JWT must contain `aud` claim matching LMS client ID
- Routed via dedicated APISIX route with rate limiting (default 100 req/min)
- Every PES call logged as `PES_API_ACCESSED` audit event

### Standard Response Envelope
```json
{
  "success": true,
  "data": {},
  "message": "optional message",
  "errors": []
}
```

---

## Group: Integration Health & Monitoring (Admin)

---

### 1. Get All Integration Health

```
GET /api/v1/integrations/health
```

**Purpose:** Returns current health status of all integrations. Powers the Admin integration health dashboard.

**Access:** ADMIN only

**Response:**
```json
{
  "integrations": [
    {
      "integration_name": "ZOHO",
      "current_status": "HEALTHY",
      "last_success_at": "2026-04-06T02:00:45Z",
      "last_failure_at": null,
      "last_sync_records_processed": 312,
      "last_sync_records_failed": 0,
      "remarks": null
    },
    {
      "integration_name": "EMPLOYEE_DB",
      "current_status": "DEGRADED",
      "last_success_at": "2026-04-05T02:31:10Z",
      "last_failure_at": "2026-04-06T02:30:55Z",
      "last_sync_records_processed": 0,
      "last_sync_records_failed": 0,
      "remarks": "Connection timeout"
    },
    {
      "integration_name": "TEAMS",
      "current_status": "HEALTHY",
      "last_success_at": "2026-04-06T09:00:00Z",
      "last_failure_at": null,
      "remarks": null
    }
  ]
}
```

---

### 2. Get Integration Detail

```
GET /api/v1/integrations/{integration_name}
```

**Purpose:** Returns detailed status and last job result for a specific integration.

**Access:** ADMIN only

**Path Parameters:** `integration_name` — `zoho` / `employee-db` / `teams` / `onedrive` / `pes`

**Response:**
```json
{
  "integration_name": "ZOHO",
  "current_status": "HEALTHY",
  "last_success_at": "2026-04-06T02:00:45Z",
  "last_failure_at": null,
  "last_job": {
    "id": "uuid",
    "job_type": "SYNC",
    "job_status": "COMPLETED",
    "started_at": "2026-04-06T02:00:00Z",
    "completed_at": "2026-04-06T02:00:45Z",
    "records_processed": 312,
    "records_failed": 0,
    "error_summary": null
  }
}
```

**Error Codes:**
- `INTEGRATION_NOT_FOUND` (404)

---

### 3. Get Integration Job Logs

```
GET /api/v1/integrations/{integration_name}/logs
```

**Purpose:** Returns paginated job execution history for a specific integration.

**Access:** ADMIN only

**Query Parameters:**
| Parameter | Type | Notes |
|---|---|---|
| `job_status` | string | `PENDING` / `RUNNING` / `COMPLETED` / `FAILED` |
| `job_type` | string | `SYNC` / `RETRY` / `HEALTHCHECK` / `API_ACCESS` |
| `from_date` | date | |
| `to_date` | date | |
| `page` | integer | Default 1 |
| `size` | integer | Default 20 |

**Response:** Paginated list of `integration_jobs` with summary per job.

---

### 4. Get Job Log Detail

```
GET /api/v1/integrations/{integration_name}/logs/{job_id}
```

**Purpose:** Returns per-record detail logs for a specific job execution (from `integration_job_logs`).

**Access:** ADMIN only

**Response:**
```json
{
  "job": {
    "id": "uuid",
    "integration_name": "ZOHO",
    "job_status": "FAILED",
    "records_processed": 310,
    "records_failed": 2,
    "error_summary": "2 records failed validation"
  },
  "log_entries": [
    {
      "log_level": "ERROR",
      "message": "Employee EMP-042 missing required field: email",
      "reference_key": "EMP-042",
      "created_at": "2026-04-06T02:00:32Z"
    }
  ]
}
```

---

## Group: Sync Triggers (Admin)

---

### 5. Trigger Zoho HR Sync

```
POST /api/v1/integrations/zoho/sync
```

**Purpose:** Admin manually triggers an immediate Zoho HR data sync (outside scheduled run).

**Access:** ADMIN only

**Business Logic:**
- Creates a new `integration_jobs` record with `job_type = SYNC`
- Background worker picks up and executes
- Returns job_id for polling

**Response:** `{ "job_id": "uuid", "status": "PENDING" }` (202)

**Error Codes:**
- `SYNC_ALREADY_RUNNING` (409) — a sync job for this integration is already in progress

---

### 6. Trigger Employee DB Sync

```
POST /api/v1/integrations/employee-db/sync
```

**Purpose:** Admin manually triggers an immediate Employee DB hierarchy and attribute sync.

**Access:** ADMIN only

**Response:** `{ "job_id": "uuid", "status": "PENDING" }` (202)

**Error Codes:**
- `SYNC_ALREADY_RUNNING` (409)

---

### 7. Retry Failed Integration Job

```
POST /api/v1/integrations/{integration_name}/retry
```

**Purpose:** Admin manually retries the last failed sync job for a specific integration.

**Access:** ADMIN only

**Business Logic:**
- Only applicable when last job status = FAILED
- Creates a new retry job
- Previous failed job record retained

**Response:** `{ "job_id": "uuid", "status": "PENDING" }` (202)

**Error Codes:**
- `NO_FAILED_JOB` (422) — last job is not in FAILED state
- `SYNC_ALREADY_RUNNING` (409)

---

### 8. Get Zoho Field Mapping

```
GET /api/v1/integrations/zoho/field-mapping
```

**Purpose:** Returns the current Zoho → LMS field mapping configuration shown on the Integration Health screen.

**Access:** ADMIN only

**Notes:**
- Mapping is managed by Integrations module APIs
- Configuration is persisted in Admin settings storage (module boundary respected)

**Response (example):**
```json
{
  "employment_phase_mapping": {
    "Probation": "PROBATION",
    "New Joiner": "PROBATION",
    "Active": "CONFIRMED",
    "Intern": "INTERN",
    "Resigned": "EXITED",
    "Terminated": "EXITED"
  },
  "field_mappings": [
    { "zoho_field": "employee_id", "lms_field": "employee_id", "admin_override_allowed": false },
    { "zoho_field": "work_email", "lms_field": "email", "admin_override_allowed": false },
    { "zoho_field": "department", "lms_field": "department", "admin_override_allowed": true }
  ]
}
```

---

### 9. Update Zoho Field Mapping

```
PUT /api/v1/integrations/zoho/field-mapping
```

**Purpose:** Updates Zoho field mapping rules used during sync.

**Access:** ADMIN only

**Business Logic:**
- System-managed mappings (`employee_id`, `email`, `employment_phase`, `joining_date`) cannot be disabled
- Employment phase mapping must include at least one value mapped to `PROBATION`
- Changes apply to future sync runs only

**Response:** `{ "success": true, "message": "Field mapping updated" }`

**Error Codes:**
- `INVALID_FIELD_MAPPING` (422)
- `RESTRICTED_FIELD_MAPPING` (422)

---

## Group: PES Compliance API (External — called by PES)

> These endpoints are called by PES using a Keycloak service account JWT (Client Credentials).
> They are NOT accessible by LMS users or Admin via the standard UI.
> Every call is logged as `PES_API_ACCESSED` in audit logs.

---

### 8. Get Employee Compliance (Single)

```
GET /api/v1/integrations/pes/compliance/{employee_id}
```

**Purpose:** Returns the current compliance status of a single employee across all mandatory training. PES calls this for individual employee evaluation.

**Access:** PES service account (Client Credentials JWT with `aud` = LMS client ID)

**Path Parameters:** `employee_id` — LMS employee ID (`users.employee_id`)

**Response:**
```json
{
  "employee_id": "EMP-042",
  "user_id": "uuid",
  "full_name": "Jayesh Sanavada",
  "evaluated_at": "2026-04-06T08:00:00Z",
  "compliance_records": [
    {
      "training_item_id": "uuid",
      "training_title": "Safety Compliance 2026",
      "training_code": "TRN-001",
      "compliance_state": "COMPLIANT",
      "due_date": "2026-03-31",
      "completion_date": "2026-03-15",
      "is_migrated_basis": false
    },
    {
      "training_item_id": "uuid",
      "training_title": "Data Privacy 2026",
      "training_code": "TRN-004",
      "compliance_state": "NON_COMPLIANT",
      "due_date": "2026-03-31",
      "completion_date": null,
      "is_migrated_basis": false
    }
  ],
  "overall_compliant": false
}
```

**Error Codes:**
- `EMPLOYEE_NOT_FOUND` (404) — `employee_id` not in LMS
- `ACCESS_DENIED` (403) — invalid or missing service account JWT

---

### 9. Get Compliance Bulk (Multiple Employees)

```
POST /api/v1/integrations/pes/compliance/bulk
```

**Purpose:** Returns compliance status for multiple employees in one call. Used by PES for batch evaluation cycles.

**Access:** PES service account only

**Request Body:**
```json
{
  "employee_ids": ["EMP-001", "EMP-002", "EMP-042"]
}
```

**Business Logic:**
- Max 100 employee IDs per request
- Unknown employee IDs included in response with `found: false`
- Each record from `compliance_status` table (owned by Assignment Engine)

**Response:**
```json
{
  "evaluated_at": "2026-04-06T08:00:00Z",
  "results": [
    {
      "employee_id": "EMP-001",
      "found": true,
      "overall_compliant": true,
      "compliance_records": [...]
    },
    {
      "employee_id": "EMP-999",
      "found": false,
      "overall_compliant": null,
      "compliance_records": []
    }
  ]
}
```

**Error Codes:**
- `BATCH_TOO_LARGE` (422) — more than 100 IDs
- `ACCESS_DENIED` (403)

---

## Additions vs Master API List (§20)

| # | Addition | Reason |
|---|---|---|
| I1 | `GET /integrations/{name}/logs/{job_id}` — per-record detail log | Master had only job list; record-level diagnostics needed |
| I2 | `POST /integrations/pes/compliance/bulk` — batch compliance for PES | Master had only single-employee endpoint; PES batch evaluation requires bulk |
| I3 | `job_type = API_ACCESS` in logs | PES API calls tracked as integration jobs — missing from master |
| I4 | `overall_compliant` boolean in PES response | Computed summary field for PES performance evaluation use case |
| I5 | `is_migrated_basis` flag in PES compliance response | PES needs to know if compliance basis is migrated historical data |
| I6 | Rate limiting and `aud` claim validation documented | Enterprise security requirement for M2M API — missing from master |
| I7 | `GET/PUT /integrations/zoho/field-mapping` | Supports Admin field-mapping UI contract for Zoho sync |
