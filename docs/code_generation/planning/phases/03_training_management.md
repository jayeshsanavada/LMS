# Phase 3 — Training Management
# Code Generation Prompts

---

## How to Use This File

1. Start from **Task 3.1a** (first backend sub-task)
2. Copy the prompt block → paste into a **new** GitHub Copilot conversation
3. The AI will output a Pre-Code Declaration before any code — if it skips this, paste the prompt again
4. After the AI stops at the stop point → review the code → reply YES in Copilot → move to next task
5. Mark status in the Progress Tracker in `code_generation_plan.md`

**Golden Rule:** Never start the next task until the current one is reviewed and committed.

---

## Dependencies

| Depends On | Why |
|---|---|
| Phase 2 complete | `users` table must exist (training tables FK to it) |
| Phase 1 complete | Audit service + shared infra needed by service layer |

---

## Task Overview

| Task | What It Generates | Prompt File |
|---|---|---|
| 3.1a | SQLAlchemy models + Alembic migration (17 tables) | `b1_models_migration.md` |
| 3.1b | Pydantic request/response schemas (all endpoints) | `b2_pydantic_schemas.md` |
| 3.1c | Repository classes (all tables) | `b3_repository.md` |
| 3.1d | Service layer (business logic, audit, notifications) | `b4_service.md` |
| 3.1e | FastAPI router (32 endpoints) + background job | `b5_router_jobs.md` |
| 3.2a | Admin Training List page (modals = placeholders) | `f1_admin_list.md` |
| 3.2b | Wizard shell + Step 1 Basic Info form | `f2_wizard_step1.md` |
| 3.2c | Wizard Step 2 — Resources (5 resource type modals) | `f3_wizard_step2.md` |
| 3.2d | Wizard Steps 3-4 + fill in 4 admin modals | `f4_wizard_steps3_4_modals.md` |
| 3.2e | Standalone Manage Resources page | `f5_manage_resources.md` |
| 3.2f | Learning Catalog page (employee-facing) | `f6_catalog_page.md` |
| 3.2g | Training Detail + Resource Player + My Certificates | `f7_detail_and_certificates.md` |

---

## BACKEND TASKS

---

### Task 3.1a — Models + Migration
**Status:** ⬜ Not started | **Depends on:** Phase 2

**📋 Copy this prompt:**
```
Read docs/code_generation/modules/training_management/backend/b1_models_migration.md — follow it exactly.

Before writing any code, output the Pre-Code Declaration table from that file.
After generating all SQLAlchemy models + Alembic migration: STOP and wait for confirmation.
```

---

### Task 3.1b — Pydantic Schemas
**Status:** ⬜ Not started | **Depends on:** Task 3.1a

**📋 Copy this prompt:**
```
Read docs/code_generation/modules/training_management/backend/b2_pydantic_schemas.md — follow it exactly.

Before writing any code, output the Pre-Code Declaration table from that file.
After generating all Pydantic request and response schemas: STOP and wait for confirmation.
```

---

### Task 3.1c — Repository Layer
**Status:** ⬜ Not started | **Depends on:** Task 3.1b

**📋 Copy this prompt:**
```
Read docs/code_generation/modules/training_management/backend/b3_repository.md — follow it exactly.

Before writing any code, output the Pre-Code Declaration table from that file.
After generating all repository classes and methods: STOP and wait for confirmation.
```

---

### Task 3.1d — Service Layer
**Status:** ⬜ Not started | **Depends on:** Task 3.1c

**📋 Copy this prompt:**
```
Read docs/code_generation/modules/training_management/backend/b4_service.md — follow it exactly.

Before writing any code, output the Pre-Code Declaration table from that file (including audit event coverage checklist).
After generating all service classes with business logic, audit events, and notifications: STOP and wait for confirmation.
```

---

### Task 3.1e — Router + Background Jobs
**Status:** ⬜ Not started | **Depends on:** Task 3.1d

**📋 Copy this prompt:**
```
Read docs/code_generation/modules/training_management/backend/b5_router_jobs.md — follow it exactly.

Before writing any code, output the Pre-Code Declaration table from that file (including the endpoint coverage checklist marking all 32 routes).
After generating all routers and the training_expiry_job: STOP and confirm backend complete.
```

---

## FRONTEND TASKS

> **Start frontend only after Task 3.1e is reviewed and committed.**

---

### Task 3.2a — Admin Training List Page
**Status:** ⬜ Not started | **Depends on:** Task 3.1e

**📋 Copy this prompt:**
```
Read docs/code_generation/modules/training_management/frontend/f1_admin_list.md — follow it exactly.

Before writing any code, output the Pre-Code Declaration table from that file (including UI element checklist).
Open prototype/admin-training.html and confirm the layout before generating any JSX.
After generating TrainingManagementPage, tables, tabs, Cert Approvals panel, and empty modal placeholders: STOP and wait for confirmation.
```

---

### Task 3.2b — Wizard Shell + Step 1 (Basic Info)
**Status:** ⬜ Not started | **Depends on:** Task 3.2a

**📋 Copy this prompt:**
```
Read docs/code_generation/modules/training_management/frontend/f2_wizard_step1.md — follow it exactly.

Before writing any code, output the Pre-Code Declaration table from that file (including Step 1 field checklist).
Open prototype/admin-training.html — locate the Training Editor wizard modal — look at Step 1 only.
After generating the 4-step wizard shell + Step 1 form (Steps 2-4 = empty placeholders): STOP and wait for confirmation.
```

---

### Task 3.2c — Wizard Step 2 (Resources)
**Status:** ⬜ Not started | **Depends on:** Task 3.2b

**📋 Copy this prompt:**
```
Read docs/code_generation/modules/training_management/frontend/f3_wizard_step2.md — follow it exactly.

Before writing any code, output the Pre-Code Declaration table from that file (including resource modal checklist).
Open prototype/admin-training.html — locate Step 2 content, each Add Resource button, and each resource modal.
After generating Step 2 content with all 5 resource type modals including assessment question builder: STOP and wait for confirmation.
```

---

### Task 3.2d — Wizard Steps 3-4 + Admin Modals
**Status:** ⬜ Not started | **Depends on:** Task 3.2c

**📋 Copy this prompt:**
```
Read docs/code_generation/modules/training_management/frontend/f4_wizard_steps3_4_modals.md — follow it exactly.

Before writing any code, output the Pre-Code Declaration table from that file (including Step 3 field checklist).
Open prototype/admin-training.html — look at Step 3 form, Step 4 review panel, Assign modal, Assignments viewer, Completion Rule modal, Cert Reject modal.
After generating Steps 3 & 4 + all 4 admin action modals (replacing F1 placeholders): STOP and wait for confirmation.
```

---

### Task 3.2e — Manage Resources Page
**Status:** ⬜ Not started | **Depends on:** Task 3.2d

**📋 Copy this prompt:**
```
Read docs/code_generation/modules/training_management/frontend/f5_manage_resources.md — follow it exactly.

Before writing any code, output the Pre-Code Declaration table from that file.
Open prototype/admin-training-resources.html — review the full page layout, drag-drop list, and Add/Edit modal.
After generating TrainingResourcesPage with drag-drop reorder and 2-step Add/Edit modal: STOP and wait for confirmation.
```

---

### Task 3.2f — Learning Catalog Page
**Status:** ⬜ Not started | **Depends on:** Task 3.2e

**📋 Copy this prompt:**
```
Read docs/code_generation/modules/training_management/frontend/f6_catalog_page.md — follow it exactly.

Before writing any code, output the Pre-Code Declaration table from that file (including UI element checklist).
Open prototype/catalog.html — review the full page: card grid, filter panel, Enroll modal, Approval Request modal.
After generating CatalogPage with search, filters, training cards, and enrollment modals: STOP and wait for confirmation.
```

---

### Task 3.2g — Training Detail + Resource Player + My Certificates
**Status:** ⬜ Not started | **Depends on:** Task 3.2f

**📋 Copy this prompt:**
```
Read docs/code_generation/modules/training_management/frontend/f7_detail_and_certificates.md — follow it exactly.

Before writing any code, output the Pre-Code Declaration table from that file (including detail element checklist and certificate card checklist).
Open prototype/course-detail.html and prototype/certificate.html — review both layouts.
After generating TrainingDetailPage, ResourcePlayer, and MyCertificatesPage with all 3 certificate card states: STOP — Training Management is complete.
```
