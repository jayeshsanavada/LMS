# Training Management — API Specification

---

## 1. Common Conventions

### Base Path
```
/api/v1
```

### Authentication
- All endpoints require a valid JWT Bearer token
- Token: `Authorization: Bearer <token>`
- Roles from JWT claim: `realm_access.roles`
- Token `aud` claim must include LMS client ID

### Correlation ID
- `X-Correlation-ID` header required; middleware generates UUID v4 if absent
- Echoed back in all responses

### Standard Response Envelope
```json
{
  "success": true,
  "data": {},
  "message": null,
  "errors": []
}
```

### Paginated List Response
```json
{
  "success": true,
  "data": {
    "items": [],
    "page": 1,
    "size": 20,
    "total": 0,
    "has_next": false
  }
}
```

### Authorization Notation
- `ADMIN` / `HR` / `EMPLOYEE` — from `realm_access.roles`
- Manager = `EMPLOYEE` with direct reports in `user_hierarchy` (not a role)
- `SELF_ONLY` / `TEAM_ONLY` / `ORG_WIDE`

### Async Export Pattern
1. `POST /export` → returns `job_id`
2. `GET /export/{job_id}` → poll status
3. `GET /export/{job_id}/download` → download when `COMPLETED`

---

## 2. Training Endpoints

---

### 2.1 List Trainings

**Endpoint**
```
GET /api/v1/trainings
```

**Purpose**
Returns training catalog (for employees) or full admin training list depending on access. Employees see published training only. Admin/HR see all states.

**Access**
- `EMPLOYEE` — published training only (catalog view)
- `ADMIN` / `HR` — all states (ORG_WIDE)

**Query Parameters**

| Parameter | Type | Description |
|---|---|---|
| `page` | integer | Default: 1 |
| `size` | integer | Default: 20, max: 100 |
| `type` | string | `COURSE` / `LEARNING_PATH` / `CURRICULUM` |
| `category` | string | Filter by category |
| `lifecycle_state` | string | `DRAFT` / `PUBLISHED` / `INACTIVE` (Admin/HR only) |
| `is_mandatory` | boolean | Filter mandatory training |
| `requires_approval` | boolean | Filter approval-required training |
| `tag` | string | Filter by tag |
| `difficulty_level` | string | `BEGINNER` / `INTERMEDIATE` / `ADVANCED` |
| `q` | string | Keyword search on title/description |
| `sort_by` | string | `title` / `created_at` / `estimated_duration_minutes` |
| `sort_order` | string | `asc` / `desc` |

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "training_id": "uuid",
        "training_code": "TRN-001",
        "training_type": "COURSE",
        "title": "Workplace Safety",
        "description": "Annual mandatory safety training.",
        "category": "Compliance",
        "difficulty_level": "BEGINNER",
        "is_mandatory": true,
        "requires_approval": false,
        "lifecycle_state": "PUBLISHED",
        "estimated_duration_minutes": 45,
        "validity_period_days": 365,
        "current_version_no": 2,
        "tags": ["safety", "compliance"],
        "created_at": "2025-01-01T00:00:00Z"
      }
    ],
    "page": 1,
    "size": 20,
    "total": 34,
    "has_next": true
  }
}
```

---

### 2.2 Get Training Detail

**Endpoint**
```
GET /api/v1/trainings/{training_id}
```

**Purpose**
Returns full training detail including structure, resources, versions, prerequisites, and completion rules.

**Access**
- `EMPLOYEE` — published training only
- `ADMIN` / `HR` — all states

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "training_id": "uuid",
    "training_code": "TRN-001",
    "training_type": "COURSE",
    "title": "Workplace Safety",
    "description": "Annual mandatory safety training.",
    "category": "Compliance",
    "difficulty_level": "BEGINNER",
    "is_mandatory": true,
    "requires_approval": false,
    "lifecycle_state": "PUBLISHED",
    "estimated_duration_minutes": 45,
    "validity_period_days": 365,
    "current_version_no": 2,
    "completion_mode": "ALL_RESOURCES",
    "tags": ["safety", "compliance"],
    "prerequisites": [
      { "training_id": "uuid", "title": "Basic Orientation", "is_completed": false }
    ],
    "resources": [
      {
        "resource_id": "uuid",
        "resource_type": "VIDEO",
        "resource_title": "Safety Introduction",
        "sequence_no": 1,
        "is_required": true,
        "estimated_duration_minutes": 15
      }
    ],
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-06-01T00:00:00Z"
  }
}
```

**Error Responses**

| HTTP | Error Code | Condition |
|---|---|---|
| 404 | `TRAINING_NOT_FOUND` | Training ID does not exist |
| 403 | `ACCESS_DENIED` | Employee attempts to access Draft/Inactive training |
| 403 | `PREREQUISITE_NOT_MET` | Prerequisites not complete (blocks resource access, not detail view) |

---

### 2.3 Create Training

**Endpoint**
```
POST /api/v1/trainings
```

**Purpose**
Creates a new training item in Draft state. No version created until publish.

**Access**
- `ADMIN` only

**Request Body**
```json
{
  "training_type": "COURSE",
  "title": "Workplace Safety",
  "description": "Annual mandatory safety training.",
  "category": "Compliance",
  "difficulty_level": "BEGINNER",
  "is_mandatory": true,
  "requires_approval": false,
  "issue_certificate": false,
  "estimated_duration_minutes": 45,
  "validity_period_days": 365,
  "completion_mode": "ALL_RESOURCES",
  "tags": ["safety", "compliance"],
  "prerequisite_training_ids": ["uuid-1"]
}
```

**Validation Rules**
- `training_type` required
- `title` required, max 255 chars
- `category` required
- `completion_mode`: `ALL_RESOURCES` / `ADMIN_OVERRIDE` / `MIXED`
- `validity_period_days`: positive integer or null

**Response: 201 Created**
```json
{
  "success": true,
  "data": {
    "training_id": "uuid",
    "training_code": "TRN-042",
    "lifecycle_state": "DRAFT",
    "current_version_no": 0,
    "created_at": "2026-04-06T10:00:00Z"
  },
  "message": "Training created as Draft.",
  "errors": []
}
```

**Side Effects**
- Audit event `TRAINING_CREATED` emitted

---

### 2.4 Update Training

**Endpoint**
```
PUT /api/v1/trainings/{training_id}
```

**Purpose**
Updates a Draft or Published training. Updating a Published training saves changes but does not create a new version until re-published.

**Access**
- `ADMIN` only

**Request Body**
Same fields as Create (all optional — send only changed fields).

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "training_id": "uuid",
    "lifecycle_state": "DRAFT",
    "has_unpublished_changes": true,
    "updated_at": "2026-04-06T10:00:00Z"
  },
  "message": "Training updated. Publish to create a new version.",
  "errors": []
}
```

**Error Responses**

| HTTP | Error Code | Condition |
|---|---|---|
| 404 | `TRAINING_NOT_FOUND` | Training not found |
| 409 | `TRAINING_INACTIVE` | Cannot update inactive training |
| 403 | `ACCESS_DENIED` | Non-admin user |

---

### 2.5 Publish Training

**Endpoint**
```
POST /api/v1/trainings/{training_id}/publish
```

**Purpose**
Publishes a Draft training (version 1) or re-publishes an updated Published training (increments version). Makes training visible in catalog and assignable.

**Access**
- `ADMIN` only

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "training_id": "uuid",
    "lifecycle_state": "PUBLISHED",
    "version_no": 2,
    "published_at": "2026-04-06T10:00:00Z"
  },
  "message": "Training published. Version 2 is now active.",
  "errors": []
}
```

**Error Responses**

| HTTP | Error Code | Condition |
|---|---|---|
| 400 | `NO_RESOURCES_ATTACHED` | Cannot publish training with no resources |
| 409 | `ALREADY_PUBLISHED_NO_CHANGES` | No changes since last publish |
| 403 | `ACCESS_DENIED` | Non-admin user |

**Side Effects**
- Audit event `TRAINING_PUBLISHED` emitted
- Audit event `TRAINING_VERSION_CREATED` emitted

---

### 2.6 Inactivate Training

**Endpoint**
```
POST /api/v1/trainings/{training_id}/inactivate
```

**Purpose**
Marks training as Inactive (retired). Existing active assignments remain completable. No new assignments allowed.

**Access**
- `ADMIN` only

**Request Body**
```json
{
  "reason": "Replaced by updated version TRN-043"
}
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "training_id": "uuid",
    "lifecycle_state": "INACTIVE",
    "active_assignment_count": 12,
    "inactivated_at": "2026-04-06T10:00:00Z"
  },
  "message": "Training inactivated. 12 active assignments can still be completed.",
  "errors": []
}
```

**Side Effects**
- Audit event `TRAINING_INACTIVATED` emitted

---

### 2.6A Archive Training

**Endpoint**
```
POST /api/v1/trainings/{training_id}/archive
```

**Purpose**
Archives a Draft or Published training. Archived training is hidden from the catalog and cannot be assigned. Unlike Inactivate, archiving is reversible via Restore.

**Access**
- `ADMIN` only

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "training_id": "uuid",
    "lifecycle_state": "ARCHIVED",
    "archived_at": "2026-04-06T10:00:00Z"
  },
  "message": "Training archived.",
  "errors": []
}
```

**Error Responses**

| HTTP | Error Code | Condition |
|---|---|---|
| 409 | `TRAINING_INACTIVE` | Cannot archive an INACTIVE training |
| 403 | `ACCESS_DENIED` | Non-admin user |

**Side Effects**
- Audit event `TRAINING_ARCHIVED` emitted

---

### 2.6B Restore Training

**Endpoint**
```
POST /api/v1/trainings/{training_id}/restore
```

**Purpose**
Restores an Archived training back to Draft state, making it editable and re-publishable.

**Access**
- `ADMIN` only

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "training_id": "uuid",
    "lifecycle_state": "DRAFT",
    "restored_at": "2026-04-06T10:00:00Z"
  },
  "message": "Training restored to Draft.",
  "errors": []
}
```

**Error Responses**

| HTTP | Error Code | Condition |
|---|---|---|
| 409 | `NOT_ARCHIVED` | Training is not in ARCHIVED state |
| 403 | `ACCESS_DENIED` | Non-admin user |

**Side Effects**
- Audit event `TRAINING_RESTORED` emitted

---

### 2.7 Clone Training

**Endpoint**
```
POST /api/v1/trainings/{training_id}/clone
```

**Purpose**
Creates a new Draft training copying all structure, resources, settings, prerequisites, and validity period from the source. New training gets a new `training_code` and starts at version 0 (no version until published).

**Access**
- `ADMIN` only

**Request Body**
```json
{
  "title": "Workplace Safety 2026"
}
```

**Response: 201 Created**
```json
{
  "success": true,
  "data": {
    "new_training_id": "uuid",
    "new_training_code": "TRN-043",
    "source_training_id": "uuid",
    "lifecycle_state": "DRAFT",
    "title": "Workplace Safety 2026"
  },
  "message": "Training cloned as Draft.",
  "errors": []
}
```

**Side Effects**
- Audit event `TRAINING_CLONED` emitted

---

### 2.8 Get Training Versions

**Endpoint**
```
GET /api/v1/trainings/{training_id}/versions
```

**Purpose**
Returns version history for a training item.

**Access**
- `ADMIN` / `HR`

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "version_id": "uuid",
        "version_no": 2,
        "version_label": "v2",
        "change_summary": "Updated video resource and added quiz.",
        "is_current": true,
        "published_at": "2026-01-01T00:00:00Z",
        "created_by": "uuid"
      }
    ]
  }
}
```

---

### 2.9 Get Training Structure

**Endpoint**
```
GET /api/v1/trainings/{training_id}/structure
```

**Purpose**
Returns the full nested structure — child training items for Learning Paths and Curriculums.

**Access**
- `ADMIN` / `HR` — all states
- `EMPLOYEE` — published only

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "training_id": "uuid",
    "training_type": "CURRICULUM",
    "title": "New Employee Onboarding",
    "children": [
      {
        "training_id": "uuid",
        "training_type": "LEARNING_PATH",
        "title": "HR Policies",
        "sequence_no": 1,
        "children": [
          {
            "training_id": "uuid",
            "training_type": "COURSE",
            "title": "Code of Conduct",
            "sequence_no": 1
          }
        ]
      }
    ]
  }
}
```

---

### 2.10 Update Training Structure

**Endpoint**
```
PUT /api/v1/trainings/{training_id}/structure
```

**Purpose**
Updates the composition and ordering of child items within a Learning Path or Curriculum.

**Access**
- `ADMIN` only

**Request Body**
```json
{
  "children": [
    { "training_id": "uuid", "sequence_no": 1 },
    { "training_id": "uuid", "sequence_no": 2 }
  ]
}
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": { "updated_at": "2026-04-06T10:00:00Z" },
  "message": "Structure updated.",
  "errors": []
}
```

---

### 2.11 Export Training Catalog

**Endpoint**
```
POST /api/v1/trainings/export
```

**Purpose**
Creates async Excel export of the training catalog with applied filters.

**Access**
- `ADMIN` / `HR`

**Request Body**
```json
{
  "format": "excel",
  "filters": {
    "lifecycle_state": "PUBLISHED",
    "is_mandatory": true,
    "category": "Compliance"
  }
}
```

**Response: 202 Accepted**
```json
{
  "success": true,
  "data": { "job_id": "uuid", "status": "PENDING" },
  "message": "Export job created."
}
```

---

### 2.12 Download Training Export

**Endpoint**
```
GET /api/v1/trainings/export/{job_id}/download
```

**Access**
- Job creator or `ADMIN`

**Response: 200 OK**
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

---

### 2.13 Get Training Assignments (Viewer)

**Endpoint**
```
GET /api/v1/trainings/{training_id}/assignments
```

**Purpose**
Returns a read-only list of all assignments for a training item. Used by the Assignments viewer modal on the Admin Training Management list (Screen 22).

**Access**
- `ADMIN` only

**Query Parameters**

| Parameter | Type | Description |
|---|---|---|
| `page` | integer | Default: 1 |
| `size` | integer | Default: 20, max: 100 |
| `status` | string | Filter by assignment status |

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "assignment_id": "uuid",
        "user_id": "uuid",
        "employee_name": "Jane Smith",
        "department": "Engineering",
        "assignment_status": "IN_PROGRESS",
        "progress_percent": 60,
        "due_date": "2026-06-01",
        "assigned_at": "2026-01-15T10:00:00Z"
      }
    ],
    "page": 1,
    "size": 20,
    "total": 45,
    "has_next": true
  }
}
```

---

## 3. Resource Endpoints

---

### 3.1 List Training Resources

**Endpoint**
```
GET /api/v1/trainings/{training_id}/resources
```

**Purpose**
Returns ordered resources linked to a training item.

**Access**
- `ADMIN` — any state
- `EMPLOYEE` — must have active assignment for this training

---

### 3.2 Create Resource Reference

**Endpoint**
```
POST /api/v1/resources
```

**Purpose**
Creates LMS resource metadata. For file-backed types (VIDEO, PDF, SCORM, DOCUMENT) links to an OneDrive file. For LINK type supplies a URL. For SESSION type links to a session ID. For ASSESSMENT type, the resource shell is created here; questions are added via separate endpoints.

**Access**
- `ADMIN` only

**Request Body**
```json
{
  "training_item_id": "uuid",
  "resource_type": "VIDEO",
  "resource_title": "Safety Introduction",
  "resource_description": "15-minute intro video.",
  "external_file_id": "onedrive-file-id",
  "external_link": null,
  "session_id": null,
  "sequence_no": 1,
  "is_required": true,
  "is_sequential_locked": false,
  "estimated_duration_minutes": 15
}
```

**Validation Rules**
- `resource_type`: `VIDEO` / `PDF` / `DOCUMENT` / `LINK` / `SESSION` / `ASSESSMENT`
  - *(SCORM deferred — not in Phase 1)*
- `external_file_id` required for `VIDEO`, `PDF`, `DOCUMENT`
- `external_link` required for `LINK`
- `session_id` required for `SESSION`
- `ASSESSMENT` requires no file — assessment config added via `POST /api/v1/resources/{id}/assessment`

**Response: 201 Created**

**Side Effects**
- Audit event `TRAINING_RESOURCE_ADDED` emitted

---

### 3.3 Update Resource Reference

**Endpoint**
```
PUT /api/v1/resources/{resource_id}
```

**Access**
- `ADMIN` only

---

### 3.4 Delete Resource Reference

**Endpoint**
```
DELETE /api/v1/resources/{resource_id}
```

**Access**
- `ADMIN` only

**Side Effects**
- Audit event `TRAINING_RESOURCE_REMOVED` emitted
- Existing progress records for this resource preserved in history

---

### 3.5 Reorder Training Resources

**Endpoint**
```
PATCH /api/v1/trainings/{training_id}/resources/reorder
```

**Access**
- `ADMIN` only

**Request Body**
```json
{
  "resource_order": [
    { "resource_id": "uuid", "sequence_no": 1 },
    { "resource_id": "uuid", "sequence_no": 2 }
  ]
}
```

---

### 3.6 Get Resource Access Metadata

**Endpoint**
```
GET /api/v1/resources/{resource_id}
```

**Purpose**
Returns resource metadata and secured OneDrive reference for streaming/viewing. Only accessible if user has active assignment for parent training.

**Access**
- `EMPLOYEE` — must have active assignment for parent training
- `ADMIN` — always accessible

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "resource_id": "uuid",
    "resource_type": "VIDEO",
    "resource_title": "Safety Introduction",
    "file_name": "safety_intro.mp4",
    "reference_url": "https://onedrive.live.com/...",
    "access_mode": "STREAM_ONLY",
    "estimated_duration_minutes": 15
  }
}
```

**Error Responses**

| HTTP | Error Code | Condition |
|---|---|---|
| 403 | `NO_ACTIVE_ASSIGNMENT` | User has no active assignment for parent training |
| 403 | `PREREQUISITE_NOT_MET` | Parent training prerequisites not complete |

---

### 3.6A Get / Update Assessment Config

**Endpoint**
```
GET  /api/v1/resources/{resource_id}/assessment
PUT  /api/v1/resources/{resource_id}/assessment
```

**Purpose**
Retrieves or updates the assessment configuration (settings + questions) for an ASSESSMENT-type resource.

**Access**
- `GET`: `ADMIN` (any state); `EMPLOYEE` with active assignment (published only, no questions shown — settings only for time limit display)
- `PUT`: `ADMIN` only

**PUT Request Body**
```json
{
  "passing_score_percent": 70,
  "max_attempts": 3,
  "time_limit_minutes": 20,
  "randomize_questions": true,
  "randomize_options": true,
  "show_correct_answers_on_pass": true,
  "questions": [
    {
      "question_id": "uuid",
      "question_text": "What is the emergency exit procedure?",
      "question_type": "MCQ",
      "points": 1,
      "sequence_no": 1,
      "options": [
        { "option_id": "uuid", "option_text": "Use the nearest exit", "is_correct": true },
        { "option_id": "uuid", "option_text": "Use the main entrance", "is_correct": false },
        { "option_id": "uuid", "option_text": "Wait for instructions", "is_correct": false },
        { "option_id": "uuid", "option_text": "Call a colleague", "is_correct": false }
      ]
    }
  ]
}
```

**Validation Rules**
- `passing_score_percent`: 1–100
- `max_attempts`: 0 (unlimited) or positive integer
- `question_type`: `MCQ` / `MSQ` / `TRUE_FALSE`
- MCQ and TRUE_FALSE: exactly one `is_correct = true` option
- MSQ: one or more `is_correct = true` options
- Minimum 2 options per question; maximum 6

**Response: 200 OK**

---

### 3.6B Submit Assessment Attempt

**Endpoint**
```
POST /api/v1/resources/{resource_id}/assessment/attempts
```

**Purpose**
Employee submits answers for an assessment. System grades immediately and returns result.

**Access**
- `EMPLOYEE` + SELF_ONLY; must have active assignment for parent training

**Request Body**
```json
{
  "assignment_id": "uuid",
  "time_taken_seconds": 840,
  "responses": [
    {
      "question_id": "uuid",
      "selected_option_ids": ["uuid"]
    }
  ]
}
```

**Validation Rules**
- Must have active assignment
- Attempt count must not exceed `max_attempts` (if > 0)
- `time_taken_seconds` must be ≤ `time_limit_minutes * 60` if time limit set

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "attempt_id": "uuid",
    "attempt_no": 2,
    "score_percent": 75.0,
    "passed": true,
    "passing_score_percent": 70,
    "attempts_used": 2,
    "max_attempts": 3,
    "attempts_remaining": 1,
    "correct_answers_shown": true,
    "question_results": [
      {
        "question_id": "uuid",
        "is_correct": true,
        "correct_option_ids": ["uuid"],
        "selected_option_ids": ["uuid"]
      }
    ],
    "resource_completed": true
  }
}
```

**Error Responses**

| HTTP | Error Code | Condition |
|---|---|---|
| 403 | `NO_ACTIVE_ASSIGNMENT` | No active assignment for parent training |
| 409 | `MAX_ATTEMPTS_EXCEEDED` | All attempts used up |
| 409 | `ALREADY_PASSED` | Employee already passed this assessment |

**Side Effects**
- Audit event `ASSESSMENT_ATTEMPT_SUBMITTED` emitted
- If `passed = true`: resource progress updated to COMPLETED; course completion evaluated
- If attempts exhausted without passing: audit event `ASSESSMENT_ATTEMPTS_EXHAUSTED` emitted

---

### 3.6C Get Assessment Attempt History

**Endpoint**
```
GET /api/v1/resources/{resource_id}/assessment/attempts
```

**Purpose**
Returns all assessment attempts for the current employee (or any user for Admin).

**Access**
- `EMPLOYEE` + SELF_ONLY
- `ADMIN` — query param `user_id` to view any user's attempts

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "attempt_id": "uuid",
        "attempt_no": 1,
        "score_percent": 55.0,
        "passed": false,
        "submitted_at": "2026-04-06T10:00:00Z",
        "time_taken_seconds": 720
      }
    ],
    "attempts_used": 1,
    "max_attempts": 3,
    "best_score_percent": 55.0,
    "passed": false
  }
}
```

---

### 3.6D Reset Assessment Attempts (Admin)

**Endpoint**
```
POST /api/v1/resources/{resource_id}/assessment/attempts/reset
```

**Purpose**
Admin resets a specific employee's attempt counter, allowing them to retake the assessment.

**Access**
- `ADMIN` only

**Request Body**
```json
{
  "user_id": "uuid",
  "assignment_id": "uuid",
  "reason": "Employee had technical issues during attempt 3"
}
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "resource_id": "uuid",
    "previous_attempts": 3,
    "attempts_now": 0,
    "reset_at": "2026-04-06T10:00:00Z"
  },
  "message": "Attempts reset. Employee can retake the assessment."
}
```

**Side Effects**
- Audit event `ASSESSMENT_ATTEMPTS_RESET` emitted
- Previous attempt records preserved — not deleted

---

### 3.7 Track Resource Progress

**Endpoint**
```
POST /api/v1/resources/{resource_id}/progress
```

**Purpose**
Records learner progress on a resource. Called by the resource player as the user progresses.

**Access**
- `EMPLOYEE` + SELF_ONLY

**Request Body**
```json
{
  "assignment_id": "uuid",
  "status": "IN_PROGRESS",
  "progress_percent": 60
}
```

**Validation Rules**
- `status`: `NOT_STARTED` / `IN_PROGRESS` / `COMPLETED`
- `progress_percent`: 0–100
- When `status = COMPLETED` and `progress_percent = 100`: triggers course completion evaluation

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "resource_id": "uuid",
    "progress_status": "IN_PROGRESS",
    "progress_percent": 60,
    "course_completion_triggered": false
  }
}
```

---

## 4. Certificate Endpoints

---

### 4.1 List My Certificates

**Endpoint**
```
GET /api/v1/certificates/me
```

**Access**
- `EMPLOYEE` + SELF_ONLY

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "certificate_id": "uuid",
        "certificate_no": "CERT-2026-001",
        "training_title": "Workplace Safety",
        "issued_at": "2026-01-15T10:00:00Z",
        "status": "APPROVED",
        "rejection_reason": null,
        "validity_period_days": 365,
        "expires_at": "2027-01-15T10:00:00Z",
        "is_expired": false
      }
    ]
  }
}
```

---

### 4.2 Get Certificate Detail

**Endpoint**
```
GET /api/v1/certificates/{certificate_id}
```

**Access**
- `SELF_ONLY`
- `ADMIN` / `HR` — ORG_WIDE
- `TEAM_ONLY` — manager visibility of direct reports

---

### 4.3 Download Certificate

**Endpoint**
```
GET /api/v1/certificates/{certificate_id}/download
```

**Purpose**
Downloads the PDF certificate file.

**Access**
- `SELF_ONLY`
- `ADMIN` / `HR` — ORG_WIDE
- `TEAM_ONLY` — manager visibility

**Response: 200 OK**
- Content-Type: `application/pdf`

---

### 4.4 Approve Certificate

**Endpoint**
```
POST /api/v1/certificates/{certificate_id}/approve
```

**Purpose**
Admin approves a PENDING_APPROVAL certificate. Unlocks the Download button for the employee and sends an approval notification.

**Access**
- `ADMIN` only

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "certificate_id": "uuid",
    "status": "APPROVED",
    "approved_at": "2026-04-06T10:00:00Z"
  },
  "message": "Certificate approved. Employee can now download it.",
  "errors": []
}
```

**Error Responses**

| HTTP | Error Code | Condition |
|---|---|---|
| 404 | `CERTIFICATE_NOT_FOUND` | Certificate ID does not exist |
| 409 | `CERTIFICATE_NOT_PENDING` | Certificate is not in PENDING_APPROVAL state |
| 403 | `ACCESS_DENIED` | Non-admin user |

**Side Effects**
- Certificate `status` updated to `APPROVED`
- Notification dispatched to employee: certificate approved and available for download
- Audit event `CERTIFICATE_APPROVED` emitted

---

### 4.5 Reject Certificate

**Endpoint**
```
POST /api/v1/certificates/{certificate_id}/reject
```

**Purpose**
Admin rejects a PENDING_APPROVAL certificate with a mandatory reason. Employee is notified; download remains locked; employee sees a Re-attempt link.

**Access**
- `ADMIN` only

**Request Body**
```json
{
  "rejection_reason": "Certificate requires re-verification of completion evidence."
}
```

**Validation Rules**
- `rejection_reason` required, non-empty (BR-45)

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "certificate_id": "uuid",
    "status": "REJECTED",
    "rejection_reason": "Certificate requires re-verification of completion evidence.",
    "rejected_at": "2026-04-06T10:00:00Z"
  },
  "message": "Certificate rejected. Employee has been notified.",
  "errors": []
}
```

**Error Responses**

| HTTP | Error Code | Condition |
|---|---|---|
| 400 | `REJECTION_REASON_REQUIRED` | rejection_reason is empty or missing |
| 404 | `CERTIFICATE_NOT_FOUND` | Certificate ID does not exist |
| 409 | `CERTIFICATE_NOT_PENDING` | Certificate is not in PENDING_APPROVAL state |
| 403 | `ACCESS_DENIED` | Non-admin user |

**Side Effects**
- Certificate `status` updated to `REJECTED`; `rejection_reason` stored
- Notification dispatched to employee with the rejection reason and Re-attempt link (BR-45)
- Audit event `CERTIFICATE_REJECTED` emitted

---

## 5. Audit Event Codes Reference

| Event Code | Trigger |
|---|---|
| `TRAINING_CREATED` | POST /trainings |
| `TRAINING_PUBLISHED` | POST /trainings/{id}/publish |
| `TRAINING_INACTIVATED` | POST /trainings/{id}/inactivate |
| `TRAINING_CLONED` | POST /trainings/{id}/clone |
| `TRAINING_VERSION_CREATED` | On publish of changed training |
| `TRAINING_RESOURCE_ADDED` | POST /resources |
| `TRAINING_RESOURCE_REMOVED` | DELETE /resources/{id} |
| `TRAINING_COMPLETED` | Resource progress triggers completion |
| `CERTIFICATE_ISSUED` | On training completion |
| `CERTIFICATE_APPROVED` | POST /certificates/{id}/approve |
| `CERTIFICATE_REJECTED` | POST /certificates/{id}/reject |
| `TRAINING_ARCHIVED` | POST /trainings/{id}/archive |
| `TRAINING_RESTORED` | POST /trainings/{id}/restore |
| `ASSESSMENT_ATTEMPT_SUBMITTED` | POST /resources/{id}/assessment/attempts |
| `ASSESSMENT_ATTEMPTS_EXHAUSTED` | All attempts used without passing |
| `ASSESSMENT_ATTEMPTS_RESET` | POST /resources/{id}/assessment/attempts/reset |
| `TRAINING_COMPLETION_EXPIRED` | Background job — validity_period_days exceeded |

---

## 6. Cross-Check Notes

Verified against:
- `03_training_management.md` — all functional requirements covered including Assessment resource type
- `01_api_list.md` §9, §10, §16 — all endpoints present

**Additions vs master API list (derived from spec + enterprise review):**
- `POST /trainings/{id}/clone` — training clone (T9)
- `POST /trainings/export` + download — catalog export (T13)
- `prerequisites` in training detail response (T3)
- `validity_period_days` and `expires_at` in certificate response (T4)
- `estimated_duration_minutes` on training and resource (T6)
- `PREREQUISITE_NOT_MET` error on resource access (T3)
- `course_completion_triggered` flag in progress response
- `is_sequential_locked` on resource create (sequential lock feature)
- `GET/PUT /resources/{id}/assessment` — assessment config management (new)
- `POST /resources/{id}/assessment/attempts` — submit attempt with immediate grading (new)
- `GET /resources/{id}/assessment/attempts` — attempt history (new)
- `POST /resources/{id}/assessment/attempts/reset` — admin attempt reset (new)
- `ASSESSMENT` added to `resource_type` enum
- `SCORM` removed from `resource_type` enum — deferred to Phase 2 (not in Phase 1 scope per product decision)
