# Feature: Probation Management

---

# 1. Feature Overview

## Purpose

The Probation Management feature enforces a mandatory training gate for new joiners during their probation period. Employees on probation must complete designation and/or capability-specific trainings within a configurable window (default: 3 months / 90 days) before their probation can be marked as complete.

This feature ensures that critical role-specific knowledge is verified before a new joiner is confirmed, and provides HR with visibility and control over the probation completion process.

## Why Business Needs It

New joiners require role-relevant training before being confirmed as permanent employees. Without a systemic gate, probation confirmation could happen before mandatory onboarding trainings are completed. This feature:

* Automates assignment of required trainings based on designation and capability
* Prevents probation confirmation until all training gates are cleared
* Gives HR a single dashboard to monitor probation status across the organisation
* Creates an auditable record of every probation period

## Problems This Feature Solves

* Manual tracking of which trainings each new joiner must complete
* Inconsistent probation confirmation without training verification
* No visibility for HR on probation readiness
* Inability to define different training gates for different roles/capabilities

## Integration with Other LMS Modules

| Module              | Purpose                                             |
| ------------------- | --------------------------------------------------- |
| User Management     | `employment_phase` flag; `user_probation` table     |
| Assignment Engine   | Auto-assigns probation gate trainings on user creation; `EMPLOYMENT_PHASE` rule scope |
| Training Management | `is_probation_gateway` flag on trainings            |
| Compliance          | Gate evaluation checks `compliance_state = COMPLIANT` |
| Notifications       | Alerts for probation start, deadline approaching, confirmation |
| Audit               | Records all probation lifecycle events              |

---

# 2. Actors

## Employee (Probationer)

* Sees assigned gate trainings in "My Training"
* Completes trainings to unlock probation confirmation
* Receives notifications for start, reminders, deadline approaching

---

## HR

* Views all employees currently in probation
* Sees per-employee probation readiness: training checklist with completion status
* Confirms probation when all gate trainings are COMPLIANT
* Extends probation deadline with reason
* Marks probation as terminated when employment ends during probation

---

## Admin

* Configures probation training rules via the Training Add/Edit form (mandatory training scope = "New Joiners (Probation)" + designation/capability filter)
* Views probation status across the organisation
* Cannot override gate validation — must go through HR confirmation flow

---

# 3. Functional Overview

When a new employee is created with `employment_phase = PROBATION`, the system automatically:
1. Creates a `user_probation` record with start date and end date (joining_date + configured days)
2. Evaluates all active `mandatory_assignment_rules` with `rule_scope = EMPLOYMENT_PHASE`
3. Matches rules using `designation_filter` and `capability_filter` against the user's designation/capability
4. Creates assignments for matched rules with `is_probation_gate = true`
5. Notifies the employee with the list of required trainings and deadline

HR monitors probation status. When all `is_probation_gate = true` assignments for a user are `COMPLIANT`, the HR can confirm probation:
- System validates gate → `user_probation.probation_status = CONFIRMED`
- `users.employment_phase` updated to `CONFIRMED`
- Audit event emitted

If the deadline passes without completion, HR can extend the deadline. If employment ends during probation, HR marks it as `TERMINATED`.

---

# 4. Functional Requirements

## Probation Rule Configuration

Rules are configured within the Training Add/Edit form in Training Management:

* Admin creates/edits a training and enables "Mandatory Training"
* Sets "Assign To" = **New Joiners (Probation)**
* Optionally filters by **Designation** and/or **Capability**
* Sets **Due in days** (default 90)
* Enables **Required for probation completion** toggle (auto-enabled for this scope)
* The training must have `is_probation_gateway = true` to be selectable for this scope

Rules stored in `mandatory_assignment_rules` with:
- `rule_scope = EMPLOYMENT_PHASE`
- `designation_filter` (nullable)
- `capability_filter` (nullable)
- `is_probation_gate = true`
- `due_date_days_from_assignment = 90` (configurable)

---

## Probation Initiation

Triggered when:
- New user synced from Zoho with `employment_phase = PROBATION`
- Or manually created by Admin with `employment_phase = PROBATION`

System actions:
1. Creates `user_probation` record (status = PROBATION, end = joining_date + 90)
2. Evaluates EMPLOYMENT_PHASE rules → creates assignments with `is_probation_gate = true`
3. Sends `PROBATION_STARTED` notification to employee

---

## Probation Dashboard (HR)

HR sees a list of all employees currently in probation with:
- Name, designation, capability, department
- Probation start date, end date
- Number of gate trainings: total / completed / overdue
- Probation status badge: On Track / At Risk / Overdue
- "View Details" → per-employee probation checklist

Per-employee checklist:
- List of gate training assignments with status (COMPLIANT / PENDING / NON_COMPLIANT)
- "Confirm Probation" button — enabled only when all gates are COMPLIANT
- "Extend Deadline" button
- Probation timeline (start → end / extended_until)

---

## Probation Confirmation

1. HR clicks "Confirm Probation"
2. System validates: all `is_probation_gate = true` assignments for user are `COMPLIANT`
3. If validation passes:
   - `user_probation.probation_status = CONFIRMED`, `confirmed_at = now()`, `confirmed_by = HR user`
   - `users.employment_phase = CONFIRMED`
   - Audit event `PROBATION_COMPLETED` emitted
4. If validation fails: error returned — "X gate training(s) not yet completed"

---

## Probation Extension

1. HR clicks "Extend Deadline" and enters new date + reason
2. `user_probation.extended_until = new_date`, `extension_reason = reason`, `probation_status = EXTENDED`
3. `users.probation_end_date` updated
4. Audit event `PROBATION_EXTENDED` emitted
5. Employee notified

---

## Probation Termination

When user `employment_status = EXITED` during probation:
- `user_probation.probation_status = TERMINATED`
- `users.employment_phase = EXITED`
- No training completion generated

---

# 5. Business Rules

## Probation Initiation

BR-P01 When `employment_phase = PROBATION`, system evaluates all active EMPLOYMENT_PHASE rules and creates assignments with `is_probation_gate = true`

BR-P02 Probation end date = joining_date + rule's `due_date_days_from_assignment` (default 90 days)

BR-P03 `user_probation` record created automatically — HR does not manually start probation

BR-P04 If no matching rules exist for the user's designation/capability, probation is still initiated but no gate assignments are created; HR may confirm immediately

---

## Rule Matching

BR-P05 `designation_filter = null` means the rule applies to all designations within the EMPLOYMENT_PHASE scope

BR-P06 `capability_filter = null` means the rule applies to all capabilities within the EMPLOYMENT_PHASE scope

BR-P07 Both filters null = rule applies to ALL new joiners in probation

BR-P08 When multiple rules match, all are assigned independently (not deduplication — different trainings)

---

## Confirmation Gate

BR-P09 Probation confirmation blocked if any `is_probation_gate = true` assignment is not `COMPLIANT`

BR-P10 HR is the only actor who can confirm probation — system validates but Admin cannot bypass the gate

---

## Extension and Termination

BR-P11 Probation can only be extended if current status is `PROBATION` or `EXTENDED`

BR-P12 `CONFIRMED` and `TERMINATED` probation records cannot be modified

---

# 6. Workflows

## Probation Start Flow

User created with `employment_phase = PROBATION`
→ System creates `user_probation` (status = PROBATION, end = joining_date + 90)
→ Rule engine evaluates EMPLOYMENT_PHASE rules for matching designation + capability
→ For each matched rule: assignment created (`is_probation_gate = true`, `due_date = joining_date + rule.days`)
→ `PROBATION_STARTED` audit event + notification to employee

---

## Probation Confirmation Flow

HR opens employee probation detail
→ Sees training checklist (COMPLIANT / PENDING / NON_COMPLIANT per gate training)
→ If all COMPLIANT → "Confirm Probation" button enabled
→ HR clicks confirm → `POST /api/v1/probation/{user_id}/confirm`
→ System validates gate
→ `user_probation.probation_status = CONFIRMED`, `users.employment_phase = CONFIRMED`
→ `PROBATION_COMPLETED` audit event emitted

---

## Probation Extension Flow

HR clicks "Extend Deadline" on employee probation detail
→ Enters new deadline date + reason
→ `POST /api/v1/probation/{user_id}/extend`
→ `user_probation.extended_until = new_date`, `probation_status = EXTENDED`
→ `PROBATION_EXTENDED` audit event + employee notification

---

# 7. Edge Cases

## No Matching Rules

If no active EMPLOYMENT_PHASE rules match the new joiner's designation/capability: no gate assignments created. HR sees "No gate trainings configured" on probation detail. Confirmation is available immediately.

---

## Rule Added After Probation Started

Rules added after a user's probation has begun are not retroactively applied to existing probationers. Only future new joiners will be evaluated against the new rule.

---

## Training Inactivated After Assignment

If a probation gate training is inactivated after the assignment was created: the existing assignment remains. Completion still counts toward the gate.

---

## User Transferred to Different Designation/Capability During Probation

Existing gate assignments are not removed. New matching rules are not automatically re-evaluated. HR may manually handle such cases.

---

## Probation Deadline Passed Without Completion

No automatic status change — probation remains `PROBATION`. System flags the employee as overdue on the HR dashboard. HR must explicitly extend or terminate.

---

# 8. Acceptance Criteria

* When a user is created with `employment_phase = PROBATION`, a `user_probation` record is created and matching gate assignments are auto-generated
* HR dashboard shows all probationers with training completion status
* Per-employee checklist shows each gate training with COMPLIANT/PENDING/NON_COMPLIANT status
* "Confirm Probation" button is disabled when any gate training is not COMPLIANT
* Probation confirmation updates `employment_phase` and `probation_status` and emits audit event
* HR can extend probation with new deadline and reason
* Admin can configure probation rules via the Training Add/Edit form (mandatory training, scope = New Joiners (Probation))
* Rules can be filtered by designation and/or capability
* All probation lifecycle events emit correct audit entries

---

# 9. Dependencies

* User Management (`employment_phase`, `user_probation` table)
* Assignment Engine (`EMPLOYMENT_PHASE` rule scope, `is_probation_gate` flag)
* Training Management (`is_probation_gateway` flag on training items)
* Compliance module (gate evaluation uses `compliance_state`)
* Notifications
* Audit

---

# 10. Assumptions

* Probation period defaults to 90 days; configurable per rule
* Single active probation period per user at any time
* HR is responsible for confirmation; no automated confirmation
* Rules are evaluated once at user creation — not re-evaluated on hierarchy/designation changes during probation
* `<1000` users; single tenant

---

# 11. Audit Events

| Event | event_code | Minimum Data Captured |
|---|---|---|
| Probation started | `PROBATION_STARTED` | user_id, probation_id, start_date, end_date, correlation_id, timestamp |
| Probation training assigned | `PROBATION_TRAINING_ASSIGNED` | user_id, assignment_id, training_item_id, rule_id, due_date, correlation_id, timestamp |
| Probation confirmed | `PROBATION_COMPLETED` | user_id, probation_id, confirmed_by, gate_count, correlation_id, timestamp |
| Probation extended | `PROBATION_EXTENDED` | user_id, probation_id, old_end_date, new_end_date, reason, extended_by, correlation_id, timestamp |
| Probation terminated | `PROBATION_TERMINATED` | user_id, probation_id, terminated_by, correlation_id, timestamp |

---

# 12. Future Enhancements

* Manager visibility into direct report probation status
* Automatic notifications when probation deadline approaches (7-day, 3-day warning)
* Auto-extension rules (system extends automatically if within N days and almost complete)
* Probation period configuration at department or designation level (not just per rule)
* Probation gate override by Admin for exceptional cases

---

# End of Document
