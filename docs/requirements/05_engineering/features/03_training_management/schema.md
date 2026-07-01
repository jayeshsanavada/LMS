# Training Management — Database Schema

---

## 1. Design Principles

- LMS owns training structure and metadata — files live in OneDrive
- Training records never hard-deleted — lifecycle state used instead
- Completions and certificates are permanent — never deleted
- Versioning: new version only on re-publish of a changed published training
- Prerequisite and validity period data stored per training item

---

## 2. Common Columns Standard

| Column | Type | Purpose |
|---|---|---|
| `id` | UUID | Primary key |
| `created_at` | TIMESTAMP | Record creation time |
| `created_by` | UUID (FK → users.id) | Actor who created |
| `updated_at` | TIMESTAMP | Last update time |
| `updated_by` | UUID (FK → users.id) | Actor who last updated |
| `is_active` | BOOLEAN | Active / inactive flag |

---

## 3. Tables Owned by Training Management Module

---

### Table: `training_items`

**Purpose**
Stores all training entities: Courses, Learning Paths, and Curriculums. Single table for all types — `training_type` discriminates.

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `training_code` | VARCHAR(50) | No | Unique auto-generated code (e.g. TRN-001) |
| `training_type` | VARCHAR(50) | No | `COURSE` / `LEARNING_PATH` / `CURRICULUM` |
| `title` | VARCHAR(255) | No | |
| `description` | TEXT | Yes | |
| `category` | VARCHAR(100) | No | Required |
| `difficulty_level` | VARCHAR(50) | Yes | `BEGINNER` / `INTERMEDIATE` / `ADVANCED` |
| `is_mandatory` | BOOLEAN | No | Default false |
| `requires_approval` | BOOLEAN | No | Default false — self-enrollment needs approval |
| `issue_certificate` | BOOLEAN | No | Default false — when true, certificate generated on completion; certificate requires admin approval before employee can download |
| `is_probation_gateway` | BOOLEAN | No | Default false — when true, eligible to be targeted by EMPLOYMENT_PHASE assignment rules as a probation gate training |
| `lifecycle_state` | VARCHAR(50) | No | `DRAFT` / `PUBLISHED` / `ARCHIVED` / `INACTIVE` |
| `estimated_duration_minutes` | INTEGER | Yes | Optional; displayed to learner |
| `validity_period_days` | INTEGER | Yes | Null = permanent completion; positive int = expiry |
| `completion_mode` | VARCHAR(50) | No | `ALL_RESOURCES` / `ADMIN_OVERRIDE` / `MIXED` |
| `current_version_no` | INTEGER | No | 0 = never published; increments on each publish |
| `has_unpublished_changes` | BOOLEAN | No | True when edited after last publish |
| `cloned_from_id` | UUID | Yes | FK → `training_items.id` if cloned |
| `created_at` | TIMESTAMP | No | |
| `created_by` | UUID | No | FK → `users.id` |
| `updated_at` | TIMESTAMP | No | |
| `updated_by` | UUID | No | FK → `users.id` |

**Business Rules**
- `training_code` must be unique
- Only `PUBLISHED` training is assignable
- `lifecycle_state = INACTIVE` training is not assignable but existing assignments remain completable
- `validity_period_days = null` means completion never expires
- Draft edits do not increment `current_version_no` — only publish does
- `has_unpublished_changes = true` when edited after last publish; reset to false on publish

**Indexes**
- `training_code` (unique)
- `lifecycle_state` (filter)
- `training_type` (filter)
- `is_mandatory` (filter)
- `category` (filter)

---

### Table: `training_versions`

**Purpose**
Stores version history of each training item. A new row is created only when a Published training is updated and re-published.

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `training_item_id` | UUID | No | FK → `training_items.id` |
| `version_no` | INTEGER | No | Increments on each publish |
| `version_label` | VARCHAR(100) | Yes | e.g. "v2" |
| `change_summary` | TEXT | Yes | Admin-provided description of changes |
| `is_current` | BOOLEAN | No | True for the active version |
| `published_at` | TIMESTAMP | No | |
| `created_by` | UUID | No | FK → `users.id` |
| `created_at` | TIMESTAMP | No | |

**Business Rules**
- One current version per training item (`is_current = true`)
- Assignments reference a specific `version_id` — not affected by new versions
- Old versions never deleted

**Indexes**
- `(training_item_id, is_current)` (current version lookup)
- `(training_item_id, version_no)` (version history)

---

### Table: `training_tags`

**Purpose**
Stores reusable tag definitions for training discovery.

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `tag_name` | VARCHAR(100) | No | Unique |
| `created_at` | TIMESTAMP | No | |

**Indexes**
- `tag_name` (unique)

---

### Table: `training_item_tags`

**Purpose**
Many-to-many mapping between training items and tags.

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `training_item_id` | UUID | No | FK → `training_items.id` |
| `tag_id` | UUID | No | FK → `training_tags.id` |

**Indexes**
- `(training_item_id, tag_id)` (unique — no duplicate tags per training)

---

### Table: `training_structure_links`

**Purpose**
Represents the parent-child hierarchy between training items:
- Curriculum → Learning Path
- Learning Path → Course

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `parent_training_id` | UUID | No | FK → `training_items.id` |
| `child_training_id` | UUID | No | FK → `training_items.id` |
| `sequence_no` | INTEGER | No | Ordering within parent |
| `is_required` | BOOLEAN | No | False = optional for parent completion |
| `created_at` | TIMESTAMP | No | |

**Business Rules**
- `parent_training_id` must be `LEARNING_PATH` or `CURRICULUM`
- `child_training_id` must be `COURSE` (under Learning Path) or `LEARNING_PATH` (under Curriculum)
- Circular references must be prevented at application layer

**Indexes**
- `(parent_training_id, sequence_no)` (ordered structure fetch)
- `child_training_id` (reverse lookup)

---

### Table: `training_prerequisites`

**Purpose**
Stores prerequisite relationships between training items. A user must complete all prerequisites before accessing the target training.

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `training_item_id` | UUID | No | FK → `training_items.id` (the training requiring prerequisites) |
| `prerequisite_training_id` | UUID | No | FK → `training_items.id` (must be completed first) |
| `created_at` | TIMESTAMP | No | |
| `created_by` | UUID | No | FK → `users.id` |

**Business Rules**
- A training can have multiple prerequisites
- Circular prerequisite chains must be prevented at application layer
- Prerequisite check is per-user — based on their completion records

**Indexes**
- `training_item_id` (load prerequisites for a training)
- `prerequisite_training_id` (reverse lookup — which trainings depend on this)

---

### Table: `training_completion_rules`

**Purpose**
Stores completion logic per training version.

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `training_item_id` | UUID | No | FK → `training_items.id` |
| `version_id` | UUID | No | FK → `training_versions.id` |
| `completion_mode` | VARCHAR(50) | No | `ALL_RESOURCES` / `ADMIN_OVERRIDE` / `MIXED` |
| `required_resource_count` | INTEGER | Yes | For `MIXED` mode — minimum resources to complete |
| `created_at` | TIMESTAMP | No | |
| `updated_at` | TIMESTAMP | No | |

---

## 4. File Management Tables (Owned by Training Module)

---

### Table: `resource_files`

**Purpose**
Stores LMS-side metadata for OneDrive-backed resource files. LMS never stores the actual file — only the reference.

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `external_file_id` | VARCHAR(255) | No | OneDrive file ID |
| `external_file_version` | VARCHAR(100) | Yes | OneDrive version reference |
| `storage_provider` | VARCHAR(50) | No | Always `ONEDRIVE` in Phase 1 |
| `file_name` | VARCHAR(255) | No | |
| `file_type` | VARCHAR(50) | No | `VIDEO` / `PDF` / `SCORM` / `DOCUMENT` |
| `mime_type` | VARCHAR(100) | Yes | |
| `file_size_bytes` | BIGINT | Yes | |
| `reference_url` | TEXT | No | Secured OneDrive URL |
| `access_mode` | VARCHAR(50) | No | `STREAM_ONLY` / `DOWNLOAD` |
| `created_at` | TIMESTAMP | No | |
| `updated_at` | TIMESTAMP | No | |

**Business Rules**
- LMS stores metadata only — actual files in OneDrive
- `external_file_id` should be unique per storage provider

---

### Table: `training_resources`

**Purpose**
Links resource files (or external URLs) to a specific training version. Each resource has a sequence and is marked required or optional.

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `training_item_id` | UUID | No | FK → `training_items.id` |
| `version_id` | UUID | No | FK → `training_versions.id` |
| `resource_type` | VARCHAR(50) | No | `VIDEO` / `PDF` / `DOCUMENT` / `SCORM` / `LINK` / `SESSION` / `ASSESSMENT` |
| `resource_title` | VARCHAR(255) | No | |
| `resource_description` | TEXT | Yes | |
| `resource_file_id` | UUID | Yes | FK → `resource_files.id`; null for LINK/SESSION types |
| `external_link` | TEXT | Yes | For `LINK` type |
| `session_id` | UUID | Yes | FK → `sessions.id`; for `SESSION` type |
| `sequence_no` | INTEGER | No | Ordering within training |
| `is_required` | BOOLEAN | No | Default true |
| `is_sequential_locked` | BOOLEAN | No | Default false — if true, all preceding required resources must be completed first |
| `estimated_duration_minutes` | INTEGER | Yes | |
| `is_active` | BOOLEAN | No | False = removed from training |
| `created_at` | TIMESTAMP | No | |
| `updated_at` | TIMESTAMP | No | |

**Business Rules**
- Removed resources set `is_active = false` — not hard-deleted (progress history preserved)
- `SESSION` type resources link to `sessions` table

**Indexes**
- `(training_item_id, version_id, sequence_no)` (ordered resource load)
- `(training_item_id, is_active)` (active resources only)

---

## 4A. Assessment Tables

---

### Table: `resource_assessments`

**Purpose**
Stores configuration for ASSESSMENT-type resources. One row per assessment resource.

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `resource_id` | UUID | No | FK → `training_resources.id` (UNIQUE — one config per resource) |
| `passing_score_percent` | DECIMAL(5,2) | No | e.g. 70.00 |
| `max_attempts` | INTEGER | No | 0 = unlimited |
| `time_limit_minutes` | INTEGER | No | 0 = no limit |
| `randomize_questions` | BOOLEAN | No | Default false |
| `randomize_options` | BOOLEAN | No | Default false |
| `show_correct_answers_on_pass` | BOOLEAN | No | Default true |
| `created_at` | TIMESTAMP | No | |
| `updated_at` | TIMESTAMP | No | |

**Business Rules**
- `passing_score_percent` must be between 1 and 100
- `max_attempts = 0` means unlimited retakes

**Indexes**
- `resource_id` (unique)

---

### Table: `assessment_questions`

**Purpose**
Stores questions for an assessment resource.

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `assessment_id` | UUID | No | FK → `resource_assessments.id` |
| `question_text` | TEXT | No | |
| `question_type` | VARCHAR(50) | No | `MCQ` / `MSQ` / `TRUE_FALSE` |
| `points` | INTEGER | No | Default 1 |
| `sequence_no` | INTEGER | No | Display order |
| `is_active` | BOOLEAN | No | Default true; false = soft-deleted |
| `created_at` | TIMESTAMP | No | |
| `updated_at` | TIMESTAMP | No | |

**Business Rules**
- `MCQ` and `TRUE_FALSE`: exactly one option with `is_correct = true`
- `MSQ`: one or more options with `is_correct = true`
- Minimum 2 options; maximum 6 options per question
- Deleted questions (`is_active = false`) preserved for historical attempt accuracy

**Indexes**
- `(assessment_id, sequence_no)` (ordered question load)
- `assessment_id, is_active` (active questions only)

---

### Table: `assessment_options`

**Purpose**
Stores answer options for each assessment question.

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `question_id` | UUID | No | FK → `assessment_questions.id` |
| `option_text` | VARCHAR(500) | No | |
| `is_correct` | BOOLEAN | No | |
| `sequence_no` | INTEGER | No | Display order |
| `is_active` | BOOLEAN | No | Default true |
| `created_at` | TIMESTAMP | No | |

**Indexes**
- `question_id` (load options for question)

---

### Table: `assessment_attempts`

**Purpose**
Records each employee attempt at an assessment. Permanent — never deleted.

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `resource_id` | UUID | No | FK → `training_resources.id` |
| `user_id` | UUID | No | FK → `users.id` |
| `assignment_id` | UUID | No | FK → `assignments.id` |
| `attempt_no` | INTEGER | No | Sequential per user per resource (1, 2, 3…) |
| `score_percent` | DECIMAL(5,2) | No | Achieved score |
| `passed` | BOOLEAN | No | score_percent >= passing_score_percent |
| `time_taken_seconds` | INTEGER | Yes | |
| `submitted_at` | TIMESTAMP | No | |
| `created_at` | TIMESTAMP | No | |

**Business Rules**
- Records are permanent — cannot be deleted
- `attempt_no` increments per `(user_id, resource_id)` — not reset by Admin reset (reset only allows new attempts; old records kept)
- `passed = true` on first pass triggers resource completion

**Indexes**
- `(user_id, resource_id)` (attempt history lookup)
- `(assignment_id, resource_id)` (assignment-scoped lookup)

---

### Table: `assessment_responses`

**Purpose**
Stores per-question responses for each attempt. Used for result display and audit.

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `attempt_id` | UUID | No | FK → `assessment_attempts.id` |
| `question_id` | UUID | No | FK → `assessment_questions.id` |
| `selected_option_ids` | UUID[] | No | Array of selected option IDs |
| `is_correct` | BOOLEAN | No | Graded at submit time |
| `created_at` | TIMESTAMP | No | |

**Business Rules**
- Responses written once at submission — not updatable
- Graded immediately at submission using correct options at time of attempt

**Indexes**
- `attempt_id` (load all responses for an attempt)

---

## 5. Progress and Completion Tables

---

### Table: `resource_progress`

**Purpose**
Tracks per-user, per-assignment progress on each resource.

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `user_id` | UUID | No | FK → `users.id` |
| `assignment_id` | UUID | No | FK → `assignments.id` |
| `resource_id` | UUID | No | FK → `training_resources.id` |
| `progress_status` | VARCHAR(50) | No | `NOT_STARTED` / `IN_PROGRESS` / `COMPLETED` |
| `progress_percent` | DECIMAL(5,2) | No | 0.00–100.00 |
| `last_accessed_at` | TIMESTAMP | Yes | |
| `completed_at` | TIMESTAMP | Yes | |
| `created_at` | TIMESTAMP | No | |
| `updated_at` | TIMESTAMP | No | |

**Business Rules**
- One row per `(assignment_id, resource_id)` — unique constraint
- `completed_at` set when `progress_status = COMPLETED`
- When all required resources for an assignment are COMPLETED → triggers course completion evaluation

**Indexes**
- `(assignment_id, resource_id)` (unique)
- `(user_id, progress_status)` (filter in-progress)

---

### Table: `training_completions`

**Purpose**
Stores the completion event for a training item per user per assignment. Permanent record — never deleted.

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `user_id` | UUID | No | FK → `users.id` |
| `assignment_id` | UUID | No | FK → `assignments.id` |
| `training_item_id` | UUID | No | FK → `training_items.id` |
| `training_version_id` | UUID | No | FK → `training_versions.id` |
| `completion_source` | VARCHAR(50) | No | `AUTO` / `ADMIN` / `SESSION` |
| `completed_at` | TIMESTAMP | No | |
| `expires_at` | TIMESTAMP | Yes | Null if validity_period_days is null |
| `is_expired` | BOOLEAN | No | Default false; set by background job |
| `created_at` | TIMESTAMP | No | |

**Business Rules**
- One completion row per assignment
- `expires_at` = `completed_at` + `validity_period_days` (calculated at completion time)
- Background job sets `is_expired = true` and triggers new assignment when `expires_at` < today

**Indexes**
- `(user_id, training_item_id)` (user completion lookup)
- `(assignment_id)` (unique)
- `(is_expired, expires_at)` (background job query)

---

### Table: `certificates`

**Purpose**
Stores generated certificate records and file references. Permanent — never deleted.

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `user_id` | UUID | No | FK → `users.id` |
| `training_item_id` | UUID | No | FK → `training_items.id` |
| `training_version_id` | UUID | No | FK → `training_versions.id` |
| `assignment_id` | UUID | Yes | FK → `assignments.id` |
| `completion_id` | UUID | No | FK → `training_completions.id` |
| `status` | VARCHAR(50) | No | `PENDING_APPROVAL` / `APPROVED` / `REJECTED`; default `PENDING_APPROVAL` when issued |
| `rejection_reason` | TEXT | Yes | Populated when status = `REJECTED`; sent to employee as notification |
| `certificate_no` | VARCHAR(100) | No | Unique — e.g. CERT-2026-001 |
| `issued_at` | TIMESTAMP | No | |
| `validity_period_days` | INTEGER | Yes | Snapshot from training at time of issue |
| `expires_at` | TIMESTAMP | Yes | Null if permanent |
| `certificate_file_ref` | TEXT | Yes | OneDrive/storage path to PDF |
| `created_at` | TIMESTAMP | No | |

**Business Rules**
- `certificate_no` must be unique
- Historical certificates remain valid even after training version update or inactivation
- New certificate issued on re-completion after expiry — both certificates retained in history

**Indexes**
- `certificate_no` (unique)
- `user_id` (user certificate list)
- `(training_item_id, user_id)` (training-specific lookup)

---

## 6. Referenced Tables (Owned by Other Modules)

| Table | Owning Module | Used By |
|---|---|---|
| `users` | User Management | `training_completions.user_id`, `certificates.user_id`, `resource_progress.user_id` |
| `assignments` | Assignment Engine | `resource_progress.assignment_id`, `training_completions.assignment_id` |
| `sessions` | Sessions | `training_resources.session_id` |

---

## 7. Enum Values

### `training_type`
- `COURSE`
- `LEARNING_PATH`
- `CURRICULUM`

### `lifecycle_state`
- `DRAFT`
- `PUBLISHED`
- `INACTIVE`
- `ARCHIVED`

### `difficulty_level`
- `BEGINNER`
- `INTERMEDIATE`
- `ADVANCED`

### `completion_mode`
- `ALL_RESOURCES`
- `ADMIN_OVERRIDE`
- `MIXED`

### `resource_type`
- `VIDEO`
- `PDF`
- `DOCUMENT`
- `SCORM` *(Phase 2 — deferred; not implemented in Phase 1)*
- `LINK`
- `SESSION`
- `ASSESSMENT`

### `question_type`
- `MCQ` — multiple choice, single correct answer
- `MSQ` — multiple select, one or more correct answers
- `TRUE_FALSE` — two options, one correct

### `progress_status`
- `NOT_STARTED`
- `IN_PROGRESS`
- `COMPLETED`

### `completion_source`
- `AUTO`
- `ADMIN`
- `SESSION`

---

## 8. Cross-Check Notes

Verified against:
- `03_training_management.md` — all data requirements covered including all 14 enterprise additions
- `02_database_schema.md` §5.3, §5.4 — all master tables present

**Additions vs master schema (derived from spec + enterprise review):**
- `training_items.estimated_duration_minutes` — learner time planning (T6)
- `training_items.validity_period_days` — completion expiry / recertification (T4)
- `training_items.completion_mode` — moved here from `training_completion_rules` for fast access
- `training_items.has_unpublished_changes` — versioning trigger clarity (T8)
- `training_items.cloned_from_id` — clone traceability (T9)
- `training_items.is_probation_gateway` — flags training as eligible for probation rule targeting (BR-P01)
- `training_prerequisites` table (new) — sequential learning prerequisites (T3)
- `training_structure_links.is_required` — optional vs required children for completion rollup (T2)
- `training_resources.session_id` — SESSION type resource link
- `training_resources.estimated_duration_minutes` — per-resource duration
- `training_resources.is_active` — soft-delete for removed resources (T12 edge case)
- `training_resources.is_sequential_locked` — sequential access control per resource
- `training_resources.resource_type` extended — added `DOCUMENT` and `ASSESSMENT`
- `resource_assessments` table (new) — assessment config per ASSESSMENT resource
- `assessment_questions` table (new) — questions with type (MCQ/MSQ/TRUE_FALSE)
- `assessment_options` table (new) — answer options with is_correct flag
- `assessment_attempts` table (new) — permanent per-user attempt records with score/pass result
- `assessment_responses` table (new) — per-question responses per attempt for grading and audit
- `training_completions.expires_at` + `is_expired` — expiry tracking (T4)
- `certificates.completion_id` — completion traceability
- `certificates.validity_period_days` + `expires_at` — certificate expiry display (T4)
