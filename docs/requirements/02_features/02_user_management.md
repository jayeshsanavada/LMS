# Feature: User Management

---

# 1. Feature Overview

## Purpose

The User Management feature governs how employees are created, authenticated, managed, and maintained within the LMS. It ensures accurate employee data, secure access control, correct reporting hierarchy, and proper training eligibility across the organization.

This module serves as the **foundation of the LMS**, as all training assignments, approvals, reporting, and compliance tracking depend on accurate user data.

## Business Need

The organization requires an automated and reliable way to manage employee identities to ensure:

* New employees receive mandatory training automatically
* Managers can monitor team learning progress
* HR can verify compliance during performance evaluation
* User access is secured through SSO
* Administrative overhead is minimized

## Problems this feature solves

* Manual user onboarding delays
* Incorrect or missing training assignments
* Lack of manager visibility into team learning
* Disconnected HR and LMS data
* Identity duplication issues
* Compliance tracking challenges

## Integration with Other LMS Modules

User Management enables:

* Training Management → Defines eligibility
* Assignment Engine → Enables distribution
* Notifications → Sends alerts
* Reporting → Provides hierarchy context
* Integrations → Syncs external systems
* Compliance → Tracks completion

---

# 2. Actors

## Employee

Primary learner.

Responsibilities:

* Login via SSO
* View training
* Request courses
* Track progress

---

## Manager

Derived from reporting hierarchy (NOT a role).

Responsibilities:

* View team members
* Assign training
* Approve requests
* Monitor compliance

---

## HR

Responsibilities:

* View compliance reports
* Monitor department performance

---

## Admin

Responsibilities:

* Trigger sync
* Manage global roles
* Monitor integrations
* Deactivate users
* Handle exceptions

---

## External Systems

### Zoho HR

Provides employee master data.

### Employee/Timesheet Database (NEW)

Provides:

* Reporting manager hierarchy
* Capability
* Designation
* BU Head (Business Unit Head)
* Project allocation

Used for:

* Authorization decisions
* Reporting filters (BU-wise, capability-wise)
* Assignment rules (target by capability or designation)
* BU-level statistics in Admin Dashboard, Compliance, and Reports screens

---

### Keycloak

Authentication provider.

### Azure AD

Identity source.

### PES

Consumes LMS compliance data via API (no push from LMS).

---

# 2A. User Scenarios

(No major change — already correct)

---

# 3. Functional Overview

User data is controlled via Zoho and Employee DB integration.

* Zoho → employee master data
* Employee DB → hierarchy and attributes

Authentication is handled by Keycloak.

### New Employee Flow

* User created via sync
* Global role assigned (Employee)
* Hierarchy mapped
* Mandatory training assigned

### Employee Exit Flow

* User deactivated
* History retained
* Access revoked

---

# 4. Functional Requirements

## User Creation and Provisioning

* Automatic creation from Zoho sync
* Enrichment from Employee DB (designation, capability, hierarchy, project allocations)
* Manual creation always available to ADMIN — Admin can create a user at any time when needed (e.g. before Zoho sync, for contractors, or for any operational reason)
  * Minimum required fields: `employee_id`, `email`, `full_name`, `department`
  * Manually created users are tagged `source_system = MANUAL`
  * On next Zoho sync, if a matching `employee_id` is found, the record is enriched/overwritten by Zoho data
* CSV import deferred to Phase 2 — all Phase 1 provisioning is via Zoho sync or Admin manual creation
* Default global role on creation: `EMPLOYEE` (assigned in both LMS `role_mappings` and Keycloak)
* Role changes to `HR` or `ADMIN` must be performed manually by an existing Admin via the Admin module — not via sync

---

## Authentication

* SSO via Keycloak only
* No local passwords
* First login policy required

---

## Authorization (UPDATED)

Hybrid model:

### Global Roles (Keycloak)

* Admin
* HR
* Employee

### Hierarchy-Based Access (LMS)

Derived from employee DB:

* Reporting manager controls:

  * Approval rights
  * Team visibility
  * Assignment authority

Manager is NOT a role.

---

## User Profile Management

Includes:

* Identity
* Department
* Designation
* Capability (multi-value — one user can have multiple capabilities)
* **BU Head** — the Business Unit Head this user belongs to; used for BU-wise reporting and training statistics
* Location
* Employment type (`PERMANENT` / `CONTRACT` / `INTERN`)
* Manager (from hierarchy)
* Project allocation
* Training history
* Last login timestamp

Admin can override specific profile fields (`full_name`, `department`, `designation`, `location`, `bu_head_id`, `capabilities`) via `PATCH /api/v1/users/{user_id}`. Overridden fields are tagged `manually_overridden = true` and not overwritten by sync until Admin explicitly clears the override.

### BU Head

* `bu_head_id` references another `users` record who is designated as BU Head
* Synced from Employee DB; Admin can manually set/override
* Used in: Admin Dashboard (BU-wise stat tiles), Compliance screen (BU filter), Reports (BU grouping), Session participant filtering

### Capabilities

* Stored as `user_capabilities` (user_id, capability_name, source: MANUAL | ZOHO)
* Admin can add/remove capabilities manually in the Add/Edit User modal
* "Sync from Zoho" replaces current capability list with Zoho-sourced data
* Used in: Training Assignment Rules (Specific Capability scope), Compliance report filters, Reports breakdown

---

## User Lifecycle

| Event | Behavior |
|---|---|
| New employee | Created via Zoho sync or manual Admin creation |
| Exit | Deactivated (is_active = false) with cascade effects |
| Rehire / mistake | Reactivated via `POST /api/v1/users/{user_id}/reactivate` (Admin only) |
| Manager change | Updated via Employee DB sync |
| Attribute correction | Admin override via `PATCH /api/v1/users/{user_id}` |

---

## Manager Hierarchy

* Derived from Employee DB
* Used for authorization (NOT roles)
* Hierarchy access is limited to **direct reports only (depth = 1)** in Phase 1
* Multi-level hierarchy traversal (e.g. VP sees all levels below) is deferred to Phase 2
* `GET /users/team-members` returns direct reports only

---

## Mandatory Training

* Auto assigned
* Cannot be removed

---

## User Synchronization

* Zoho sync — authoritative for: `email`, `full_name`, `department`, `joining_date`, `employment_status`
* Employee DB sync — authoritative for: `designation`, `capability`, `bu_head_id`, `reporting_manager`, `project_allocations`
* In case of conflict on shared fields, Zoho takes priority and a sync warning is logged
* On each Employee DB sync, all existing project allocations for a user are set `is_current = false`, new allocations inserted as current (full replace, no merge)
* Retry supported on sync failure (up to 3 attempts)
* Manual trigger allowed by Admin
* Sync is idempotent — re-running produces the same result

---

## Role Management (UPDATED)

* Only global roles managed
* Manager NOT a role
* Hierarchy determines access

---

## Migration Support

(No change)

---

# 5. Business Rules

## Identity Rules

BR-01 Employee ID must be unique
BR-02 Email must be unique

---

## Source of Truth Rules

BR-03 Zoho is authoritative for: email, full_name, department, joining_date, employment_status
BR-04 Employee DB is authoritative for: designation, capability, reporting_manager, project_allocations
BR-05 Keycloak owns authentication and global role assignment

---

## Authorization Rules

BR-06 Global roles from Keycloak (`realm_access.roles`)
BR-07 Hierarchy determines team access — not roles
BR-08 Manager is derived dynamically from `user_hierarchy` — not a stored role

---

## Lifecycle Rules

BR-09 Users are never hard-deleted — only deactivated (`is_active = false`)
BR-10 All history (assignments, compliance, audit) retained after deactivation
BR-11 On deactivation: pending approvals auto-rejected, future sessions removed, assignments retained

---

## Provisioning Rules

BR-12 Manual user creation always available to Admin
BR-13 Manually created users tagged `source_system = MANUAL`; overwritten by Zoho sync on matching employee_id
BR-14 Default global role on creation is EMPLOYEE
BR-15 Role changes to HR or ADMIN done only by Admin via Admin module — not via sync
BR-16 Project allocations fully replaced on each Employee DB sync (no merge)
BR-17 Hierarchy access depth is 1 (direct reports only) in Phase 1

---

## Profile & Lifecycle Rules

BR-21 `employment_type` must be set on user creation — `PERMANENT` / `CONTRACT` / `INTERN`
BR-22 Admin can override profile fields (full_name, department, designation, location) — overridden fields tagged `manually_overridden = true`
BR-23 Manually overridden fields are not overwritten by sync until Admin clears the override
BR-24 `last_login_at` updated on every successful authentication (GET /auth/me)
BR-25 Deactivated users can be reactivated by Admin — restores `is_active = true` and re-enables Keycloak account
BR-26 Bulk deactivation applies the same cascade logic as individual deactivation

---

## Data Privacy Rules

BR-27 Right to erasure requests are handled by anonymizing PII fields (name, email, keycloak_user_id) — training completion and compliance history are retained
BR-28 Audit logs retain actor IDs for compliance but are not searchable by PII after anonymization
BR-29 Data privacy / erasure tooling is deferred to Phase 2 — schema must support anonymization from Phase 1

---

## Security Rules

BR-30 SSO mandatory — no local passwords
BR-31 Authorization = global role (Keycloak) + hierarchy (Employee DB)
BR-32 Sync conflict on shared fields resolved by Zoho priority; conflict logged as warning

---

# 6. Workflows

## New User Onboarding

Zoho update
→ Sync
→ User created
→ Employee DB enriches hierarchy
→ Mandatory assignment
→ User login
→ Policy accepted

---

## Deactivation

Zoho update (employment_status = EXITED / INACTIVE)
→ Sync
→ User `is_active` set to false
→ Cascade effects:
  * Active assignments retained in DB (history preserved, user cannot access)
  * Pending approval requests by or for this user auto-rejected (reason: USER_DEACTIVATED)
  * Future session participations removed
  * Compliance history retained
→ Audit event `USER_DEACTIVATED` emitted

Admin can also manually deactivate a user at any time via `POST /api/v1/users/{user_id}/deactivate`.

---

## Manual User Creation Flow

Admin navigates to user management
→ Fills minimum required fields (employee_id, email, full_name, department)
→ User created with source_system = MANUAL, global_role = EMPLOYEE
→ Audit event `USER_CREATED` emitted
→ On next Zoho sync, if employee_id matches, record enriched/overwritten by Zoho

---

## Approval Flow

Employee requests
→ Manager (via hierarchy)
→ Approves/rejects

---

## Sync Flow

Admin triggers / scheduled
→ Zoho + Employee DB sync
→ Data updated

---

# 7. Data Rules

## Data Ownership

| System      | Owns          |
| ----------- | ------------- |
| Zoho        | HR data       |
| Employee DB | Hierarchy     |
| Keycloak    | Identity      |
| LMS         | Training data |

---

## Data Edit Rules

* HR data → read-only
* Hierarchy → sync only
* LMS data → editable

---

## Data Retention

(No change)

---

# 8. Edge Cases

## Hierarchy Missing

* User allowed to login but manager-level capabilities (team view, approvals, assignment authority) are not available
* User treated as individual contributor until hierarchy is synced

---

## Duplicate Employee ID on Manual Creation

* Admin attempts to create user with employee_id that already exists → 409 Conflict error
* Existing record must be updated via sync or Admin attribute override, not duplicated

---

## Reactivation of Deactivated User

* Admin reactivates a deactivated user via `POST /api/v1/users/{user_id}/reactivate`
* `is_active` set to true, Keycloak account re-enabled
* Previously auto-rejected approvals are NOT reinstated — user must re-request training
* Mandatory training re-evaluation triggered — any new mandatory assignments added
* Audit event `USER_REACTIVATED` emitted

---

## Contractor Without Zoho Record

* Contractors may not exist in Zoho
* Admin creates them manually with `employment_type = CONTRACT`
* These records are never overwritten by Zoho sync (no matching employee_id)
* Compliance rules can be scoped to `employment_type` to include or exclude contractors

---

## Sync Conflict (Shared Fields)

* Zoho and Employee DB send different values for same field
* Zoho takes priority
* Conflict is logged as a warning in `user_attributes_sync_log` with both values recorded

---

## User Deactivated Mid-Session

* User's `is_active` set to false during an active session
* Access denied on next API request (middleware checks `is_active` on every request)
* No forced logout of current session required — denied on next call

---

# 9. Acceptance Criteria

* Users are auto-provisioned from Zoho sync
* Manual user creation by Admin works with minimum required fields
* Hierarchy-based access works correctly (direct reports only)
* Role assignment defaults to EMPLOYEE on creation; role changes by Admin only
* Deactivation cascades correctly (approvals rejected, sessions removed, history retained)
* Reactivation restores access and triggers mandatory training re-evaluation
* Admin attribute override persists through sync until cleared
* `employment_type` correctly filters compliance rules
* `last_login_at` updated on every successful login
* Bulk deactivation applies same cascade as single deactivation
* Sync conflict resolved by Zoho priority with warning logged
* Project allocations fully replaced on each Employee DB sync
* All user management actions emit correct audit events

---

# 10. Dependencies

* Zoho HR (employee master data — email, name, department, status)
* Employee/Timesheet DB (hierarchy, designation, capability, project allocations)
* Keycloak (identity + global role assignment)
* Auth module (token validation, policy acceptance)
* Admin module (role change operations, authorization_policies)
* Assignment Engine (mandatory training auto-assignment on user creation)
* Audit module (receives user management events)
* Notifications module (notifies on assignment creation post-provisioning)

---

# 11. Assumptions

* Zoho HR is the primary source for employee identity data
* Employee DB always provides reporting manager and attribute data after sync
* Hierarchy may be temporarily missing for newly created manual users — this is acceptable
* All users authenticate via Keycloak SSO — no local auth
* Phase 1 supports single-tenant, on-premise deployment only

---

# 12. Audit Events

The following user management actions must emit audit events:

| Event | event_code | Minimum Data Captured |
|---|---|---|
| User created (sync or manual) | `USER_CREATED` | user_id, source_system, created_by (null if sync), sync_job_id (null if manual), correlation_id, timestamp |
| User deactivated | `USER_DEACTIVATED` | user_id, deactivated_by (user or system), reason, correlation_id, timestamp |
| User reactivated | `USER_REACTIVATED` | user_id, reactivated_by, correlation_id, timestamp |
| Role changed | `ROLE_MAPPING_UPDATED` | user_id, old_role, new_role, changed_by, correlation_id, timestamp |
| Hierarchy updated | `USER_HIERARCHY_CHANGED` | user_id, old_manager_id, new_manager_id, correlation_id, timestamp |
| Admin overrides profile field | `USER_FIELD_OVERRIDDEN` | user_id, field_name, old_value, new_value, overridden_by, correlation_id, timestamp |
| User updates own profile | `USER_UPDATED` | user_id, changed_fields, correlation_id, timestamp |
| Sync completed | `USER_SYNC_COMPLETED` | source_system, records_processed, records_failed, correlation_id, timestamp |
| Sync warning (conflict) | `USER_SYNC_CONFLICT` | user_id, field_name, zoho_value, employee_db_value, resolved_to, correlation_id, timestamp |
| Admin updates manual capabilities | `USER_CAPABILITIES_UPDATED` | user_id, updated_by, added_capabilities, removed_capabilities, correlation_id, timestamp |
| On-demand capability sync from Employee DB | `USER_CAPABILITIES_SYNCED` | user_id, triggered_by, records_replaced, correlation_id, timestamp |

---

# 14. Future Enhancements

* CSV bulk import
* Multi-level hierarchy traversal (depth > 1)
* Delegated admin (department-level admin)
* Self-service profile updates for non-synced fields
* Data privacy / right to erasure tooling (PII anonymization)
* Admin impersonation for support debugging

---

# End of Document