# Sub-task F1: Admin Training Management List Page
# Training Management — Frontend Layer 1 of 7

---

## Files to Read BEFORE Writing Code (in this order)

1. `docs/code_generation/modules/_shared.md` — Ant Design v5, useQuery pattern, named exports, status badge colors
2. `docs/code_generation/modules/training_management/_module.md` — lifecycle states, certificate approval flow
3. `docs/requirements/03_ux/02_screens.md` — Screen 22 (lines 1422–1492): Training Management List
4. Prototype file: `prototype/admin-training.html` — open and look at the main table, toolbar, tabs, Cert Approvals tab

---

## Scope

**Generate:**
- `TrainingManagementPage` — full list page with tabs (All, Published, Draft, Mandatory, Archived, Cert Approvals)
- Training table with all columns and row actions
- Cert Approvals tab panel (replaces table when active)
- Bulk actions bar (appears when ≥1 checkbox checked)
- API service module for training endpoints

**Generate modals as EMPTY PLACEHOLDERS only:**
- Create Training wizard → `<CreateTrainingWizard />` — empty div with comment "Generated in F2"
- Assignments viewer modal → `<AssignmentsViewerModal />` — empty div, "Generated in F4"
- Assign Training modal → `<AssignTrainingModal />` — empty div, "Generated in F4"
- Completion Rule modal → `<CompletionRuleModal />` — empty div, "Generated in F4"

**Do NOT generate:**
- Wizard content (sub-task F2, F3, F4)
- Resource management page (sub-task F5)
- Catalog or employee-facing pages (sub-tasks F6, F7)

---

## Pre-Code Declaration (REQUIRED before writing any code)

```
### PRE-CODE DECLARATION — F1 Admin Training List

#### Files Read
| File | Lines Read | Key Fact |
|---|---|---|
| _shared.md | all | Ant Design v5; named exports; useQuery; status badge colors |
| _module.md | all | lifecycle states; Cert Approvals flow |
| screens.md | Screen 22 (L1422) | table columns, tabs, row actions confirmed |
| prototype | admin-training.html | layout, badge colors, tab labels confirmed |

#### UI Element Checklist (from Screen 22 + prototype)
| Element | In Generated Code? |
|---|---|
| Search bar | Yes |
| Filter: training type | Yes |
| Filter: category | Yes |
| Tab: All | Yes |
| Tab: Published | Yes |
| Tab: Draft | Yes |
| Tab: Mandatory | Yes |
| Tab: Archived | Yes |
| Tab: Cert Approvals (red badge) | Yes |
| Table column: training code | Yes |
| Table column: title | Yes |
| Table column: type | Yes |
| Table column: category | Yes |
| Table column: assigned count | Yes |
| Table column: completion progress bar + "Change rule" link | Yes |
| Table column: state badge | Yes |
| Table column: actions | Yes |
| Row action (Published/Draft): Edit | Yes (placeholder wizard) |
| Row action: Manage Resources | Yes (navigate to resources page) |
| Row action: Assignments | Yes (placeholder modal) |
| Row action: Assign | Yes (placeholder modal) |
| Row action: Archive | Yes |
| Row action (Archived): Restore | Yes |
| Bulk actions bar | Yes |
| Create Training button | Yes (placeholder wizard) |
| Export button | Yes |
| Cert Approvals panel: approval table | Yes |
| Cert Approvals: Approve button | Yes |
| Cert Approvals: Reject button (opens reject modal) | Yes |

I confirm all files read. Beginning F1 code generation.
```

---

## API Calls This Page Makes

```typescript
// All endpoints this page needs:
GET  /api/v1/trainings                   // list with filters + pagination
GET  /api/v1/trainings/{id}/assignments  // assignments viewer
POST /api/v1/trainings/{id}/archive      // archive training
POST /api/v1/trainings/{id}/restore      // restore archived
POST /api/v1/trainings/export            // export catalog
PUT  /api/v1/trainings/{id}              // update completion mode only (from Change rule modal)
POST /api/v1/certificates/{id}/approve   // approve certificate
POST /api/v1/certificates/{id}/reject    // reject certificate (requires reason)
```

## TypeScript Types Needed

```typescript
interface TrainingListItem {
  training_id: string;
  training_code: string;
  training_type: 'COURSE' | 'LEARNING_PATH' | 'CURRICULUM';
  title: string;
  category: string;
  difficulty_level: string | null;
  is_mandatory: boolean;
  requires_approval: boolean;
  lifecycle_state: 'DRAFT' | 'PUBLISHED' | 'INACTIVE' | 'ARCHIVED';
  estimated_duration_minutes: number | null;
  current_version_no: number;
  tags: string[];
  // Additional for table display:
  assigned_count?: number;
  completion_progress?: number;   // percent
  completion_mode?: string;
}

interface TrainingListParams {
  page?: number;
  size?: number;
  training_type?: string;
  lifecycle_state?: string;
  category?: string;
  is_mandatory?: boolean;
  q?: string;   // search query
}
```

---

## Component Structure

```
TrainingManagementPage
  ├── TrainingListToolbar (search + filters + Create button + Export)
  ├── Tabs (All | Published | Draft | Mandatory | Archived | Cert Approvals)
  │   ├── [Tab content] TrainingTable (for all tabs except Cert Approvals)
  │   │     ├── columns: code, title, type, category, assigned_count, completion, state badge, actions
  │   │     └── BulkActionsBar (shown when selection > 0)
  │   └── [Cert Approvals Tab] CertApprovalsPanel
  │         ├── info banner
  │         └── approvals table with Approve / Reject actions
  └── Modals (all empty placeholders)
        ├── <CreateTrainingWizard /> {/* F2–F4 */}
        ├── <AssignmentsViewerModal /> {/* F4 */}
        ├── <AssignTrainingModal /> {/* F4 */}
        └── <CompletionRuleModal /> {/* F4 */}
```

---

## Lifecycle State Badge Colors (match prototype)

| State | Ant Design Tag color |
|---|---|
| DRAFT | `default` |
| PUBLISHED | `success` |
| INACTIVE | `error` |
| ARCHIVED | `warning` |

---

## Cert Approvals Tab

When "Cert Approvals" tab is active:
- Training table is HIDDEN
- Info banner: "Employees earn a certificate on completion, but can only download after admin approval."
- Approval table columns: Employee, Training, Completed Date, Score, Cert ID, Actions
- Actions: Approve button (green), Reject button (opens inline reason modal)
- Reject modal: rejection_reason text field (required); Confirm or Cancel buttons
- On approve/reject → invalidate `['certificates', 'pending']` query

---

## Stop Point

```
✅ F1 Complete — Admin Training List
Components generated: TrainingManagementPage, TrainingListToolbar, TrainingTable, BulkActionsBar, CertApprovalsPanel
API service: trainingApi (list, archive, restore, export, updateCompletionMode)
Modals: all 4 as empty placeholders

Reply YES to proceed to F2 (Training Creation Wizard — Step 1).
```

**STOP. Do not generate F2 until user confirms.**
