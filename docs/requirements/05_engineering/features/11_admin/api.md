# Admin — API Specification

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

### Authorization
- All Admin endpoints: `ADMIN` role only (`realm_access.roles` in JWT)

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
    "total": 84,
    "has_next": true
  }
}
```

---

## Group: System Settings

---

### 1. Get All Settings

```
GET /api/v1/admin/settings
```

**Purpose:** Returns all system configuration settings with current values, types, and defaults. Used to populate the Admin settings dashboard.

**Access:** ADMIN only

**Query Parameters:**
| Parameter | Type | Notes |
|---|---|---|
| `module` | string | Filter by module: `assignment` / `notification` / `system` |

**Response:**
```json
{
  "settings": [
    {
      "setting_key": "assignment.overdue_escalation_day_manager",
      "setting_value": "7",
      "value_type": "INTEGER",
      "module_name": "assignment",
      "default_value": "7",
      "description": "Days after due date before manager is notified of overdue assignment",
      "updated_at": "2026-04-01T10:00:00Z",
      "updated_by_name": "Jayesh Sanavada"
    },
    {
      "setting_key": "system.audit_log_retention_days",
      "setting_value": "1825",
      "value_type": "INTEGER",
      "module_name": "system",
      "default_value": "1825",
      "description": "Days audit logs are retained before purge (default: 5 years)",
      "updated_at": null,
      "updated_by_name": null
    }
  ]
}
```

**Settings Catalog:**

| Setting Key | Module | Value Type | Default | Purpose |
|---|---|---|---|---|
| `assignment.overdue_escalation_day_manager` | assignment | INTEGER | 7 | Days after due before manager notified of overdue |
| `assignment.overdue_escalation_day_hr_admin` | assignment | INTEGER | 30 | Days after due before HR/Admin notified |
| `assignment.approval_expiry_days` | assignment | INTEGER | 30 | Days until pending approval request expires |
| `notification.due_date_reminder_days` | notification | INTEGER | 7 | Days before due date to send due-date reminder |
| `notification.session_reminder_hours_first` | notification | INTEGER | 24 | Hours before session for first reminder |
| `notification.session_reminder_hours_second` | notification | INTEGER | 1 | Hours before session for final reminder |
| `system.export_file_retention_hours` | system | INTEGER | 24 | Hours before export file is deleted from storage |
| `system.notification_retention_days` | system | INTEGER | 90 | Days notification records retained before purge |
| `system.audit_log_retention_days` | system | INTEGER | 1825 | Days audit logs retained (regulatory default: 5 years) |
| `system.policy_current_version` | system | STRING | v1 | Current active policy version; Auth module compares against user's `policy_accepted_version` at login |

---

### 2. Update Setting

```
PUT /api/v1/admin/settings/{setting_key}
```

**Purpose:** Updates a single system configuration setting. Change is applied immediately without restart. Emits `ADMIN_CONFIG_UPDATED` audit event.

**Access:** ADMIN only

**Path Parameters:** `setting_key` — the setting key string (e.g. `assignment.overdue_escalation_day_manager`)

**Request Body:**
```json
{
  "setting_value": "14"
}
```

**Business Logic:**
- Value validated against `value_type` (INTEGER must be parseable integer, BOOLEAN must be `true`/`false`, etc.)
- Previous value saved to `admin_settings_history`
- Audit event `ADMIN_CONFIG_UPDATED` emitted with `old_value` and `new_value`
- Applied immediately — downstream workers read the setting on next execution

**Response:**
```json
{
  "setting_key": "assignment.overdue_escalation_day_manager",
  "setting_value": "14",
  "value_type": "INTEGER",
  "updated_at": "2026-04-06T10:30:00Z"
}
```

**Error Codes:**
- `SETTING_NOT_FOUND` (404) — key does not exist in catalog
- `INVALID_SETTING_VALUE` (422) — value fails type validation

---

### 3. Get Settings Change History

```
GET /api/v1/admin/settings/history
```

**Purpose:** Returns paginated history of all configuration changes across all settings.

**Access:** ADMIN only

**Query Parameters:**
| Parameter | Type | Notes |
|---|---|---|
| `setting_key` | string | Filter by specific setting |
| `module` | string | Filter by module |
| `from_date` | date | |
| `to_date` | date | |
| `page` | integer | Default 1 |
| `size` | integer | Default 20 |

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "setting_key": "assignment.overdue_escalation_day_manager",
      "module_name": "assignment",
      "previous_value": "7",
      "new_value": "14",
      "changed_by_user_id": "uuid",
      "changed_by_name": "Jayesh Sanavada",
      "changed_at": "2026-04-06T10:30:00Z"
    }
  ],
  "page": 1,
  "size": 20,
  "total": 5,
  "has_next": false
}
```

---

## Group: Role Management

---

### 4. Get User Roles

```
GET /api/v1/admin/users/{user_id}/roles
```

**Purpose:** Returns current global roles assigned to a user (read from Keycloak).

**Access:** ADMIN only

**Path Parameters:** `user_id` — LMS user UUID

**Response:**
```json
{
  "user_id": "uuid",
  "employee_id": "EMP-042",
  "full_name": "Jayesh Sanavada",
  "current_roles": ["EMPLOYEE"]
}
```

**Error Codes:**
- `USER_NOT_FOUND` (404)

---

### 5. Assign Role to User

```
POST /api/v1/admin/users/{user_id}/roles
```

**Purpose:** Assigns a global role to a user. Calls Keycloak Admin API. Role is effective on user's next login (JWT refresh). Emits `ROLE_MAPPING_UPDATED` audit event.

**Access:** ADMIN only

**Path Parameters:** `user_id` — LMS user UUID

**Request Body:**
```json
{
  "role": "HR"
}
```

**Business Logic:**
- Validates `role` is one of `ADMIN`, `HR`, `EMPLOYEE`
- Calls Keycloak Admin API to assign realm role
- If role already assigned: no-op, returns success (idempotent)
- Audit event `ROLE_MAPPING_UPDATED` emitted: `action=ASSIGNED, role, target_user_id`

**Response:** `{ "message": "Role assigned" }` (200)

**Error Codes:**
- `USER_NOT_FOUND` (404)
- `INVALID_ROLE` (422) — role not in allowed set

---

### 6. Remove Role from User

```
DELETE /api/v1/admin/users/{user_id}/roles/{role}
```

**Purpose:** Removes a global role from a user. Calls Keycloak Admin API. Blocked if this would remove the last active Admin. Emits `ROLE_MAPPING_UPDATED` audit event.

**Access:** ADMIN only

**Path Parameters:**
- `user_id` — LMS user UUID
- `role` — `ADMIN` / `HR` / `EMPLOYEE`

**Business Logic:**
- If `role = ADMIN`: check count of active users with ADMIN role
- If only 1 active Admin exists: return `LAST_ADMIN_PROTECTED` (422) — do not call Keycloak
- Otherwise: call Keycloak Admin API to remove role
- Audit event `ROLE_MAPPING_UPDATED` emitted: `action=REMOVED, role, target_user_id`

**Response:** `{ "message": "Role removed" }` (200)

**Error Codes:**
- `USER_NOT_FOUND` (404)
- `INVALID_ROLE` (422)
- `LAST_ADMIN_PROTECTED` (422) — cannot remove ADMIN role from the last active Admin

---

## Group: Mandatory Assignment Rules

---

### 7. List Mandatory Rules

```
GET /api/v1/admin/mandatory-rules
```

**Purpose:** Returns all mandatory assignment rules — training items with automatic assignment targeting criteria.

**Access:** ADMIN only

**Query Parameters:**
| Parameter | Type | Notes |
|---|---|---|
| `is_active` | boolean | Default: all |
| `training_item_id` | UUID | Filter by training item |
| `page` | integer | Default 1 |
| `size` | integer | Default 20 |

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "training_item_id": "uuid",
      "training_title": "Safety Compliance 2026",
      "training_code": "TRN-001",
      "target_type": "ALL",
      "target_department": null,
      "target_designation": null,
      "target_capability": null,
      "is_active": true,
      "last_evaluated_at": "2026-04-06T03:00:00Z",
      "created_at": "2026-01-15T09:00:00Z"
    }
  ],
  "page": 1,
  "size": 20,
  "total": 8,
  "has_next": false
}
```

---

### 8. Create Mandatory Rule

```
POST /api/v1/admin/mandatory-rules
```

**Purpose:** Creates a new mandatory assignment rule. The Assignment Engine will auto-assign the linked training to all users matching the targeting criteria.

**Access:** ADMIN only

**Request Body:**
```json
{
  "training_item_id": "uuid",
  "target_type": "DEPARTMENT",
  "target_department": "Engineering",
  "target_designation": null,
  "target_capability": null
}
```

**`target_type` values:** `ALL` / `DEPARTMENT` / `DESIGNATION` / `CAPABILITY`

**Business Logic:**
- `target_type = ALL` — rule applies to all active employees
- `target_type = DEPARTMENT / DESIGNATION / CAPABILITY` — corresponding target field required
- Creating a rule triggers Assignment Engine re-evaluation on next cycle
- Training item must be in `PUBLISHED` lifecycle state

**Response:** `{ "id": "uuid", "created_at": "..." }` (201)

**Error Codes:**
- `TRAINING_NOT_FOUND` (404)
- `TRAINING_NOT_PUBLISHED` (422) — training must be PUBLISHED to create rule
- `DUPLICATE_RULE` (409) — identical rule already exists for this training + target

---

### 9. Update Mandatory Rule

```
PUT /api/v1/admin/mandatory-rules/{rule_id}
```

**Purpose:** Updates targeting criteria for an existing mandatory rule. Triggers re-evaluation.

**Access:** ADMIN only

**Request Body:** Same shape as Create; all fields optional (partial update)

**Business Logic:**
- Changes targeting criteria only; `training_item_id` cannot be changed after creation
- Triggers Assignment Engine re-evaluation on next cycle
- Existing assignments are NOT cancelled on rule change

**Response:** Updated rule object (200)

**Error Codes:**
- `RULE_NOT_FOUND` (404)
- `DUPLICATE_RULE` (409)

---

### 10. Deactivate Mandatory Rule

```
DELETE /api/v1/admin/mandatory-rules/{rule_id}
```

**Purpose:** Deactivates a mandatory rule. Existing in-progress assignments are NOT cancelled. New auto-assignments for this rule will not be created.

**Access:** ADMIN only

**Business Logic:**
- Sets `is_active = false` on the rule — soft delete
- Assignment Engine skips inactive rules on next evaluation
- Existing PENDING / IN_PROGRESS assignments remain

**Response:** `{ "message": "Rule deactivated" }` (200)

**Error Codes:**
- `RULE_NOT_FOUND` (404)

---

## Additions vs Master API List (§21)

| # | Addition | Reason |
|---|---|---|
| A1 | `PUT /admin/settings/{setting_key}` — single-key update | Master had bulk `PUT /admin/settings`; per-key update safer and auditable |
| A2 | `GET /admin/settings/history` with filters | Master had no query params; filtering by setting_key and module required |
| A3 | `GET/POST/DELETE /admin/users/{user_id}/roles` — role management | Master had no role assignment endpoints; ADM3 — mechanism not defined |
| A4 | `GET/POST/PUT/DELETE /admin/mandatory-rules` | ADM5 — mandatory rule management not explicitly owned; required for Assignment Engine config |
| A5 | Settings catalog fully defined with 10 settings | ADM2 — configurable settings from 6 feature specs consolidated here; `system.policy_current_version` added (Auth module dependency) |
| A6 | `LAST_ADMIN_PROTECTED` error on role removal | ADM8 — last Admin protection missing from master |
| A7 | `ADMIN_CONFIG_UPDATED` / `ROLE_MAPPING_UPDATED` audit events on every write | ADM4 — audit trail for config changes missing from master |
