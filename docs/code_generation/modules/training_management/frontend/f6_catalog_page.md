# Sub-task F6: Learning Catalog Page
# Training Management — Frontend Layer 6 of 7

---

## Files to Read BEFORE Writing Code (in this order)

1. `docs/code_generation/modules/_shared.md` — useQuery, Ant Design v5, named exports, role check from JWT
2. `docs/code_generation/modules/training_management/_module.md` — catalog visibility rules (BR-22, BR-23, BR-24), requires_approval flow
3. `docs/requirements/03_ux/02_screens.md` — Screen 8 (lines 466–514): Learning Catalog
4. `docs/requirements/03_ux/01_ux_flows.md` — Flow 4 (Self-Enrollment & Course Request Flow, line 308); Flow 13 (Search & Catalog Browse Flow, line 828)
5. Prototype file: `prototype/catalog.html` — full page layout, training cards, Enroll modal, Approval Request modal

---

## Scope

**Generate:**
- `CatalogPage` — full employee-facing catalog page
- Search bar with typeahead suggestions
- Filter panel: Category, Training Type, Difficulty, Tags, Mandatory toggle
- Training cards grid: title, type, category, difficulty, mandatory badge, assignment_status badge
- Self-Enroll button (for `requires_approval = false` trainings)
- Request Approval button (for `requires_approval = true` trainings)
- Enroll modal (confirm enrollment)
- Approval Request modal (with note field)

**Do NOT generate:**
- Training Detail page (sub-task F7)
- Resource Player (sub-task F7)
- Any admin-only controls (admin sees this page too but with admin badge on draft items)
- My Certificates page (sub-task F7)

---

## Pre-Code Declaration (REQUIRED before writing any code)

```
### PRE-CODE DECLARATION — F6 Catalog Page

#### Files Read
| File | Lines Read | Key Fact |
|---|---|---|
| _shared.md | all | role from JWT; useQuery with staleTime; Ant Design Card, Input.Search |
| _module.md | all | BR-22 (all published visible); BR-23 (requires_approval shows Request button); BR-24 (Draft/Inactive = admin only) |
| screens.md | Screen 8 (L466) | filter panel fields, card elements, action buttons confirmed |
| ux_flows.md | Flow 4 (L308), Flow 13 (L828) | self-enroll flow, search behavior confirmed |
| prototype | catalog.html | card layout, modal design, filter panel confirmed |

#### UI Element Checklist
| Element | In Generated Code? |
|---|---|
| Search bar (typeahead, min 2 chars) | Yes |
| Filter: Category | Yes |
| Filter: Training Type | Yes |
| Filter: Difficulty | Yes |
| Filter: Tags | Yes |
| Filter: Mandatory toggle | Yes |
| Sort: Mandatory First (default) | Yes |
| Training card: title | Yes |
| Training card: type badge | Yes |
| Training card: category | Yes |
| Training card: difficulty | Yes |
| Training card: mandatory badge | Yes |
| Training card: assignment_status badge (if enrolled) | Yes |
| Self-Enroll button (requires_approval = false, not enrolled) | Yes |
| Request Approval button (requires_approval = true, not enrolled) | Yes |
| Already enrolled: show assignment_status badge instead of action | Yes |
| Enroll modal (confirm) | Yes |
| Approval Request modal (optional note) | Yes |

I confirm all files read. Beginning F6 code generation.
```

---

## API Calls This Page Makes

```typescript
// Browse without keyword:
GET /api/v1/search/catalog?category=&type=&difficulty=&is_mandatory=&page=1&size=20

// Keyword search with filters:
GET /api/v1/search/training?q=safety&category=Compliance&page=1

// Typeahead (min 2 chars):
GET /api/v1/search/suggestions?q=sa&limit=10

// Self-enroll:
POST /api/v1/assignments/self-enroll
  Body: { training_id: "uuid" }

// Request approval (requires_approval = true):
POST /api/v1/approvals/requests
  Body: { training_id: "uuid", note: "optional note" }
```

## Training Card Logic

```typescript
interface CatalogTrainingCard {
  training_id: string;
  title: string;
  training_type: 'COURSE' | 'LEARNING_PATH' | 'CURRICULUM';
  category: string;
  difficulty_level: string | null;
  is_mandatory: boolean;
  requires_approval: boolean;
  lifecycle_state: string;  // admin sees DRAFT/PUBLISHED/INACTIVE; employee sees only PUBLISHED
  assignment_status: string | null;  // null if not enrolled
  estimated_duration_minutes: number | null;
  tags: string[];
}

// Action button logic:
if (assignment_status) → show assignment_status badge (no action buttons)
else if (requires_approval) → show "Request Approval" button
else → show "Self-Enroll" button

// Role-based visibility:
// EMPLOYEE/MANAGER/HR: only PUBLISHED training
// ADMIN: all lifecycle states (with lifecycle_state badge)
```

## Enrollment Flow

```typescript
// Self-enroll:
const enrollMutation = useMutation({
  mutationFn: (training_id: string) =>
    client.post('/api/v1/assignments/self-enroll', { training_id }).then(r => r.data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['catalog'] });
    message.success('Enrolled successfully');
    closeModal();
  },
  onError: (e) => {
    // Handle: ALREADY_ENROLLED, TRAINING_NOT_FOUND, PREREQUISITE_NOT_MET
    message.error('Enrollment failed: ' + e.message);
  },
});
```

---

## Stop Point

```
✅ F6 Complete — Learning Catalog Page
Components: CatalogPage, TrainingCard, CatalogFilterPanel, EnrollModal, ApprovalRequestModal
API calls: search/catalog, search/training, search/suggestions, assignments/self-enroll, approvals/requests
Role-based visibility implemented

Reply YES to proceed to F7 (Training Detail + My Certificates).
```

**STOP. Do not generate F7 until user confirms.**
