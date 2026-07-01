# AZ-LMS — Module File Index

---

## About This File

| Field | Detail |
|---|---|
| **Purpose** | Single lookup table mapping every AZ-LMS module to its complete set of required reading files — spanning all 5 source folders (`02_features`, `03_ux`, `04_architecture`, `05_engineering`, `prototype`). Eliminates the problem of AI reading only 1-2 files and making incomplete decisions. |
| **When to Use** | At the start of ANY task (audit, code generation, diagram, investigation). Look up your module, read every file listed — no exceptions. |
| **How to Use** | Find your module section → read every file in the table → confirm reading before proceeding. If a file listed here doesn't exist yet, that is a 🔴 Critical discrepancy — flag it before continuing. |
| **Used By Agents?** | Yes — both `backend-dev.md` and `frontend-dev.md` Claude Code agents instruct the AI to look up this file first. `01_module_audit.md` and `02_code_generation.md` skills also reference this file in Step 2. It is the central file index for all AI-driven work. |
| **Maintenance** | Update this file whenever a new spec file (`api.md`, `schema.md`, feature spec, or prototype) is created or renamed. |
| **Related Files** | `AI_CONTEXT.md` (rules), `01_module_audit.md` (audit process), `02_code_generation.md` (code gen process), `.claude/agents/backend-dev.md`, `.claude/agents/frontend-dev.md` |

---

## How to Use

1. Find your module below
2. Read ALL files listed under it — not some, ALL
3. If a file is > 800 lines, read in multiple passes using StartLine + EndLine
4. Confirm reading before writing any code

---

## MODULE 01 — Authentication & Access

| Folder | File |
|---|---|
| **Feature Spec** | `docs/requirements/02_features/01_authentication.md` |
| **Architecture** | `docs/requirements/04_architecture/01_architecture.md` (Sections 7, 10 — Security) |
| **Architecture** | `docs/requirements/04_architecture/03_modules.md` (Auth module section) |
| **API** | `docs/requirements/05_engineering/features/01_auth/api.md` |
| **Schema** | `docs/requirements/05_engineering/features/01_auth/schema.md` |
| **UX Flow** | `docs/requirements/03_ux/01_ux_flows.md` (Flows 1, 1A, 1B, 1C) |
| **UX Screen** | `docs/requirements/03_ux/02_screens.md` (Screens 1, 2) |
| **Prototype** | `prototype/login.html` |

---

## MODULE 02 — User Management

| Folder | File |
|---|---|
| **Feature Spec** | `docs/requirements/02_features/02_user_management.md` |
| **Architecture** | `docs/requirements/04_architecture/03_modules.md` (User Management section) |
| **Architecture** | `docs/requirements/04_architecture/04_integrations.md` (Zoho + Employee DB sections) |
| **API** | `docs/requirements/05_engineering/features/02_user_management/api.md` |
| **Schema** | `docs/requirements/05_engineering/features/02_user_management/schema.md` |
| **ER Diagram** | `docs/requirements/05_engineering/er_diagram.md` (users, user_hierarchy, user_project_allocations, user_capabilities, user_attributes_sync_log tables) |
| **UX Flow** | `docs/requirements/03_ux/01_ux_flows.md` (Flows 1, 10) |
| **UX Screen** | `docs/requirements/03_ux/02_screens.md` (Screens 20, 21, 35) |
| **Prototype** | `prototype/admin-users.html` |
| **Prototype** | `prototype/user-detail.html` |
| **Prototype** | `prototype/profile.html` |

---

## MODULE 03 — Training Management

> **⚠️ UPDATED — Page-Centric Structure in Use**
>
> This module now uses the page-centric sub-task folder structure.
> **For code generation tasks, do NOT use the file list below** — use the sub-task files instead:
>
> - Read: `docs/code_generation/modules/_shared.md` (universal patterns — always first)
> - Read: `docs/code_generation/modules/training_management/_module.md` (module context)
> - Then read the specific sub-task file for what you are generating:
>   - Backend: `docs/code_generation/modules/training_management/backend/b1_models_migration.md`
>   - Backend: `docs/code_generation/modules/training_management/backend/b2_pydantic_schemas.md`
>   - Backend: `docs/code_generation/modules/training_management/backend/b3_repository.md`
>   - Backend: `docs/code_generation/modules/training_management/backend/b4_service.md`
>   - Backend: `docs/code_generation/modules/training_management/backend/b5_router_jobs.md`
>   - Frontend: `docs/code_generation/modules/training_management/frontend/f1_admin_list.md`
>   - Frontend: `docs/code_generation/modules/training_management/frontend/f2_wizard_step1.md`
>   - Frontend: `docs/code_generation/modules/training_management/frontend/f3_wizard_step2.md`
>   - Frontend: `docs/code_generation/modules/training_management/frontend/f4_wizard_steps3_4_modals.md`
>   - Frontend: `docs/code_generation/modules/training_management/frontend/f5_manage_resources.md`
>   - Frontend: `docs/code_generation/modules/training_management/frontend/f6_catalog_page.md`
>   - Frontend: `docs/code_generation/modules/training_management/frontend/f7_detail_and_certificates.md`
>
> The file list below is the **legacy reference** — still authoritative for the original module-level docs (for audit tasks or cross-reference). Do not use it as the reading list for code generation.

| Folder | File |
|---|---|
| **Feature Spec** | `docs/requirements/02_features/03_training_management.md` |
| **Architecture** | `docs/requirements/04_architecture/03_modules.md` (Training Management section) |
| **Architecture** | `docs/requirements/04_architecture/04_integrations.md` (OneDrive section) |
| **API** | `docs/requirements/05_engineering/features/03_training_management/api.md` |
| **Schema** | `docs/requirements/05_engineering/features/03_training_management/schema.md` |
| **ER Diagram** | `docs/requirements/05_engineering/er_diagram.md` (training_items, resources, certificates tables) |
| **UX Flow** | `docs/requirements/03_ux/01_ux_flows.md` (Flows 3, 21) |
| **UX Screen** | `docs/requirements/03_ux/02_screens.md` (Screens 8, 9, 10, 22, 23, 30, 37) |
| **Prototype** | `prototype/admin-training.html` |
| **Prototype** | `prototype/admin-training-resources.html` |
| **Prototype** | `prototype/catalog.html` |
| **Prototype** | `prototype/course-detail.html` |
| **Prototype** | `prototype/certificate.html` |

---

## MODULE 04 — Assignment Engine

| Folder | File |
|---|---|
| **Feature Spec** | `docs/requirements/02_features/04_assignment_engine.md` |
| **Architecture** | `docs/requirements/04_architecture/03_modules.md` (Assignment Engine section) |
| **API** | `docs/requirements/05_engineering/features/04_assignment_engine/api.md` |
| **Schema** | `docs/requirements/05_engineering/features/04_assignment_engine/schema.md` |
| **ER Diagram** | `docs/requirements/05_engineering/er_diagram.md` (assignments, approvals, compliance_status, mandatory_assignment_rules tables) |
| **UX Flow** | `docs/requirements/03_ux/01_ux_flows.md` (Flows 2, 4, 5, 7, 8) |
| **UX Screen** | `docs/requirements/03_ux/02_screens.md` (Screens 7, 14, 15, 16) |
| **Prototype** | `prototype/my-training.html` |
| **Prototype** | `prototype/team-assignments.html` |
| **Prototype** | `prototype/approvals.html` |

---

## MODULE 05 — Sessions

| Folder | File |
|---|---|
| **Feature Spec** | `docs/requirements/02_features/05_sessions.md` |
| **Architecture** | `docs/requirements/04_architecture/03_modules.md` (Sessions section) |
| **Architecture** | `docs/requirements/04_architecture/04_integrations.md` (Microsoft Teams section) |
| **API** | `docs/requirements/05_engineering/features/05_sessions/api.md` |
| **Schema** | `docs/requirements/05_engineering/features/05_sessions/schema.md` |
| **ER Diagram** | `docs/requirements/05_engineering/er_diagram.md` (sessions, session_participants, session_attendance, facilitators, venues tables) |
| **UX Flow** | `docs/requirements/03_ux/01_ux_flows.md` (Flow 6) |
| **UX Screen** | `docs/requirements/03_ux/02_screens.md` (Screens 11, 12, 13, 24, 25) |
| **Prototype** | `prototype/sessions.html` |
| **Prototype** | `prototype/session-detail.html` |
| **Prototype** | `prototype/admin-sessions.html` *(65KB — read in 2 passes)* |

---

## MODULE 06 — Notifications

| Folder | File |
|---|---|
| **Feature Spec** | `docs/requirements/02_features/06_notifications.md` |
| **Architecture** | `docs/requirements/04_architecture/03_modules.md` (Notifications section) |
| **API** | `docs/requirements/05_engineering/features/06_notifications/api.md` |
| **Schema** | `docs/requirements/05_engineering/features/06_notifications/schema.md` |
| **ER Diagram** | `docs/requirements/05_engineering/er_diagram.md` (notifications, notification_delivery_log, notification_preferences tables) |
| **UX Flow** | `docs/requirements/03_ux/01_ux_flows.md` (Flow 12) |
| **UX Screen** | `docs/requirements/03_ux/02_screens.md` (Screens 28, 29) |
| **Prototype** | `prototype/notifications.html` |

---

## MODULE 07 — Reporting

| Folder | File |
|---|---|
| **Feature Spec** | `docs/requirements/02_features/07_reporting.md` |
| **Architecture** | `docs/requirements/04_architecture/03_modules.md` (Reporting section) |
| **API** | `docs/requirements/05_engineering/features/07_reporting/api.md` |
| **Schema** | `docs/requirements/05_engineering/features/07_reporting/schema.md` |
| **ER Diagram** | `docs/requirements/05_engineering/er_diagram.md` (report_exports, reporting_snapshots tables) |
| **UX Flow** | `docs/requirements/03_ux/01_ux_flows.md` (Flow 9) |
| **UX Screen** | `docs/requirements/03_ux/02_screens.md` (Screens 17, 18) |
| **Prototype** | `prototype/compliance.html` *(50KB — read in 2 passes)* |
| **Prototype** | `prototype/reports.html` *(79KB — read in 3 passes)* |

---

## MODULE 08 — Audit

| Folder | File |
|---|---|
| **Feature Spec** | `docs/requirements/02_features/08_audit.md` |
| **Architecture** | `docs/requirements/04_architecture/03_modules.md` (Audit section) |
| **API** | `docs/requirements/05_engineering/features/08_audit/api.md` |
| **Schema** | `docs/requirements/05_engineering/features/08_audit/schema.md` |
| **ER Diagram** | `docs/requirements/05_engineering/er_diagram.md` (audit_logs, audit_write_failures, audit_export_jobs tables) |
| **UX Screen** | `docs/requirements/03_ux/02_screens.md` (Screen 19) |
| **Prototype** | `prototype/audit-logs.html` |

---

## MODULE 09 — Search

| Folder | File |
|---|---|
| **Feature Spec** | `docs/requirements/02_features/09_search.md` |
| **Architecture** | `docs/requirements/04_architecture/03_modules.md` (Search section — PostgreSQL FTS only, no Elasticsearch) |
| **API** | `docs/requirements/05_engineering/features/09_search/api.md` |
| **Schema** | `docs/requirements/05_engineering/features/09_search/schema.md` |
| **UX Screen** | `docs/requirements/03_ux/02_screens.md` (Screen 8 — Catalog search) |
| **Prototype** | `prototype/catalog.html` |

---

## MODULE 10 — Integrations

| Folder | File |
|---|---|
| **Feature Spec** | `docs/requirements/04_architecture/04_integrations.md` *(PRIMARY spec for this module)* |
| **Architecture** | `docs/requirements/04_architecture/03_modules.md` (Integrations section) |
| **API** | `docs/requirements/05_engineering/features/10_integrations/api.md` |
| **Schema** | `docs/requirements/05_engineering/features/10_integrations/schema.md` |
| **ER Diagram** | `docs/requirements/05_engineering/er_diagram.md` (integration_jobs, integration_health_status tables) |
| **UX Flow** | `docs/requirements/03_ux/01_ux_flows.md` (Flows 8, 10) |
| **UX Screen** | `docs/requirements/03_ux/02_screens.md` (Screen 33) |
| **Prototype** | `prototype/admin-integrations.html` |

---

## MODULE 11 — Admin Configuration

| Folder | File |
|---|---|
| **Feature Spec** | `docs/requirements/02_features/11_admin.md` |
| **Architecture** | `docs/requirements/04_architecture/03_modules.md` (Admin Config section) |
| **API** | `docs/requirements/05_engineering/features/11_admin/api.md` |
| **Schema** | `docs/requirements/05_engineering/features/11_admin/schema.md` |
| **ER Diagram** | `docs/requirements/05_engineering/er_diagram.md` (admin_settings, admin_settings_history tables) |
| **UX Screen** | `docs/requirements/03_ux/02_screens.md` (Screen 32) |
| **Prototype** | `prototype/admin-settings.html` |

---

## MODULE 12 — Probation Management

| Folder | File |
|---|---|
| **Feature Spec** | `docs/requirements/02_features/12_probation_management.md` |
| **Architecture** | `docs/requirements/04_architecture/03_modules.md` (Probation section) |
| **API** | `docs/requirements/05_engineering/features/12_probation/api.md` |
| **Schema** | `docs/requirements/05_engineering/features/12_probation/schema.md` |
| **ER Diagram** | `docs/requirements/05_engineering/er_diagram.md` (user_probation table) |
| **UX Flow** | `docs/requirements/03_ux/01_ux_flows.md` (Probation flows — search for PROBATION) |
| **UX Screen** | `docs/requirements/03_ux/02_screens.md` (Screen 34) |
| **Prototype** | `prototype/hr-probation.html` |

---

## SHARED — Always Read for Any Module

| Folder | File | When |
|---|---|---|
| **Master Context** | `docs/AI_CONTEXT.md` | EVERY task — read first |
| **Tech Stack** | `docs/requirements/05_engineering/01_tech_stack.md` | EVERY task — exact libraries and versions |
| **Project Scaffold** | `docs/requirements/05_engineering/02_project_scaffold.md` | EVERY task — correct file locations |
| **Coding Conventions** | `docs/requirements/05_engineering/03_coding_conventions.md` | EVERY task — patterns to follow |
| **Module Boundaries** | `docs/requirements/04_architecture/03_modules.md` | EVERY backend task |
| **APISIX Routes** | `docs/requirements/05_engineering/00_apisix_routes.md` | Every task that adds/changes API routes |
| **ER Diagram (full)** | `docs/requirements/05_engineering/er_diagram.md` | Every schema/migration task |
| **NFR** | `docs/requirements/04_architecture/02_nfr.md` | Performance-sensitive or security tasks |
| **Prototype CSS** | `prototype/css/` | Every frontend task — extract design tokens |

---

## DASHBOARDS — Read for Dashboard Tasks

| Dashboard | Files to Read |
|---|---|
| **Employee Dashboard** | Module 04 (Assignment) + Module 05 (Sessions) files + `prototype/dashboard-employee.html` + Screen 3 |
| **Manager Dashboard** | Module 04 (Assignment) + Module 05 (Sessions) files + `prototype/dashboard-manager.html` + Screen 4 |
| **Admin Dashboard** | Modules 02, 03, 04, 05 files + `prototype/dashboard-admin.html` + Screen 5 |
| **HR Dashboard** | Module 07 (Reporting) + Module 12 (Probation) files + `prototype/dashboard-hr.html` + `prototype/hr-probation.html` + Screens 6, 34 |

---

## Cross-Module Dependencies (read BOTH modules when task touches both)

| If building... | Also read... |
|---|---|
| Assignment Engine | + Training Management (what gets assigned) + User Management (who it's assigned to) |
| Sessions | + Training Management (linked training) + Assignment Engine (completion trigger) |
| Notifications | + Every module that triggers notifications (see 06_notifications.md event catalog) |
| Reporting | + All modules whose data appears in reports |
| Probation | + Assignment Engine (EMPLOYMENT_PHASE rules) + Training Management (is_probation_gateway flag) |
| Compliance | THIS IS PART OF Assignment Engine — do NOT create a separate compliance module |
