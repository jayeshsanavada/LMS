# Audit — API Specification

---

## Common Header

### Base Path
```
/api/v1
```

### Authentication
- JWT Bearer token required on all endpoints
- Token issued by Keycloak via PKCE flow
- Validated at APISIX gateway and again in FastAPI
- `X-Correlation-ID` (UUID v4) required on every request; echoed in response

### Authorization Notation
- `ADMIN` — full ORG_WIDE access to all event types
- `HR` — ORG_WIDE access to compliance-relevant event types only
- `TEAM_ONLY` — manager access scoped to direct reports, restricted event types

### Standard Response Envelope
```json
{
  "success": true,
  "data": {},
  "message": "optional message",
  "errors": []
}
```

### Paginated Response
```json
{
  "success": true,
  "data": {
    "items": [],
    "page": 1,
    "size": 20,
    "total": 1240,
    "has_next": true
  }
}
```

### Export Pattern (Async)
1. `POST /audit/export` → `{ "job_id": "uuid" }`
2. `GET /audit/export/{job_id}` → poll until `status = READY`
3. `GET /audit/export/{job_id}/download` → stream file

### Export Formats
`excel` (`.xlsx`) and `pdf` only.

---

## Group: Audit Log Search

---

### 1. Search Audit Logs

```
GET /api/v1/audit
```

**Purpose:** Returns paginated audit log records filtered by provided criteria. HR and Manager access is scoped to permitted event types only.

**Access:**
- ADMIN: all event types, ORG_WIDE
- HR: compliance-relevant event types only, ORG_WIDE
- Manager: assignment/approval/session events for direct reports only (TEAM_ONLY)

**Query Parameters:**
| Parameter | Type | Notes |
|---|---|---|
| `event_code` | string | Exact or prefix match (e.g. `ASSIGNMENT_*`) |
| `module_name` | string | e.g. `assignment_engine`, `sessions` |
| `actor_user_id` | UUID | Filter by who performed the action |
| `actor_type` | string | `USER` / `SYSTEM` / `INTEGRATION` |
| `entity_type` | string | e.g. `assignment`, `session`, `user` |
| `entity_id` | UUID | Filter events for a specific record |
| `correlation_id` | UUID | Trace all events from one request |
| `source_system` | string | e.g. `ZOHO`, `EMPLOYEE_DB`, `PES` |
| `date_from` | datetime | ISO 8601 |
| `date_to` | datetime | ISO 8601 |
| `page` | integer | Default 1 |
| `size` | integer | Default 20, max 100 |
| `sort_order` | string | `asc` / `desc` — default `desc` by `created_at` |

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "event_code": "ASSIGNMENT_CREATED",
      "module_name": "assignment_engine",
      "action_name": "create_assignment",
      "actor_user_id": "uuid",
      "actor_name": "Jayesh Sanavada",
      "actor_type": "USER",
      "entity_type": "assignment",
      "entity_id": "uuid",
      "source_system": null,
      "correlation_id": "uuid",
      "ip_address": "192.168.1.10",
      "created_at": "2026-04-06T10:00:00Z"
    }
  ]
}
```

**Error Codes:**
- `ACCESS_DENIED` (403) — HR or Manager attempting disallowed event type

---

### 2. Get Audit Record Detail

```
GET /api/v1/audit/{event_id}
```

**Purpose:** Returns full detail of a single audit record including `previous_value_json` and `new_value_json` (with masking applied).

**Access:** Same scope as Search Audit Logs

**Path Parameters:** `event_id` (UUID)

**Response:**
```json
{
  "id": "uuid",
  "event_code": "USER_UPDATED",
  "module_name": "user_management",
  "action_name": "update_user",
  "actor_user_id": "uuid",
  "actor_name": "Admin User",
  "actor_type": "USER",
  "entity_type": "user",
  "entity_id": "uuid",
  "previous_value_json": {
    "designation": "Engineer",
    "email": "j***@company.com"
  },
  "new_value_json": {
    "designation": "Senior Engineer",
    "email": "j***@company.com"
  },
  "source_system": null,
  "correlation_id": "uuid",
  "ip_address": "192.168.1.10",
  "http_method": "PATCH",
  "created_at": "2026-04-06T10:00:00Z"
}
```

**Error Codes:**
- `AUDIT_RECORD_NOT_FOUND` (404)
- `ACCESS_DENIED` (403)

---

### 3. Get Events by Correlation ID

```
GET /api/v1/audit/trace/{correlation_id}
```

**Purpose:** Returns all audit events sharing a correlation ID — shows the full trace of a single operation across modules.

**Access:** ADMIN only

**Path Parameters:** `correlation_id` (UUID)

**Response:** List of audit records ordered by `created_at` asc (chronological trace).

**Error Codes:**
- `NO_EVENTS_FOUND` (404)

---

## Group: Export

---

### 4. Create Audit Export Job

```
POST /api/v1/audit/export
```

**Purpose:** Initiates async export of filtered audit logs as Excel or PDF.

**Access:** ADMIN (any event types), HR (compliance-relevant event types only)

**Request Body:**
```json
{
  "format": "excel",
  "filters": {
    "event_code": "ASSIGNMENT_*",
    "date_from": "2026-01-01T00:00:00Z",
    "date_to": "2026-04-01T00:00:00Z",
    "module_name": "assignment_engine"
  }
}
```

**Response:** `{ "job_id": "uuid" }` (202)

**Error Codes:**
- `INVALID_FORMAT` (422)
- `ACCESS_DENIED` (403) — HR attempting to export disallowed event types

---

### 5. Get Export Job Status

```
GET /api/v1/audit/export/{job_id}
```

**Purpose:** Polls export job status.

**Access:** Job creator or ADMIN

**Response:**
```json
{
  "job_id": "uuid",
  "status": "READY",
  "format": "excel",
  "file_name": "audit_export_2026-04-06.xlsx",
  "expires_at": "2026-04-07T10:00:00Z",
  "created_at": "2026-04-06T10:00:00Z",
  "completed_at": "2026-04-06T10:00:30Z"
}
```

**Status values:** `PENDING` / `PROCESSING` / `READY` / `FAILED`

---

### 6. Download Export File

```
GET /api/v1/audit/export/{job_id}/download
```

**Purpose:** Downloads completed export file.

**Access:** Job creator or ADMIN

**Response:** File stream (Excel / PDF)

**Error Codes:**
- `EXPORT_NOT_READY` (422)
- `EXPORT_EXPIRED` (410) — 24h retention elapsed
- `JOB_NOT_FOUND` (404)

---

## Group: Admin — Write Failure Monitoring

---

### 7. List Audit Write Failures

```
GET /api/v1/audit/admin/write-failures
```

**Purpose:** Returns audit events that failed to write and are in the dead-letter queue.

**Access:** ADMIN only

**Query Parameters:**
| Parameter | Type | Notes |
|---|---|---|
| `status` | string | `PENDING_RETRY` / `PERMANENTLY_FAILED` |
| `date_from` | datetime | |
| `date_to` | datetime | |
| `page` | integer | Default 1 |
| `size` | integer | Default 20 |

**Response:** List of failed write records with event payload, retry count, last error, status.

---

### 8. Retry Audit Write Failure

```
POST /api/v1/audit/admin/write-failures/{failure_id}/retry
```

**Purpose:** Admin manually triggers retry of a dead-letter audit write.

**Access:** ADMIN only

**Response:** `{ "failure_id": "uuid", "status": "PENDING_RETRY" }` (200)

**Error Codes:**
- `FAILURE_NOT_FOUND` (404)
- `ALREADY_RESOLVED` (422)

---

## Additions vs Master API List (§18)

| # | Addition | Reason |
|---|---|---|
| A1 | `GET /audit/trace/{correlation_id}` | Cross-module operation trace — missing from master |
| A2 | `POST /audit/export` + poll + download | Export missing from master (was Future Enhancement; promoted to Phase 1) |
| A3 | `GET /audit/admin/write-failures` + retry | Dead-letter failure monitoring — missing from master |
| A4 | HR and Manager scoped access with event type restrictions | Master had "HR scoped access" with no definition |
| A5 | `ip_address`, `http_method` on detail response | Security event context — missing from master |
| A6 | `actor_type`, `source_system`, `correlation_id` as search filters | Investigation filters — missing from master |
