# Sub-task B5: FastAPI Router + Background Jobs
# Training Management — Backend Layer 5 of 5

---

## Files to Read BEFORE Writing Code (in this order)

1. `docs/code_generation/modules/_shared.md` — router pattern, role guard, response_model, correlation_id dependency
2. `docs/code_generation/modules/training_management/_module.md` — APISIX routes table (32 routes), background jobs specs
3. `docs/requirements/05_engineering/features/03_training_management/api.md` — full file (exact paths, error codes, HTTP status codes)
4. `docs/requirements/05_engineering/00_apisix_routes.md` — Training Management section (confirm paths match)

---

## Scope

**Generate:**
- FastAPI router: `training_router`, `resource_router`, `certificate_router`
- All 32 endpoint paths matching api.md and APISIX routes exactly
- Role guards per endpoint
- Background job: `training_expiry_job.py` (APScheduler, in Worker service)

**Do NOT generate:**
- SQLAlchemy models (sub-task B1)
- Pydantic schemas (sub-task B2)
- Repository classes (sub-task B3)
- Service layer (sub-task B4)

---

## Pre-Code Declaration (REQUIRED before writing any code)

```
### PRE-CODE DECLARATION — B5 Router + Jobs

#### Files Read
| File | Lines Read | Key Fact |
|---|---|---|
| _shared.md | all | router pattern; response_model required; role check before service call |
| _module.md | all | 32 routes; background jobs spec |
| api.md | all | exact paths, error codes, HTTP status per endpoint |
| 00_apisix_routes.md | training section | paths confirmed against APISIX config |

#### Endpoint Coverage Checklist (mark each when implemented)
| Method | Path | Role | Status Code |
|---|---|---|---|
| GET | /api/v1/trainings | ADMIN,HR,EMPLOYEE | 200 |
| POST | /api/v1/trainings | ADMIN | 201 |
| GET | /api/v1/trainings/{id} | ADMIN,HR,EMPLOYEE | 200 |
| PUT | /api/v1/trainings/{id} | ADMIN | 200 |
| POST | /api/v1/trainings/{id}/publish | ADMIN | 200 |
| POST | /api/v1/trainings/{id}/inactivate | ADMIN | 200 |
| POST | /api/v1/trainings/{id}/archive | ADMIN | 200 |
| POST | /api/v1/trainings/{id}/restore | ADMIN | 200 |
| POST | /api/v1/trainings/{id}/clone | ADMIN | 201 |
| GET | /api/v1/trainings/{id}/versions | ADMIN,HR | 200 |
| GET | /api/v1/trainings/{id}/structure | ADMIN,HR,EMPLOYEE | 200 |
| PUT | /api/v1/trainings/{id}/structure | ADMIN | 200 |
| GET | /api/v1/trainings/{id}/resources | ADMIN,EMPLOYEE | 200 |
| GET | /api/v1/trainings/{id}/assignments | ADMIN | 200 |
| POST | /api/v1/trainings/export | ADMIN,HR | 202 |
| GET | /api/v1/trainings/export/{job_id}/download | ADMIN,HR | 200 |
| POST | /api/v1/resources | ADMIN | 201 |
| GET | /api/v1/resources/{id} | ADMIN,EMPLOYEE | 200 |
| PUT | /api/v1/resources/{id} | ADMIN | 200 |
| DELETE | /api/v1/resources/{id} | ADMIN | 204 |
| PATCH | /api/v1/trainings/{id}/resources/reorder | ADMIN | 200 |
| GET | /api/v1/resources/{id}/assessment | ADMIN,EMPLOYEE | 200 |
| PUT | /api/v1/resources/{id}/assessment | ADMIN | 200 |
| POST | /api/v1/resources/{id}/assessment/attempts | EMPLOYEE | 200 |
| GET | /api/v1/resources/{id}/assessment/attempts | ADMIN,EMPLOYEE | 200 |
| POST | /api/v1/resources/{id}/assessment/attempts/reset | ADMIN | 200 |
| POST | /api/v1/resources/{id}/progress | EMPLOYEE | 200 |
| GET | /api/v1/certificates/me | EMPLOYEE | 200 |
| GET | /api/v1/certificates/{id} | ADMIN,HR,EMPLOYEE | 200 |
| GET | /api/v1/certificates/{id}/download | ADMIN,HR,EMPLOYEE | 200 |
| POST | /api/v1/certificates/{id}/approve | ADMIN | 200 |
| POST | /api/v1/certificates/{id}/reject | ADMIN | 200 |

I confirm all files read. Beginning B5 code generation.
```

---

## Router Implementation Rules

### Role Guards Per Endpoint Group
```python
# ADMIN only
if current_user.role != "ADMIN":
    raise AccessDeniedException()

# ADMIN or HR
if current_user.role not in ["ADMIN", "HR"]:
    raise AccessDeniedException()

# Employee self-only (assessment attempts, progress)
if current_user.role == "EMPLOYEE":
    # No additional role check needed — access validated in service by assignment
    pass

# Resource access (ADMIN always; EMPLOYEE with active assignment)
# Validate via service.check_resource_access(resource_id, user_id, role)
```

### Error → HTTP Status Mapping (catch in router, not service)
```python
except TrainingNotFoundException:       → 404
except TrainingInactiveException:       → 409, error_code="TRAINING_INACTIVE"
except NoResourcesAttachedException:    → 400, error_code="NO_RESOURCES_ATTACHED"
except AlreadyPublishedException:       → 409, error_code="ALREADY_PUBLISHED_NO_CHANGES"
except NotArchivedException:            → 409, error_code="NOT_ARCHIVED"
except ResourceNotFoundException:       → 404, error_code="RESOURCE_NOT_FOUND"
except NoActiveAssignmentException:     → 403, error_code="NO_ACTIVE_ASSIGNMENT"
except PrerequisiteNotMetException:     → 403, error_code="PREREQUISITE_NOT_MET"
except MaxAttemptsExceededException:    → 409, error_code="MAX_ATTEMPTS_EXCEEDED"
except AlreadyPassedException:          → 409, error_code="ALREADY_PASSED"
except CertificateNotFoundException:    → 404, error_code="CERTIFICATE_NOT_FOUND"
except CertificateNotPendingException:  → 409, error_code="CERTIFICATE_NOT_PENDING"
except RejectionReasonRequiredException: → 400, error_code="REJECTION_REASON_REQUIRED"
except AccessDeniedException:           → 403, error_code="ACCESS_DENIED"
```

### Required Dependencies on Every Endpoint
```python
current_user: CurrentUser = Depends(get_current_user)
db: AsyncSession = Depends(get_db)
background_tasks: BackgroundTasks
correlation_id: str = Depends(get_correlation_id)
```

### Router Registration
```python
# In main app (not here — just note the prefix)
app.include_router(training_router, prefix="/api/v1")
app.include_router(resource_router, prefix="/api/v1")
app.include_router(certificate_router, prefix="/api/v1")
```

---

## Background Job: Completion Expiry

**File location:** `worker/jobs/training_expiry_job.py`
**APScheduler schedule:** `cron(hour=3, minute=0)` (daily at 03:00)
**IMPORTANT:** This job runs in the Worker service. NEVER add APScheduler to FastAPI main process.

```python
async def training_completion_expiry_job(db: AsyncSession, audit_service, notification_service):
    """
    Daily job: find expired training completions and create new assignments.
    BR-12: validity_period_days is set → completion expires → new assignment auto-created.
    Idempotent: records already marked expired are skipped.
    """
    # 1. Query training_completions WHERE validity_period_days IS NOT NULL
    #    AND completed_at + validity_period_days < TODAY
    #    AND is_expired = False (or no existing expiry record for this completion)
    # 2. For each expired completion:
    #    a. Mark completion as expired (or create expiry record)
    #    b. Emit TRAINING_COMPLETION_EXPIRED audit event
    #    c. Call Assignment Engine internal service to create new assignment
    #       (or call POST /api/v1/assignments endpoint internally)
    #    d. Notify employee: "Your [Training] completion has expired. New assignment created."
    # 3. Log job execution to integration_jobs (or background_jobs table)
```

---

## Stop Point

```
✅ B5 Complete — Router + Background Jobs
Endpoints implemented: [N] (verify all 32 from checklist above)
Routers: training_router, resource_router, certificate_router
Background jobs: training_expiry_job

BACKEND COMPLETE. All 5 layers done (B1–B5).
Reply YES to proceed to frontend generation (F1 — Admin Training List).
```

**STOP. Do not generate any frontend until user confirms.**
