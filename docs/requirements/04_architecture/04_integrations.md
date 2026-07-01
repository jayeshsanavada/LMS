# LMS Integration Architecture

> This is an architecture reference document — not a feature spec.
> Integrations are backend infrastructure, not user-facing features.
> The engineering-level API and schema for integration monitoring are in `docs/requirements/engineering/features/10_integrations/`.

---

## 1. Integration Overview

The LMS connects with six external systems. Each integration has a defined direction, mechanism, and failure behaviour. No integration is allowed to block user workflows.

| Integration | Direction | Mechanism | Owned By |
|---|---|---|---|
| Zoho HR | Zoho → LMS | Scheduled sync (pull) | Zoho |
| Employee / Timesheet DB | Employee DB → LMS | Scheduled sync (pull) | Employee DB |
| Keycloak + Azure AD | Keycloak ↔ LMS | JWT / PKCE (per request) | Keycloak |
| PES | PES → LMS | REST API (pull, on-demand) | LMS exposes; PES calls |
| Microsoft Teams | LMS → Teams | Graph API (per session event) | Microsoft |
| OneDrive | LMS → OneDrive | Graph API (per resource event) | Microsoft |

---

## 2. Data Ownership

LMS must never overwrite source system data. Each system owns its data; LMS stores only derived or reference copies.

| System | Source-of-Truth For | LMS Stores |
|---|---|---|
| Zoho HR | Employee identity, department, status | Copy in `users` table |
| Employee DB | Reporting manager, capability, designation, project | Copy in `user_hierarchy`, `user_project_allocations` |
| Keycloak | Authentication, global roles | Roles read from JWT at runtime |
| Microsoft Teams | Meeting delivery | `teams_meeting_link`, `teams_meeting_id` in `sessions` |
| OneDrive | File content | `external_file_id`, `reference_url` in `resource_files` |
| LMS | Training, assignments, completions, compliance status | Authoritative |
| PES | Consumer only | — |

---

## 3. Integration Details

---

### 3.1 Zoho HR

**Purpose:** Provides employee master data — identity, department, employment status, joining date.

**Direction:** Zoho → LMS (LMS pulls from Zoho API)

**Sync Type:** Scheduled background job (daily, configurable)

**Data Synced:**
- Employee ID, full name, email
- Department, designation, employment type
- Employment status (active / inactive)
- Joining date

**Conflict Resolution:**
- Zoho is always the source of truth for HR fields
- Admin-overridden fields (`user_field_overrides`) are not overwritten by sync
- Conflict fields logged to `user_attributes_sync_log.conflict_fields_json`

**Failure Behaviour:**
- Sync failure logged to `integration_jobs`
- LMS continues with last-known user data
- Retry on next scheduled run
- Admin alerted via notification

**Trigger:** Scheduled (cron) + Admin manual trigger via API

---

### 3.2 Employee / Timesheet Database

**Purpose:** Provides organizational hierarchy — reporting manager, capability, designation, project allocation. Used for authorization (manager scope), mandatory assignment targeting, and reporting filters.

**Direction:** Employee DB → LMS (LMS pulls)

**Sync Type:** Scheduled background job (daily, configurable)

**Data Synced:**
- Reporting manager (manager_user_id)
- Capability
- Designation (authoritative source — overrides Zoho for assignment rules)
- Project allocations (full replace per sync cycle)

**Critical Rules:**
- Manager is derived from this data — NOT a Keycloak role
- Hierarchy change only affects future assignments — existing assignments unaffected
- Pending approval requests re-routed to new manager on hierarchy change
- Project allocations: previous allocations removed, new ones inserted each sync

**Failure Behaviour:**
- Mandatory rule evaluation deferred if hierarchy unavailable
- LMS continues with last-known hierarchy
- Retry on next scheduled run

---

### 3.3 Keycloak + Azure AD

**Purpose:** Identity provider for SSO. Azure AD users sync into Keycloak. Keycloak issues JWT tokens consumed by LMS.

**Direction:** Keycloak → LMS (per-request JWT validation)

**Mechanism:** PKCE flow for browser clients; Client Credentials for M2M (PES service account)

**LMS Reads from JWT:**
- `sub` — Keycloak user ID (maps to `users.keycloak_id`)
- `realm_access.roles` — global roles: `ADMIN`, `HR`, `EMPLOYEE`
- `email`, `name` — for user context
- `aud` — validated against configured LMS client ID

**LMS Does NOT:**
- Store passwords
- Manage user credentials
- Push role assignments to Keycloak

**Failure Behaviour:**
- Keycloak down → login blocked (no fallback authentication)
- Existing sessions with valid JWT continue until token expiry (30 min)
- LMS API availability unaffected for non-auth operations

---

### 3.4 PES (Performance Evaluation System)

**Purpose:** PES calls LMS to retrieve employee compliance status for performance evaluation. LMS never pushes to PES.

**Direction:** PES → LMS (PES calls LMS REST API)

**Mechanism:** REST API secured via APISIX. PES authenticates using Keycloak Client Credentials (service account JWT). LMS validates `aud` claim.

**LMS Exposes:**
- `GET /api/v1/integrations/pes/compliance/{employee_id}` — compliance status per employee
- `POST /api/v1/integrations/pes/compliance/bulk` — batch compliance for multiple employees

**Response contains:**
- `compliance_state` per mandatory training (PENDING / COMPLIANT / NON_COMPLIANT)
- `completion_date` (if completed)
- `due_date`
- `is_migrated_basis` flag

**Rules:**
- PES is read-only — no write access to LMS data
- Every PES API call logged to `integration_jobs` with `job_type = API_ACCESS`
- Audit event `PES_API_ACCESSED` emitted on each call
- Rate limiting enforced at APISIX layer

---

### 3.5 Microsoft Teams

**Purpose:** Creates hybrid session meetings and fetches post-session attendance reports.

**Direction:** LMS → Teams (Graph API calls)

**Mechanism:** Microsoft Graph API. LMS uses a service account (app registration) with delegated permissions.

**LMS Calls Teams For:**
1. Create meeting → on session creation
2. Update meeting → on session reschedule
3. Fetch attendance report → after session end time passes

**Stored in LMS:**
- `sessions.teams_meeting_link` — join URL
- `sessions.teams_meeting_id` — Graph API meeting ID (for attendance pull)
- `sessions.teams_link_status` — AUTO_CREATED / MANUAL / PENDING_MANUAL

**Failure Behaviour:**
- Meeting creation failure → `teams_link_status = PENDING_MANUAL`, Admin provides link manually
- Attendance pull failure → Admin records attendance manually
- LMS session record unaffected — session proceeds regardless
- All Teams API failures logged to `integration_jobs`

---

### 3.6 OneDrive

**Purpose:** Stores training resource files (videos, PDFs, SCORM packages, documents). LMS stores metadata only — file content lives in OneDrive.

**Direction:** LMS → OneDrive (Graph API calls for upload and URL generation)

**Mechanism:** Microsoft Graph API. Service account with OneDrive read/write permissions on designated folder.

**LMS Stores:**
- `resource_files.external_file_id` — OneDrive file ID
- `resource_files.reference_url` — secured stream/access URL
- `resource_files.access_mode` — STREAM_ONLY (no download by default)

**Access Rules:**
- Resources are streamed, not downloaded (enforced at URL level)
- Only users with an active assignment for the training can access its resources
- URL validity checked at access time — expired URLs re-generated

**Failure Behaviour:**
- OneDrive unavailable → resource access blocked; training access degraded
- Upload failure → retry up to 3 times; Admin notified on permanent failure
- LMS training metadata unaffected — training can still be viewed; only resource access fails

---

## 4. Common Integration Principles

### Idempotency
All sync operations must be idempotent — re-running the same sync produces the same result without creating duplicates. Employee ID used as the deduplication key for user sync.

### Failure Isolation
Failure in any one integration must not cascade to others or block user workflows:
- Auth (Keycloak) failure blocks login only — not training access for active sessions
- Zoho sync failure → LMS continues with last-known data
- Employee DB sync failure → hierarchy operations deferred
- Teams failure → session proceeds with manual link
- OneDrive failure → resource access degraded; training management unaffected

### Retry Policy
| Integration | Auto-Retry | Max Retries | Admin Notification |
|---|---|---|---|
| Zoho HR | Yes (next schedule) | 3 same-day retries | On 3rd failure |
| Employee DB | Yes (next schedule) | 3 same-day retries | On 3rd failure |
| Teams | Yes (immediate) | 3 retries | On permanent failure |
| OneDrive | Yes (immediate) | 3 retries | On permanent failure |
| PES | N/A (on-demand) | Per request | On API error |

### Audit Logging
Every integration execution logged to `integration_jobs`. Detailed per-record logs in `integration_job_logs`. Audit events emitted for `SYNC_STARTED`, `SYNC_COMPLETED`, `SYNC_FAILED`, `PES_API_ACCESSED`.

### Health Monitoring
`integration_health_status` table maintains current health state per integration. Admin dashboard reads this table. Admin can manually trigger sync via API.

---

## 5. API Gateway (APISIX)

All LMS APIs — including integration endpoints — are exposed through APISIX.

**APISIX Responsibilities:**
- JWT validation (token issued by Keycloak)
- Route forwarding to FastAPI backend
- Rate limiting (PES API, sync triggers)
- Correlation ID injection (`X-Correlation-ID`) if absent
- TLS termination

**PES-specific APISIX config:**
- Separate route with client credentials validation
- IP allowlist for PES service (if applicable)
- Rate limit: configurable (default 100 req/min)

---

## 6. Sync Schedule (Default Configuration)

| Integration | Default Schedule | Manual Trigger |
|---|---|---|
| Zoho HR | Daily at 02:00 | `POST /integrations/zoho/sync` |
| Employee DB | Daily at 02:30 | `POST /integrations/employee-db/sync` |
| Teams attendance pull | After each session end time | Auto via background job |
| Compliance re-evaluation | Daily at 03:00 | Via Assignment Engine job |

---

## 7. Assumptions

- Single tenant; on-prem deployment
- Keycloak has Azure AD federation configured (LMS does not manage this)
- Microsoft Graph API accessible from LMS deployment environment
- Zoho HR API credentials stored securely in LMS config (not in DB)
- Employee DB accessible via internal network API or DB connection
- PES service account provisioned in Keycloak by Admin

---

## 8. Future Enhancements

- Real-time sync via webhooks (Zoho, Employee DB)
- Teams attendance auto-sync without manual trigger fallback
- SCIM 2.0 user provisioning via Keycloak
- Integration health alerting (email / Teams notification)
- Automated failure recovery with circuit breaker pattern
