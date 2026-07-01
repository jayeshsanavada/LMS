# Sub-task B3: Repository Layer
# Training Management — Backend Layer 3 of 5

---

## Files to Read BEFORE Writing Code (in this order)

1. `docs/code_generation/modules/_shared.md` — repository pattern (flush not commit, no business logic)
2. `docs/code_generation/modules/training_management/_module.md` — tables owned, soft-delete rules, lifecycle states
3. `docs/requirements/05_engineering/features/03_training_management/schema.md` — full file (for query filter columns)
4. `docs/requirements/05_engineering/features/03_training_management/api.md` — §2.1 (list filters), §3 (resource queries), §4 (certificate queries)

---

## Scope

**Generate:**
- Repository classes for all tables that need querying (not junction/lookup tables — those are handled via relationship loading)
- Primary repositories: `TrainingRepository`, `ResourceRepository`, `AssessmentRepository`, `CertificateRepository`, `ResourceProgressRepository`

**Do NOT generate:**
- SQLAlchemy models (sub-task B1)
- Pydantic schemas (sub-task B2)
- Service layer logic (sub-task B4)
- Router (sub-task B5)

---

## Pre-Code Declaration (REQUIRED before writing any code)

```
### PRE-CODE DECLARATION — B3 Repository Layer

#### Files Read
| File | Lines Read | Key Fact |
|---|---|---|
| _shared.md | all | flush() not commit; no business logic in repos |
| _module.md | all | soft-delete: is_active=false; no hard deletes |
| schema.md | all | filter columns identified per table |
| api.md | relevant | list query params: [N filters for /trainings] |

#### Repository Method Checklist
| Repository | Methods Needed |
|---|---|
| TrainingRepository | list_paginated, get_by_id, get_by_code, create, update, soft_delete (is_active), count_active_assignments |
| ResourceRepository | get_by_training_id, get_by_id, create, update, soft_delete, reorder |
| AssessmentRepository | get_by_resource_id, upsert_config, get_attempts_by_user, create_attempt, count_attempts |
| CertificateRepository | get_by_user, get_by_id, get_pending_approvals, create, update_status |
| ResourceProgressRepository | get_by_user_resource_assignment, upsert_progress |

I confirm all files read. Beginning B3 code generation.
```

---

## Repository Method Specifications

### TrainingRepository

```python
async def list_paginated(
    self,
    page: int = 1,
    size: int = 20,
    training_type: str | None = None,
    lifecycle_state: str | None = None,
    category: str | None = None,
    is_mandatory: bool | None = None,
    search_query: str | None = None,
) -> tuple[list[TrainingItem], int]:
    # Returns (items, total_count)
    # search_query → full-text search on title using PostgreSQL tsvector
    # All filters are AND conditions
    # Default sort: created_at DESC

async def get_by_id(self, training_id: UUID) -> TrainingItem | None:
    # Filter: id = training_id (no is_active check — admin sees all states)

async def get_by_id_published(self, training_id: UUID) -> TrainingItem | None:
    # Filter: id = training_id AND lifecycle_state = 'PUBLISHED'
    # Used for employee access checks

async def create(self, data: dict) -> TrainingItem:
    # Insert with flush() — service commits

async def update(self, training: TrainingItem, data: dict) -> TrainingItem:
    # Update fields from data dict; flush()

async def get_active_assignment_count(self, training_id: UUID) -> int:
    # Count assignments WHERE training_id = ? AND status NOT IN ('COMPLETED', 'CANCELLED')
    # Cross-module read — OK; no write
```

### ResourceRepository

```python
async def get_by_training_id(self, training_id: UUID) -> list[TrainingResource]:
    # Filter: training_item_id = training_id AND is_active = True
    # Order: sequence_no ASC

async def get_by_id(self, resource_id: UUID) -> TrainingResource | None:
    # Filter: id = resource_id (regardless of is_active for admin access)

async def create(self, data: dict) -> TrainingResource:

async def update(self, resource: TrainingResource, data: dict) -> TrainingResource:

async def soft_delete(self, resource: TrainingResource) -> None:
    # Set is_active = False; flush()
    # NEVER: session.delete(resource)

async def reorder(self, resource_order: list[dict]) -> None:
    # resource_order = [{"resource_id": uuid, "sequence_no": int}]
    # Update each resource's sequence_no; flush()
```

### AssessmentRepository

```python
async def get_config_by_resource(self, resource_id: UUID) -> ResourceAssessment | None:

async def upsert_config(self, resource_id: UUID, data: dict) -> ResourceAssessment:
    # Create if not exists; update if exists
    # Replaces all questions + options atomically

async def get_attempts(self, resource_id: UUID, user_id: UUID) -> list[AssessmentAttempt]:
    # Order: attempt_no ASC

async def count_attempts(self, resource_id: UUID, user_id: UUID, assignment_id: UUID) -> int:

async def create_attempt(self, data: dict) -> AssessmentAttempt:
    # Includes assessment_responses; flush()
```

### CertificateRepository

```python
async def get_by_user(self, user_id: UUID) -> list[Certificate]:
    # Filter: user_id = user_id; Order: issued_at DESC

async def get_by_id(self, certificate_id: UUID) -> Certificate | None:

async def get_pending_approvals(self, page: int, size: int) -> tuple[list[Certificate], int]:
    # Filter: status = 'PENDING_APPROVAL'; paginated

async def create(self, data: dict) -> Certificate:

async def update_status(self, cert: Certificate, status: str, **kwargs) -> Certificate:
    # kwargs: approved_by, approved_at, rejection_reason, rejected_at
```

### ResourceProgressRepository

```python
async def get(self, resource_id: UUID, user_id: UUID, assignment_id: UUID) -> ResourceProgress | None:

async def upsert(self, resource_id: UUID, user_id: UUID, assignment_id: UUID, data: dict) -> ResourceProgress:
    # Create if not exists; update if exists
```

---

## Repository Rules (from _shared.md)

1. **`flush()` not `commit()`** inside repository methods — service layer commits
2. **No business logic** in repositories — no auth checks, no rule enforcement, no conditional state transitions
3. **No cross-module writes** — may read from `assignments` table (for counts), never write
4. **Soft delete always** — `resource.is_active = False; await self.db.flush()` — never `self.db.delete(resource)`
5. **Paginated returns** — always `tuple[list[T], int]` for paginated queries (items + total count)

---

## Stop Point

```
✅ B3 Complete — Repository Layer
Repositories generated: [list]
Total methods: [N]

Reply YES to proceed to B4 (Service Layer).
```

**STOP. Do not generate B4 until user confirms.**
