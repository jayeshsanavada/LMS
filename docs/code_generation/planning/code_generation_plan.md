# AZ-LMS — AI-Driven Code Generation Plan

---

## About This File

| Field | Detail |
|---|---|
| **Purpose** | Master task plan for building the entire AZ-LMS system module by module using AI. Each task has a ready-to-copy prompt directly below it — no need to scroll to the bottom. |
| **How to Use** | 1. Find your next ⬜ task in the Progress Tracker. 2. Scroll to that task. 3. Copy the prompt block. 4. Paste into a new AI conversation. 5. Mark as 🔄 while in progress → ✅ Done when committed. |
| **Golden Rule** | Never start Phase N+1 until Phase N is committed and tested. |
| **Related Files** | `docs/code_generation/skills/01_module_audit.md`, `docs/code_generation/skills/02_code_generation.md`, `docs/code_generation/skills/03_module_file_index.md` |

---

## Progress Tracker

| Phase | Task | Status | Commit |
|---|---|---|---|
| 0 | 0.1 Backend scaffold | ⬜ Not started | — |
| 0 | 0.2 Database setup | ⬜ Not started | — |
| 0 | 0.3 Docker | ⬜ Not started | — |
| 0 | 0.4 Frontend scaffold | ⬜ Not started | — |
| 1 | 1.1 Shared infrastructure | ⬜ Not started | — |
| 1 | 1.2 Admin configuration | ⬜ Not started | — |
| 1 | 1.3 Audit module | ⬜ Not started | — |
| 2 | 2.1 Auth backend | ⬜ Not started | — |
| 2 | 2.2 User mgmt backend | ⬜ Not started | — |
| 2 | 2.3 User mgmt frontend | ⬜ Not started | — |
| 3 | 3.1 Training backend | ⬜ Not started | — |
| 3 | 3.2 Training frontend | ⬜ Not started | — |
| 4 | 4.1 Assignment backend | ⬜ Not started | — |
| 4 | 4.2 Assignment frontend | ⬜ Not started | — |
| 5 | 5.1 Sessions backend | ⬜ Not started | — |
| 5 | 5.2 Sessions frontend | ⬜ Not started | — |
| 6 | 6.1 Notifications backend | ⬜ Not started | — |
| 6 | 6.2 Notifications frontend | ⬜ Not started | — |
| 7 | 7.1 Reporting | ⬜ Not started | — |
| 7 | 7.2 Search | ⬜ Not started | — |
| 7 | 7.3 Probation | ⬜ Not started | — |
| 7 | 7.4 Integrations | ⬜ Not started | — |
| 8 | 8.1 Employee dashboard | ⬜ Not started | — |
| 8 | 8.2 Manager dashboard | ⬜ Not started | — |
| 8 | 8.3 HR dashboard | ⬜ Not started | — |
| 8 | 8.4 Admin dashboard | ⬜ Not started | — |
| 8 | 8.5 Supporting admin pages | ⬜ Not started | — |
| 8 | 8.6 APISIX routes | ⬜ Not started | — |
| 9 | 9.1 Backend unit tests | ⬜ Not started | — |
| 9 | 9.2 Backend integration tests | ⬜ Not started | — |
| 9 | 9.3 Frontend component tests | ⬜ Not started | — |
| 9 | 9.4 End-to-end tests | ⬜ Not started | — |

*Update Status: ⬜ Not started → 🔄 In progress → ✅ Done*

---

## PHASE 0 — Project Scaffolding
*(One-time setup — do this first, in order)*

---

### Task 0.1 — Backend Project Structure
**Status:** ⬜ Not started | **Depends on:** Nothing

**What to generate:**
- FastAPI project with full DDD modular folder structure (per `docs/requirements/05_engineering/02_project_scaffold.md`)
- `pyproject.toml` with all backend dependencies (per `docs/requirements/05_engineering/01_tech_stack.md`)
- FastAPI app factory in `src/main.py`
- Config management in `src/config.py` using `pydantic-settings`
- CORS setup for React frontend
- `GET /health` endpoint
- Middleware: `X-Correlation-ID` injection + request logging
- Global exception handler: `{ "error_code": "...", "message": "...", "detail": "..." }`

**📋 Copy this prompt to start:**
```
Read and execute the skill at docs/code_generation/skills/02_code_generation.md.

Task: Generate the FastAPI project scaffold for AZ-LMS backend.
- Create the full folder structure exactly as defined in docs/requirements/05_engineering/02_project_scaffold.md (Backend section)
- pyproject.toml with all dependencies from docs/requirements/05_engineering/01_tech_stack.md
- FastAPI app factory in src/main.py
- Config management in src/config.py using pydantic-settings
- CORS setup for ReactJS frontend
- Health check endpoint: GET /health
- Middleware: X-Correlation-ID injection, request logging
- Global exception handler returning: { "error_code": "...", "message": "...", "detail": "..." }

Context:
- Project: AZ-LMS
- Phase: 0, Task 0.1
- Depends on: Nothing (first task)
- Scaffold: docs/requirements/05_engineering/02_project_scaffold.md
- Tech stack: docs/requirements/05_engineering/01_tech_stack.md
- Conventions: docs/requirements/05_engineering/03_coding_conventions.md
```

---

### Task 0.2 — Database Setup
**Status:** ⬜ Not started | **Depends on:** Task 0.1

**What to generate:**
- SQLAlchemy 2.x async engine + `asyncpg` driver in `src/database.py`
- `BaseModel` with `id (UUID4)`, `created_at (TIMESTAMPTZ)`, `updated_at (TIMESTAMPTZ)` in `src/shared/base_model.py`
- Alembic configured for async SQLAlchemy (`alembic.ini` + `alembic/env.py`)
- Initial empty migration
- `get_db` FastAPI dependency

**📋 Copy this prompt to start:**
```
Read and execute the skill at docs/code_generation/skills/02_code_generation.md.

Task: Generate the database setup for AZ-LMS backend.
- SQLAlchemy 2.x async engine using asyncpg driver in src/database.py
- BaseModel in src/shared/base_model.py with: id (UUID4, Python-generated), created_at (TIMESTAMPTZ), updated_at (TIMESTAMPTZ)
- Alembic configured for async SQLAlchemy: alembic.ini + alembic/env.py
- Initial empty migration file in alembic/versions/
- Database connection pool settings
- get_db FastAPI dependency in src/shared/dependencies.py

Context:
- Project: AZ-LMS
- Phase: 0, Task 0.2
- Depends on: Task 0.1 (scaffold must exist)
- Tech stack: SQLAlchemy 2.x + asyncpg (docs/requirements/05_engineering/01_tech_stack.md)
- Conventions: docs/requirements/05_engineering/03_coding_conventions.md (ORM style section)
```

---

### Task 0.3 — Docker & Docker Compose
**Status:** ⬜ Not started | **Depends on:** Task 0.1, 0.2

**What to generate:**
- `docker-compose.yml`: backend API, worker (APScheduler), PostgreSQL 15, APISIX + etcd
- `docker-compose.dev.yml`: hot-reload overrides
- `Dockerfile` for backend + worker (separate containers)
- `.env.example` with all required variables documented

**📋 Copy this prompt to start:**
```
Read and execute the skill at docs/code_generation/skills/02_code_generation.md.

Task: Generate Docker and Docker Compose configuration for AZ-LMS.
- docker-compose.yml with services: FastAPI backend, Worker (APScheduler separate process), PostgreSQL 15, APISIX + etcd
- docker-compose.dev.yml with hot-reload overrides for development
- Dockerfile for backend API container
- Dockerfile for worker container (separate from API)
- .env.example with ALL required environment variables documented:
  DATABASE_URL, KEYCLOAK_URL, KEYCLOAK_REALM, KEYCLOAK_CLIENT_ID,
  ONEDRIVE_CLIENT_ID, ONEDRIVE_CLIENT_SECRET, ONEDRIVE_TENANT_ID,
  TEAMS_CLIENT_ID, TEAMS_CLIENT_SECRET,
  ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN,
  EMPLOYEE_DB_URL, PES_ALLOWED_CLIENT_ID, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD

Context:
- Project: AZ-LMS
- Phase: 0, Task 0.3
- Depends on: Task 0.1 (scaffold), Task 0.2 (database)
- Infrastructure structure: docs/requirements/05_engineering/02_project_scaffold.md (Infrastructure section)
```

---

### Task 0.4 — Frontend Project Structure
**Status:** ⬜ Not started | **Depends on:** Nothing (independent of backend)

**What to generate:**
- Vite + React 18 + TypeScript 5 project scaffold
- Full folder structure per `docs/requirements/05_engineering/02_project_scaffold.md` (Frontend section)
- `keycloak-js` PKCE adapter setup (token NEVER in localStorage)
- Axios typed instance with interceptors (auth header, X-Correlation-ID, 401 refresh)
- React Router v6 with role-based protected routes
- **Ant Design v5** theme config at `src/styles/theme.ts` — extract colors from `prototype/css/styles.css`
- Bootstrap Icons installed (matches prototype exactly)
- TanStack Query v5 provider + Zustand auth store

**📋 Copy this prompt to start:**
```
Read and execute the skill at docs/code_generation/skills/02_code_generation.md.

Task: Generate the React + Vite frontend scaffold for AZ-LMS.
- Vite + React 18 + TypeScript 5 project
- Full folder structure exactly as defined in docs/requirements/05_engineering/02_project_scaffold.md (Frontend section)
- keycloak-js adapter with PKCE flow — token stored in MEMORY ONLY, never localStorage
- Axios typed instance at src/api/client.ts:
    interceptors: Authorization header injection, X-Correlation-ID, 401 → trigger Keycloak refresh
- React Router v6 with protected routes per role (ADMIN / HR / EMPLOYEE / Manager)
- Ant Design v5 theme config at src/styles/theme.ts:
    Extract colors, fonts, spacing from prototype/css/styles.css and apply as Ant Design theme tokens
- Install bootstrap-icons package (same icons used in all 27 prototype HTML files)
- TanStack Query v5 QueryClientProvider setup in src/main.tsx
- Zustand auth store at src/store/authStore.ts

PROTOTYPE REFERENCE (read before generating):
- Open prototype/index.html — understand the entry point and layout shell
- Open prototype/css/styles.css — extract the complete design system
- The sidebar, header, and layout shell in the prototype must be replicated exactly

Context:
- Project: AZ-LMS
- Phase: 0, Task 0.4
- Depends on: Nothing (can be built in parallel with backend)
- Scaffold: docs/requirements/05_engineering/02_project_scaffold.md
- Tech stack: docs/requirements/05_engineering/01_tech_stack.md
- UI library: Ant Design v5 + Bootstrap Icons (NOT MUI, NOT vanilla Bootstrap)
```

---

## PHASE 1 — Generic Platform Modules
*(No business dependencies — build these before any feature module)*

---

### Task 1.1 — Shared Infrastructure Code
**Status:** ⬜ Not started | **Depends on:** Task 0.1, 0.2

**What to generate:**
- `BaseRepository` (async CRUD via SQLAlchemy)
- Pagination helper (`page`, `page_size`, `total`, `items`)
- UUID validator dependency
- Audit event emitter (async, dead-letter on failure)
- Notification dispatcher (async background task)
- APScheduler job base class
- Dead-letter table handlers (`audit_write_failures`, `notification_failures`)

**📋 Copy this prompt to start:**
```
Read and execute the skill at docs/code_generation/skills/02_code_generation.md.

Task: Generate the Shared Infrastructure code for AZ-LMS backend.
Generate in src/shared/:
- base_repository.py: BaseRepository with async CRUD (get_by_id, list_paginated, create, update, soft_delete)
- pagination.py: PaginatedResponse schema + helper
- dependencies.py: UUID validator dependency, get_correlation_id dependency
- audit_emitter.py: emit() — async write, on failure writes to audit_write_failures table
- notification_dispatcher.py: dispatch() — async background task wrapper
- job_base.py: APScheduler job base class with error handling
- dead_letter.py: handlers for audit_write_failures and notification_failures tables

Context:
- Project: AZ-LMS
- Phase: 1, Task 1.1
- Depends on: Task 0.1 (scaffold), Task 0.2 (database + BaseModel)
- Conventions: docs/requirements/05_engineering/03_coding_conventions.md
- Scaffold: docs/requirements/05_engineering/02_project_scaffold.md
```

---

### Task 1.2 — Admin Configuration Module
**Status:** ⬜ Not started | **Depends on:** Task 0.1, 0.2, 1.1

**What to generate:**
- `admin_settings` table + `AdminSettings` SQLAlchemy model
- `admin_settings_history` table for change tracking
- `GET/PATCH /api/v1/admin/settings` endpoints (ADMIN only)
- In-memory settings cache (invalidated on PATCH)
- Pre-seeded migration for all 9 default settings

**📋 Copy this prompt to start:**
```
Read and execute the skill at docs/code_generation/skills/02_code_generation.md.

Task: Generate the Admin Configuration backend module for AZ-LMS.

Context:
- Project: AZ-LMS
- Phase: 1, Task 1.2
- Depends on: Task 0.1 (scaffold), Task 0.2 (database), Task 1.1 (shared infra)
- Module reading list: docs/code_generation/skills/03_module_file_index.md → MODULE 11 — Admin Configuration
- Read ALL files listed there before writing any code
- Conventions: docs/requirements/05_engineering/03_coding_conventions.md
```

---

### Task 1.3 — Audit Module (Backend Only)
**Status:** ⬜ Not started | **Depends on:** Task 0.1, 0.2, 1.1

**What to generate:**
- `audit_logs` table (INSERT ONLY — no UPDATE/DELETE ever)
- `AuditService.emit()` with PII masking + dead-letter fallback
- `GET /api/v1/audit-logs` (paginated, ADMIN/HR only)
- Background jobs: dead-letter retry (hourly), retention purge (weekly)

**📋 Copy this prompt to start:**
```
Read and execute the skill at docs/code_generation/skills/02_code_generation.md.

Task: Generate the Audit backend module for AZ-LMS.

Context:
- Project: AZ-LMS
- Phase: 1, Task 1.3
- Depends on: Task 0.1 (scaffold), Task 0.2 (database), Task 1.1 (shared infra)
- Module reading list: docs/code_generation/skills/03_module_file_index.md → MODULE 08 — Audit
- Read ALL files listed there before writing any code
- CRITICAL RULE: audit_logs is INSERT ONLY — never UPDATE or DELETE rows
- CRITICAL RULE: audit writes are always async — never block the main operation
```

---

## PHASE 2 — Authentication & User Management
*(Foundation of all other modules)*

---

### Task 2.1 — Authentication Module
**Status:** ⬜ Not started | **Depends on:** Phase 0 + Phase 1

**What to generate:**
- JWT validation middleware (signature + expiry + `aud` claim + `realm_access.roles`)
- `get_current_user`, `require_role()`, `require_manager` dependencies
- `GET /api/v1/auth/me`, `POST /api/v1/auth/logout`, `POST /api/v1/auth/policy-accept`
- PES service account validation (client_credentials flow)

**📋 Copy this prompt to start:**
```
Read and execute the skill at docs/code_generation/skills/02_code_generation.md.

Task: Generate the Authentication backend module for AZ-LMS.

Context:
- Project: AZ-LMS
- Phase: 2, Task 2.1
- Depends on: Phase 0 (scaffold + DB), Phase 1 (audit, admin config, shared infra)
- Module reading list: docs/code_generation/skills/03_module_file_index.md → MODULE 01 — Authentication
- Read ALL files listed there before writing any code
- KEY RULE: Manager is NOT a Keycloak role — always derive from user_hierarchy table (depth=1)
- KEY RULE: JWT stored in memory by keycloak-js — never extract to storage
```

---

### Task 2.2 — User Management Backend
**Status:** ⬜ Not started | **Depends on:** Task 2.1

**What to generate:**
- Tables: `users`, `user_hierarchy`, `user_project_allocations`, `user_field_overrides`, `user_attributes_sync_log`, `user_probation`
- Full CRUD endpoints + deactivate/reactivate + team-members (Manager scope)
- Zoho sync service + Employee DB sync service
- Cascade on deactivation: reject pending approvals, remove future sessions

**📋 Copy this prompt to start:**
```
Read and execute the skill at docs/code_generation/skills/02_code_generation.md.

Task: Generate the User Management backend module for AZ-LMS.

Context:
- Project: AZ-LMS
- Phase: 2, Task 2.2
- Depends on: Task 2.1 (Auth — get_current_user dependency needed), Phase 1 (audit, shared infra)
- Module reading list: docs/code_generation/skills/03_module_file_index.md → MODULE 02 — User Management
- Read ALL files listed there before writing any code
```

---

### Task 2.3 — User Management Frontend
**Status:** ⬜ Not started | **Depends on:** Task 2.2

**Prototype files to match exactly:**
- `prototype/admin-users.html` → `src/pages/users/AdminUsersPage.tsx`
- `prototype/user-detail.html` → `src/pages/users/UserDetailPage.tsx`
- `prototype/profile.html` → `src/pages/profile/ProfilePage.tsx`

**📋 Copy this prompt to start:**
```
Read and execute the skill at docs/code_generation/skills/02_code_generation.md.

Task: Generate the User Management frontend pages for AZ-LMS.

Prototype files — read these FIRST before writing any React code:
  prototype/admin-users.html  → src/pages/users/AdminUsersPage.tsx
  prototype/user-detail.html  → src/pages/users/UserDetailPage.tsx
  prototype/profile.html      → src/pages/profile/ProfilePage.tsx

Match the prototype EXACTLY: table columns, action buttons, status badge colors,
filter panel layout, modal structures, field labels, tab names.

Context:
- Project: AZ-LMS
- Phase: 2, Task 2.3
- Depends on: Task 2.2 (User Management backend API must be complete)
- Module reading list: docs/code_generation/skills/03_module_file_index.md → MODULE 02 — User Management
- Read ALL files listed there (including prototype HTML) before writing any code
- UI library: Ant Design v5 + Bootstrap Icons (NOT MUI, NOT Bootstrap directly)
- API calls: GET/POST/PATCH /api/v1/users/*, POST /api/v1/users/sync/*
```

---

## PHASE 3 — Training Management
*(Depends on: User Management, Admin Config, Audit)*

---

### Task 3.1 — Training Management Backend

**Status:** ⬜ Not started | **Depends on:** Phase 2

**What to generate:**

- Tables: `training_items`, `training_item_versions`, `resources`, `resource_files`, `certificates`, `assessment_questions`, `assessment_options`, `assessment_attempts`
- Full CRUD + lifecycle (publish, inactivate, clone, version)
- Assessment builder endpoints + completion logic
- OneDrive integration for file upload/streaming

**📋 Copy this prompt to start:**
```
Read and execute the skill at docs/code_generation/skills/02_code_generation.md.

Task: Generate the Training Management backend module for AZ-LMS.

Context:
- Project: AZ-LMS
- Phase: 3, Task 3.1
- Depends on: Phase 2 (User Management — users table), Phase 1 (audit, admin config)
- Module reading list: docs/code_generation/skills/03_module_file_index.md → MODULE 03 — Training Management
- Read ALL files listed there before writing any code
```

---

### Task 3.2 — Training Management Frontend

**Status:** ⬜ Not started | **Depends on:** Task 3.1

**Prototype files to match exactly:**

- `prototype/admin-training.html` → `src/pages/training/AdminTrainingPage.tsx`
- `prototype/admin-training-resources.html` → `src/pages/training/ManageResourcesPage.tsx`
- `prototype/catalog.html` → `src/pages/training/CatalogPage.tsx`
- `prototype/course-detail.html` → `src/pages/training/TrainingDetailPage.tsx`
- `prototype/certificate.html` → `src/pages/certificates/CertificatesPage.tsx`

**📋 Copy this prompt to start:**
```
Read and execute the skill at docs/code_generation/skills/02_code_generation.md.

Task: Generate the Training Management frontend pages for AZ-LMS.

Prototype files — read these FIRST before writing any React code:
  prototype/admin-training.html           → src/pages/training/AdminTrainingPage.tsx
  prototype/admin-training-resources.html → src/pages/training/ManageResourcesPage.tsx
  prototype/catalog.html                  → src/pages/training/CatalogPage.tsx
  prototype/course-detail.html            → src/pages/training/TrainingDetailPage.tsx
  prototype/certificate.html              → src/pages/certificates/CertificatesPage.tsx

Match prototypes EXACTLY: 4-step creation wizard step labels, resource type buttons,
drag-drop reorder UI, card grid layout, progress bars, status badge colors.

Context:
- Project: AZ-LMS
- Phase: 3, Task 3.2
- Depends on: Task 3.1 (Training backend API must be complete)
- Module reading list: docs/code_generation/skills/03_module_file_index.md → MODULE 03 — Training Management
- Read ALL files listed there (including prototype HTML) before writing any code
- UI library: Ant Design v5 + Bootstrap Icons
```

---

## PHASE 4 — Assignment Engine
*(Depends on: Training Management, User Management, Admin Config)*

---

### Task 4.1 — Assignment Engine Backend
**Status:** ⬜ Not started | **Depends on:** Phase 3

**What to generate:**
- Tables: `assignments`, `assignment_history`, `mandatory_assignment_rules`, `approvals`, `compliance_status`
- Mandatory rule evaluation engine (6 scope types)
- Compliance evaluation logic: PENDING / COMPLIANT / NON_COMPLIANT
- Background jobs: overdue detection (daily), approval expiry (daily), recertification

**📋 Copy this prompt to start:**
```
Read and execute the skill at docs/code_generation/skills/02_code_generation.md.

Task: Generate the Assignment Engine backend module for AZ-LMS.

Context:
- Project: AZ-LMS
- Phase: 4, Task 4.1
- Depends on: Phase 3 (Training), Phase 2 (User Management), Phase 1 (audit, admin config)
- Module reading list: docs/code_generation/skills/03_module_file_index.md → MODULE 04 — Assignment Engine
- Read ALL files listed there before writing any code
- KEY RULE: Compliance logic lives ONLY in this module — never duplicate in other modules
- KEY RULE: Probation gate assignments (is_probation_gate=true) must be tracked separately
```

---

### Task 4.2 — Assignment Engine Frontend
**Status:** ⬜ Not started | **Depends on:** Task 4.1

**Prototype files to match exactly:**
- `prototype/my-training.html` → `src/pages/training/MyTrainingPage.tsx`
- `prototype/team-assignments.html` → `src/pages/assignments/TeamAssignmentsPage.tsx`
- `prototype/approvals.html` → `src/pages/approvals/ApprovalsInboxPage.tsx`

**📋 Copy this prompt to start:**
```
Read and execute the skill at docs/code_generation/skills/02_code_generation.md.

Task: Generate the Assignment Engine frontend pages for AZ-LMS.

Prototype files — read these FIRST before writing any React code:
  prototype/my-training.html       → src/pages/training/MyTrainingPage.tsx
  prototype/team-assignments.html  → src/pages/assignments/TeamAssignmentsPage.tsx
  prototype/approvals.html         → src/pages/approvals/ApprovalsInboxPage.tsx

Match prototypes EXACTLY: status tabs, training cards with progress bars,
due date colors (red=overdue, amber=due soon), approve/reject dialogs.

Context:
- Project: AZ-LMS
- Phase: 4, Task 4.2
- Depends on: Task 4.1 (Assignment Engine backend must be complete)
- Module reading list: docs/code_generation/skills/03_module_file_index.md → MODULE 04 — Assignment Engine
- Read ALL files listed there (including prototype HTML) before writing any code
- UI library: Ant Design v5 + Bootstrap Icons
```

---

## PHASE 5 — Sessions Module
*(Depends on: Training Management, Assignment Engine, User Management)*

---

### Task 5.1 — Sessions Backend
**Status:** ⬜ Not started | **Depends on:** Phase 4

**What to generate:**
- Tables: `sessions`, `session_participants`, `session_attendance`, `facilitators`, `venues`
- Full sessions CRUD + nomination flow + attendance + Excel import
- Teams Graph API integration (create meeting, pull attendance)
- Background jobs: session reminders (24h + 1h), Teams auto-attendance import

**📋 Copy this prompt to start:**
```
Read and execute the skill at docs/code_generation/skills/02_code_generation.md.

Task: Generate the Sessions backend module for AZ-LMS.

Context:
- Project: AZ-LMS
- Phase: 5, Task 5.1
- Depends on: Phase 4 (Assignment Engine), Phase 3 (Training), Phase 2 (User Management)
- Module reading list: docs/code_generation/skills/03_module_file_index.md → MODULE 05 — Sessions
- Read ALL files listed there before writing any code
- KEY RULE: All sessions are HYBRID by default — no session type selection
- KEY RULE: If Teams meeting link creation fails, set MEETING_LINK_PENDING flag — do not block session creation
```

---

### Task 5.2 — Sessions Frontend
**Status:** ⬜ Not started | **Depends on:** Task 5.1

**Prototype files to match exactly:**
- `prototype/sessions.html` → `src/pages/sessions/MySessionsPage.tsx`
- `prototype/session-detail.html` → `src/pages/sessions/SessionDetailPage.tsx`
- `prototype/admin-sessions.html` → `src/pages/sessions/AdminSessionsPage.tsx` *(65KB — read completely)*

**📋 Copy this prompt to start:**
```
Read and execute the skill at docs/code_generation/skills/02_code_generation.md.

Task: Generate the Sessions frontend pages for AZ-LMS.

Prototype files — read these FIRST before writing any React code:
  prototype/sessions.html        → src/pages/sessions/MySessionsPage.tsx
  prototype/session-detail.html  → src/pages/sessions/SessionDetailPage.tsx
  prototype/admin-sessions.html  → src/pages/sessions/AdminSessionsPage.tsx
  NOTE: admin-sessions.html is 65KB — read it completely, multiple passes if needed

Match prototypes EXACTLY: hybrid mode badge, Teams link button, "Link pending" state,
facilitator ⚙ modal, venue ⚙ modal, attendance grid, Excel import flow.

Context:
- Project: AZ-LMS
- Phase: 5, Task 5.2
- Depends on: Task 5.1 (Sessions backend must be complete)
- Module reading list: docs/code_generation/skills/03_module_file_index.md → MODULE 05 — Sessions
- Read ALL files listed there (including prototype HTML) before writing any code
- UI library: Ant Design v5 + Bootstrap Icons
```

---

## PHASE 6 — Notifications Module
*(Depends on: All previous modules — triggered by them)*

---

### Task 6.1 — Notifications Backend
**Status:** ⬜ Not started | **Depends on:** Phase 5

**What to generate:**
- Tables: `notifications`, `notification_templates`, `notification_preferences`, `notification_failures`
- `NotificationService.dispatch()` with idempotency key + email (SMTP) + in-app delivery
- All background jobs: reminders, escalation, dead-letter retry, retention purge
- All 20+ notification templates from the event catalog

**📋 Copy this prompt to start:**
```
Read and execute the skill at docs/code_generation/skills/02_code_generation.md.

Task: Generate the Notifications backend module for AZ-LMS.

Context:
- Project: AZ-LMS
- Phase: 6, Task 6.1
- Depends on: ALL previous modules (notifications triggered by every module's events)
- Module reading list: docs/code_generation/skills/03_module_file_index.md → MODULE 06 — Notifications
- Read ALL files listed there before writing any code
- KEY RULE: Notifications are ALWAYS async via BackgroundTasks — never block API response
- KEY RULE: Idempotency key = {event_code}:{entity_id}:{recipient_user_id}:{date_bucket}
```

---

### Task 6.2 — Notifications Frontend
**Status:** ⬜ Not started | **Depends on:** Task 6.1

**Prototype files to match exactly:**
- `prototype/notifications.html` → `src/pages/notifications/NotificationsPage.tsx`

**📋 Copy this prompt to start:**
```
Read and execute the skill at docs/code_generation/skills/02_code_generation.md.

Task: Generate the Notifications frontend pages and components for AZ-LMS.

Prototype files — read these FIRST before writing any React code:
  prototype/notifications.html → src/pages/notifications/NotificationsPage.tsx

Match prototype EXACTLY: notification bell with unread count badge,
drawer/page list layout, read/unread visual distinction, filter tabs,
preferences toggle matrix (in-app vs email per event type).

Context:
- Project: AZ-LMS
- Phase: 6, Task 6.2
- Depends on: Task 6.1 (Notifications backend)
- Module reading list: docs/code_generation/skills/03_module_file_index.md → MODULE 06 — Notifications
- Read ALL files listed there (including prototype HTML) before writing any code
- UI library: Ant Design v5 + Bootstrap Icons
- Notification bell counts update every 30 seconds via polling
```

---

## PHASE 7 — Supporting Modules

---

### Task 7.1 — Reporting & Export Backend
**Status:** ⬜ Not started | **Depends on:** Phase 6

**What to generate:**
- 8 report endpoints (role-scoped): Assignment Status, Compliance, Completion, Overdue, Sessions, Certificates, Learning History, Approvals
- Async export pattern: POST → job_id → GET status → GET download
- Background jobs: Excel + PDF generation, file cleanup (24h retention)
- Dashboard aggregation endpoints per role

**📋 Copy this prompt to start:**
```
Read and execute the skill at docs/code_generation/skills/02_code_generation.md.

Task: Generate the Reporting & Export backend module for AZ-LMS.

Context:
- Project: AZ-LMS
- Phase: 7, Task 7.1
- Depends on: Phase 6 (all modules complete — reporting queries all tables)
- Module reading list: docs/code_generation/skills/03_module_file_index.md → MODULE 07 — Reporting
- Read ALL files listed there before writing any code
- KEY RULE: Reports are READ ONLY — no data modification in this module
- KEY RULE: Scope enforcement: Employee=self, Manager=direct reports, HR/Admin=org-wide
```

---

### Task 7.2 — Search Backend
**Status:** ⬜ Not started | **Depends on:** Task 3.1

**📋 Copy this prompt to start:**
```
Read and execute the skill at docs/code_generation/skills/02_code_generation.md.

Task: Generate the Search backend module for AZ-LMS.
- PostgreSQL full-text search on training_items (title, description, tags, category)
- GET /api/v1/search?q=&type=&category=&difficulty=&status=
- Scope: published only for EMPLOYEE; all statuses for ADMIN/HR
- Faceted filters: type, category, difficulty, is_mandatory

Context:
- Project: AZ-LMS
- Phase: 7, Task 7.2
- Depends on: Task 3.1 (training_items table must exist)
- Module reading list: docs/code_generation/skills/03_module_file_index.md → MODULE 09 — Search
- Read ALL files listed there before writing any code
- Tech: PostgreSQL FTS only — no Elasticsearch
```

---

### Task 7.3 — Probation Management Backend
**Status:** ⬜ Not started | **Depends on:** Task 4.1, 2.2

**📋 Copy this prompt to start:**
```
Read and execute the skill at docs/code_generation/skills/02_code_generation.md.

Task: Generate the Probation Management backend module for AZ-LMS.

Context:
- Project: AZ-LMS
- Phase: 7, Task 7.3
- Depends on: Task 4.1 (Assignment Engine — probation gate logic), Task 2.2 (user_probation table)
- Module reading list: docs/code_generation/skills/03_module_file_index.md → MODULE 12 — Probation Management
- Read ALL files listed there before writing any code
- NOTE: user_probation table is defined in User Management schema — do not redefine it
```

---

### Task 7.4 — Integrations Backend
**Status:** ⬜ Not started | **Depends on:** Phase 2

**📋 Copy this prompt to start:**
```
Read and execute the skill at docs/code_generation/skills/02_code_generation.md.

Task: Generate the Integrations backend module for AZ-LMS.
- integration_jobs + integration_health_status tables
- GET /api/v1/integrations/health (admin)
- POST /api/v1/integrations/sync/zoho, /sync/employee-db (manual triggers)
- GET /api/v1/integrations/pes/compliance/{employee_id} (PES M2M route)
- POST /api/v1/integrations/pes/compliance/bulk (rate-limited 100/min)
- Background job: integration health check every 15 minutes

Context:
- Project: AZ-LMS
- Phase: 7, Task 7.4
- Depends on: Phase 2 (User Management sync services already exist — reuse them here)
- Module reading list: docs/code_generation/skills/03_module_file_index.md → MODULE 10 — Integrations
- Read ALL files listed there before writing any code
- KEY RULE: Integration failure never blocks main workflow — use last-known data
```

---

## PHASE 8 — Frontend Dashboards & Admin Pages

---

### Task 8.1 — Employee Dashboard
**Status:** ⬜ Not started | **Depends on:** Task 4.2, 5.2

**Prototype:** `prototype/dashboard-employee.html` → `src/pages/dashboard/EmployeeDashboard.tsx`

**📋 Copy this prompt to start:**
```
Read and execute the skill at docs/code_generation/skills/02_code_generation.md.

Task: Generate the Employee Dashboard page for AZ-LMS.

Prototype file — read FIRST before writing any React code:
  prototype/dashboard-employee.html → src/pages/dashboard/EmployeeDashboard.tsx

Match EXACTLY: stat cards layout, probation banner (conditional — only show if user is on probation),
upcoming sessions list, recent completions list, quick action buttons.

Context:
- Project: AZ-LMS
- Phase: 8, Task 8.1
- Depends on: Task 4.2 (assignments), Task 5.2 (sessions), Task 6.2 (notifications)
- Module reading list: docs/code_generation/skills/03_module_file_index.md → SHARED section
- UI library: Ant Design v5 + Bootstrap Icons
```

---

### Task 8.2 — Manager Dashboard
**Status:** ⬜ Not started | **Depends on:** Task 4.2, 5.2

**Prototype:** `prototype/dashboard-manager.html` → `src/pages/dashboard/ManagerDashboard.tsx`

**📋 Copy this prompt to start:**
```
Read and execute the skill at docs/code_generation/skills/02_code_generation.md.

Task: Generate the Manager Dashboard page for AZ-LMS.

Prototype file — read FIRST before writing any React code:
  prototype/dashboard-manager.html → src/pages/dashboard/ManagerDashboard.tsx

Match EXACTLY: team completion rate tile, overdue count tile, pending approvals badge,
team sessions list, navigation to approvals/reports.

Context:
- Project: AZ-LMS
- Phase: 8, Task 8.2
- Depends on: Task 4.2 (assignments + approvals), Task 5.2 (sessions), Task 7.1 (reporting data)
- Module reading list: docs/code_generation/skills/03_module_file_index.md → SHARED section
- UI library: Ant Design v5 + Bootstrap Icons
```

---

### Task 8.3 — HR Dashboard
**Status:** ⬜ Not started | **Depends on:** Task 7.1, 7.3

**Prototype files:**
- `prototype/dashboard-hr.html` → `src/pages/dashboard/HRDashboard.tsx`
- `prototype/hr-probation.html` → `src/pages/probation/ProbationDashboard.tsx`

**📋 Copy this prompt to start:**
```
Read and execute the skill at docs/code_generation/skills/02_code_generation.md.

Task: Generate the HR Dashboard and Probation Dashboard pages for AZ-LMS.

Prototype files — read FIRST before writing any React code:
  prototype/dashboard-hr.html  → src/pages/dashboard/HRDashboard.tsx
  prototype/hr-probation.html  → src/pages/probation/ProbationDashboard.tsx

Match EXACTLY:
  HR Dashboard: compliance summary tiles, mandatory completion rate, non-compliant count
  Probation Dashboard: status badges (On Track/At Risk/Overdue), per-employee checklist modal,
  Confirm/Extend buttons with reason dialog

Context:
- Project: AZ-LMS
- Phase: 8, Task 8.3
- Depends on: Task 7.1 (reporting), Task 7.3 (probation backend)
- UI library: Ant Design v5 + Bootstrap Icons
```

---

### Task 8.4 — Admin Dashboard
**Status:** ⬜ Not started | **Depends on:** Task 7.1

**Prototype:** `prototype/dashboard-admin.html` → `src/pages/dashboard/AdminDashboard.tsx`

**📋 Copy this prompt to start:**
```
Read and execute the skill at docs/code_generation/skills/02_code_generation.md.

Task: Generate the Admin Dashboard page for AZ-LMS.

Prototype file — read FIRST before writing any React code:
  prototype/dashboard-admin.html → src/pages/dashboard/AdminDashboard.tsx

Match EXACTLY: 4 primary stat tiles (row 1), 3 content library tiles (row 2),
quarterly training statistics panel with tab switcher + bar chart,
BU-wise compliance panel, upcoming sessions table, integration health summary.

Context:
- Project: AZ-LMS
- Phase: 8, Task 8.4
- Depends on: Task 7.1 (reporting), Task 7.4 (integrations health)
- UI library: Ant Design v5 + Bootstrap Icons
```

---

### Task 8.5 — Supporting Admin Pages
**Status:** ⬜ Not started | **Depends on:** Task 7.1, 7.4, 1.2, 1.3

**Prototype files:**
- `prototype/compliance.html` → `src/pages/compliance/CompliancePage.tsx`
- `prototype/reports.html` → `src/pages/reports/ReportsPage.tsx` *(79KB — read in full)*
- `prototype/audit-logs.html` → `src/pages/audit/AuditLogsPage.tsx`
- `prototype/admin-settings.html` → `src/pages/admin/SettingsPage.tsx`
- `prototype/admin-integrations.html` → `src/pages/admin/IntegrationsPage.tsx`

**📋 Copy this prompt to start:**
```
Read and execute the skill at docs/code_generation/skills/02_code_generation.md.

Task: Generate the Supporting Admin pages for AZ-LMS.

Prototype files — read FIRST before writing any React code:
  prototype/compliance.html         → src/pages/compliance/CompliancePage.tsx
  prototype/reports.html            → src/pages/reports/ReportsPage.tsx  (79KB — read fully)
  prototype/audit-logs.html         → src/pages/audit/AuditLogsPage.tsx
  prototype/admin-settings.html     → src/pages/admin/SettingsPage.tsx
  prototype/admin-integrations.html → src/pages/admin/IntegrationsPage.tsx

Match prototypes EXACTLY:
  Settings: key-value table, edit-in-place, history timeline
  Integrations: HEALTHY/DEGRADED/DOWN badges, sync trigger buttons, error log table
  Audit Logs: filter panel, log table, before/after diff drawer
  Reports: all 8 report types, export flow (async — request → poll → download)

Context:
- Project: AZ-LMS
- Phase: 8, Task 8.5
- Depends on: Task 7.1 (reporting), Task 7.4 (integrations), Task 1.2 (admin config), Task 1.3 (audit)
- UI library: Ant Design v5 + Bootstrap Icons
```

---

### Task 8.6 — APISIX Route Configuration
**Status:** ⬜ Not started | **Depends on:** All backend modules complete

**📋 Copy this prompt to start:**
```
Read and execute the skill at docs/code_generation/skills/02_code_generation.md.

Task: Generate APISIX route configuration for AZ-LMS.
- Read docs/requirements/05_engineering/00_apisix_routes.md for all route definitions
- Standard user JWT routes: all /api/v1/* endpoints with JWT validation plugin
- PES M2M routes: /api/v1/integrations/pes/* with client_credentials validation + rate limit (100/min)
- Health check route: /health (no auth required)
- CORS plugin for frontend origin
- Generate YAML files in apisix/routes/ folder

Context:
- Project: AZ-LMS
- Phase: 8, Task 8.6
- Depends on: All backend modules (all route definitions must be final)
- Routes spec: docs/requirements/05_engineering/00_apisix_routes.md
- Scaffold: docs/requirements/05_engineering/02_project_scaffold.md (Infrastructure section)
```

---

*Last updated: 2026-04-11*
*File location: `docs/code_generation/planning/code_generation_plan.md`*
