# Probation Management — API Specification

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
- `SELF_ONLY` / `ORG_WIDE`

---

## 2. Probation Endpoints

---

### 2.1 List All Probationers

**Endpoint**
```
GET /api/v1/probation
```

**Purpose**
Returns all employees currently in probation (or a given status). Used by HR Probation Dashboard.

**Access**
- `HR`, `ADMIN` — ORG_WIDE

**Query Parameters**

| Parameter | Type | Required | Notes |
|---|---|---|---|
| `status` | string | No | Filter: `PROBATION` / `CONFIRMED` / `EXTENDED` / `TERMINATED`; default `PROBATION` |
| `department` | string | No | Filter by department |
| `designation` | string | No | Filter by designation |
| `overdue_only` | boolean | No | `true` = only employees past `probation_end_date` |
| `page` | int | No | Default 1 |
| `size` | int | No | Default 20 |

**Response**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "probation_id": "uuid",
        "user_id": "uuid",
        "employee_id": "EMP-001",
        "full_name": "Rahul Sharma",
        "designation": "Software Engineer",
        "capability": "Java Backend",
        "department": "Engineering",
        "probation_start_date": "2026-01-15",
        "probation_end_date": "2026-04-15",
        "extended_until": null,
        "probation_status": "PROBATION",
        "gate_trainings_total": 3,
        "gate_trainings_compliant": 1,
        "is_overdue": false,
        "readiness_flag": "AT_RISK"
      }
    ],
    "page": 1, "size": 20, "total": 12, "has_next": false
  }
}
```

**`readiness_flag` values:**
- `ON_TRACK` — all gates not due yet, at least one compliant
- `AT_RISK` — deadline within 14 days and gates incomplete
- `OVERDUE` — past `probation_end_date` (or `extended_until`) with incomplete gates

---

### 2.2 Get Probation Detail for One Employee

**Endpoint**
```
GET /api/v1/probation/{user_id}
```

**Purpose**
Returns full probation status + training checklist for a single employee. Used by HR per-employee probation detail view.

**Access**
- `HR`, `ADMIN` — ORG_WIDE

**Path Parameters**

| Parameter | Type | Notes |
|---|---|---|
| `user_id` | UUID | Target employee |

**Response**
```json
{
  "success": true,
  "data": {
    "probation_id": "uuid",
    "user_id": "uuid",
    "employee_id": "EMP-001",
    "full_name": "Rahul Sharma",
    "designation": "Software Engineer",
    "capability": "Java Backend",
    "department": "Engineering",
    "joining_date": "2026-01-15",
    "probation_start_date": "2026-01-15",
    "probation_end_date": "2026-04-15",
    "extended_until": null,
    "extension_reason": null,
    "probation_status": "PROBATION",
    "confirmed_at": null,
    "confirmed_by_name": null,
    "gate_trainings": [
      {
        "assignment_id": "uuid",
        "training_item_id": "uuid",
        "training_title": "Safety Compliance 2026",
        "due_date": "2026-04-15",
        "assignment_status": "COMPLETED",
        "compliance_state": "COMPLIANT",
        "completed_at": "2026-03-10T10:30:00Z"
      },
      {
        "assignment_id": "uuid",
        "training_item_id": "uuid",
        "training_title": "Code of Conduct",
        "due_date": "2026-04-15",
        "assignment_status": "IN_PROGRESS",
        "compliance_state": "PENDING",
        "completed_at": null
      }
    ],
    "can_confirm": false,
    "confirmation_blocked_reason": "1 gate training(s) not yet completed"
  }
}
```

**`can_confirm`** = true only when all `gate_trainings[].compliance_state = COMPLIANT`

---

### 2.3 Confirm Probation Completion

**Endpoint**
```
POST /api/v1/probation/{user_id}/confirm
```

**Purpose**
HR confirms probation completion after verifying all gate trainings are COMPLIANT. Updates `user_probation.probation_status = CONFIRMED` and `users.employment_phase = CONFIRMED`.

**Access**
- `HR` only

**Path Parameters**

| Parameter | Type | Notes |
|---|---|---|
| `user_id` | UUID | Target employee |

**Request Body**
```json
{
  "notes": "All trainings completed. Confirmed for permanent employment."
}
```

**Response** (200 OK)
```json
{
  "success": true,
  "data": {
    "probation_id": "uuid",
    "user_id": "uuid",
    "probation_status": "CONFIRMED",
    "confirmed_at": "2026-04-08T14:00:00Z",
    "confirmed_by": "uuid"
  },
  "message": "Probation confirmed successfully."
}
```

**Error Response** (422 Unprocessable Entity)
```json
{
  "success": false,
  "errors": [
    { "code": "PROBATION_GATE_INCOMPLETE", "message": "1 gate training(s) not yet completed: Code of Conduct" }
  ]
}
```

**Audit Event:** `PROBATION_COMPLETED`

---

### 2.4 Extend Probation Deadline

**Endpoint**
```
POST /api/v1/probation/{user_id}/extend
```

**Purpose**
HR extends the probation deadline for an employee who needs more time to complete gate trainings.

**Access**
- `HR` only

**Path Parameters**

| Parameter | Type | Notes |
|---|---|---|
| `user_id` | UUID | Target employee |

**Request Body**
```json
{
  "extended_until": "2026-07-15",
  "reason": "Employee was on medical leave for 3 weeks. Extension granted."
}
```

**Validation**
- `extended_until` must be in the future
- `extended_until` must be after current `probation_end_date` (or `extended_until` if already extended)
- Current `probation_status` must be `PROBATION` or `EXTENDED`

**Response** (200 OK)
```json
{
  "success": true,
  "data": {
    "probation_id": "uuid",
    "user_id": "uuid",
    "probation_status": "EXTENDED",
    "extended_until": "2026-07-15",
    "extension_reason": "Employee was on medical leave for 3 weeks. Extension granted."
  },
  "message": "Probation deadline extended."
}
```

**Audit Event:** `PROBATION_EXTENDED`

---

### 2.5 List Probation Training Rules

**Endpoint**
```
GET /api/v1/probation/rules
```

**Purpose**
Returns all active mandatory assignment rules with `rule_scope = EMPLOYMENT_PHASE`. Used by Admin to review configured probation training gates.

**Access**
- `ADMIN`, `HR` — ORG_WIDE

**Query Parameters**

| Parameter | Type | Notes |
|---|---|---|
| `designation` | string | Filter by `designation_filter` |
| `capability` | string | Filter by `capability_filter` |
| `is_active` | boolean | Default `true` |

**Response**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "rule_id": "uuid",
        "training_item_id": "uuid",
        "training_title": "Safety Compliance 2026",
        "rule_scope": "EMPLOYMENT_PHASE",
        "designation_filter": "Software Engineer",
        "capability_filter": null,
        "is_probation_gate": true,
        "due_date_days_from_assignment": 90,
        "priority_order": 1,
        "is_active": true,
        "created_at": "2026-01-01T00:00:00Z"
      }
    ],
    "page": 1, "size": 20, "total": 5, "has_next": false
  }
}
```

> **Note:** Probation rules are created via the Training Add/Edit wizard (Step 3 → Settings → Mandatory toggle → Assign To = "New Joiners (Probation)"). This endpoint is read-only for reviewing existing rules. Rule creation/modification goes through `POST /api/v1/assignments/rules` (Assignment Engine API).

---

## 3. Audit Events

| Event | event_code | Triggered By | Minimum Data |
|---|---|---|---|
| Probation started | `PROBATION_STARTED` | System (user creation) | user_id, probation_id, start_date, end_date |
| Probation training assigned | `PROBATION_TRAINING_ASSIGNED` | System (rule evaluation) | user_id, assignment_id, training_item_id, rule_id, due_date |
| Probation confirmed | `PROBATION_COMPLETED` | HR | user_id, probation_id, confirmed_by, gate_count |
| Probation extended | `PROBATION_EXTENDED` | HR | user_id, probation_id, old_end_date, new_end_date, reason, extended_by |
| Probation terminated | `PROBATION_TERMINATED` | System / HR | user_id, probation_id, terminated_by |

---

## 4. Gaps / Notes

- Rule creation is via `POST /api/v1/assignments/rules` (Assignment Engine API), not a probation-specific endpoint. The Training wizard in the prototype posts to that endpoint with `rule_scope = EMPLOYMENT_PHASE`.
- `GET /api/v1/probation/rules` is a convenience filtered view — it simply calls the Assignment Engine rules endpoint with `rule_scope=EMPLOYMENT_PHASE`.
- No employee self-service probation endpoint needed in Phase 1 — employees see their gate trainings via `GET /api/v1/assignments/me?is_probation_gate=true` (My Training screen).
