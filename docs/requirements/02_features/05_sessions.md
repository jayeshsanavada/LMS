# Feature: Classroom Sessions (Instructor Led Training)

---

# 1. Feature Overview

## Purpose

The Classroom Sessions feature enables the LMS to manage instructor-led training by allowing administrators to schedule hybrid sessions, manage participants, track attendance (online via Teams + offline via Excel import or manual entry), and integrate virtual training delivery through Microsoft Teams.

This feature ensures instructor-led learning is part of the structured LMS ecosystem and contributes to training completion and compliance tracking.

## Why Business Needs It

Organizations conduct critical training through live sessions such as compliance briefings and workshops. Without centralized tracking, these sessions cannot be audited or included in learning history.

This feature ensures:

* Instructor-led learning is centrally managed
* Attendance (both online and offline) contributes to completion
* Compliance training is trackable
* Virtual sessions are integrated via Teams
* Participation is verifiable
* Managers can nominate their team members for upcoming sessions
* Venue names are consistent and centrally managed

## Problems This Feature Solves

* No centralized session history
* Disconnected virtual meetings
* Missing compliance visibility
* Fragmented learning records
* No structured way for Managers to nominate team members for sessions
* Inconsistent venue naming across sessions

## Integration with Other LMS Modules

| Module              | Purpose                             |
| ------------------- | ----------------------------------- |
| Training Management | Defines training linked to sessions |
| Assignment Engine   | Assigns participants                |
| User Management     | Provides users + hierarchy          |
| Notifications       | Sends reminders + nomination alerts |
| Reporting           | Tracks attendance                   |
| Compliance          | Updates completion                  |
| Migration           | Imports session history             |

---

# 2. Actors

## Employee

* View assigned sessions
* View nomination status (if nominated by Manager)
* Join session via Teams link
* Track participation status

---

## Manager

Derived from hierarchy (NOT a role)

* Monitor team participation
* Ensure mandatory session attendance
* Identify missed sessions
* **Nominate direct reports for upcoming sessions within the nomination window**
* **Cancel a nomination while the nomination window is open**

---

## Admin

* Create and schedule sessions
* Assign facilitator (from managed facilitator list)
* Select venue (from managed venue list)
* Link sessions to training (Course, Learning Path, or Curriculum)
* Manage participants (direct add)
* Review and confirm / reject Manager nominations
* Track and update attendance
* Cancel / reschedule sessions
* Export session attendance
* **Manage the facilitator list (add, rename, deactivate)**
* **Manage the venue list (add, update, deactivate)**

---

## HR

* Monitor mandatory session completion
* Support compliance verification
* Mark offline (classroom) attendance for participants when Admin is unavailable
* Export session attendance records

---

## External Systems

### Microsoft Teams

Provides:

* Online meeting link (auto-created on session save)
* Online attendance data (auto-fetched after session ends)

---

### PES

Consumes completion data via LMS APIs
(No push from LMS)

---

# 2A. User Scenarios

(No major change — already correct)

---

# 3. Functional Overview

All sessions are **hybrid** — there is no Session Type selector. Every session combines a physical venue (in-person attendance) with a Microsoft Teams meeting (online attendance). Both attendance modes always apply to every session.

Flow:

* Admin creates session → selects training (any published type), facilitator, venue → system auto-generates session code → system attempts Teams meeting creation
* If Teams creation fails → Admin provides manual Teams link before session goes live
* Admin optionally defines a nomination window — Managers can nominate their direct reports within that period
* Admin reviews nominations and confirms or rejects
* Participants added (INVITED by Admin, or CONFIRMED from nominations)
* Session occurs — online attendees auto-detected via Teams; offline attendance recorded via Excel import or manually by Admin/HR
* Session marked COMPLETED → attendance finalised → training progress updated → compliance updated

> **Attendance is always on.** Online attendance is auto-fetched from Teams after the session. Offline attendance is recorded via Excel import or Admin/HR manual entry. There is no setting to disable attendance tracking.

---

# 4. Functional Requirements

## Session Creation & Scheduling

Admin must define:

* Session code (auto-generated, e.g. SES-001)
* Title
* Linked training (must be PUBLISHED — any type: Course, Learning Path, or Curriculum)
* Facilitator (selected from the managed facilitator list; Admin manages the list via ⚙ settings icon)
* Date/time (start + end)
* Duration (minutes)
* Venue (selected from the managed venue list; Admin manages the list via ⚙ settings icon)
* Max participants (capacity cap — no waitlist)
* Nomination window (optional) — open date/time and close date/time
* Notes (optional)

Rules:

* Session must be linked to a published training item (Course, Learning Path, or Curriculum)
* Session code must be unique
* Sessions cannot be created with a date in the past
* Max participants enforced on participant add and nomination confirm — excess blocked
* Nomination window open/close must be before `start_time` when provided

---

## Facilitator Management (Admin Only)

Admin maintains a **managed facilitator list** accessible via the ⚙ settings icon next to the Facilitator field in the session form.

* A facilitator can be an LMS user (linked by `user_id`) or an external name (free text only)
* Admin can add, rename, and deactivate facilitators at any time
* Deactivated facilitators remain on existing sessions but cannot be selected for new sessions
* The facilitator dropdown in the session form shows only active facilitators

---

## Venue Management (Admin Only)

Admin maintains a **managed venue list** accessible via the ⚙ settings icon next to the Venue field in the session form.

* Each venue has a name, optional address, and optional capacity
* Admin can add, update, and deactivate venues at any time
* Deactivated venues remain on existing sessions but cannot be selected for new sessions
* The venue dropdown in the session form shows only active venues
* The system shows a warning (not a block) if `max_participants` exceeds the venue's capacity

---

## Teams Integration

System must attempt automatic Teams meeting creation on session save.

IF success:
→ Store Teams meeting link (`teams_link_status = AUTO_CREATED`)
→ Link available to all session participants via LMS

IF failure:
→ `teams_link_status = PENDING_MANUAL`
→ Admin provides manual Teams link before session goes live

Reschedule: if session date/time is updated, system attempts to update the existing Teams meeting. If update fails, Admin must manually update the link.

Participants access the Teams link from their LMS session view.

---

## Participant Management

Participants added via two paths:

**Path 1 — Direct add by Admin:**
* Admin selects users from the user list
* Status = `INVITED`

**Path 2 — Manager Nomination (if nomination window is configured):**
* Within the nomination window, Managers nominate direct reports
* Nominated users appear with status = `NOMINATED`
* Admin reviews nominations and confirms or rejects
* On CONFIRMED: status = `CONFIRMED` (treated as fully enrolled participant)
* On REJECTED: status = `REJECTED_NOMINATION` (Manager and Employee notified)
* Manager can cancel a nomination while the window is still open

Rules:

* Users must be active LMS users
* Adding or confirming beyond `max_participants` is blocked
* Duplicate enrollment prevented (same user cannot be both INVITED and NOMINATED)
* Admin can directly add participants regardless of whether a nomination window is active
* Participants can be removed before session is COMPLETED
* Nomination window is optional — if not set, only Admin can add participants

---

## Attendance Tracking

Attendance tracking is **always enabled** for every session. There is no option to disable it.

### Online Attendance (Teams Auto)

* After session ends, system fetches Teams attendance report
* Participants matched by user identity (email / AAD ID)
* `attendance_mode = ONLINE`, `attendance_source = TEAMS_AUTO`
* Admin can override an auto-recorded attendance (sets `attendance_source = ADMIN_OVERRIDE`)

### Offline Attendance (Admin / HR Manual)

* Admin **or HR** selects participants and marks each as `ATTENDED` or `NOT_ATTENDED`
* `attendance_mode = OFFLINE`, `attendance_source = ADMIN_MANUAL`
* HR marking attendance is required for classroom-only sessions where the Admin is unavailable

### Bulk Attendance Update

* Admin or HR can update attendance for multiple offline participants in a single operation

### Offline Attendance Excel Import

Physical classroom sessions use a paper sign-in sheet. HR transfers this to Excel and imports it into the system:

**Workflow:**
1. Admin creates the session → LMS generates a pre-filled Excel template (one row per enrolled participant: `employee_id`, `employee_name`, `department`, `attendance` column)
2. HR downloads the template, shares it or fills it from the physical sign-in sheet
3. HR uploads the completed Excel via the Import Attendance flow
4. System parses the file, previews matched records with warnings for unmatched employee IDs or invalid values
5. HR confirms → valid rows applied as `ATTENDED` / `NOT_ATTENDED`; warning rows skipped

**Excel template format:**

| Column | Field | Values |
|---|---|---|
| A | `employee_id` | Must match LMS user record |
| B | `employee_name` | Display only — not used for matching |
| C | `department` | Display only |
| D | `attendance` | `ATTENDED` or `NOT_ATTENDED` (case-insensitive) |

**Rules:**
- Row 1 must be the header row
- Matching is done by `employee_id` — name mismatches produce a warning but do not block
- Invalid `attendance` values produce a warning; that row is skipped
- Employee IDs not found in LMS produce a warning; that row is skipped
- Maximum file size: 5 MB (.xlsx or .xls only)
- Importing does not overwrite Teams-auto-recorded attendance unless `force_override = true`

Attendance states per participant:
* `ATTENDED`
* `NOT_ATTENDED`

Attendance drives completion logic — only `ATTENDED` records count.

---

## Session Rescheduling

Admin may reschedule a session that is in `SCHEDULED` state:

* Date/time/venue may be updated
* System attempts Teams meeting update
* All INVITED and CONFIRMED participants re-notified of the change
* Reschedule event emitted to audit log

Rules:
* `COMPLETED` sessions cannot be rescheduled
* `CANCELLED` sessions cannot be rescheduled

---

## Session Lifecycle

States:

* `SCHEDULED` — created, not yet occurred
* `COMPLETED` — session occurred; attendance finalised
* `CANCELLED` — session did not occur

Rules:

* `COMPLETED` → no structural changes allowed
* `CANCELLED` → no completion impact; assignment for session resource remains incomplete
* Transition to `COMPLETED` triggers attendance finalisation and training progress update

---

## Session Visibility

### Employee

* Own assigned sessions + sessions where they have been nominated

### Manager

* Team sessions (via hierarchy) + sessions where their nominations are pending or decided

### Admin

* All sessions

---

## Session Export

Admin can export session attendance as XLSX with filters:
* Date range
* Training item
* Session status
* Facilitator

Export follows async job pattern (POST → poll → download).

---

## Migration Support

* Session records
* Attendance records
* Completion linkage

Read-only after migration.

---

# 5. Business Rules

## Session Structure

BR-01 Session must link to a published, active training item. The training item may be a **Course, Learning Path, or Curriculum**. The training item must have `status = PUBLISHED` at the time of session creation.
BR-02 Session code must be unique (auto-generated: SES-001, SES-002, …)
BR-03 Session must have an assigned facilitator (selected from the managed facilitator list)
BR-04 Sessions cannot be created with a start date in the past
BR-05 Max participants enforced — adding or confirming beyond capacity is blocked (no waitlist)

---

## Venue Rules

BR-22a Admin must select a venue from the managed venue list for new sessions
BR-22b System shows a warning (not a block) if `max_participants` exceeds venue capacity
BR-22c Deactivated venues remain visible on existing sessions but cannot be selected for new sessions

---

## Facilitator Rules

BR-22d Admin must select a facilitator from the managed facilitator list for new sessions
BR-22e Deactivated facilitators remain visible on existing sessions but cannot be selected for new sessions

---

## Nomination Rules

BR-24 Nomination window: `nomination_open_at` must be before `nomination_close_at`; both must be before `start_time`
BR-25 Managers can only nominate direct reports (hierarchy depth = 1)
BR-26 Nominated and CONFIRMED participant counts both apply against `max_participants` capacity
BR-27 Manager can cancel a nomination only while `nomination_close_at` has not yet passed
BR-28 Admin can confirm or reject nominations at any time before the session is COMPLETED
BR-29 Nomination window is optional — if not set, only Admin can add participants directly

---

## Attendance Rules

BR-06 Attendance required for training completion — only ATTENDED status counts
BR-07 Online attendance auto-fetched from Teams after session end
BR-08 Offline attendance manually recorded by Admin or HR
BR-09 Admin can override Teams-auto attendance (sets source = ADMIN_OVERRIDE)
BR-10 Cancelled sessions do not generate attendance records or completion events
BR-11 Bulk attendance update supported for offline participants

---

## Assignment / Completion Rules

BR-12 Sessions contribute to assignment completion when participant is ATTENDED
BR-13 Completion triggers training progress update → compliance evaluation

---

## Lifecycle Rules

BR-14 COMPLETED sessions are locked — no structural changes allowed
BR-15 CANCELLED sessions retained in history
BR-16 Only SCHEDULED sessions may be rescheduled
BR-17 Rescheduled sessions re-notify all INVITED and CONFIRMED participants

---

## Compliance Rules

BR-18 Session completion updates compliance status
BR-19 Compliance data exposed via LMS APIs for PES (pull model)

---

## Authorization Rules

BR-20 Global roles via Keycloak
BR-21 Hierarchy defines manager visibility (direct reports only)
BR-22 Admin and HR can create, reschedule, or cancel sessions; Employee and Manager have no session creation capability
BR-23 Only Admin and HR can update attendance records

---

# 6. Workflows

## Session Creation

Admin creates session
→ Selects training (Course / Learning Path / Curriculum — must be PUBLISHED)
→ Selects facilitator from managed list (⚙ to manage list)
→ Selects venue from managed list (⚙ to manage list)
→ Sets max_participants, nomination window (optional), notes
→ System auto-generates session code
→ System attempts Teams meeting creation
→ Session stored with status = SCHEDULED
→ INVITED participants notified (with Teams link)

---

## Manager Nomination

Nomination window opens (Admin-configured)
→ Manager opens upcoming sessions list
→ Manager clicks "Nominate" on a session with open window
→ Manager selects direct reports to nominate
→ Nomination submitted → status = NOMINATED
→ Employee notified: "You have been nominated for [session]"
→ Admin notified of nomination for review

Admin reviews nominations
→ Confirms: status = CONFIRMED → Employee + Manager notified
→ Rejects: status = REJECTED_NOMINATION → Employee + Manager notified with reason

Manager cancels nomination (while window is open)
→ status withdrawn
→ Employee notified of cancellation

Nomination window closes
→ Admin notified with summary of pending nominations

---

## Session Reschedule

Admin updates date/time/venue
→ System attempts Teams meeting update
→ Session record updated
→ All INVITED + CONFIRMED participants re-notified
→ SESSION_RESCHEDULED audit event emitted

---

## Online Attendance Recording

Session end time passes
→ System fetches Teams attendance report
→ Matches users → creates `session_attendance` records (source = TEAMS_AUTO)
→ Admin reviews and can override individual records

---

## Offline Attendance Recording

Admin or HR opens session attendance view
→ Selects offline participants
→ Marks ATTENDED / NOT_ATTENDED
→ Bulk or individual update saved (source = ADMIN_MANUAL)

Or:
→ Downloads Excel template → fills from paper sign-in → uploads file
→ System parses file → previews → HR confirms → records applied

---

## Completion Flow

Admin marks session COMPLETED (or system auto-completes after attendance finalized)
→ All ATTENDED participants → training resource progress updated → COMPLETED
→ Completion evaluation triggered for each participant's assignment
→ Compliance updated
→ SESSION_COMPLETED audit event emitted

---

## Cancellation Flow

Admin cancels session
→ Session marked CANCELLED
→ All INVITED + NOMINATED + CONFIRMED participants notified
→ Training assignments remain incomplete
→ SESSION_CANCELLED audit event emitted

---

# 7. Data Rules

## Data Ownership

| System | Data |
|---|---|
| LMS | Sessions, facilitators, venues, participants, attendance |
| Teams | Online meeting delivery + attendance report |
| Employee DB | Hierarchy |
| PES | Consumes compliance |

---

## Data Edit Rules

* Session creation/edit → Admin
* Facilitator list → Admin (settings icon)
* Venue list → Admin (settings icon)
* Participants (direct) → Admin
* Nominations → Manager (submit/cancel), Admin (confirm/reject)
* Attendance → Admin / HR / System (Teams auto)
* Completion → System

---

## Identifiers

* Session ID (UUID)
* Session code (auto-generated: SES-NNN)
* Training ID
* User ID
* Facilitator ID
* Venue ID
* Attendance ID

---

## Retention

* Sessions permanent
* Attendance permanent
* Cancelled sessions retained
* Facilitator list permanent (deactivated, not deleted)
* Venue list permanent (deactivated, not deleted)

---

## Sync Behavior

* Session stable if Teams fails — Admin provides manual link
* Attendance can be updated after session until Admin marks COMPLETED
* Online attendance auto-imported from Teams once; Admin overrides allowed

---

# 8. Edge Cases

## Teams Creation Failure

Session still valid with `teams_link_status = PENDING_MANUAL`. Admin must provide manual Teams link before session goes live.

---

## Teams Attendance Pull Failure

Online attendance not auto-populated. Admin manually records all attendance or imports via Excel.

---

## Session Rescheduled After Invites Sent

All INVITED and CONFIRMED participants re-notified with updated date/time/link. Previous notification superseded.

---

## Missed Session

Training resource remains incomplete. User must be enrolled in another scheduled session for the same training.

---

## Cancelled Session

No completion generated. Assignment for session resource remains incomplete. All participants (INVITED, NOMINATED, CONFIRMED) notified. Session retained for history.

---

## Participant Removed Before Session

Attendance record not created. Training assignment unaffected.

---

## Capacity Reached

Adding further participants or confirming nominations blocked with `SESSION_AT_CAPACITY` error. No waitlist.

---

## Inactive User

Removed from active participant tracking. Historical attendance records retained.

---

## Duplicate Enrollment

Blocked — same user cannot be both directly INVITED and NOMINATED, or added to the same session twice.

---

## Missing Offline Attendance

Admin must update manually before or during COMPLETED transition. Unmarked participants default to NOT_ATTENDED.

---

## Nomination Window Closes with Pending Nominations

Admin receives a notification summary of all pending (unreviewed) nominations. Admin must confirm or reject them before completing the session.

---

## Facilitator Deactivated After Session Created

Existing session retains the deactivated facilitator's name for display. The deactivated facilitator cannot be selected for new sessions.

---

## Venue Capacity Exceeded by max_participants

System shows a warning at creation time. Does not block. Admin accepts responsibility for capacity management.

---

# 9. Acceptance Criteria

* Admin can create hybrid sessions with session code, facilitator (from managed list), venue (from managed list), and max participants
* Session type selector does not exist — all sessions are hybrid
* Teams meeting auto-created on session save; manual override available on failure
* Admin can manage the facilitator list and venue list via settings icon in session form
* Participants can be added directly by Admin up to max_participants; capacity enforcement blocks excess
* Manager can nominate direct reports for sessions with an open nomination window
* Manager can cancel a nomination while the window is open
* Admin can confirm or reject nominations at any time before COMPLETED
* CONFIRMED nominees count against max_participants capacity
* Online attendance auto-fetched from Teams after session
* Offline attendance recorded manually or via Excel import by Admin/HR
* Admin can override any attendance record
* Session rescheduling works and re-notifies all INVITED + CONFIRMED participants
* Session lifecycle enforced (SCHEDULED → COMPLETED / CANCELLED; COMPLETED locked)
* Completion triggered for ATTENDED participants → training progress + compliance updated
* Cancelled sessions do not contribute to completion
* Session attendance export works with filters (including facilitator filter)
* All session actions emit correct audit events
* Authorization respects role + hierarchy
* Sessions can be linked to Course, Learning Path, or Curriculum (all must be PUBLISHED)

---

# 10. Dependencies

* Training Management
* Assignment Engine
* User Management
* Employee DB (hierarchy)
* Microsoft Teams (Graph API)
* Notifications
* PES (API consumer)

---

# 11. Assumptions

* All sessions are hybrid (online via Teams + offline in-person) — no session type selector
* Attendance tracking is always enabled — no attendance tracking toggle
* < 1000 users; single tenant
* Teams Graph API available for meeting creation and attendance pull
* Hierarchy-based access for manager visibility and nomination scope
* On-prem deployment
* OpenAPI integration model

---

# 12. Audit Events

| Event | event_code | Minimum Data Captured |
|---|---|---|
| Session created | `SESSION_CREATED` | session_id, session_code, training_id, facilitator_id, venue_id, created_by, correlation_id, timestamp |
| Session rescheduled | `SESSION_RESCHEDULED` | session_id, old_datetime, new_datetime, old_venue_id, new_venue_id, updated_by, correlation_id, timestamp |
| Session completed | `SESSION_COMPLETED` | session_id, attended_count, not_attended_count, correlation_id, timestamp |
| Session cancelled | `SESSION_CANCELLED` | session_id, cancelled_by, reason, correlation_id, timestamp |
| Participant added | `SESSION_PARTICIPANT_ADDED` | session_id, user_id, added_by, correlation_id, timestamp |
| Participant removed | `SESSION_PARTICIPANT_REMOVED` | session_id, user_id, removed_by, correlation_id, timestamp |
| Attendance recorded | `SESSION_ATTENDANCE_RECORDED` | session_id, user_id, attendance_status, attendance_source, recorded_by, correlation_id, timestamp |
| Attendance overridden | `SESSION_ATTENDANCE_OVERRIDDEN` | session_id, user_id, old_status, new_status, overridden_by, correlation_id, timestamp |
| Nomination submitted | `SESSION_NOMINATED` | session_id, user_id, nominated_by, correlation_id, timestamp |
| Nomination cancelled | `SESSION_NOMINATION_CANCELLED` | session_id, user_id, cancelled_by, correlation_id, timestamp |
| Nomination decided | `SESSION_NOMINATION_DECIDED` | session_id, user_id, decision (CONFIRMED/REJECTED), decided_by, reason, correlation_id, timestamp |

---

# 13. Future Enhancements

* Participant RSVP (CONFIRMED / DECLINED by employee)
* Waitlist for fully booked sessions
* Partial attendance tracking (time-based)
* Facilitator self-service session management
* Recurring session templates
* Session feedback / evaluation forms
* Nomination approval by HR (in addition to Admin)

---

# End of Document
