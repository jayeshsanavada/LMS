# Sub-task B4: Service Layer
# Training Management — Backend Layer 4 of 5

---

## Files to Read BEFORE Writing Code (in this order)

1. `docs/code_generation/modules/_shared.md` — service pattern (background_tasks, commit in service, module exceptions)
2. `docs/code_generation/modules/training_management/_module.md` — audit event codes, notification events, lifecycle rules, business rules summary
3. `docs/requirements/02_features/03_training_management.md` — §4 (functional requirements), §5 (business rules), §6 (workflows)
4. `docs/requirements/05_engineering/features/03_training_management/api.md` — §2–4 (side effects per endpoint), §5 (audit event reference)

---

## Scope

**Generate:**
- Service classes: `TrainingService`, `ResourceService`, `AssessmentService`, `CertificateService`, `ProgressService`
- All business logic, rule enforcement, audit emit, notification dispatch
- Completion evaluation logic (resource progress → course completion → LP/Curriculum completion)

**Do NOT generate:**
- SQLAlchemy models (sub-task B1)
- Pydantic schemas (sub-task B2)
- Repository classes (sub-task B3)
- Router or background jobs (sub-task B5)

---

## Pre-Code Declaration (REQUIRED before writing any code)

```
### PRE-CODE DECLARATION — B4 Service Layer

#### Files Read
| File | Lines Read | Key Fact |
|---|---|---|
| _shared.md | all | background_tasks.add_task for audit/notifications; service commits |
| _module.md | all | 17 audit events; lifecycle transitions; certificate flow |
| 03_training_management.md | §4-6 | business rules and workflows confirmed |
| api.md | §2-5 | side effects per endpoint confirmed |

#### Business Rule Enforcement Checklist
| Rule | Enforced In Method |
|---|---|
| BR-01: category required | create_training validation |
| BR-06: prerequisites block access | check_resource_access |
| BR-08: completion = all required resources done | evaluate_course_completion |
| BR-12: validity_period expiry → new assignment | expiry job + completion service |
| BR-14: new version only on re-publish of changed | publish_training |
| BR-21: resource access requires active assignment | check_resource_access |
| BR-30: inactive training → no new assignments | enforce in assignment engine (not here) |
| BR-36: assessment data in LMS only | upsert_assessment_config |
| BR-37: assessment complete on passing score | grade_attempt |
| BR-38: exhausted attempts → blocked | grade_attempt |
| BR-39: attempts permanently recorded (no delete) | N/A — no delete method |
| BR-40: sequential lock | check_sequential_lock |
| BR-42: question validation | validate_questions |
| BR-43-46: certificate approval flow | CertificateService |
| BR-47: ≥1 question before assessment can save | validate_questions |

#### Audit Event Coverage
| Event Code | Method That Emits It |
|---|---|
| TRAINING_CREATED | create_training |
| TRAINING_PUBLISHED | publish_training |
| TRAINING_VERSION_CREATED | publish_training |
| TRAINING_INACTIVATED | inactivate_training |
| TRAINING_ARCHIVED | archive_training |
| TRAINING_RESTORED | restore_training |
| TRAINING_CLONED | clone_training |
| TRAINING_RESOURCE_ADDED | add_resource |
| TRAINING_RESOURCE_REMOVED | remove_resource |
| TRAINING_COMPLETED | evaluate_course_completion |
| CERTIFICATE_ISSUED | _issue_certificate (called from completion) |
| CERTIFICATE_APPROVED | approve_certificate |
| CERTIFICATE_REJECTED | reject_certificate |
| ASSESSMENT_ATTEMPT_SUBMITTED | submit_attempt |
| ASSESSMENT_ATTEMPTS_EXHAUSTED | grade_attempt (when attempts_used >= max_attempts and !passed) |
| ASSESSMENT_ATTEMPTS_RESET | reset_attempts |
| TRAINING_COMPLETION_EXPIRED | expiry_job (in b5) |

I confirm all files read. Beginning B4 code generation.
```

---

## Service Method Specifications

### TrainingService

```python
class TrainingService:
    def __init__(self, training_repo, resource_repo, audit_service, notification_service):
        ...

    async def create_training(self, data: dict, actor_id: UUID, correlation_id: str, background_tasks: BackgroundTasks) -> TrainingItem:
        # 1. Validate: category required (BR-01)
        # 2. Auto-generate training_code (TRN-XXX sequence)
        # 3. Set lifecycle_state = DRAFT, current_version_no = 0
        # 4. Create via repo; commit
        # 5. Emit TRAINING_CREATED (background)

    async def update_training(self, training_id: UUID, data: dict, actor_id: UUID, correlation_id: str, background_tasks: BackgroundTasks) -> TrainingItem:
        # 1. Fetch training (raise TRAINING_NOT_FOUND if missing)
        # 2. Validate: cannot update INACTIVE (raise TRAINING_INACTIVE)
        # 3. If training is PUBLISHED: set has_unpublished_changes = True
        # 4. Update fields; commit
        # 5. No audit event on update (only on publish)

    async def publish_training(self, training_id: UUID, actor_id: UUID, correlation_id: str, background_tasks: BackgroundTasks) -> TrainingItem:
        # 1. Fetch training (raise TRAINING_NOT_FOUND)
        # 2. Validate: must have ≥1 active resource (raise NO_RESOURCES_ATTACHED)
        # 3. Validate: if PUBLISHED and has_unpublished_changes = False → raise ALREADY_PUBLISHED_NO_CHANGES
        # 4. Increment current_version_no; create training_versions record
        # 5. Set lifecycle_state = PUBLISHED; has_unpublished_changes = False
        # 6. Commit
        # 7. Emit TRAINING_PUBLISHED (background)
        # 8. Emit TRAINING_VERSION_CREATED (background)

    async def inactivate_training(self, training_id: UUID, reason: str, actor_id: UUID, correlation_id: str, background_tasks: BackgroundTasks) -> dict:
        # 1. Fetch training
        # 2. Validate: can only inactivate PUBLISHED or DRAFT (not already INACTIVE)
        # 3. Count active assignments (for response message)
        # 4. Set lifecycle_state = INACTIVE; commit
        # 5. Emit TRAINING_INACTIVATED

    async def archive_training(self, training_id: UUID, actor_id: UUID, correlation_id: str, background_tasks: BackgroundTasks) -> TrainingItem:
        # 1. Validate: cannot archive INACTIVE training (raise TRAINING_INACTIVE)
        # 2. Set lifecycle_state = ARCHIVED; commit
        # 3. Emit TRAINING_ARCHIVED

    async def restore_training(self, training_id: UUID, actor_id: UUID, correlation_id: str, background_tasks: BackgroundTasks) -> TrainingItem:
        # 1. Validate: training must be ARCHIVED (raise NOT_ARCHIVED)
        # 2. Set lifecycle_state = DRAFT; commit
        # 3. Emit TRAINING_RESTORED

    async def clone_training(self, training_id: UUID, title: str, actor_id: UUID, correlation_id: str, background_tasks: BackgroundTasks) -> TrainingItem:
        # 1. Fetch source training (raise TRAINING_NOT_FOUND)
        # 2. Deep copy: training_items, training_resources, training_prerequisites, completion_rules
        # 3. Assign new training_code; set cloned_from_id; lifecycle_state = DRAFT; version = 0
        # 4. Do NOT copy: training_versions (starts fresh), training_completions
        # 5. Commit
        # 6. Emit TRAINING_CLONED
```

### ResourceService

```python
    async def add_resource(self, data: dict, actor_id: UUID, correlation_id: str, background_tasks: BackgroundTasks) -> TrainingResource:
        # 1. Validate: training exists + is DRAFT or PUBLISHED (not INACTIVE/ARCHIVED)
        # 2. Validate resource_type-specific fields:
        #    VIDEO/PDF/DOCUMENT: external_file_id required
        #    LINK: external_link required and valid URL
        #    SESSION: session_id required
        #    ASSESSMENT: no file needed (config added via assessment endpoint)
        # 3. If training PUBLISHED: set has_unpublished_changes = True
        # 4. Create resource; commit
        # 5. Emit TRAINING_RESOURCE_ADDED

    async def remove_resource(self, resource_id: UUID, actor_id: UUID, correlation_id: str, background_tasks: BackgroundTasks) -> None:
        # 1. Fetch resource (raise RESOURCE_NOT_FOUND)
        # 2. Soft delete: is_active = False (NEVER hard delete)
        # 3. If parent training PUBLISHED: set has_unpublished_changes = True
        # 4. Commit
        # 5. Emit TRAINING_RESOURCE_REMOVED

    async def check_resource_access(self, resource_id: UUID, user_id: UUID, role: str) -> TrainingResource:
        # ADMIN: always passes
        # EMPLOYEE: must have active assignment for parent training (BR-21)
        # Check prerequisites complete for parent training (BR-06)
        # Check sequential lock (BR-40): if is_sequential_locked, all preceding required resources must be COMPLETED
        # Raise: NO_ACTIVE_ASSIGNMENT, PREREQUISITE_NOT_MET, SEQUENTIAL_LOCK_ACTIVE
```

### AssessmentService

```python
    async def validate_questions(self, questions: list) -> None:
        # BR-42: each question must have ≥2 options
        # MCQ / TRUE_FALSE: exactly 1 is_correct = True
        # MSQ: ≥1 is_correct = True
        # BR-47: questions list must have ≥1 item
        # Raise: INVALID_ASSESSMENT_QUESTIONS

    async def submit_attempt(self, resource_id: UUID, user_id: UUID, assignment_id: UUID, data: dict, correlation_id: str, background_tasks: BackgroundTasks) -> dict:
        # 1. Load assessment config (raise RESOURCE_NOT_FOUND)
        # 2. Check user has active assignment (BR-21)
        # 3. Count existing attempts for this user+resource+assignment
        # 4. Validate: max_attempts > 0 → not exceeded (raise MAX_ATTEMPTS_EXCEEDED)
        # 5. Validate: not already passed (raise ALREADY_PASSED)
        # 6. Grade: compare selected_option_ids against correct options per question
        # 7. Calculate score_percent; determine passed (score >= passing_score_percent)
        # 8. Create attempt record + response records (permanently — never deleted, BR-39)
        # 9. If passed: update resource_progress to COMPLETED; call evaluate_course_completion
        # 10. If attempts exhausted and not passed: emit ASSESSMENT_ATTEMPTS_EXHAUSTED
        # 11. Emit ASSESSMENT_ATTEMPT_SUBMITTED
        # 12. Commit all

    async def reset_attempts(self, resource_id: UUID, user_id: UUID, assignment_id: UUID, reason: str, actor_id: UUID, correlation_id: str, background_tasks: BackgroundTasks) -> dict:
        # Previous attempts remain permanently (BR-39)
        # Reset = allow new attempts by incrementing from current count OR marking as reset
        # Emit ASSESSMENT_ATTEMPTS_RESET
```

### ProgressService

```python
    async def track_progress(self, resource_id: UUID, user_id: UUID, assignment_id: UUID, status: str, progress_percent: int, correlation_id: str, background_tasks: BackgroundTasks) -> dict:
        # 1. Validate user has active assignment
        # 2. Upsert resource_progress record
        # 3. If status = COMPLETED and progress_percent = 100:
        #    → Call evaluate_course_completion
        # 4. Commit; return {resource_id, progress_status, progress_percent, course_completion_triggered}

    async def evaluate_course_completion(self, training_id: UUID, user_id: UUID, assignment_id: UUID, background_tasks: BackgroundTasks) -> bool:
        # Load all active resources for training
        # Load resource_progress for this user+assignment
        # Count: required resources completed vs total required resources
        # Completion rule: ALL_RESOURCES → all required must be COMPLETED
        # If complete:
        #   → Create training_completions record
        #   → Update assignment status → COMPLETED
        #   → If issue_certificate: call _issue_certificate
        #   → Emit TRAINING_COMPLETED
        #   → Evaluate parent LP/Curriculum (recursive if needed)
        # Return True if completed, False otherwise

    async def _issue_certificate(self, user_id: UUID, training_id: UUID, completion_id: UUID, background_tasks: BackgroundTasks) -> Certificate:
        # Create certificates record with status = PENDING_APPROVAL
        # Generate certificate_no (CERT-YYYY-NNN sequence)
        # Emit CERTIFICATE_ISSUED
        # Notify employee: "certificate pending admin approval"
```

### CertificateService

```python
    async def approve_certificate(self, certificate_id: UUID, actor_id: UUID, correlation_id: str, background_tasks: BackgroundTasks) -> Certificate:
        # 1. Fetch certificate (raise CERTIFICATE_NOT_FOUND)
        # 2. Validate: status must be PENDING_APPROVAL (raise CERTIFICATE_NOT_PENDING)
        # 3. Set status = APPROVED; approved_by = actor_id; approved_at = now
        # 4. Commit
        # 5. Emit CERTIFICATE_APPROVED
        # 6. Notify employee: approved, download available

    async def reject_certificate(self, certificate_id: UUID, rejection_reason: str, actor_id: UUID, correlation_id: str, background_tasks: BackgroundTasks) -> Certificate:
        # 1. Validate: rejection_reason not empty (BR-45)
        # 2. Fetch certificate; validate status = PENDING_APPROVAL
        # 3. Set status = REJECTED; rejection_reason stored
        # 4. Commit
        # 5. Emit CERTIFICATE_REJECTED
        # 6. Notify employee with rejection reason + re-attempt link (BR-45)
```

---

## Stop Point

```
✅ B4 Complete — Service Layer
Services generated: TrainingService, ResourceService, AssessmentService, ProgressService, CertificateService
All 17 audit events covered: [confirm each]
All notification events dispatched: [confirm each]

Reply YES to proceed to B5 (Router + Background Jobs).
```

**STOP. Do not generate B5 until user confirms.**
