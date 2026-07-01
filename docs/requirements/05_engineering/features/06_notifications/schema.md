# Notifications — Database Schema

---

## 1. Design Principles

- Notifications are created synchronously at event time; delivered asynchronously via worker
- Both in-app and email are Phase 1 delivery channels
- Idempotency key prevents duplicate notifications for the same event + recipient
- In-app and email delivery tracked independently per notification
- User preferences stored per event type per channel
- Notification records and delivery logs retained for 90 days (configurable)

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

## 3. Tables Owned by Notifications Module

---

### Table: `notifications`

**Purpose**
Stores all in-app notification records. One row per notification per recipient. Email delivery is tracked separately in `notification_delivery_log`.

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `user_id` | UUID | No | FK → `users.id` — recipient |
| `event_code` | VARCHAR(100) | No | Maps to notification event catalog (e.g. `ASSIGNMENT_CREATED`) |
| `title` | VARCHAR(255) | No | Rendered notification title |
| `message` | TEXT | No | Rendered notification body |
| `related_entity_type` | VARCHAR(100) | Yes | e.g. `assignment` / `session` / `request` |
| `related_entity_id` | UUID | Yes | FK to the triggering entity |
| `idempotency_key` | VARCHAR(500) | No | Composite key: `event_code:entity_id:user_id:date_bucket` — prevents duplicates |
| `is_read` | BOOLEAN | No | Default false |
| `read_at` | TIMESTAMP | Yes | Set when marked read |
| `in_app_status` | VARCHAR(50) | No | `QUEUED` / `DELIVERED` / `FAILED` / `PERMANENTLY_FAILED` |
| `email_status` | VARCHAR(50) | Yes | `QUEUED` / `SENT` / `FAILED` / `PERMANENTLY_FAILED` / null if email opted-out |
| `email_retry_count` | INTEGER | No | Default 0; max 3 |
| `in_app_retry_count` | INTEGER | No | Default 0; max 3 |
| `created_at` | TIMESTAMP | No | |
| `updated_at` | TIMESTAMP | No | |

**Business Rules**
- `idempotency_key` must be unique — duplicate check before insert
- `in_app_status` and `email_status` tracked independently
- `email_status = null` when user has opted out of email for this event type
- After 3 retries: status = `PERMANENTLY_FAILED`
- Background purge job deletes records older than configured retention (default 90 days)

**Indexes**
- `idempotency_key` (unique — duplicate prevention)
- `(user_id, is_read)` (unread count + notification center)
- `(user_id, created_at DESC)` (notification list, most recent first)
- `(in_app_status)` (worker queue — find QUEUED)
- `(email_status)` (worker queue — find QUEUED email)
- `created_at` (retention purge job)

---

### Table: `notification_delivery_log`

**Purpose**
Immutable log of every delivery attempt for each notification + channel combination. One row per attempt. Used for Admin failure monitoring and retry visibility.

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `notification_id` | UUID | No | FK → `notifications.id` |
| `channel` | VARCHAR(50) | No | `IN_APP` / `EMAIL` |
| `attempt_no` | INTEGER | No | 1-based attempt counter |
| `attempt_status` | VARCHAR(50) | No | `SUCCESS` / `FAILED` |
| `error_message` | TEXT | Yes | Error detail on failure |
| `attempted_at` | TIMESTAMP | No | When attempt was made |

**Business Rules**
- Immutable — no updates or deletes
- One row created per delivery attempt
- Admin views this to diagnose failures
- Follows same 90-day retention policy as `notifications`

**Indexes**
- `notification_id` (all attempts for one notification)
- `(attempt_status, channel)` (failure queries)
- `attempted_at` (retention purge)

---

### Table: `notification_preferences`

**Purpose**
Stores per-user opt-in/opt-out settings per notification event type per delivery channel. If no row exists for a user + event type, default is opted-in for both channels.

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `user_id` | UUID | No | FK → `users.id` |
| `event_code` | VARCHAR(100) | No | Matches notification event catalog |
| `in_app_enabled` | BOOLEAN | No | Default true |
| `email_enabled` | BOOLEAN | No | Default true |
| `updated_at` | TIMESTAMP | No | |

**Business Rules**
- One row per `(user_id, event_code)` — unique constraint
- Mandatory event types cannot be set to false (enforced at application layer)
- Missing row = default opted-in
- Preferences apply to future notifications only — already-queued notifications not affected

**Indexes**
- `(user_id, event_code)` (unique — preference lookup)
- `user_id` (load all preferences for a user)

---

## 4. Notification Event Catalog (Reference)

| Event Code | Trigger Module | Mandatory |
|---|---|---|
| `ASSIGNMENT_CREATED` | Assignment Engine | Yes |
| `ASSIGNMENT_CANCELLED` | Assignment Engine | Yes |
| `ASSIGNMENT_DUE_REMINDER` | Background Job | No |
| `ASSIGNMENT_OVERDUE_D0` | Background Job | Yes |
| `ASSIGNMENT_OVERDUE_D7` | Background Job | Yes |
| `ASSIGNMENT_OVERDUE_D30` | Background Job | Yes |
| `APPROVAL_REQUEST_SUBMITTED` | Assignment Engine | Yes |
| `APPROVAL_REQUEST_APPROVED` | Assignment Engine | Yes |
| `APPROVAL_REQUEST_REJECTED` | Assignment Engine | Yes |
| `APPROVAL_REQUEST_EXPIRED` | Background Job | Yes |
| `SESSION_INVITED` | Sessions | Yes |
| `SESSION_RESCHEDULED` | Sessions | Yes |
| `SESSION_CANCELLED` | Sessions | Yes |
| `SESSION_REMINDER_24H` | Background Job | No |
| `SESSION_REMINDER_1H` | Background Job | No |
| `SESSION_PARTICIPANT_REMOVED` | Sessions | Yes |
| `SESSION_NOMINATED` | Sessions | Yes |
| `SESSION_NOMINATION_CANCELLED` | Sessions | Yes |
| `SESSION_NOMINATION_DECIDED` | Sessions | Yes |
| `TRAINING_COMPLETED` | Training Management | No |

---

## 5. Referenced Tables (Owned by Other Modules)

| Table | Owning Module | Used By |
|---|---|---|
| `users` | User Management | `notifications.user_id`, `notification_preferences.user_id` |
| `user_hierarchy` | User Management | Manager recipient resolution for overdue escalation + approval routing |
| `assignments` | Assignment Engine | `notifications.related_entity_id` for assignment events |
| `sessions` | Sessions | `notifications.related_entity_id` for session events |
| `assignment_requests` | Assignment Engine | `notifications.related_entity_id` for approval events |

---

## 6. Enum Values

### `in_app_status` / `email_status`
- `QUEUED` — created, pending worker pickup
- `DELIVERED` / `SENT` — successfully delivered
- `FAILED` — attempt failed, retry pending
- `PERMANENTLY_FAILED` — max retries exceeded

### `channel` (delivery_log)
- `IN_APP`
- `EMAIL`

### `attempt_status` (delivery_log)
- `SUCCESS`
- `FAILED`

---

## 7. Cross-Check Notes

Verified against:
- `06_notifications.md` — all data requirements covered including all 10 enterprise additions
- `02_database_schema.md` §6.1 — all master tables present

**Additions vs master schema (derived from spec + enterprise review):**
- `notifications.event_code` — replaces `notification_type` VARCHAR(100); aligns with event catalog
- `notifications.idempotency_key` — duplicate prevention (N5)
- `notifications.in_app_status` + `email_status` — per-channel delivery status (master had single `delivery_status`)
- `notifications.email_retry_count` + `in_app_retry_count` — per-channel retry counters
- `notification_delivery_log.channel` — IN_APP / EMAIL tracked independently (master had no channel field)
- `notification_preferences` table (new) — user opt-in/opt-out per event type per channel (N3, N4)
- Status `PERMANENTLY_FAILED` added to delivery status enum (master had CREATED/QUEUED/SENT/FAILED only)
