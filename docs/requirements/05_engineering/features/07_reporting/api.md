# Reporting — API Specification

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
- `ADMIN` / `HR` / `EMPLOYEE` — global roles from `realm_access.roles` in JWT
- `SELF_ONLY` — scoped to authenticated user's own data
- `TEAM_ONLY` — scoped to authenticated user's direct reports (hierarchy depth = 1)
- `ORG_WIDE` — all users in the organization

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
    "total": 120,
    "has_next": true
  }
}
```

### Export Pattern (Async)
1. `POST /reports/{type}/export` → `{ "job_id": "uuid" }`
2. `GET /reports/export/{job_id}` → poll until `status = READY`
3. `GET /reports/export/{job_id}/download` → stream file (Excel / PDF only)

### Export Formats
`excel` (`.xlsx`) and `pdf` only.

---

## Group: Dashboards

---

### 1. Employee Dashboard

```
GET /api/v1/dashboard/me
```

**Purpose:** Returns personal learning summary for the authenticated employee.

**Access:** Any authenticated user (SELF_ONLY)

**Response:**
```json
{
  "assignments_in_progress": 3,
  "assignments_overdue": 1,
  "compliance_status": "NON_COMPLIANT",
  "upcoming_sessions": [
    { "session_id": "uuid", "title": "Safety Briefing", "start_time": "2026-05-10T10:00:00Z" }
  ],
  "recent_completions": [
    { "training_title": "...", "completed_at": "2026-04-01T..." }
  ],
  "certificates_expiring_soon": 1
}
```

---

### 2. Manager (Team) Dashboard

```
GET /api/v1/dashboard/team
```

**Purpose:** Returns team-level learning and compliance summary scoped to direct reports.

**Access:** Any authenticated user (TEAM_ONLY — hierarchy depth = 1)

**Response:**
```json
{
  "team_size": 8,
  "completion_rate_percent": 62.5,
  "overdue_count": 2,
  "non_compliant_count": 1,
  "pending_approvals": 3,
  "upcoming_team_sessions": [...]
}
```

---

### 3. HR Dashboard

```
GET /api/v1/dashboard/hr
```

**Purpose:** Returns org-wide compliance and mandatory training summary for HR.

**Access:** HR (ORG_WIDE)

**Response:**
```json
{
  "total_active_users": 312,
  "compliant_count": 270,
  "non_compliant_count": 28,
  "pending_count": 14,
  "mandatory_completion_rate_percent": 86.5,
  "overdue_mandatory_count": 28
}
```

---

### 4. Admin Dashboard

```
GET /api/v1/dashboard/admin
```

**Purpose:** Returns system-wide operational metrics.

**Access:** ADMIN (ORG_WIDE)

**Response:**
```json
{
  "total_active_users": 312,
  "overall_completion_rate_percent": 71.2,
  "overdue_assignments": 45,
  "non_compliant_users": 28,
  "upcoming_sessions_7d": 4,
  "pending_approval_requests": 12,
  "recent_completions_7d": 38,
  "export_jobs_pending": 2
}
```

---

## Group: Reports

---

### 5. Assignment Status Report

```
GET /api/v1/reports/assignments
```

**Purpose:** Returns all assignments with current status, filterable by user/team/org scope.

**Access:** ADMIN (ORG_WIDE), HR (ORG_WIDE), Manager (TEAM_ONLY), Employee (SELF_ONLY)

**Query Parameters:**
| Parameter | Type | Notes |
|---|---|---|
| `user_id` | UUID | Admin/HR only |
| `department` | string | |
| `designation` | string | |
| `capability` | string | |
| `project` | string | |
| `training_item_id` | UUID | |
| `assignment_status` | string | `ASSIGNED` / `IN_PROGRESS` / `COMPLETED` / `OVERDUE` / `CANCELLED` |
| `assignment_source` | string | `MANDATORY` / `MANAGER` / `ADMIN` / `SELF_ENROLLED` / `SELF_APPROVED` / `RECERTIFICATION` |
| `is_mandatory` | boolean | |
| `due_date_from` | date | |
| `due_date_to` | date | |
| `page` | integer | Default 1 |
| `size` | integer | Default 20, max 100 |

**Response:** Paginated list with columns: employee name, training title, assignment source, status, due date, assigned by, assigned at, completed at.

---

### 6. Compliance Status Report

```
GET /api/v1/reports/compliance
```

**Purpose:** Shows mandatory training compliance state per user. Reads from `compliance_status` table.

**Access:** ADMIN (ORG_WIDE), HR (ORG_WIDE), Manager (TEAM_ONLY)

**Query Parameters:**
| Parameter | Type | Notes |
|---|---|---|
| `compliance_state` | string | `PENDING` / `COMPLIANT` / `NON_COMPLIANT` |
| `department` | string | |
| `designation` | string | |
| `capability` | string | |
| `project` | string | |
| `training_item_id` | UUID | |
| `include_inactive_users` | boolean | Default false |
| `page` | integer | Default 1 |
| `size` | integer | Default 20, max 100 |

**Response:** Paginated list with columns: employee name, department, designation, training title, compliance state, due date, completion date, days overdue (if applicable), is_migrated_basis flag.

---

### 7. Training Completion Report

```
GET /api/v1/reports/completions
```

**Purpose:** Shows completion rates per training item.

**Access:** ADMIN (ORG_WIDE), HR (ORG_WIDE), Manager (TEAM_ONLY)

**Query Parameters:**
| Parameter | Type | Notes |
|---|---|---|
| `training_item_id` | UUID | |
| `training_type` | string | `COURSE` / `LEARNING_PATH` / `CURRICULUM` |
| `department` | string | |
| `is_mandatory` | boolean | |
| `completed_from` | date | |
| `completed_to` | date | |
| `page` | integer | Default 1 |
| `size` | integer | Default 20, max 100 |

**Response:** Paginated list with columns: training title, type, total assigned, completed, in progress, overdue, completion rate (%).

---

### 8. Overdue Training Report

```
GET /api/v1/reports/overdue
```

**Purpose:** Lists all overdue assignments with escalation status.

**Access:** ADMIN (ORG_WIDE), HR (ORG_WIDE), Manager (TEAM_ONLY)

**Query Parameters:**
| Parameter | Type | Notes |
|---|---|---|
| `department` | string | |
| `designation` | string | |
| `training_item_id` | UUID | |
| `days_overdue_min` | integer | e.g. 7 — filter by minimum days overdue |
| `escalation_level` | integer | 0 / 1 / 2 / 3 |
| `page` | integer | Default 1 |
| `size` | integer | Default 20, max 100 |

**Response:** Paginated list with columns: employee name, training title, due date, days overdue, escalation level, manager name.

---

### 9. Session Attendance Report

```
GET /api/v1/reports/sessions/attendance
```

**Purpose:** Shows attendance records across sessions with online/offline breakdown.

**Access:** ADMIN (ORG_WIDE), HR (ORG_WIDE), Manager (TEAM_ONLY)

**Query Parameters:**
| Parameter | Type | Notes |
|---|---|---|
| `session_id` | UUID | |
| `training_item_id` | UUID | |
| `facilitator_id` | UUID | |
| `attendance_status` | string | `ATTENDED` / `NOT_ATTENDED` |
| `attendance_mode` | string | `ONLINE` / `OFFLINE` |
| `start_date` | date | |
| `end_date` | date | |
| `page` | integer | Default 1 |
| `size` | integer | Default 20, max 100 |

**Response:** Paginated list with columns: session code, session title, training title, date, facilitator, participant name, attendance mode, attendance status, attendance source.

---

### 10. Certificate Report

```
GET /api/v1/reports/certificates
```

**Purpose:** Shows issued certificates. Certificates do not expire — all certificates are permanent records.

**Access:** ADMIN (ORG_WIDE), HR (ORG_WIDE), Manager (TEAM_ONLY), Employee (SELF_ONLY)

**Query Parameters:**
| Parameter | Type | Notes |
|---|---|---|
| `user_id` | UUID | Admin/HR only |
| `department` | string | |
| `training_item_id` | UUID | |
| `certificate_status` | string | `APPROVED` / `PENDING_APPROVAL` / `REJECTED` |
| `issued_from` | date | |
| `issued_to` | date | |
| `page` | integer | Default 1 |
| `size` | integer | Default 20, max 100 |

**Response:** Paginated list with columns: employee name, training title, certificate number, issued at, certificate status.

---

### 11. My Learning History (Employee)

```
GET /api/v1/reports/me/learning-history
```

**Purpose:** Returns the authenticated employee's complete personal learning record — in progress, completed, overdue, and certificates.

**Access:** Any authenticated user (SELF_ONLY)

**Response:**
```json
{
  "in_progress": [
    { "training_title": "...", "due_date": "2026-06-01", "progress_percent": 40 }
  ],
  "completed": [
    { "training_title": "...", "completed_at": "2026-03-15", "certificate_id": "uuid" }
  ],
  "overdue": [
    { "training_title": "...", "due_date": "2026-03-01", "days_overdue": 36 }
  ],
  "certificates": [
    { "training_title": "...", "certificate_no": "CERT-2026-001", "issued_at": "...", "expires_at": "..." }
  ]
}
```

---

### 12. Approval Request Report

```
GET /api/v1/reports/approvals
```

**Purpose:** Shows approval request lifecycle for Admin oversight and Manager's own queue history.

**Access:** ADMIN (ORG_WIDE), Manager (TEAM_ONLY — requests they approve)

**Query Parameters:**
| Parameter | Type | Notes |
|---|---|---|
| `request_status` | string | `PENDING` / `APPROVED` / `REJECTED` / `EXPIRED` |
| `training_item_id` | UUID | |
| `approver_user_id` | UUID | Admin only |
| `from_date` | date | |
| `to_date` | date | |
| `page` | integer | Default 1 |
| `size` | integer | Default 20, max 100 |

**Response:** Paginated list with columns: employee name, training title, request date, status, approver name, decision date, rejection reason.

---

## Group: Export

---

### 13. Create Report Export Job

```
POST /api/v1/reports/export
```

**Purpose:** Initiates async export of any report type. Returns job_id for polling.

**Access:** Same access as the corresponding report endpoint (role + scope enforced)

**Request Body:**
```json
{
  "report_type": "compliance",
  "format": "excel",
  "filters": {
    "compliance_state": "NON_COMPLIANT",
    "department": "Engineering"
  }
}
```

**Supported `report_type` values:** `assignments`, `compliance`, `completions`, `overdue`, `sessions_attendance`, `certificates`, `learning_history`, `approvals`

**Supported `format` values:** `excel`, `pdf`

**Response:** `{ "job_id": "uuid" }` (202)

**Error Codes:**
- `INVALID_REPORT_TYPE` (422)
- `INVALID_FORMAT` (422)
- `ACCESS_DENIED` (403) — if user scope doesn't permit the requested filters

---

### 14. Get Export Job Status

```
GET /api/v1/reports/export/{job_id}
```

**Purpose:** Poll export job status.

**Access:** Job creator or ADMIN

**Response:**
```json
{
  "job_id": "uuid",
  "report_type": "compliance",
  "format": "excel",
  "status": "READY",
  "file_name": "compliance_report_2026-04-06.xlsx",
  "expires_at": "2026-04-07T10:00:00Z",
  "created_at": "2026-04-06T10:00:00Z",
  "completed_at": "2026-04-06T10:00:45Z"
}
```

**Status values:** `PENDING` / `PROCESSING` / `READY` / `FAILED`

---

### 15. Download Export File

```
GET /api/v1/reports/export/{job_id}/download
```

**Purpose:** Downloads the completed export file.

**Access:** Job creator or ADMIN

**Response:** File stream (Excel `.xlsx` or PDF)

**Error Codes:**
- `EXPORT_NOT_READY` (422) — job not yet READY
- `EXPORT_EXPIRED` (410) — file retention period (24h) elapsed
- `JOB_NOT_FOUND` (404)

---

## Additions vs Master API List (§7, §15)

| # | Addition | Reason |
|---|---|---|
| R1 | Individual report endpoints (`GET /reports/assignments`, `/compliance`, `/completions`, `/overdue`, `/sessions/attendance`, `/certificates`, `/me/learning-history`, `/approvals`) | Master had one generic `GET /reports/summary` — insufficient for 8 distinct report types |
| R2 | Compliance report filters: `compliance_state`, `department`, `designation`, `capability`, `project`, `include_inactive_users` | Compliance module absorbed; these filters owned here |
| R3 | `GET /reports/me/learning-history` | Employee personal learning history — missing from master |
| R4 | `GET /reports/sessions/attendance` | Session attendance report — missing from master (C1 from Sessions) |
| R5 | `GET /reports/certificates` with `expiry_status` filter | Certificate report missing from master |
| R6 | `GET /reports/approvals` | Approval report missing from master |
| R7 | `GET /dashboard/hr` | HR dashboard missing from master (had only employee, team, admin) |
| R8 | `expires_at` on export job response | 24h retention enforced — file expires |
| R9 | Export format restricted to `excel` / `pdf` (no CSV) | Aligned with product decision |
