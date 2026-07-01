# LMS Non-Functional Requirements

---

## How to Use This File

| Reader | Purpose |
|---|---|
| **Backend Developer** | Performance targets per operation type, security enforcement points, reliability patterns to implement |
| **Frontend Developer** | UI response time targets, browser/device support, accessibility requirements |
| **QA / Test Engineer** | Acceptance criteria for NFR tests (load, security, failure scenarios) |
| **DevOps / Infra** | Deployment constraints, uptime targets, environment requirements |
| **AI Coding Assistant** | Constraints that must be enforced in generated code — security patterns, idempotency, error handling, data retention |
| **Architect / Tech Lead** | Binding design constraints that cannot be relaxed without a decision record |

**What this file IS:**
- Binding non-functional constraints for the system
- Security requirements that every endpoint and module must satisfy
- Reliability patterns required in implementation
- Data retention rules with specific values

**What this file is NOT:**
- A feature spec (see `docs/requirements/01_features/`)
- An API reference (see `docs/requirements/engineering/features/XX/api.md`)
- An architecture overview (see `docs/requirements/03_architecture/01_architecture.md`)

**How it fits with other files:**
```
01_architecture.md  →  system topology and design decisions
02_nfr.md           →  you are here (constraints on quality, security, reliability)
01_features/*.md    →  functional requirements per module
```

**AI coding note:** These are not optional. Security constraints in §7 (PKCE, token-in-memory, aud claim validation, masking) and reliability constraints in §6 (idempotency, dead-letter) must be applied to every generated endpoint and background job. Do not skip them.

---

# 1. Overview

This document defines the **Non-Functional Requirements (NFRs)** for the Enterprise LMS system.

NFRs ensure the system is:
- Performant within defined response time targets
- Scalable for current volume with a clear growth path
- Secure across authentication, authorization, and data handling
- Reliable with defined retry, dead-letter, and fallback behaviors
- Maintainable through modularity and observability
- Integration-resilient — no integration failure may block user workflows

---

# 2. System Context

| Property | Value |
|---|---|
| Architecture | DDD Modular Monolith |
| Backend | Python FastAPI |
| Frontend | ReactJS (SPA) |
| Database | PostgreSQL (single instance) |
| API Gateway | APISIX |
| Authentication | Keycloak + Azure AD (OIDC/PKCE) |
| Deployment | On-premise |
| User volume | < 1,000 users |
| Concurrent users | 200–300 |
| File storage | Microsoft OneDrive (Graph API) |
| Search | PostgreSQL full-text (tsvector/GIN) — no external search engine |
| Background jobs | APScheduler + FastAPI background tasks |

**External Integrations:**

| System | Direction | Type |
|---|---|---|
| Zoho HR | Zoho → LMS | Scheduled pull (daily) |
| Employee / Timesheet DB | Employee DB → LMS | Scheduled pull (daily) |
| Keycloak + Azure AD | Keycloak ↔ LMS | Per-request JWT / PKCE |
| PES | PES → LMS | On-demand REST (M2M, Client Credentials) |
| Microsoft Teams | LMS → Teams | Per-session (Graph API) |
| OneDrive | LMS → OneDrive | Per-resource (Graph API) |

---

# 3. Performance Requirements

## API Response Time

| Request Type | Target |
|---|---|
| Standard API requests (CRUD, list, detail) | ≤ 300 ms (p95) |
| Complex queries (reports, filtered lists with joins) | ≤ 800 ms (p95) |
| Full-text search (tsvector queries) | ≤ 500 ms (p95) |
| Report UI summary (pre-aggregated) | ≤ 2 seconds (p95) |
| Auth / token validation | ≤ 200 ms (p95) |

## Async Operations (No Response Time SLA)

The following are always async — no synchronous response time target:
- Report export generation (Excel / PDF)
- Teams meeting creation / update on session publish
- Zoho and Employee DB sync jobs
- Audit log writes
- Notification dispatch

These return a `job_id` or acknowledgement; the client polls for result.

## UI Performance

- Page load (initial SPA load): ≤ 2 seconds
- Page navigation within SPA: ≤ 500 ms

## Throughput

- System must support 200–300 concurrent users without degradation
- Background jobs must run in a separate worker process — must not impact user-facing API response times
- PES M2M calls rate limited to 100 requests/min at APISIX

---

# 4. Scalability Requirements

- Current strategy: vertical scaling (on-prem server)
- Modular monolith structure designed for future horizontal scaling / microservices extraction
- Worker Service is a separate process — can be scaled independently from the API server
- PostgreSQL single instance sufficient for < 1,000 users; partitioning strategy defined for future growth
- No external search engine dependency — PostgreSQL full-text eliminates an external scaling concern

---

# 5. Availability Requirements

- System uptime target: ≥ 99% (on-prem constraint acknowledged)
- Core LMS functionality must remain available even when these external systems are down:

| External System Down | LMS Behavior |
|---|---|
| Zoho HR | Continue with last-synced user data; sync logged as failed |
| Employee DB | Continue with last-synced hierarchy; manager-scoped operations degraded (use last-known data) |
| PES | No impact on LMS; PES calls fail on PES side |
| Microsoft Teams | Session persists; manual meeting link field used as fallback |
| OneDrive | Resource file load fails gracefully; metadata accessible; new uploads blocked |
| Keycloak | Login blocked (no auth = no access); existing valid sessions may continue for token lifetime |

- **Principle:** No integration failure may return an error to an active user performing a core LMS operation. Integration failures are logged and retried silently.

---

# 6. Reliability Requirements

## Idempotency

All operations that can be triggered more than once must be idempotent:

| Operation | Idempotency Mechanism |
|---|---|
| Notification dispatch | Key: `event_code:entity_id:user_id:date_bucket` — duplicate check before send |
| Mandatory rule assignment | Duplicate check before creating assignment |
| Role assignment (Keycloak) | If already assigned: no-op, return success |
| Export job creation | Separate job per request; client polls by `job_id` |
| Audit log write | `correlation_id` + `event_code` + `entity_id` — deduplication in worker |
| Zoho / Employee DB sync | Upsert pattern — safe to re-run |

## Dead-Letter Pattern

Failed async writes must not be silently dropped:

| Failure Type | Dead-Letter Table | Admin Visibility |
|---|---|---|
| Audit log write failure | `audit_write_failures` | Admin UI — Audit Failures screen |
| Notification send failure | `notification_delivery_log` (attempt_status = FAILED) | Admin UI — Notification Failures screen |
| Integration sync failure | `integration_jobs` (status = FAILED) | Admin UI — Integration Health screen |

Dead-letter records must be retried by the Worker Service on the next cycle.

## Retry Policy

| Operation | Retry | Backoff |
|---|---|---|
| Integration API calls (Zoho, Teams, OneDrive) | Up to 3 times | Fixed 5 min intervals |
| Notification email delivery | Up to 3 times | Exponential (1 min, 5 min, 15 min) |
| Audit log dead-letter retry | Hourly worker pass | None (batch retry) |
| Notification dead-letter retry | Hourly worker pass | None (batch retry) |

## Data Consistency

- All state-changing operations within a single module are atomic (single DB transaction)
- Cross-module operations (e.g. assignment + notification + audit) are eventually consistent — not atomic
- Worker queue ensures all downstream effects are applied; failures are logged to dead-letter
- Assignment records are permanent — never hard-deleted (CANCELLED status used)
- Audit logs are permanent — INSERT only, never UPDATE or DELETE

---

# 7. Security Requirements

## Authentication

- **SSO mandatory:** Keycloak + Azure AD (OIDC/PKCE flow)
- No passwords stored in LMS — Keycloak is the identity provider
- **PKCE flow:** Browser initiates PKCE → Keycloak issues JWT → APISIX validates → FastAPI validates
- **Token storage:** JWT stored in memory only — never in localStorage, sessionStorage, cookies, or DB
- JWT validated at two points: APISIX (signature + expiry + `aud` claim) and FastAPI middleware
- `aud` claim must match LMS Keycloak client ID — requests with wrong audience rejected

## Authorization

- **Hybrid model (both axes enforced per endpoint):**
  - **Global Roles (Keycloak):** `ADMIN` / `HR` / `EMPLOYEE` — read from JWT `realm_access.roles` on every request
  - **Hierarchy-Based Access (Employee DB):** depth = 1 (direct reports only) — derived from `user_hierarchy` on every request
- **Fail-safe:** deny access if authorization context is missing or JWT is absent/invalid
- **Manager is NOT a Keycloak role** — derived dynamically from `user_hierarchy.manager_user_id`
- **Last Admin protection:** removing the `ADMIN` role from the last active Admin is blocked at API layer (`LAST_ADMIN_PROTECTED` error) — must not call Keycloak Admin API if check fails

## PES M2M Security

- PES uses Keycloak **Client Credentials** grant (service account — not PKCE)
- PES JWT must contain `aud` claim matching LMS client ID
- Separate APISIX route group for PES endpoints — rate limited to 100 req/min
- Every PES API call logged as `PES_API_ACCESSED` audit event (cannot be disabled)

## Data Security

- Sensitive fields masked before writing to `audit_logs`:
  - Email: partial masking (`j***@domain.com`)
  - Auth tokens, API keys: fully redacted (`[REDACTED]`)
- HTTPS required for all communication (TLS terminated at APISIX)
- Secrets and credentials stored in environment config — never hardcoded
- Internal-only endpoints (prefixed `/internal/`) must NOT be registered in APISIX — accessible only within the application process (loopback)

## API Security

- All external API calls routed through APISIX — no direct FastAPI exposure
- `X-Correlation-ID` (UUID v4) injected by APISIX on every request — echoed in all responses
- Unauthorized requests blocked at APISIX before reaching FastAPI
- Rate limiting configurable per route group in APISIX config

## Audit & Logging (Security Events)

All of the following must always produce an audit event regardless of user notification preferences:

- Login / logout
- Role assignment / removal
- Admin settings change
- Assignment creation / approval / rejection / cancellation
- PES API access
- Integration sync trigger
- User creation / deactivation

---

# 8. Usability Requirements

## Role Awareness

- UI must display only controls and navigation items available to the user's current role
- Manager-specific views (team progress, approvals) shown only when user has direct reports
- Admin-only screens not visible to HR or Employee roles

## Navigation

- Core actions reachable in ≤ 3 clicks from role dashboard
- Navigation structure defined in `docs/requirements/02_ux/02_screens.md`

## Consistency

- All screens follow the defined component and layout standards from `02_screens.md`
- Error messages user-friendly (no stack traces or internal error codes exposed to UI)
- All form validations inline — not on separate error pages

## Accessibility

- Keyboard navigation supported on all interactive elements
- Form inputs have visible labels (not placeholder-only)
- WCAG 2.1 AA minimum for core flows (login, training catalog, assignment list)
- Screen reader compatibility for core navigation

## Device Support

- **Primary target:** Desktop (1280px+)
- **Supported:** Tablet (portrait 768px+)
- **Basic support:** Mobile (responsive layout, no dedicated mobile flows)
- **Browsers:** Chrome (latest), Edge (latest)

---

# 9. Maintainability Requirements

## Code Structure

- Feature-based modular structure — each module owns its routes, services, models, and tables
- No cross-module direct DB queries — modules communicate through service interfaces
- Domain layer has no FastAPI or ORM dependencies

## API Standards

- All APIs OpenAPI-compliant (auto-generated from FastAPI route definitions)
- Consistent response envelope: `{ success, data, message, errors }`
- Consistent error codes (e.g. `USER_NOT_FOUND`, `LAST_ADMIN_PROTECTED`) — not raw HTTP status only
- API versioning: `/api/v1/` prefix on all routes

## Configuration

- All environment-specific values externalized (env vars / config file)
- No hardcoded values for: DB connection, Keycloak URL, Teams client ID, OneDrive credentials, APISIX config
- System behavior configurable via Admin settings catalog (9 settings, see `engineering/features/11_admin/api.md`)

## Testability

- Unit tests required for: business rules, assignment logic, compliance evaluation, idempotency checks
- Integration tests required for: all API endpoints, background job execution, Keycloak auth flow
- Minimum code coverage: 70% (recommended)

---

# 10. Observability Requirements

## Structured Logging

Every log entry must include:

| Field | Value |
|---|---|
| `correlation_id` | UUID v4 from request header (links all events in one request) |
| `timestamp` | ISO 8601 |
| `module` | Module name (e.g. `assignment_engine`, `notification`) |
| `action` | What happened (e.g. `ASSIGNMENT_CREATED`, `SYNC_JOB_COMPLETED`) |
| `user_id` | Acting user (null for system/worker actions) |
| `level` | INFO / WARNING / ERROR |

## Integration Health Monitoring

- All integrations must have a health status: `HEALTHY` / `DEGRADED` / `DOWN`
- Status derived from: last sync success/failure, `consecutive_failures` count
- Admin dashboard shows: current status, last success, last failure, consecutive failure count
- Manual trigger available per integration for Admin (`POST /api/v1/integrations/{name}/trigger`)
- Job-level logs accessible per integration (`GET /api/v1/integrations/{name}/jobs`)

## Dead-Letter Visibility

- `audit_write_failures` — Admin screen: Audit Write Failures (retry + dismiss)
- `notification_delivery_log` (failed attempts) — Admin screen: Notification Failures (retry + dismiss)
- Integration job failures — Admin screen: Integration Health (per-job log)

## Alerting

Alerts triggered for:

| Event | Channel |
|---|---|
| Integration sync failure | Admin notification (in-app + email) |
| Repeated integration failure (consecutive_failures ≥ threshold) | Admin notification |
| Authentication failure spike | Log-level WARNING; alert configurable |
| Dead-letter accumulation (audit / notification) | Admin notification |
| Scheduled job missed execution | Log-level ERROR |

---

# 11. Data Requirements

## Data Integrity

- Referential integrity enforced via PostgreSQL foreign keys
- Duplicate prevention at application layer for: assignments, mandatory rules, notification sends
- UUID primary keys on all tables — no sequential integer IDs

## Data Consistency

- Strong consistency within module (single DB transaction per operation)
- Eventual consistency for:
  - Search index (tsvector updated after training item changes — may lag by one sync cycle)
  - Notification delivery (async dispatch via worker)
  - Audit log (async write via worker)
  - Reporting aggregates (pre-computed at query time; not cached)

## Data Ownership

- **LMS never overwrites source-of-truth data from external systems**
- Conflict resolution: source system always wins, except Admin-overridden fields (`user_field_overrides`)
- Module-level ownership: each table belongs to exactly one module (see `01_architecture.md` §7)

## Data Retention

| Data | Retention | Notes |
|---|---|---|
| Training records | Permanent | Never deleted |
| Assignment records | Permanent | Soft-delete only (CANCELLED status) |
| Audit logs | 5 years (configurable) | `system.audit_log_retention_days = 1825` |
| Audit logs with `legal_hold = true` | Permanent | Exempt from retention purge |
| `admin_settings_history` | Permanent | Append-only, never purged |
| Notification records | 90 days (configurable) | `system.notification_retention_days = 90` |
| Export files (Excel/PDF) | 24 hours | `system.export_file_retention_hours = 24` |
| Integration job logs | Retained per module policy | Not globally purged |
| `audit_write_failures` dead-letter | 90 days | After successful retry or Admin dismiss |
| `notification_failures` dead-letter | 90 days | After successful retry or Admin dismiss |

---

# 12. Integration Requirements

## General Principles

- API-first integrations — all external calls through defined adapter interfaces
- Idempotent operations — safe to re-run on retry
- No integration failure may block a user-facing LMS operation
- **LMS never overwrites source-of-truth data from external systems**
- All sync operations logged to `integration_jobs` table (status, rows synced, errors)

## Per-Integration Requirements

### Zoho HR

- Scheduled daily pull — LMS pulls, Zoho does not push
- Read-only for LMS (no write back to Zoho)
- Conflict: Zoho wins for HR fields; Admin-overridden fields preserved
- Failure: log to `integration_jobs`, retry next cycle, notify Admin

### Employee / Timesheet DB

- Scheduled daily pull — LMS pulls hierarchy and attributes
- Source of truth for: reporting manager, capability, designation, project allocation
- Used by: authorization (manager scope), mandatory rule targeting, reporting filters
- Failure: LMS continues with last-known hierarchy; manager-scoped operations degrade gracefully

### Keycloak + Azure AD

- Per-request JWT validation (no polling or sync)
- LMS writes back: role assignments via Keycloak Admin API (Admin module only)
- Token in memory only — never stored
- `aud` claim validation mandatory

### PES

- PES calls LMS — LMS does NOT push data to PES
- Auth: Keycloak Client Credentials (M2M service account)
- Rate limit: 100 req/min at APISIX
- Every call audited: `PES_API_ACCESSED` event logged

### Microsoft Teams

- LMS calls Teams Graph API on: session publish, reschedule, cancel
- Failure: fallback to manual meeting link field — session proceeds without Teams link
- Online attendance auto-pulled from Teams Graph API after session ends
- Failure of attendance pull: Admin can enter offline attendance manually

### OneDrive

- LMS calls OneDrive Graph API on: resource upload, delete
- File content served from OneDrive (LMS stores metadata only)
- Failure: resource access blocked; new uploads blocked; existing metadata accessible

---

# 13. Background Processing Requirements

## Technology

- **APScheduler** for scheduled/cron jobs
- **FastAPI background tasks** for event-triggered async jobs
- Worker runs as a separate process from the API server

## Scheduled Jobs

| Job | Frequency | Owner |
|---|---|---|
| Zoho HR sync | Daily | Integration |
| Employee DB sync | Daily | Integration |
| Integration health check | Every 15 min | Integration |
| Compliance / mandatory rule evaluation | Nightly | Assignment Engine |
| Overdue detection + escalation | Daily | Assignment Engine |
| Approval expiry check | Daily | Assignment Engine |
| Due-date reminder dispatch | Daily | Notification |
| Session reminder dispatch | Hourly | Notification |
| Notification record purge | Daily | Notification |
| Export file cleanup | Daily | Reporting |
| Audit log retention purge | Weekly | Audit |
| Audit dead-letter retry | Hourly | Audit |
| Notification dead-letter retry | Hourly | Notification |

## Job Requirements

- Every job must log start, end, row counts, and errors to `integration_jobs` or module-specific log table
- Every job must be restartable — partial failures must not corrupt data
- Jobs must not hold DB locks longer than the duration of a single record operation
- Background jobs must not share a thread pool with the API server

---

# 14. Export Requirements

- **Supported formats:** Excel (.xlsx), PDF — CSV is NOT supported
- **All exports are async** — no synchronous file downloads for generated reports
- **Export pattern:**
  1. `POST /reports/export` → returns `{ job_id }` (report_type + filters in request body)
  2. Worker generates file in background
  3. `GET /reports/export/{job_id}` → poll status
  4. `GET /reports/export/{job_id}/download` → file stream (available for 24h)
- **File retention:** 24 hours (configurable via `system.export_file_retention_hours`)
- **File storage:** temporary storage on server; cleaned up by daily export file cleanup job
- **Access control:** only the requesting user can download their own export

---

# 15. Deployment Requirements

- **Type:** On-premise / local server
- **Containerization:** Docker preferred (each component in its own container)
- **Components as separate processes:**
  - ReactJS SPA (served via APISIX / nginx)
  - FastAPI backend (Uvicorn ASGI)
  - Worker Service (separate Python process)
  - PostgreSQL
  - APISIX gateway

## Environments

| Environment | Purpose |
|---|---|
| Development | Local developer machines |
| QA | Test and validation |
| Production | Live system |

- Environment-specific configuration via env vars (no hardcoded values)
- Migrations managed via versioned migration scripts (not auto-applied in production without review)

---

# 16. API Requirements

- All APIs RESTful, JSON request/response
- API versioning: `/api/v1/` prefix — version increment requires a decision record
- Standard response envelope enforced on all endpoints (including errors)
- Standard error code format: `SCREAMING_SNAKE_CASE` (e.g. `USER_NOT_FOUND`, `INVALID_SETTING_VALUE`)
- Pagination required on all list endpoints: `page`, `size`, `total`, `has_next`
- `X-Correlation-ID` required on all requests; echoed in all responses
- OpenAPI schema auto-generated from FastAPI route definitions

---

# 17. Failure Handling Requirements

## User-Facing Failures

- All API errors return structured JSON (never raw stack traces or HTML error pages)
- HTTP status codes must match error type (404 for not found, 422 for validation, 403 for auth, 409 for conflict)
- User-facing messages must be clear and actionable — not technical
- Internal error detail logged server-side only

## Critical Failure Scenarios

| Scenario | Behavior |
|---|---|
| Keycloak down | Login blocked; existing valid JWT sessions continue until token expiry |
| Zoho HR down | Last-synced user data used; sync failure logged and retried |
| Employee DB down | Last-known hierarchy used; manager-scoped operations degrade (no new authorization grants, but existing scopes respected) |
| PES down | No impact on LMS; PES calls fail on PES side — LMS is not the caller |
| Teams API down | Session created without Teams link; manual link field available; attendance entered manually |
| OneDrive down | New resource uploads blocked (graceful error); existing metadata accessible; streaming fails gracefully |
| Audit write failure | Written to `audit_write_failures` dead-letter; original operation succeeds; retried by worker |
| Notification send failure | Written to `notification_failures` dead-letter; original operation succeeds; retried by worker |
| Export generation failure | `report_exports` status set to FAILED; user sees failure in poll response |
| DB connection failure | API returns 503; logged; no silent data loss |

---

# 18. Testing Requirements

| Test Type | Scope |
|---|---|
| Unit tests | Business rules, assignment logic, compliance evaluation, idempotency key generation, retention policies |
| API tests | All endpoints — auth, role enforcement, response shape, error codes |
| Integration tests | Keycloak auth flow, DB transactions, background job execution, dead-letter behavior |
| End-to-end tests | Core user flows (assign training, complete, generate certificate; session lifecycle; admin settings change) |
| Security tests | JWT validation, `aud` claim rejection, role boundary checks, last Admin protection |

- Minimum code coverage: 70% (recommended)
- Background job tests must use a real DB instance (not mocked) — mock/prod divergence is a known failure mode

---

# 19. Documentation Requirements

- OpenAPI specification auto-generated and kept up to date (FastAPI → OpenAPI)
- Per-module `api.md` and `schema.md` in `docs/requirements/engineering/features/XX/`
- Architecture decisions recorded in `docs/requirements/03_architecture/`
- Deployment runbook required for: initial setup, environment configuration, integration credential setup
- Admin user guide required for: settings catalog, role management, integration monitoring

---

# 20. Future Readiness

System must not create architectural blockers for:

- **AI / recommendation features** (future phase) — training catalog search must be extensible
- **Horizontal scaling** — module boundaries designed for service extraction
- **Event-driven extensions** — audit event catalog (`audit_logs.event_code`) is the extension point for future event consumers
- **Mobile app** — API-first design means a mobile client is addable without backend changes

No decisions in Phase 1 should assume these future capabilities are required — they must simply not be blocked.

---

*Last updated: 2026-04-06. Cross-reference `01_architecture.md` for topology decisions and per-feature engineering files for exact API contracts.*
