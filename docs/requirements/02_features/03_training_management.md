# Feature: Training Management

---

# 1. Feature Overview

## Purpose

The Training Management feature serves as the core learning engine of the LMS. It enables administrators to create, organize, maintain, and control all learning content including courses, learning paths, and curriculums while ensuring training completion can be tracked for compliance and development purposes.

This feature ensures learning content remains structured, measurable, and aligned with organizational compliance and development goals.

## Why Business Needs It

The organization requires a centralized training capability to:

* Ensure employees complete mandatory compliance training
* Provide structured learning journeys
* Maintain training history across versions
* Automatically generate certificates
* Provide measurable progress
* Support performance evaluation

## Problems This Feature Solves

* Unstructured learning delivery
* Lack of measurable progress tracking
* Manual certificate management
* Loss of historical completion due to updates
* Poor compliance visibility

## Integration with Other LMS Modules

| Module            | Purpose                                         |
| ----------------- | ----------------------------------------------- |
| User Management   | Determines eligibility (hierarchy + attributes) |
| Assignment Engine | Assigns training                                |
| Sessions          | Classroom integration                           |
| Notifications     | Alerts                                          |
| Compliance        | Tracks completion                               |
| Reporting         | Analytics                                       |
| Migration         | Imports legacy data                             |

---

# 2. Actors

## Employee

* Access training
* Complete resources
* Track progress
* Attend sessions
* Download certificates

---

## Manager

Derived from hierarchy (NOT a role)

* Assign training
* Monitor team progress
* Recommend learning paths

---

## Admin

* Create training
* Manage structure
* Upload resources
* Define completion logic
* Manage versions
* Retire training

---

## HR

* Define mandatory training
* Monitor compliance

---

## External Systems

### PES

Consumes compliance data via LMS APIs.

(No push from LMS)

---

### OneDrive

Stores all training resources.

---

### Microsoft Teams

Provides classroom session delivery.

---

# 2A. User Scenarios

(No major change — already correct)

---

# 3. Functional Overview

Training is structured as a hierarchy (outer to inner):

**Curriculum → Learning Path → Course → Resource**

* A Curriculum contains one or more Learning Paths
* A Learning Path contains one or more Courses
* A Course contains one or more Resources

Each level can exist independently and be assigned standalone.

### Resource Types

* **Video** — MP4 or streaming URL; tracked by view completion
* **PDF / Document** — PDF, PPTX, DOCX uploaded to OneDrive; tracked by open event
* **Assessment** — Quiz built inside LMS with questions, passing score, attempt limits, and time limit; tracked by pass/fail result
* **SCORM** — **Deferred to Phase 2** (not in Phase 1 scope; removed from UI and API)
* **External Link** — URL to external content; tracked by click event
* **Session** — linked classroom/hybrid session from the Sessions module; tracked by attendance

### Completion Behavior

* A **Course** is complete when all required resources are completed OR Admin manually marks it complete
* A **Learning Path** is complete when all its required Courses are complete
* A **Curriculum** is complete when all its required Learning Paths are complete
* Certificates are generated at the Course level by default; configurable at Learning Path and Curriculum level

### Versioning

* A new version is created only when a **Published** training item is updated and re-published
* Edits to a Draft do not create a new version
* Version number increments only on publish of a changed item
* Historical completion remains valid against the version it was completed on
* New assignments always use the latest published version

### Training Expiry / Recertification

* Training items can define a `validity_period_days` (e.g. 365 = 1 year validity)
* When a completion expires, the user's compliance status reverts to `PENDING` and a new assignment is auto-created
* `validity_period_days = null` means the completion is permanent and never expires

### Catalog Visibility

* All published training is visible to all active employees in the catalog by default
* Training with `requires_approval = true` is visible but requires a self-enrollment request to access
* Draft and Inactive training are visible to Admin only

---

# 4. Functional Requirements

## Training Structure Management

* Create Courses, Learning Paths, and Curriculums
* Assign categories, tags, difficulty level
* Set `estimated_duration_minutes` (optional) so employees can plan learning time
* Define prerequisite training items per training — system blocks access until prerequisites are completed
* Manage lifecycle independently per item (Draft → Published → Inactive)
* Clone existing training: `POST /api/v1/trainings/{id}/clone` creates a new Draft with all structure, resources, and settings copied; new `training_code` assigned; version starts at 1

### Training Creation Wizard (UI)

Training creation in Admin uses a **4-step wizard** (replacing the previous single-panel modal):

| Step | Label | Key Fields |
|---|---|---|
| 1 | Basic Info | Title, Training Code (auto), Type, Category (with inline "Add new category" option), Description, Difficulty, Tags |
| 2 | Resources / Structure | Each resource type button opens a **popup modal**: Video and Document include OneDrive URL + Browse button; Assessment includes full inline question builder (MCQ / True/False) — **at least one question required before the assessment can be saved**; Link and Session modals have their own fields. Resources can also be managed later via Manage Resources. For Learning Path / Curriculum type, Step 2 shows a structure panel instead (see Screen 23). |
| 3 | Settings | Mandatory toggle + Assignment Rule (scope, designation/capability filters for probation, due days); Completion Mode; Requires Approval; Prerequisites; Certificate toggle; `is_probation_gateway` toggle |
| 4 | Review & Publish | Summary of all data; Save as Draft / Publish |

Editing an existing training reopens the wizard pre-populated on Step 1. Admins can also directly access "Manage Resources" from the training list for resource-only edits without the full wizard.

**Note:** Certificate Validity (days) field has been removed from Step 3. Completions are treated as permanent unless the assignment has its own expiry rules.

### Training List — Additional Admin Actions

* **Assignments viewer:** clicking the Assignments icon on a training row opens a read-only modal showing all assigned employees with name, department, status (Completed / In Progress / Not Started / Overdue), progress %, and due date. Supports search and status filter.
* **Assign modal — scope selection:** the Assign Training modal supports multi-select conditional panels: selecting "Specific Department" shows a checkbox list of departments; "Specific Users" shows a searchable user tag-input.
* **Archive action:** published and draft rows have an Archive button. Archived rows move to the Archived tab; the row retains historical data. Archived training cannot be published without first restoring.
* **Bulk actions:** when ≥1 checkbox is selected, a bulk actions bar appears with: Assign Selected · Archive Selected · Export Selected.
* **Change completion rule:** the Completion column has a "Change rule" link that opens a small modal to update the completion mode (All resources / Minimum resources % / Admin override) without opening the full wizard.

### Probation Gateway Flag

* `is_probation_gateway` boolean on `training_items`
* When `true`, this training is eligible to be targeted by `EMPLOYMENT_PHASE` mandatory assignment rules
* Visible in Step 3 of the training wizard, shown only when `is_mandatory = true`
* Setting `is_probation_gateway = true` does NOT auto-create any rules — rules must still be configured via the mandatory assignment rule section

---

## Training Resource Management

* Add resources of type: Video, PDF/Document, Assessment, External Link, Session *(SCORM deferred to Phase 2)*
* Maintain ordering — resources have a defined sequence within a course
* Reorder resources via drag-and-drop; sequence stored as `sequence_no`
* Each resource marked as **required** or **optional** — affects course completion calculation
* **Sequential lock** — a resource can be configured to require all preceding required resources to be completed before it unlocks
* Replace file-backed resources (Video, PDF, Document) — new OneDrive file ID linked; old file reference preserved in version history
* Remove resources — soft-deleted (`is_active = false`); progress history preserved; triggers new version on re-publish
* Store metadata in LMS only — actual files reside in OneDrive

### Assessment Resource (Built-in Quiz)

Admin can build an assessment directly inside the LMS as a resource on a course:

* **Question types:** MCQ (single correct answer), MSQ (multiple correct answers), True/False
* **Per-assessment settings:**
  * Passing score % (required — e.g. 70%)
  * Max attempts allowed (required — e.g. 3; 0 = unlimited)
  * Time limit in minutes (optional — 0 = no limit)
  * Randomize question order (boolean)
  * Randomize option order (boolean)
  * Show correct answers after passing (boolean)
* **Per-question settings:**
  * Question text
  * Points (default 1)
  * Options list with `is_correct` flag
* Assessment is considered **completed** when the employee achieves a passing score within the allowed attempts
* If `is_required = true` and employee exhausts all attempts without passing → course cannot be auto-completed; Admin override required
* Each attempt is permanently recorded (score, answers, duration)

IMPORTANT:

LMS stores only metadata for file-backed resources.
Actual files reside in OneDrive.
Assessment questions and attempt data are stored entirely within the LMS database.

---

## Completion Logic

* Resource-based completion (all required resources complete = course complete)
* Manual Admin completion override allowed
* Completion at Course level rolls up to Learning Path → Curriculum
* Completion updates assignment status and triggers compliance evaluation
* If training has `validity_period_days` set, completion expiry is calculated and scheduled

## Resource Access Control

* A resource can only be accessed by a user who has an active assignment for the training it belongs to
* Admin can access any resource for management purposes
* Unassigned employees cannot access resources even if the training is visible in the catalog

---

## Resource Tracking

| Resource Type | Completion Trigger |
|---|---|
| Video | Progress % reaches 100% (or configurable threshold) |
| PDF / Document | File opened (single open event marks complete) |
| Assessment | Passing score achieved within allowed attempts |
| SCORM | SCORM completion status received from package |
| External Link | Link clicked (single click marks complete) |
| Session | Attendance confirmed (auto via Teams or manual by facilitator) |

---

## Progress Calculation

* Percentage-based
* Real-time updates

---

## Certificate Generation

* Auto-generated as PDF on training completion when `issue_certificate = true` on the training item
* Each certificate includes: employee name, training title, completion date, certificate number, and organization name
* Certificate template is a fixed system template in Phase 1 — custom templates deferred to Phase 2
* Certificate number is unique and permanently traceable
* Certificates stored permanently and available in the employee's Certificates screen
* Certificates generated at Course level by default; optionally at Learning Path and Curriculum level if configured
* Certificates do not expire — no validity period or recertification flow

### Certificate Approval Flow

When `issue_certificate = true`, the certificate goes through an admin approval step before the employee can download it:

1. Employee completes training → certificate generated with status `PENDING_APPROVAL`
2. Employee sees the certificate card with "Pending Approval" badge; Download button is locked
3. Admin sees pending count in the Cert Approvals dashboard tile and in Training → Cert Approvals tab
4. **Approve** → status → `APPROVED`; employee notified; Download unlocked
5. **Reject** → admin enters rejection reason → status → `REJECTED`; reason sent to employee; employee sees Re-attempt link

| Certificate Status | Employee View | Download |
|---|---|---|
| `PENDING_APPROVAL` | Amber card — awaiting admin approval | Locked |
| `APPROVED` | Green card — Active | Available |
| `REJECTED` | Red card — rejection reason + Re-attempt link | Not available |

---

## Training Versioning

* New version created on update
* Old completion preserved
* Version linked to assignment

---

## Training Lifecycle

States:

* `DRAFT` — being created; not visible to employees; edits do not create new versions
* `PUBLISHED` — visible in catalog; assignable; updates trigger new version on re-publish
* `ARCHIVED` — reversibly hidden from catalog; not assignable; retained with full history; restored to DRAFT via Restore action
* `INACTIVE` — permanently retired; not assignable; visible in history and admin views only

### Inactivation with Active Assignments

When a training is inactivated:
* Existing active assignments remain — learners can still complete them
* No new assignments can be created for inactive training
* In-progress learners see a warning that the training has been retired but can still complete it
* Certificates are still generated on completion of inactive training

---

## Migration Support

(No major change)

---

# 5. Business Rules

## Structure Rules

BR-01 Training must have a category
BR-02 Tags are optional
BR-03 Training hierarchy is: Curriculum → Learning Path → Course → Resource
BR-04 Each training level can be assigned independently
BR-05 `estimated_duration_minutes` is optional but recommended
BR-06 Prerequisites are optional; if set, system blocks access until all prerequisites are complete for that user
BR-07 Training can be cloned — clone creates a new Draft with version 1 and a new training_code

---

## Completion Rules

BR-08 Course completion = all required resources complete OR Admin override
BR-09 Learning Path completion = all required Courses complete
BR-10 Curriculum completion = all required Learning Paths complete
BR-11 Completion updates assignment status and triggers compliance evaluation
BR-12 If `validity_period_days` is set, completion expires after that period; new assignment auto-created on expiry
BR-13 `validity_period_days = null` means permanent completion — never expires

---

## Versioning Rules

BR-14 New version created only when a Published training is updated and re-published
BR-15 Editing a Draft does not create a new version
BR-16 Historical completions remain valid against the version they were completed on
BR-17 New assignments always reference the latest published version

---

## Resource Rules

BR-18 File-backed resources (Video, PDF, Document) stored in OneDrive — LMS stores metadata only (SCORM deferred to Phase 2)
BR-19 Resource completion tracked per user per assignment
BR-20 SCORM 1.2 is the only supported SCORM version — deferred to Phase 2 (not implemented in Phase 1)
BR-21 Resource access restricted to users with an active assignment for the parent training
BR-36 Assessment questions and attempt data stored entirely within LMS — no OneDrive dependency
BR-37 Assessment is complete when employee achieves passing score; failed attempt recorded but does not complete
BR-38 If employee exhausts max attempts without passing a required assessment → course blocked from auto-completion; Admin override required
BR-39 Each assessment attempt permanently recorded — attempts cannot be deleted
BR-40 Sequential lock: if enabled on a resource, all preceding required resources must be completed before it can be accessed
BR-41 External link resource is marked complete on first click — no further tracking
BR-42 Assessment questions must have at least 2 options; exactly one `is_correct = true` for MCQ and True/False; one or more for MSQ
BR-47 An Assessment resource cannot be saved (in wizard or Manage Resources) until at least one question has been added — enforced in UI before the resource is committed

---

## Catalog Visibility Rules

BR-22 All published training visible to all active employees in catalog
BR-23 Training with `requires_approval = true` visible but requires self-enrollment request
BR-24 Draft and Inactive training visible to Admin only

---

## Certificate Rules

BR-25 Certificate generated on completion only when `issue_certificate = true` on the training item
BR-26 Certificate includes: employee name, training title, completion date, certificate number, organization name (no validity period — certificates do not expire)
BR-27 Certificate number is unique and permanently traceable
BR-28 Certificates stored permanently — never deleted
BR-29 Phase 1: fixed system certificate template — custom templates Phase 2
BR-43 Certificate status flow: `PENDING_APPROVAL` → `APPROVED` (admin approves) or `REJECTED` (admin rejects with reason)
BR-44 Employee cannot download certificate until status = `APPROVED`
BR-45 Rejection reason is mandatory and delivered to employee as a notification
BR-46 Rejected certificate can be re-earned by re-attempting the training; a new certificate record is created on the next completion

---

## Inactivation Rules

BR-30 Inactive training cannot be newly assigned
BR-31 Active assignments on inactive training remain completable
BR-32 Certificates still generated on completion of inactive training

---

## Compliance Rules

BR-33 Mandatory training tracked and compliance status updated on completion
BR-34 Compliance data exposed via LMS APIs for PES (pull model — PES reads, LMS does not push)
BR-35 Completion expiry triggers compliance status revert to PENDING

---

# 6. Workflows

## Training Creation

Admin creates training (Course / Learning Path / Curriculum)
→ Sets category, tags, difficulty, estimated duration, validity period, prerequisites
→ Adds resources (linked from OneDrive)
→ Defines completion rules
→ Saves as Draft (no version increment)
→ Publishes → version 1 created → visible in catalog

---

## Training Completion (Employee)

Employee opens assigned training
→ System checks prerequisites — blocks if incomplete
→ Employee completes resources
→ Progress tracked per resource
→ All required resources complete → Course complete
→ Learning Path / Curriculum completion evaluated
→ Certificate generated (PDF)
→ Assignment status updated to COMPLETED
→ Compliance evaluation triggered

---

## Admin Completion Override

Admin marks assignment as complete
→ Completion recorded (source = ADMIN)
→ Certificate generated
→ Compliance updated

---

## Version Update

Admin edits a Published training
→ Saves as Draft changes (no version yet)
→ Admin publishes updated training
→ New version created (version + 1)
→ Old version preserved — existing assignments unaffected
→ New assignments use latest version

---

## Training Clone

Admin clones existing training
→ New Draft training created with same structure, resources, settings
→ New training_code assigned
→ Version starts at 1
→ Prerequisites and validity period copied
→ Admin edits and publishes as needed

---

## Completion Expiry

Background job runs daily
→ Checks completions with `validity_period_days` set
→ Identifies expired completions (completed_at + validity_period_days < today)
→ Compliance status reverted to PENDING
→ New assignment auto-created
→ Employee notified

---

# 7. Data Rules

## Data Ownership

| System   | Data                          |
| -------- | ----------------------------- |
| LMS      | Training structure + metadata |
| OneDrive | Files                         |
| LMS      | Progress, completion          |
| PES      | Consumes compliance           |

---

## Data Edit Rules

* Admin manages structure
* System manages completion

---

## Data Retention

* Training permanent
* Completion permanent
* Certificates permanent

---

# 8. Edge Cases

## Version Update Mid-Assignment

* Existing assignments reference the old version — not affected by new version
* Users in progress on old version complete against old version
* New assignments after publish use the new version

---

## Resource Removal from Published Training

* Resource removed from a published training → triggers new version on re-publish
* Progress against removed resource is preserved in history
* Completion calculation excludes removed resources going forward

---

## OneDrive Unavailable

* Resource metadata accessible in LMS but file cannot be streamed
* User sees error: "File temporarily unavailable. Try again later."
* Admin retry available via resource management screen
* No LMS data loss — metadata preserved

---

## Session Cancelled

* If a session resource is cancelled, training remains assigned
* Session resource marked as `CANCELLED` — does not count toward completion
* Admin can replace session resource or mark training complete manually

---

## Assessment Attempts Exhausted

* Employee fails a required assessment after all allowed attempts
* Course cannot be auto-completed — `ASSESSMENT_ATTEMPTS_EXHAUSTED` state recorded
* Admin receives notification (if escalation configured)
* Admin can: reset attempts (allowing employee to retry) OR manually mark course complete (Admin override)
* All failed attempts remain permanently recorded regardless of reset or override

---

## Training Inactive with Active Assignments

* Learners can still complete inactive training
* No new enrollments allowed
* Catalog shows training as "Retired" to learners already assigned
* Certificate still generated on completion

---

## Prerequisite Not Met

* User attempts to access training with unmet prerequisites
* System returns 403 with error code `PREREQUISITE_NOT_MET` and list of incomplete prerequisites
* User is directed to complete prerequisites first

---

## Completion Expiry

* Background job detects expired completions daily
* New assignment auto-created — does not cancel existing history
* Previous certificate remains valid as historical record
* New certificate issued on re-completion

---

# 9. Acceptance Criteria

* Courses, Learning Paths, and Curriculums created correctly (Curriculum → Path → Course hierarchy)
* Resources uploaded via OneDrive — metadata stored in LMS, files in OneDrive
* SCORM 1.2 packages launch and track completion correctly
* Prerequisites enforced — blocked access if prerequisites incomplete
* Completion tracked at all levels (Course / Learning Path / Curriculum)
* Certificates generated as PDF on completion with all required fields
* Versioning works — new version only on publish; historical completions unaffected
* Training expiry triggers new assignment and compliance revert
* Training clone creates independent Draft with new code and version 1
* Inactive training not assignable; active assignments on inactive training still completable
* Training inactivation with active assignments handled correctly
* All training actions emit correct audit events
* Catalog visibility rules enforced (Draft/Inactive hidden from employees)

---

# 10. Dependencies

* User Management (hierarchy + eligibility)
* Assignment Engine
* Teams (sessions)
* OneDrive (files)
* PES (API consumer)
* Reporting

---

# 11. Assumptions

* Single tenant
* <1000 users
* OneDrive storage
* Teams sessions
* Hierarchy-based access control
* OpenAPI-based integrations

---

# 12. Audit Events

| Event | event_code | Minimum Data Captured |
|---|---|---|
| Training created | `TRAINING_CREATED` | training_id, type, created_by, correlation_id, timestamp |
| Training published | `TRAINING_PUBLISHED` | training_id, version_no, published_by, correlation_id, timestamp |
| Training inactivated | `TRAINING_INACTIVATED` | training_id, inactivated_by, correlation_id, timestamp |
| Training cloned | `TRAINING_CLONED` | source_training_id, new_training_id, cloned_by, correlation_id, timestamp |
| New version created | `TRAINING_VERSION_CREATED` | training_id, version_no, created_by, correlation_id, timestamp |
| Resource added | `TRAINING_RESOURCE_ADDED` | training_id, resource_id, added_by, correlation_id, timestamp |
| Resource removed | `TRAINING_RESOURCE_REMOVED` | training_id, resource_id, removed_by, correlation_id, timestamp |
| Completion recorded | `TRAINING_COMPLETED` | training_id, user_id, assignment_id, source (AUTO/ADMIN), correlation_id, timestamp |
| Certificate issued | `CERTIFICATE_ISSUED` | certificate_id, user_id, training_id, certificate_no, correlation_id, timestamp |
| Completion expired | `TRAINING_COMPLETION_EXPIRED` | training_id, user_id, expired_at, new_assignment_id, correlation_id, timestamp |
| Training archived | `TRAINING_ARCHIVED` | training_id, archived_by, correlation_id, timestamp |
| Training restored from archive | `TRAINING_RESTORED` | training_id, restored_by, correlation_id, timestamp |
| Certificate approved by admin | `CERTIFICATE_APPROVED` | certificate_id, user_id, training_id, approved_by, correlation_id, timestamp |
| Certificate rejected by admin | `CERTIFICATE_REJECTED` | certificate_id, user_id, training_id, rejected_by, rejection_reason, correlation_id, timestamp |
| Assessment attempt submitted | `ASSESSMENT_ATTEMPT_SUBMITTED` | resource_id, user_id, assignment_id, attempt_no, score_percent, passed, correlation_id, timestamp |
| Assessment attempts exhausted | `ASSESSMENT_ATTEMPTS_EXHAUSTED` | resource_id, user_id, assignment_id, max_attempts, correlation_id, timestamp |
| Assessment attempts reset | `ASSESSMENT_ATTEMPTS_RESET` | resource_id, user_id, assignment_id, reset_by, correlation_id, timestamp |

---

# 13. Future Enhancements

* SCORM 2004 and xAPI (TinCan) support
* Custom certificate templates
* Multi-language training content
* AI-based learning recommendations
* Training ratings and feedback surveys
* Waitlist for capacity-limited sessions
* Learning path prerequisites with branching logic

---

# End of Document