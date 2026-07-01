# Feature: Audit (Audit Logs & System Activity Governance)

---

# 1. Feature Overview

## Purpose

The Audit feature provides a complete, immutable, and traceable history of critical LMS activities to ensure transparency, accountability, and compliance readiness.

It captures user actions, administrative changes, system processes, and integration activity to create a reliable operational trace across the entire LMS.

This feature acts as the **traceability and governance layer** of the platform.

---

## Why Business Needs It

Organizations require auditability to:

* Support compliance and regulatory audits
* Investigate operational issues
* Validate approvals and assignments
* Ensure accountability
* Monitor security events
* Diagnose integration failures

Without audit logs, LMS operations cannot be verified or trusted.

---

## Problems This Feature Solves

* Lack of traceability
* Unverifiable approvals
* Missing compliance evidence
* Difficult troubleshooting
* Undetected unauthorized changes
* No integration visibility

---

## Integration with Other LMS Modules

Audit spans across all modules. Every module emits audit events — this module stores, searches, and exposes them.

| Module          | Audit Purpose                              |
| --------------- | ------------------------------------------ |
| Auth            | Login, logout, access denied               |
| User Management | Lifecycle, hierarchy, sync tracking        |
| Training        | Creation, updates, publish, inactivation   |
| Assignment      | Assignment lifecycle, approvals            |
| Sessions        | Session changes, attendance                |
| Notifications   | Delivery events                            |
| Reporting       | Export and dashboard access                |
| Integrations    | Sync execution, API access                 |
| Admin           | Configuration changes                      |
| Migration       | Data import traceability                   |

Audit records behavior but **does not modify system logic**.

---

# 2. Actors

## Employee

* Generates audit records via their actions
* Has **no access** to audit logs

---

## Manager

Derived from hierarchy (NOT a role)

* Generates audit records through approvals and assignments
* Can view audit events scoped to their direct reports (TEAM_ONLY, restricted event types only)

---

## Admin

Primary audit consumer.

* Search all audit logs (ORG_WIDE)
* View audit record detail
* Export audit logs (Excel / PDF)
* View write failure log
* Trigger retry of failed audit writes

---

## HR

* View compliance-relevant audit events (scoped event types — see §4.3)
* Generate compliance audit export
* Cannot view security, config, or integration events

---

# 2A. User Scenarios

(No major change — already correct)

---

# 3. Functional Overview

The Audit feature is **event-driven and asynchronous**.

```
Action occurs in any LMS module
→ Audit event emitted (non-blocking)
→ Written to audit queue
→ Worker writes to audit_logs (immutable)
→ If write fails → written to audit_write_failures (dead-letter)
```

### Audit Record Must Capture

* Who performed the action (`actor_user_id`, `actor_type`)
* What action occurred (`event_code`, `action_name`)
* When it occurred (`created_at`)
* What changed (`previous_value_json`, `new_value_json`) — with masking
* Which module and entity was involved (`module_name`, `entity_type`, `entity_id`)
* Source system (`source_system` — for integration-triggered events)
* Correlation ID (`correlation_id` — links all events from one request)
* IP address and HTTP method for security events

---

### Key Design Principles

* Immutable records — no update or delete ever
* Non-blocking — audit write failure never fails the originating operation
* Async — written via worker queue
* Sensitive data masked before storage
* 5-year retention (regulatory compliance standard)
* Correlation ID enables full trace of any operation across modules

---

# 4. Functional Requirements

## 4.1 Activity Tracking

### Auth Events
* Login success / failure
* Logout
* Policy acceptance
* Access denied

### User Management Events
* User created (sync or manual)
* User updated / field overridden
* User deactivated / reactivated
* Bulk deactivation
* Sync completed / failed
* Hierarchy change recorded

### Training Events
* Training created / updated / published / inactivated / cloned
* Resource added / removed
* Prerequisite added / removed
* Certificate issued

### Assignment Events
* Assignment created / cancelled / completed / overdue
* Due date updated
* Recertification triggered

### Approval Events
* Request submitted / approved / rejected / expired

### Session Events
* Session created / rescheduled / completed / cancelled
* Participant added / removed
* Attendance recorded / overridden

### Notification Events
* Notification delivery success / failure
* Preference updated

### Reporting Events
* Report exported
* Dashboard accessed

### Integration Events
* Sync started / completed / failed
* PES API accessed

### Admin Config Events
* Configuration updated
* Role mapping updated

### Migration Events
* Migration started / completed / failed

---

## 4.2 Correlation ID Linkage

Every inbound HTTP request must carry a `X-Correlation-ID` header (UUID v4). If absent, the gateway generates one.

* The correlation ID propagates to all audit events generated within that request
* A single user action (e.g. "Assign training to team") may emit multiple audit events — all share the same correlation ID
* Querying by `correlation_id` returns the full trace of an operation across modules
* Background job events use a system-generated correlation ID per job run

---

## 4.3 Access Control

### Admin
* Full access — all event types, all users, ORG_WIDE

### HR
Restricted to compliance-relevant event types only:

| Accessible Categories |
|---|
| `ASSIGNMENT_*` |
| `APPROVAL_*` |
| `TRAINING_*` |
| `SESSION_*` |
| `CERTIFICATE_*` |
| `USER_CREATED`, `USER_DEACTIVATED`, `USER_REACTIVATED` |

HR cannot see: `AUTH_*`, `ADMIN_CONFIG_*`, `NOTIFICATION_*`, `INTEGRATION_*`, `MIGRATION_*`

### Manager
Scoped to direct reports (TEAM_ONLY, hierarchy depth = 1). Restricted to:

| Accessible Event Types |
|---|
| `ASSIGNMENT_*` |
| `APPROVAL_*` |
| `SESSION_*` (where their team members are participants) |

Manager cannot see: `AUTH_*`, `ADMIN_*`, `USER_SYNC_*`, `NOTIFICATION_*`, `INTEGRATION_*`

### Employee
No access to audit logs.

---

## 4.4 Sensitive Data Masking

Before storing `previous_value_json` and `new_value_json`, the following fields must be masked:

| Field | Masking Rule |
|---|---|
| `email` | Partial mask: `j***@company.com` |
| `password` | Full mask: `[REDACTED]` |
| `token` / `access_token` / `refresh_token` | Full mask: `[REDACTED]` |
| `api_key` / `client_secret` | Full mask: `[REDACTED]` |
| `teams_meeting_link` | Stored as-is (not sensitive) |

Masking applied by audit service before write — source modules do not mask before emitting.

---

## 4.5 Audit Write Failure Handling

If the audit worker fails to write a record after 3 retries:

* Record is written to `audit_write_failures` table (dead-letter)
* Admin notified via notification system
* Background job retries dead-letter records once per hour
* After 24 hours unresolved: flagged as `PERMANENTLY_FAILED` in `audit_write_failures`
* **The originating LMS operation is never blocked or rolled back due to audit failure**

---

## 4.6 Audit Search

Admins (and scoped HR / Manager access) can search using:

* `event_code` (exact or wildcard)
* `actor_user_id`
* `module_name`
* `entity_type` + `entity_id`
* `correlation_id` (trace full operation)
* `date_from` / `date_to`
* `actor_type` (`USER` / `SYSTEM` / `INTEGRATION`)
* `source_system`

Results paginated (max 100 per page). Full-text search on `event_code` and `action_name` via PostgreSQL `tsvector`.

---

## 4.7 Audit Export

Admin and HR can export filtered audit log results as **Excel (.xlsx)** or **PDF**.

Export follows async job pattern (POST → poll → download). Exports available for download for 24 hours.

---

# 5. Business Rules

## Audit Integrity

BR-01 Audit logs are immutable — no UPDATE or DELETE ever permitted
BR-02 No user (including Admin) can modify or delete an audit record
BR-03 Audit write failure never blocks the originating LMS operation

---

## Retention

BR-04 Audit logs retained for minimum **5 years**
BR-05 `audit_write_failures` retained for 90 days
BR-06 Background purge job deletes records older than retention period
BR-07 Migration audit logs retained **permanently** (no purge)

---

## Async Architecture

BR-08 Audit events emitted non-blocking — write happens via worker queue
BR-09 Failed writes retried 3 times; then moved to dead-letter (`audit_write_failures`)
BR-10 Dead-letter records retried hourly by background job
BR-11 Admin notified when record enters dead-letter

---

## Masking

BR-12 `email` masked as partial before storage
BR-13 `password`, `token`, `api_key`, `client_secret` fully redacted before storage
BR-14 Masking applied by audit service — source modules emit raw data

---

## Access Control

BR-15 Admin: full ORG_WIDE access to all event types
BR-16 HR: ORG_WIDE access to compliance-relevant event types only (see §4.3)
BR-17 Manager: TEAM_ONLY access to assignment/approval/session events for direct reports only
BR-18 Employee: no access

---

## Correlation ID

BR-19 Every HTTP request carries a Correlation ID — generated by gateway if absent
BR-20 All audit events from one request share the same Correlation ID
BR-21 Background jobs generate their own system Correlation ID per run

---

## Export

BR-22 Export formats: Excel (.xlsx) and PDF only
BR-23 Export is async — POST creates job, poll for status, download when READY
BR-24 Export file retained for 24 hours then purged

---

# 6. Master Event Code Catalog

All event codes emitted across the LMS. Source module is the system that emits the event; Audit module stores all of them.

### Auth
| Event Code | Description |
|---|---|
| `LOGIN_SUCCESS` | User authenticated successfully |
| `LOGIN_FAILED` | Authentication attempt failed |
| `LOGOUT` | User logged out |
| `POLICY_ACCEPTED` | User accepted usage policy |
| `ACCESS_DENIED` | Authorization check failed |
| `TOKEN_INVALID` | JWT token failed validation |
| `TOKEN_EXPIRED` | JWT token has expired |

### User Management
| Event Code | Description |
|---|---|
| `USER_CREATED` | New user created (sync or manual) |
| `USER_UPDATED` | User attributes updated |
| `USER_FIELD_OVERRIDDEN` | Admin overrode a sync-managed field |
| `USER_DEACTIVATED` | User deactivated |
| `USER_REACTIVATED` | User reactivated |
| `USER_BULK_DEACTIVATED` | Multiple users deactivated in one operation |
| `USER_SYNC_COMPLETED` | Zoho/Employee DB sync completed |
| `USER_SYNC_FAILED` | Sync failed |
| `USER_SYNC_CONFLICT` | Conflict detected between Zoho and Employee DB values for the same field |
| `USER_HIERARCHY_CHANGED` | Manager relationship updated |
| `USER_CAPABILITIES_UPDATED` | Admin manually added or removed capabilities for a user |
| `USER_CAPABILITIES_SYNCED` | User capabilities replaced from Employee DB on-demand sync |

### Training Management
| Event Code | Description |
|---|---|
| `TRAINING_CREATED` | New training item created |
| `TRAINING_UPDATED` | Training metadata updated |
| `TRAINING_PUBLISHED` | Training published (version incremented) |
| `TRAINING_VERSION_CREATED` | New version created on re-publish of a changed training item |
| `TRAINING_INACTIVATED` | Training marked inactive |
| `TRAINING_ARCHIVED` | Training archived (recoverable) |
| `TRAINING_RESTORED` | Training restored from archive |
| `TRAINING_CLONED` | Training cloned from existing |
| `TRAINING_RESOURCE_ADDED` | Resource added to training |
| `TRAINING_RESOURCE_REMOVED` | Resource removed from training |
| `PREREQUISITE_ADDED` | Prerequisite relationship added |
| `PREREQUISITE_REMOVED` | Prerequisite relationship removed |
| `TRAINING_COMPLETED` | Training item completed by a user (course/path/curriculum level) |
| `TRAINING_COMPLETION_EXPIRED` | Training completion expired; recertification triggered |
| `CERTIFICATE_ISSUED` | Certificate generated for completion |
| `CERTIFICATE_APPROVED` | Admin approved certificate for download |
| `CERTIFICATE_REJECTED` | Admin rejected certificate with reason |
| `ASSESSMENT_ATTEMPT_SUBMITTED` | Employee submitted an assessment attempt (pass or fail) |
| `ASSESSMENT_ATTEMPTS_EXHAUSTED` | Employee used all allowed attempts without passing |
| `ASSESSMENT_ATTEMPTS_RESET` | Admin reset attempt count to allow employee to retry |

### Assignment Engine
| Event Code | Description |
|---|---|
| `ASSIGNMENT_CREATED` | Assignment created (any source) |
| `ASSIGNMENT_CANCELLED` | Assignment cancelled |
| `ASSIGNMENT_COMPLETED` | Assignment marked completed |
| `ASSIGNMENT_OVERDUE` | Assignment detected as overdue |
| `ASSIGNMENT_DUE_DATE_UPDATED` | Due date changed |
| `ASSIGNMENT_RECERTIFICATION_CREATED` | Recertification assignment auto-created |
| `APPROVAL_REQUEST_SUBMITTED` | Employee submitted training request |
| `APPROVAL_REQUEST_APPROVED` | Request approved by manager/admin |
| `APPROVAL_REQUEST_REJECTED` | Request rejected |
| `APPROVAL_REQUEST_EXPIRED` | Request expired after configured days |

### Sessions
| Event Code | Description |
|---|---|
| `SESSION_CREATED` | New session created |
| `SESSION_RESCHEDULED` | Session date/time/location updated |
| `SESSION_COMPLETED` | Session marked completed |
| `SESSION_CANCELLED` | Session cancelled |
| `SESSION_PARTICIPANT_ADDED` | Participant added to session |
| `SESSION_PARTICIPANT_REMOVED` | Participant removed from session |
| `SESSION_NOMINATED` | Manager nominated employee for session |
| `SESSION_NOMINATION_CANCELLED` | Nomination cancelled |
| `SESSION_NOMINATION_DECIDED` | Admin approved or rejected nomination |
| `SESSION_ATTENDANCE_RECORDED` | Attendance recorded (any source) |
| `SESSION_ATTENDANCE_OVERRIDDEN` | Admin overrode auto-recorded attendance |
| `SESSION_ATTENDANCE_IMPORTED` | Attendance bulk-imported via Excel upload |

### Notifications
| Event Code | Description |
|---|---|
| `NOTIFICATION_CREATED` | Notification record created in the system |
| `NOTIFICATION_DELIVERED` | Notification successfully delivered |
| `NOTIFICATION_DELIVERY_FAILED` | Delivery attempt failed |
| `NOTIFICATION_PREFERENCE_UPDATED` | User updated notification preferences |

### Probation
| Event Code | Description |
|---|---|
| `PROBATION_STARTED` | Probation period started for a new employee |
| `PROBATION_TRAINING_ASSIGNED` | Probation gateway training assigned to employee |
| `PROBATION_COMPLETED` | Probation confirmed — all gate trainings completed |
| `PROBATION_EXTENDED` | Probation period extended by HR |
| `PROBATION_TERMINATED` | Employment terminated during probation |

### Reporting
| Event Code | Description |
|---|---|
| `REPORT_EXPORTED` | Report export job completed |
| `DASHBOARD_ACCESSED` | Dashboard view loaded |

### Integrations
| Event Code | Description |
|---|---|
| `SYNC_STARTED` | Scheduled sync started |
| `SYNC_COMPLETED` | Sync completed successfully |
| `SYNC_FAILED` | Sync failed |
| `PES_API_ACCESSED` | PES called LMS compliance API |

### Admin Configuration
| Event Code | Description |
|---|---|
| `ADMIN_CONFIG_UPDATED` | Admin setting changed |
| `ROLE_MAPPING_UPDATED` | Role mapping configuration changed |

### Migration
| Event Code | Description |
|---|---|
| `MIGRATION_STARTED` | Migration job started |
| `MIGRATION_COMPLETED` | Migration job completed |
| `MIGRATION_FAILED` | Migration job failed |

---

# 7. Workflows

## Normal Audit Write

LMS event occurs
→ Audit event object constructed (with masking applied)
→ Emitted to async audit queue (non-blocking)
→ Worker picks up and writes to `audit_logs`
→ Write confirmed

---

## Audit Write Failure

Worker write attempt fails
→ Retry up to 3 times (immediate backoff)
→ After 3 failures: written to `audit_write_failures`
→ Admin notification sent
→ Background job retries hourly
→ After 24h unresolved: status = PERMANENTLY_FAILED

---

## Audit Search (Admin)

Admin opens audit search
→ Applies filters (event_code / actor / date_range / correlation_id)
→ Paginated results returned
→ Detail view shows full record including correlation-linked events

---

## Compliance Audit Export (HR)

HR applies filters (event types within allowed scope)
→ POST /audit/export with format + filters
→ Async job generates file
→ HR downloads Excel / PDF within 24h

---

# 8. Data Rules

## Retention

* Audit logs: **5 years minimum**
* `audit_write_failures`: 90 days
* Migration audit logs: **permanent**
* Export files: 24 hours

## Edit Rules

* `audit_logs`: immutable — INSERT only, no UPDATE or DELETE
* `audit_write_failures`: INSERT and status UPDATE only (by system)

## Identifiers

* Event ID (UUID)
* Correlation ID (UUID v4 — cross-module trace)
* Actor User ID (UUID — nullable for system events)
* Entity ID (UUID — the record the event is about)

---

# 9. Edge Cases

## Audit Queue Unavailable

LMS operation completes normally. Event is buffered or retried. If buffer full: event written directly to `audit_write_failures`. System never blocks.

## Masking Configuration Error

If masking fails for a record, audit write is aborted and event goes to dead-letter. Unmasked sensitive data is never written to `audit_logs`.

## Manager Queries Audit for Non-Report

Returns empty result — no error. TEAM_ONLY scope enforced silently.

## Correlation ID Missing on Request

Gateway generates a new UUID v4 before passing to backend. All downstream events tagged with generated ID.

## Purge Job Running During Active Investigation

Purge job respects a `legal_hold` flag on `audit_logs` records. Admin can flag records to exempt them from purge.

---

# 10. Acceptance Criteria

* All event types from §6 catalog are logged correctly
* Audit records are immutable — no API or DB path allows modification or deletion
* Sensitive fields masked before storage (email partial, tokens/keys fully redacted)
* Admin can search by all defined filter dimensions
* Correlation ID links all events from one request
* HR can only see compliance-relevant event types
* Manager can only see direct-report-scoped assignment/approval/session events
* Employee cannot access audit logs
* Write failure handling: retried 3 times, then dead-lettered, admin notified
* Export works (Excel / PDF) via async job pattern
* 5-year retention enforced; purge job runs correctly
* Migration logs marked permanent — never purged

---

# 11. Dependencies

* All LMS modules (event emitters)
* Worker service (async write)
* PostgreSQL (full-text search via tsvector)
* Notification system (dead-letter alert to Admin)

---

# 12. Assumptions

* < 1000 users; single tenant; on-prem
* PostgreSQL full-text search sufficient at this scale
* 5-year retention = enterprise compliance standard
* Correlation ID generated by APISIX gateway if not in request
* No external SIEM integration in Phase 1

---

# 13. Audit Events (Self-referential)

The Audit module does not emit audit events for audit log reads (to prevent infinite recursion). Export operations emit `REPORT_EXPORTED` via the Reporting module.

---

# 14. Future Enhancements

* SIEM integration (Splunk / ELK export)
* Real-time alerting on suspicious patterns
* Legal hold management UI
* Risk scoring and anomaly detection
* Audit investigation workflow
* Scheduled audit report delivery

---

# End of Document
