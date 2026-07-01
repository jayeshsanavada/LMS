# Sub-task F4: Wizard Steps 3 & 4 + Admin Action Modals
# Training Management — Frontend Layer 4 of 7

---

## Files to Read BEFORE Writing Code (in this order)

1. `docs/code_generation/modules/_shared.md` — useMutation, React Hook Form + Zod, Ant Design v5, named exports
2. `docs/code_generation/modules/training_management/_module.md` — is_probation_gateway, lifecycle states, certificate approval flow
3. `docs/requirements/03_ux/02_screens.md` — Screen 22 (L1422): Assign modal, Completion rule modal, Assignments viewer, Reject modal; Screen 23 (L1494): Steps 3 & 4
4. `docs/requirements/03_ux/01_ux_flows.md` — Flow 21 (lines 1268–1327): Step 3 conditional sections
5. `docs/requirements/02_features/03_training_management.md` — §4 Probation Gateway Flag, §3 Settings
6. Prototype file: `prototype/admin-training.html` — Step 3 form, Step 4 review panel, Assign modal, Assignments viewer modal, Completion rule modal, Cert Reject modal

---

## Scope

**Generate (4 sub-sections, in order):**

### Section A — Wizard Step 3: Settings
- Mandatory toggle (when ON: assignment rule section expands)
- Assignment rule section: Assign To dropdown (All Employees / Specific Department / Designation / Capability / Project / New Joiners (Probation))
- Conditional panels per Assign To selection:
  - "Specific Department": checkbox list of departments
  - "Specific Users": searchable user tag-input
  - "New Joiners (Probation)": designation filter, capability filter, "Required for probation" toggle (auto-checked), due days pre-fills to 90
- `is_probation_gateway` toggle (shown only when `is_mandatory = true`)
- Completion Mode dropdown: ALL_RESOURCES / ADMIN_OVERRIDE / MIXED
- Prerequisites multi-select (search published trainings)
- Requires Manager Approval toggle
- Issue Certificate on Completion toggle (when ON: info text "Employee can download after admin approves")
- Validity Period Days field (blank = permanent)

### Section B — Wizard Step 4: Review & Publish
- Read-only summary of Step 1 (basic info fields)
- Read-only summary of Step 2 (resource count by type)
- Read-only summary of Step 3 (settings)
- Two action buttons: "Save as Draft" and "Publish"
- Publish validation: show error if no resources attached (BR: NO_RESOURCES_ATTACHED)

### Section C — Assignments Viewer Modal (from F1 placeholder)
- Read-only table for `GET /api/v1/trainings/{id}/assignments`
- Columns: Employee Name, Department, Status badge, Progress %, Due Date
- Search bar (filters client-side or sends to API)
- Status filter dropdown

### Section D — Admin Action Modals (from F1 placeholders)
- **Assign Training Modal**: scope radio (All / Specific Department / Specific Users); conditional panels; due date picker (required); note field
- **Completion Rule Modal**: dropdown (All Resources / Minimum Resources % / Admin Override); Save button
- **Cert Reject Modal**: rejection_reason text field (required); Confirm / Cancel

---

## Pre-Code Declaration (REQUIRED before writing any code)

```
### PRE-CODE DECLARATION — F4 Wizard Steps 3-4 + Modals

#### Files Read
| File | Lines Read | Key Fact |
|---|---|---|
| _shared.md | all | form patterns; useMutation invalidation |
| _module.md | all | is_probation_gateway only shown when is_mandatory=true; cert approval flow |
| screens.md | Screen 22 (L1422), Screen 23 (L1494) | all modal fields confirmed |
| ux_flows.md | Flow 21 (L1293) | Step 3 conditional logic confirmed |
| 03_training_management.md | §4 | probation gateway rules confirmed |
| prototype | admin-training.html | Step 3 fields, Step 4 layout, all modals inspected |

#### Step 3 Field Checklist
| Field | Type | Condition |
|---|---|---|
| is_mandatory toggle | Switch | Always shown |
| Assignment Rule section | Expandable section | Only when is_mandatory = true |
| Assign To dropdown | Select | Inside assignment rule |
| Department checkboxes | Multi-checkbox | When Assign To = Specific Department |
| User tag-input | Multi-select search | When Assign To = Specific Users |
| Probation filters | Designation + Capability | When Assign To = New Joiners |
| is_probation_gateway toggle | Switch | When is_mandatory = true |
| Due days | Number | Inside assignment rule |
| completion_mode | Select | Always shown |
| prerequisites | Multi-select | Always shown |
| requires_approval | Switch | Always shown |
| issue_certificate | Switch | Always shown |
| validity_period_days | Number | Always shown; blank = permanent |

I confirm all files read. Beginning F4 code generation.
```

---

## Step 3 Schema (Zod)

```typescript
const step3Schema = z.object({
  is_mandatory: z.boolean().default(false),
  assignment_rule: z.object({
    scope: z.enum(['ALL', 'DEPARTMENT', 'DESIGNATION', 'CAPABILITY', 'PROJECT', 'EMPLOYMENT_PHASE']).optional(),
    department_ids: z.array(z.string()).optional(),
    user_ids: z.array(z.string()).optional(),
    designation: z.string().optional(),
    capability: z.string().optional(),
    due_date_days: z.number().int().positive().optional(),
  }).optional(),
  is_probation_gateway: z.boolean().default(false),
  completion_mode: z.enum(['ALL_RESOURCES', 'ADMIN_OVERRIDE', 'MIXED']),
  prerequisite_training_ids: z.array(z.string()).default([]),
  requires_approval: z.boolean().default(false),
  issue_certificate: z.boolean().default(false),
  validity_period_days: z.number().int().positive().optional().nullable(),
});
```

## Step 4 API Calls

```typescript
// Save as Draft:
PUT /api/v1/trainings/{id}   // save all wizard state (Steps 1+3 fields)

// Publish:
POST /api/v1/trainings/{id}/publish   // publishes current draft
// Error handling: NO_RESOURCES_ATTACHED → show error message in Step 4
```

## Assign Training Modal API Calls

```typescript
// The assignment creation is handled by Assignment Engine module:
POST /api/v1/assignments   // body: { training_id, scope, department_ids?, user_ids?, due_date }
// This is a cross-module call — do not import from training service
```

---

## Stop Point

```
✅ F4 Complete — Wizard Steps 3 & 4 + Admin Modals
Step 3: all settings fields + conditional sections + probation gateway
Step 4: read-only review + Save Draft / Publish actions
Modals: AssignmentsViewerModal, AssignTrainingModal, CompletionRuleModal, CertRejectModal (replaces F1 placeholders)

Reply YES to proceed to F5 (Manage Resources Page).
```

**STOP. Do not generate F5 until user confirms.**
