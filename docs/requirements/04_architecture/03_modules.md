# LMS Module Structure

---

## How to Use This File

| Reader | Purpose |
|---|---|
| **Backend Developer** | Understand which module owns which responsibility, table, and service before writing code |
| **Frontend Developer** | Understand which backend module each screen maps to; which API prefix to call |
| **QA / Test Engineer** | Understand module boundaries to scope tests; understand cross-module flows |
| **AI Coding Assistant** | Identify the correct module to place new code in; understand dependency direction; avoid placing logic in the wrong module |
| **Architect / Tech Lead** | System blueprint for boundaries, dependencies, and build order |

**What this file IS:**
- Authoritative definition of every module's purpose, responsibilities, owned data, and dependencies
- The source of truth for module boundaries and build order
- The code structure blueprint for both backend and frontend

**What this file is NOT:**
- An API reference (see `docs/requirements/engineering/features/XX/api.md`)
- A database schema (see `docs/requirements/engineering/features/XX/schema.md`)
- An architecture overview (see `docs/requirements/03_architecture/01_architecture.md`)

**How it fits with other files:**
```
01_architecture.md   →  system topology, patterns, decisions
03_modules.md        →  you are here (module boundaries, ownership, build order)
01_features/*.md     →  business rules per feature
engineering/features/XX/api.md     →  exact API contracts
engineering/features/XX/schema.md  →  exact DB tables
```

**AI coding note:** Before generating code for any operation, identify the owning module from §5–§7. Never place business logic in the API Layer module. Never have one module update another module's DB tables directly. Dependency direction must follow §8. **There is no standalone Compliance module** — compliance is owned by the Assignment Engine.

---

# 1. Overview

This document defines the **module structure** of the Enterprise LMS using a **DDD-based Modular Monolith architecture**.

Goals:
- Define clear system boundaries with explicit ownership
- Separate business-critical from supporting and generic capabilities
- Reduce coupling between modules
- Guide API design, DB schema, and implementation
- Serve as the blueprint for AI-based code generation

The LMS is a **single deployable application** with **internally separated modules**. Each module owns its responsibilities, business rules, and data access boundaries. No module may write to another module's tables directly.

---

# 2. Architecture Style

**Domain-Driven Design (DDD) based Modular Monolith**

Suitable because:
- User base < 1,000; on-premise deployment
- Business complexity is moderate but cross-functional
- Integrations are important but do not justify microservices yet
- Operational simplicity required
- Future service extraction remains possible without re-architecture

---

# 3. Module Classification

## 3.1 Core Modules (Primary Business Value)

| # | Module | Key Concern |
|---|---|---|
| 1 | User Management | User lifecycle, profile, hierarchy sync |
| 2 | Training Management | Course, path, curriculum, resource, certificate |
| 3 | Assignment Engine | Assignments, mandatory rules, compliance status, approvals, overdue |
| 4 | Sessions | Hybrid classroom sessions, Teams integration, attendance |

> **Important:** Compliance is NOT a standalone module. `compliance_status` is owned by the Assignment Engine. Compliance evaluation, mandatory rule management, and approval workflow are all responsibilities of the Assignment Engine.

---

## 3.2 Supporting Modules (Enable Core Flows)

| # | Module | Key Concern |
|---|---|---|
| 5 | Notifications | In-app + email delivery, idempotency, dead-letter |
| 6 | Reporting | Dashboards, compliance reports, async export |
| 7 | Audit | Immutable event log, dead-letter, retention |
| 8 | Integrations | External system sync, PES API exposure, health monitoring |
| 9 | Migration | Legacy data import — Phase 2 (deferred) |

---

## 3.3 Generic / Platform Modules (Reusable Capabilities)

| # | Module | Key Concern |
|---|---|---|
| 10 | Authentication & Access | Keycloak SSO, JWT validation, PKCE |
| 11 | Authorization | Hybrid: global roles (Keycloak) + hierarchy-based (Employee DB) |
| 12 | Search | PostgreSQL full-text search, typeahead |
| 13 | File Management | OneDrive integration, file metadata |
| 14 | Admin Configuration | Settings catalog, role management, mandatory rule config |
| 15 | API Layer | Route definitions, response envelope, validation |
| 16 | Background Jobs | Scheduled + event-driven async job execution |

---

# 4. High-Level Module Map

## Core Business Flow

```
User Management (identity, hierarchy)
       ↓
Assignment Engine (assign training → track completion → evaluate compliance)
       ↓
Training Management (course content, certificates)
       ↓
Sessions (hybrid delivery, attendance)
       ↓
Reporting (compliance status, exports, dashboards)
```

## Cross-Cutting Support

```
Notifications     →  all role-facing events
Audit             →  all state-changing operations
Search            →  training catalog discovery
Admin Config      →  system settings, role management
Authentication    →  all protected modules
Authorization     →  all data-scoped operations
Integrations      →  sync, Teams, OneDrive, PES API
Background Jobs   →  all async/scheduled work
```

---

# 5. Core Module Definitions

---

## Module 1: User Management

**Purpose:** Manages LMS user records, lifecycle state, and profile attributes sourced from external systems.

**Responsibilities:**
- Create and update users from Zoho HR sync
- Maintain reporting hierarchy from Employee DB sync
- Manage user active/inactive lifecycle
- Store Admin-overridden field values (`user_field_overrides`)
- Expose user identity and hierarchy context to other modules
- Provide user search and list for Admin/HR

**Key Inputs:**
- Zoho HR data (employee identity, department, status)
- Employee/Timesheet DB data (reporting manager, capability, designation, project)
- Keycloak identity claims (user ID, email)

**Key Outputs:**
- LMS user record
- Reporting hierarchy (`user_hierarchy`)
- Project allocations (`user_project_allocations`)
- Profile attributes (with Admin override support)

**Important Rules:**
- LMS does not own HR data — Zoho and Employee DB are source of truth
- Zoho always wins on conflict for HR fields; Admin overrides are preserved separately
- Inactive users remain in history but cannot receive new assignments or attend sessions
- User cannot authenticate unless identity exists in both Keycloak and LMS users table

**Owned Tables:** `users`, `user_hierarchy`, `user_project_allocations`, `user_source_references`, `user_field_overrides`, `user_attributes_sync_log`, `user_probation`, `user_capabilities`

**Depends On:** Integrations, Authentication & Access, Authorization

**Used By:** Assignment Engine, Sessions, Notifications, Reporting, Audit, Search

---

## Module 2: Training Management

**Purpose:** Manages all learning structures — courses, learning paths, curricula, resources, and certificates.

**Responsibilities:**
- Create and manage training items (course, learning path, curriculum)
- Manage training lifecycle: DRAFT → REVIEW → PUBLISHED → ARCHIVED
- Manage training versions (updates create new versions; old completions remain valid)
- Define completion rules (e.g. all modules required, minimum score)
- Manage resource files (metadata in LMS, content in OneDrive)
- Issue certificates on completion
- Auto-generate training codes

**Key Inputs:**
- Admin/HR-created training definitions
- OneDrive resource file references (from File Management)
- Session links from Sessions module

**Key Outputs:**
- Publishable training definitions
- Versioned training structure
- Completion rules
- Resource metadata
- Certificates

**Important Rules:**
- Only `PUBLISHED` training can be assigned
- `ARCHIVED` training stays in history; cannot be newly assigned
- Training version updates do not invalidate existing completions
- Training code is auto-generated and unique

**Owned Tables:** `training_items`, `training_versions`, `training_tags`, `training_item_tags`, `training_structure_links`, `training_prerequisites`, `training_resources`, `training_completion_rules`, `certificates`

> **Note:** `resource_files` is owned by **Module 13: File Management** — Training Management uses it but does not own it.

**Depends On:** File Management, Sessions

**Used By:** Assignment Engine, Reporting, Search

---

## Module 3: Assignment Engine

**Purpose:** Converts training definitions into user-specific assignments, manages the full assignment lifecycle, mandatory rules, approval workflow, compliance evaluation, and overdue escalation.

**Responsibilities:**
- Create assignments (mandatory auto-assign, manager-driven, self-enrollment request)
- Manage assignment lifecycle (`assignment_status`): ASSIGNED → IN_PROGRESS → COMPLETED / OVERDUE / CANCELLED
- Manage approval request lifecycle (`request_status`): PENDING → APPROVED / REJECTED / EXPIRED — separate table (`assignment_requests`)
- Manage approval workflow: pending approval expiry after 30 days (`assignment.approval_expiry_days`)
- Evaluate compliance status per user (`compliance_status` table — nightly background job)
- Manage mandatory assignment rules (created/edited by Admin via Admin Configuration)
- Overdue detection: Day 7 → escalate to manager; Day 30 → escalate to HR + Admin
- Escalation thresholds from Admin settings: `assignment.overdue_escalation_day_manager`, `assignment.overdue_escalation_day_hr_admin`
- Prevent duplicate assignments
- Maintain immutable assignment history

**Key Inputs:**
- Training items from Training Management (PUBLISHED only)
- User and hierarchy from User Management / Authorization
- Mandatory rules from Admin Configuration
- Escalation thresholds from Admin settings

**Key Outputs:**
- Assignment records
- Assignment state changes
- Compliance status per user
- Approval decisions
- Escalation notifications (via Notification module)

**Important Rules:**
- Only the latest published training version can be assigned
- Manager can assign only within direct reports (depth = 1)
- Assignments are never hard-deleted (CANCELLED status used)
- Approval expires after `assignment.approval_expiry_days` (default: 30 days) — status moves to EXPIRED
- Compliance depends on: assignment + completion + due date
- Migrated assignments are read-only historical records
- Mandatory rules are Admin-configured; Assignment Engine evaluates them nightly

**Owned Tables:** `assignments`, `assignment_history`, `mandatory_assignment_rules`, `assignment_requests`, `compliance_status`

**Depends On:** User Management, Training Management, Authorization, Admin Configuration

**Used By:** Notifications, Reporting, Audit, Search

---

## Module 4: Sessions

**Purpose:** Manages instructor-led hybrid classroom sessions with Teams delivery and attendance tracking.

**Responsibilities:**
- Create and manage sessions linked to training items
- **All sessions are HYBRID** (online via Teams + in-person at physical location) — Phase 1 only
- Create Teams meeting via Graph API on session publish
- Manage participants: Admin direct-add (INVITED) + Manager nomination workflow (NOMINATED → CONFIRMED / REJECTED_NOMINATION)
- Track attendance: ONLINE (auto-pulled from Teams Graph API after session ends) and OFFLINE (manually entered by Admin or HR, or via Excel import)
- Update session-driven completion contribution to assignments
- Manage reschedule (update Teams meeting + notify participants)
- Manage cancellation (cancel Teams meeting + notify participants)
- Auto-generate unique session codes
- Admin-managed facilitator list (`session_facilitators`) and venue list (`session_venues`)

**Key Inputs:**
- Linked training item
- Assigned participants (direct add or Manager nominations)
- Teams Graph API response (meeting link, attendance data)
- Admin/HR manual attendance entry or Excel import

**Key Outputs:**
- Session record with session code, Teams link, venue snapshot
- Attendance records per participant (ONLINE / OFFLINE)
- Session state transitions
- Completion contribution to assignments

**Important Rules:**
- Session must link to an active PUBLISHED training item
- Venue selected from Admin-managed venue list; `physical_location` stored as snapshot of venue name at save time
- Cancelled session does not grant completion credit
- Online attendance: auto-pulled from Teams after session end; manual fallback available
- If Teams link generation fails: manual Teams link field available
- Session code: auto-generated, unique, read-only after creation

**Owned Tables:** `sessions`, `session_participants`, `session_attendance`, `session_facilitators`, `session_venues`

> **Note:** "Recording link" does not exist in this system. Sessions have Teams meeting links and physical locations. No recording storage or reference.

**Depends On:** Training Management, Integrations (Teams API), Authorization

**Used By:** Reporting, Notifications, Audit, Search

---

# 6. Supporting Module Definitions

---

## Module 5: Notifications

**Purpose:** Handles async event-driven communication to users via in-app and email channels.

**Responsibilities:**
- Create notification records for all system events
- Queue and dispatch notifications via Worker Service
- Manage in-app notification center (unread count, mark as read)
- Manage user notification preferences (per event category)
- Enforce idempotency — prevent duplicate sends
- Send mandatory notifications regardless of preferences
- Log failed delivery attempts to `notification_delivery_log` (immutable; Admin visibility + manual retry)
- Retry failed sends via Worker Service

**Key Inputs:**
- Events from Assignment Engine (assignment, approval, overdue)
- Events from Sessions (invited, reschedule, cancel, reminder)
- Events from Integrations (sync failure alerts)
- Reminder schedules from Admin settings

**Key Outputs:**
- Notification records (in-app + email delivery)
- Delivery status per channel
- Delivery attempt log for failed sends

**Important Rules:**
- All notification dispatch is async — never synchronous in the request path
- Idempotency key: `event_code:entity_id:user_id:date_bucket` — duplicate sends prevented
- Mandatory events (`ASSIGNMENT_CREATED`, `SESSION_INVITED`, `ASSIGNMENT_OVERDUE_D0/D7/D30`) sent regardless of user preferences
- Non-mandatory events (reminders, `TRAINING_COMPLETED`) respect user preferences
- Migration operations must NOT trigger notifications
- Reminder timing driven by Admin settings: `notification.due_date_reminder_days`, `notification.session_reminder_hours_first`, `notification.session_reminder_hours_second`
- Record retention: `system.notification_retention_days` (default 90 days)

**Owned Tables:** `notifications`, `notification_delivery_log`, `notification_preferences`

**Depends On:** Assignment Engine, Sessions, Integrations, Admin Configuration, Background Jobs

**Used By:** All user-facing roles

---

## Module 6: Reporting

**Purpose:** Provides analytics, dashboards, summaries, and async exports for all roles.

**Responsibilities:**
- Generate role-scoped dashboard summaries (Employee, Manager, HR, Admin)
- Provide compliance, assignment, session, and user activity reports
- Generate async exports (Excel + PDF only — no CSV)
- Scope all data by authorization context (SELF / TEAM / ORG)
- Manage export jobs (PENDING → PROCESSING → COMPLETED / FAILED)
- Clean up export files after 24h retention window

**Key Inputs:**
- Assignments + compliance status from Assignment Engine
- Session attendance from Sessions
- User + hierarchy from User Management
- Training data from Training Management

**Key Outputs:**
- Dashboard datasets (pre-aggregated per role)
- Report datasets (filtered, scoped)
- Export files (Excel / PDF), stored temporarily

**Important Rules:**
- Reporting is read-only — no data modification
- Manager visibility: direct reports only (depth = 1)
- HR/Admin: all users
- Employee: own data only
- Export pattern: POST → `job_id` → poll → download (24h window)
- Export file formats: Excel (.xlsx), PDF only — CSV not supported
- All exports are async — never synchronous file downloads

**Owned Tables:** `report_exports`, `reporting_snapshots`

**Depends On:** User Management, Assignment Engine, Sessions, Training Management, Background Jobs

**Used By:** Admin, HR, Manager, Employee (own data only)

---

## Module 7: Audit

**Purpose:** Provides an immutable, traceable record of all critical LMS activity.

**Responsibilities:**
- Capture auditable events from all modules (async)
- Store immutable audit log records (INSERT only — never UPDATE or DELETE)
- Mask sensitive fields before write (email partial, tokens fully redacted)
- Link all events from one HTTP request via `correlation_id`
- Write failed audit events to dead-letter (`audit_write_failures`)
- Retry dead-letter writes via Worker Service
- Support audit log search for Admin/HR (scoped by role)
- Enforce 5-year retention with `legal_hold` override
- Support async export of audit logs (`audit_export_jobs`)

**Key Inputs:**
- Events from all modules (emitted at state-change points)
- `correlation_id` from every HTTP request

**Key Outputs:**
- Immutable audit log records
- Searchable audit trail
- Dead-letter records for failed writes
- Async export files (Excel / PDF; retained 24 hours)

**Important Rules:**
- Audit writes are async — failures must NEVER block the originating operation
- Failed writes go to `audit_write_failures` dead-letter (visible to Admin; retried by Worker)
- `audit_logs` is INSERT-only — no UPDATE or DELETE ever
- `legal_hold = true` → exempt from retention purge (permanent)
- Retention: 5 years (configurable via `system.audit_log_retention_days = 1825`)
- `correlation_id` links all events from one HTTP request across modules
- Access scoped by role: Admin sees all; HR sees org-level events; Manager sees limited team events

**Owned Tables:** `audit_logs`, `audit_write_failures`, `audit_export_jobs`

**Depends On:** Background Jobs (async write via Worker)

**Used By:** Admin, HR, limited Manager visibility

---

## Module 8: Integrations

**Purpose:** Coordinates all communication with external systems; exposes the PES compliance API.

**Responsibilities:**
- Sync employee master data from Zoho HR (scheduled daily pull)
- Sync hierarchy and attributes from Employee / Timesheet DB (scheduled daily pull)
- Create/update/cancel Teams meetings via Graph API (per session event)
- Pull Teams attendance data after session ends (Graph API)
- Upload/delete resource files via OneDrive Graph API
- Expose compliance status API for PES (M2M, Client Credentials auth, 100 req/min)
- Monitor integration health per system (HEALTHY / DEGRADED / DOWN)
- Log all sync jobs with status, row counts, errors
- Support Admin manual sync trigger per integration

**Key Inputs:**
- External source data (Zoho, Employee DB)
- Session events (Teams meeting create/update/cancel)
- Resource events (OneDrive upload/delete)
- PES API requests (M2M service account)
- Background job triggers

**Key Outputs:**
- Synced LMS user and hierarchy data
- Teams meeting links and attendance data
- OneDrive file references
- Integration health status
- PES compliance API responses
- Integration job logs

**Important Rules:**
- No integration failure may block a user-facing LMS operation
- LMS never overwrites source-of-truth data from external systems
- Conflict resolution: source system always wins; Admin-overridden fields (`user_field_overrides`) preserved
- PES compliance data is read from Assignment Engine's `compliance_status` table — Integrations module exposes the API, does not own the data
- Every PES call logged as `PES_API_ACCESSED` audit event
- All sync operations logged to `integration_jobs` (upsert-safe, retryable)

**Owned Tables:** `integration_jobs`, `integration_job_logs`, `integration_health_status`

**Depends On:** Background Jobs, Admin Configuration

**Used By:** User Management (Zoho/Employee DB sync results), Sessions (Teams), Training Management (OneDrive), Assignment Engine (compliance status read by PES)

---

## Module 9: Migration

**Purpose:** Handles one-time legacy LMS data import. **Phase 2 — Deferred.**

**Responsibilities:**
- Import legacy users, training, assignments, completions, sessions
- Validate migrated records
- Prevent duplicate migration execution
- Support rollback status and verification

**Important Rules:**
- One-time controlled process — not part of normal LMS operation
- Migrated records remain historically valid
- Migration must NOT trigger notifications
- Migrated assignments are read-only historical records in the Assignment Engine

**Owned Tables:** `migration_jobs`, `migration_records`, `migration_failures`

**Depends On:** User Management, Training Management, Assignment Engine, Sessions, Audit

**Status:** **Deferred — not in Phase 1 build.**

---

# 7. Generic / Platform Module Definitions

---

## Module 10: Authentication & Access Management

**Purpose:** Handles secure LMS entry via Keycloak SSO with PKCE flow.

**Responsibilities:**
- Redirect unauthenticated users to Keycloak login
- Handle PKCE authorization code exchange
- Validate JWT (signature, expiry, `aud` claim) at APISIX layer
- Re-validate JWT in FastAPI middleware
- Map authenticated Keycloak identity to LMS user record
- Handle logout (token invalidation at Keycloak)
- Handle policy acceptance on first login

**Important Rules:**
- LMS stores no passwords — Keycloak is the sole auth provider
- Azure AD is the identity source behind Keycloak
- JWT stored in memory only — never in localStorage, sessionStorage, cookies, or DB
- `aud` claim must match LMS Keycloak client ID — wrong audience = rejected
- Token validated at two points: APISIX (gateway) and FastAPI middleware

**Owned Data:** `role_mappings` (cached global role per user), `authorization_policies` (table definition owned by Auth module; content seeded and managed by Admin module — Auth reads only at runtime), `access_denied_logs` (immutable denial audit records). Policy acceptance fields (`policy_accepted_version`, `policy_accepted_at`) stored in `users` table (owned by User Management).

**Depends On:** Keycloak, APISIX, User Management

**Used By:** All protected modules

---

## Module 11: Authorization

**Purpose:** Evaluates access to actions and data using a hybrid role + hierarchy model.

**Responsibilities:**
- Validate global roles from JWT `realm_access.roles` on every request
- Derive manager scope from `user_hierarchy.manager_user_id` (depth = 1 only)
- Enforce team-scoped operations (approvals, team reports, assignment delegation)
- Deny access if authorization context is missing (fail-safe)
- Provide reusable authorization guards for all business modules

**Authorization Model:**

| Axis | Source | Values |
|---|---|---|
| Global Roles | Keycloak JWT (`realm_access.roles`) | `ADMIN`, `HR`, `EMPLOYEE` |
| Hierarchy Access | `user_hierarchy` table (Employee DB sync) | Direct reports only (depth = 1) |

**Important Rules:**
- Manager is NOT a Keycloak role — derived dynamically from `user_hierarchy.manager_user_id`
- Hierarchy depth = 1 — no transitive hierarchy (no "manager of managers" access)
- Authorization must fail safe: missing or invalid context → deny
- Both role and hierarchy checks applied where endpoint requires both
- Role assignment/removal done via Keycloak Admin API (owned by Admin Configuration module)

**Owned Data:** Authorization policies/rules only (no primary business tables)

**Depends On:** User Management, Authentication & Access, Employee DB sync result

**Used By:** All business modules

---

## Module 12: Search

**Purpose:** Provides PostgreSQL full-text search, federated discovery, and filtered retrieval across training, sessions, and users.

**Responsibilities:**
- Maintain `tsvector` search index on `training_items` (title A, description B, category C, tags C via join)
- Maintain `tsvector` search index on `users` (full_name A, email A, department B, designation B — Admin only)
- Maintain `tsvector` search index on `sessions` (title A, session_code A)
- Support keyword search with relevance ranking (`ts_rank`) and mandatory-first boost
- Support typeahead suggestions (prefix match on `training_items.title`)
- Support catalog browse (filtered, paginated training list)
- Enforce authorization — results scoped by role and hierarchy before return

**Important Rules:**
- **No external search engine** — PostgreSQL full-text (tsvector/GIN index) only
- Searchable scope (Phase 1): `training_items` (all roles), `sessions` (all roles, scoped), `users` (Admin only)
- Search operates only on LMS-internal data — no external queries
- Result visibility filtered by `lifecycle_state = PUBLISHED` for catalog browse (Employee/Manager/HR)
- `assignment_status` badge shown per user in catalog (requires Authorization context)
- Global search returns federated results with `result_type` discriminator (training / session / user)

**Owned Data:** tsvector computed columns on `training_items`, `users`, `sessions` (no separate search tables)

**Depends On:** Training Management, User Management, Sessions (indexed entities), Authorization

**Used By:** Employee, Manager, HR, Admin

---

## Module 13: File Management

**Purpose:** Manages training resource file references and OneDrive integration.

**Responsibilities:**
- Upload resource files to OneDrive via Graph API
- Store file metadata in `resource_files` table
- Generate short-lived streaming URLs for resource access
- Delete files from OneDrive on resource removal
- Link files to training resources

**Important Rules:**
- LMS stores metadata only — file content lives in OneDrive
- No direct file download from LMS server — streaming via OneDrive
- File types: PDF, MP4, PPTX (training resources); Excel/PDF (report exports — temporary)
- No uncontrolled file download bypass

**Owned Tables:** `resource_files`

**Depends On:** Integrations (OneDrive Graph API), Training Management

**Used By:** Training Management, Reporting (export files)

---

## Module 14: Admin Configuration

**Purpose:** Manages system-level configurable settings, global role assignments, and mandatory assignment rule configuration.

**Responsibilities:**
- Manage 9 system settings (typed key-value store, `admin_settings` table)
- Record all settings changes in append-only history (`admin_settings_history`)
- Assign and remove global roles via Keycloak Admin API
- Protect last-active Admin from role removal (`LAST_ADMIN_PROTECTED`)
- Expose mandatory assignment rule CRUD (data stored in Assignment Engine's `mandatory_assignment_rules` table)
- Emit audit events on all settings changes and role changes

**Settings Catalog (10 settings):**

| Key | Default | Consumer |
|---|---|---|
| `assignment.overdue_escalation_day_manager` | 7 | Assignment Engine |
| `assignment.overdue_escalation_day_hr_admin` | 30 | Assignment Engine |
| `assignment.approval_expiry_days` | 30 | Assignment Engine |
| `notification.due_date_reminder_days` | 7 | Notifications |
| `notification.session_reminder_hours_first` | 24 | Notifications |
| `notification.session_reminder_hours_second` | 1 | Notifications |
| `system.export_file_retention_hours` | 24 | Reporting |
| `system.notification_retention_days` | 90 | Notifications |
| `system.audit_log_retention_days` | 1825 | Audit |
| `system.policy_current_version` | v1 | Auth (policy acceptance check) |

**Important Rules:**
- Settings are an upsert key-value store — no new rows after initial seed
- Every settings change is written to `admin_settings_history` before the update (permanent, never purged)
- Role changes go to Keycloak Admin API — not stored in LMS DB
- `admin_settings_history` is permanent — never purged
- Only Admin role can use this module

**Owned Tables:** `admin_settings`, `admin_settings_history`

**Depends On:** Audit

**Used By:** Assignment Engine (escalation thresholds, approval expiry), Notifications (reminder timing, retention), Reporting (export retention), Audit (log retention)

---

## Module 15: API Layer

**Purpose:** Defines and serves the FastAPI REST API surface for all modules.

**Responsibilities:**
- Define OpenAPI-documented route handlers per module
- Map API requests to module application services
- Enforce request validation (Pydantic models)
- Return consistent response envelope: `{ success, data, message, errors }`
- Apply `X-Correlation-ID` to all responses

**Important Rules:**
- All external routes go through APISIX — no direct FastAPI exposure to clients
- Internal-only routes (prefix `/internal/`) must NOT be registered in APISIX
- Routes must be versioned: `/api/v1/`
- API Layer contains no business logic — delegates to module services only
- Module boundaries must not be bypassed via route handlers

**Owned Data:** None — interface layer only

**Depends On:** All application services

**Used By:** ReactJS frontend, PES (M2M), future external consumers

---

## Module 16: Background Jobs

**Purpose:** Executes all scheduled and event-triggered async work.

**Technology:** APScheduler (scheduled/cron) + FastAPI background tasks (event-triggered)

**Responsibilities:**
- Execute all scheduled jobs (see table below)
- Execute event-triggered async jobs (notification dispatch, audit write, Teams operations)
- Log job execution, row counts, errors
- Support retry on failure
- Prevent duplicate side effects via idempotency checks

**Scheduled Jobs:**

| Job | Frequency | Owner |
|---|---|---|
| Zoho HR sync | Daily | Integrations |
| Employee DB sync | Daily | Integrations |
| Integration health check | Every 15 min | Integrations |
| Compliance / mandatory rule evaluation | Nightly | Assignment Engine |
| Overdue detection + escalation | Daily | Assignment Engine |
| Approval expiry check | Daily | Assignment Engine |
| Due-date reminder dispatch | Daily | Notifications |
| Session reminder dispatch | Hourly | Notifications |
| Notification record purge | Daily | Notifications |
| Notification dead-letter retry | Hourly | Notifications |
| Export file cleanup | Daily | Reporting |
| Audit log retention purge | Weekly | Audit |
| Audit dead-letter retry | Hourly | Audit |

**Important Rules:**
- Jobs must be retryable — partial failures must not corrupt data
- Jobs must not hold DB locks longer than a single record operation
- Jobs must not duplicate side effects — idempotency check before action
- Worker process must be separate from the API server process
- Job failures logged to `integration_jobs` or module dead-letter tables

**Owned Tables:** Job execution logs (per module's owned tables — no separate Background Jobs table)

**Depends On:** Integrations, Notifications, Assignment Engine, Reporting, Audit

**Used By:** Entire system

---

# 8. Dependency Rules

## Allowed Dependency Direction

```
API Layer          → any module service
Core Modules       → Generic modules (not Supporting)
Supporting Modules → Core modules + Generic modules
Generic Modules    → not Core business rules (except Authorization → User Management)
Background Jobs    → any module service
```

## Forbidden Patterns

- One module updating another module's DB tables directly
- Reporting owning business rules (read-only only)
- Notification logic embedded inside core module business rules
- Integration logic scattered across business modules
- Authorization logic duplicated per route handler
- Compliance logic outside the Assignment Engine
- Audit writes as synchronous blocking operations

---

# 9. Module Communication Pattern

## Preferred Pattern

Module-to-module communication via:
1. Application service method calls (synchronous, within request)
2. Domain/application events (async, dispatched to Worker queue)

## Example: Assignment Created Flow

```
API Layer receives POST /assignments
       ↓
Assignment Engine service creates assignment record (DB write)
       ↓
Assignment Engine emits event: ASSIGNMENT_CREATED
       ↓
Worker picks up event (async):
  → Notifications module: creates notification record + dispatches email
  → Audit module: writes ASSIGNMENT_CREATED audit event
  → Compliance module (within AE): re-evaluates compliance_status
```

All downstream effects are eventual — the API response returns immediately after the DB write.

---

# 10. Backend Package Structure (FastAPI)

```
app/
  api/
    v1/
      auth/
      users/
      trainings/
      assignments/
      sessions/
      reports/
      notifications/
      admin/
      audit/
      search/
      integrations/
      migration/         ← Phase 2 (deferred)

  modules/
    user_management/
      domain/
      application/
      infrastructure/
      api/

    training_management/
      domain/
      application/
      infrastructure/
      api/

    assignment_engine/      ← owns assignments, mandatory rules, compliance_status, approvals
      domain/
      application/
      infrastructure/
      api/

    sessions/
      domain/
      application/
      infrastructure/
      api/

    notifications/
      domain/
      application/
      infrastructure/
      api/

    reporting/
      domain/
      application/
      infrastructure/
      api/

    audit/
      domain/
      application/
      infrastructure/
      api/

    integrations/
      domain/
      application/
      infrastructure/
      api/

    migration/             ← Phase 2 (deferred)
      domain/
      application/
      infrastructure/
      api/

    authentication/
      domain/
      application/
      infrastructure/
      api/

    authorization/
      domain/
      application/
      infrastructure/

    search/
      domain/
      application/
      infrastructure/
      api/

    file_management/
      domain/
      application/
      infrastructure/

    admin_configuration/
      domain/
      application/
      infrastructure/
      api/

    background_jobs/
      application/
      infrastructure/

  shared/
    database/
    security/
    logging/
    exceptions/
    config/
    utils/
    events/
```

> **Note:** There is no `compliance/` module folder. Compliance logic lives in `assignment_engine/`.

---

# 11. Frontend Module Mapping (React)

```
src/
  modules/
    auth/                  ← login, logout, PKCE flow
    dashboard/             ← role-specific home screens
    training/              ← catalog, course detail, learning path
    assignments/           ← my training, assignment list, approval requests
    sessions/              ← session list, session detail, attendance
    reports/               ← dashboard reports, export
    notifications/         ← notification center, preferences
    admin/                 ← settings, role management, mandatory rules,
                              user management, integrations, audit
    search/                ← global search, typeahead
    profile/               ← user profile, policy acceptance
    migration/             ← Phase 2 (deferred)
```

> **Note:** Approvals are part of the `assignments/` module — not a standalone frontend module. There is no `compliance/` frontend module.

Each frontend module maps to backend module services and screen definitions from `docs/requirements/02_ux/02_screens.md`.

---

# 12. Module-to-Screen Mapping

## Employee Screens
- Authentication & Access → Login, first-login policy
- Training Management → Training Catalog, Course Detail
- Assignment Engine → My Training, Assignment Detail, Certificate View
- Sessions → My Sessions, Session Detail
- Notifications → Notification Center, Notification Preferences
- Search → Search Results
- Profile → User Profile

## Manager Screens
All Employee screens plus:
- Assignment Engine → Team Assignments, Approval Requests
- Reporting → Team Progress, Team Reports

## HR Screens
All Employee screens plus:
- Reporting → Org Compliance, HR Reports, Export
- Audit → Audit Log Search (org-scoped)
- User Management → User List (read)

## Admin Screens
All Employee screens plus:
- User Management → User List, User Detail, Create User
- Training Management → Training Management, Session Management
- Reporting → All Reports, Export
- Audit → Audit Log Search (full), Audit Write Failures
- Admin Configuration → System Settings, Role Management, Mandatory Rules
- Integrations → Integration Health, Job Logs
- Notifications → Notification Failures
- Migration → Phase 2 (deferred)

---

# 13. Module-to-API Prefix Mapping

| API Prefix | Module | Notes |
|---|---|---|
| `/api/v1/auth/*` | Authentication & Access | Login, logout, token refresh |
| `/api/v1/users/*` | User Management | User CRUD, hierarchy |
| `/api/v1/trainings/*` | Training Management | Course, path, curriculum, resource, cert |
| `/api/v1/assignments/*` | Assignment Engine | Assignments, approvals |
| `/api/v1/sessions/*` | Session Management | Sessions, participants, attendance |
| `/api/v1/reports/*` | Reporting | Dashboards, exports, export jobs |
| `/api/v1/notifications/*` | Notifications | Notification center, preferences |
| `/api/v1/admin/*` | Admin Configuration | Settings, roles, mandatory rules |
| `/api/v1/audit/*` | Audit | Audit log search, dead-letter |
| `/api/v1/search/*` | Search | Full-text search, suggestions |
| `/api/v1/integrations/*` | Integrations | Health, sync trigger, PES compliance API |
| `/api/v1/migration/*` | Migration | Phase 2 (deferred) |
| `/internal/*` | Internal (not in APISIX) | Worker-to-API internal calls |

> **Note:** There is no `/api/v1/compliance/*` route group. Compliance status is accessed via `/api/v1/assignments/`, `/api/v1/reports/`, and `/api/v1/integrations/pes/compliance/`.

---

# 14. Module Build Order (Phase 1)

| Priority | Module | Reason |
|---|---|---|
| 1 | Authentication & Access | Everything depends on auth |
| 2 | Authorization | Required before any scoped data |
| 3 | User Management | Users required for all modules |
| 4 | Admin Configuration | Settings consumed by downstream modules |
| 5 | Training Management | Training required before assignments |
| 6 | Assignment Engine | Core business logic (includes compliance) |
| 7 | Sessions | Requires training + assignment context |
| 8 | Notifications | Depends on assignment and session events |
| 9 | Integrations | Zoho/Teams/OneDrive/PES |
| 10 | Reporting | Reads across all core modules |
| 11 | Search | Reads training catalog |
| 12 | Audit | Cross-cutting; add after core modules stable |
| 13 | File Management | Needed for training resources |
| 14 | Background Jobs | Scheduler setup after core modules |
| — | Migration | **Phase 2 — deferred** |

---

# 15. Future Extraction Readiness

**Best candidates for future microservice extraction:**

| Module | Reason |
|---|---|
| Notifications | Stateless, event-driven, high isolation |
| Reporting | Read-heavy, no writes to core tables |
| Search | Read-only index consumer |
| Integrations | External-system adapter, bounded |
| Audit | Append-only, independent consumer |

**Should remain coordinated (tight transactional coupling):**

| Module | Reason |
|---|---|
| User Management | Core identity referenced everywhere |
| Training Management | FK target for assignments and sessions |
| Assignment Engine | Owns compliance; complex cross-entity logic |
| Sessions | Tight coupling with assignment completion |

---

# 16. Final Guidance

This module structure is the **system blueprint** for:
- Backend module folder structure and service boundaries
- DB table ownership (no cross-module table writes)
- API prefix assignment
- AI-assisted code generation (always identify owning module first)
- Test scoping (unit tests within module; integration tests across modules)

**The most important rule:** Every piece of logic and every DB table belongs to exactly one module. When in doubt, check this document for ownership before writing code.

---

*Last updated: 2026-04-06. Cross-reference `01_architecture.md` for system topology and per-feature engineering files for exact contracts.*
