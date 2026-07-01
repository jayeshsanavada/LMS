# LMS System Architecture Document

---

## How to Use This File

| Reader | Purpose |
|---|---|
| **Frontend Developer** | Understand layer boundaries, auth flow, API gateway rules, module ownership |
| **Backend Developer** | Understand module structure, integration patterns, background job responsibilities, DB strategy |
| **QA / Test Engineer** | Understand what each layer does, what's sync vs async, failure behaviours |
| **AI Coding Assistant** | Understand system topology before generating code — module boundaries, auth model, integration patterns |
| **Architect / Tech Lead** | Source of truth for system design decisions and their rationale |

**What this file IS:**
- The authoritative system-level architecture reference
- Design decisions and their rationale
- Module ownership boundaries
- Integration patterns and data ownership rules

**What this file is NOT:**
- A feature spec (see `docs/requirements/01_features/`)
- An API reference (see `docs/requirements/engineering/features/XX/api.md`)
- A database schema (see `docs/requirements/engineering/features/XX/schema.md`)
- A gateway route list (see `docs/requirements/engineering/00_apisix_routes.md`)

**How it fits with other files:**
```
01_architecture.md  ← you are here (system topology, patterns, decisions)
    ↓
01_features/*.md         (what each module does — business rules)
    ↓
engineering/features/XX/api.md     (exact endpoints, payloads)
engineering/features/XX/schema.md  (exact tables, columns)
    ↓
engineering/00_apisix_routes.md    (gateway route inventory)
```

**AI coding note:** Read this file first to understand which module owns which responsibility. Do NOT assume a module owns something not listed in §5. Cross-reference the per-feature `api.md` and `schema.md` for exact contracts before generating code.

---

# 1. Architecture Overview

## Architecture Style

**DDD-based Modular Monolith**

| Property | Value |
|---|---|
| Deployment unit | Single application |
| Internal structure | Domain-based modules (DDD) |
| Module boundaries | Core / Supporting / Generic |
| API design | API-first (OpenAPI) |
| Future path | Designed for microservices extraction |

### Why This Approach

- User base < 1,000
- Reduced operational complexity for on-prem deployment
- Faster development and debugging
- Simpler transactions and reporting with single DB
- Suitable for internal network deployment

---

# 2. Architecture Principles

## Design Principles

- API-first (OpenAPI specification driven)
- Domain Driven Design (DDD) with clear bounded contexts
- Separation of Concerns — each module owns its tables and logic
- Integration-first — all external systems behind adapters
- Security by design — JWT validated at gateway AND in application
- Modular scalability within monolith
- On-prem deployment optimized

## Engineering Principles

- Clean architecture (domain layer has no framework dependencies)
- SOLID principles
- Background job processing (worker-based, not inline)
- Centralized structured logging
- Configuration-driven behavior via Admin settings catalog
- Audit trail for all state-changing operations
- Idempotency on all async operations

---

# 3. High Level Architecture

## Logical Layers

```
Presentation Layer     ReactJS (SPA)
       ↓
API Gateway Layer      APISIX (JWT validation, routing, rate limiting, correlation ID)
       ↓
API Layer              FastAPI (business logic, authorization enforcement)
       ↓
Application Layer      Service classes per module
       ↓
Domain Layer           Domain models, business rules, events
       ↓
Infrastructure Layer   DB adapters, external API clients, queue
       ↓
Database / Storage     PostgreSQL + OneDrive (files)
       ↑
Worker Layer           Background jobs (scheduled + event-driven)
```

---

## API Gateway Layer (APISIX)

**Responsibilities:**
- JWT validation (signature, expiry, `aud` claim)
- Route forwarding to FastAPI
- Rate limiting per route group
- TLS termination
- `X-Correlation-ID` injection on every request (UUID v4, generated if not provided)
- Separate route group for PES M2M (Client Credentials, 100 req/min limit)

**Does NOT handle:**
- Role or hierarchy authorization (done in FastAPI)
- Business logic

See `docs/requirements/engineering/00_apisix_routes.md` for the complete route inventory.

---

# 4. Domain Driven Design Structure

## Core Domain (Business-Critical)

| Module | Responsibility |
|---|---|
| Training Management | Course, learning path, curriculum, resource, certificate lifecycle |
| Assignment Engine | Assignment lifecycle, mandatory rules, compliance status, approval workflow, overdue detection |
| Session Management | Hybrid session scheduling, Teams integration, attendance tracking |

> **Note:** Compliance is NOT a standalone module. `compliance_status` is owned by the Assignment Engine. There is no separate Compliance module.

> **Note:** Approval Workflow is part of Assignment Engine — not a separate domain. Approvals are triggered by assignment requests and managed by the Assignment Engine.

---

## Generic Domain (Reusable)

| Module | Responsibility |
|---|---|
| User Management | User lifecycle, profile, Zoho sync, Admin override |
| Authorization | Hybrid auth — global roles (Keycloak) + hierarchy-based access (Employee DB) |
| Notification Engine | In-app + email notifications, queue processing, idempotency, dead-letter |
| Search | PostgreSQL full-text search (tsvector/GIN), typeahead suggestions |
| File Management | OneDrive Graph API integration, file metadata in LMS DB |

---

## Supporting Domain (External & Operational)

| Module | Responsibility |
|---|---|
| Integration Module | External system health monitoring, sync triggers, PES compliance API exposure |
| Reporting | Compliance reports, manager/HR/Admin views, async export engine |
| Audit | Immutable audit log, 5-year retention, dead-letter for write failures |
| Admin | System settings catalog, role management via Keycloak, mandatory rule management |

---

# 5. Module Breakdown

## Core Modules

---

### Training Management Module

Owns:
- Course, learning path, curriculum, resource, certificate, resource file records
- Training item lifecycle: DRAFT → REVIEW → PUBLISHED → ARCHIVED
- Completion logic and certificate generation
- Content gating (sequential progress)
- Training code auto-generation

Tables owned: `training_items`, `learning_paths`, `curricula`, `resources`, `certificates`, `resource_files`, `training_item_versions`

---

### Assignment Engine Module

Owns:
- Assignment lifecycle (`assignment_status`: ASSIGNED → IN_PROGRESS → COMPLETED / OVERDUE / CANCELLED)
- Approval request lifecycle (`request_status`: PENDING → APPROVED / REJECTED / EXPIRED) — separate from assignment_status
- Mandatory assignment rules (configured by Admin, evaluated nightly)
- Approval workflow (manager approves, 30-day expiry on pending approval)
- Overdue detection and escalation (Day 7 → manager; Day 30 → HR + Admin)
- Compliance status calculation per user (`compliance_status` table)
- Reassignment logic

Key design decisions:
- Assignments are never hard-deleted (CANCELLED status used)
- Manager is derived from `user_hierarchy` — NOT a Keycloak role
- Escalation thresholds driven by Admin settings (`assignment.overdue_escalation_day_manager`, `assignment.overdue_escalation_day_hr_admin`)
- Approval expiry driven by Admin setting (`assignment.approval_expiry_days`, default 30 days)

Tables owned: `assignments`, `assignment_history`, `mandatory_assignment_rules`, `assignment_requests`, `compliance_status`

---

### Session Management Module

Owns:
- Session lifecycle: SCHEDULED → COMPLETED / CANCELLED (no IN_PROGRESS state)
- **All sessions are HYBRID** (online via Teams + offline in-person) — Phase 1 has no online-only or offline-only sessions
- Teams meeting creation via Graph API on session publish
- Online attendance: auto-pulled from Teams Graph API after session ends
- Offline attendance: manually entered by Admin or HR (via manual entry or Excel import)
- Session reschedule: Teams meeting updated + participants re-notified
- Participant status: INVITED / NOMINATED / CONFIRMED / REJECTED_NOMINATION — Manager nomination workflow active in Phase 1
- Session code: auto-generated, unique

Key design decisions:
- Venue selected from Admin-managed `session_venues` list; `physical_location` stored as a snapshot of the venue name at save time (for display + migration fallback)
- Teams meeting link optional (fallback: manual link field)
- Attendance mode is per-participant: ONLINE / OFFLINE

Tables owned: `sessions`, `session_participants`, `session_attendance`, `session_facilitators`, `session_venues`

---

## Generic Modules

---

### Authorization Module

**Hybrid model — two independent axes:**

**Axis 1 — Global Roles (Keycloak)**
- `ADMIN` — full system access
- `HR` — org-wide visibility, reports, bulk operations
- `EMPLOYEE` — self-service access

Rules:
- Roles read from JWT `realm_access.roles` at runtime — NOT stored in LMS DB
- Role assignment and removal via Keycloak Admin API
- Last Admin protection: cannot remove `ADMIN` role if only 1 active Admin exists (`LAST_ADMIN_PROTECTED` error)

**Axis 2 — Hierarchy-Based Access (Employee DB)**
- Reporting manager relationship from `user_hierarchy.manager_user_id`
- Manager scope: depth = 1 (direct reports only — no transitive hierarchy)
- Manager is NOT a Keycloak role — derived dynamically per request
- Used for: approval authority, team report visibility, assignment delegation

Tables used: `user_hierarchy` (owned by User Management)

---

### Notification Module

Owns:
- Notification records (in-app + email)
- Delivery preferences per user
- Delivery attempt log

Patterns:
- All notifications are async — emitted as events, processed by worker
- Idempotency key: `event_code:entity_id:user_id:date_bucket` — prevents duplicate sends
- Failed sends logged to `notification_delivery_log` (immutable attempt log) for Admin visibility and retry
- Mandatory events are sent regardless of user preferences (e.g. `ASSIGNMENT_CREATED`, `SESSION_INVITED`)
- Non-mandatory events respect user preferences

Reminder timing driven by Admin settings:
- `notification.due_date_reminder_days` (default: 7 days before due)
- `notification.session_reminder_hours_first` (default: 24 hours before session)
- `notification.session_reminder_hours_second` (default: 1 hour before session)
- `system.notification_retention_days` (default: 90 days)

Tables owned: `notifications`, `notification_delivery_log`, `notification_preferences`

---

### Search Module

Owns:
- Full-text search index (PostgreSQL `tsvector` columns + GIN indexes)
- Typeahead suggestion endpoint
- Catalog browse (filtered training list)

**No external search engine** — PostgreSQL full-text search is the only search mechanism.

Searchable entities:
- `training_items` (title, description, category, tags — all roles)
- `sessions` (title, session_code — all roles, scoped by visibility)
- `users` (full_name, email, department, designation — Admin only)

Tables used: `training_items`, `users`, `sessions` (tsvector computed columns + GIN indexes on each)

---

### File Management Module

Owns:
- File metadata in `resource_files` table
- OneDrive upload/delete via Microsoft Graph API
- Streaming access control (LMS generates short-lived access URLs)

LMS stores: `external_file_id`, `reference_url`, `file_name`, `file_size`, `mime_type`
LMS does NOT store: file content (OneDrive is the store)

---

## Supporting Modules

---

### Integration Module

Owns:
- Integration health monitoring (`integration_jobs`, `integration_health_status` tables)
- Sync job orchestration (trigger, log, alert)
- PES compliance API exposure (separate APISIX route group)

Six integrations managed:

| System | Direction | Type |
|---|---|---|
| Zoho HR | Zoho → LMS | Scheduled pull (daily) |
| Employee / Timesheet DB | Employee DB → LMS | Scheduled pull (daily) |
| Keycloak + Azure AD | Keycloak ↔ LMS | Per-request (JWT / PKCE) |
| PES | PES → LMS | On-demand REST (M2M) |
| Microsoft Teams | LMS → Teams | Per-session (Graph API) |
| OneDrive | LMS → OneDrive | Per-resource (Graph API) |

**Failure principle:** No integration failure blocks user workflows. LMS uses last-known data and logs failures.

---

### Reporting Module

Owns:
- Pre-defined report generation (compliance, assignment, session, user activity)
- Async export engine (Excel + PDF; CSV not supported)
- Export file retention (24h, configurable via `system.export_file_retention_hours`)
- Pre-computed snapshot cache for heavy org-wide aggregations (`reporting_snapshots`)

Export pattern:
```
POST /reports/export  →  { job_id }   (report_type + filters in request body)
GET  /reports/export/{job_id}  →  poll status
GET  /reports/export/{job_id}/download  →  file stream (24h window)
```

Role-scoped visibility:
- Employee: own records only
- Manager: direct reports only (depth=1)
- HR/Admin: all users

Tables owned: `report_exports`, `reporting_snapshots`

---

### Audit Module

Owns:
- Immutable audit log (`audit_logs` — INSERT only, no UPDATE/DELETE)
- Dead-letter for write failures (`audit_write_failures`)
- Async export jobs (`audit_export_jobs`)

Key properties:
- Async write — audit failures never block originating operations
- Sensitive fields masked before write (email partial, tokens fully redacted)
- `correlation_id` links all events from one HTTP request across modules
- Retention: 5 years (`system.audit_log_retention_days = 1825`)
- `legal_hold = true` → permanent retention (exempt from purge)
- Admin visibility into dead-letter failures

Tables owned: `audit_logs`, `audit_write_failures`, `audit_export_jobs`

---

### Admin Module

Owns:
- System settings catalog (9 configurable key-value pairs, typed)
- Settings change history (append-only, permanent)
- Role assignment/removal via Keycloak Admin API
- Mandatory assignment rule management (delegated to Assignment Engine tables)

**Does NOT own:** role table (Keycloak), mandatory rule tables (Assignment Engine), integration health (Integrations)

Tables owned: `admin_settings`, `admin_settings_history`

---

# 6. Physical Architecture

## Components

| Component | Technology | Role |
|---|---|---|
| Web App | ReactJS (SPA) | User interface |
| API Server | FastAPI (Python) | Business logic, authorization |
| Worker Service | FastAPI background tasks + APScheduler | Scheduled jobs, async processing |
| Database | PostgreSQL | Single relational DB |
| Gateway | APISIX | JWT validation, routing, rate limiting |
| File Storage | Microsoft OneDrive | Binary file content |

## External Systems

| System | Role |
|---|---|
| Zoho HR | Employee master data |
| Employee / Timesheet DB | Hierarchy, capability, designation, project allocation |
| Keycloak + Azure AD | Authentication (OIDC/PKCE), global role management |
| Microsoft Teams | Session meeting delivery (Graph API) |
| OneDrive | Resource file storage (Graph API) |
| PES | Compliance data consumer (calls LMS API) |

---

# 7. Database Architecture

## Strategy

Single PostgreSQL database — one schema, modular table ownership.

**Why single DB:**
- User volume < 1,000 (no scale pressure)
- Simpler cross-module reporting queries
- Easier transaction management
- Lower operational overhead for on-prem

## Key Design Patterns

| Pattern | Where Used |
|---|---|
| UUID primary keys | All tables |
| Soft delete (`is_active = false`) | Users, assignments, rules |
| Append-only records | `audit_logs`, `admin_settings_history`, `assignment_history` |
| Optimistic locking | Not used (monolith, single DB) |
| Full-text search | `tsvector` columns on `training_items`, `users`, `sessions` + GIN indexes |
| Typed key-value store | `admin_settings` (10 system settings) |

## Data Domains and Owning Modules

| Domain | Tables | Owning Module |
|---|---|---|
| Users & Hierarchy | `users`, `user_hierarchy`, `user_project_allocations`, `user_field_overrides` | User Management |
| Training | `training_items`, `learning_paths`, `curricula`, `resources`, `resource_files`, `certificates` | Training Management |
| Assignments | `assignments`, `assignment_history`, `mandatory_assignment_rules`, `assignment_requests`, `compliance_status` | Assignment Engine |
| Sessions | `sessions`, `session_participants`, `session_attendance`, `session_facilitators`, `session_venues` | Session Management |
| Notifications | `notifications`, `notification_delivery_log`, `notification_preferences` | Notification |
| Reports | `report_exports`, `reporting_snapshots` | Reporting |
| Audit | `audit_logs`, `audit_write_failures`, `audit_export_jobs` | Audit |
| Integrations | `integration_jobs`, `integration_health_status` | Integration Module |
| Admin | `admin_settings`, `admin_settings_history` | Admin |

## Important: Data NOT in LMS DB

| Data | Location | Access Pattern |
|---|---|---|
| Global roles (ADMIN/HR/EMPLOYEE) | Keycloak | Read from JWT `realm_access.roles` at runtime |
| File content | OneDrive | Graph API per request |
| Meeting delivery | Microsoft Teams | Stored as `teams_meeting_id` / `teams_meeting_link` in `sessions` |
| Authentication tokens | Memory only | Never persisted in DB or localStorage |

---

# 8. Background Processing Architecture

## Worker Service

The Worker Service runs as a separate process alongside the FastAPI server. It handles all async and scheduled operations.

**Technology:** FastAPI background tasks (event-driven) + APScheduler (scheduled jobs)

## Scheduled Jobs

| Job | Schedule | Owned By |
|---|---|---|
| Zoho HR sync | Daily (configurable) | Integration Module |
| Employee DB sync | Daily (configurable) | Integration Module |
| Compliance evaluation (mandatory rule re-evaluation) | Nightly | Assignment Engine |
| Overdue detection + escalation | Daily | Assignment Engine |
| Approval expiry check | Daily | Assignment Engine |
| Due-date reminder dispatch | Daily | Notification Module |
| Session reminder dispatch | Hourly | Notification Module |
| Notification record purge | Daily | Notification Module |
| Export file cleanup | Daily | Reporting Module |
| Audit log retention purge | Weekly | Audit Module |
| Integration health check | Every 15 min | Integration Module |
| Audit dead-letter retry | Hourly | Audit Module |

## Event-Driven Jobs (async, triggered by API events)

| Trigger | Job |
|---|---|
| Assignment created | Send ASSIGNMENT_ASSIGNED notification |
| Session created / updated | Create / update Teams meeting |
| Session cancelled | Cancel Teams meeting + notify participants |
| Session completed | Pull Teams attendance, trigger attendance reconciliation |
| Compliance status change | Notify HR/Admin if overdue threshold crossed |
| Integration sync started | Log integration job record |
| Audit event emitted | Async write to `audit_logs` |

## Failure Handling

- Scheduled job failures: logged to `integration_jobs`, Admin alerted
- Notification failures: written to `notification_failures` (dead-letter), visible in Admin UI
- Audit write failures: written to `audit_write_failures` (dead-letter), visible in Admin UI
- No integration failure may block a user-facing API response

---

# 9. Integration Architecture

## Integration Principles

- LMS never overwrites source-of-truth data from external systems
- Every integration call is logged (`integration_jobs` table)
- Failures are graceful — LMS uses last-known data
- All integrations are retry-safe (idempotent operations)

---

## 9.1 Zoho HR

- **Direction:** Zoho → LMS (scheduled pull)
- **Data:** Employee identity, department, status, joining date
- **Conflict:** Zoho always wins for HR fields; Admin-overridden fields (`user_field_overrides`) are preserved
- **Failure:** Logged, retried next cycle, Admin notified
- **Trigger:** Scheduled (daily) + Admin manual via `POST /api/v1/integrations/zoho/sync`

---

## 9.2 Employee / Timesheet Database

- **Direction:** Employee DB → LMS (scheduled pull)
- **Data:** Reporting manager, capability, designation, project allocation
- **Used for:** Authorization (manager scope), mandatory rule targeting, reporting filters
- **Conflict:** Employee DB always wins for hierarchy fields
- **Trigger:** Scheduled (daily) + Admin manual via `POST /api/v1/integrations/employee-db/sync`

---

## 9.3 Keycloak + Azure AD

- **Direction:** Bidirectional — LMS reads JWT; LMS calls Keycloak Admin API to assign/remove roles
- **Auth flow:** PKCE (browser) / Client Credentials M2M (service accounts)
- **LMS reads:** JWT `realm_access.roles`, `sub` (user ID), `email`
- **LMS writes:** Role assignments via Keycloak Admin API (triggered by Admin role management)
- **Token storage:** In memory only — never stored in DB or localStorage

---

## 9.4 PES (Performance Evaluation System)

- **Direction:** PES → LMS (PES calls LMS; LMS does NOT push)
- **Auth:** Keycloak Client Credentials (M2M service account)
- **Rate limit:** 100 req/min (dedicated APISIX route group)
- **Endpoints:**
  - `GET /api/v1/integrations/pes/compliance/{employee_id}` — single employee compliance
  - `POST /api/v1/integrations/pes/compliance/bulk` — batch (max 100 employees per request)
- **Audit:** Every PES call logged as `PES_API_ACCESSED` event

---

## 9.5 Microsoft Teams

- **Direction:** LMS → Teams (Graph API)
- **Triggered by:** Session publish, reschedule, cancel
- **Data stored in LMS:** `teams_meeting_id`, `teams_meeting_link` in `sessions` table
- **Attendance:** Auto-pulled from Teams after session ends (Graph API call by Worker)
- **Fallback:** If Teams API fails, manual link field used; attendance entered manually

---

## 9.6 OneDrive

- **Direction:** LMS → OneDrive (Graph API)
- **Triggered by:** Training resource upload/delete
- **Data stored in LMS:** `external_file_id`, `reference_url`, `file_name`, `file_size` in `resource_files`
- **Access:** LMS generates short-lived streaming URL; file content served from OneDrive
- **LMS does NOT store file content**

---

# 10. Security Architecture

## Authentication

**Keycloak SSO (OIDC + PKCE)**

- Browser initiates PKCE flow → Keycloak issues JWT
- JWT validated at APISIX (signature, expiry, `aud` claim)
- JWT validated again in FastAPI middleware
- Token stored in memory only (no localStorage, no cookies)
- Token refresh handled by Keycloak PKCE flow

## Authorization

**Hybrid model — both axes enforced per endpoint:**

### Axis 1: Global Roles (Keycloak)
Read from JWT `realm_access.roles` on every request. Three roles:

| Role | Access Level |
|---|---|
| `ADMIN` | Full system — settings, user management, role assignment, all data |
| `HR` | Org-wide visibility — all users, all assignments, bulk operations, reports |
| `EMPLOYEE` | Self-service — own training, sessions, assignments, certificates |

### Axis 2: Hierarchy-Based Access (LMS)
- Manager scope derived from `user_hierarchy.manager_user_id` on every request
- Depth = 1 (direct reports only — no transitive hierarchy)
- Manager is NOT a Keycloak role
- Manager capabilities: approve/reject requests, view team progress, run team reports

### Enforcement points
1. APISIX: JWT validation + rate limiting (no role checks)
2. FastAPI route guards: role check from JWT
3. FastAPI service layer: hierarchy scope check for team-scoped operations

## API Security

- `X-Correlation-ID` (UUID v4) required on every request — injected by APISIX if absent
- PES M2M: separate APISIX route group, rate limited to 100 req/min, `aud` claim validated
- Internal endpoints (e.g. `POST /internal/notifications`) NOT exposed via APISIX — loopback only

---

# 11. File Storage Architecture

**Provider:** Microsoft OneDrive via Graph API

**Pattern:**
1. Client requests upload URL from LMS
2. LMS calls OneDrive Graph API to get upload URL
3. Client uploads directly to OneDrive (chunked for large files)
4. LMS stores metadata (`external_file_id`, `reference_url`) in `resource_files`
5. LMS generates short-lived streaming URL for download; content served from OneDrive

**LMS never stores file bytes** — only metadata.

**File types:** PDF, MP4, PPTX (training resources). Excel/PDF (report exports — temporary, 24h retention).

---

# 12. Search Architecture

**Provider:** PostgreSQL full-text search — no external search engine.

**Implementation:**
- `tsvector` computed columns + GIN indexes on `training_items` (title A, description B, category C, tags C via join), `users` (full_name A, email A, department B, designation B), `sessions` (title A, session_code A)
- `ts_rank` for relevance scoring; mandatory training boosted
- Typeahead suggestions: prefix match on `training_items.title` (`ILIKE 'prefix%'` with `text_pattern_ops` B-tree index)
- Catalog browse: filtered list (`lifecycle_state=PUBLISHED`, `assignment_status` badge per user)

**Scope (Phase 1):**
- `training_items` — all authenticated roles (Employee/Manager/HR/Admin)
- `sessions` — all authenticated roles (scoped: Employee sees own sessions; Manager sees own + team; Admin sees all)
- `users` — Admin only (`GET /search/users`)

---

# 13. Notification Architecture

## Delivery Channels

- **In-app:** stored in `notifications` table, displayed in UI notification center
- **Email:** sent via email provider (SMTP / provider TBD), logged in `notifications`

## Flow

```
Business event occurs (assignment, session, overdue, etc.)
       ↓
Event emitted to notification worker queue
       ↓
Worker reads notification template + resolves recipients
       ↓
Idempotency check: key = event_code:entity_id:user_id:date_bucket
       ↓
If not duplicate → create `notifications` record + dispatch email
       ↓
On failure → write to `notification_failures` (dead-letter)
```

## Event Categories

| Category | Preference Respected? |
|---|---|
| Mandatory (ASSIGNMENT_ASSIGNED, SESSION_INVITED, OVERDUE_ESCALATION) | No — always sent |
| Reminder (DUE_DATE_REMINDER, SESSION_REMINDER) | Yes |
| Status update (ASSIGNMENT_COMPLETED, APPROVAL_DECISION) | Yes |

## Timing (configurable via Admin settings)

- Due-date reminder: `notification.due_date_reminder_days` days before due
- Session reminder 1: `notification.session_reminder_hours_first` hours before
- Session reminder 2: `notification.session_reminder_hours_second` hours before
- Notification record retention: `system.notification_retention_days` (default 90 days)

---

# 14. Logging & Audit Architecture

## Structured Application Logging

- All API requests logged (request ID, method, path, status, duration)
- Worker job execution logged (job type, start, end, rows processed, errors)
- Centralized log output (stdout/file for on-prem log aggregation)

## Audit Log

- Immutable event store in `audit_logs` table — INSERT only, no UPDATE/DELETE
- Every state-changing operation emits an audit event
- `correlation_id` from request header links all events from one HTTP call
- Sensitive fields masked before write
- Async write — failures go to `audit_write_failures` dead-letter
- Retention: 5 years (configurable via `system.audit_log_retention_days`)
- `legal_hold = true` → exempt from retention purge (permanent)

---

# 15. Reporting Architecture

## Report Types

| Report | Scope |
|---|---|
| Compliance Summary | Per user / team / org |
| Assignment Status | Per user / team / org |
| Session Attendance | Per session / trainer / org |
| Training Completion | Per user / team / course |
| User Activity | Per user / org |

## Scope Rules

- Employee: own data only
- Manager: direct reports only (depth=1 hierarchy)
- HR/Admin: all users

## Export Pattern (async)

1. `POST /api/v1/reports/{report_type}/export` → returns `{ job_id }`
2. Worker generates file in background (Excel or PDF)
3. `GET /api/v1/reports/jobs/{job_id}` → poll status (PENDING / PROCESSING / COMPLETED / FAILED)
4. `GET /api/v1/reports/exports/{job_id}/download` → file stream (available for 24h)
5. File cleaned up after `system.export_file_retention_hours` (default: 24h)

**Supported formats:** Excel (.xlsx), PDF. CSV is not supported.

---

# 16. API Architecture

## API Strategy

- OpenAPI-first (specs defined before implementation)
- REST APIs with standard response envelope
- All endpoints under `/api/v1/` prefix
- Async export pattern for file generation (no synchronous file downloads for large reports)

## Response Envelope

```json
{
  "success": true,
  "data": {},
  "message": "optional message",
  "errors": []
}
```

## Pagination

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

## API Exposure via APISIX

All external APIs exposed through APISIX. Two route categories:

| Category | Auth | Notes |
|---|---|---|
| Standard user APIs | JWT (PKCE) | Role checked in FastAPI |
| PES M2M APIs | JWT (Client Credentials) | Dedicated route group, 100 req/min |

Internal-only endpoints (prefixed `/internal/`) are NOT configured in APISIX — accessible only within the application process.

**Route inventory:** See `docs/requirements/engineering/00_apisix_routes.md`

---

# 17. Scalability Strategy

**Current:** Vertical scaling (single on-prem server)

**Future path:**
- Modular monolith design allows extracting modules as microservices
- Clear module boundaries = defined service contracts
- DB tables grouped by module ownership = clean data partitioning if needed
- Worker Service already separate process — can be scaled independently

No horizontal scaling required for < 1,000 users.

---

# 18. Deployment Architecture

## Deployment Type

**On-Premise / Local Server**

## Components

| Component | Process | Notes |
|---|---|---|
| ReactJS SPA | Static files served via APISIX / nginx | Single build artifact |
| FastAPI Backend | Python ASGI process (Uvicorn) | Main application |
| Worker Service | Separate Python process | APScheduler + background tasks |
| PostgreSQL | Database server | Single instance |
| APISIX | API Gateway process | Routes + JWT validation |

## Notes

- No cloud dependency required for core functionality
- External cloud dependencies: Keycloak/Azure AD, Teams, OneDrive, Zoho HR, Employee DB
- Internal network deployment — APISIX is the single ingress point
- All inter-component communication on internal network

---

# Architecture Summary

| Property | Value |
|---|---|
| Architecture type | DDD Modular Monolith |
| Backend | FastAPI (Python) |
| Frontend | ReactJS (SPA) |
| Database | PostgreSQL (single instance) |
| Gateway | APISIX |
| Authentication | Keycloak + Azure AD (OIDC/PKCE) |
| Authorization | Hybrid: Global roles (Keycloak JWT) + Hierarchy (Employee DB, depth=1) |
| File storage | Microsoft OneDrive (Graph API) |
| Search | PostgreSQL full-text (tsvector/GIN) |
| Sessions | HYBRID only (Teams + in-person) — Phase 1 |
| Background jobs | APScheduler + FastAPI background tasks |
| Deployment | On-premise |
| Compliance ownership | Assignment Engine (not standalone module) |
| Manager | NOT a role — derived from `user_hierarchy.manager_user_id` |
| Token storage | Memory only (no localStorage, no DB) |
| Audit retention | 5 years (configurable) |
| Export formats | Excel (.xlsx) + PDF only |

---

*Last updated: 2026-04-06. Cross-reference with per-feature engineering files for exact API contracts and schema details.*
