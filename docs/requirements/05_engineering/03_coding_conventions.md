# AZ-LMS — Coding Conventions

---

## About This File

| Field | Detail |
|---|---|
| **Purpose** | Defines the exact coding patterns, naming rules, and structural conventions that all AI-generated code must follow — ensuring every module looks and behaves consistently, regardless of which AI tool generated it. |
| **When to Use** | Before any code generation task. AI reads this alongside the module spec to produce convention-compliant code. Also used during code review to verify compliance. |
| **How to Use** | Read completely. Apply every rule below to generated code. If a situation isn't covered here, default to PEP 8 (Python) or Airbnb TypeScript guidelines. |
| **Used By Agents?** | Yes — `backend-dev.md` and `frontend-dev.md` reference this. Also in the SHARED section of `docs/code_generation/skills/03_module_file_index.md`. |
| **Related Files** | `docs/requirements/05_engineering/01_tech_stack.md`, `docs/requirements/05_engineering/02_project_scaffold.md` |

---

## PYTHON / FASTAPI CONVENTIONS

### 1. SQLAlchemy Models

```python
# ✅ CORRECT — SQLAlchemy 2.x style
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Boolean, ForeignKey
from uuid import UUID
import uuid

class User(Base):
    __tablename__ = "users"
    
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, server_default=func.now(), onupdate=func.now())

# ❌ WRONG — Legacy SQLAlchemy 1.x style (never use)
class User(Base):
    id = Column(UUID, primary_key=True)  # Wrong style
    email = Column(String)               # Wrong style
```

**Rules:**
- All PKs: `UUID`, generated with `default=uuid.uuid4` (Python-side, not DB-side)
- All timestamps: `TIMESTAMPTZ` (not `DateTime`, not `TIMESTAMP`)
- `created_at`: `server_default=func.now()`
- `updated_at`: `server_default=func.now(), onupdate=func.now()`
- Never use integer PKs
- Soft delete only: `is_active: Mapped[bool]` or `status: Mapped[str]`

---

### 2. Repository Pattern

```python
# repositories follow this pattern — only DB operations, no business logic
class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: UUID) -> User | None:
        result = await self.db.execute(
            select(User).where(User.id == user_id, User.is_active == True)
        )
        return result.scalar_one_or_none()

    async def get_paginated(
        self, page: int = 1, page_size: int = 20, **filters
    ) -> tuple[list[User], int]:
        # Returns (items, total_count)
        ...

    async def create(self, data: dict) -> User:
        user = User(**data)
        self.db.add(user)
        await self.db.flush()  # flush, not commit — service layer commits
        return user
```

**Rules:**
- Repositories only do DB operations — no auth checks, no business rules
- Services call repositories and handle business logic
- Service layer commits transactions (not repository layer)
- Use `flush()` not `commit()` inside repository methods

---

### 3. Service Pattern

```python
class UserService:
    def __init__(
        self,
        user_repo: UserRepository,
        audit_service: AuditService,
        notification_service: NotificationService,
    ):
        self.user_repo = user_repo
        self.audit_service = audit_service
        self.notification_service = notification_service

    async def deactivate_user(
        self,
        user_id: UUID,
        actor_id: UUID,
        correlation_id: str,
        background_tasks: BackgroundTasks,
    ) -> User:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise UserNotFoundException(user_id)
        
        old_state = {"is_active": user.is_active}
        user.is_active = False
        await self.user_repo.db.commit()  # service commits
        new_state = {"is_active": False}
        
        # Audit — always async, never blocks
        background_tasks.add_task(
            self.audit_service.emit,
            event_code="USER_DEACTIVATED",
            actor_user_id=actor_id,
            entity_type="user",
            entity_id=user_id,
            old_value=old_state,
            new_value=new_state,
            correlation_id=correlation_id,
        )
        
        # Notification — always async
        background_tasks.add_task(
            self.notification_service.dispatch,
            event_code="USER_DEACTIVATED",
            recipient_id=user_id,
            context={"user_name": user.full_name},
        )
        
        return user
```

**Rules:**
- Services accept `BackgroundTasks` for audit + notification dispatch
- Audit and notifications are ALWAYS added as background tasks — never awaited inline
- Services raise module-specific exceptions (not HTTP exceptions)
- HTTP exceptions are only raised in routers, never in services

---

### 4. Router Pattern

```python
router = APIRouter(prefix="/api/v1/users", tags=["User Management"])

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    correlation_id: str = Depends(get_correlation_id),
):
    """Get user by ID. Admin: any user. Employee: own profile only."""
    if current_user.role != "ADMIN" and current_user.id != user_id:
        raise AccessDeniedException("ACCESS_DENIED", "You can only view your own profile")
    
    service = UserService(UserRepository(db), ...)
    return await service.get_user(user_id)
```

**Rules:**
- All routes under `/api/v1/` prefix
- Routers handle: auth checks, dependency injection, HTTP exception mapping
- Routers call services — never call repositories directly
- Use `response_model=` on every endpoint
- Add docstring with role/scope description

---

### 5. Pydantic Schema Pattern

```python
# Request schema
class CreateUserRequest(BaseModel):
    employee_id: str
    email: EmailStr
    full_name: str
    department: str | None = None

# Response schema  
class UserResponse(BaseModel):
    id: UUID
    employee_id: str
    email: str
    full_name: str
    is_active: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)  # Enable ORM mode
```

**Rules:**
- Request schemas: only fields the caller can set
- Response schemas: only fields the caller should see (never expose internal flags)
- Always add `model_config = ConfigDict(from_attributes=True)` to response schemas
- Use `EmailStr` for email fields
- Use `UUID` (not `str`) for ID fields in schemas

---

### 6. Error Handling

```python
# Module exception
class UserNotFoundException(AppException):
    def __init__(self, user_id: UUID):
        super().__init__(
            error_code="USER_NOT_FOUND",
            message=f"User {user_id} not found",
            status_code=404,
        )

# Global error response format (always this shape)
{
    "error_code": "USER_NOT_FOUND",
    "message": "User abc-123 not found",
    "detail": "Optional additional context"
}
```

**Rules:**
- Every error has an `error_code` matching the spec exactly
- Never return raw Python exceptions to the client
- Use HTTP 404 for not found, 403 for forbidden, 422 for validation, 409 for conflicts
- Error codes are SCREAMING_SNAKE_CASE

---

### 7. Audit Event Pattern

```python
# Always in background task — never awaited inline
background_tasks.add_task(
    audit_service.emit,
    event_code="ASSIGNMENT_CREATED",      # From spec — exact string
    actor_user_id=current_user.id,
    entity_type="assignment",
    entity_id=assignment.id,
    old_value=None,                        # None for creation events
    new_value={"status": "ASSIGNED", "training_id": str(training_id)},
    correlation_id=correlation_id,
)
```

---

## REACT / TYPESCRIPT CONVENTIONS

### 1. Component Pattern

```typescript
// ✅ CORRECT — typed props, named export, no default exports
interface UserDetailProps {
  userId: string;
  onClose: () => void;
}

export function UserDetailModal({ userId, onClose }: UserDetailProps) {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => api.users.getById(userId),
  });

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorPanel error={error} />;
  if (!user) return <EmptyState message="User not found" />;

  return (/* JSX */);
}

// ❌ WRONG — default exports make refactoring harder
export default function UserDetail() {}
```

**Rules:**
- Named exports only (no default exports except for pages in React Router)
- Every component handles: loading state, error state, empty state
- Props interface always defined explicitly above the component

---

### 2. API Call Pattern

```typescript
// src/api/users.ts
export const usersApi = {
  getById: (userId: string): Promise<UserResponse> =>
    client.get(`/api/v1/users/${userId}`).then(r => r.data),

  list: (params: UserListParams): Promise<PaginatedResponse<UserResponse>> =>
    client.get('/api/v1/users', { params }).then(r => r.data),

  deactivate: (userId: string): Promise<void> =>
    client.post(`/api/v1/users/${userId}/deactivate`).then(r => r.data),
};

// Usage in component
const { data, isLoading } = useQuery({
  queryKey: ['users', params],
  queryFn: () => usersApi.list(params),
  staleTime: 30_000, // 30 seconds
});
```

**Rules:**
- All API functions typed with exact request/response types from `api.md`
- Use React Query `useQuery` for all GET requests
- Use React Query `useMutation` for all POST/PATCH/DELETE
- Invalidate related queries after successful mutations

---

### 3. Form Pattern

```typescript
// Using React Hook Form + Zod
const schema = z.object({
  email: z.string().email('Invalid email'),
  full_name: z.string().min(1, 'Name is required'),
});

type FormData = z.infer<typeof schema>;

export function CreateUserForm({ onSuccess }: { onSuccess: () => void }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onSuccess();
    },
  });

  return (
    <form onSubmit={handleSubmit(data => mutation.mutate(data))}>
      <TextField
        {...register('email')}
        error={!!errors.email}
        helperText={errors.email?.message}
      />
      <Button type="submit" disabled={isSubmitting || mutation.isPending}>
        {isSubmitting ? 'Saving...' : 'Save'}
      </Button>
    </form>
  );
}
```

---

### 4. Hook Pattern

```typescript
// src/hooks/useCurrentUser.ts
export function useCurrentUser() {
  const { keycloak } = useKeycloak();
  const token = keycloak.tokenParsed;
  
  const role = token?.realm_access?.roles?.includes('ADMIN')
    ? 'ADMIN'
    : token?.realm_access?.roles?.includes('HR')
    ? 'HR'
    : 'EMPLOYEE';
  
  // Manager status from API (not from Keycloak role)
  const { data: teamMembers } = useQuery({
    queryKey: ['team-members'],
    queryFn: () => usersApi.getTeamMembers(),
    staleTime: 5 * 60 * 1000, // 5 min
  });
  
  return {
    user: token,
    role,
    isAdmin: role === 'ADMIN',
    isHR: role === 'HR',
    isManager: (teamMembers?.items?.length ?? 0) > 0,
  };
}
```

---

### 5. Status Badge Colors (Must Match Prototype)

```typescript
// src/components/common/StatusBadge.tsx
const STATUS_COLORS: Record<string, ChipProps['color']> = {
  // Assignments
  ASSIGNED: 'info',
  IN_PROGRESS: 'primary',
  COMPLETED: 'success',
  OVERDUE: 'error',
  CANCELLED: 'default',
  
  // Approvals
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  EXPIRED: 'default',
  
  // Sessions
  SCHEDULED: 'info',
  CANCELLED: 'error',
  
  // Compliance
  COMPLIANT: 'success',
  NON_COMPLIANT: 'error',
  
  // Users
  ACTIVE: 'success',
  INACTIVE: 'default',
  PROBATION: 'warning',
};
```

---

## SHARED CONVENTIONS

### Key Decision Enforcement (from AI_CONTEXT.md)

These are mandatory implementation constraints across all modules:

- **Token storage:** JWT/token material must stay in runtime memory only. Never persist tokens in localStorage, sessionStorage, cookies, or database tables.
- **Manager scope:** Manager authority must be determined from `user_hierarchy` relationships. Do not infer manager capability from Keycloak roles.
- **Compliance ownership:** Compliance computation and ownership remain in Assignment Engine only. Other modules may read compliance outcomes but must not implement duplicate compliance engines.
- **File storage:** LMS stores file metadata only. Training/resource files must be stored in OneDrive and referenced by external identifiers/URLs.
- **Export formats:** Phase 1 export formats are limited to Excel (`.xlsx`) and PDF. CSV export is out of scope.

### API Response Shape (Paginated)

```typescript
// Always this shape for paginated responses
interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
```

### Correlation ID

Every API request must include `X-Correlation-ID`. The Axios interceptor handles this automatically. In backend endpoints, extract it with:
```python
correlation_id: str = Header(default_factory=lambda: str(uuid.uuid4()), alias="X-Correlation-ID")
```

### Commit Message Format
```
feat(module): short description
fix(module): what was broken and how it's fixed
refactor(module): what changed and why
test(module): what was tested

Examples:
feat(assignment-engine): add overdue escalation background job
fix(sessions): handle Teams meeting creation failure gracefully
```

### Branch Naming
```
feature/module-name/short-description
fix/module-name/short-description
Examples:
feature/assignment-engine/overdue-escalation
fix/sessions/teams-link-pending-state
```
