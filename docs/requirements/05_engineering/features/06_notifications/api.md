# Notifications — API Specification

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

---

## Group: Notification Center (User-Facing)

---

### 1. List My Notifications

```
GET /api/v1/notifications/me
```

**Purpose:** Returns paginated in-app notifications for the current user, most recent first.

**Access:** Any authenticated user (SELF_ONLY)

**Query Parameters:**
| Parameter | Type | Notes |
|---|---|---|
| `is_read` | boolean | Filter unread (`false`) or read (`true`) |
| `event_code` | string | Filter by notification type (e.g. `ASSIGNMENT_CREATED`) |
| `page` | integer | Default 1 |
| `size` | integer | Default 20 |

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "event_code": "ASSIGNMENT_CREATED",
      "title": "New training assigned",
      "message": "You have been assigned 'Safety Compliance 2026'. Due: 2026-06-01.",
      "related_entity_type": "assignment",
      "related_entity_id": "uuid",
      "is_read": false,
      "read_at": null,
      "created_at": "2026-04-06T10:00:00Z"
    }
  ],
  "page": 1,
  "size": 20,
  "total": 45,
  "has_next": true
}
```

---

### 2. Get Unread Count

```
GET /api/v1/notifications/me/unread-count
```

**Purpose:** Returns unread notification count for the bell badge.

**Access:** Any authenticated user (SELF_ONLY)

**Response:**
```json
{ "unread_count": 7 }
```

---

### 3. Mark Notification as Read

```
POST /api/v1/notifications/{notification_id}/read
```

**Purpose:** Marks a single notification as read.

**Access:** Owner only (SELF_ONLY)

**Path Parameters:** `notification_id` (UUID)

**Business Logic:**
- Sets `is_read = true`, `read_at = now()`
- Idempotent — marking an already-read notification has no effect

**Response:** `{ "notification_id": "uuid", "is_read": true }` (200)

**Error Codes:**
- `NOTIFICATION_NOT_FOUND` (404)
- `ACCESS_DENIED` (403)

---

### 4. Mark All Notifications as Read

```
POST /api/v1/notifications/me/read-all
```

**Purpose:** Marks all unread notifications for the current user as read.

**Access:** Any authenticated user (SELF_ONLY)

**Response:** `{ "marked_count": 7 }` (200)

---

## Group: Notification Preferences

---

### 5. Get My Notification Preferences

```
GET /api/v1/notifications/me/preferences
```

**Purpose:** Returns the current user's notification opt-in/opt-out settings per event type per channel.

**Access:** Any authenticated user (SELF_ONLY)

**Response:**
```json
{
  "preferences": [
    {
      "event_code": "ASSIGNMENT_DUE_REMINDER",
      "in_app_enabled": true,
      "email_enabled": false,
      "is_mandatory": false
    },
    {
      "event_code": "ASSIGNMENT_CREATED",
      "in_app_enabled": true,
      "email_enabled": true,
      "is_mandatory": true
    }
  ]
}
```

---

### 6. Update My Notification Preferences

```
PUT /api/v1/notifications/me/preferences
```

**Purpose:** Updates the current user's notification preferences for opt-out-eligible event types.

**Access:** Any authenticated user (SELF_ONLY)

**Request Body:**
```json
{
  "preferences": [
    { "event_code": "ASSIGNMENT_DUE_REMINDER", "in_app_enabled": true, "email_enabled": false },
    { "event_code": "SESSION_REMINDER_24H", "in_app_enabled": false, "email_enabled": false }
  ]
}
```

**Business Logic:**
- Mandatory event types (`is_mandatory = true`) cannot be opted out — updates to those are silently ignored or rejected with `PREFERENCE_NOT_MODIFIABLE`
- Only `in_app_enabled` and `email_enabled` are updatable

**Response:** Updated preferences list (200)

**Error Codes:**
- `PREFERENCE_NOT_MODIFIABLE` (422) — attempt to opt out of mandatory notification

---

## Group: Admin — Failure Monitoring

---

### 7. List Failed Notifications

```
GET /api/v1/notifications/admin/failures
```

**Purpose:** Returns notifications that have reached PERMANENTLY_FAILED status for admin review.

**Access:** ADMIN only

**Query Parameters:**
| Parameter | Type | Notes |
|---|---|---|
| `event_code` | string | Filter by event type |
| `channel` | string | `IN_APP` / `EMAIL` |
| `from_date` | date | ISO 8601 |
| `to_date` | date | ISO 8601 |
| `page` | integer | Default 1 |
| `size` | integer | Default 20 |

**Response:**
```json
{
  "items": [
    {
      "notification_id": "uuid",
      "event_code": "ASSIGNMENT_CREATED",
      "recipient_user_id": "uuid",
      "recipient_email": "user@company.com",
      "channel": "EMAIL",
      "retry_count": 3,
      "last_error": "SMTP connection refused",
      "last_attempted_at": "2026-04-06T09:00:00Z",
      "delivery_status": "PERMANENTLY_FAILED"
    }
  ]
}
```

---

### 8. Retry Failed Notification

```
POST /api/v1/notifications/admin/failures/{notification_id}/retry
```

**Purpose:** Admin manually triggers a retry for a permanently failed notification.

**Access:** ADMIN only

**Path Parameters:** `notification_id` (UUID)

**Business Logic:**
- Resets `delivery_status` to `QUEUED` and `retry_count` to 0
- Worker picks up and re-attempts delivery
- New delivery attempt logged in `notification_delivery_log`

**Response:** `{ "notification_id": "uuid", "status": "QUEUED" }` (200)

**Error Codes:**
- `NOTIFICATION_NOT_FOUND` (404)
- `NOTIFICATION_NOT_RETRYABLE` (422) — not in PERMANENTLY_FAILED state

---

## Group: Internal (System / Worker — not user-facing)

These endpoints are called internally by the background worker or event publishers. They are not exposed via APISIX to end users.

---

### 9. Create Notification (Internal)

```
POST /api/v1/internal/notifications
```

**Purpose:** Creates a notification record from a system event. Called by other modules (Assignment Engine, Sessions, etc.) at event time.

**Access:** Internal service-to-service only (no external exposure)

**Request Body:**
```json
{
  "event_code": "ASSIGNMENT_CREATED",
  "recipient_user_id": "uuid",
  "related_entity_type": "assignment",
  "related_entity_id": "uuid",
  "template_variables": {
    "training_title": "Safety Compliance 2026",
    "due_date": "2026-06-01"
  },
  "idempotency_key": "ASSIGNMENT_CREATED:uuid:uuid:2026-04-06"
}
```

**Business Logic:**
- Checks idempotency key — silently discards if duplicate
- Checks user notification preferences — skips channels opted out
- Creates `notifications` row (in-app) and queues email if email enabled
- Does NOT send — delivery is async via worker

**Response:** `{ "notification_id": "uuid", "status": "QUEUED" }` (201)

---

## Additions vs Master API List (§17)

| # | Addition | Reason |
|---|---|---|
| N1 | `GET /notifications/me/preferences` | User preference read — missing from master |
| N2 | `PUT /notifications/me/preferences` | User opt-out per type per channel — missing from master |
| N3 | `GET /notifications/admin/failures` | Admin failure monitoring — missing from master |
| N4 | `POST /notifications/admin/failures/{id}/retry` | Manual retry trigger — missing from master |
| N5 | `POST /internal/notifications` | Internal creation endpoint with idempotency key + template variables — missing from master |
| N6 | `event_code` field replacing `notification_type` | Precise event catalog alignment (matches audit events pattern) |
| N7 | `channel` separation in delivery log | IN_APP and EMAIL tracked independently — master had single delivery table without channel split |
