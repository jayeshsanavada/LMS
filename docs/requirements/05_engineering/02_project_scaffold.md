# AZ-LMS — Project Scaffold

---

## About This File

| Field | Detail |
|---|---|
| **Purpose** | Defines the exact folder structure, file naming conventions, and file responsibilities for both backend and frontend. AI must generate code into precisely these locations — no invented folders, no alternative structures. |
| **When to Use** | Before Phase 0 scaffolding. Reference during every code generation task to confirm the correct file location for each generated file. |
| **How to Use** | When generating a new file, look up the target module here first. Use the exact path and naming pattern shown. Never create files outside this structure without updating this document. |
| **Used By Agents?** | Yes — `backend-dev.md` and `frontend-dev.md` reference this. Also in the SHARED section of `docs/code_generation/skills/03_module_file_index.md`. |
| **Related Files** | `docs/requirements/05_engineering/01_tech_stack.md`, `docs/requirements/05_engineering/03_coding_conventions.md` |

---

## BACKEND PROJECT STRUCTURE

```
lms_rad/
└── backend/
    ├── src/
    │   ├── main.py                    # FastAPI app factory, middleware registration
    │   ├── config.py                  # pydantic-settings config (reads .env)
    │   ├── database.py                # SQLAlchemy async engine, session factory
    │   │
    │   ├── shared/                    # Cross-cutting concerns (no business logic)
    │   │   ├── __init__.py
    │   │   ├── base_model.py          # SQLAlchemy Base + BaseModel (id, created_at, updated_at)
    │   │   ├── base_repository.py     # Generic async CRUD repository
    │   │   ├── pagination.py          # Pagination schema + helper
    │   │   ├── exceptions.py          # Base exception classes + global error handler
    │   │   ├── dependencies.py        # Shared FastAPI dependencies (get_db, get_settings)
    │   │   ├── correlation.py         # X-Correlation-ID middleware
    │   │   └── middleware.py          # Request logging middleware
    │   │
    │   ├── modules/
    │   │   ├── auth/
    │   │   │   ├── __init__.py
    │   │   │   ├── models.py          # SQLAlchemy models (if any — auth uses Keycloak)
    │   │   │   ├── schemas.py         # Pydantic request/response schemas
    │   │   │   ├── service.py         # JWT validation, policy acceptance logic
    │   │   │   ├── dependencies.py    # get_current_user, require_role, require_manager
    │   │   │   └── router.py          # /api/v1/auth/* routes
    │   │   │
    │   │   ├── user_management/
    │   │   │   ├── __init__.py
    │   │   │   ├── models.py          # users, user_hierarchy, user_project_allocations, etc.
    │   │   │   ├── schemas.py
    │   │   │   ├── repository.py      # DB queries
    │   │   │   ├── service.py         # Business logic + sync services
    │   │   │   ├── dependencies.py    # Module-specific dependencies
    │   │   │   ├── router.py          # /api/v1/users/* routes
    │   │   │   └── jobs.py            # Zoho sync job, Employee DB sync job
    │   │   │
    │   │   ├── training_management/
    │   │   │   ├── __init__.py
    │   │   │   ├── models.py          # training_items, resources, resource_files, certificates
    │   │   │   ├── schemas.py
    │   │   │   ├── repository.py
    │   │   │   ├── service.py         # Versioning, completion rollup, OneDrive integration
    │   │   │   ├── dependencies.py
    │   │   │   └── router.py          # /api/v1/trainings/*, /api/v1/resources/*
    │   │   │
    │   │   ├── assignment_engine/
    │   │   │   ├── __init__.py
    │   │   │   ├── models.py          # assignments, assignment_history, approvals, compliance_status, rules
    │   │   │   ├── schemas.py
    │   │   │   ├── repository.py
    │   │   │   ├── service.py         # Rule evaluation engine, compliance computation
    │   │   │   ├── dependencies.py
    │   │   │   ├── router.py          # /api/v1/assignments/*, /api/v1/approvals/*
    │   │   │   └── jobs.py            # Overdue detection, approval expiry, recertification
    │   │   │
    │   │   ├── sessions/
    │   │   │   ├── __init__.py
    │   │   │   ├── models.py          # sessions, session_participants, session_attendance, facilitators, venues
    │   │   │   ├── schemas.py
    │   │   │   ├── repository.py
    │   │   │   ├── service.py         # Teams integration, attendance logic
    │   │   │   ├── dependencies.py
    │   │   │   ├── router.py          # /api/v1/sessions/*
    │   │   │   └── jobs.py            # Session reminders (24h, 1h), Teams attendance pull
    │   │   │
    │   │   ├── notifications/
    │   │   │   ├── __init__.py
    │   │   │   ├── models.py          # notifications, notification_templates, preferences, failures
    │   │   │   ├── schemas.py
    │   │   │   ├── repository.py
    │   │   │   ├── service.py         # dispatch(), idempotency, email delivery
    │   │   │   ├── dependencies.py
    │   │   │   ├── router.py          # /api/v1/notifications/*
    │   │   │   └── jobs.py            # Reminder jobs, dead-letter retry, purge
    │   │   │
    │   │   ├── reporting/
    │   │   │   ├── __init__.py
    │   │   │   ├── models.py          # report_jobs, report_exports
    │   │   │   ├── schemas.py
    │   │   │   ├── repository.py      # READ-ONLY queries (no data modification)
    │   │   │   ├── service.py         # Report generation, export, scope enforcement
    │   │   │   ├── dependencies.py
    │   │   │   ├── router.py          # /api/v1/reports/*, /api/v1/dashboard/*
    │   │   │   └── jobs.py            # Export generation, file cleanup
    │   │   │
    │   │   ├── audit/
    │   │   │   ├── __init__.py
    │   │   │   ├── models.py          # audit_logs (INSERT ONLY), audit_write_failures
    │   │   │   ├── schemas.py
    │   │   │   ├── repository.py
    │   │   │   ├── service.py         # emit() — async write with dead-letter fallback
    │   │   │   ├── dependencies.py
    │   │   │   ├── router.py          # /api/v1/audit-logs/*
    │   │   │   └── jobs.py            # Dead-letter retry, retention purge
    │   │   │
    │   │   ├── search/
    │   │   │   ├── __init__.py
    │   │   │   ├── schemas.py
    │   │   │   ├── repository.py      # PostgreSQL FTS queries
    │   │   │   ├── service.py
    │   │   │   └── router.py          # /api/v1/search/*
    │   │   │
    │   │   ├── integrations/
    │   │   │   ├── __init__.py
    │   │   │   ├── models.py          # integration_jobs, integration_health_status
    │   │   │   ├── schemas.py
    │   │   │   ├── clients/
    │   │   │   │   ├── zoho_client.py        # Zoho HR API client (httpx)
    │   │   │   │   ├── employee_db_client.py # Employee DB client (httpx)
    │   │   │   │   ├── teams_client.py       # Microsoft Teams Graph API (httpx)
    │   │   │   │   ├── onedrive_client.py    # OneDrive Graph API (httpx)
    │   │   │   │   └── keycloak_admin.py     # Keycloak Admin API (httpx)
    │   │   │   ├── repository.py
    │   │   │   ├── service.py
    │   │   │   ├── router.py          # /api/v1/integrations/*
    │   │   │   └── jobs.py            # Health check job
    │   │   │
    │   │   ├── admin/
    │   │   │   ├── __init__.py
    │   │   │   ├── models.py          # admin_settings, admin_settings_history
    │   │   │   ├── schemas.py
    │   │   │   ├── repository.py
    │   │   │   ├── service.py         # Settings cache
    │   │   │   └── router.py          # /api/v1/admin/*
    │   │   │
    │   │   └── probation/
    │   │       ├── __init__.py
    │   │       ├── schemas.py
    │   │       ├── repository.py
    │   │       ├── service.py         # Gate validation logic
    │   │       └── router.py          # /api/v1/probation/*
    │   │
    │   └── worker/
    │       ├── __init__.py
    │       └── scheduler.py           # APScheduler setup, registers all jobs from modules
    │
    ├── alembic/
    │   ├── env.py                     # Alembic async config
    │   ├── script.py.mako
    │   └── versions/                  # Migration files: YYYYMMDD_HHMM_module_description.py
    │
    ├── tests/
    │   ├── conftest.py                # Shared fixtures (test DB, test client, factories)
    │   ├── unit/
    │   │   └── modules/
    │   │       └── [module_name]/
    │   │           └── test_service.py
    │   └── integration/
    │       └── modules/
    │           └── [module_name]/
    │               └── test_router.py
    │
    ├── pyproject.toml                 # All dependencies + tool config (ruff, mypy, pytest)
    ├── .env.example                   # All required env vars with descriptions
    ├── .env                           # Local dev values (gitignored)
    └── Dockerfile                     # Backend container definition
```

---

## FRONTEND PROJECT STRUCTURE

The frontend uses a **module-first structure** that mirrors the backend modular monolith. Each feature module is a self-contained folder with its own pages, components, hooks, API calls, and types co-located together. Shared utilities stay at the top level only when used by three or more modules.

### Backend → Frontend Module Name Mapping

Frontend module folder names are shortened for brevity. This table is the authoritative mapping:

| Backend module (Python) | Frontend module (src/modules/) | Notes |
| --- | --- | --- |
| `user_management` | `users` | |
| `assignment_engine` | `assignments` | |
| `training_management` | `training` | |
| `sessions` | `sessions` | same |
| `notifications` | `notifications` | same |
| `reporting` | `reporting` | same |
| `audit` | `audit` | same |
| `admin` | `admin` | same |
| `integrations` | `integrations` | separate module from `admin` on both sides |
| `probation` | `probation` | same |
| `auth` | `auth` | same |
| `search` | — | No frontend module. Search UI is embedded in `training/` (CatalogPage) and other pages that consume `/api/v1/search/*` directly via their own `api/` files. |
| `dashboard` | `dashboard` | No backend `dashboard/` module — data served by `reporting/` router at `/api/v1/dashboard/*`. |

### Module Boundary Rules

| Rule | Detail |
| --- | --- |
| `modules/X/index.ts` is the public API | Other modules import only from `index.ts`, never from internal files |
| No cross-module internal imports | `import { X } from '../training/components/X'` is a violation |
| `shared/` threshold | Only promote to `shared/` when used by 3+ modules |
| `router.tsx` is the only file that imports pages from all modules | Single integration point for routing |
| API calls stay inside their module | `modules/training/api/training.ts` — not a top-level `src/api/` folder |
| Import boundaries enforced by ESLint | Use `eslint-plugin-boundaries` — configure to restrict cross-module imports to `index.ts` barrel only. Rule violations = CI failure. |

```
lms_rad/
└── frontend/
    ├── src/
    │   ├── main.tsx                   # React app entry, Keycloak init, React Query provider
    │   ├── App.tsx                    # Root component, React Router setup
    │   ├── router.tsx                 # Imports page components from modules/*; role guards
    │   │
    │   ├── modules/                   # One folder per backend module — self-contained
    │   │   │
    │   │   ├── auth/
    │   │   │   ├── pages/
    │   │   │   │   └── LoginPage.tsx          # ← prototype/login.html
    │   │   │   ├── api/
    │   │   │   │   └── auth.ts
    │   │   │   ├── types/
    │   │   │   │   └── auth.types.ts
    │   │   │   └── index.ts
    │   │   │
    │   │   ├── dashboard/
    │   │   │   ├── pages/
    │   │   │   │   ├── EmployeeDashboard.tsx  # ← prototype/dashboard-employee.html
    │   │   │   │   ├── ManagerDashboard.tsx   # ← prototype/dashboard-manager.html
    │   │   │   │   ├── HRDashboard.tsx        # ← prototype/dashboard-hr.html
    │   │   │   │   └── AdminDashboard.tsx     # ← prototype/dashboard-admin.html
    │   │   │   ├── api/
    │   │   │   │   └── dashboard.ts
    │   │   │   ├── types/
    │   │   │   │   └── dashboard.types.ts
    │   │   │   └── index.ts
    │   │   │
    │   │   ├── training/
    │   │   │   ├── pages/
    │   │   │   │   ├── CatalogPage.tsx        # ← prototype/catalog.html
    │   │   │   │   ├── TrainingDetailPage.tsx # ← prototype/course-detail.html
    │   │   │   │   ├── MyTrainingPage.tsx     # ← prototype/my-training.html
    │   │   │   │   ├── AdminTrainingPage.tsx  # ← prototype/admin-training.html
    │   │   │   │   ├── ManageResourcesPage.tsx # ← prototype/admin-training-resources.html
    │   │   │   │   └── CertificatesPage.tsx   # ← prototype/certificate.html
    │   │   │   ├── components/
    │   │   │   │   ├── TrainingCard.tsx
    │   │   │   │   ├── ResourceList.tsx
    │   │   │   │   ├── AssessmentBuilder.tsx
    │   │   │   │   └── wizard/
    │   │   │   │       ├── Step1BasicInfo.tsx
    │   │   │   │       ├── Step2Resources.tsx
    │   │   │   │       ├── Step3Rules.tsx
    │   │   │   │       └── Step4Review.tsx
    │   │   │   ├── hooks/
    │   │   │   │   ├── useTrainingList.ts
    │   │   │   │   ├── useTrainingDetail.ts
    │   │   │   │   └── useAssessment.ts
    │   │   │   ├── api/
    │   │   │   │   └── training.ts
    │   │   │   ├── types/
    │   │   │   │   └── training.types.ts
    │   │   │   └── index.ts
    │   │   │
    │   │   ├── assignments/
    │   │   │   ├── pages/
    │   │   │   │   ├── TeamAssignmentsPage.tsx # ← prototype/team-assignments.html
    │   │   │   │   └── ApprovalsInboxPage.tsx  # ← prototype/approvals.html
    │   │   │   ├── components/
    │   │   │   ├── hooks/
    │   │   │   ├── api/
    │   │   │   │   └── assignments.ts
    │   │   │   ├── types/
    │   │   │   │   └── assignment.types.ts
    │   │   │   └── index.ts
    │   │   │
    │   │   ├── sessions/
    │   │   │   ├── pages/
    │   │   │   │   ├── MySessionsPage.tsx     # ← prototype/sessions.html
    │   │   │   │   ├── SessionDetailPage.tsx  # ← prototype/session-detail.html
    │   │   │   │   └── AdminSessionsPage.tsx  # ← prototype/admin-sessions.html
    │   │   │   ├── components/
    │   │   │   ├── hooks/
    │   │   │   ├── api/
    │   │   │   │   └── sessions.ts
    │   │   │   ├── types/
    │   │   │   │   └── session.types.ts
    │   │   │   └── index.ts
    │   │   │
    │   │   ├── users/
    │   │   │   ├── pages/
    │   │   │   │   ├── AdminUsersPage.tsx     # ← prototype/admin-users.html
    │   │   │   │   ├── UserDetailPage.tsx     # ← prototype/user-detail.html
    │   │   │   │   └── ProfilePage.tsx        # ← prototype/profile.html
    │   │   │   ├── components/
    │   │   │   ├── hooks/
    │   │   │   ├── api/
    │   │   │   │   └── users.ts
    │   │   │   ├── types/
    │   │   │   │   └── user.types.ts
    │   │   │   └── index.ts
    │   │   │
    │   │   ├── notifications/
    │   │   │   ├── pages/
    │   │   │   │   └── NotificationsPage.tsx  # ← prototype/notifications.html
    │   │   │   ├── components/
    │   │   │   ├── hooks/
    │   │   │   │   └── useNotifications.ts    # Notification count + polling
    │   │   │   ├── api/
    │   │   │   │   └── notifications.ts
    │   │   │   ├── types/
    │   │   │   │   └── notification.types.ts
    │   │   │   └── index.ts
    │   │   │
    │   │   ├── reporting/
    │   │   │   ├── pages/
    │   │   │   │   ├── ReportsPage.tsx        # ← prototype/reports.html
    │   │   │   │   └── CompliancePage.tsx     # ← prototype/compliance.html
    │   │   │   ├── components/
    │   │   │   ├── hooks/
    │   │   │   ├── api/
    │   │   │   │   └── reports.ts
    │   │   │   ├── types/
    │   │   │   └── index.ts
    │   │   │
    │   │   ├── audit/
    │   │   │   ├── pages/
    │   │   │   │   └── AuditLogsPage.tsx      # ← prototype/audit-logs.html
    │   │   │   ├── api/
    │   │   │   │   └── audit.ts
    │   │   │   ├── types/
    │   │   │   └── index.ts
    │   │   │
    │   │   ├── admin/
    │   │   │   ├── pages/
    │   │   │   │   └── SettingsPage.tsx       # ← prototype/admin-settings.html
    │   │   │   ├── api/
    │   │   │   │   └── admin.ts
    │   │   │   ├── types/
    │   │   │   └── index.ts
    │   │   │
    │   │   ├── integrations/
    │   │   │   ├── pages/
    │   │   │   │   └── IntegrationsPage.tsx   # ← prototype/admin-integrations.html
    │   │   │   ├── api/
    │   │   │   │   └── integrations.ts
    │   │   │   ├── types/
    │   │   │   └── index.ts
    │   │   │
    │   │   └── probation/
    │   │       ├── pages/
    │   │       │   └── ProbationDashboard.tsx # ← prototype/hr-probation.html
    │   │       ├── api/
    │   │       │   └── probation.ts
    │   │       ├── types/
    │   │       └── index.ts
    │   │
    │   ├── shared/                    # Used by 3+ modules — no business logic
    │   │   ├── api/
    │   │   │   └── client.ts          # Axios instance (interceptors: auth header, correlation ID, 401)
    │   │   ├── components/
    │   │   │   ├── DataTable.tsx      # Paginated sortable table
    │   │   │   ├── StatusBadge.tsx    # Color-coded status chips
    │   │   │   ├── ConfirmDialog.tsx  # Confirmation modal
    │   │   │   ├── ExportButton.tsx   # Async export flow (request → poll → download)
    │   │   │   ├── EmptyState.tsx     # Empty data panel
    │   │   │   ├── LoadingSkeleton.tsx
    │   │   │   ├── ErrorPanel.tsx
    │   │   │   ├── SearchInput.tsx    # Debounced search input (300ms)
    │   │   │   └── Pagination.tsx
    │   │   ├── hooks/
    │   │   │   ├── useCurrentUser.ts  # Returns { user, role, isManager, isAdmin, isHR }
    │   │   │   ├── usePermission.ts   # Permission check helper
    │   │   │   └── useExport.ts       # Async export: request → poll → download
    │   │   ├── types/
    │   │   │   ├── api.types.ts       # Shared API response types (PaginatedResponse, etc.)
    │   │   │   └── auth.types.ts
    │   │   └── utils/
    │   │       ├── formatDate.ts      # Date formatting helpers (using date-fns)
    │   │       ├── formatDuration.ts
    │   │       ├── errorHandler.ts    # API error → user-friendly message
    │   │       └── correlationId.ts   # UUID4 generation for X-Correlation-ID
    │   │
    │   ├── layout/                    # App shell — not a module, no API calls
    │   │   ├── AppShell.tsx           # Sidebar + Header wrapper
    │   │   ├── Sidebar.tsx            # Role-aware navigation sidebar
    │   │   ├── Header.tsx             # Top bar with notification bell + user menu
    │   │   └── NotificationBell.tsx   # Bell icon with unread count badge
    │   │
    │   ├── store/
    │   │   ├── authStore.ts           # Zustand: current user, Keycloak instance
    │   │   └── uiStore.ts             # Zustand: sidebar state, preferences
    │   │
    │   └── styles/
    │       ├── theme.ts               # Ant Design theme token config: colors, typography from prototype/css/styles.css
    │       └── globals.css            # Global resets and base styles
    │
    ├── tests/
    │   ├── unit/                      # Vitest unit tests — mirror src/modules/ structure
    │   │   └── modules/
    │   │       └── [module_name]/
    │   │           └── [component].test.tsx
    │   └── e2e/                       # Playwright end-to-end tests
    │
    ├── index.html                     # Vite entry HTML
    ├── vite.config.ts
    ├── tsconfig.json                  # Strict TypeScript config
    ├── package.json
    └── Dockerfile                     # Frontend container definition
```

### Frontend Form Stack Placement

- React Hook Form + Zod are required for all user-input forms.
- Form schema definitions live with the owning page/component inside `modules/[module]/pages/` or `modules/[module]/components/`.
- Reusable validation helpers may be extracted into `shared/utils/` only when shared by multiple modules.
- Do not implement form state with ad-hoc `useState` patterns when React Hook Form applies.

---

## INFRASTRUCTURE FILES

```
lms_rad/
├── docker-compose.yml             # All services: backend, frontend, worker, postgres, apisix
├── docker-compose.dev.yml         # Dev overrides: hot reload, debug ports
├── .env.example                   # All required env vars documented
├── apisix/
│   ├── config.yml                 # APISIX global config
│   └── routes/
│       ├── standard_routes.yml    # User JWT routes (all modules)
│       └── pes_m2m_routes.yml     # PES service account routes (rate-limited)
└── docs/                          # All documentation (this folder)
```

---

## FILE NAMING RULES

| Type | Convention | Example |
|---|---|---|
| Python modules | `snake_case.py` | `user_service.py` |
| Alembic migrations | `YYYYMMDD_HHMM_module_description.py` | `20240415_1030_user_management_init.py` |
| React components | `PascalCase.tsx` | `UserDetailPage.tsx` |
| React hooks | `camelCase.ts` starting with `use` | `useCurrentUser.ts` |
| API modules | `camelCase.ts` | `users.ts`, `training.ts` |
| Type files | `camelCase.types.ts` | `user.types.ts` |
| Store files | `camelCase.store.ts` or `[name]Store.ts` | `authStore.ts` |
| Test files | same name as subject + `.test.ts` or `.spec.ts` | `user_service.test.py` |
