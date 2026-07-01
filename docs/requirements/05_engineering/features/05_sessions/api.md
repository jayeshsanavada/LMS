# Sessions — API Specification

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
- `SELF_ONLY` — target data must belong to the authenticated user
- `TEAM_ONLY` — target data must belong to the authenticated user's direct reports (hierarchy depth = 1)
- `ORG_WIDE` — any user in the organization

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
    "total": 120,
    "has_next": true
  }
}
```

### Export Pattern (Async)
1. `POST /sessions/export` → returns `{ "job_id": "..." }`
2. `GET /sessions/export/{job_id}` → poll until `status = READY`
3. `GET /sessions/export/{job_id}/download` → stream file

---

## Group: Sessions

---

### 1. List My Sessions

```
GET /api/v1/sessions/me
```

**Purpose:** Returns sessions the current user is an INVITED or NOMINATED participant in.

**Access:** Any authenticated user (SELF_ONLY)

**Query Parameters:**
| Parameter | Type | Notes |
|---|---|---|
| `session_state` | string | `SCHEDULED` / `COMPLETED` / `CANCELLED` |
| `page` | integer | Default 1 |
| `size` | integer | Default 20 |

**Response:** Paginated list of session summaries including session_code, title, training title, start_time, end_time, location, teams_meeting_link, session_state, attendance_status (if completed)

---

### 2. List Sessions (Admin)

```
GET /api/v1/sessions
```

**Purpose:** Returns paginated list of all sessions for admin management.

**Access:** ADMIN only

**Query Parameters:**
| Parameter | Type | Notes |
|---|---|---|
| `session_state` | string | `SCHEDULED` / `COMPLETED` / `CANCELLED` |
| `training_id` | UUID | Filter by training |
| `facilitator_id` | UUID | Filter by facilitator |
| `start_date` | date | ISO 8601 |
| `end_date` | date | ISO 8601 |
| `include_cancelled` | boolean | Default false |
| `page` | integer | Default 1 |
| `size` | integer | Default 20 |
| `sort_by` | string | Default `start_time` |
| `sort_order` | string | `asc` / `desc` |

**Response:** Paginated list with session_code, title, training_title, instructor_name, start_time, session_state, participant_count, attended_count

---

### 3. List Team Sessions

```
GET /api/v1/sessions/team
```

**Purpose:** Returns sessions where any of the current user's direct reports is a participant.

**Access:** Any authenticated user (TEAM_ONLY — hierarchy depth = 1)

**Query Parameters:**
| Parameter | Type | Notes |
|---|---|---|
| `session_state` | string | Filter by state |
| `page` | integer | Default 1 |
| `size` | integer | Default 20 |

**Response:** Paginated list of sessions with participant attendance summary per team member

---

### 4. Get Session Detail

```
GET /api/v1/sessions/{session_id}
```

**Purpose:** Returns full session details including participants and attendance summary.

**Access:**
- ADMIN / HR: any session
- EMPLOYEE: only sessions where they are a participant (SELF_ONLY)
- Manager: sessions where at least one direct report is a participant (TEAM_ONLY)

**Path Parameters:** `session_id` (UUID)

**Response:**
```json
{
  "id": "uuid",
  "session_code": "SES-001",
  "title": "...",
  "training_item_id": "uuid",
  "training_title": "...",
  "facilitator_id": "uuid",
  "facilitator_name": "...",
  "session_state": "SCHEDULED",
  "start_time": "2026-05-10T10:00:00Z",
  "end_time": "2026-05-10T12:00:00Z",
  "duration_minutes": 120,
  "physical_location": "Conference Room B",
  "teams_meeting_link": "https://...",
  "teams_meeting_id": "...",
  "max_participants": 30,
  "participant_count": 18,
  "notes": "...",
  "created_at": "...",
  "created_by": "uuid"
}
```

**Error Codes:**
- `SESSION_NOT_FOUND` (404)
- `ACCESS_DENIED` (403)

---

### 5. Create Session

```
POST /api/v1/sessions
```

**Purpose:** Creates a new hybrid session linked to a training course. Auto-generates session code. Attempts Teams meeting creation on save.

**Access:** ADMIN, HR

**Request Body:**
```json
{
  "title": "Q1 Safety Briefing",
  "training_item_id": "uuid",
  "facilitator_id": "uuid",
  "venue_id": "uuid",
  "start_time": "2026-05-10T10:00:00Z",
  "end_time": "2026-05-10T12:00:00Z",
  "max_participants": 30,
  "nomination_open_at": null,
  "nomination_close_at": null,
  "notes": "Bring ID badge"
}
```

**Business Logic:**
- Session code auto-generated (SES-001, SES-002, …)
- Training must be PUBLISHED and active
- `start_time` must be in the future
- System attempts Teams meeting creation via Graph API; stores `teams_meeting_link` + `teams_meeting_id` on success
- If Teams creation fails: session saved with `teams_link_status = PENDING_MANUAL`

**Response:** Created session object (201)

**Error Codes:**
- `TRAINING_NOT_FOUND` (404)
- `TRAINING_NOT_PUBLISHED` (422)
- `INVALID_SESSION_TIME` (422) — start_time in the past
- `FACILITATOR_NOT_FOUND` (404)
- `VENUE_NOT_FOUND` (404)

---

### 6. Reschedule Session

```
PUT /api/v1/sessions/{session_id}
```

**Purpose:** Updates session scheduling fields (date/time/location/notes/instructor). Triggers Teams meeting update and re-notifies all INVITED participants.

**Access:** ADMIN, HR

**Path Parameters:** `session_id` (UUID)

**Request Body:**
```json
{
  "start_time": "2026-05-15T14:00:00Z",
  "end_time": "2026-05-15T16:00:00Z",
  "venue_id": "uuid",
  "facilitator_id": "uuid",
  "notes": "Room changed"
}
```

**Business Logic:**
- Only `SCHEDULED` sessions may be rescheduled
- System attempts Teams meeting update; if fails, `teams_link_status = PENDING_MANUAL`
- All INVITED participants re-notified
- `SESSION_RESCHEDULED` audit event emitted

**Response:** Updated session object (200)

**Error Codes:**
- `SESSION_NOT_FOUND` (404)
- `SESSION_NOT_RESCHEDULABLE` (422) — state is COMPLETED or CANCELLED
- `INVALID_SESSION_TIME` (422)

---

### 7. Cancel Session

```
POST /api/v1/sessions/{session_id}/cancel
```

**Purpose:** Cancels a SCHEDULED session. Notifies all participants. No completion impact.

**Access:** ADMIN, HR

**Path Parameters:** `session_id` (UUID)

**Request Body:**
```json
{
  "reason": "Trainer unavailable"
}
```

**Business Logic:**
- Only SCHEDULED sessions may be cancelled
- All INVITED, NOMINATED, and CONFIRMED participants notified
- Training assignments remain incomplete
- `SESSION_CANCELLED` audit event emitted

**Response:** `{ "session_id": "uuid", "session_state": "CANCELLED" }` (200)

**Error Codes:**
- `SESSION_NOT_FOUND` (404)
- `SESSION_ALREADY_COMPLETED` (422)
- `SESSION_ALREADY_CANCELLED` (422)

---

### 8. Complete Session

```
POST /api/v1/sessions/{session_id}/complete
```

**Purpose:** Marks session as COMPLETED. Finalises attendance. Triggers training progress update for all ATTENDED participants.

**Access:** ADMIN, HR

**Path Parameters:** `session_id` (UUID)

**Business Logic:**
- Only SCHEDULED sessions may be completed
- Unmarked offline participants default to NOT_ATTENDED
- Training resource progress updated to COMPLETED for all ATTENDED participants
- Completion evaluation triggered per assignment
- `SESSION_COMPLETED` audit event emitted

**Response:** `{ "session_id": "uuid", "session_state": "COMPLETED", "attended_count": 12, "not_attended_count": 6 }` (200)

**Error Codes:**
- `SESSION_NOT_FOUND` (404)
- `SESSION_NOT_COMPLETABLE` (422)

---

### 9. Set Teams Link (Manual Override)

```
PUT /api/v1/sessions/{session_id}/teams-link
```

**Purpose:** Admin manually provides or updates the Teams meeting link when auto-creation failed.

**Access:** ADMIN only

**Request Body:**
```json
{
  "teams_meeting_link": "https://teams.microsoft.com/l/meetup-join/..."
}
```

**Response:** Updated session object (200)

**Error Codes:**
- `SESSION_NOT_FOUND` (404)
- `SESSION_ALREADY_COMPLETED` (422)

---

### 10. Export Sessions

```
POST /api/v1/sessions/export
```

**Purpose:** Initiates async export of session attendance data as CSV/XLSX.

**Access:** ADMIN, HR

**Request Body:**
```json
{
  "format": "csv",
  "filters": {
    "start_date": "2026-01-01",
    "end_date": "2026-06-30",
    "training_id": "uuid",
    "session_state": "COMPLETED",
    "instructor_id": "uuid"
  }
}
```

**Response:** `{ "job_id": "uuid" }` (202)

---

```
GET /api/v1/sessions/export/{job_id}
```

**Purpose:** Poll export job status.

**Access:** ADMIN, HR

**Response:** `{ "job_id": "uuid", "status": "READY", "file_name": "sessions_export_2026.csv" }`

---

```
GET /api/v1/sessions/export/{job_id}/download
```

**Purpose:** Download completed export file.

**Access:** ADMIN, HR

**Response:** File stream (CSV/XLSX)

---

## Group: Participants

---

### 11. List Session Participants

```
GET /api/v1/sessions/{session_id}/participants
```

**Purpose:** Returns all INVITED participants for a session, with their attendance status if available.

**Access:** ADMIN only

**Response:**
```json
{
  "items": [
    {
      "user_id": "uuid",
      "full_name": "...",
      "email": "...",
      "participant_status": "INVITED",
      "attendance_mode": "OFFLINE",
      "attendance_status": "ATTENDED",
      "attendance_source": "ADMIN_MANUAL"
    }
  ]
}
```

---

### 12. Add Participants

```
POST /api/v1/sessions/{session_id}/participants
```

**Purpose:** Adds one or more users to a session as INVITED participants.

**Access:** ADMIN only

**Request Body:**
```json
{
  "user_ids": ["uuid1", "uuid2"],
  "assignment_id": "uuid"
}
```

**Business Logic:**
- All users must be active LMS users
- Total participants must not exceed `max_participants`
- Duplicate participants blocked
- INVITED participants notified with Teams link

**Response:** List of added participants (201)

**Error Codes:**
- `SESSION_AT_CAPACITY` (422)
- `USER_NOT_FOUND` (404)
- `DUPLICATE_PARTICIPANT` (409)
- `SESSION_ALREADY_COMPLETED` (422)

---

### 13. Remove Participant

```
DELETE /api/v1/sessions/{session_id}/participants/{user_id}
```

**Purpose:** Removes a participant from a session before it is COMPLETED.

**Access:** ADMIN only

**Business Logic:**
- Only allowed when session is SCHEDULED
- Participant notified of removal
- `SESSION_PARTICIPANT_REMOVED` audit event emitted

**Response:** 204 No Content

**Error Codes:**
- `PARTICIPANT_NOT_FOUND` (404)
- `SESSION_ALREADY_COMPLETED` (422)

---

## Group: Attendance

---

### 14. Get Attendance

```
GET /api/v1/sessions/{session_id}/attendance
```

**Purpose:** Returns current attendance records for all participants.

**Access:** ADMIN, HR

**Response:**
```json
{
  "items": [
    {
      "user_id": "uuid",
      "full_name": "...",
      "attendance_mode": "ONLINE",
      "attendance_status": "ATTENDED",
      "attendance_source": "TEAMS_AUTO",
      "marked_by_user_id": null,
      "marked_at": "2026-05-10T12:30:00Z"
    }
  ]
}
```

---

### 15. Bulk Update Attendance (Offline)

```
PUT /api/v1/sessions/{session_id}/attendance
```

**Purpose:** Admin or HR records or updates offline (classroom) attendance for multiple participants in one call.

**Access:** ADMIN, HR

**Request Body:**
```json
{
  "attendance_mode": "OFFLINE",
  "records": [
    { "user_id": "uuid1", "attendance_status": "ATTENDED" },
    { "user_id": "uuid2", "attendance_status": "NOT_ATTENDED" }
  ]
}
```

**Business Logic:**
- Sets `attendance_source = ADMIN_MANUAL`
- Session must not be CANCELLED
- Creates or updates `session_attendance` rows

**Response:** `{ "updated_count": 2 }` (200)

**Error Codes:**
- `SESSION_ALREADY_CANCELLED` (422)
- `USER_NOT_SESSION_PARTICIPANT` (422)

---

### 16. Download Attendance Template (Excel)

```
GET /api/v1/sessions/{session_id}/attendance/template
```

**Purpose:** Returns a pre-filled Excel template (.xlsx) with one row per enrolled participant. HR downloads this, fills the `attendance` column from the physical sign-in sheet, and re-uploads it.

**Access:** ADMIN, HR

**Response:** Excel file stream (Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`)

**File columns:** `employee_id` · `employee_name` · `department` · `attendance` (blank — to be filled)

**Error Codes:**
- `SESSION_NOT_FOUND` (404)

---

### 16A. Import Offline Attendance from Excel

```
POST /api/v1/sessions/{session_id}/attendance/import
```

**Purpose:** Parses an uploaded Excel file and applies offline attendance records. Used by HR for classroom sessions where physical sign-in sheets are collected.

**Access:** ADMIN, HR

**Request:** `multipart/form-data`

| Field | Type | Description |
|---|---|---|
| `file` | file | `.xlsx` or `.xls`; max 5 MB |
| `force_override` | boolean | Default `false`. If `true`, overwrites existing TEAMS_AUTO records |

**Processing Logic:**
- Row 1 treated as header; skipped
- Each row matched to LMS user by `employee_id`
- Invalid `attendance` values → warning, row skipped
- `employee_id` not found in LMS → warning, row skipped
- Valid rows → `session_attendance` created/updated with `attendance_mode = OFFLINE`, `attendance_source = ADMIN_MANUAL`
- Existing `TEAMS_AUTO` records only overwritten when `force_override = true`

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "total_rows": 25,
    "imported_count": 23,
    "skipped_count": 2,
    "warnings": [
      { "row": 8,  "employee_id": "EMP-999", "reason": "Employee ID not found in LMS" },
      { "row": 9,  "employee_id": "EMP-007", "reason": "Invalid attendance value: 'YES'" }
    ]
  },
  "message": "23 attendance records imported. 2 rows skipped (see warnings)."
}
```

**Error Codes:**
- `INVALID_FILE_FORMAT` (422) — file is not .xlsx or .xls
- `FILE_TOO_LARGE` (413) — file exceeds 5 MB
- `MISSING_HEADER_ROW` (422) — column headers not found in row 1
- `SESSION_ALREADY_CANCELLED` (422)

**Side Effects:**
- `session_attendance` rows created or updated
- `SESSION_ATTENDANCE_RECORDED` audit event emitted per imported record (bulk)
- `SESSION_ATTENDANCE_IMPORTED` audit event emitted summarising the import (actor, session_id, imported_count, skipped_count)

---

### 17. Fetch Online Attendance from Teams (Auto)

```
POST /api/v1/sessions/{session_id}/attendance/fetch-teams
```

**Purpose:** Triggers a pull of the Teams attendance report for this session. Matches attendees to LMS users and records `ATTENDED` / `NOT_ATTENDED`.

**Access:** ADMIN only

**Business Logic:**
- Calls Microsoft Graph API for Teams meeting attendance report
- Matches by user identity (email / AAD ID)
- Sets `attendance_source = TEAMS_AUTO` for auto-matched records
- Unmatched Teams attendees logged but not linked to LMS users
- Admin can override any auto-recorded result (sets `attendance_source = ADMIN_OVERRIDE`)
- `SESSION_ATTENDANCE_RECORDED` audit event emitted for each record created/updated

**Response:** `{ "auto_recorded": 15, "unmatched": 2 }` (200)

**Error Codes:**
- `TEAMS_FETCH_FAILED` (502) — Graph API unavailable
- `SESSION_NOT_FOUND` (404)

---

## Group: Nominations

---

### 18. Submit Nomination

```
POST /api/v1/sessions/{session_id}/nominations
```

**Purpose:** Manager nominates one or more direct reports for a session that has an open nomination window.

**Access:** Any authenticated user (TEAM_ONLY — nominated users must be direct reports)

**Request Body:**
```json
{
  "user_ids": ["uuid1", "uuid2"]
}
```

**Business Logic:**
- Nomination window must be open (`nomination_open_at` ≤ now ≤ `nomination_close_at`)
- All nominated users must be direct reports of the requester (hierarchy depth = 1)
- Nominated users added to `session_participants` with `participant_status = NOMINATED`
- Capacity check: NOMINATED participants count against `max_participants`
- Duplicate enrollment blocked (same user cannot be INVITED and NOMINATED)
- Employee notified: "You have been nominated for [session]"
- Admin notified of nomination for review
- Audit event `SESSION_NOMINATED` emitted per user

**Response:** 201 Created — list of nominated participants

**Error Codes:**
- `NOMINATION_WINDOW_CLOSED` (422) — window not open
- `NOT_DIRECT_REPORT` (403) — one or more user_ids are not direct reports
- `SESSION_AT_CAPACITY` (422)
- `DUPLICATE_PARTICIPANT` (409)

---

### 19. Cancel Nomination (Manager)

```
DELETE /api/v1/sessions/{session_id}/nominations/{user_id}
```

**Purpose:** Manager cancels a nomination they submitted for a direct report while the nomination window is still open.

**Access:** Nomination submitter (TEAM_ONLY) or ADMIN

**Business Logic:**
- Nomination window must still be open (`nomination_close_at` has not passed)
- `participant_status` must be `NOMINATED` (cannot cancel already-decided nominations)
- Employee notified of cancellation
- Audit event `SESSION_NOMINATION_CANCELLED` emitted

**Response:** 204 No Content

**Error Codes:**
- `NOMINATION_WINDOW_CLOSED` (422)
- `NOMINATION_ALREADY_DECIDED` (409) — Admin has already confirmed or rejected

---

### 20. Decide Nomination (Admin — Confirm or Reject)

```
POST /api/v1/sessions/{session_id}/nominations/{user_id}/decide
```

**Purpose:** Admin confirms or rejects a pending nomination.

**Access:** ADMIN only

**Request Body:**
```json
{
  "decision": "CONFIRMED",
  "reason": null
}
```

**Validation Rules:**
- `decision`: `CONFIRMED` or `REJECTED`
- `reason` required when `decision = REJECTED`

**Business Logic:**
- `CONFIRMED`: `participant_status → CONFIRMED`; capacity check applied; Employee + Manager notified
- `REJECTED`: `participant_status → REJECTED_NOMINATION`; Employee + Manager notified with reason
- Audit event `SESSION_NOMINATION_DECIDED` emitted

**Response:** 200 OK — updated participant with new status

**Error Codes:**
- `SESSION_AT_CAPACITY` (422) — cannot confirm; session full
- `NOMINATION_NOT_PENDING` (409) — nomination already decided
- `REJECTION_REASON_REQUIRED` (400)

---

## Group: Facilitator Management

---

### 21. List Facilitators

```
GET /api/v1/facilitators
```

**Purpose:** Returns the managed facilitator list. Dropdown source for the Session form.

**Access:** ADMIN only

**Query Parameters:**
| Parameter | Type | Notes |
|---|---|---|
| `is_active` | boolean | Default `true`; pass `false` to include deactivated |

**Response:** Paginated list — `facilitator_id`, `name`, `user_id` (nullable), `is_active`

---

### 22. Create Facilitator

```
POST /api/v1/facilitators
```

**Access:** ADMIN only

**Request Body:**
```json
{
  "name": "John Smith",
  "user_id": null
}
```

**Notes:** `user_id` is optional — null means an external facilitator not in LMS.

**Response:** 201 Created — facilitator object

---

### 23. Update Facilitator

```
PUT /api/v1/facilitators/{facilitator_id}
```

**Access:** ADMIN only

**Request Body:**
```json
{ "name": "John Smith (External)" }
```

**Response:** 200 OK — updated facilitator object

---

### 24. Deactivate Facilitator

```
POST /api/v1/facilitators/{facilitator_id}/deactivate
```

**Access:** ADMIN only

**Business Logic:**
- Deactivated facilitators remain on existing sessions
- Cannot be selected for new sessions after deactivation

**Response:** 200 OK

---

## Group: Venue Management

---

### 25. List Venues

```
GET /api/v1/venues
```

**Purpose:** Returns the managed venue list. Dropdown source for the Session form.

**Access:** ADMIN only

**Query Parameters:**
| Parameter | Type | Notes |
|---|---|---|
| `is_active` | boolean | Default `true` |

**Response:** Paginated list — `venue_id`, `name`, `address`, `capacity`, `is_active`

---

### 26. Create Venue

```
POST /api/v1/venues
```

**Access:** ADMIN only

**Request Body:**
```json
{
  "name": "Conference Room B",
  "address": "Block A, Floor 2",
  "capacity": 30
}
```

**Response:** 201 Created — venue object

---

### 27. Update Venue

```
PUT /api/v1/venues/{venue_id}
```

**Access:** ADMIN only

**Request Body:** Any subset of `name`, `address`, `capacity`

**Response:** 200 OK — updated venue object

---

### 28. Deactivate Venue

```
POST /api/v1/venues/{venue_id}/deactivate
```

**Access:** ADMIN only

**Business Logic:**
- Deactivated venues remain on existing sessions
- Cannot be selected for new sessions after deactivation
- System warns (does not block) if `max_participants` exceeds venue `capacity` at session creation

**Response:** 200 OK

---

## Additions vs Master API List (§13)

| # | Addition | Reason |
|---|---|---|
| S1 | `PUT /sessions/{id}` as explicit **Reschedule** with Teams update + re-notification | Rescheduling workflow missing from master |
| S2 | `POST /sessions/{id}/complete` — explicit completion trigger | Missing from master; needed to finalise attendance and trigger progress |
| S3 | `PUT /sessions/{id}/teams-link` — manual Teams link override | Master had `POST /teams-link`; changed to PUT (idempotent override) |
| S4 | `PUT /sessions/{id}/attendance` — bulk offline attendance update | Master had only single POST; bulk needed for practical use |
| S5 | `POST /sessions/{id}/attendance/fetch-teams` — Teams auto-pull | Master had no attendance auto-fetch endpoint |
| S6 | `GET /sessions/{id}/attendance` — read attendance separately | Missing from master |
| S7 | `POST /sessions/export` + poll + download | Export pattern missing from master |
| S8 | `instructor_id`, `max_participants` in Create/Update request | Missing from master endpoint definition |
