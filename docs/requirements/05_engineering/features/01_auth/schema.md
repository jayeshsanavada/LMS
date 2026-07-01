# Auth & Access — Database Schema

---

## 1. Design Principles

- Single relational database (modular monolith)
- Module-owned tables with clear boundaries
- Soft-delete / inactive-state preferred over hard delete
- Audit and compliance records never hard-deleted
- Historical retention for all access-related records

---

## 2. Common Columns Standard

These columns apply to all tables unless noted:

| Column | Type | Purpose |
|---|---|---|
| `id` | UUID | Primary key |
| `created_at` | TIMESTAMP | Record creation time |
| `created_by` | VARCHAR(100) | User ID or system actor |
| `updated_at` | TIMESTAMP | Last update time |
| `updated_by` | VARCHAR(100) | User ID or system actor |
| `is_active` | BOOLEAN | Active / inactive flag |

---

## 3. Tables Owned by Auth Module

---

### Table: `role_mappings`

**Purpose**
Caches the effective global LMS role per user, sourced from Keycloak JWT claim `realm_access.roles`. Updated during user sync and on role change events.

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `user_id` | UUID | No | FK → `users.id` |
| `global_role` | VARCHAR(50) | No | `ADMIN` / `HR` / `EMPLOYEE` |
| `source_system` | VARCHAR(50) | No | Always `KEYCLOAK` |
| `assigned_at` | TIMESTAMP | No | When this role was assigned |
| `is_active` | BOOLEAN | No | Only one active row per user |
| `created_at` | TIMESTAMP | No | |
| `updated_at` | TIMESTAMP | No | |

**Business Rules**
- One active `role_mappings` row per user at any time
- Role value must be one of: `ADMIN`, `HR`, `EMPLOYEE`
- Manager is never stored here — derived from `user_hierarchy` at runtime
- When role changes in Keycloak, old row set `is_active = false`, new row inserted

**Indexes**
- `user_id` (FK query)
- `(user_id, is_active)` (active role lookup)

---

### Table: `authorization_policies`

**Purpose**
Stores configurable authorization policy definitions. Defines which role and/or hierarchy check is required for a given module action. Read by the Auth/Authorization layer; written and managed by the Admin module.

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `policy_code` | VARCHAR(100) | No | Unique identifier e.g. `ASSIGN_TRAINING_TEAM` |
| `module_name` | VARCHAR(100) | No | e.g. `assignment`, `sessions` |
| `action_name` | VARCHAR(100) | No | e.g. `create`, `approve`, `view_team` |
| `description` | TEXT | Yes | Human-readable description |
| `requires_role` | VARCHAR(50) | Yes | `ADMIN` / `HR` / `EMPLOYEE` / null (any) |
| `requires_hierarchy` | BOOLEAN | No | True if TEAM_ONLY hierarchy check required |
| `is_active` | BOOLEAN | No | Inactive policies not enforced |
| `created_at` | TIMESTAMP | No | |
| `updated_at` | TIMESTAMP | No | |

**Business Rules**
- `policy_code` must be unique
- Auth module reads this table — does not write to it
- Admin module seeds and manages this table
- Inactive policies (`is_active = false`) are not evaluated

**Indexes**
- `policy_code` (unique)
- `(module_name, action_name)` (runtime lookup)

---

### Table: `access_denied_logs`

**Purpose**
Immutable log of all access denial events. Supports security investigation, compliance audit, and support diagnosis. Never hard-deleted.

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `user_id` | UUID | Yes | FK → `users.id`; null if user not identified |
| `endpoint` | VARCHAR(255) | No | API path that was denied |
| `http_method` | VARCHAR(10) | No | `GET` / `POST` / `PUT` etc. |
| `denial_reason` | TEXT | No | Human-readable reason |
| `denial_code` | VARCHAR(100) | No | e.g. `AUTH_TOKEN_INVALID`, `USER_DEACTIVATED` |
| `ip_address` | VARCHAR(50) | Yes | Client IP if available |
| `correlation_id` | VARCHAR(100) | Yes | Request correlation ID |
| `created_at` | TIMESTAMP | No | Immutable — never updated |

**Business Rules**
- Immutable — no updates or deletes
- `denial_code` must map to a defined auth event code
- Records retained minimum 5 years (aligns with audit retention policy)

**Indexes**
- `user_id` (user investigation queries)
- `denial_code` (filter by error type)
- `created_at` (time-range queries)
- `correlation_id` (request tracing)

---

## 4. Referenced Tables (Owned by Other Modules)

These tables are referenced by FK from Auth tables but are **not owned by this module**:

| Table | Owning Module | Used By |
|---|---|---|
| `users` | User Management | `role_mappings.user_id`, `access_denied_logs.user_id` |
| `admin_settings` | Admin | Policy version comparison in `/auth/me` and `/auth/policy-acceptance` |

---

## 5. Enum Values

### `global_role`
- `ADMIN`
- `HR`
- `EMPLOYEE`

### `denial_code` (auth-specific)
- `AUTH_TOKEN_INVALID`
- `AUTH_TOKEN_EXPIRED`
- `AUTH_ACCESS_DENIED`
- `USER_NOT_PROVISIONED`
- `USER_DEACTIVATED`
- `AUTH_AUDIENCE_INVALID` — token `aud` claim does not include LMS client ID
- `SERVICE_ACCOUNT_SCOPE_VIOLATION` — service account token used on user-scoped endpoint

---

## 6. Cross-Check Notes

Verified against:
- `01_Authentication.md` — all data requirements covered including enterprise additions (A1–A5)
- `02_database_schema.md` §5.2 — all tables present
- `01_api_list.md` §6 — all data read/written by endpoints covered

**Additions vs master schema:**
- `access_denied_logs`: added `http_method`, `denial_code`, `ip_address`, `correlation_id` (from audit event definitions)
- `denial_code` enum: added `AUTH_AUDIENCE_INVALID`, `SERVICE_ACCOUNT_SCOPE_VIOLATION` (from A2, A5)
- No new tables required for concurrent session policy (A1), inactivity timeout (A3), or impersonation exclusion (A4) — these are runtime/config behaviours not requiring LMS-side storage
