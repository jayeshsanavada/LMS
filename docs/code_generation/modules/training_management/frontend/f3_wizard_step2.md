# Sub-task F3: Training Creation Wizard — Step 2 (Resources / Structure)
# Training Management — Frontend Layer 3 of 7

---

## Files to Read BEFORE Writing Code (in this order)

1. `docs/code_generation/modules/_shared.md` — useMutation, Ant Design v5 (Modal, Upload, Form), named exports
2. `docs/code_generation/modules/training_management/_module.md` — resource types, OneDrive pattern, assessment rules (BR-36, BR-42, BR-47)
3. `docs/requirements/03_ux/02_screens.md` — Screen 23 (lines 1494–1552): Step 2 details
4. `docs/requirements/02_features/03_training_management.md` — §4 Resource Management, Assessment Resource (BR-36–BR-42, BR-47)
5. Prototype file: `prototype/admin-training.html` — locate Step 2 tab; look at resource list, Add Resource buttons, resource modals for each type, Assessment modal question builder

---

## Scope

**Generate:**
- Step 2 content — varies by `training_type`:
  - `COURSE`: ordered resource list + "Add Resource" buttons (Video, Document, Assessment, Link, Session)
  - `LEARNING_PATH`: course list with drag-reorder, Required/Optional per course
  - `CURRICULUM`: learning path list with drag-reorder, expandable to courses
- Each resource type's popup modal (opened by Add Resource button):
  - Video modal: title, OneDrive URL, Browse button, duration, Required toggle
  - Document modal: title, OneDrive URL, Browse button, document type, Required toggle
  - Assessment modal: settings (title, passing score %, max attempts, time limit, randomisation flags) + inline question builder
  - Link modal: title, URL, description, Required toggle
  - Session modal: title, linked session dropdown (SCHEDULED sessions only)
- Drag-and-drop reorder for resources (use `react-dnd` or `@dnd-kit/core`)

**Do NOT generate:**
- Wizard shell or Steps component (sub-task F2)
- Step 1, 3, 4 content (F2 and F4)
- Manage Resources page (sub-task F5 — separate admin page)

---

## Pre-Code Declaration (REQUIRED before writing any code)

```
### PRE-CODE DECLARATION — F3 Wizard Step 2

#### Files Read
| File | Lines Read | Key Fact |
|---|---|---|
| _shared.md | all | useMutation; Ant Design Modal, Upload |
| _module.md | all | resource_type enum; OneDrive metadata only; assessment rules |
| screens.md | Screen 23 (L1507) | Step 2 per-type description confirmed |
| 03_training_management.md | §4 (Assessment) | BR-36,42,47 confirmed |
| prototype | admin-training.html | all resource type modals inspected |

#### Resource Modal Checklist
| Modal | Fields | Assessment Question Builder |
|---|---|---|
| Video | title, OneDrive URL, Browse, duration, required toggle | N/A |
| Document | title, OneDrive URL, Browse, doc type, required toggle, access mode | N/A |
| Assessment | title, passing_score %, max_attempts, time_limit, randomize_questions, randomize_options, show_correct_on_pass, question builder | Yes — MCQ/MSQ/T-F; ≥1 question required (BR-47) |
| Link | title, URL, description, required toggle | N/A |
| Session | title, session dropdown (SCHEDULED only) | N/A |

#### COURSE Step 2 Elements
| Element | Rendered |
|---|---|
| Resource list (ordered, drag-drop) | Yes |
| Add Video button | Yes |
| Add Document button | Yes |
| Add Assessment button | Yes |
| Add Link button | Yes |
| Add Session button | Yes |
| Required / Optional badge per resource | Yes |
| Resource sequence number | Yes |
| Remove resource (soft delete) | Yes |

I confirm all files read. Beginning F3 code generation.
```

---

## Assessment Question Builder (Critical — BR-47, BR-42)

The Assessment modal must include an inline question builder:

```typescript
// Inside AssessmentModal
interface QuestionBuilderProps {
  questions: Question[];
  onChange: (questions: Question[]) => void;
}

interface Question {
  question_id?: string;
  question_text: string;
  question_type: 'MCQ' | 'MSQ' | 'TRUE_FALSE';
  points: number;
  sequence_no: number;
  options: Option[];
}

interface Option {
  option_id?: string;
  option_text: string;
  is_correct: boolean;
}

// BR-47: "Save" button disabled until questions.length >= 1
// BR-42 validation:
// - Each question: >= 2 options
// - MCQ: exactly 1 is_correct = true
// - TRUE_FALSE: exactly 1 is_correct = true (2 options: True / False)
// - MSQ: >= 1 is_correct = true
```

## API Calls for Step 2

```typescript
// When user clicks Save in a resource modal:
POST /api/v1/resources   // creates resource with training_item_id from wizard context

// For Assessment type — two-step:
POST /api/v1/resources   // creates assessment resource shell
PUT /api/v1/resources/{id}/assessment   // sets config + questions

// When user removes a resource:
DELETE /api/v1/resources/{id}   // soft delete; resource disappears from list

// When user drags to reorder:
PATCH /api/v1/trainings/{training_id}/resources/reorder   // sends new sequence_no list

// For LEARNING_PATH — structure update:
PUT /api/v1/trainings/{training_id}/structure   // saves child course order + required flags

// Session dropdown (SESSION type):
GET /api/v1/sessions?status=SCHEDULED   // load scheduled sessions for dropdown
```

## OneDrive URL Handling

- Admin pastes an OneDrive URL or clicks "Browse OneDrive" (Graph API picker — Phase 1 = URL input fallback)
- LMS stores: `external_file_id` (extracted from OneDrive URL or API response), `reference_url`, `file_name`
- The backend extracts file metadata via Graph API after receiving the URL — frontend sends raw URL
- Phase 1: if Graph API picker not implemented, use URL text input with format validation

---

## Stop Point

```
✅ F3 Complete — Wizard Step 2 (Resources / Structure)
COURSE path: resource list + 5 resource type modals (Video, Document, Assessment, Link, Session)
Assessment modal: full question builder with BR-47 + BR-42 validation
LEARNING_PATH path: course drag-drop list with required flags
CURRICULUM path: LP drag-drop list with expandable course view
API calls wired: POST /resources, DELETE /resources/{id}, PATCH /reorder, PUT /structure

Reply YES to proceed to F4 (Wizard Steps 3 & 4 + Admin Modals).
```

**STOP. Do not generate F4 until user confirms.**
