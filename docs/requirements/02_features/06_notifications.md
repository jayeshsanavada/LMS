# Feature: Notifications

---

# 1. Feature Overview

## Purpose

The Notifications feature ensures that important LMS activities such as training assignments, approvals, session schedules, deadlines, and compliance requirements are communicated to users in a timely and structured manner.

This feature acts as the communication backbone of the LMS by converting system events into actionable information, ensuring that learning activities remain visible, trackable, and enforceable.

## Why Business Needs It

Training effectiveness depends on timely awareness. Without structured notifications:

* Assignments may be missed
* Deadlines ignored
* Approvals delayed
* Compliance gaps increase

The system must ensure:

* Users are informed of responsibilities
* Managers can act on approvals
* Compliance deadlines are enforced
* Manual communication is minimized

## Problems This Feature Solves

* Missed assignments
* Delayed approvals
* Missed sessions
* Compliance failures
* Manual reminder overhead
* Lack of communication traceability

## Integration with Other LMS Modules

| Module              | Notification Purpose                         |
| ------------------- | -------------------------------------------- |
| User Management     | Recipient identification (hierarchy + roles) |
| Training Management | Training lifecycle events                    |
| Assignment Engine   | Assignment, overdue, and escalation alerts   |
| Classroom Sessions  | Session updates and reminders                |
| Reporting           | Compliance monitoring alerts                 |
| Migration           | Historical data — no notifications triggered |

---

# 2. Actors

## Employee

* Receive assignment notifications
* Receive due date and overdue reminders
* Receive session alerts and reminders
* Receive approval outcomes
* Manage notification preferences
* View notification center (read / unread)

---

## Manager

Derived from hierarchy (NOT a role)

* Receive approval requests
* Receive overdue alerts for direct reports
* Receive session participation alerts for team

---

## Admin

* Monitor notification delivery failures
* Trigger manual retry of failed notifications
* Configure notification reminder schedules
* View notification failure log

---

## HR

* Receive compliance overdue escalation notifications (Day 30)

---

## External Systems

### Microsoft Teams

May send independent meeting reminders. LMS handles only LMS-triggered events — no cross-system deduplication required.

---

# 2A. User Scenarios

(No major change — already correct)

---

# 3. Functional Overview

The Notifications feature is **event-driven and asynchronous**.

Flow:

```
LMS Event occurs
→ Notification record created (synchronous)
→ Notification queued (idempotent — dedup key prevents duplicates)
→ Worker processes queue
→ Notification delivered (In-app + Email)
→ Delivery status updated
```

Notifications are triggered by:

* Assignment creation / cancellation
* Approval request submitted / approved / rejected / expired
* Session scheduled / rescheduled / cancelled / reminder before start
* Due date approaching reminder
* Overdue detection + escalation chain (Day 0 / Day 7 / Day 30)
* Training completion

Notifications must:

* Be delivered only to relevant users
* Never modify LMS state
* Reflect real-time system events
* Support both in-app (bell) and email delivery

---

# 4. Functional Requirements

## Event-Driven Notification Generation

System generates notifications based on LMS events.

Every notification:
* Created synchronously at event time
* Delivered asynchronously via worker queue
* Carries an idempotency key (`event_type + entity_id + recipient_id + date`) to prevent duplicates

---

## Delivery Channels (Phase 1)

### In-App Notifications
* Stored in `notifications` table
* Accessible via notification bell + notification center
* Supports: unread count badge, mark-as-read, mark-all-read, paginated history

### Email Notifications
* Email sent via configured SMTP/email service
* Subject and body rendered from per-event templates
* Template variables: `{{recipient_name}}`, `{{training_title}}`, `{{due_date}}`, `{{session_date}}`, `{{approver_name}}`, etc.
* Failed emails retried automatically (configurable: max 3 retries, 15-min backoff)
* Failure logged to `notification_delivery_log`

---

## Notification Event Catalog

All notification triggers, recipients, and reminder timing:

| Event Code | Trigger | Primary Recipient | Secondary Recipient | Notes |
|---|---|---|---|---|
| `ASSIGNMENT_CREATED` | Assignment created | Employee | — | Immediate |
| `ASSIGNMENT_CANCELLED` | Assignment cancelled | Employee | — | Immediate |
| `ASSIGNMENT_DUE_REMINDER` | X days before due date | Employee | — | Configurable: default 7 days before |
| `ASSIGNMENT_OVERDUE_D0` | Due date passed, not complete | Employee | — | Day 0 of overdue |
| `ASSIGNMENT_OVERDUE_D7` | 7 days overdue, still incomplete | Manager (hierarchy) | — | Day 7 escalation |
| `ASSIGNMENT_OVERDUE_D30` | 30 days overdue, still incomplete | HR + Admin | — | Day 30 escalation |
| `APPROVAL_REQUEST_SUBMITTED` | Employee submits request | Manager (hierarchy) | — | Immediate |
| `APPROVAL_REQUEST_APPROVED` | Manager approves request | Employee | — | Immediate |
| `APPROVAL_REQUEST_REJECTED` | Manager rejects request | Employee | — | Immediate with reason |
| `APPROVAL_REQUEST_EXPIRED` | Request expires (30 days) | Employee | — | On expiry |
| `SESSION_INVITED` | Participant added to session | Employee | — | Immediate with Teams link |
| `SESSION_RESCHEDULED` | Session date/time/location changed | All INVITED, NOMINATED, and CONFIRMED participants | — | Immediate |
| `SESSION_CANCELLED` | Session cancelled | All INVITED, NOMINATED, and CONFIRMED participants | — | Immediate with reason |
| `SESSION_REMINDER_24H` | 24 hours before session start | Employee | — | Configurable |
| `SESSION_REMINDER_1H` | 1 hour before session start | Employee | — | Configurable |
| `TRAINING_COMPLETED` | Assignment marked COMPLETED | Employee | — | Immediate |
| `SESSION_PARTICIPANT_REMOVED` | Participant removed from session | Employee | — | Immediate |
| `SESSION_NOMINATED` | Manager nominates employee for session | Employee | — | Immediate |
| `SESSION_NOMINATION_CANCELLED` | Nomination cancelled by manager | Employee | — | Immediate |
| `SESSION_NOMINATION_DECIDED` | Admin approves or rejects nomination | Employee | — | Immediate with decision |
| `INTEGRATION_SYNC_FAILED` | Integration health status transitions to `DOWN` (`consecutive_failures` ≥ 3 or no success in > 24h) | Admin | — | Immediate; includes integration name and last error summary |

---

## Reminder Schedule Configuration

Reminder timing is configurable by Admin:

| Reminder | Default | Configurable |
|---|---|---|
| Due date pre-reminder | 7 days before | Yes |
| Overdue Day 0 | 0 days (immediate) | No |
| Overdue Day 7 escalation | 7 days | Yes |
| Overdue Day 30 escalation | 30 days | Yes |
| Session reminder (first) | 24 hours before | Yes |
| Session reminder (second) | 1 hour before | Yes |

Background job evaluates reminders daily and generates notifications based on configured thresholds.

---

## Duplicate Prevention

Each notification generated carries an **idempotency key**:

```
{event_type}:{entity_id}:{recipient_user_id}:{date_bucket}
```

Where `date_bucket` is the calendar date (YYYY-MM-DD) for daily reminders, or ISO timestamp for instant events.

System checks for existing notification with the same idempotency key before inserting. Duplicates are silently discarded.

---

## Notification Center (In-App)

Users must be able to:

* View notification list (paginated, most recent first)
* See unread count badge on bell icon
* Mark individual notification as read
* Mark all notifications as read
* Filter by: All / Unread / By type

Visibility rules:
* Employees see only their own notifications
* Managers see their own notifications (team alerts are delivered as their own notifications — no cross-user visibility)
* Admin sees their own notifications + failure log (separate view)

---

## User Notification Preferences

Users can opt out of **non-mandatory** notification types.

Mandatory notifications (cannot be opted out):
* `ASSIGNMENT_CREATED`
* `ASSIGNMENT_CANCELLED`
* `APPROVAL_REQUEST_*` (all approval events)
* `SESSION_CANCELLED`

Opt-out allowed:
* `ASSIGNMENT_DUE_REMINDER`
* `SESSION_REMINDER_24H`
* `SESSION_REMINDER_1H`
* `TRAINING_COMPLETED`

Opt-out stored per user per notification type per channel (in-app vs email independently configurable).

---

## Notification Template Management

Each `event_code` has a system-managed template with:
* Subject (email only)
* Body (in-app short text + email HTML body)
* Available variable list per event type

Templates are not user-editable in Phase 1. Admin-editable template management is a Phase 2 enhancement.

---

## Admin Failure Monitoring

Admin can view:
* Failed notification log (filtered by date, event type, recipient)
* Retry count per notification
* Current delivery status per notification
* Manual retry trigger for specific failed notifications

Background worker automatically retries failed deliveries up to 3 times with 15-minute backoff.

---

## Migration Behavior

* Migrated data must NOT trigger notifications
* `is_migrated = true` records skip all notification generation
* Only new post-migration events generate notifications

---

# 5. Business Rules

## Notification Governance

BR-01 Notifications are event-driven only — no manual admin-composed notifications (Phase 1)
BR-02 Notifications are informational only — they never modify LMS state
BR-03 Both in-app and email notifications are Phase 1 delivery channels

---

## Authorization Rules

BR-04 Global roles define base notification routing
BR-05 Hierarchy defines manager-level notifications (direct reports only, depth = 1)
BR-06 Users only see their own notifications — no cross-user visibility

---

## Assignment Notification Rules

BR-07 Assignment creation triggers immediate notification to employee
BR-08 Assignment cancellation triggers immediate notification to employee
BR-09 Due date pre-reminder sent X days before due date (default 7, configurable)
BR-10 Overdue Day 0: employee notified
BR-11 Overdue Day 7: manager (via hierarchy) notified if still incomplete
BR-12 Overdue Day 30: HR + Admin notified if still incomplete
BR-13 Overdue reminders stop when assignment is COMPLETED or CANCELLED

---

## Approval Notification Rules

BR-14 Approval request submission notifies manager (via hierarchy) immediately
BR-15 Approval/rejection notifies employee immediately with decision reason
BR-16 Approval request expiry notifies employee on expiry date

---

## Session Notification Rules

BR-17 Participant invite notifies employee immediately with Teams link
BR-18 Session reschedule re-notifies all INVITED, NOMINATED, and CONFIRMED participants immediately
BR-19 Session cancellation notifies all INVITED, NOMINATED, and CONFIRMED participants immediately
BR-20 Session reminders sent 24h and 1h before start (configurable)
BR-21 Participant removal notifies the removed employee immediately

---

## Duplicate Prevention Rules

BR-22 Idempotency key check prevents duplicate notifications for same event + recipient + day
BR-23 Reminder jobs check for existing reminder before creating a new one

---

## Delivery Rules

BR-24 Notification created synchronously at event time
BR-25 Delivery via worker queue — asynchronous
BR-26 Failed email retried max 3 times with 15-minute backoff
BR-27 Failed in-app notifications retried max 3 times
BR-28 All delivery attempts (success and failure) logged in `notification_delivery_log`

---

## Preference Rules

BR-29 Mandatory notification types cannot be opted out
BR-30 User preferences are per-type per-channel (in-app and email configured independently)
BR-31 No notification sent if user has opted out for that type + channel (except mandatory)

---

## Retention Rules

BR-32 Notifications retained for 90 days (configurable via Admin settings)
BR-33 Background job purges notifications older than retention period
BR-34 `notification_delivery_log` follows same retention policy

---

## Migration Rules

BR-35 Migrated data records (`is_migrated = true`) do not generate notifications

---

# 6. Workflows

## Assignment Notification

Assignment created
→ Notification record created (in-app + email queued)
→ Worker processes queue
→ In-app notification stored; email sent
→ Employee sees bell badge

---

## Approval Workflow

Request submitted
→ Manager notified (in-app + email)
→ Manager approves/rejects
→ Employee notified with decision

OR

No response in 30 days
→ Request expires
→ Employee notified of expiry

---

## Session Reminder Workflow

Session scheduled
→ SESSION_INVITED notification → participant notified immediately
→ Background job runs daily
→ 24h before: SESSION_REMINDER_24H generated
→ 1h before: SESSION_REMINDER_1H generated

---

## Overdue Escalation Workflow

Background job (daily)
→ Finds assignments overdue Day 0 → ASSIGNMENT_OVERDUE_D0 → Employee
→ Finds assignments overdue Day 7+ → ASSIGNMENT_OVERDUE_D7 → Manager
→ Finds assignments overdue Day 30+ → ASSIGNMENT_OVERDUE_D30 → HR + Admin

---

## Failure Retry Workflow

Delivery attempt fails
→ Retry counter incremented
→ Re-queued with 15-min backoff
→ After 3 failures: status = PERMANENTLY_FAILED
→ Logged in `notification_delivery_log` for Admin review

---

# 7. Data Rules

## Data Ownership

| System      | Data                         |
| ----------- | ---------------------------- |
| LMS         | Notifications, delivery logs, preferences |
| Employee DB | Hierarchy (for recipient resolution) |
| Keycloak    | Identity / email address     |

---

## Data Edit Rules

* Notification content → system (templates)
* Delivery status → system (worker)
* Preferences → user (self-service)
* Reminder schedule → Admin configuration

---

## Identifiers

* Notification ID (UUID)
* Idempotency key (composite string)
* Delivery log ID (UUID)
* User ID
* Entity reference ID (assignment_id / session_id / request_id)

---

## Retention

* Notifications: 90 days (configurable)
* Delivery log: 90 days (configurable)
* Preferences: permanent (until user updates)

---

## Sync Behavior

* Notifications generated even if external integrations fail
* Delivery retry handled by worker
* Email failure does not block in-app delivery

---

# 8. Edge Cases

## Duplicate Events

Idempotency key prevents same notification being generated twice for the same event + recipient + day.

---

## Inactive User

* No new notifications generated for deactivated users
* In-flight notifications at deactivation time are discarded by worker
* Historical notification records retained

---

## Missing Manager (Approval / Overdue D7)

* If `approver_user_id` is null on approval request: notification routed to Admin
* If user has no manager in hierarchy at overdue D7: notification routed to Admin

---

## Notification Preference Not Set

* If no preference record exists for a user + type: default = opted-in (notifications sent)

---

## Email Permanently Failed

* After 3 retries: status = PERMANENTLY_FAILED
* In-app notification unaffected (delivered independently)
* Admin can see in failure log and manually retry

---

## Session Rescheduled Multiple Times

* Each reschedule generates a new SESSION_RESCHEDULED notification
* Previous reminder (24h/1h) jobs are cancelled and re-scheduled based on new datetime

---

# 9. Acceptance Criteria

* Assignment notifications generated and delivered (in-app + email) immediately
* Approval notifications generated for all flow states (submitted / approved / rejected / expired)
* Session notifications generated for all lifecycle events (invite / reschedule / cancel / reminders)
* Overdue escalation chain works: Day 0 → employee, Day 7 → manager, Day 30 → HR+Admin
* Due date pre-reminder sent X days before (configurable)
* Duplicate prevention works — no duplicate notifications for same event
* User preferences respected — opted-out types not delivered
* Mandatory notification types cannot be opted out
* Failed delivery retried max 3 times; permanently failed logged
* Admin can view failure log and manually retry
* Notification center shows unread badge, mark-as-read, mark-all-read
* Migration records do not trigger notifications
* Notification retention purge runs correctly after configured period

---

# 10. Dependencies

* Assignment Engine (overdue + assignment events)
* Training Management (completion events)
* Classroom Sessions (session events)
* User Management (recipient resolution, email address)
* Employee DB (hierarchy — manager resolution)
* Worker service (async delivery)
* SMTP / email service

---

# 11. Assumptions

* < 1000 users; single tenant
* On-prem deployment
* SSO mandatory
* Hierarchy-based manager resolution (depth = 1)
* Email service available (SMTP or equivalent)
* Async processing supported via background worker
* OpenAPI integration model

---

# 12. Audit Events

| Event | event_code | Minimum Data Captured |
|---|---|---|
| Notification created | `NOTIFICATION_CREATED` | notification_id, event_type, recipient_user_id, entity_id, correlation_id, timestamp |
| Notification delivered | `NOTIFICATION_DELIVERED` | notification_id, channel, delivered_at, correlation_id, timestamp |
| Notification failed | `NOTIFICATION_DELIVERY_FAILED` | notification_id, channel, retry_count, error_message, correlation_id, timestamp |
| Preference updated | `NOTIFICATION_PREFERENCE_UPDATED` | user_id, event_type, channel, opted_in, correlation_id, timestamp |

---

# 13. Future Enhancements

* Microsoft Teams channel notifications
* Admin-editable notification templates
* Per-notification-type digest / batching
* Push notifications (mobile — Phase 2)
* Notification scheduling (send at preferred time)
* Manager-configurable team notification preferences

---

# End of Document
