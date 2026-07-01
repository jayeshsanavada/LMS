# Sub-task B1: SQLAlchemy Models + Alembic Migration
# Training Management — Backend Layer 1 of 5

---

## Files to Read BEFORE Writing Code (in this order)

1. `docs/code_generation/modules/_shared.md` — universal patterns (SQLAlchemy 2.x style, UUID PKs, TIMESTAMPTZ)
2. `docs/code_generation/modules/training_management/_module.md` — table ownership, lifecycle states, versioning rules
3. `docs/requirements/05_engineering/features/03_training_management/schema.md` — FULL FILE (621 lines)
4. `docs/requirements/05_engineering/er_diagram.md` — lines 192–430 (Training + Assessment + Progress tables)

---

## Scope

**Generate:**
- SQLAlchemy 2.x models for all 17 tables owned by Training Management
- Alembic migration file (auto-generated from models, reviewed for correctness)

**Do NOT generate:**
- Pydantic schemas (sub-task B2)
- Repository classes (sub-task B3)
- Service layer (sub-task B4)
- Router (sub-task B5)
- Any code for tables not in the list below

---

## Pre-Code Declaration (REQUIRED before writing any code)

Before writing the first line of code, output this table:

```
### PRE-CODE DECLARATION — B1 Models + Migration

#### Files Read
| File | Lines Read | Key Fact |
|---|---|---|
| _shared.md | all | mapped_column() style confirmed; UUID PK; TIMESTAMPTZ |
| _module.md | all | 17 tables confirmed; lifecycle states noted |
| schema.md | all (621 lines) | [column counts per table] |
| er_diagram.md | 192–430 | FK relationships extracted |

#### Schema Column Checklist (fill in from schema.md)
| Table | Total Columns | All Mapped? |
|---|---|---|
| training_items | 20 | Yes / No |
| training_versions | 9 | Yes / No |
| training_tags | 2 | Yes / No |
| training_item_tags | 3 | Yes / No |
| training_structure_links | 5 | Yes / No |
| training_prerequisites | 3 | Yes / No |
| training_resources | 14 | Yes / No |
| training_completion_rules | 4 | Yes / No |
| resource_files | 12 | Yes / No |
| resource_assessments | 5 | Yes / No |
| assessment_questions | 5 | Yes / No |
| assessment_options | 4 | Yes / No |
| assessment_attempts | 10 | Yes / No |
| assessment_responses | 5 | Yes / No |
| resource_progress | [check schema] | Yes / No |
| training_completions | [check schema] | Yes / No |
| certificates | [check schema] | Yes / No |

I confirm all files read. Beginning B1 code generation.
```

---

## Pre-Extracted Schema Reference

### `training_items` table (20 columns)
| Column | Type | Nullable | Notes |
|---|---|---|---|
| id | UUID | NOT NULL | PK, default=uuid4 |
| training_code | VARCHAR | NOT NULL | Auto-generated (e.g. TRN-042), unique |
| training_type | VARCHAR | NOT NULL | COURSE / LEARNING_PATH / CURRICULUM |
| title | VARCHAR(255) | NOT NULL | |
| description | TEXT | NULL | |
| category | VARCHAR | NOT NULL | |
| difficulty_level | VARCHAR | NULL | BEGINNER / INTERMEDIATE / ADVANCED |
| is_mandatory | BOOLEAN | NOT NULL | default=false |
| requires_approval | BOOLEAN | NOT NULL | default=false |
| issue_certificate | BOOLEAN | NOT NULL | default=false |
| is_probation_gateway | BOOLEAN | NOT NULL | default=false |
| lifecycle_state | VARCHAR | NOT NULL | DRAFT/PUBLISHED/INACTIVE/ARCHIVED; default=DRAFT |
| estimated_duration_minutes | INTEGER | NULL | |
| validity_period_days | INTEGER | NULL | null = permanent |
| completion_mode | VARCHAR | NOT NULL | ALL_RESOURCES / ADMIN_OVERRIDE / MIXED |
| current_version_no | INTEGER | NOT NULL | default=0 |
| has_unpublished_changes | BOOLEAN | NOT NULL | default=false |
| cloned_from_id | UUID | NULL | FK → training_items.id |
| created_by | UUID | NOT NULL | FK → users.id |
| updated_by | UUID | NULL | FK → users.id |
| created_at | TIMESTAMPTZ | NOT NULL | server_default=now() |
| updated_at | TIMESTAMPTZ | NOT NULL | server_default=now(), onupdate=now() |

### `training_versions` table (9 columns)
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| training_item_id | UUID | FK → training_items.id |
| version_no | INTEGER | |
| version_label | VARCHAR | e.g. "v2" |
| change_summary | TEXT | NULL |
| is_current | BOOLEAN | |
| published_at | TIMESTAMPTZ | |
| created_by | UUID | FK → users.id |
| created_at | TIMESTAMPTZ | |

### `training_resources` table (14 columns)
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| training_item_id | UUID | FK → training_items.id |
| version_id | UUID | FK → training_versions.id (NULL for draft resources) |
| resource_type | VARCHAR | VIDEO / PDF / DOCUMENT / LINK / SESSION / ASSESSMENT (NOT SCORM — Phase 2) |
| resource_title | VARCHAR | NOT NULL |
| resource_description | TEXT | NULL |
| resource_file_id | UUID | FK → resource_files.id (NULL for non-file types) |
| external_link | TEXT | NULL (only for LINK type) |
| session_id | UUID | FK → sessions.id (NULL unless SESSION type) |
| sequence_no | INTEGER | NOT NULL |
| is_required | BOOLEAN | NOT NULL, default=true |
| is_sequential_locked | BOOLEAN | NOT NULL, default=false |
| estimated_duration_minutes | INTEGER | NULL |
| is_active | BOOLEAN | NOT NULL, default=true (soft delete) |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### `resource_assessments` table (5 columns + assessment config)
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| resource_id | UUID | FK → training_resources.id, unique |
| passing_score_percent | DECIMAL | 1–100 |
| max_attempts | INTEGER | 0=unlimited |
| time_limit_minutes | INTEGER | 0=no limit |
| randomize_questions | BOOLEAN | |
| randomize_options | BOOLEAN | |
| show_correct_answers_on_pass | BOOLEAN | |

### `assessment_questions` table
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| assessment_id | UUID | FK → resource_assessments.id |
| question_text | TEXT | NOT NULL |
| question_type | VARCHAR | MCQ / MSQ / TRUE_FALSE |
| points | INTEGER | default=1 |
| sequence_no | INTEGER | NOT NULL |
| is_active | BOOLEAN | default=true (soft delete) |

### `assessment_options` table
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| question_id | UUID | FK → assessment_questions.id |
| option_text | VARCHAR | NOT NULL |
| is_correct | BOOLEAN | NOT NULL |
| sequence_no | INTEGER | |

### `assessment_attempts` table
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| resource_id | UUID | FK → training_resources.id |
| user_id | UUID | FK → users.id |
| assignment_id | UUID | FK → assignments.id |
| attempt_no | INTEGER | |
| score_percent | DECIMAL | |
| passed | BOOLEAN | |
| time_taken_seconds | INTEGER | |
| submitted_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |

### `certificates` table
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| certificate_no | VARCHAR | Unique, e.g. CERT-2026-001 |
| user_id | UUID | FK → users.id |
| training_item_id | UUID | FK → training_items.id |
| training_version_id | UUID | FK → training_versions.id |
| completion_id | UUID | FK → training_completions.id |
| status | VARCHAR | PENDING_APPROVAL / APPROVED / REJECTED |
| rejection_reason | TEXT | NULL |
| issued_at | TIMESTAMPTZ | |
| approved_at | TIMESTAMPTZ | NULL |
| approved_by | UUID | FK → users.id, NULL |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

---

## Key Rules for Models

1. All PKs: `UUID`, `default=uuid.uuid4` (Python-side — NOT `server_default`)
2. All timestamps: `TIMESTAMPTZ` (import from `sqlalchemy.dialects.postgresql`)
3. Soft delete: use `is_active: Mapped[bool]` — **never** add a hard-delete method
4. FKs to `users.id` for `created_by`, `updated_by`, `approved_by` fields
5. `training_items.cloned_from_id` is a self-referential FK → same table
6. `resource_files` is a separate table (NOT inline in training_resources) — FK referenced from `training_resources.resource_file_id`
7. `resource_type` must exclude `SCORM` — Phase 2 only; use `CheckConstraint` or enum without SCORM
8. `training_structure_links` is the parent-child junction (LP→Course, Curriculum→LP); NOT a recursive `training_items` FK
9. Tag management: `training_tags` (tag dictionary) + `training_item_tags` (junction)

---

## Stop Point

After generating all 17 SQLAlchemy model classes and the Alembic migration file:

Output:
```
✅ B1 Complete — SQLAlchemy Models + Migration
Models generated: [list all 17 class names]
Migration file: [filename]
Total columns mapped: [N]

Reply YES to proceed to B2 (Pydantic Schemas).
```

**STOP. Do not generate B2 until user confirms.**
