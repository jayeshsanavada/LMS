# Sub-task F5: Admin Training Resources Management Page
# Training Management — Frontend Layer 5 of 7

---

## Files to Read BEFORE Writing Code (in this order)

1. `docs/code_generation/modules/_shared.md` — useQuery, useMutation, Ant Design v5, named exports
2. `docs/code_generation/modules/training_management/_module.md` — resource types, OneDrive metadata, assessment rules
3. `docs/requirements/03_ux/02_screens.md` — Screen 37 (lines 2301–2366): Admin Training Resources Management
4. `docs/requirements/02_features/03_training_management.md` — §4 Resource Management, Assessment Resource (BR-40, BR-42, BR-47)
5. Prototype file: `prototype/admin-training-resources.html` — full page (breadcrumb, resource list, Add/Edit modal, drag-drop)

---

## Scope

**Generate:**
- `TrainingResourcesPage` — standalone admin page (not part of wizard)
- Resource list with drag-and-drop reorder (sequence_no)
- "Add Resource" button → opens 2-step type-selection + configuration modal
- Edit resource → same modal, pre-filled (skips Step 1 type selector)
- Delete resource → confirmation dialog → soft delete
- Resource type summary bar (count by type)

**Do NOT generate:**
- Wizard or any wizard-related code (sub-tasks F2–F4)
- Training Management List page (sub-task F1)
- Catalog or employee-facing pages (F6, F7)

---

## Pre-Code Declaration (REQUIRED before writing any code)

```
### PRE-CODE DECLARATION — F5 Manage Resources

#### Files Read
| File | Lines Read | Key Fact |
|---|---|---|
| _shared.md | all | useQuery/useMutation; Ant Design DnD or @dnd-kit |
| _module.md | all | resource_type enum; soft delete; assessment config endpoint |
| screens.md | Screen 37 (L2301) | page layout, Add/Edit modal steps confirmed |
| 03_training_management.md | §4 | sequential lock (BR-40); assessment rules (BR-42, BR-47) |
| prototype | admin-training-resources.html | full page layout inspected |

#### Resource Type Modal — Field Checklist (from Screen 37)
| Type | Step 2 Fields |
|---|---|
| VIDEO | title, OneDrive URL + Browse, duration (min), required toggle |
| DOCUMENT | title, OneDrive URL + Browse, document type, required toggle, access mode |
| ASSESSMENT | title, passing score %, max attempts, time limit (min), randomize questions flag, randomize options flag, show correct answers flag, question builder (MCQ/MSQ/T-F) |
| LINK | title, URL, description, required toggle |
| SESSION | title, linked session (dropdown of SCHEDULED sessions) |

#### Page Element Checklist
| Element | In Generated Code? |
|---|---|
| Breadcrumb: Training → [Title] → Resources | Yes |
| Resource list (ordered, drag-drop) | Yes |
| Sequence numbers | Yes |
| Type icon per resource | Yes |
| Title per resource | Yes |
| Required/Optional badge | Yes |
| Duration display | Yes |
| Edit button per row | Yes |
| Delete button per row (with confirm) | Yes |
| Resource type summary bar (counts) | Yes |
| "Add Resource" button | Yes |
| Add/Edit modal — Step 1 (type tiles, 5 types) | Yes |
| Add/Edit modal — Step 2 (varies by type) | Yes |
| Sequential lock toggle per resource | Yes |

I confirm all files read. Beginning F5 code generation.
```

---

## API Calls This Page Makes

```typescript
GET  /api/v1/trainings/{id}/resources            // load resource list (ordered)
POST /api/v1/resources                           // add new resource
PUT  /api/v1/resources/{id}                      // edit resource
DELETE /api/v1/resources/{id}                    // soft delete (with confirmation)
PATCH /api/v1/trainings/{id}/resources/reorder   // save new drag-drop order
GET  /api/v1/resources/{id}/assessment           // load assessment config (for ASSESSMENT type edit)
PUT  /api/v1/resources/{id}/assessment           // save assessment config + questions
GET  /api/v1/sessions?status=SCHEDULED           // for SESSION type dropdown
```

## Drag-and-Drop Implementation Note

- Use `@dnd-kit/core` with `@dnd-kit/sortable` for drag-and-drop reorder
- On drop: update local state immediately (optimistic update)
- On settle: call `PATCH /api/v1/trainings/{id}/resources/reorder` with new sequence list
- On error: revert to original order + show error notification

## Assessment Modal — Question Builder

Same implementation as F3 (Wizard Step 2 assessment modal):
- Import `QuestionBuilder` component from wizard (do not duplicate)
- BR-47: Save button disabled until ≥1 question added
- BR-42: MCQ/T-F = exactly 1 correct; MSQ = ≥1 correct; each question ≥2 options

---

## Stop Point

```
✅ F5 Complete — Manage Resources Page
Components: TrainingResourcesPage, ResourceList (dnd-sortable), AddEditResourceModal (2-step), resource type forms (Video, Document, Assessment, Link, Session)
API calls wired: list, add, edit, delete, reorder, assessment config
Reuses: QuestionBuilder from F3

Reply YES to proceed to F6 (Learning Catalog Page).
```

**STOP. Do not generate F6 until user confirms.**
