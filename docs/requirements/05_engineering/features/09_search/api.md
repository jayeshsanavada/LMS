# Search — API Specification

---

## Common Header

### Base Path
```
/api/v1
```

### Authentication
- JWT Bearer token required on all endpoints
- Token issued by Keycloak via PKCE flow
- Validated at APISIX gateway and again in FastAPI
- `X-Correlation-ID` (UUID v4) required on every request; echoed in response

### Authorization Notation
- `ADMIN` / `HR` / `EMPLOYEE` — global roles from `realm_access.roles` in JWT
- `SELF_ONLY` — scoped to authenticated user's own data
- `TEAM_ONLY` — scoped to direct reports (hierarchy depth = 1)
- `ORG_WIDE` — all users

### Standard Response Envelope
```json
{
  "success": true,
  "data": {},
  "message": "optional message",
  "errors": []
}
```

### Paginated Response
```json
{
  "success": true,
  "data": {
    "items": [],
    "page": 1,
    "size": 20,
    "total": 84,
    "has_next": true
  }
}
```

### Query Constraints
| Constraint | Value |
|---|---|
| Minimum `q` length | 2 characters |
| Maximum `q` length | 200 characters |
| Maximum `size` | 50 |
| Default `size` | 20 |

---

## Group: Search

---

### 1. Global Federated Search

```
GET /api/v1/search
```

**Purpose:** Keyword search across multiple entity types in a single request. Returns a ranked, role-filtered result list with a `result_type` discriminator per item.

**Access:** Any authenticated user (results filtered by role + hierarchy before return)

**Query Parameters:**
| Parameter | Type | Required | Notes |
|---|---|---|---|
| `q` | string | Yes | Min 2 chars, max 200 chars |
| `type` | string | No | `training` / `session` / `user` — omit for all types |
| `page` | integer | No | Default 1 |
| `size` | integer | No | Default 20, max 50 |

**Result types returned per role:**
- `training` — Employee, Manager, HR, Admin (scoped by visibility rules)
- `session` — Employee (own), Manager (own + team), Admin (all)
- `user` — Admin only

**Response:**
```json
{
  "items": [
    {
      "result_type": "training",
      "id": "uuid",
      "title": "Safety Compliance 2026",
      "subtitle": "Course · Mandatory",
      "lifecycle_state": "PUBLISHED",
      "is_mandatory": true,
      "requires_approval": false,
      "relevance_score": 0.87,
      "assignment_status": "IN_PROGRESS"
    },
    {
      "result_type": "session",
      "id": "uuid",
      "title": "Q2 Safety Briefing",
      "subtitle": "Session · SES-003",
      "session_state": "SCHEDULED",
      "start_time": "2026-05-10T10:00:00Z",
      "relevance_score": 0.61
    },
    {
      "result_type": "user",
      "id": "uuid",
      "title": "Jayesh Sanavada",
      "subtitle": "Engineering · Senior Engineer",
      "is_active": true,
      "relevance_score": 0.55
    }
  ],
  "page": 1,
  "size": 20,
  "total": 14,
  "has_next": false
}
```

**Ranking:** `ts_rank` relevance → mandatory training boosted → recency

**Error Codes:**
- `QUERY_TOO_SHORT` (422) — `q` < 2 characters
- `QUERY_TOO_LONG` (422) — `q` > 200 characters

---

### 2. Training Catalog Browse

```
GET /api/v1/search/catalog
```

**Purpose:** Browse the training catalog without a keyword. All filters optional. Returns all PUBLISHED training matching filters, sorted mandatory-first then alphabetical. This is the catalog page — no `q` required.

**Access:** Any authenticated user

**Query Parameters:**
| Parameter | Type | Notes |
|---|---|---|
| `category` | string | Filter by category |
| `training_type` | string | `COURSE` / `LEARNING_PATH` / `CURRICULUM` |
| `difficulty_level` | string | `BEGINNER` / `INTERMEDIATE` / `ADVANCED` |
| `is_mandatory` | boolean | Filter mandatory only |
| `requires_approval` | boolean | Filter by enrollment type |
| `tag` | string | Filter by tag name (exact) |
| `lifecycle_state` | string | Admin only: `DRAFT` / `PUBLISHED` / `INACTIVE`; default `PUBLISHED` for all others |
| `page` | integer | Default 1 |
| `size` | integer | Default 20, max 50 |

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "training_code": "TRN-001",
      "title": "Safety Compliance 2026",
      "training_type": "COURSE",
      "category": "Compliance",
      "difficulty_level": "BEGINNER",
      "is_mandatory": true,
      "requires_approval": false,
      "estimated_duration_minutes": 60,
      "tags": ["safety", "compliance"],
      "lifecycle_state": "PUBLISHED",
      "assignment_status": "IN_PROGRESS",
      "current_version_no": 2
    }
  ],
  "page": 1,
  "size": 20,
  "total": 42,
  "has_next": true
}
```

**Notes:**
- `assignment_status` included if the requesting user has an active assignment for this training; null otherwise
- Non-admin users always see `PUBLISHED` only regardless of `lifecycle_state` filter

---

### 3. Training Search (Scoped)

```
GET /api/v1/search/training
```

**Purpose:** Keyword search scoped to training items only, with the full filter set available. Requires `q`.

**Access:** Any authenticated user (visibility scoped by role)

**Query Parameters:**
| Parameter | Type | Required | Notes |
|---|---|---|---|
| `q` | string | Yes | Min 2 chars |
| `category` | string | No | |
| `training_type` | string | No | `COURSE` / `LEARNING_PATH` / `CURRICULUM` |
| `difficulty_level` | string | No | |
| `is_mandatory` | boolean | No | |
| `requires_approval` | boolean | No | |
| `tag` | string | No | |
| `assignment_status` | string | No | Filter by own assignment status |
| `page` | integer | No | Default 1 |
| `size` | integer | No | Default 20, max 50 |

**Response:** Same shape as catalog browse items with `relevance_score` added.

**Error Codes:**
- `QUERY_TOO_SHORT` (422)
- `QUERY_TOO_LONG` (422)

---

### 4. User Search (Admin Only)

```
GET /api/v1/search/users
```

**Purpose:** Admin keyword search across users by name, email, employee ID, department, or designation.

**Access:** ADMIN only

**Query Parameters:**
| Parameter | Type | Required | Notes |
|---|---|---|---|
| `q` | string | Yes | Min 2 chars — searched against name, email, employee_id, department, designation |
| `is_active` | boolean | No | Default true |
| `department` | string | No | Additional filter post-search |
| `designation` | string | No | |
| `global_role` | string | No | `ADMIN` / `HR` / `EMPLOYEE` |
| `page` | integer | No | Default 1 |
| `size` | integer | No | Default 20, max 50 |

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "employee_id": "EMP-001",
      "full_name": "Jayesh Sanavada",
      "email": "j***@company.com",
      "department": "Engineering",
      "designation": "Senior Engineer",
      "global_role": "EMPLOYEE",
      "is_active": true,
      "relevance_score": 0.92
    }
  ]
}
```

**Notes:**
- Email is partially masked in search results (consistent with audit masking rules)

**Error Codes:**
- `ACCESS_DENIED` (403) — non-admin calling this endpoint
- `QUERY_TOO_SHORT` (422)

---

### 5. Typeahead Suggestions

```
GET /api/v1/search/suggestions
```

**Purpose:** Returns up to 10 training title prefix-matches as user types. Designed for < 200ms response — uses `ILIKE` prefix match, not full-text search.

**Access:** Any authenticated user (suggestions scoped to visible training)

**Query Parameters:**
| Parameter | Type | Required | Notes |
|---|---|---|---|
| `q` | string | Yes | Min 2 chars |
| `type` | string | No | Default `training`; Phase 1 supports `training` only |

**Response:**
```json
{
  "suggestions": [
    { "id": "uuid", "title": "Safety Compliance 2026", "training_type": "COURSE", "is_mandatory": true },
    { "id": "uuid", "title": "Safety for New Joiners", "training_type": "COURSE", "is_mandatory": false }
  ]
}
```

**Notes:**
- Max 10 results always
- Employee / Manager / HR: PUBLISHED training only
- Admin: all lifecycle states, with `lifecycle_state` label in result
- No pagination (fixed max 10)

**Error Codes:**
- `QUERY_TOO_SHORT` (422) — `q` < 2 characters

---

## Additions vs Master API List (§19)

| # | Addition | Reason |
|---|---|---|
| SE1 | `GET /search/catalog` — browse without keyword | Catalog browsing is a distinct UX pattern from keyword search; missing from master |
| SE2 | `GET /search/training` — scoped training search with full filter set | Master had one global endpoint; dedicated training search with all filters needed |
| SE3 | `GET /search/users` — Admin-only user search | Master had users in global search with no explicit scoping; separated for clarity and security |
| SE4 | `result_type` discriminator in global search response | Master had no response structure defined — needed for federated result rendering |
| SE5 | `relevance_score` in response | Exposes ts_rank for frontend ranking display / debugging |
| SE6 | `assignment_status` in catalog response | Employees need to know if they're already enrolled without separate API call |
| SE7 | Query constraint enforcement (`QUERY_TOO_SHORT` / `QUERY_TOO_LONG`) | Enterprise standard — missing from master |
| SE8 | Email masking in user search results | Consistent with audit masking rules |
