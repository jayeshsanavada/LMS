# SKILL: AZ-LMS Code Generation

---

## About This File

| Field | Detail |
|---|---|
| **Purpose** | Enforces a structured, step-by-step code generation process for any AZ-LMS module. Ensures the AI reads ALL required files from all 5 source folders before writing a single line of code — preventing hallucinated field names, wrong module boundaries, and Phase 2 leakage. |
| **When to Use** | Whenever you want to generate backend (FastAPI) or frontend (React) code for any module — after the sync audit for that module has been completed and any discrepancies resolved. |
| **How to Use** | Paste the invocation below at the start of a NEW conversation. Specify what you want to build. The AI follows every step in order before writing code. |
| **Used By Agents?** | Yes — `backend-dev.md` and `frontend-dev.md` Claude Code agents follow the same process automatically. For Antigravity or other tools, invoke this skill manually. This skill is the manual equivalent of those agents. |
| **Output** | Production-quality, spec-accurate code with: correct field names, correct endpoint paths, audit events, notification dispatch, and no Phase 2 features. |
| **Prerequisite** | Run `01_module_audit.md` first. Do NOT generate code for a module that has unresolved 🔴 Critical discrepancies. |

---

## How to Invoke

**In Antigravity / ChatGPT / any AI tool:**
> *"Read and execute the skill at `docs/code_generation/skills/02_code_generation.md`.
> I want to build: [describe the task — e.g. 'Sessions backend module']"*

**In Claude Code:**
> Claude Code will use `.claude/agents/backend-dev.md` or `.claude/agents/frontend-dev.md` automatically.
> You can still reference this file for the step-by-step checklist.

---

## STEP 1 — Read Master Context

```
docs/AI_CONTEXT.md
```
Confirm: module boundary rules, key decisions, Phase 2 restrictions, admin settings catalog.

---

## STEP 2 — Look Up Required Files

**Fast Path (use this if a `docs/code_generation/modules/` folder exists for the target module):**

If `docs/code_generation/modules/[module-name]/` exists for the target module:
1. Read `docs/code_generation/modules/_shared.md` — universal patterns (always first)
2. Read `docs/code_generation/modules/[module-name]/_module.md` — module-specific context
3. Read the specific sub-task file (e.g. `docs/code_generation/modules/training_management/backend/b1_models_migration.md`)
4. That sub-task file lists the source files to cross-reference with exact line ranges
5. Skip the file index lookup below — it is no longer needed for this module
6. Proceed directly to Step 3B (Pre-Code Declaration)

**Standard Path (use this if no `docs/code_generation/modules/` folder exists yet):**

```
docs/code_generation/skills/03_module_file_index.md
```
Find the target module. Read the COMPLETE file list — from ALL source folders:

| Folder | What It Gives You |
|---|---|
| `docs/requirements/02_features/` | Business rules, workflows, acceptance criteria |
| `docs/requirements/03_ux/01_ux_flows.md` | End-to-end user flows |
| `docs/requirements/03_ux/02_screens.md` | Screen definitions: UI elements, actions, API calls |
| `docs/requirements/04_architecture/` | Module boundaries, integration patterns, NFRs |
| `docs/requirements/05_engineering/features/[XX]/api.md` | Exact endpoints, request/response, error codes |
| `docs/requirements/05_engineering/features/[XX]/schema.md` | Exact tables, columns, types, constraints |
| `docs/requirements/05_engineering/er_diagram.md` | FK relationships across modules |
| `docs/requirements/05_engineering/00_apisix_routes.md` | Gateway route configuration |
| `prototype/[file].html` | Visual prototype (frontend tasks only) |

---

## STEP 3 — Read ALL Files (No Skipping)

- Read every file identified in Step 2
- If file > 800 lines → read in multiple passes (StartLine + EndLine)
- After each file, note what you learned in 1 sentence

Confirm before writing any code:
> "I have read the following [N] files: [list every file]
> I am now ready to begin code generation."

---

## STEP 3B — Pre-Code Declaration (HARD STOP — applies to ALL tasks)

**This step is mandatory regardless of whether you used the Fast Path or Standard Path.**

Before writing the first line of code, output this declaration and wait for the AI to confirm it is complete:

```
## PRE-CODE DECLARATION — [Module] [Sub-task name]

### Files Read (in order)
| File | Lines Read | Key Fact Confirmed |
|---|---|---|
| _shared.md | all | [SQLAlchemy 2.x / Ant Design v5 / patterns confirmed] |
| _module.md | all | [N tables / N audit events / lifecycle states confirmed] |
| [sub-task file].md | all | [scope, stop point, business rules confirmed] |
| [source file from spec] | [line range] | [key fact] |

### Schema Column Checklist (backend tasks)
| Table | Column | Type | Nullable | In This Sub-task? |
|---|---|---|---|---|
| training_items | id | UUID | No | Yes — PK |
| training_items | training_code | VARCHAR | No | Yes |
| training_items | training_type | VARCHAR | No | Yes |
| ... all columns ... | | | | |

### Endpoint Checklist (router/service tasks)
| Method | Path | Role | Implemented? |
|---|---|---|---|
| GET | /api/v1/trainings | ADMIN,HR,EMPLOYEE | [Yes/No] |
| ... all endpoints ... | | | |

### Prototype Field Inventory (frontend tasks)
| Prototype Section | Field/Element | Maps to API Field | In This Sub-task? |
|---|---|---|---|
| [section name] | [field label] | [field name] | Yes/No |
| ... all visible elements ... | | | |

I confirm all required files have been read.
I confirm the scope of this sub-task.
Beginning code generation now.
```

**If this declaration is missing or incomplete → STOP and output the declaration before any code.**

---

## STEP 4 — Pre-Code Architecture Checklist

Before writing a single line, confirm these for the target module:

**Backend checklist:**
- [ ] All PKs are UUID v4 (not integers)
- [ ] All timestamps are `TIMESTAMPTZ DEFAULT NOW()`
- [ ] No hard deletes — use `is_active = false` or `status = CANCELLED`
- [ ] All state-changing operations emit an audit event (async)
- [ ] All user-facing notifications dispatched async (never inline)
- [ ] `X-Correlation-ID` extracted from header, passed to audit + notifications
- [ ] Manager scope validated via `user_hierarchy` table (NOT a Keycloak role)
- [ ] Compliance logic is ONLY in Assignment Engine, not duplicated
- [ ] LMS stores file metadata only; file content remains in OneDrive integrations
- [ ] Error format: `{ "error_code": "...", "message": "...", "detail": "..." }`
- [ ] Phase 2 items identified and excluded (add comment: `# Phase 2: [name]`)

**Frontend checklist:**
- [ ] JWT stored in memory only (Keycloak JS adapter) — never localStorage
- [ ] Role read from `realm_access.roles` in JWT
- [ ] Manager status checked via `GET /api/v1/users/team-members` (if non-empty = manager)
- [ ] All API calls use the typed Axios instance (not raw fetch)
- [ ] All GET requests use React Query (loading, error, empty states handled)
- [ ] Export UI and API usage allow Excel (`.xlsx`) and PDF only — no CSV options
- [ ] Prototype HTML referenced — layout, labels, colors, badge styles must match exactly
- [ ] Phase 2 items excluded

---

## STEP 5 — Generate Code in This Order

### Granularity Rules (MANDATORY — apply these regardless of path used)

**Backend: one layer per conversation — never generate multiple layers in one session.**

Each layer is a separate sub-task with a hard stop:

| Layer | Sub-task | Stop Signal |
|---|---|---|
| B1 | SQLAlchemy models + Alembic migration | "B1 complete. Reply YES for B2." |
| B2 | Pydantic schemas (all request + response) | "B2 complete. Reply YES for B3." |
| B3 | Repository classes (all tables) | "B3 complete. Reply YES for B4." |
| B4 | Service layer (all business logic, audit, notifications) | "B4 complete. Reply YES for B5." |
| B5 | Router (all endpoints) + Background jobs | "B5 complete. Backend done. Reply YES for frontend." |

**Frontend: one screen per conversation — never generate multiple screens in one session.**

Each page + its modals is a separate sub-task:

| Layer | Sub-task | Stop Signal |
|---|---|---|
| F1 | Main list/admin page — modals = EMPTY PLACEHOLDERS | "F1 complete. Reply YES for F2." |
| F2 | First form/wizard step — subsequent steps = placeholders | "F2 complete. Reply YES for F3." |
| F3 | Second form/wizard step or resource section | "F3 complete. Reply YES for F4." |
| F4 | Remaining steps + fill in all modal placeholders from F1 | "F4 complete. Reply YES for F5." |
| F5–Fn | Additional pages (resources, catalog, detail, etc.) | "Fn complete. Reply YES for Fn+1." |

**Rule:** Never interleave backend and frontend. Never start frontend before backend B5 is confirmed. Modals start as empty placeholders and are filled in a dedicated sub-task — never all at once.

---

### Backend generation order (when no docs/code_generation/modules/ folder exists — Standard Path):
1. **SQLAlchemy models** (tables, columns, constraints, FKs matching `schema.md` exactly)
2. **Alembic migration** (auto-generated from models, reviewed for correctness)
3. **Pydantic schemas** (request/response models matching `api.md` exactly)
4. **Repository layer** (async DB queries — no business logic here)
5. **Service layer** (business logic, rule enforcement, audit emit, notification dispatch)
6. **API router** (FastAPI routes — paths matching `api.md` exactly, role guards applied)
7. **Background jobs** (if module has scheduled or event-driven jobs)
8. **Tests** (unit tests for service layer, integration tests for API layer)

### Frontend generation order (when no docs/code_generation/modules/ folder exists — Standard Path):
1. **TypeScript types** (matching API response shapes from `api.md`)
2. **API service module** (typed Axios calls for this module's endpoints)
3. **Reusable components** (module-specific: tables, cards, modals — matching prototype)
4. **Page components** (full pages matching prototype layout exactly)
5. **Form components** (with React Hook Form + Zod validation)
6. **Route registration** (add to React Router with correct role guard)

### Full-stack generation order (both backend + frontend):
If generating both layers in one session, follow this sequence strictly — never interleave:

**Phase 1 — Backend (complete all 8 steps before touching frontend):**
1. SQLAlchemy models
2. Alembic migration
3. Pydantic schemas
4. Repository layer
5. Service layer
6. API router
7. Background jobs (if any)
8. Tests

> After completing Phase 1, output this message and STOP. Wait for user confirmation before proceeding:
> "✅ Backend phase complete for [Module Name]. [N] backend files generated.
> Please review the backend code above.
> Reply **'yes'** (or **'proceed'**) to start frontend generation, or tell me what to fix first."

> **Do NOT start Phase 2 automatically. Do NOT continue until the user explicitly confirms.**

**Phase 2 — Frontend (only after user confirms Phase 1 is acceptable):**
1. TypeScript types
2. API service module
3. Reusable components
4. Page components
5. Form components
6. Route registration

> **Rule:** Never interleave backend and frontend generation. Never start Phase 2 without explicit user confirmation. Generating frontend before backend is reviewed leads to type mismatches and invented field names.

---

## STEP 6 — Reference Spec Files While Writing

For every piece of code:
- **Field names**: copied exactly from `schema.md` — never renamed
- **Endpoint paths**: copied exactly from `api.md` — never altered
- **Error codes**: copied exactly from `api.md` — never invented
- **Business rules**: each enforcement references the BR-XX rule number in a comment
- **Prototypes** (frontend): each component references which HTML file it replicates

---

## STEP 7 — Self-Review Before Delivering

Before giving code to the user, run this self-check:

- [ ] All field names match `schema.md` exactly?
- [ ] All endpoint paths match `api.md` exactly?
- [ ] All error codes match `api.md` exactly?
- [ ] All audit events emitted for every state change?
- [ ] All notifications dispatched async?
- [ ] No hard deletes?
- [ ] No Phase 2 features implemented?
- [ ] Frontend: does layout match prototype?
- [ ] No module writing to another module's tables?

---

## STEP 8 — Deliver With Summary

```
### Code Generation Complete — [Module Name] [Backend/Frontend]

**Files read:** [complete list]
**Files generated:** [complete list]

**Business rules enforced:**
- BR-XX: [description]

**Audit events emitted:**
- EVENT_CODE: [when triggered]

**Notification events dispatched:**
- EVENT_CODE: [when triggered]

**Phase 2 items excluded:**
- [list or "None"]

**Cross-module dependencies:**
- [list or "None"]
```
