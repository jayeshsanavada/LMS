# Sub-task B2: Pydantic Request/Response Schemas
# Training Management — Backend Layer 2 of 5

---

## Files to Read BEFORE Writing Code (in this order)

1. `docs/code_generation/modules/_shared.md` — Pydantic schema pattern, ConfigDict rule, UUID vs str for IDs
2. `docs/code_generation/modules/training_management/_module.md` — lifecycle states, certificate states
3. `docs/requirements/05_engineering/features/03_training_management/api.md` — FULL FILE (all endpoints, request/response shapes)

---

## Scope

**Generate:**
- All Pydantic request schemas (one per endpoint that accepts a body)
- All Pydantic response schemas (one per endpoint that returns data)
- All shared/nested schemas (e.g. ResourceItem, PrerequisiteItem, VersionItem)

**Do NOT generate:**
- SQLAlchemy models (sub-task B1)
- Repository classes (sub-task B3)
- Service layer (sub-task B4)
- Router (sub-task B5)

---

## Pre-Code Declaration (REQUIRED before writing any code)

```
### PRE-CODE DECLARATION — B2 Pydantic Schemas

#### Files Read
| File | Lines Read | Key Fact |
|---|---|---|
| _shared.md | all | ConfigDict(from_attributes=True) required on all response schemas |
| _module.md | all | lifecycle states, certificate states confirmed |
| api.md | all | [N] endpoints catalogued |

#### Endpoint ↔ Schema Checklist
| Endpoint | Request Schema | Response Schema |
|---|---|---|
| GET /trainings | TrainingListParams (query) | PaginatedResponse[TrainingListItem] |
| GET /trainings/{id} | — | TrainingDetailResponse |
| POST /trainings | CreateTrainingRequest | CreateTrainingResponse |
| PUT /trainings/{id} | UpdateTrainingRequest | UpdateTrainingResponse |
| POST /trainings/{id}/publish | — | PublishTrainingResponse |
| POST /trainings/{id}/inactivate | InactivateTrainingRequest | InactivateTrainingResponse |
| POST /trainings/{id}/archive | — | ArchiveTrainingResponse |
| POST /trainings/{id}/restore | — | RestoreTrainingResponse |
| POST /trainings/{id}/clone | CloneTrainingRequest | CloneTrainingResponse |
| GET /trainings/{id}/versions | — | VersionListResponse |
| GET /trainings/{id}/structure | — | TrainingStructureResponse |
| PUT /trainings/{id}/structure | UpdateStructureRequest | UpdateStructureResponse |
| GET /trainings/{id}/resources | — | ResourceListResponse |
| GET /trainings/{id}/assignments | AssignmentListParams (query) | PaginatedResponse[AssignmentViewItem] |
| POST /trainings/export | ExportTrainingRequest | ExportJobResponse |
| GET /resources/{id} | — | ResourceDetailResponse |
| POST /resources | CreateResourceRequest | CreateResourceResponse |
| PUT /resources/{id} | UpdateResourceRequest | UpdateResourceResponse |
| PATCH /trainings/{id}/resources/reorder | ReorderResourcesRequest | — |
| GET /resources/{id}/assessment | — | AssessmentConfigResponse |
| PUT /resources/{id}/assessment | UpdateAssessmentRequest | AssessmentConfigResponse |
| POST /resources/{id}/assessment/attempts | SubmitAttemptRequest | AttemptResultResponse |
| GET /resources/{id}/assessment/attempts | — | AttemptHistoryResponse |
| POST /resources/{id}/assessment/attempts/reset | ResetAttemptsRequest | ResetAttemptsResponse |
| POST /resources/{id}/progress | TrackProgressRequest | ProgressResponse |
| GET /certificates/me | — | PaginatedResponse[CertificateItem] |
| GET /certificates/{id} | — | CertificateDetailResponse |
| POST /certificates/{id}/approve | — | CertificateActionResponse |
| POST /certificates/{id}/reject | RejectCertificateRequest | CertificateActionResponse |

I confirm all files read. Beginning B2 code generation.
```

---

## Pre-Extracted Request/Response Field Reference

### CreateTrainingRequest fields (from api.md §2.3)
```python
training_type: Literal["COURSE", "LEARNING_PATH", "CURRICULUM"]  # required
title: str  # required, max 255
description: str | None = None
category: str  # required
difficulty_level: Literal["BEGINNER", "INTERMEDIATE", "ADVANCED"] | None = None
is_mandatory: bool = False
requires_approval: bool = False
issue_certificate: bool = False
estimated_duration_minutes: int | None = None
validity_period_days: int | None = None  # positive int or null
completion_mode: Literal["ALL_RESOURCES", "ADMIN_OVERRIDE", "MIXED"] = "ALL_RESOURCES"
tags: list[str] = []
prerequisite_training_ids: list[UUID] = []
```

### CreateTrainingResponse fields (from api.md §2.3)
```python
training_id: UUID
training_code: str
lifecycle_state: str  # "DRAFT"
current_version_no: int  # 0
created_at: datetime
```

### TrainingListItem fields (from api.md §2.1 response)
```python
training_id: UUID
training_code: str
training_type: str
title: str
category: str
difficulty_level: str | None
is_mandatory: bool
requires_approval: bool
lifecycle_state: str
estimated_duration_minutes: int | None
current_version_no: int
tags: list[str]
```

### TrainingDetailResponse fields (from api.md §2.2 response — note nested objects)
```python
training_id: UUID
training_code: str
training_type: str
title: str
description: str | None
category: str
difficulty_level: str | None
is_mandatory: bool
requires_approval: bool
issue_certificate: bool
lifecycle_state: str
estimated_duration_minutes: int | None
validity_period_days: int | None
current_version_no: int
completion_mode: str
tags: list[str]
prerequisites: list[PrerequisiteItem]   # nested
resources: list[ResourceSummaryItem]    # nested
created_at: datetime
updated_at: datetime
```

### CreateResourceRequest fields (from api.md §3.2)
```python
training_item_id: UUID
resource_type: Literal["VIDEO", "PDF", "DOCUMENT", "LINK", "SESSION", "ASSESSMENT"]
resource_title: str
resource_description: str | None = None
external_file_id: str | None = None   # required for VIDEO, PDF, DOCUMENT
external_link: str | None = None      # required for LINK
session_id: UUID | None = None        # required for SESSION
sequence_no: int
is_required: bool = True
is_sequential_locked: bool = False
estimated_duration_minutes: int | None = None
```

### UpdateAssessmentRequest fields (from api.md §3.6A)
```python
passing_score_percent: float  # 1–100
max_attempts: int             # 0=unlimited
time_limit_minutes: int       # 0=no limit
randomize_questions: bool
randomize_options: bool
show_correct_answers_on_pass: bool
questions: list[QuestionItem]
```

### QuestionItem (nested in assessment)
```python
question_id: UUID | None = None   # None for new, UUID to update existing
question_text: str
question_type: Literal["MCQ", "MSQ", "TRUE_FALSE"]
points: int = 1
sequence_no: int
options: list[OptionItem]
```

### OptionItem (nested in question)
```python
option_id: UUID | None = None
option_text: str
is_correct: bool
```

### SubmitAttemptRequest fields (from api.md §3.6B)
```python
assignment_id: UUID
time_taken_seconds: int
responses: list[AttemptResponseItem]
```

### AttemptResponseItem
```python
question_id: UUID
selected_option_ids: list[UUID]
```

### RejectCertificateRequest
```python
rejection_reason: str  # required, non-empty (BR-45)
```

---

## Schema Rules

1. All response schemas: `model_config = ConfigDict(from_attributes=True)` — **always**, no exceptions
2. All ID fields in schemas: `UUID` type (not `str`)
3. Enum fields: use `Literal["A", "B"]` or `Enum` class — never raw `str` for fixed values
4. Optional fields: use `field: Type | None = None` (Python 3.10+ union syntax)
5. Email fields: use `EmailStr` from `pydantic`
6. Request schemas: only fields the caller can set — never expose `created_by`, `training_code` (auto-generated), `current_version_no`
7. Response schemas: never expose internal flags unless needed by UI (exclude `has_unpublished_changes` from list responses; include in detail)
8. List endpoints: return `PaginatedResponse[T]` shape: `{ items, page, size, total, has_next }`

---

## Stop Point

After generating all request + response schemas:

```
✅ B2 Complete — Pydantic Schemas
Request schemas generated: [N]
Response schemas generated: [N]
Shared/nested schemas: [list]

Reply YES to proceed to B3 (Repository Layer).
```

**STOP. Do not generate B3 until user confirms.**
