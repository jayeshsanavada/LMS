# AZ-LMS — Shared AI Context
# Read this file FIRST before any sub-task file

> This file contains universal patterns that apply to EVERY module and EVERY sub-task.
> These are non-negotiable constraints — do not override them based on assumptions.

---

## 1. System Architecture

**DDD Modular Monolith** — FastAPI (Python) + React (TypeScript) + PostgreSQL + APISIX + Keycloak

**API Gateway:** All requests pass through APISIX (JWT validation, rate limiting, Correlation-ID injection).

**Module boundaries:** Each module owns its tables. Module A MUST NOT write to Module B's tables.
Cross-module reads via service calls only — never direct cross-module SQL joins in repositories.

---

## 2. API Response Envelope (MANDATORY — every endpoint)

```json
{
  "success": true,
  "data": {},
  "message": "Optional human-readable message",
  "errors": []
}
```

**Paginated list shape (always this — no deviations):**
```json
{
  "success": true,
  "data": {
    "items": [],
    "page": 1,
    "size": 20,
    "total": 45,
    "has_next": true
  }
}
```

---

## 3. Database Rules (all tables, no exceptions)

| Rule | Requirement |
|---|---|
| Primary keys | UUID v4, Python-side default (`default=uuid.uuid4`) — never DB-side, never integer |
| Timestamps | `TIMESTAMPTZ` — never `DateTime`, never `TIMESTAMP` |
| `created_at` | `server_default=func.now()` |
| `updated_at` | `server_default=func.now(), onupdate=func.now()` |
| Soft delete | `is_active = false` or `status = CANCELLED/INACTIVE` — **never** `DELETE FROM` |
| Hard deletes | **Prohibited everywhere.** If a record must be "removed", soft-delete it. |

---

## 4. Security Constraints (mandatory in every endpoint)

| Constraint | Rule |
|---|---|
| Token storage | JWT in runtime memory only — **never** localStorage, sessionStorage, cookies, or DB |
| Token validation | Validate `aud` claim against configured LMS client ID on every request |
| Manager scope | Determined from `user_hierarchy` table — **never** from a Keycloak role claim |
| Compliance ownership | Assignment Engine only — other modules read; never duplicate the compliance engine |
| File content | OneDrive only — LMS stores metadata (`external_file_id`, `reference_url`) — **never** file bytes |
| Export formats | Excel (`.xlsx`) and PDF only — **no CSV** (Phase 1 scope) |

---

## 5. Correlation ID (every endpoint)

Extract from request header; pass to audit and notification calls:
```python
correlation_id: str = Header(default_factory=lambda: str(uuid.uuid4()), alias="X-Correlation-ID")
```

---

## 6. Audit & Notification Rules (mandatory)

- Audit events: **always** `background_tasks.add_task(audit_service.emit, ...)` — never `await` inline
- Notifications: **always** `background_tasks.add_task(notification_service.dispatch, ...)` — never inline
- Both must include `correlation_id`
- State-changing operations (create, update, status change, delete) **must** emit an audit event

---

## 7. Python / FastAPI Coding Patterns

### SQLAlchemy Model (2.x style — MANDATORY)
```python
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Boolean, ForeignKey, Text, Integer
from sqlalchemy.dialects.postgresql import TIMESTAMPTZ, UUID as PG_UUID
from uuid import UUID
import uuid

class TrainingItem(Base):
    __tablename__ = "training_items"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, server_default=func.now(), onupdate=func.now())
```

**❌ NEVER use Column() style (SQLAlchemy 1.x) — it will be rejected:**
```python
# WRONG — never use this
id = Column(UUID, primary_key=True)
```

### Repository Pattern
```python
class TrainingRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, id: UUID) -> TrainingItem | None:
        result = await self.db.execute(
            select(TrainingItem).where(TrainingItem.id == id, TrainingItem.is_active == True)
        )
        return result.scalar_one_or_none()

    async def create(self, data: dict) -> TrainingItem:
        obj = TrainingItem(**data)
        self.db.add(obj)
        await self.db.flush()  # flush — NOT commit (service commits)
        return obj
```
**Rules:** Repositories do DB operations only — no auth, no business rules, no commits.

### Service Pattern
```python
class TrainingService:
    def __init__(self, repo, audit_service, notification_service):
        ...

    async def create_training(self, data, actor_id, correlation_id, background_tasks):
        obj = await self.repo.create(data)
        await self.repo.db.commit()  # service commits

        background_tasks.add_task(
            self.audit_service.emit,
            event_code="TRAINING_CREATED",
            actor_user_id=actor_id,
            entity_type="training_item",
            entity_id=obj.id,
            old_value=None,
            new_value={"title": obj.title},
            correlation_id=correlation_id,
        )
        return obj
```
**Rules:** Services raise module-specific exceptions (not HTTP). Services commit. Audit + notifications always async.

### Router Pattern
```python
router = APIRouter(prefix="/api/v1/trainings", tags=["Training Management"])

@router.post("", response_model=CreateTrainingResponse, status_code=201)
async def create_training(
    body: CreateTrainingRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    correlation_id: str = Depends(get_correlation_id),
):
    """Create training. ADMIN only."""
    if current_user.role != "ADMIN":
        raise AccessDeniedException()
    service = TrainingService(TrainingRepository(db), ...)
    return await service.create_training(body.dict(), current_user.id, correlation_id, background_tasks)
```
**Rules:** Routers handle auth check + DI + HTTP exception mapping. Never call repo directly. Add `response_model=` on every endpoint.

### Pydantic Schema Pattern
```python
class CreateTrainingRequest(BaseModel):
    training_type: str
    title: str
    category: str
    # ... only fields the caller can set

class TrainingResponse(BaseModel):
    id: UUID
    training_code: str
    title: str
    # ... only fields the caller should see

    model_config = ConfigDict(from_attributes=True)  # REQUIRED on all response schemas
```

### Error Format
```python
class TrainingNotFoundException(AppException):
    def __init__(self, training_id: UUID):
        super().__init__(
            error_code="TRAINING_NOT_FOUND",
            message=f"Training {training_id} not found",
            status_code=404,
        )
# Response shape: {"error_code": "...", "message": "...", "detail": "..."}
```

---

## 8. React / TypeScript Coding Patterns

### Component Pattern
```typescript
// Named exports only (no default exports except page-level components in routes)
interface Props { id: string; onClose: () => void; }

export function TrainingListPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['trainings', params],
    queryFn: () => trainingApi.list(params),
    staleTime: 30_000,
  });

  if (isLoading) return <Spin />;
  if (error) return <Alert type="error" message="Failed to load" />;
  if (!data?.items?.length) return <Empty />;
  return (/* table */);
}
```
**Rules:** Always handle loading, error, empty states. Named exports. Props typed above component.

### API Call Pattern
```typescript
export const trainingApi = {
  list: (params): Promise<PaginatedResponse<TrainingItem>> =>
    client.get('/api/v1/trainings', { params }).then(r => r.data.data),
  create: (body: CreateTrainingRequest): Promise<CreateTrainingResponse> =>
    client.post('/api/v1/trainings', body).then(r => r.data.data),
};
```
- `useQuery` for all GET requests
- `useMutation` for all POST/PATCH/DELETE; invalidate related queries on success

### Form Pattern
```typescript
const schema = z.object({ title: z.string().min(1) });
type FormData = z.infer<typeof schema>;

export function TrainingForm({ onSuccess }: { onSuccess: () => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });
  const mutation = useMutation({
    mutationFn: trainingApi.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['trainings'] }); onSuccess(); },
  });
  return <form onSubmit={handleSubmit(d => mutation.mutate(d))}>...</form>;
}
```

### UI Framework
- **Ant Design v5** — ONLY. Do NOT use MUI, Chakra, Tailwind for components.
- Use `Table`, `Modal`, `Form`, `Steps`, `Upload`, `Spin`, `Alert`, `Empty`, `Tag`, `Badge`, `Drawer` from `antd`.

### Role / Auth
```typescript
// Role from JWT (Keycloak)
const role = keycloak.tokenParsed?.realm_access?.roles?.includes('ADMIN') ? 'ADMIN' : 'EMPLOYEE';
// Manager status from API (NOT from Keycloak)
const { data: team } = useQuery({ queryKey: ['team'], queryFn: () => usersApi.getTeamMembers() });
const isManager = (team?.items?.length ?? 0) > 0;
```

### Status Badge Colors
| Status | Ant Design color |
|---|---|
| DRAFT | `default` |
| PUBLISHED | `success` |
| INACTIVE | `error` |
| ARCHIVED | `warning` |
| ASSIGNED | `blue` |
| IN_PROGRESS | `processing` |
| COMPLETED | `success` |
| OVERDUE | `error` |
| PENDING / PENDING_APPROVAL | `warning` |
| APPROVED | `success` |
| REJECTED | `error` |

---

## 9. APScheduler Rule (CRITICAL)

- **APScheduler jobs run in the Worker service ONLY** — not in the FastAPI main process
- FastAPI `BackgroundTasks` is for event-driven post-request async (audit, notifications, single operations)
- Heavy scheduled jobs (daily sync, expiry checks) go in Worker via APScheduler
- Never instantiate APScheduler inside `@app.on_event("startup")` in FastAPI main

---

## 10. Phase 2 Exclusions (DO NOT implement in Phase 1)

- SCORM resource type (excluded from resource_type enum)
- Custom certificate templates (Phase 1 = fixed system template)
- AI-powered recommendations
- Skills/competency framework
- External search engine (use PostgreSQL tsvector)
- CSV export (Phase 1 = Excel + PDF only)
- Real-time sync webhooks (Zoho, Employee DB)

Mark any Phase 2 feature with a comment: `# Phase 2: [feature name]`
