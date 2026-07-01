# Feature: Admin (Administration & System Governance)

---

# 1. Feature Overview

## Purpose

The Admin feature provides centralized governance, configuration control, and operational oversight for the LMS platform. It enables authorized administrators to manage global roles, configure system behavior, monitor integrations, and maintain overall platform stability.

This feature acts as the **governance layer of the LMS**, ensuring the system operates securely, consistently, and in alignment with organizational policies.

## Why Business Needs It

Enterprise LMS platforms require strong governance to ensure:

* Secure and controlled access
* Consistent system behavior
* Reliable integrations
* Compliance alignment
* Operational stability

The Admin module ensures:

* Centralized system control
* Controlled configuration changes
* Integration monitoring
* Security enforcement
* Failure visibility

## Problems This Feature Solves

* Uncontrolled access permissions
* Misconfigured system behavior
* Lack of integration visibility
* Operational troubleshooting challenges
* Security risks
* Governance inconsistencies

## Integration with Other LMS Modules

| Module              | Administrative Purpose                            |
| ------------------- | ------------------------------------------------- |
| User Management     | Global role governance                            |
| Assignment Engine   | Assignment policy control, mandatory rule config  |
| Training Management | Training lifecycle governance                     |
| Sessions            | Session control                                   |
| Notifications       | Notification configuration (retention, reminders) |
| Integrations        | Integration monitoring                            |
| Reporting           | Data visibility governance, export retention      |
| Audit               | Governance tracking, audit retention config       |
| Migration           | Migration execution control                       |

---

# 2. Actors

## Employee

* Operates within defined permissions
* No administrative access

---

## Manager

Derived from hierarchy (NOT a role)

* Operates within assigned permissions
* Cannot modify system configuration

---

## Admin

Primary governance actor.

Responsibilities:

* Manage global roles (assign/remove via Keycloak Admin API)
* Configure system settings (typed key-value store)
* Manage mandatory assignment rules
* Monitor integrations
* Manage migration execution
* Review operational health
* Handle exceptions
* Ensure system stability

---

## HR

* Supports compliance-related governance
* Aligns training policies

---

## External Systems

### Zoho HR

Employee master data source

---

### Employee/Timesheet Database

Provides:

* Reporting hierarchy
* Capability
* Designation

Admin does NOT modify this data

---

### Keycloak

Provides:

* Authentication
* Global roles
* Admin role assignment is executed via Keycloak Admin API

---

### PES

Consumes compliance data

---

### Microsoft Teams

Provides session delivery

---

### OneDrive

Provides document storage

---

# 3. Functional Overview

The Admin feature enables administrators to govern LMS behavior through:

* Global role management
* System configuration management (typed, validated key-value store)
* Mandatory assignment rule management
* Integration monitoring
* Migration control
* Operational visibility

### Key Design Principle

Admin controls **system behavior**, not **external data**.

### Authorization Model

* Global roles managed via Keycloak
* Hierarchy-based access NOT managed by Admin
* Manager access is derived dynamically from Employee DB

---

# 4. Functional Requirements

## 4.1 Global Role Management

Admin must manage global roles only:

* `ADMIN`
* `HR`
* `EMPLOYEE`

**Mechanism:**

* Admin calls LMS API → LMS calls Keycloak Admin API → role assigned/removed in Keycloak
* LMS reads roles from JWT at runtime — no local role table
* Role changes take effect on next login (JWT refresh)

**Rules:**

* Only Admin can assign or remove global roles
* Manager is NOT a role — it is derived from `user_hierarchy.manager_user_id`
* **Last Admin Protection:** Removing the ADMIN role from a user is blocked if they are the last active user with the ADMIN role (`LAST_ADMIN_PROTECTED` error, 422)
* Deactivating a user who is the last active Admin is blocked (`LAST_ADMIN_PROTECTED` error, 422)
* Role assignment change logged as `ROLE_MAPPING_UPDATED` audit event

---

## 4.2 System Configuration Management

Admin configures system behavior through a typed key-value settings store.

**Settings Catalog (all configurable):**

| Setting Key | Module | Value Type | Default | Purpose |
|---|---|---|---|---|
| `assignment.overdue_escalation_day_manager` | assignment | INTEGER | 7 | Days after due before manager notified |
| `assignment.overdue_escalation_day_hr_admin` | assignment | INTEGER | 30 | Days after due before HR/Admin notified |
| `assignment.approval_expiry_days` | assignment | INTEGER | 30 | Days until pending approval request expires |
| `notification.due_date_reminder_days` | notification | INTEGER | 7 | Days before due date to send reminder |
| `notification.session_reminder_hours_first` | notification | INTEGER | 24 | Hours before session for first reminder |
| `notification.session_reminder_hours_second` | notification | INTEGER | 1 | Hours before session for final reminder |
| `system.export_file_retention_hours` | system | INTEGER | 24 | Hours before export file is deleted |
| `system.notification_retention_days` | system | INTEGER | 90 | Days notification records retained |
| `system.audit_log_retention_days` | system | INTEGER | 1825 | Days audit logs retained (5 years default) |
| `system.policy_current_version` | system | STRING | v1 | Current active policy version; compared against user's accepted version during login |

**Rules:**

* All settings have validated defaults — system runs without any manual configuration
* Each setting has a defined `value_type` (`STRING` / `BOOLEAN` / `INTEGER` / `JSON`) — invalid type rejected
* Setting changes applied immediately without restart
* Every change logged as `ADMIN_CONFIG_UPDATED` audit event (old value + new value)
* Full history retained in `admin_settings_history`
* Settings filtered and returned by module for dashboard display

---

## 4.3 Mandatory Assignment Rule Management

Admin manages mandatory training rules that determine which users are automatically assigned training.

**Rules can target:**

* All employees
* Specific departments
* Specific designations
* Specific capabilities

**CRUD operations:**

* Create new mandatory rule (linked to a training item)
* Edit rule targeting criteria
* Deactivate rule (does not remove existing assignments)
* View all rules with last-evaluation timestamp

**Rules:**

* One training item may have multiple mandatory rules
* Mandatory rule changes trigger re-evaluation by Assignment Engine
* Rule deactivation does not cancel in-progress assignments

---

## 4.4 Integration Monitoring

Admin monitors all integration health and can trigger manual operations.

This is primarily handled by the Integrations module. The Admin feature provides:

* Dashboard view linking to integration health (`integration_health_status`)
* Manual sync triggers (delegated to Integrations APIs)

Admin cannot modify external system data.

---

## 4.5 Migration Administration

Admin must:

* Initiate migration
* Monitor progress
* Review failures
* Prevent duplicate execution

Rules:

* One-time process
* Controlled execution (delegated to Migration module)

---

## 4.6 Operational Monitoring

Admin monitors:

* Integration failures
* Assignment processing issues
* Notification failures
* Sync errors

System provides visibility only (no auto correction).

---

## 4.7 Security Governance

Admin must ensure:

* SSO enforced
* Global roles correctly assigned
* Access validation

Authorization uses:

* Role (from Keycloak JWT)
* Hierarchy (from Employee DB, derived at runtime)

---

## 4.8 API & Gateway Governance

Admin ensures:

* APIs exposed via APISIX
* API security enforced
* API availability monitored

---

# 5. Business Rules

## Source of Truth Rules

BR-01 Zoho owns employee data
BR-02 Employee DB owns hierarchy
BR-03 Keycloak owns authentication and global roles
BR-04 LMS owns training, assignments, compliance, and system configuration
BR-05 PES consumes compliance

---

## Authorization Rules

BR-06 Global roles from Keycloak JWT (`realm_access.roles`)
BR-07 Hierarchy determines manager-scoped access
BR-08 Manager derived dynamically from `user_hierarchy.manager_user_id`

---

## Role Rules

BR-09 Only Admin manages global roles
BR-10 Manager is NOT a role
BR-11 Last active Admin cannot be removed or deactivated (`LAST_ADMIN_PROTECTED`)

---

## Configuration Rules

BR-12 All settings have defaults — no mandatory setup required
BR-13 Invalid value type rejected at API level
BR-14 Every config change produces an audit event (`ADMIN_CONFIG_UPDATED`)
BR-15 Config history permanently retained

---

## Security Rules

BR-16 SSO mandatory
BR-17 No password storage
BR-18 Unauthorized access blocked and audited

---

## Compliance Rules

BR-19 Admin config must support compliance (overdue escalation, approval expiry)
BR-20 Compliance history must remain valid after config changes

---

## Lifecycle Rules

BR-21 Migration executed once; re-execution blocked
BR-22 Inactive users restricted

---

# 6. Workflows

## Role Assignment

Admin selects user → chooses role → confirms
→ LMS calls Keycloak Admin API → role assigned
→ `ROLE_MAPPING_UPDATED` audit event emitted
→ User sees new role on next login

---

## Last Admin Protection

Admin attempts to remove ADMIN role from user
→ System checks: is this the last active Admin?
→ If yes: `LAST_ADMIN_PROTECTED` error (422) — operation blocked
→ If no: proceed normally

---

## Configuration Update

Admin selects setting → enters new value → submits
→ Validation: correct value type? within allowed range?
→ If invalid: rejected with error
→ If valid: setting updated immediately, `ADMIN_CONFIG_UPDATED` audit event emitted

---

## Mandatory Rule Management

Admin creates/edits mandatory rule
→ Links to training item, sets targeting criteria
→ Rule saved and activated
→ Assignment Engine re-evaluation triggered on next cycle

---

## Integration Monitoring

Admin views integration health dashboard
→ System shows HEALTHY / DEGRADED / DOWN per integration
→ Admin triggers retry for failed sync
→ Admin views per-job logs for diagnosis

---

## Migration Workflow

Admin starts migration
→ System executes
→ Results displayed
→ Failures logged

---

# 7. Data Rules

## Data Ownership

| System      | Data                                  |
| ----------- | ------------------------------------- |
| LMS         | System configuration, mandatory rules |
| Keycloak    | Global roles, authentication          |
| Employee DB | Reporting hierarchy                   |
| Zoho        | HR employee data                      |
| PES         | Compliance consumption                |

---

## Editable Data

* System config → Admin only
* Global roles → via Keycloak Admin API (triggered by LMS Admin)
* Mandatory rules → Admin only
* External data → Not editable

---

## Identifiers

* Setting key (`setting_key` — namespaced string: `module.key_name`)
* Rule ID (UUID)
* History record ID (UUID)

---

## Retention

* Config change history → Permanent (never purged)
* Audit log retention → Configurable via `system.audit_log_retention_days` (default 5 years)
* Notification retention → Configurable via `system.notification_retention_days` (default 90 days)
* Export file retention → Configurable via `system.export_file_retention_hours` (default 24 hours)

---

# 8. Edge Cases

## Integration Failure

System continues
Admin sees failure in health dashboard

---

## Duplicate Role Assignment

Idempotent — assigning an already-held role has no effect (no error)

---

## Last Admin Removal Attempt

Blocked with `LAST_ADMIN_PROTECTED` (422)

---

## Invalid Setting Value

Rejected with `INVALID_SETTING_VALUE` (422) — not applied

---

## Unauthorized Access

Denied (403) + audit event emitted

---

## Missing Hierarchy

Manager-scoped flows restricted until hierarchy is available

---

## Migration Re-execution

Blocked with migration status check

---

# 9. Acceptance Criteria

* Global roles assigned and removed via Keycloak Admin API
* Last active Admin cannot be removed or deactivated
* Role changes produce `ROLE_MAPPING_UPDATED` audit event
* All system settings listed with current value, type, and module
* Config changes validated by type, applied immediately, produce `ADMIN_CONFIG_UPDATED` audit event
* Config change history permanently retained and queryable
* Mandatory rules can be created, updated, and deactivated
* Integration health visible from Admin dashboard
* Migration execution controlled and idempotent
* Unauthorized access blocked and logged

---

# 10. Dependencies

* Keycloak (Admin API for role assignment)
* Zoho HR
* Employee DB
* PES
* Teams
* OneDrive
* APISIX
* Migration framework
* Assignment Engine (mandatory rule evaluation)

---

# 11. Assumptions

* <1000 users
* Single tenant
* On-prem deployment
* SSO mandatory
* Hybrid authorization model
* Keycloak Admin API accessible from LMS backend
* OpenAPI-based APIs

---

# 12. Audit Events

The following Admin actions must emit audit events:

| Event | event_code | Minimum Data Captured |
|---|---|---|
| Admin setting changed | `ADMIN_CONFIG_UPDATED` | setting_key, old_value, new_value, changed_by, correlation_id, timestamp |
| User role assignment changed | `ROLE_MAPPING_UPDATED` | user_id, old_role, new_role, changed_by, correlation_id, timestamp |

---

# 13. Future Enhancements

* Admin dashboards with trend charts
* Config versioning with rollback
* Integration health alerting (email / Teams notification)
* Delegated admin (scoped admin roles)
* Advanced analytics
* Setting change approval workflow for critical settings

---

# End of Document
