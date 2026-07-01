# Training Management — Module Context
# Read this file SECOND (after _shared.md) for any Training Management sub-task

---

## 1. Module Ownership

Training Management owns the following tables. ONLY this module writes to them.

### Core Training Tables
| Table | Purpose |
|---|---|
| `training_items` | Master record for Course / Learning Path / Curriculum |
| `training_versions` | Published version history per training item |
| `training_tags` | Global tag dictionary |
| `training_item_tags` | Junction: training ↔ tags (many-to-many) |
| `training_structure_links` | Parent-child hierarchy (LP contains courses; Curriculum contains LPs) |
| `training_prerequisites` | Prerequisite training per training item |
| `training_resources` | Resources (content items) linked to a training item |
| `training_completion_rules` | Completion mode rules per training version |
| `resource_files` | OneDrive file metadata for file-backed resources |

### Assessment Tables (owned by Training Management)
| Table | Purpose |
|---|---|
| `resource_assessments` | Assessment config (passing score, max attempts, time limit, randomisation) |
| `assessment_questions` | Questions in an assessment |
| `assessment_options` | Answer options per question |
| `assessment_attempts` | Employee attempts at an assessment |
| `assessment_responses` | Per-question responses within an attempt |

### Progress & Completion Tables (owned by Training Management)
| Table | Purpose |
|---|---|
| `resource_progress` | Learner progress per resource per assignment |
| `training_completions` | Training completion records per user |
| `certificates` | Certificate records issued on training completion |

**Total: 17 tables owned by Training Management.**

---

## 2. Tables This Module READS But Does NOT Own

| Table | Owner | Used For |
|---|---|---|
| `users` | User Management | Learner identity, enrollment checks |
| `user_hierarchy` | User Management | Manager scope validation |
| `sessions` | Sessions | Linking SESSION-type resources |
| `assignments` | Assignment Engine | Assignment-based access control |
| `mandatory_assignment_rules` | Assignment Engine | Probation gateway rules |

**Rule:** Training Management may read these via repository queries but MUST NOT write to them.

---

## 3. OneDrive Integration Pattern (for file-backed resources)

Training Management does NOT store file bytes. For VIDEO, PDF, DOCUMENT resource types:

```python
# What LMS stores (in resource_files table):
external_file_id = "1234abcd..."       # OneDrive file ID
reference_url = "https://..."          # Secured streaming URL
access_mode = "STREAM_ONLY"            # Always STREAM_ONLY in Phase 1
file_name = "safety_intro.mp4"         # Display name
file_size_bytes = 52428800             # Size for display
```

- Admin provides OneDrive URL or uses Browse button (handled by Graph API integration)
- URL validity is checked at access time; expired URLs are re-generated
- ASSESSMENT type resources have NO file — questions stored in `assessment_questions` table
- SCORM is Phase 2 — not implemented; not shown in UI; not in resource_type enum

---

## 4. Training Lifecycle States

```
DRAFT → PUBLISHED → INACTIVE (permanent, cannot reverse)
DRAFT → ARCHIVED ↔ DRAFT (reversible via Restore)
PUBLISHED → ARCHIVED ↔ DRAFT (reversible)
PUBLISHED → INACTIVE (permanent)
```

State transition rules:
- DRAFT: editable, not visible to employees, no version until published
- PUBLISHED: visible in catalog, assignable, updates require re-publish to create new version
- INACTIVE: retired; no new assignments; existing assignments remain completable; **cannot reverse**
- ARCHIVED: hidden from catalog; not assignable; **reversible** via Restore → returns to DRAFT

---

## 5. Versioning Rules (important for models + service)

- `training_items.current_version_no`: increments only on publish of a changed item
- `training_items.has_unpublished_changes`: set `true` when Draft edits exist on a Published training
- `training_versions`: new record created only on publish (not on save-as-draft)
- `training_resources.version_id`: links resource to the version it was added in
- Historical completions reference the version they were completed against — do not modify

---

## 6. Certificate Flow

```
Employee completes training (all required resources done OR admin override)
  → training_completions record created
  → IF issue_certificate = true:
      → certificates record created with status = PENDING_APPROVAL
      → CERTIFICATE_ISSUED audit event emitted
      → Employee notified: "certificate pending admin approval"
  → Admin approves: POST /certificates/{id}/approve
      → status → APPROVED; employee can download
      → CERTIFICATE_APPROVED audit event; employee notification
  → Admin rejects: POST /certificates/{id}/reject (reason required)
      → status → REJECTED; employee notified with reason + re-attempt link
      → CERTIFICATE_REJECTED audit event
```

Certificate states: `PENDING_APPROVAL` → `APPROVED` | `REJECTED`

---

## 7. Audit Event Codes (complete list for this module)

| Event Code | Trigger |
|---|---|
| `TRAINING_CREATED` | POST /trainings |
| `TRAINING_PUBLISHED` | POST /trainings/{id}/publish |
| `TRAINING_VERSION_CREATED` | On publish of changed training |
| `TRAINING_INACTIVATED` | POST /trainings/{id}/inactivate |
| `TRAINING_ARCHIVED` | POST /trainings/{id}/archive |
| `TRAINING_RESTORED` | POST /trainings/{id}/restore |
| `TRAINING_CLONED` | POST /trainings/{id}/clone |
| `TRAINING_RESOURCE_ADDED` | POST /resources |
| `TRAINING_RESOURCE_REMOVED` | DELETE /resources/{id} |
| `TRAINING_COMPLETED` | Resource progress triggers completion |
| `CERTIFICATE_ISSUED` | On training completion (if issue_certificate=true) |
| `CERTIFICATE_APPROVED` | POST /certificates/{id}/approve |
| `CERTIFICATE_REJECTED` | POST /certificates/{id}/reject |
| `ASSESSMENT_ATTEMPT_SUBMITTED` | POST /resources/{id}/assessment/attempts |
| `ASSESSMENT_ATTEMPTS_EXHAUSTED` | All attempts used without passing |
| `ASSESSMENT_ATTEMPTS_RESET` | POST /resources/{id}/assessment/attempts/reset |
| `TRAINING_COMPLETION_EXPIRED` | Background job — validity_period_days exceeded |

---

## 8. Notification Events Dispatched by This Module

| Trigger | Recipient | Content |
|---|---|---|
| Training completed + cert issued | Employee | "Your certificate for [Training] is pending admin approval" |
| Certificate approved | Employee | "Your certificate for [Training] is now available for download" |
| Certificate rejected | Employee | "[Training] certificate rejected: [reason]. Re-attempt link." |
| Assessment attempts exhausted | Employee + Admin | "Employee has exhausted all attempts for [Assessment]" |
| Completion expiry (daily job) | Employee | "Your [Training] completion has expired. New assignment created." |

---

## 9. Background Jobs (Training Management)

### Job 1: Completion Expiry Check
- **Schedule:** Daily at 03:00 (configurable via APScheduler)
- **Location:** Worker service (`worker/jobs/training_expiry_job.py`)
- **Logic:**
  1. Query `training_completions` WHERE `validity_period_days IS NOT NULL`
  2. Check if `completed_at + validity_period_days days < today`
  3. For expired completions: emit `TRAINING_COMPLETION_EXPIRED` audit event
  4. Call Assignment Engine via internal service to create new assignment
  5. Notify employee
- **Idempotent:** Yes — checks completion date, does not re-process already-expired records

### Job 2: Certificate Generation (event-driven, not scheduled)
- **Trigger:** Post-completion event via `BackgroundTasks` (not APScheduler)
- **Location:** `training_management/services/certificate_service.py`
- **Logic:** Generate PDF certificate, store metadata in `certificates` table

---

## 10. APISIX Routes for Training Management

All routes under `HOST/api/v1/` — JWT required on all routes.

| Method | Path | Role |
|---|---|---|
| GET | /trainings | ADMIN, HR, EMPLOYEE |
| POST | /trainings | ADMIN |
| GET | /trainings/{id} | ADMIN, HR, EMPLOYEE |
| PUT | /trainings/{id} | ADMIN |
| POST | /trainings/{id}/publish | ADMIN |
| POST | /trainings/{id}/inactivate | ADMIN |
| POST | /trainings/{id}/archive | ADMIN |
| POST | /trainings/{id}/restore | ADMIN |
| POST | /trainings/{id}/clone | ADMIN |
| GET | /trainings/{id}/versions | ADMIN, HR |
| GET | /trainings/{id}/structure | ADMIN, HR, EMPLOYEE |
| PUT | /trainings/{id}/structure | ADMIN |
| GET | /trainings/{id}/resources | ADMIN, EMPLOYEE (w/ assignment) |
| GET | /trainings/{id}/assignments | ADMIN |
| POST | /trainings/export | ADMIN, HR |
| GET | /trainings/export/{job_id}/download | ADMIN, HR (job creator) |
| POST | /resources | ADMIN |
| GET | /resources/{id} | ADMIN, EMPLOYEE (w/ assignment) |
| PUT | /resources/{id} | ADMIN |
| DELETE | /resources/{id} | ADMIN |
| PATCH | /trainings/{id}/resources/reorder | ADMIN |
| GET | /resources/{id}/assessment | ADMIN, EMPLOYEE (w/ assignment) |
| PUT | /resources/{id}/assessment | ADMIN |
| POST | /resources/{id}/assessment/attempts | EMPLOYEE (self-only) |
| GET | /resources/{id}/assessment/attempts | ADMIN, EMPLOYEE (self-only) |
| POST | /resources/{id}/assessment/attempts/reset | ADMIN |
| POST | /resources/{id}/progress | EMPLOYEE (self-only) |
| GET | /certificates/me | EMPLOYEE (self-only) |
| GET | /certificates/{id} | ADMIN, HR, EMPLOYEE (self/team) |
| GET | /certificates/{id}/download | ADMIN, HR, EMPLOYEE (self/team) |
| POST | /certificates/{id}/approve | ADMIN |
| POST | /certificates/{id}/reject | ADMIN |

**Total: 32 endpoint paths** (22 training + 10 resource/assessment/certificate)

---

## 11. Key Business Rules Summary

| Rule | Code | Description |
|---|---|---|
| BR-01 | Structure | Training must have a category |
| BR-06 | Access | Prerequisites block resource access until completed |
| BR-07 | Clone | Clone creates new Draft with new training_code |
| BR-08 | Completion | Course complete = all required resources done OR Admin override |
| BR-12 | Expiry | If validity_period_days set, new assignment auto-created on expiry |
| BR-14 | Versioning | New version only on re-publish of changed training |
| BR-18 | Files | File-backed resources in OneDrive — LMS stores metadata only |
| BR-21 | Access | Resource access requires active assignment for parent training |
| BR-22 | Catalog | All published training visible to all active employees |
| BR-30 | Inactive | Inactive training cannot be newly assigned |
| BR-36 | Assessment | Assessment data (questions, attempts) stored entirely in LMS |
| BR-37 | Assessment | Complete on passing score — failed attempt recorded |
| BR-38 | Assessment | Exhausted attempts = course blocked; Admin override required |
| BR-39 | Assessment | Attempts permanently recorded — cannot delete |
| BR-40 | Sequential | Sequential lock: all preceding required resources must be done |
| BR-42 | Assessment | Questions: ≥2 options; MCQ/T-F = exactly 1 correct; MSQ = ≥1 correct |
| BR-47 | Assessment | Assessment cannot be saved until ≥1 question added |
| BR-43 | Certificate | Status flow: PENDING_APPROVAL → APPROVED or REJECTED |
| BR-44 | Certificate | Employee cannot download until status = APPROVED |
| BR-45 | Certificate | Rejection reason mandatory; sent to employee as notification |

---

## 12. Source File Locations (for cross-reference)

| What You Need | File | Key Sections |
|---|---|---|
| Full schema (all 17 tables) | `docs/requirements/05_engineering/features/03_training_management/schema.md` | Full file |
| Full API spec (all endpoints) | `docs/requirements/05_engineering/features/03_training_management/api.md` | §2-4 |
| Business rules | `docs/requirements/02_features/03_training_management.md` | §4-5 |
| UX flows (training creation) | `docs/requirements/03_ux/01_ux_flows.md` | §21 (line 1268) |
| Screen definitions (admin) | `docs/requirements/03_ux/02_screens.md` | Screen 22 (L1422), Screen 23 (L1494), Screen 37 (L2301) |
| Screen definitions (employee) | `docs/requirements/03_ux/02_screens.md` | Screen 8 (L466), Screen 9 (L516), Screen 10 (L570), Screen 30 (L1853) |
| ER diagram | `docs/requirements/05_engineering/er_diagram.md` | Training group (L192–L430) |
| APISIX routes | `docs/requirements/05_engineering/00_apisix_routes.md` | Training section |
