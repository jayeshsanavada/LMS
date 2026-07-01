# Assignment Engine — API Specification

---

## 1. Common Conventions

### Base Path
```
/api/v1
```

### Authentication
- JWT Bearer token required: `Authorization: Bearer <token>`
- Roles from `realm_access.roles`
- `X-Correlation-ID` header required (middleware generates if absent)

### Standard Response Envelope
```json
{ "success": true, "data": {}, "message": null, "errors": [] }
```

### Paginated List Response
```json
{
  "success": true,
  "data": { "items": [], "page": 1, "size": 20, "total": 0, "has_next": false }
}
```

### Authorization Notation
- `ADMIN` / `HR` / `EMPLOYEE` — from `realm_access.roles`
- Manager = `EMPLOYEE` with direct reports in `user_hierarchy` (NOT a role)
- `SELF_ONLY` / `TEAM_ONLY` (direct reports, depth=1) / `ORG_WIDE`

### Async Export Pattern
1. `POST /export` → `job_id`
2. `GET /export/{job_id}` → poll status
3. `GET /export/{job_id}/download` → download when COMPLETED

---

## 2. Assignment Endpoints

---

### 2.1 List My Assignments

**Endpoint**
```
GET /api/v1/assignments/me
```

**Purpose**
Returns current user's own assignments. Used by Employee Dashboard and My Training screen.

**Access**
- Any authenticated user — SELF_ONLY

**Query Parameters**

| Parameter | Type | Description |
|---|---|---|
| `page` | integer | Default: 1 |
| `size` | integer | Default: 20, max: 100 |
| `status` | string | `ASSIGNED` / `IN_PROGRESS` / `COMPLETED` / `OVERDUE` / `CANCELLED` |
| `is_mandatory` | boolean | Filter mandatory assignments |
| `training_type` | string | `COURSE` / `LEARNING_PATH` / `CURRICULUM` |
| `overdue` | boolean | True = overdue only |
| `due_date_before` | date | Filter by due date |
| `sort_by` | string | `due_date` / `assigned_at` / `title` |
| `sort_order` | string | `asc` / `desc` |

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "assignment_id": "uuid",
        "training_id": "uuid",
        "training_title": "Workplace Safety",
        "training_type": "COURSE",
        "assignment_source": "MANDATORY",
        "assignment_status": "IN_PROGRESS",
        "is_mandatory": true,
        "due_date": "2026-06-30T00:00:00Z",
        "assigned_at": "2026-04-01T00:00:00Z",
        "progress_percent": 40,
        "is_overdue": false,
        "days_overdue": null
      }
    ],
    "page": 1, "size": 20, "total": 8, "has_next": false
  }
}
```

---

### 2.2 Get Assignment Detail

**Endpoint**
```
GET /api/v1/assignments/{assignment_id}
```

**Purpose**
Returns detailed assignment information including resource progress.

**Access**
- SELF_ONLY
- TEAM_ONLY (manager viewing direct report's assignment)
- `ADMIN` / `HR` — ORG_WIDE

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "assignment_id": "uuid",
    "user_id": "uuid",
    "training_id": "uuid",
    "training_version_id": "uuid",
    "training_title": "Workplace Safety",
    "assignment_source": "MANDATORY",
    "assignment_status": "IN_PROGRESS",
    "assigned_by_user_id": "uuid",
    "due_date": "2026-06-30T00:00:00Z",
    "assigned_at": "2026-04-01T00:00:00Z",
    "completed_at": null,
    "is_overdue": false,
    "note": null,
    "resource_progress": [
      {
        "resource_id": "uuid",
        "resource_title": "Safety Video",
        "progress_status": "COMPLETED",
        "progress_percent": 100
      }
    ]
  }
}
```

**Error Responses**

| HTTP | Error Code | Condition |
|---|---|---|
| 404 | `ASSIGNMENT_NOT_FOUND` | Assignment does not exist |
| 403 | `ACCESS_DENIED` | User not owner, not in hierarchy, not Admin/HR |

---

### 2.3 Create Assignment

**Endpoint**
```
POST /api/v1/assignments
```

**Purpose**
Creates a manual assignment for one or more users. Admin assigns ORG_WIDE; Manager assigns within direct reports only.

**Access**
- `ADMIN` — ORG_WIDE
- Authenticated user — TEAM_ONLY (direct reports only)

**Request Body**
```json
{
  "training_id": "uuid",
  "user_ids": ["uuid-1", "uuid-2"],
  "due_date": "2026-06-30",
  "note": "Complete before end of Q2"
}
```

**Validation Rules**
- `training_id` must reference a PUBLISHED training
- `user_ids`: Manager can only include their direct reports; Admin can include any user
- Duplicate check: returns partial success if some users have live duplicates
- Maximum 100 users per request

**Response: 201 Created**
```json
{
  "success": true,
  "data": {
    "created_count": 2,
    "skipped_count": 0,
    "skipped_users": [],
    "assignments": [
      { "assignment_id": "uuid", "user_id": "uuid-1", "status": "ASSIGNED" },
      { "assignment_id": "uuid", "user_id": "uuid-2", "status": "ASSIGNED" }
    ]
  },
  "message": "2 assignments created.",
  "errors": []
}
```

**Error Responses**

| HTTP | Error Code | Condition |
|---|---|---|
| 400 | `TRAINING_NOT_PUBLISHED` | Training is not in PUBLISHED state |
| 403 | `ACCESS_DENIED` | Manager trying to assign outside hierarchy |
| 409 | `DUPLICATE_ASSIGNMENT` | All users already have live assignments (full duplicate) |

**Side Effects**
- Audit event `ASSIGNMENT_CREATED` emitted per user
- Notification queued per user

---

### 2.4 List Team Assignments

**Endpoint**
```
GET /api/v1/assignments/team
```

**Purpose**
Returns assignments for the authenticated user's direct reports. Used by Manager Dashboard and Team Training screen.

**Access**
- Authenticated user — TEAM_ONLY

**Query Parameters**

| Parameter | Type | Description |
|---|---|---|
| `user_id` | UUID | Filter for specific team member |
| `status` | string | Assignment status filter |
| `overdue` | boolean | Overdue only |
| `training_id` | UUID | Filter by training |
| `page` | integer | Default: 1 |
| `size` | integer | Default: 20 |

**Response: 200 OK**
Same structure as List My Assignments but includes `user_name` and `user_id` per item.

---

### 2.5 Update Assignment Due Date

**Endpoint**
```
PATCH /api/v1/assignments/{assignment_id}/due-date
```

**Purpose**
Updates the due date of an active assignment.

**Access**
- `ADMIN` — any assignment
- Authenticated user — TEAM_ONLY (assignments they created for direct reports)

**Request Body**
```json
{
  "due_date": "2026-08-31",
  "reason": "Extended deadline for Q3"
}
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "assignment_id": "uuid",
    "old_due_date": "2026-06-30",
    "new_due_date": "2026-08-31"
  }
}
```

**Side Effects**
- Audit event `ASSIGNMENT_DUE_DATE_UPDATED` emitted

---

### 2.6 Cancel Assignment

**Endpoint**
```
POST /api/v1/assignments/{assignment_id}/cancel
```

**Purpose**
Cancels an active assignment. Cannot cancel COMPLETED assignments. Retained in history.

**Access**
- `ADMIN` — any non-completed assignment
- Authenticated user — TEAM_ONLY (assignments they created for direct reports)

**Request Body**
```json
{
  "reason": "Training no longer relevant for this role"
}
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "assignment_id": "uuid",
    "assignment_status": "CANCELLED",
    "cancelled_at": "2026-04-06T10:00:00Z"
  }
}
```

**Error Responses**

| HTTP | Error Code | Condition |
|---|---|---|
| 409 | `CANNOT_CANCEL_COMPLETED` | Assignment is already COMPLETED |
| 403 | `ACCESS_DENIED` | Not owner or Admin |

**Side Effects**
- Audit event `ASSIGNMENT_CANCELLED` emitted
- Employee notified

---

### 2.7 Mark Assignment Complete (Admin Override)

**Endpoint**
```
POST /api/v1/assignments/{assignment_id}/complete
```

**Purpose**
Admin marks an assignment as complete, bypassing normal resource-based completion.

**Access**
- `ADMIN` only

**Request Body**
```json
{
  "reason": "Employee completed offline equivalent"
}
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "assignment_id": "uuid",
    "assignment_status": "COMPLETED",
    "completed_at": "2026-04-06T10:00:00Z",
    "completion_source": "ADMIN"
  }
}
```

**Side Effects**
- `training_completions` record created (source = ADMIN)
- Certificate generation triggered
- Compliance evaluation triggered
- Audit event `ASSIGNMENT_COMPLETED` emitted

---

### 2.8 Export Assignments

**Endpoint**
```
POST /api/v1/assignments/export
```

**Access**
- `ADMIN` / `HR` — ORG_WIDE

**Request Body**
```json
{
  "format": "excel",
  "filters": {
    "status": "OVERDUE",
    "department": "Engineering",
    "training_id": "uuid",
    "due_date_before": "2026-06-30"
  }
}
```

**Response: 202 Accepted**
```json
{
  "success": true,
  "data": { "job_id": "uuid", "status": "PENDING" }
}
```

---

### 2.9 Download Assignment Export

**Endpoint**
```
GET /api/v1/assignments/export/{job_id}/download
```

**Access**
- Job creator or `ADMIN`

**Response: 200 OK**
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

---

## 3. Approval Endpoints

---

### 3.1 Self-Enroll (No Approval Required)

**Endpoint**
```
POST /api/v1/assignments/self-enroll
```

**Purpose**
Creates an assignment directly for training with `requires_approval = false`. No request or manager action needed.

**Access**
- Any authenticated user — SELF_ONLY

**Request Body**
```json
{
  "training_id": "uuid"
}
```

**Validation Rules**
- Training must be PUBLISHED and `requires_approval = false`
- Duplicate check applied

**Response: 201 Created**
```json
{
  "success": true,
  "data": {
    "assignment_id": "uuid",
    "assignment_source": "SELF_ENROLLED",
    "assignment_status": "ASSIGNED"
  },
  "message": "Enrolled successfully."
}
```

**Error Responses**

| HTTP | Error Code | Condition |
|---|---|---|
| 409 | `DUPLICATE_ASSIGNMENT` | Live assignment already exists |
| 400 | `APPROVAL_REQUIRED` | Training requires approval — use POST /approvals/requests |

---

### 3.2 Create Training Request (Approval Required)

**Endpoint**
```
POST /api/v1/approvals/requests
```

**Purpose**
Submits an employee request for training that requires manager approval.

**Access**
- Any authenticated user — SELF_ONLY

**Request Body**
```json
{
  "training_id": "uuid",
  "request_reason": "Required for upcoming project XYZ"
}
```

**Response: 201 Created**
```json
{
  "success": true,
  "data": {
    "request_id": "uuid",
    "request_status": "PENDING",
    "training_id": "uuid",
    "approver_user_id": "uuid",
    "expires_at": "2026-05-06T00:00:00Z"
  },
  "message": "Request submitted. Awaiting manager approval."
}
```

**Error Responses**

| HTTP | Error Code | Condition |
|---|---|---|
| 400 | `APPROVAL_NOT_REQUIRED` | Training does not require approval — use self-enroll |
| 409 | `PENDING_REQUEST_EXISTS` | An open request for same training already exists |

**Side Effects**
- Audit event `APPROVAL_REQUEST_SUBMITTED` emitted
- Manager notified

---

### 3.3 List My Training Requests

**Endpoint**
```
GET /api/v1/approvals/requests/me
```

**Access**
- Any authenticated user — SELF_ONLY

**Query Parameters**

| Parameter | Type | Description |
|---|---|---|
| `status` | string | `PENDING` / `APPROVED` / `REJECTED` / `EXPIRED` |

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "request_id": "uuid",
        "training_id": "uuid",
        "training_title": "Leadership Fundamentals",
        "request_status": "PENDING",
        "request_reason": "Required for project",
        "submitted_at": "2026-04-01T00:00:00Z",
        "expires_at": "2026-05-01T00:00:00Z"
      }
    ]
  }
}
```

---

### 3.4 List Pending Approvals

**Endpoint**
```
GET /api/v1/approvals/pending
```

**Purpose**
Returns pending approval requests for the authenticated user's direct reports (manager view) or all pending requests (Admin view).

**Access**
- Authenticated user — TEAM_ONLY (requests from direct reports)
- `ADMIN` — ORG_WIDE

**Query Parameters**

| Parameter | Type | Description |
|---|---|---|
| `user_id` | UUID | Filter by requesting user |
| `training_id` | UUID | Filter by training |
| `page` | integer | Default: 1 |

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "request_id": "uuid",
        "requester_user_id": "uuid",
        "requester_name": "Alice Brown",
        "training_id": "uuid",
        "training_title": "Advanced Leadership",
        "request_reason": "Career development",
        "request_status": "PENDING",
        "submitted_at": "2026-04-01T00:00:00Z",
        "expires_at": "2026-05-01T00:00:00Z"
      }
    ]
  }
}
```

---

### 3.5 Approve Request

**Endpoint**
```
POST /api/v1/approvals/{request_id}/approve
```

**Purpose**
Approves a training request. Creates an assignment for the requester.

**Access**
- Authenticated user — TEAM_ONLY (requester must be direct report)
- `ADMIN` — ORG_WIDE

**Request Body**
```json
{
  "due_date": "2026-07-31",
  "note": "Approved for Q3 development plan"
}
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "request_id": "uuid",
    "request_status": "APPROVED",
    "assignment_id": "uuid"
  },
  "message": "Request approved. Assignment created."
}
```

**Side Effects**
- Assignment created (source = SELF_APPROVED)
- Audit event `APPROVAL_REQUEST_APPROVED` emitted
- Employee notified

---

### 3.6 Reject Request

**Endpoint**
```
POST /api/v1/approvals/{request_id}/reject
```

**Access**
- Authenticated user — TEAM_ONLY
- `ADMIN` — ORG_WIDE

**Request Body**
```json
{
  "reason": "Not aligned with current role requirements"
}
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "request_id": "uuid",
    "request_status": "REJECTED"
  }
}
```

**Side Effects**
- Audit event `APPROVAL_REQUEST_REJECTED` emitted
- Employee notified with reason

---

## 4. Mandatory Assignment Rules Endpoints

---

### 4.1 List Assignment Rules

**Endpoint**
```
GET /api/v1/assignments/rules
```

**Access**
- `ADMIN` only

**Query Parameters**

| Parameter | Type | Notes |
|---|---|---|
| `rule_scope` | string | Filter: `GLOBAL` / `DEPARTMENT` / `DESIGNATION` / `CAPABILITY` / `PROJECT` / `EMPLOYMENT_PHASE` |
| `is_probation_gate` | boolean | `true` = only probation gate rules |
| `is_active` | boolean | Default `true` |

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "rule_id": "uuid",
        "training_id": "uuid",
        "training_title": "Workplace Safety",
        "rule_scope": "DESIGNATION",
        "scope_value": "Engineer",
        "designation_filter": null,
        "capability_filter": null,
        "is_probation_gate": false,
        "due_date_days_from_assignment": 30,
        "priority_order": 1,
        "is_active": true
      }
    ]
  }
}
```

---

### 4.2 Create Assignment Rule

**Endpoint**
```
POST /api/v1/assignments/rules
```

**Access**
- `ADMIN` only

**Request Body**
```json
{
  "training_id": "uuid",
  "rule_scope": "DESIGNATION",
  "scope_value": "Engineer",
  "designation_filter": null,
  "capability_filter": null,
  "is_probation_gate": false,
  "due_date_days_from_assignment": 30,
  "priority_order": 1
}
```

**Notes:**
- `scope_value` is null for `GLOBAL` and `EMPLOYMENT_PHASE` scopes
- `designation_filter` and `capability_filter` are only evaluated when `rule_scope = EMPLOYMENT_PHASE`
- `is_probation_gate = true` requires `rule_scope = EMPLOYMENT_PHASE`
- For probation rules: `due_date_days_from_assignment` defaults to 90 if omitted

**Response: 201 Created**

---

### 4.3 Update Assignment Rule

**Endpoint**
```
PUT /api/v1/assignments/rules/{rule_id}
```

**Access**
- `ADMIN` only

---

### 4.4 Deactivate Assignment Rule

**Endpoint**
```
POST /api/v1/assignments/rules/{rule_id}/deactivate
```

**Access**
- `ADMIN` only

**Note**
Deactivating a rule does not cancel existing assignments created by it.

---

## 5. Audit Event Codes Reference

| Event Code | Trigger |
|---|---|
| `ASSIGNMENT_CREATED` | POST /assignments or auto mandatory |
| `ASSIGNMENT_CANCELLED` | POST /assignments/{id}/cancel |
| `ASSIGNMENT_COMPLETED` | Resource completion or admin override |
| `ASSIGNMENT_OVERDUE` | Background job — due date passed |
| `ASSIGNMENT_DUE_DATE_UPDATED` | PATCH /assignments/{id}/due-date |
| `ASSIGNMENT_RECERTIFICATION_CREATED` | Background job — completion expired |
| `APPROVAL_REQUEST_SUBMITTED` | POST /approvals/requests |
| `APPROVAL_REQUEST_APPROVED` | POST /approvals/{id}/approve |
| `APPROVAL_REQUEST_REJECTED` | POST /approvals/{id}/reject |
| `APPROVAL_REQUEST_EXPIRED` | Background job — request expiry |

---

## 6. Compliance Endpoint (PES Pull API)

---

### 6.1 Get User Compliance Status

**Endpoint**
```
GET /api/v1/compliance/users/{user_id}
```

**Purpose**
Returns the compliance state per training assignment for a specific user. Used by PES (pull model — PES calls this endpoint; LMS does not push). Also used by internal dashboard widgets and compliance reports.

**Access**
- `ADMIN` / `HR` — ORG_WIDE
- Authenticated user — SELF_ONLY (employees can view their own compliance)
- TEAM_ONLY — manager can view direct reports

**Query Parameters**

| Parameter | Type | Description |
|---|---|---|
| `page` | integer | Default: 1 |
| `size` | integer | Default: 20, max: 100 |
| `compliance_state` | string | `PENDING` / `COMPLIANT` / `NON_COMPLIANT` |
| `is_mandatory` | boolean | Filter mandatory assignments only |

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "items": [
      {
        "compliance_id": "uuid",
        "assignment_id": "uuid",
        "training_id": "uuid",
        "training_title": "Workplace Safety",
        "compliance_state": "COMPLIANT",
        "due_date_snapshot": "2026-06-30T00:00:00Z",
        "completion_date_snapshot": "2026-05-01T00:00:00Z",
        "evaluated_at": "2026-05-01T10:00:00Z"
      }
    ],
    "page": 1,
    "size": 20,
    "total": 5,
    "has_next": false
  }
}
```

**Error Responses**

| HTTP | Error Code | Condition |
|---|---|---|
| 404 | `USER_NOT_FOUND` | User ID does not exist |
| 403 | `ACCESS_DENIED` | Caller does not have visibility of this user |

---

## 7. Cross-Check Notes

Verified against:
- `04_assignment_engine.md` — all functional requirements covered including all 12 enterprise additions
- `01_api_list.md` §11, §12 — all endpoints present

**Additions vs master API list (derived from spec + enterprise review):**
- `POST /api/v1/assignments/self-enroll` — direct self-enrollment without approval (AE8)
- `POST /api/v1/assignments/{id}/cancel` — assignment cancellation (AE4)
- `GET /api/v1/assignments/rules` + CRUD — mandatory rule management (AE1); updated to include `is_probation_gate` filter and `designation_filter`/`capability_filter` in rule body (probation feature)
- `POST /api/v1/assignments/export` + download — assignment export (AE11)
- `expires_at` in approval request response (AE5)
- `days_overdue` in assignment list response (AE9)
