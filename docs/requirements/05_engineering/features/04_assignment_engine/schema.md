# Assignment Engine — Database Schema

---

## 1. Design Principles

- Assignments are permanent records — never hard-deleted (CANCELLED status used instead)
- Completions and history are immutable
- Mandatory assignment rules drive auto-assignment logic
- Duplicate prevention enforced at application layer
- Background jobs drive overdue detection, expiry, and escalation

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

## 3. Tables Owned by Assignment Engine Module

---

### Table: `mandatory_assignment_rules`

**Purpose**
Stores Admin-configured rules that drive automatic training assignment. When a user's attributes match a rule, the system auto-creates an assignment.

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `training_item_id` | UUID | No | FK → `training_items.id` |
| `rule_scope` | VARCHAR(50) | No | `GLOBAL` / `DEPARTMENT` / `DESIGNATION` / `CAPABILITY` / `PROJECT` / `EMPLOYMENT_PHASE` |
| `scope_value` | VARCHAR(150) | Yes | e.g. "Engineering"; null for GLOBAL/EMPLOYMENT_PHASE scope |
| `designation_filter` | VARCHAR(150) | Yes | Secondary filter for `EMPLOYMENT_PHASE` scope — e.g. "Software Engineer"; null = all designations |
| `capability_filter` | VARCHAR(150) | Yes | Secondary filter for `EMPLOYMENT_PHASE` scope — e.g. "Java Backend"; null = all capabilities |
| `is_probation_gate` | BOOLEAN | No | Default false; when true, completion required for probation-to-confirmed transition |
| `due_date_days_from_assignment` | INTEGER | Yes | Null = no deadline; default 90 for `EMPLOYMENT_PHASE` rules |
| `priority_order` | INTEGER | No | Lower = higher priority; used for deduplication |
| `is_active` | BOOLEAN | No | Inactive rules not evaluated |
| `created_at` | TIMESTAMP | No | |
| `created_by` | UUID | No | FK → `users.id` |
| `updated_at` | TIMESTAMP | No | |
| `updated_by` | UUID | No | FK → `users.id` |

**Business Rules**
- Only active rules are evaluated during auto-assignment
- When multiple rules match same user + training, lowest `priority_order` wins
- Deactivating a rule does not cancel existing assignments created by it
- `rule_scope = GLOBAL` means all active employees
- `rule_scope = EMPLOYMENT_PHASE` targets users with `employment_phase = PROBATION`; `designation_filter` and `capability_filter` provide secondary matching
- `is_probation_gate = true` rules must be completed before HR can confirm probation
- `designation_filter` and `capability_filter` are only evaluated when `rule_scope = EMPLOYMENT_PHASE`; ignored for other scopes

**Indexes**
- `(rule_scope, scope_value, is_active)` (rule matching query)
- `training_item_id` (training-based lookup)
- `is_active` (filter active rules)

---

### Table: `assignments`

**Purpose**
Stores all training assignments regardless of source (mandatory, manager, admin, self-enrolled, recertification).

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `user_id` | UUID | No | FK → `users.id` |
| `training_item_id` | UUID | No | FK → `training_items.id` |
| `training_version_id` | UUID | No | FK → `training_versions.id` |
| `assignment_source` | VARCHAR(50) | No | `MANDATORY` / `MANAGER` / `ADMIN` / `SELF_ENROLLED` / `SELF_APPROVED` / `RECERTIFICATION` |
| `assignment_status` | VARCHAR(50) | No | `ASSIGNED` / `IN_PROGRESS` / `COMPLETED` / `OVERDUE` / `CANCELLED` |
| `assigned_by_user_id` | UUID | Yes | FK → `users.id`; null for system/auto |
| `rule_id` | UUID | Yes | FK → `mandatory_assignment_rules.id`; set for MANDATORY source |
| `is_probation_gate` | BOOLEAN | No | Default false; copied from rule; marks this assignment as required for probation confirmation |
| `due_date` | TIMESTAMP | Yes | Null = no deadline |
| `note` | TEXT | Yes | Optional note from assigner |
| `completed_at` | TIMESTAMP | Yes | Set on COMPLETED |
| `cancelled_at` | TIMESTAMP | Yes | Set on CANCELLED |
| `cancelled_by` | UUID | Yes | FK → `users.id` |
| `cancellation_reason` | TEXT | Yes | |
| `is_migrated` | BOOLEAN | No | Default false; true for legacy imported assignments |
| `overdue_since` | TIMESTAMP | Yes | When assignment first became overdue |
| `last_escalation_level` | INTEGER | Yes | 0=none, 1=employee, 2=manager, 3=HR/Admin |
| `last_escalation_at` | TIMESTAMP | Yes | When last escalation notification was sent |
| `created_at` | TIMESTAMP | No | |
| `updated_at` | TIMESTAMP | No | |

**Business Rules**
- Duplicate prevention: unique constraint on `(user_id, training_item_id)` WHERE `assignment_status IN ('ASSIGNED','IN_PROGRESS','OVERDUE')` — enforced at application layer
- `COMPLETED` assignments do not block new ones (recertification)
- `CANCELLED` assignments retained permanently
- `overdue_since` set when background job first marks assignment as OVERDUE
- `last_escalation_level` tracks how far the overdue escalation has progressed

**Indexes**
- `(user_id, assignment_status)` (my assignments query)
- `(user_id, training_item_id)` (duplicate check)
- `training_item_id` (training-based lookup)
- `assignment_status` (filter)
- `due_date` (overdue detection)
- `(overdue_since, last_escalation_level)` (escalation job)

---

### Table: `assignment_history`

**Purpose**
Immutable log of all assignment status transitions. One row per state change.

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `assignment_id` | UUID | No | FK → `assignments.id` |
| `previous_status` | VARCHAR(50) | No | |
| `new_status` | VARCHAR(50) | No | |
| `action_source` | VARCHAR(50) | No | `SYSTEM` / `USER` / `ADMIN` / `JOB` |
| `changed_by_user_id` | UUID | Yes | FK → `users.id`; null for system/job |
| `changed_at` | TIMESTAMP | No | |
| `remarks` | TEXT | Yes | |

**Business Rules**
- Immutable — no updates or deletes
- Created on every status transition

**Indexes**
- `assignment_id` (history for one assignment)
- `changed_at` (time-range queries)

---

### Table: `assignment_requests`

**Purpose**
Stores employee self-enrollment requests for training that requires approval. Tracks the full request lifecycle including expiry.

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `requester_user_id` | UUID | No | FK → `users.id` |
| `training_item_id` | UUID | No | FK → `training_items.id` |
| `request_reason` | TEXT | Yes | |
| `request_status` | VARCHAR(50) | No | `PENDING` / `APPROVED` / `REJECTED` / `EXPIRED` |
| `approver_user_id` | UUID | Yes | FK → `users.id`; manager resolved from hierarchy at request time |
| `decided_at` | TIMESTAMP | Yes | When approved or rejected |
| `rejection_reason` | TEXT | Yes | |
| `assignment_id` | UUID | Yes | FK → `assignments.id`; set on approval |
| `expires_at` | TIMESTAMP | No | Calculated at creation: submitted_at + configured expiry days |
| `created_at` | TIMESTAMP | No | |
| `updated_at` | TIMESTAMP | No | |

**Business Rules**
- One PENDING request per `(requester_user_id, training_item_id)` at a time
- `approver_user_id` set at creation time — captures manager at time of request (not re-evaluated on hierarchy change)
- Background job checks `expires_at < now` and sets status to EXPIRED
- Expired requests can be re-submitted (previous request retained)
- Admin can approve/reject any PENDING request

**Indexes**
- `(requester_user_id, request_status)` (my requests)
- `(approver_user_id, request_status)` (pending approvals for manager)
- `expires_at` (expiry background job)
- `(requester_user_id, training_item_id, request_status)` (duplicate request check)

---

### Table: `compliance_status`

**Purpose**
Stores the computed compliance state per user per assignment. Updated by background job after each assignment status change or completion event. This is a derived/calculated table — it is NOT a user-facing feature. It serves: (1) employee/manager/HR dashboard widgets, (2) the PES pull API (`GET /api/v1/compliance/...`), and (3) compliance reports in the Reporting module.

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `user_id` | UUID | No | FK → `users.id` |
| `training_item_id` | UUID | No | FK → `training_items.id` |
| `assignment_id` | UUID | No | FK → `assignments.id` |
| `compliance_state` | VARCHAR(50) | No | `PENDING` / `COMPLIANT` / `NON_COMPLIANT` |
| `evaluated_at` | TIMESTAMP | No | When state was last computed |
| `due_date_snapshot` | TIMESTAMP | Yes | Due date at time of evaluation |
| `completion_date_snapshot` | TIMESTAMP | Yes | Completion date if completed |
| `is_migrated_basis` | BOOLEAN | No | Default false; true if based on migrated completion |
| `created_at` | TIMESTAMP | No | |
| `updated_at` | TIMESTAMP | No | |

**Business Rules**
- One row per `(user_id, assignment_id)` — unique constraint
- `PENDING` — assignment exists, not yet completed, not overdue
- `COMPLIANT` — assignment completed on or before due date (or no due date)
- `NON_COMPLIANT` — assignment status = OVERDUE or completed after due date
- Recalculated by background job on: assignment status change, completion event, due date update
- Compliance reports (in Reporting module) and PES API (in Integrations module) read from this table

**Indexes**
- `(user_id, compliance_state)` (employee compliance view)
- `(user_id, training_item_id)` (per-training compliance lookup)
- `assignment_id` (FK lookup)
- `compliance_state` (org-wide filter for reports)

---

## 4. Referenced Tables (Owned by Other Modules)

| Table | Owning Module | Used By |
|---|---|---|
| `users` | User Management | `assignments.user_id`, `assignment_requests.requester_user_id` |
| `user_hierarchy` | User Management | Manager validation for assignment and approval authority |
| `training_items` | Training Management | `assignments.training_item_id`, `mandatory_assignment_rules.training_item_id` |
| `training_versions` | Training Management | `assignments.training_version_id` |
| `training_completions` | Training Management | Completion expiry triggers recertification assignments |
| `sessions` | Sessions | Session-type resource completion triggers assignment status update |
| `background_jobs` | Platform | Overdue detection, escalation, and request expiry jobs |

---

## 5. Enum Values

### `assignment_source`
- `MANDATORY` — auto from compliance rule
- `MANAGER` — assigned by manager
- `ADMIN` — assigned by admin
- `SELF_ENROLLED` — employee self-enrolled (no approval)
- `SELF_APPROVED` — employee requested, manager approved
- `RECERTIFICATION` — auto from completion expiry (non-mandatory)

### `assignment_status`
- `ASSIGNED`
- `IN_PROGRESS`
- `COMPLETED`
- `OVERDUE`
- `CANCELLED`

### `request_status`
- `PENDING`
- `APPROVED`
- `REJECTED`
- `EXPIRED`

### `rule_scope`
- `GLOBAL`
- `DEPARTMENT`
- `DESIGNATION`
- `CAPABILITY`
- `PROJECT`
- `EMPLOYMENT_PHASE` — targets users with `employment_phase = PROBATION`; supports `designation_filter` and `capability_filter` for fine-grained targeting

### `action_source` (assignment_history)
- `SYSTEM`
- `USER`
- `ADMIN`
- `JOB`

---

## 6. Cross-Check Notes

Verified against:
- `04_assignment_engine.md` — all data requirements covered including all 12 enterprise additions
- `02_database_schema.md` §5.5, §5.6 — all master tables present

**Additions vs master schema (derived from spec + enterprise review):**
- `mandatory_assignment_rules` table (new) — rules engine structure (AE1)
- `assignments.assignment_source` — added `SELF_ENROLLED` and `RECERTIFICATION` values (AE6, AE8)
- `assignments.rule_id` — FK to rule that triggered auto-assignment (AE1)
- `assignments.cancelled_at`, `cancelled_by`, `cancellation_reason` — cancellation support (AE4)
- `assignments.overdue_since`, `last_escalation_level`, `last_escalation_at` — escalation tracking (AE9)
- `assignment_requests.expires_at` — request expiry support (AE5)
- `assignment_requests.assignment_id` — FK to created assignment on approval
- `assignment_requests.request_status` — added `EXPIRED` value (AE5)
- `mandatory_assignment_rules.rule_scope` — added `EMPLOYMENT_PHASE` value for probation gate rules (BR-P01)
- `mandatory_assignment_rules.designation_filter` + `capability_filter` — secondary filters for EMPLOYMENT_PHASE scope
- `mandatory_assignment_rules.is_probation_gate` — marks rules required for probation completion
- `assignments.is_probation_gate` — copied from rule; enables efficient probation gate queries without joining rules table
