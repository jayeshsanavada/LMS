# Feature: Assignment Engine

---

# 1. Feature Overview

## Purpose

The Assignment Engine is responsible for distributing training across the organization in a controlled, auditable, and automated manner. It ensures that employees receive the correct training based on compliance requirements, organizational hierarchy, and managerial decisions.

This feature acts as the **execution layer of the LMS**, converting training definitions into actionable assignments.

## Why Business Needs It

The organization requires centralized assignment capability to ensure:

* Mandatory training is automatically distributed
* Managers can drive team development
* Training approvals are governed
* Compliance gaps are visible
* Assignment ownership is clear
* Deadlines are enforceable

## Problems This Feature Solves

* Manual distribution
* Inconsistent compliance coverage
* Missing approval governance
* Lack of accountability
* No centralized visibility
* Poor auditability

## Integration with Other LMS Modules

| Module              | Purpose                      |
| ------------------- | ---------------------------- |
| Training Management | Provides assignable training |
| User Management     | Provides users + hierarchy   |
| Notifications       | Sends alerts                 |
| Reporting           | Tracks completion            |
| Compliance          | Tracks status                |
| Sessions            | Classroom assignments        |
| Migration           | Imports assignments          |

---

# 2. Actors

## Employee

* View assignments
* Complete training
* Request optional training
* Track due dates

---

## Manager

Derived from hierarchy (NOT a role)

* Assign training to team
* Approve requests
* Monitor completion
* Handle overdue

---

## Admin

* Configure mandatory rules
* Perform bulk/manual assignment
* Monitor system-wide distribution
* Resolve conflicts

---

## HR

* Define mandatory training
* Monitor compliance

---

## External Systems

### Zoho HR

Provides base employee data.

---

### Employee/Timesheet Database (UPDATED)

Provides:

* Reporting manager hierarchy
* Capability
* Designation
* Project allocation

Used for:

* Assignment targeting
* Authorization
* Reporting

---

### PES

Consumes compliance via LMS APIs (no push from LMS).

---

### Keycloak

Provides identity and global roles.

---

# 2A. User Scenarios

(No major change — already correct)

---

# 3. Functional Overview

Assignments are created via three mechanisms:

### Automatic Assignment

Triggered by mandatory assignment rules configured by Admin. Each rule defines:

* `training_item_id` — which training to assign
* `rule_scope` — `GLOBAL` / `DEPARTMENT` / `DESIGNATION` / `CAPABILITY` / `PROJECT` / `EMPLOYMENT_PHASE`
* `scope_value` — e.g. "Engineering" (for DEPARTMENT scope); null for GLOBAL and EMPLOYMENT_PHASE
* `designation_filter` — optional secondary filter; only evaluated when `rule_scope = EMPLOYMENT_PHASE`
* `capability_filter` — optional secondary filter; only evaluated when `rule_scope = EMPLOYMENT_PHASE`
* `is_probation_gate` — boolean; when true, this assignment is required for probation-to-confirmed transition
* `due_date_days_from_assignment` — e.g. 30 (due date = assigned_at + 30 days); default 90 for EMPLOYMENT_PHASE rules; null = no deadline
* `priority_order` — lower number = higher priority (used for deduplication when multiple rules match)

Triggers:
* User creation (all applicable rules evaluated; EMPLOYMENT_PHASE rules evaluated when `employment_phase = PROBATION`)
* User attribute update (designation / capability / project change)
* Recertification (completion expiry detected by background job)

Deduplication: if a user matches multiple rules for the same training, only one assignment is created using the highest-priority (lowest `priority_order`) rule.

---

### Manager Assignment

Managers assign training to team members:

* Hierarchy-driven (not role-based)
* Restricted to reporting structure

---

### Administrative Assignment

Admins assign training across organization.

---

### Self-Enrollment

For published training with `requires_approval = false`:
* Employee self-enrolls directly — no request or approval needed
* Assignment created immediately with `assignment_source = SELF_ENROLLED`

For published training with `requires_approval = true`:
* Employee submits a request → goes through approval flow

---

### Approval Flow

Optional training with `requires_approval = true`:

* Employee submits request → status: `PENDING`
* Manager (via hierarchy) reviews → Approved or Rejected
* Approved → Assignment created with `assignment_source = SELF_APPROVED`
* Rejected → Request closed, no assignment created
* Requests expire after configurable days (default: 30, set in Admin settings) → status: `EXPIRED`
* Admin can approve/reject any pending request (Phase 1 delegation fallback for unavailable managers)

---

### Recertification Assignment

When a training completion expires (background job):
* Assignment Engine auto-creates a new assignment
* `assignment_source = RECERTIFICATION` for non-mandatory; `MANDATORY` for mandatory training
* Due date calculated from matching rule's `due_date_days_from_assignment`, or training default

---

### Assignment Lifecycle

States:

* Assigned
* In Progress
* Completed
* Overdue

State transitions are automatic based on activity and due dates.

---

# 4. Functional Requirements

## Assignment Creation

Assignments must support:

* Individual users
* Teams (via hierarchy — direct reports only, depth = 1)
* Departments (Admin only)
* Compliance groups (auto — via mandatory rules)

Only **published training** may be assigned.
Assignments must always use **latest published training version**.

### Duplicate Prevention

A duplicate assignment is defined as: same `user_id` + same `training_item_id` with `assignment_status` IN (`ASSIGNED`, `IN_PROGRESS`, `OVERDUE`).
* Completed assignments do not block new ones (recertification use case)
* System returns 409 `DUPLICATE_ASSIGNMENT` if a live duplicate is detected

### Assignment Cancellation

Assignments can be cancelled by:
* `ADMIN` — any assignment
* Manager — assignments they created for their direct reports

Rules:
* `COMPLETED` assignments cannot be cancelled
* Cancelled assignments retained in history with status `CANCELLED`
* Cancellation emits audit event and notifies the employee

---

## Mandatory Assignment

Triggered on:

* User creation
* User update (designation/capability/project change)

Flow:

User eligible
→ System evaluates rules
→ Assignment created (Assigned)
→ Notification queued

Mandatory assignments:

* Do not require approval
* Must be visible in reporting

---

## Manager Assignment

Managers must:

* Select team members
* Select training
* Define due dates
* Add notes

Authorization:

System must validate:

```text
is_manager(current_user, target_user)
```

Managers cannot assign outside hierarchy.

---

## Request & Approval

Flow:

Employee requests
→ Request (Pending)
→ Manager (via hierarchy) reviews

IF approved
→ Assignment created
→ Request = Approved

IF rejected
→ Request = Rejected

---

## Assignment Lifecycle Tracking

States:

* Assigned
* In Progress
* Completed
* Overdue

Transitions:

* Start → In Progress
* Completion → Completed
* Due passed → Overdue

---

## Deadline Management

* Due date optional on manual assignments
* Mandatory assignment due date = `assigned_at` + rule's `due_date_days_from_assignment`
* Overdue auto-calculated by background job (runs daily)
* Overdue status remains until completion or cancellation

### Overdue Escalation Chain

| Trigger | Notified | Condition |
|---|---|---|
| Day 0 (overdue detection) | Employee | Due date passed, not complete |
| Day 7 (still overdue) | Manager (via hierarchy) | Still not complete after 7 days overdue |
| Day 30 (still overdue) | HR + Admin | Still not complete after 30 days overdue |

Escalation days configurable via Admin settings.

---

## Assignment Visibility

### Employee

* Own assignments

### Manager

* Team assignments (via hierarchy)

### Admin

* Organization-wide

---

## Migration Support

* Assignment history
* Completion
* Status
* Deadlines

Migrated data = read-only

---

# 5. Business Rules

## Assignment Governance

BR-01 Only published training is assignable
BR-02 Assignments always reference the latest published version
BR-03 Inactive training cannot be newly assigned

---

## Mandatory Rule Structure

BR-04 Mandatory rules configured by Admin with: training_id, rule_scope, scope_value, due_date_days_from_assignment, priority_order
BR-05 Mandatory assignments do not require approval
BR-06 If user matches multiple rules for same training, only one assignment created (highest priority rule wins)
BR-07 Mandatory assignment triggered on: user creation, user attribute change, completion expiry
BR-08 `EMPLOYMENT_PHASE` scope rules evaluated only for users with `employment_phase = PROBATION`
BR-09 EMPLOYMENT_PHASE rules support secondary `designation_filter` and `capability_filter` — null filter means match all
BR-10 Assignments created from EMPLOYMENT_PHASE rules have `is_probation_gate = true` copied from the rule
BR-11 Probation gate assignments are required for probation confirmation — gate evaluation done via `compliance_status` table

---

## Duplicate Prevention

BR-08 Duplicate = same user + same training with status IN (ASSIGNED, IN_PROGRESS, OVERDUE)
BR-09 Completed assignments do not block new assignments (recertification allowed)
BR-10 System returns 409 DUPLICATE_ASSIGNMENT on duplicate attempt

---

## Self-Enrollment Rules

BR-11 Employee can self-enroll directly in training with `requires_approval = false`
BR-12 Self-enrollment creates assignment with source = SELF_ENROLLED
BR-13 Training with `requires_approval = true` requires request + approval flow

---

## Approval Rules

BR-14 Approval requests expire after configurable days (default 30) → status EXPIRED
BR-15 Rejected requests do not create an assignment
BR-16 Admin can approve/reject any pending request (Phase 1 delegation fallback)
BR-17 Expired requests can be re-submitted by employee

---

## Assignment Cancellation Rules

BR-18 COMPLETED assignments cannot be cancelled
BR-19 Admin can cancel any non-completed assignment
BR-20 Manager can cancel assignments they created within their hierarchy
BR-21 Cancelled assignments retained in history

---

## Recertification Rules

BR-22 When completion expires, Assignment Engine auto-creates new assignment
BR-23 Source = RECERTIFICATION for non-mandatory; MANDATORY for mandatory training
BR-24 Due date calculated from rule's due_date_days_from_assignment or null

---

## Authorization Rules

BR-25 Global roles via Keycloak
BR-26 Hierarchy defines manager assignment rights (direct reports only, depth = 1)
BR-27 Manager derived dynamically from user_hierarchy — not a role

---

## Deadline Rules

BR-28 Manual assignment due date set by assigner (optional)
BR-29 Mandatory assignment due date = assigned_at + rule's due_date_days_from_assignment
BR-30 Overdue calculated daily by background job

---

## Overdue Escalation Rules

BR-31 Day 0 overdue: employee notified
BR-32 Day 7 overdue: manager (via hierarchy) notified
BR-33 Day 30 overdue: HR + Admin notified
BR-34 Escalation days configurable via Admin settings

---

## Compliance Rules

BR-35 Completion updates compliance status
BR-36 Compliance data exposed via LMS APIs for PES (pull model)

---

## Security Rules

BR-37 Authorization = role + hierarchy
BR-38 Employees cannot assign training to others (only self-enroll or request)

---

# 6. Workflows

## Mandatory Assignment

User created / attribute updated
→ Rules engine evaluates all active mandatory rules
→ Matching rules identified; deduplication applied (highest priority wins per training)
→ Assignment(s) created (source = MANDATORY)
→ Due date = assigned_at + rule's due_date_days_from_assignment
→ Notification queued

---

## Probation Training Assignment Flow

User created with `employment_phase = PROBATION`
→ Rules engine evaluates all active rules with `rule_scope = EMPLOYMENT_PHASE`
→ Secondary filters applied: `designation_filter` matched against user's `designation`; `capability_filter` matched against user's `capability`; null filter = match all
→ For each matched rule: assignment created with `assignment_source = MANDATORY`, `is_probation_gate = true`
→ Due date = `joining_date` + rule's `due_date_days_from_assignment` (default 90 days)
→ `user_probation` record created (status = PROBATION, end_date = joining_date + 90)
→ `PROBATION_STARTED` audit event emitted
→ Employee notified with gate training list and deadline

---

## Manager Assignment

Manager selects team members (direct reports only)
→ System validates hierarchy: `is_direct_report(current_user, target_user)`
→ Selects published training + sets due date + optional note
→ Assignment created (source = MANAGER)
→ Notification queued to employee

---

## Self-Enrollment (No Approval)

Employee browses catalog
→ Selects training with `requires_approval = false`
→ Clicks enroll
→ Duplicate check run
→ Assignment created (source = SELF_ENROLLED)
→ Confirmation notification sent

---

## Request & Approval Flow

Employee requests optional training (`requires_approval = true`)
→ Request created (status = PENDING)
→ Manager notified
→ Manager approves → Assignment created (source = SELF_APPROVED) → Employee notified
→ Manager rejects → Request closed (status = REJECTED) → Employee notified with reason
→ No action in 30 days → Request expires (status = EXPIRED) → Employee notified

---

## Completion Flow

Employee completes all required resources
→ Assignment status → COMPLETED
→ `completed_at` recorded
→ Compliance evaluation triggered
→ Certificate generation triggered

---

## Overdue Flow

Background job (daily)
→ Finds assignments with due_date < today AND status IN (ASSIGNED, IN_PROGRESS)
→ Status updated to OVERDUE
→ Day 0: Employee notified
→ Day 7: Manager notified (if still overdue)
→ Day 30: HR + Admin notified (if still overdue)

---

## Recertification Flow

Background job (daily)
→ Finds expired completions (`training_completions.is_expired = true`)
→ Assignment Engine creates new assignment (source = RECERTIFICATION or MANDATORY)
→ Due date calculated from rule or null
→ Employee notified

---

## Assignment Cancellation Flow

Admin / Manager triggers cancellation
→ System checks: status not COMPLETED
→ Assignment status → CANCELLED
→ Retained in history
→ Employee notified
→ Audit event emitted

---

# 7. Data Rules

## Data Ownership

| System      | Data                |
| ----------- | ------------------- |
| LMS         | Assignments         |
| Employee DB | Hierarchy           |
| Keycloak    | Identity            |
| PES         | Consumes compliance |

---

## Data Edit Rules

* Assignment rules → Admin
* Assignments → Manager/Admin
* Completion → System

---

## Identifiers

* Assignment ID
* User ID
* Training ID
* Version ID

---

## Retention

* Assignments permanent
* History permanent

---

## Sync Behavior (UPDATED)

* Hierarchy updates affect **future assignments only**
* Existing assignments remain unchanged

---

# 8. Edge Cases

## Duplicate Assignment

* System detects: same user + same training with status IN (ASSIGNED, IN_PROGRESS, OVERDUE)
* Returns 409 DUPLICATE_ASSIGNMENT with existing assignment_id
* Completed assignments do not trigger duplicate check — recertification allowed

---

## Manager Change

* Existing assignments unchanged — linked to original assigner
* Future assignments follow new hierarchy
* Phase 1: Pending approval requests are **NOT re-routed** when the manager hierarchy changes — `approver_user_id` is captured at request creation time and is not updated on hierarchy change. Admin fallback (BR-16) covers the case where the original approver is no longer appropriate.

---

## Training Inactive

* Existing assignments on inactive training remain completable
* New assignments blocked with 409 TRAINING_INACTIVE

---

## Integration Failure (Employee DB Unavailable)

* Mandatory rule evaluation deferred until hierarchy data is available
* Existing assignments unaffected
* Retry via background job on next sync

---

## User Deactivated

* Active assignments retained in history
* Overdue escalation paused for deactivated users
* On reactivation: mandatory assignment re-evaluation triggered

---

## Approval Request — Manager Unavailable

* Phase 1: Admin can approve/reject any pending request
* Requests expire after 30 days (configurable) → status EXPIRED
* Employee notified on expiry, can re-submit

---

## Multiple Rules Match Same Training

* Deduplication: one assignment created per training per user
* Highest priority rule (lowest priority_order) used for due date calculation
* All matched rules logged for audit

---

# 9. Acceptance Criteria

* Mandatory assignment auto-created on user creation and attribute change
* Mandatory rule deduplication works — one assignment per training per user
* Manager assignment restricted to direct reports only
* Self-enrollment works for non-approval training
* Approval workflow works end-to-end (submit → approve/reject → assignment created)
* Approval requests expire after configured days
* Assignment cancellation works for Admin and Manager (within hierarchy)
* Recertification auto-assignment triggered on completion expiry
* Assignment lifecycle transitions correctly (ASSIGNED → IN_PROGRESS → COMPLETED / OVERDUE)
* Overdue detection runs daily and updates statuses correctly
* Overdue escalation chain notifies employee → manager → HR/Admin at correct intervals
* Duplicate assignment prevented (live duplicates blocked; recertification allowed)
* Hierarchy-based access enforced for all manager operations
* Assignment export works with filters
* All assignment actions emit correct audit events

---

# 10. Dependencies

* Training Management
* User Management
* Employee/Timesheet DB
* Keycloak
* Notifications
* Reporting
* PES (API consumer)

---

# 11. Assumptions

* <1000 users
* Single tenant
* Hierarchy from employee DB
* SSO mandatory
* OpenAPI integrations
* Modular monolith architecture

---

# 12. Audit Events

| Event | event_code | Minimum Data Captured |
|---|---|---|
| Assignment created | `ASSIGNMENT_CREATED` | assignment_id, user_id, training_id, source, created_by, rule_id (if auto), correlation_id, timestamp |
| Assignment cancelled | `ASSIGNMENT_CANCELLED` | assignment_id, cancelled_by, reason, correlation_id, timestamp |
| Assignment completed | `ASSIGNMENT_COMPLETED` | assignment_id, user_id, source, correlation_id, timestamp |
| Assignment overdue | `ASSIGNMENT_OVERDUE` | assignment_id, user_id, days_overdue, correlation_id, timestamp |
| Due date updated | `ASSIGNMENT_DUE_DATE_UPDATED` | assignment_id, old_date, new_date, updated_by, correlation_id, timestamp |
| Request submitted | `APPROVAL_REQUEST_SUBMITTED` | request_id, user_id, training_id, correlation_id, timestamp |
| Request approved | `APPROVAL_REQUEST_APPROVED` | request_id, approved_by, assignment_id, correlation_id, timestamp |
| Request rejected | `APPROVAL_REQUEST_REJECTED` | request_id, rejected_by, reason, correlation_id, timestamp |
| Request expired | `APPROVAL_REQUEST_EXPIRED` | request_id, user_id, expired_at, correlation_id, timestamp |
| Recertification created | `ASSIGNMENT_RECERTIFICATION_CREATED` | assignment_id, user_id, training_id, previous_completion_id, correlation_id, timestamp |

---

# 13. Future Enhancements

* Multi-level hierarchy assignment (depth > 1)
* Approval delegation (manager-to-manager)
* Learning path auto-sequencing (prerequisite-driven assignment)
* Assignment scheduling (assign now, start on future date)
* Bulk assignment via CSV upload
* Assignment rules UI builder with preview

---

# End of Document