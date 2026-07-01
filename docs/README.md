# LMS Documentation Index

This is the master index for all LMS project documentation.

---

## Who Should Read What

| Role | Start Here | Then Read |
|---|---|---|
| **Client / Business Stakeholder** | `01_product/master_prd.md` | `03_ux/02_screens.md` |
| **New Team Member** | `01_product/master_prd.md` | `04_architecture/01_architecture.md` → `04_architecture/03_modules.md` |
| **Backend Developer** | `04_architecture/03_modules.md` | `02_features/XX_module.md` → `05_engineering/features/XX/api.md` + `schema.md` |
| **Frontend Developer** | `03_ux/01_ux_flows.md` | `03_ux/02_screens.md` → `05_engineering/features/XX/api.md` |
| **QA / Test Engineer** | `03_ux/01_ux_flows.md` | `02_features/XX_module.md` → `05_engineering/features/XX/api.md` |
| **DevOps / Infra** | `04_architecture/01_architecture.md` | `04_architecture/02_nfr.md` |
| **AI Coding Assistant** | `04_architecture/03_modules.md` | Per-task `05_engineering/features/XX/api.md` + `schema.md` |

---

## Folder Structure

```
docs/
  README.md                          ← you are here

  requirements/
    01_product/                      ← client-facing product overview
    02_features/                     ← business rules per module
    03_ux/                           ← user flows and screen definitions
    04_architecture/                 ← system design and constraints
    05_engineering/                  ← technical API + schema specs
```

---

## 01_product — Product Overview

> **Audience:** Client, business stakeholders, project managers, new team members
> **Purpose:** What is being built, for whom, and why

| File | Description |
|---|---|
| [master_prd.md](requirements/01_product/master_prd.md) | Complete product requirements — scope, personas, all features, integrations, out-of-scope |

---

## 02_features — Feature Specifications

> **Audience:** Developers, QA, product owners
> **Purpose:** Business rules, workflows, and edge cases per module. Read before writing code for any module.

| File | Module | Description |
|---|---|---|
| [01_authentication.md](requirements/02_features/01_authentication.md) | Auth | SSO, PKCE flow, token handling, login/logout |
| [02_user_management.md](requirements/02_features/02_user_management.md) | Users | User lifecycle, hierarchy sync, Admin override |
| [03_training_management.md](requirements/02_features/03_training_management.md) | Training | Course/path/curriculum lifecycle, resources, certificates |
| [04_assignment_engine.md](requirements/02_features/04_assignment_engine.md) | Assignments | Assignment lifecycle, mandatory rules, approvals, compliance, overdue |
| [05_sessions.md](requirements/02_features/05_sessions.md) | Sessions | Hybrid classroom sessions, Teams integration, attendance |
| [06_notifications.md](requirements/02_features/06_notifications.md) | Notifications | In-app + email, idempotency, dead-letter, preferences |
| [07_reporting.md](requirements/02_features/07_reporting.md) | Reporting | Dashboards, reports, async export (Excel/PDF) |
| [08_audit.md](requirements/02_features/08_audit.md) | Audit | Immutable audit log, 5-year retention, dead-letter |
| [09_search.md](requirements/02_features/09_search.md) | Search | PostgreSQL full-text search, typeahead |
| [11_admin.md](requirements/02_features/11_admin.md) | Admin | System settings, role management, mandatory rules |

> **Note:** Integrations is an architecture reference document, not a feature spec — see `04_architecture/04_integrations.md`.

---

## 03_ux — UX Flows and Screens

> **Audience:** Frontend developers, QA, designers
> **Purpose:** How users navigate the system and what each screen contains. Read before building any UI.

| File | Description |
|---|---|
| [01_ux_flows.md](requirements/03_ux/01_ux_flows.md) | 17 end-to-end user flows across all roles and modules |
| [02_screens.md](requirements/03_ux/02_screens.md) | 34 screen definitions with components, API references, and role visibility |

---

## 04_architecture — System Architecture

> **Audience:** All technical team members
> **Purpose:** System topology, design decisions, module boundaries, and non-functional constraints. Read before designing or changing anything systemic.

| File | Description |
|---|---|
| [01_architecture.md](requirements/04_architecture/01_architecture.md) | System overview — layers, patterns, integration architecture, security model |
| [02_nfr.md](requirements/04_architecture/02_nfr.md) | Non-functional requirements — performance targets, security constraints, reliability patterns, data retention |
| [03_modules.md](requirements/04_architecture/03_modules.md) | Module definitions — ownership, responsibilities, dependencies, build order, code structure |
| [04_integrations.md](requirements/04_architecture/04_integrations.md) | Integration architecture — all 6 external systems, data ownership, sync patterns, failure behaviour |

---

## 05_engineering — Technical Specifications

> **Audience:** Backend developers, AI coding assistants
> **Purpose:** Exact API contracts and database schemas per module. The authoritative source for implementation.

| File | Description |
|---|---|
| [00_apisix_routes.md](requirements/05_engineering/00_apisix_routes.md) | Complete APISIX gateway route inventory — all 129 routes across 11 modules |

### Per-Module Engineering Files

Each module has two files: `api.md` (endpoints, request/response) and `schema.md` (tables, columns, indexes).

| Folder | Module | API | Schema |
|---|---|---|---|
| [01_auth/](requirements/05_engineering/features/01_auth/) | Authentication | [api.md](requirements/05_engineering/features/01_auth/api.md) | [schema.md](requirements/05_engineering/features/01_auth/schema.md) |
| [02_user_management/](requirements/05_engineering/features/02_user_management/) | User Management | [api.md](requirements/05_engineering/features/02_user_management/api.md) | [schema.md](requirements/05_engineering/features/02_user_management/schema.md) |
| [03_training_management/](requirements/05_engineering/features/03_training_management/) | Training Management | [api.md](requirements/05_engineering/features/03_training_management/api.md) | [schema.md](requirements/05_engineering/features/03_training_management/schema.md) |
| [04_assignment_engine/](requirements/05_engineering/features/04_assignment_engine/) | Assignment Engine | [api.md](requirements/05_engineering/features/04_assignment_engine/api.md) | [schema.md](requirements/05_engineering/features/04_assignment_engine/schema.md) |
| [05_sessions/](requirements/05_engineering/features/05_sessions/) | Sessions | [api.md](requirements/05_engineering/features/05_sessions/api.md) | [schema.md](requirements/05_engineering/features/05_sessions/schema.md) |
| [06_notifications/](requirements/05_engineering/features/06_notifications/) | Notifications | [api.md](requirements/05_engineering/features/06_notifications/api.md) | [schema.md](requirements/05_engineering/features/06_notifications/schema.md) |
| [07_reporting/](requirements/05_engineering/features/07_reporting/) | Reporting | [api.md](requirements/05_engineering/features/07_reporting/api.md) | [schema.md](requirements/05_engineering/features/07_reporting/schema.md) |
| [08_audit/](requirements/05_engineering/features/08_audit/) | Audit | [api.md](requirements/05_engineering/features/08_audit/api.md) | [schema.md](requirements/05_engineering/features/08_audit/schema.md) |
| [09_search/](requirements/05_engineering/features/09_search/) | Search | [api.md](requirements/05_engineering/features/09_search/api.md) | [schema.md](requirements/05_engineering/features/09_search/schema.md) |
| [10_integrations/](requirements/05_engineering/features/10_integrations/) | Integrations | [api.md](requirements/05_engineering/features/10_integrations/api.md) | [schema.md](requirements/05_engineering/features/10_integrations/schema.md) |
| [11_admin/](requirements/05_engineering/features/11_admin/) | Admin | [api.md](requirements/05_engineering/features/11_admin/api.md) | [schema.md](requirements/05_engineering/features/11_admin/schema.md) |

### Archive

Superseded master documents — kept for reference only. Per-module files in `features/` are authoritative.

| File | Description |
|---|---|
| [_archive/01_api_list.md](requirements/05_engineering/_archive/01_api_list.md) | Original master API list (superseded by per-module api.md files) |
| [_archive/02_database_schema.md](requirements/05_engineering/_archive/02_database_schema.md) | Original master schema (superseded by per-module schema.md files) |

---

## Document Relationships

```
master_prd.md          (what we build — business language)
      ↓
02_features/XX.md      (how each module behaves — business rules)
      ↓
03_ux/ flows + screens (how users interact — UI/UX)
      ↓
04_architecture/       (how the system is structured — design decisions)
      ↓
05_engineering/        (what to build exactly — API + DB contracts)
      ↓
  00_apisix_routes.md  (how the gateway is configured — ops)
```

---

*Last updated: 2026-04-06*
