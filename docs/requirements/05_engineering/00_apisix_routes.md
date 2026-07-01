# LMS — APISIX Routes Reference

> **Purpose:** Complete route inventory for APISIX gateway configuration.
> Aggregated from all per-feature `api.md` files under `engineering/features/`.
> Per-feature files are the authoritative spec — this file is the gateway-focused summary.
>
> **Rule:** If this file conflicts with a per-feature `api.md`, the per-feature file wins.
> Update both when adding or changing an endpoint.

---

## Key

| Column | Values |
|---|---|
| **Auth** | `JWT` — user JWT (PKCE); `M2M` — Keycloak Client Credentials (service account) |
| **Min Role** | Minimum role required; `ANY` = any valid JWT; `PES_SA` = PES service account only |
| **Scope** | `SELF` / `TEAM` / `ORG` — data scope enforced by backend |
| **Rate Limit** | APISIX rate limit if non-default |
| **Notes** | Special flags |

**Default rate limit:** No explicit limit (internal LMS users, <1000 users)
**PES rate limit:** 100 req/min (enforced at APISIX on M2M routes)

---

## Base Path: `/api/v1`

---

## 1. Auth

| Method | Path | Auth | Min Role | Scope | Rate Limit | Notes |
|---|---|---|---|---|---|---|
| GET | `/auth/me` | JWT | ANY | SELF | — | Bootstrap call; emits `AUTH_LOGIN_SUCCESS` |
| POST | `/auth/policy-acceptance` | JWT | ANY | SELF | — | |
| POST | `/auth/logout` | JWT | ANY | SELF | — | Returns Keycloak logout URL; emits `AUTH_LOGOUT` |

---

## 2. User Management

| Method | Path | Auth | Min Role | Scope | Rate Limit | Notes |
|---|---|---|---|---|---|---|
| GET | `/users` | JWT | HR | ORG | — | ADMIN and HR only |
| GET | `/users/me` | JWT | ANY | SELF | — | |
| PATCH | `/users/me` | JWT | ANY | SELF | — | Self profile update (full_name, phone, location) |
| GET | `/users/{user_id}` | JWT | ANY | SELF / TEAM / ORG | — | ADMIN/HR: ORG; Manager: TEAM; Employee: SELF |
| POST | `/users` | JWT | ADMIN | ORG | — | Manual user creation |
| PATCH | `/users/{user_id}` | JWT | ADMIN | ORG | — | Admin attribute override |
| POST | `/users/{user_id}/deactivate` | JWT | ADMIN | ORG | — | |
| POST | `/users/{user_id}/reactivate` | JWT | ADMIN | ORG | — | |
| POST | `/users/bulk-deactivate` | JWT | ADMIN | ORG | — | Max 100 users per request |
| POST | `/users/export` | JWT | HR | ORG | — | Async; returns job_id |
| GET | `/users/export/{job_id}/download` | JWT | ANY | SELF | — | Job creator or ADMIN only |
| GET | `/users/team-members` | JWT | ANY | TEAM | — | Returns direct reports (depth=1) |
| POST | `/users/sync` | JWT | ADMIN | ORG | — | Triggers Zoho/Employee DB sync |
| GET | `/users/{user_id}/capabilities` | JWT | ANY | SELF / ORG | — | ADMIN/HR: ORG; Employee: SELF (own capabilities only) |
| PUT | `/users/{user_id}/capabilities` | JWT | ADMIN | ORG | — | Replace manual capabilities |
| POST | `/users/{user_id}/capabilities/sync` | JWT | ADMIN | ORG | — | On-demand Zoho capability sync |

---

## 3. Training Management

| Method | Path | Auth | Min Role | Scope | Rate Limit | Notes |
|---|---|---|---|---|---|---|
| GET | `/trainings` | JWT | ANY | ORG | — | Employee: PUBLISHED only; Admin/HR: all states |
| GET | `/trainings/{training_id}` | JWT | ANY | ORG | — | Employee: PUBLISHED only |
| POST | `/trainings` | JWT | ADMIN | ORG | — | Creates in DRAFT state |
| PUT | `/trainings/{training_id}` | JWT | ADMIN | ORG | — | |
| POST | `/trainings/{training_id}/publish` | JWT | ADMIN | ORG | — | Increments version |
| POST | `/trainings/{training_id}/inactivate` | JWT | ADMIN | ORG | — | |
| POST | `/trainings/{training_id}/archive` | JWT | ADMIN | ORG | — | Reversible; hides from catalog |
| POST | `/trainings/{training_id}/restore` | JWT | ADMIN | ORG | — | Restores ARCHIVED → DRAFT |
| POST | `/trainings/{training_id}/clone` | JWT | ADMIN | ORG | — | New DRAFT copy |
| GET | `/trainings/{training_id}/versions` | JWT | HR | ORG | — | Admin and HR only |
| GET | `/trainings/{training_id}/structure` | JWT | ANY | ORG | — | Employee: PUBLISHED only |
| PUT | `/trainings/{training_id}/structure` | JWT | ADMIN | ORG | — | |
| POST | `/trainings/export` | JWT | HR | ORG | — | Async; returns job_id |
| GET | `/trainings/export/{job_id}/download` | JWT | ANY | SELF | — | Job creator or ADMIN |
| GET | `/trainings/{training_id}/assignments` | JWT | ADMIN | ORG | — | Assignments viewer modal (Screen 22) |
| GET | `/trainings/{training_id}/resources` | JWT | ANY | ORG | — | Employee: must have active assignment |
| POST | `/resources` | JWT | ADMIN | ORG | — | Creates resource linked to training |
| PUT | `/resources/{resource_id}` | JWT | ADMIN | ORG | — | |
| DELETE | `/resources/{resource_id}` | JWT | ADMIN | ORG | — | Soft delete; preserves history |
| PATCH | `/trainings/{training_id}/resources/reorder` | JWT | ADMIN | ORG | — | |
| GET | `/resources/{resource_id}` | JWT | ANY | ORG | — | Employee: must have active assignment |
| POST | `/resources/{resource_id}/progress` | JWT | EMPLOYEE | SELF | — | Called by resource player |
| GET | `/resources/{resource_id}/assessment` | JWT | ADMIN | ORG | — | Get assessment config + questions |
| PUT | `/resources/{resource_id}/assessment` | JWT | ADMIN | ORG | — | Update assessment config + questions |
| POST | `/resources/{resource_id}/assessment/attempts` | JWT | EMPLOYEE | SELF | — | Submit attempt; graded immediately |
| GET | `/resources/{resource_id}/assessment/attempts` | JWT | ANY | SELF | — | Attempt history; Admin: any user via query param |
| POST | `/resources/{resource_id}/assessment/attempts/reset` | JWT | ADMIN | ORG | — | Reset attempt counter for a user |
| GET | `/certificates/me` | JWT | ANY | SELF | — | |
| GET | `/certificates/{certificate_id}` | JWT | ANY | SELF / TEAM / ORG | — | |
| GET | `/certificates/{certificate_id}/download` | JWT | ANY | SELF / TEAM / ORG | — | Returns PDF stream; 403 if status ≠ APPROVED |
| POST | `/certificates/{certificate_id}/approve` | JWT | ADMIN | ORG | — | Approve pending certificate |
| POST | `/certificates/{certificate_id}/reject` | JWT | ADMIN | ORG | — | Reject with mandatory reason |

---

## 4. Assignment Engine

| Method | Path | Auth | Min Role | Scope | Rate Limit | Notes |
|---|---|---|---|---|---|---|
| GET | `/assignments/me` | JWT | ANY | SELF | — | |
| GET | `/assignments/{assignment_id}` | JWT | ANY | SELF / TEAM / ORG | — | |
| POST | `/assignments` | JWT | ANY | TEAM / ORG | — | ADMIN: ORG; Manager: TEAM only |
| GET | `/assignments/team` | JWT | ANY | TEAM | — | Direct reports only |
| PATCH | `/assignments/{assignment_id}/due-date` | JWT | ANY | TEAM / ORG | — | ADMIN: any; Manager: their assignments |
| POST | `/assignments/{assignment_id}/cancel` | JWT | ANY | TEAM / ORG | — | Cannot cancel COMPLETED |
| POST | `/assignments/{assignment_id}/complete` | JWT | ADMIN | ORG | — | Admin override completion |
| POST | `/assignments/export` | JWT | HR | ORG | — | Async; returns job_id |
| GET | `/assignments/export/{job_id}/download` | JWT | ANY | SELF | — | Job creator or ADMIN/HR |
| POST | `/assignments/self-enroll` | JWT | ANY | SELF | — | No-approval training only |
| POST | `/assignments/rules` | JWT | ADMIN | ORG | — | Create mandatory rule |
| GET | `/assignments/rules` | JWT | ADMIN | ORG | — | List mandatory rules |
| PUT | `/assignments/rules/{rule_id}` | JWT | ADMIN | ORG | — | |
| POST | `/assignments/rules/{rule_id}/deactivate` | JWT | ADMIN | ORG | — | Soft deactivate |
| POST | `/approvals/requests` | JWT | ANY | SELF | — | Approval-required training |
| GET | `/approvals/requests/me` | JWT | ANY | SELF | — | |
| GET | `/approvals/pending` | JWT | ANY | TEAM / ORG | — | Manager: TEAM; Admin: ORG |
| POST | `/approvals/{request_id}/approve` | JWT | ANY | TEAM / ORG | — | |
| POST | `/approvals/{request_id}/reject` | JWT | ANY | TEAM / ORG | — | |
| GET | `/compliance/users/{user_id}` | JWT | ANY | SELF / TEAM / ORG | — | PES pull API (BR-36); Employee: SELF; Manager: TEAM; Admin/HR: ORG |

---

## 5. Sessions

| Method | Path | Auth | Min Role | Scope | Rate Limit | Notes |
|---|---|---|---|---|---|---|
| GET | `/sessions/me` | JWT | ANY | SELF | — | Sessions user is INVITED to |
| GET | `/sessions` | JWT | ADMIN | ORG | — | Admin management list |
| GET | `/sessions/team` | JWT | ANY | TEAM | — | Sessions with direct-report participants |
| GET | `/sessions/{session_id}` | JWT | ANY | SELF / TEAM / ORG | — | ADMIN/HR: ORG; Manager: TEAM; Employee: SELF |
| POST | `/sessions` | JWT | HR | ORG | — | Auto-creates Teams meeting; Admin + HR |
| PUT | `/sessions/{session_id}` | JWT | HR | ORG | — | Reschedule; re-notifies participants; Admin + HR |
| POST | `/sessions/{session_id}/cancel` | JWT | HR | ORG | — | SCHEDULED only; Admin + HR |
| POST | `/sessions/{session_id}/complete` | JWT | ADMIN | ORG | — | Finalises attendance |
| PUT | `/sessions/{session_id}/teams-link` | JWT | ADMIN | ORG | — | Manual override when auto-create failed |
| POST | `/sessions/export` | JWT | HR | ORG | — | Async; returns job_id; Admin + HR |
| GET | `/sessions/export/{job_id}` | JWT | HR | ORG | — | Poll export status |
| GET | `/sessions/export/{job_id}/download` | JWT | HR | ORG | — | |
| GET | `/sessions/{session_id}/participants` | JWT | ADMIN | ORG | — | |
| POST | `/sessions/{session_id}/participants` | JWT | ADMIN | ORG | — | Bulk add; max_participants enforced |
| DELETE | `/sessions/{session_id}/participants/{user_id}` | JWT | ADMIN | ORG | — | SCHEDULED sessions only |
| GET | `/sessions/{session_id}/attendance` | JWT | HR | ORG | — | Admin + HR |
| PUT | `/sessions/{session_id}/attendance` | JWT | HR | ORG | — | Bulk offline attendance update; Admin + HR |
| POST | `/sessions/{session_id}/attendance/fetch-teams` | JWT | ADMIN | ORG | — | Pulls attendance from Teams Graph API |
| GET | `/sessions/{session_id}/attendance/template` | JWT | HR | ORG | — | Download pre-filled Excel template for offline attendance; Admin + HR |
| POST | `/sessions/{session_id}/attendance/import` | JWT | HR | ORG | — | Import offline attendance from Excel file; max 5 MB; Admin + HR |
| POST | `/sessions/{session_id}/nominations` | JWT | ANY | TEAM | — | Manager nominates direct reports; nomination window must be open |
| DELETE | `/sessions/{session_id}/nominations/{user_id}` | JWT | ANY | TEAM | — | Manager cancels nomination while window is open |
| POST | `/sessions/{session_id}/nominations/{user_id}/decide` | JWT | ADMIN | ORG | — | Admin confirms or rejects a nomination |
| GET | `/facilitators` | JWT | ADMIN | ORG | — | List managed facilitators (dropdown source) |
| POST | `/facilitators` | JWT | ADMIN | ORG | — | Create facilitator |
| PUT | `/facilitators/{facilitator_id}` | JWT | ADMIN | ORG | — | Rename facilitator |
| POST | `/facilitators/{facilitator_id}/deactivate` | JWT | ADMIN | ORG | — | Deactivate facilitator |
| GET | `/venues` | JWT | ADMIN | ORG | — | List managed venues (dropdown source) |
| POST | `/venues` | JWT | ADMIN | ORG | — | Create venue |
| PUT | `/venues/{venue_id}` | JWT | ADMIN | ORG | — | Update venue |
| POST | `/venues/{venue_id}/deactivate` | JWT | ADMIN | ORG | — | Deactivate venue |

---

## 6. Notifications

| Method | Path | Auth | Min Role | Scope | Rate Limit | Notes |
|---|---|---|---|---|---|---|
| GET | `/notifications/me` | JWT | ANY | SELF | — | |
| GET | `/notifications/me/unread-count` | JWT | ANY | SELF | — | Bell badge count |
| POST | `/notifications/{notification_id}/read` | JWT | ANY | SELF | — | Idempotent |
| POST | `/notifications/me/read-all` | JWT | ANY | SELF | — | |
| GET | `/notifications/me/preferences` | JWT | ANY | SELF | — | |
| PUT | `/notifications/me/preferences` | JWT | ANY | SELF | — | Cannot opt out of mandatory events |
| GET | `/notifications/admin/failures` | JWT | ADMIN | ORG | — | PERMANENTLY_FAILED notifications |
| POST | `/notifications/admin/failures/{notification_id}/retry` | JWT | ADMIN | ORG | — | |

> **Internal endpoint — NOT exposed via APISIX:**
> `POST /internal/notifications` — service-to-service only, called by other modules

---

## 7. Reporting

| Method | Path | Auth | Min Role | Scope | Rate Limit | Notes |
|---|---|---|---|---|---|---|
| GET | `/dashboard/me` | JWT | ANY | SELF | — | Employee personal dashboard |
| GET | `/dashboard/team` | JWT | ANY | TEAM | — | Manager team dashboard |
| GET | `/dashboard/hr` | JWT | HR | ORG | — | |
| GET | `/dashboard/admin` | JWT | ADMIN | ORG | — | |
| GET | `/reports/assignments` | JWT | ANY | SELF / TEAM / ORG | — | Scope enforced per role |
| GET | `/reports/compliance` | JWT | ANY | TEAM / ORG | — | Admin: ORG; HR: ORG; Manager: TEAM |
| GET | `/reports/completions` | JWT | ANY | TEAM / ORG | — | Admin: ORG; HR: ORG; Manager: TEAM |
| GET | `/reports/overdue` | JWT | ANY | TEAM / ORG | — | Admin: ORG; HR: ORG; Manager: TEAM |
| GET | `/reports/sessions/attendance` | JWT | ANY | TEAM / ORG | — | Admin: ORG; HR: ORG; Manager: TEAM |
| GET | `/reports/certificates` | JWT | ANY | SELF / TEAM / ORG | — | Employee: SELF; Manager: TEAM; Admin/HR: ORG |
| GET | `/reports/me/learning-history` | JWT | ANY | SELF | — | Employee personal learning record |
| GET | `/reports/approvals` | JWT | ANY | TEAM / ORG | — | Admin: ORG; Manager: TEAM |
| POST | `/reports/export` | JWT | ANY | SELF / TEAM / ORG | — | Async; scope enforced on filters |
| GET | `/reports/export/{job_id}` | JWT | ANY | SELF | — | Job creator or ADMIN |
| GET | `/reports/export/{job_id}/download` | JWT | ANY | SELF | — | Job creator or ADMIN; 24h expiry |

---

## 8. Audit

| Method | Path | Auth | Min Role | Scope | Rate Limit | Notes |
|---|---|---|---|---|---|---|
| GET | `/audit` | JWT | ANY | TEAM / ORG | — | ADMIN: all events; HR: compliance events; Manager: TEAM scoped |
| GET | `/audit/{event_id}` | JWT | ANY | TEAM / ORG | — | Same scope as search |
| GET | `/audit/trace/{correlation_id}` | JWT | ADMIN | ORG | — | Full cross-module operation trace |
| POST | `/audit/export` | JWT | HR | ORG | — | Admin: any events; HR: compliance events only |
| GET | `/audit/export/{job_id}` | JWT | ANY | SELF | — | Job creator or ADMIN |
| GET | `/audit/export/{job_id}/download` | JWT | ANY | SELF | — | Job creator or ADMIN; 24h expiry |
| GET | `/audit/admin/write-failures` | JWT | ADMIN | ORG | — | Dead-letter queue |
| POST | `/audit/admin/write-failures/{failure_id}/retry` | JWT | ADMIN | ORG | — | |

---

## 9. Search

| Method | Path | Auth | Min Role | Scope | Rate Limit | Notes |
|---|---|---|---|---|---|---|
| GET | `/search` | JWT | ANY | ORG | — | Federated; result types filtered by role |
| GET | `/search/catalog` | JWT | ANY | ORG | — | Browse without keyword |
| GET | `/search/training` | JWT | ANY | ORG | — | Scoped keyword search with full filter set |
| GET | `/search/users` | JWT | ADMIN | ORG | — | Admin-only user search |
| GET | `/search/suggestions` | JWT | ANY | ORG | — | Typeahead; max 10 results; < 200ms |

---

## 10. Integrations

| Method | Path | Auth | Min Role | Scope | Rate Limit | Notes |
|---|---|---|---|---|---|---|
| GET | `/integrations/health` | JWT | ADMIN | ORG | — | All integration health statuses |
| GET | `/integrations/{integration_name}` | JWT | ADMIN | ORG | — | Detail + last job for one integration |
| GET | `/integrations/{integration_name}/logs` | JWT | ADMIN | ORG | — | Paginated job history |
| GET | `/integrations/{integration_name}/logs/{job_id}` | JWT | ADMIN | ORG | — | Per-record detail logs |
| POST | `/integrations/zoho/sync` | JWT | ADMIN | ORG | — | Manual trigger; async |
| POST | `/integrations/employee-db/sync` | JWT | ADMIN | ORG | — | Manual trigger; async |
| POST | `/integrations/{integration_name}/retry` | JWT | ADMIN | ORG | — | Retry last failed job |
| GET | `/integrations/zoho/field-mapping` | JWT | ADMIN | ORG | — | Read Zoho field mapping configuration |
| PUT | `/integrations/zoho/field-mapping` | JWT | ADMIN | ORG | — | Update Zoho field mapping configuration |
| GET | `/integrations/pes/compliance/{employee_id}` | M2M | PES_SA | ORG | 100/min | Dedicated APISIX route with client_credentials validation + IP allowlist |
| POST | `/integrations/pes/compliance/bulk` | M2M | PES_SA | ORG | 100/min | Max 100 employee IDs per request |

---

## 11. Admin

| Method | Path | Auth | Min Role | Scope | Rate Limit | Notes |
|---|---|---|---|---|---|---|
| GET | `/admin/settings` | JWT | ADMIN | ORG | — | All settings, filterable by module |
| PUT | `/admin/settings/{setting_key}` | JWT | ADMIN | ORG | — | Emits `ADMIN_CONFIG_UPDATED` |
| GET | `/admin/settings/history` | JWT | ADMIN | ORG | — | Permanent change log |
| GET | `/admin/users/{user_id}/roles` | JWT | ADMIN | ORG | — | Reads from Keycloak |
| POST | `/admin/users/{user_id}/roles` | JWT | ADMIN | ORG | — | Calls Keycloak Admin API; emits `ROLE_MAPPING_UPDATED` |
| DELETE | `/admin/users/{user_id}/roles/{role}` | JWT | ADMIN | ORG | — | `LAST_ADMIN_PROTECTED` if last active Admin |
| GET | `/admin/mandatory-rules` | JWT | ADMIN | ORG | — | |
| POST | `/admin/mandatory-rules` | JWT | ADMIN | ORG | — | |
| PUT | `/admin/mandatory-rules/{rule_id}` | JWT | ADMIN | ORG | — | |
| DELETE | `/admin/mandatory-rules/{rule_id}` | JWT | ADMIN | ORG | — | Soft deactivate |

---

## 12. Probation Management

| Method | Path | Auth | Min Role | Scope | Rate Limit | Notes |
|---|---|---|---|---|---|---|
| GET | `/probation` | JWT | HR | ORG | — | HR/Admin: list all probationers with readiness flags |
| GET | `/probation/{user_id}` | JWT | HR | ORG | — | Per-employee probation detail + gate training checklist |
| POST | `/probation/{user_id}/confirm` | JWT | HR | ORG | — | HR only (Admin cannot bypass gate); validates all gates COMPLIANT |
| POST | `/probation/{user_id}/extend` | JWT | HR | ORG | — | HR only; probation_status must be PROBATION or EXTENDED |
| GET | `/probation/rules` | JWT | HR | ORG | — | Read-only filtered view of EMPLOYMENT_PHASE mandatory rules |

---

## Summary

| Module | Route Count |
|---|---|
| Auth | 3 |
| User Management | 12 |
| Training Management | 22 |
| Assignment Engine | 19 |
| Sessions | 18 |
| Notifications | 8 (+ 1 internal) |
| Reporting | 15 |
| Audit | 8 |
| Search | 5 |
| Integrations | 11 |
| Admin | 10 |
| Probation | 5 |
| **Total (external)** | **136** |
| **Total (internal, not via APISIX)** | **1** |

---

## APISIX Configuration Notes

### Standard JWT Routes (129 routes)
- JWT validation: Keycloak realm, `aud` must match LMS client ID
- `X-Correlation-ID` injection if absent
- TLS termination
- Forward to FastAPI backend

### PES M2M Routes (2 routes)
```
GET  /api/v1/integrations/pes/compliance/{employee_id}
POST /api/v1/integrations/pes/compliance/bulk
```
- Separate APISIX route group
- Auth: Keycloak Client Credentials — `grant_type=client_credentials`
- `aud` claim validated against LMS client ID
- Rate limit: 100 req/min per client_id
- IP allowlist: configure PES server IP(s) if applicable
- Every call logged as `PES_API_ACCESSED` audit event (in backend)

### Internal Route (not via APISIX)
```
POST /api/v1/internal/notifications
```
- Service-to-service only
- No external exposure
- Called by Assignment Engine, Sessions, etc. at event time
