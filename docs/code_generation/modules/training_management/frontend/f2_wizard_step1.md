# Sub-task F2: Training Creation Wizard Shell + Step 1 (Basic Info)
# Training Management — Frontend Layer 2 of 7

---

## Files to Read BEFORE Writing Code (in this order)

1. `docs/code_generation/modules/_shared.md` — form pattern (React Hook Form + Zod), useMutation, Ant Design v5 Steps
2. `docs/code_generation/modules/training_management/_module.md` — training_type values, lifecycle_state = DRAFT on create
3. `docs/requirements/03_ux/02_screens.md` — Screen 23 (lines 1494–1552): Training Editor
4. `docs/requirements/03_ux/01_ux_flows.md` — Flow 21 (lines 1268–1327): Training Creation Wizard
5. Prototype file: `prototype/admin-training.html` — locate the training wizard modal; look at Step 1 tab only

---

## Scope

**Generate:**
- 4-step wizard SHELL using Ant Design `Steps` component
- Step 1 form content (Basic Info) — all fields, validation
- Steps 2, 3, 4 content = empty `<div>` placeholders with comment "Generated in F3" / "F4"
- Training code display (auto-generated, read-only)
- Category management: category dropdown with inline "+ Add new category" option

**Do NOT generate:**
- Step 2 content (sub-task F3 — resources)
- Step 3 content (sub-task F4 — settings)
- Step 4 content (sub-task F4 — review & publish)
- Any modal that is not part of Step 1

---

## Pre-Code Declaration (REQUIRED before writing any code)

```
### PRE-CODE DECLARATION — F2 Wizard Step 1

#### Files Read
| File | Lines Read | Key Fact |
|---|---|---|
| _shared.md | all | Zod schema; useForm; useMutation; Ant Design Steps |
| _module.md | all | training_type: COURSE/LEARNING_PATH/CURRICULUM |
| screens.md | Screen 23 (L1494) | Step 1 fields: title, code (read-only), type, category, desc, difficulty, duration, tags |
| ux_flows.md | Flow 21 (L1268) | Code auto-generated; type selection locks later wizard |
| prototype | admin-training.html | wizard layout, field labels, step labels confirmed |

#### Step 1 Field Checklist (from Screen 23)
| Field Label | Input Type | Maps to API Field | Required | Notes |
|---|---|---|---|---|
| Title | text input | title | Yes | max 255 chars |
| Training Code | text (read-only) | training_code | — | auto-generated; shown after create |
| Training Type | Select | training_type | Yes | COURSE / LEARNING PATH / CURRICULUM; changes Step 2 structure |
| Category | Select + inline add | category | Yes | Dropdown of existing; "+ Add new" option creates inline |
| Description | TextArea | description | No | |
| Difficulty Level | Select | difficulty_level | No | BEGINNER / INTERMEDIATE / ADVANCED |
| Estimated Duration (min) | Number input | estimated_duration_minutes | No | |
| Tags | Tag input (multi-select) | tags | No | Ant Design Select with mode="tags" |

I confirm all files read. Beginning F2 code generation.
```

---

## Wizard Architecture

```typescript
// The wizard is a full-page overlay (Ant Design Modal fullscreen or Drawer)
// opened from TrainingManagementPage when "Create Training" or "Edit" is clicked

interface TrainingWizardProps {
  trainingId?: string;    // undefined = create mode; UUID = edit mode
  onClose: () => void;
  onSaved: () => void;   // invalidates training list query
}

export function TrainingWizard({ trainingId, onClose, onSaved }: TrainingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const steps = ['Basic Info', 'Resources', 'Settings', 'Review & Publish'];

  return (
    <Modal open fullscreen>
      <Steps current={currentStep} items={steps.map(s => ({ title: s }))} />
      {currentStep === 0 && <WizardStep1 />}
      {currentStep === 1 && <div>{/* F3: Resources */}</div>}
      {currentStep === 2 && <div>{/* F4: Settings */}</div>}
      {currentStep === 3 && <div>{/* F4: Review & Publish */}</div>}
    </Modal>
  );
}
```

## Step 1 Form Schema (Zod)

```typescript
const step1Schema = z.object({
  training_type: z.enum(['COURSE', 'LEARNING_PATH', 'CURRICULUM']),
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  difficulty_level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
  estimated_duration_minutes: z.number().int().positive().optional().nullable(),
  tags: z.array(z.string()).default([]),
});
```

## Step 1 API Calls

```typescript
// On "Next: Resources" button click (first save):
POST /api/v1/trainings   // creates training in DRAFT state; receives training_id + training_code

// In edit mode (trainingId provided):
GET /api/v1/trainings/{trainingId}  // pre-populate form
PUT /api/v1/trainings/{trainingId}  // save Step 1 changes
```

## Category Management

- Category is a free-form string stored in `training_items.category`
- Fetch distinct categories from `GET /api/v1/trainings?fields=category` or a dedicated categories endpoint
- If no categories endpoint, use local state + allow typing a new category
- "+ Add new category" inline: shows a text input inline in the dropdown; on confirm, adds to the dropdown list and auto-selects
- New category is just a string — no separate category table in Phase 1

---

## Stop Point

```
✅ F2 Complete — Wizard Shell + Step 1 (Basic Info)
Components: TrainingWizard (shell with Steps), WizardStep1 (full form)
Steps 2–4: empty placeholders
API calls wired: POST /trainings (create), GET /trainings/{id} + PUT /trainings/{id} (edit)
Zod schema covers all 7 Step 1 fields

Reply YES to proceed to F3 (Wizard Step 2 — Resources).
```

**STOP. Do not generate F3 until user confirms.**
