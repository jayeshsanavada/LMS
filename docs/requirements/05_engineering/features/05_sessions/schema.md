# Sessions — Database Schema

---

## 1. Design Principles

- All sessions are **hybrid** — there is no session type. Every session combines a physical venue (in-person) with Teams (online).
- Sessions are permanent records — never hard-deleted (`CANCELLED` status used)
- Attendance records are permanent — overrides tracked via `attendance_source`
- Online attendance auto-fetched from Teams; offline recorded by Admin/HR or via Excel import
- Participant status extended to support Manager nominations in Phase 1
- Facilitators and venues are managed through dedicated lookup tables maintained by Admin

---

## 2. Common Columns Standard

| Column | Type | Purpose |
|---|---|---|
| `id` | UUID | Primary key |
| `created_at` | TIMESTAMP | Record creation time |
| `created_by` | UUID | FK → `users.id` or system |
| `updated_at` | TIMESTAMP | Last update time |
| `updated_by` | UUID | FK → `users.id` or system |
| `is_active` | BOOLEAN | Active flag |

---

## 3. Tables Owned by Sessions Module

---

### Table: `session_facilitators`

**Purpose**
Admin-managed lookup table of facilitators. A facilitator can be an LMS user (linked) or an external person (name only). Sessions reference this table instead of `users` directly.

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `name` | VARCHAR(255) | No | Display name of the facilitator |
| `user_id` | UUID | Yes | FK → `users.id`; null if external/non-LMS facilitator |
| `is_active` | BOOLEAN | No | Default true; false = deactivated (soft delete) |
| `created_at` | TIMESTAMP | No | |
| `created_by` | UUID | No | FK → `users.id` |
| `updated_at` | TIMESTAMP | No | |
| `updated_by` | UUID | No | FK → `users.id` |

**Business Rules**
- Admin only can create, rename, or deactivate facilitators
- Deactivated facilitators remain on existing sessions but cannot be selected for new sessions
- If `user_id` is set, the facilitator is linked to an LMS user; otherwise they are an external name

**Indexes**
- `is_active` (list query filter)
- `user_id` (LMS user lookup)

---

### Table: `session_venues`

**Purpose**
Admin-managed lookup table of physical venues used for sessions. Provides consistent venue naming and optional capacity metadata.

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `name` | VARCHAR(255) | No | Venue display name (e.g. "Conference Room B") |
| `address` | TEXT | Yes | Full address or directions |
| `capacity` | INTEGER | Yes | Maximum headcount for the venue |
| `is_active` | BOOLEAN | No | Default true; false = deactivated (soft delete) |
| `created_at` | TIMESTAMP | No | |
| `created_by` | UUID | No | FK → `users.id` |
| `updated_at` | TIMESTAMP | No | |
| `updated_by` | UUID | No | FK → `users.id` |

**Business Rules**
- Admin only can create, update, or deactivate venues
- Deactivated venues remain on existing sessions but cannot be selected for new sessions
- System warns (does not block) if `sessions.max_participants` exceeds `session_venues.capacity`

**Indexes**
- `is_active` (dropdown filter)
- `name` (search)

---

### Table: `sessions`

**Purpose**
Stores all hybrid instructor-led session definitions. Each session links to a published training item (any type: Course, Learning Path, or Curriculum), references a managed facilitator and venue, and optionally defines a nomination window for Manager nominations.

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `session_code` | VARCHAR(50) | No | Auto-generated unique code (e.g. SES-001) |
| `training_item_id` | UUID | No | FK → `training_items.id` — any type (Course/LP/Curriculum) |
| `title` | VARCHAR(255) | No | Session title |
| `facilitator_id` | UUID | No | FK → `session_facilitators.id` |
| `session_state` | VARCHAR(50) | No | `SCHEDULED` / `COMPLETED` / `CANCELLED` |
| `start_time` | TIMESTAMP | No | Session start |
| `end_time` | TIMESTAMP | No | Session end |
| `duration_minutes` | INTEGER | Yes | Derived from start/end; stored for display |
| `venue_id` | UUID | Yes | FK → `session_venues.id`; null for migrated sessions |
| `physical_location` | VARCHAR(255) | Yes | Snapshot of venue name at save time (for display + migration fallback) |
| `teams_meeting_link` | TEXT | Yes | Auto-created or manually set |
| `teams_meeting_id` | VARCHAR(255) | Yes | Graph API meeting ID for attendance pull |
| `teams_link_status` | VARCHAR(50) | No | `AUTO_CREATED` / `MANUAL` / `PENDING_MANUAL` |
| `max_participants` | INTEGER | No | Capacity cap — no waitlist |
| `nomination_open_at` | TIMESTAMP | Yes | When nomination window opens; null = no nomination window |
| `nomination_close_at` | TIMESTAMP | Yes | When nomination window closes; null = no nomination window |
| `notes` | TEXT | Yes | Optional admin notes |
| `completed_at` | TIMESTAMP | Yes | Set when session transitions to COMPLETED |
| `cancelled_at` | TIMESTAMP | Yes | Set on CANCELLED |
| `cancelled_by` | UUID | Yes | FK → `users.id` |
| `cancellation_reason` | TEXT | Yes | |
| `is_migrated` | BOOLEAN | No | Default false; true for legacy imported sessions |
| `created_at` | TIMESTAMP | No | |
| `created_by` | UUID | No | FK → `users.id` |
| `updated_at` | TIMESTAMP | No | |
| `updated_by` | UUID | No | FK → `users.id` |

**Business Rules**
- `session_code` must be unique
- Training must be PUBLISHED at session creation time (any type: Course, Learning Path, or Curriculum)
- `start_time` must be in the future at creation
- `max_participants` enforced at participant-add and nomination-confirm time — excess blocked
- `COMPLETED` sessions are locked — no structural changes allowed
- `CANCELLED` sessions retained permanently
- `teams_meeting_id` used for Graph API attendance report pull after session
- `nomination_open_at` and `nomination_close_at` must both be before `start_time` when set
- `physical_location` is set as a snapshot of `session_venues.name` when venue is selected; preserved even if venue is later renamed or deactivated

**Indexes**
- `session_code` (unique)
- `training_item_id` (training-based lookup)
- `(session_state, start_time)` (list queries)
- `facilitator_id` (facilitator filter)
- `venue_id` (venue filter)
- `start_time` (date-range filter)
- `(nomination_open_at, nomination_close_at)` (open window queries)

---

### Table: `session_participants`

**Purpose**
Stores users invited or nominated to a session. One row per user per session. Extended to support Manager nomination status in addition to direct Admin invitations.

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `session_id` | UUID | No | FK → `sessions.id` |
| `user_id` | UUID | No | FK → `users.id` |
| `assignment_id` | UUID | Yes | FK → `assignments.id`; null if manually added |
| `participant_status` | VARCHAR(50) | No | See enum below |
| `added_by` | UUID | Yes | FK → `users.id` — Admin who directly added participant; null for nominations |
| `nominated_by` | UUID | Yes | FK → `users.id` — Manager who submitted the nomination; null for direct adds |
| `nomination_decision_by` | UUID | Yes | FK → `users.id` — Admin who confirmed or rejected the nomination |
| `nomination_decision_at` | TIMESTAMP | Yes | When the Admin made the nomination decision |
| `nomination_cancel_reason` | TEXT | Yes | Reason provided when Manager cancels a nomination |
| `created_at` | TIMESTAMP | No | |
| `updated_at` | TIMESTAMP | No | |

**participant_status Enum**
| Value | Description |
|---|---|
| `INVITED` | Directly added by Admin |
| `NOMINATED` | Submitted by Manager; awaiting Admin decision |
| `CONFIRMED` | Admin confirmed the nomination; participant is fully enrolled |
| `REJECTED_NOMINATION` | Admin rejected the nomination; participant is not enrolled |

**Business Rules**
- One row per `(session_id, user_id)` — unique constraint
- Adding or confirming a participant beyond `sessions.max_participants` is blocked
- Participants can be removed while session is SCHEDULED
- Manager can cancel a nomination only while `nomination_close_at` has not passed
- `INVITED` and `CONFIRMED` participants both count as fully enrolled for attendance purposes
- `NOMINATED` participants count against capacity (to prevent overbooking at confirm time)
- `REJECTED_NOMINATION` participants are not enrolled and do not count against capacity

**Indexes**
- `(session_id, user_id)` (unique — duplicate check)
- `(session_id, participant_status)` (participant list by status)
- `user_id` (my sessions query)
- `nominated_by` (manager's nomination history)

---

### Table: `session_attendance`

**Purpose**
Stores attendance records per participant per session. Online records auto-populated from Teams; offline records set by Admin/HR. Overrides tracked via `attendance_source`.

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `session_id` | UUID | No | FK → `sessions.id` |
| `user_id` | UUID | No | FK → `users.id` |
| `attendance_mode` | VARCHAR(50) | No | `ONLINE` / `OFFLINE` |
| `attendance_status` | VARCHAR(50) | No | `ATTENDED` / `NOT_ATTENDED` |
| `attendance_source` | VARCHAR(50) | No | `TEAMS_AUTO` / `ADMIN_MANUAL` / `ADMIN_OVERRIDE` |
| `marked_by_user_id` | UUID | Yes | FK → `users.id`; null for TEAMS_AUTO |
| `marked_at` | TIMESTAMP | No | When attendance was recorded |
| `remarks` | TEXT | Yes | Optional admin note |
| `created_at` | TIMESTAMP | No | |
| `updated_at` | TIMESTAMP | No | |

**Business Rules**
- One row per `(session_id, user_id)` — unique constraint (upsert on update)
- `TEAMS_AUTO`: set when Graph API attendance report is fetched
- `ADMIN_MANUAL`: set when Admin or HR records offline attendance
- `ADMIN_OVERRIDE`: set when Admin overrides a TEAMS_AUTO record
- Only `ATTENDED` status contributes to training completion
- Cancelled sessions do not generate attendance records

**Indexes**
- `(session_id, user_id)` (unique)
- `(session_id, attendance_status)` (count attended/not)
- `user_id` (user attendance history)
- `attendance_source` (filter for audit queries)

---

## 4. Referenced Tables (Owned by Other Modules)

| Table | Owning Module | Used By |
|---|---|---|
| `users` | User Management | `session_facilitators.user_id`, `session_participants.user_id`, `session_attendance.user_id`, nomination columns |
| `user_hierarchy` | User Management | Manager visibility — team session queries; nomination scope check |
| `training_items` | Training Management | `sessions.training_item_id` — any type |
| `training_resources` | Training Management | SESSION-type resource link → completion trigger |
| `assignments` | Assignment Engine | `session_participants.assignment_id` — session resource assignment |
| `resource_progress` | Training Management | Updated to COMPLETED when attendance = ATTENDED |

---

## 5. Enum Values

### `session_state`
- `SCHEDULED`
- `COMPLETED`
- `CANCELLED`

### `teams_link_status`
- `AUTO_CREATED` — Teams meeting created via Graph API
- `MANUAL` — Link provided manually by Admin
- `PENDING_MANUAL` — Auto-creation failed; Admin must provide link manually

### `participant_status`
- `INVITED` — directly added by Admin
- `NOMINATED` — submitted by Manager, awaiting Admin decision
- `CONFIRMED` — Admin confirmed the nomination; fully enrolled
- `REJECTED_NOMINATION` — Admin rejected the nomination

### `attendance_mode`
- `ONLINE` — participant joined via Teams
- `OFFLINE` — participant attended in-person

### `attendance_status`
- `ATTENDED`
- `NOT_ATTENDED`

### `attendance_source`
- `TEAMS_AUTO` — auto-fetched from Teams attendance report
- `ADMIN_MANUAL` — Admin or HR recorded offline attendance
- `ADMIN_OVERRIDE` — Admin overrode a TEAMS_AUTO record

---

## 6. Cross-Check Notes

Verified against:
- `02_features/05_sessions.md` — all business rules and data requirements covered
- `05_engineering/features/05_sessions/api.md` — all endpoints aligned with this schema

**Additions vs original schema:**
- `session_facilitators` table — replaces `sessions.instructor_id`; supports both LMS users and external names (C2)
- `session_venues` table — replaces free-text `physical_location`; Admin-managed lookup (C4)
- `sessions.facilitator_id` — FK → `session_facilitators.id`; replaces `instructor_id` (C2)
- `sessions.venue_id` — FK → `session_venues.id`; nullable for migrated sessions (C4)
- `sessions.physical_location` — retained as a snapshot field (from venue name at save time) (C4)
- `sessions.nomination_open_at`, `nomination_close_at` — define the Manager nomination window (C5)
- `session_participants.participant_status` — extended with `NOMINATED`, `CONFIRMED`, `REJECTED_NOMINATION` (C5)
- `session_participants.nominated_by` — Manager who submitted the nomination (C5)
- `session_participants.nomination_decision_by` — Admin who confirmed or rejected (C5)
- `session_participants.nomination_decision_at` — timestamp of the decision (C5)
- `session_participants.nomination_cancel_reason` — Manager's reason when cancelling a nomination (C5)
- `sessions.training_item_id` now accepts any training type — Course / Learning Path / Curriculum (C6)
