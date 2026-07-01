# 09_API_List.md

---

# 1. Overview

This document defines the API surface for the Enterprise LMS.

It is intended to:

* map screens to APIs
* map modules to endpoints
* define access rules
* guide OpenAPI specification design
* support AI-based backend and frontend code generation

All APIs are assumed to be:

* exposed through **APISIX**
* implemented in **FastAPI**
* protected using **Keycloak-based authentication**
* authorized using **hybrid authorization**

  * global roles from Keycloak
  * hierarchy-based access from Employee/Timesheet DB

---

# 2. API Design Principles

## API Style

* RESTful APIs
* JSON request/response bodies
* Versioned routes
* OpenAPI-first contract design

## Base Path

```text
/api/v1
```

## Security Model

### Authentication

* JWT token required for protected APIs
* Token validated through gateway and backend

### Authorization

* Global role checks
* Hierarchy-based checks where needed

### Fail-Safe Rule

If authorization context is missing, access must be denied.

---

# 3. Authorization Notation Used in This Document

## Global Roles

* `ADMIN`
* `HR`
* `EMPLOYEE`

## Scope Rules

* `SELF_ONLY`
* `TEAM_ONLY`
* `ORG_WIDE`

## Example

`Access: Authenticated user + TEAM_ONLY`

means:

* authenticated user
* access allowed only if target data belongs to reporting hierarchy
* manager capability is derived from hierarchy, not from a Manager role

---

# 4. Common API Conventions

## Standard Response Envelope (recommended)

```json
{
  "success": true,
  "data": {},
  "message": "optional message",
  "errors": []
}
```

## Paginated List Response (recommended)

```json
{
  "success": true,
  "data": {
    "items": [],
    "page": 1,
    "size": 20,
    "total": 120,
    "has_next": true
  },
  "message": null,
  "errors": []
}
```

## Pagination Parameters

```text
?page=1&size=20
```

## Filtering Parameters

Use query parameters for:

* status
* department
* due_date
* training_type
* designation
* capability
* mandatory
* state

## Sorting Parameters

```text
?sort_by=created_at&sort_order=desc
```

## Export Pattern

Large export APIs should be asynchronous:

1. create export job
2. poll job status
3. download result

## Inactive / Historical Data Rule

List APIs should exclude inactive records by default unless explicitly requested using filters.

---

# 5. API Groups

1. Authentication & Access APIs
2. Dashboard APIs
3. User Management APIs
4. Training Management APIs
5. Assignment APIs
6. Approval APIs
7. Session APIs
8. Compliance APIs
9. Reporting APIs
10. Certificate APIs
11. Notification APIs
12. Audit APIs
13. Search APIs
14. Integration APIs
15. Admin Configuration APIs
16. Migration APIs
17. File / Resource APIs

---

# 6. Authentication & Access APIs

> Login is handled by Keycloak. LMS does not provide local username/password authentication.

---

## 6.1 Get Current Session User

### Endpoint

```text
GET /api/v1/auth/me
```

### Purpose

Returns currently authenticated LMS user context.

### Access

* Any authenticated user

### Response Includes

* user profile
* global role
* hierarchy context summary
* policy acceptance status

### Used By

* global app bootstrap
* header / sidebar rendering
* dashboard routing

### Screen Mapping

* Login Redirect / Access Entry
* All authenticated screens

---

## 6.2 Accept First Login Policy

### Endpoint

```text
POST /api/v1/auth/policy-acceptance
```

### Purpose

Stores user acceptance of first-login policy.

### Access

* Authenticated user + SELF_ONLY

### Request

```json
{
  "policy_version": "v1"
}
```

### Screen Mapping

* First Login Policy Acceptance

---

## 6.3 Logout (logical)

### Endpoint

```text
POST /api/v1/auth/logout
```

### Purpose

Clears LMS session context / audit trail before Keycloak logout redirect.

### Access

* Authenticated user

### Note

Keycloak logout flow remains external.

### Screen Mapping

* Global header logout

---

# 7. Dashboard APIs

---

## 7.1 Employee Dashboard

### Endpoint

```text
GET /api/v1/dashboard/me
```

### Purpose

Returns employee dashboard summary.

### Access

* EMPLOYEE + SELF_ONLY

### Response Includes

* assigned training count
* overdue count
* upcoming sessions
* continue learning items
* recent activity
* recommended items

### Screen Mapping

* Employee Dashboard

---

## 7.2 Team Dashboard

### Endpoint

```text
GET /api/v1/dashboard/team
```

### Purpose

Returns team dashboard summary for hierarchy-scoped manager use.

### Access

* Authenticated user + TEAM_ONLY

### Response Includes

* team completion
* overdue team training
* pending approvals
* upcoming team sessions
* compliance snapshot

### Screen Mapping

* Manager Dashboard

---

## 7.3 HR Dashboard

### Endpoint

```text
GET /api/v1/dashboard/hr
```

### Purpose

Returns HR dashboard summary.

### Access

* HR + ORG_WIDE

### Screen Mapping

* HR Dashboard

---

## 7.4 Admin Dashboard

### Endpoint

```text
GET /api/v1/dashboard/admin
```

### Purpose

Returns system-wide operational dashboard data.

### Access

* ADMIN + ORG_WIDE

### Screen Mapping

* Admin Dashboard

---

# 8. User Management APIs

---

## 8.1 List Users

### Endpoint

```text
GET /api/v1/users
```

### Purpose

Returns paginated user list.

### Access

* ADMIN + ORG_WIDE
* HR + ORG_WIDE where allowed

### Filters

* status
* department
* designation
* capability
* manager_id
* include_inactive

### Screen Mapping

* Users Management

---

## 8.2 Get Current User Profile

### Endpoint

```text
GET /api/v1/users/me
```

### Purpose

Returns current user profile and learning summary.

### Access

* Authenticated user + SELF_ONLY

### Screen Mapping

* Profile & Certificates
* Header/Profile widgets

---

## 8.3 Get User Detail

### Endpoint

```text
GET /api/v1/users/{user_id}
```

### Purpose

Returns detailed user profile and learning summary.

### Access

* ADMIN + ORG_WIDE
* HR + scoped access
* Authenticated user + SELF_ONLY
* Authenticated user + TEAM_ONLY if target user is within hierarchy

### Screen Mapping

* User Detail
* Profile & Certificates

---

## 8.4 Deactivate User

### Endpoint

```text
POST /api/v1/users/{user_id}/deactivate
```

### Purpose

Deactivates user in LMS context.

### Access

* ADMIN only

### Screen Mapping

* Users Management
* User Detail

---

## 8.5 Trigger User Sync

### Endpoint

```text
POST /api/v1/users/sync
```

### Purpose

Triggers manual user/hierarchy sync job.

### Access

* ADMIN only

### Request

```json
{
  "include_zoho": true,
  "include_employee_db": true
}
```

### Screen Mapping

* Users Management
* Integration Health Dashboard

---

## 8.6 Get Team Members

### Endpoint

```text
GET /api/v1/users/team-members
```

### Purpose

Returns direct or scoped team members for hierarchy-based access.

### Access

* Authenticated user + TEAM_ONLY

### Screen Mapping

* Team Training
* Assign Training
* Manager Dashboard

---

# 9. Training Management APIs

---

## 9.1 List Trainings

### Endpoint

```text
GET /api/v1/trainings
```

### Purpose

Returns catalog or admin training list depending on access.

### Access

* EMPLOYEE + SELF_ONLY scoped catalog visibility
* ADMIN + ORG_WIDE
* HR + ORG_WIDE
* team-scoped access where business allows

### Filters

* category
* type
* state
* mandatory
* tag
* difficulty
* requires_approval
* include_inactive

### Screen Mapping

* Learning Catalog
* Training Management List

---

## 9.2 Get Training Detail

### Endpoint

```text
GET /api/v1/trainings/{training_id}
```

### Purpose

Returns detailed training information.

### Access

* based on training visibility + authorization

### Screen Mapping

* Training Detail

---

## 9.3 Create Training

### Endpoint

```text
POST /api/v1/trainings
```

### Purpose

Creates course / learning path / curriculum.

### Access

* ADMIN only

### Screen Mapping

* Training Editor

---

## 9.4 Update Training

### Endpoint

```text
PUT /api/v1/trainings/{training_id}
```

### Purpose

Updates draft or existing training.

### Access

* ADMIN only

### Screen Mapping

* Training Editor

---

## 9.5 Publish Training

### Endpoint

```text
POST /api/v1/trainings/{training_id}/publish
```

### Purpose

Publishes training.

### Access

* ADMIN only

### Screen Mapping

* Training Editor
* Training Management List

---

## 9.6 Inactivate Training

### Endpoint

```text
POST /api/v1/trainings/{training_id}/inactivate
```

### Purpose

Marks training inactive.

### Access

* ADMIN only

### Screen Mapping

* Training Management List
* Training Editor

---

## 9.7 Get Training Versions

### Endpoint

```text
GET /api/v1/trainings/{training_id}/versions
```

### Purpose

Returns version history.

### Access

* ADMIN
* HR where needed
* scoped read for others if business allows

### Screen Mapping

* Training Detail
* Training Editor

---

## 9.8 Get Training Structure

### Endpoint

```text
GET /api/v1/trainings/{training_id}/structure
```

### Purpose

Returns course / learning path / curriculum structure.

### Access

* authorized users

### Screen Mapping

* Training Editor
* Training Detail

---

## 9.9 Update Training Structure

### Endpoint

```text
PUT /api/v1/trainings/{training_id}/structure
```

### Purpose

Updates curriculum / learning path composition and ordering.

### Access

* ADMIN only

### Screen Mapping

* Training Editor

---

# 10. File / Resource APIs

---

## 10.1 List Training Resources

### Endpoint

```text
GET /api/v1/trainings/{training_id}/resources
```

### Purpose

Returns ordered resources linked to training.

### Access

* authorized users only

### Screen Mapping

* Training Detail
* Resource Viewer

---

## 10.2 Get Resource Access Metadata

### Endpoint

```text
GET /api/v1/resources/{resource_id}
```

### Purpose

Returns resource metadata and secured reference.

### Access

* eligible assigned or authorized user only

### Screen Mapping

* Resource Player / Viewer

---

## 10.3 Create Resource Reference

### Endpoint

```text
POST /api/v1/resources
```

### Purpose

Creates LMS resource metadata linked to OneDrive item.

### Access

* ADMIN only

### Screen Mapping

* Training Editor

---

## 10.4 Update Resource Reference

### Endpoint

```text
PUT /api/v1/resources/{resource_id}
```

### Purpose

Updates resource metadata or linked reference.

### Access

* ADMIN only

### Screen Mapping

* Training Editor

---

## 10.5 Delete Resource Reference

### Endpoint

```text
DELETE /api/v1/resources/{resource_id}
```

### Purpose

Removes resource mapping from training structure.

### Access

* ADMIN only

### Screen Mapping

* Training Editor

---

## 10.6 Reorder Training Resources

### Endpoint

```text
PATCH /api/v1/trainings/{training_id}/resources/reorder
```

### Purpose

Updates ordered sequence of resources within training.

### Access

* ADMIN only

### Screen Mapping

* Training Editor

---

## 10.7 Track Resource Progress

### Endpoint

```text
POST /api/v1/resources/{resource_id}/progress
```

### Purpose

Tracks learner progress.

### Access

* EMPLOYEE + SELF_ONLY

### Request Example

```json
{
  "status": "in_progress",
  "progress_percent": 60
}
```

### Screen Mapping

* Resource Player / Viewer

---

# 11. Assignment APIs

---

## 11.1 List My Assignments

### Endpoint

```text
GET /api/v1/assignments/me
```

### Purpose

Returns current user assignments.

### Access

* EMPLOYEE + SELF_ONLY

### Filters

* status
* overdue
* due_date
* completed
* training_type

### Screen Mapping

* My Training List
* Employee Dashboard

---

## 11.2 Get Assignment Detail

### Endpoint

```text
GET /api/v1/assignments/{assignment_id}
```

### Purpose

Returns detailed assignment information.

### Access

* SELF_ONLY
* TEAM_ONLY where hierarchy permits
* ADMIN / HR per scope

### Screen Mapping

* Training Detail
* User Detail

---

## 11.3 Create Assignment

### Endpoint

```text
POST /api/v1/assignments
```

### Purpose

Creates assignment manually.

### Access

* ADMIN + ORG_WIDE
* Authenticated user + TEAM_ONLY if hierarchy permits assignment authority

### Request Example

```json
{
  "training_id": "TRN-1001",
  "user_ids": ["USR-1", "USR-2"],
  "due_date": "2026-06-30",
  "note": "Mandatory team completion"
}
```

### Screen Mapping

* Assign Training Modal / Screen

---

## 11.4 List Team Assignments

### Endpoint

```text
GET /api/v1/assignments/team
```

### Purpose

Returns assignments for hierarchy-scoped team members.

### Access

* Authenticated user + TEAM_ONLY

### Screen Mapping

* Team Training
* Manager Dashboard

---

## 11.5 Update Assignment Due Date

### Endpoint

```text
PATCH /api/v1/assignments/{assignment_id}/due-date
```

### Purpose

Updates due date.

### Access

* ADMIN
* hierarchy-scoped manager authority where allowed

### Screen Mapping

* Assign Training
* Team Training

---

## 11.6 Mark Assignment Complete (Admin Override)

### Endpoint

```text
POST /api/v1/assignments/{assignment_id}/complete
```

### Purpose

Administrative completion override.

### Access

* ADMIN only

### Screen Mapping

* User Detail
* Training Detail

---

# 12. Approval APIs

---

## 12.1 Create Training Request

### Endpoint

```text
POST /api/v1/approvals/requests
```

### Purpose

Creates employee self-enrollment request.

### Access

* EMPLOYEE + SELF_ONLY

### Screen Mapping

* Learning Catalog
* Training Detail

---

## 12.2 List My Training Requests

### Endpoint

```text
GET /api/v1/approvals/requests/me
```

### Purpose

Returns current user’s submitted training requests.

### Access

* EMPLOYEE + SELF_ONLY

### Screen Mapping

* Training Detail
* Learning Catalog
* My Requests view if introduced

---

## 12.3 List Pending Approvals

### Endpoint

```text
GET /api/v1/approvals/pending
```

### Purpose

Returns pending approvals.

### Access

* Authenticated user + TEAM_ONLY for hierarchy-based approval authority
* ADMIN if operational access allowed

### Screen Mapping

* Approvals Inbox
* Manager Dashboard

---

## 12.4 Approve Request

### Endpoint

```text
POST /api/v1/approvals/{request_id}/approve
```

### Purpose

Approves request and creates assignment.

### Access

* Authenticated user + TEAM_ONLY where hierarchy permits
* ADMIN if allowed

### Screen Mapping

* Approvals Inbox

---

## 12.5 Reject Request

### Endpoint

```text
POST /api/v1/approvals/{request_id}/reject
```

### Purpose

Rejects request.

### Access

* Authenticated user + TEAM_ONLY where hierarchy permits
* ADMIN if allowed

### Request

```json
{
  "reason": "Not relevant for current role"
}
```

### Screen Mapping

* Approvals Inbox

---

# 13. Session APIs

---

## 13.1 List My Sessions

### Endpoint

```text
GET /api/v1/sessions/me
```

### Purpose

Returns sessions assigned to current user.

### Access

* EMPLOYEE + SELF_ONLY

### Screen Mapping

* My Sessions

---

## 13.2 List Sessions (Admin)

### Endpoint

```text
GET /api/v1/sessions
```

### Purpose

Returns paginated admin session list.

### Access

* ADMIN only

### Filters

* state
* training_id
* start_date
* end_date
* include_cancelled

### Screen Mapping

* Session Management List

---

## 13.3 List Team Sessions

### Endpoint

```text
GET /api/v1/sessions/team
```

### Purpose

Returns sessions for hierarchy-scoped team members.

### Access

* Authenticated user + TEAM_ONLY

### Screen Mapping

* Team Sessions
* Manager Dashboard

---

## 13.4 Get Session Detail

### Endpoint

```text
GET /api/v1/sessions/{session_id}
```

### Purpose

Returns session details.

### Access

* SELF_ONLY
* TEAM_ONLY where hierarchy permits
* ADMIN / HR scoped access

### Screen Mapping

* Session Detail

---

## 13.5 Create Session

### Endpoint

```text
POST /api/v1/sessions
```

### Purpose

Creates session linked to training.

### Access

* ADMIN only

### Screen Mapping

* Session Editor

---

## 13.6 Update Session

### Endpoint

```text
PUT /api/v1/sessions/{session_id}
```

### Purpose

Updates session.

### Access

* ADMIN only

### Screen Mapping

* Session Editor

---

## 13.7 Cancel Session

### Endpoint

```text
POST /api/v1/sessions/{session_id}/cancel
```

### Purpose

Cancels session.

### Access

* ADMIN only

### Screen Mapping

* Session Detail
* Session Management List

---

## 13.8 List Session Participants

### Endpoint

```text
GET /api/v1/sessions/{session_id}/participants
```

### Purpose

Returns participants for a session.

### Access

* ADMIN only

### Screen Mapping

* Session Editor
* Session Detail

---

## 13.9 Add Session Participants

### Endpoint

```text
POST /api/v1/sessions/{session_id}/participants
```

### Purpose

Adds participants to a session.

### Access

* ADMIN only

### Screen Mapping

* Session Editor

---

## 13.10 Remove Session Participant

### Endpoint

```text
DELETE /api/v1/sessions/{session_id}/participants/{user_id}
```

### Purpose

Removes participant from a session.

### Access

* ADMIN only

### Screen Mapping

* Session Editor

---

## 13.11 Record Attendance

### Endpoint

```text
POST /api/v1/sessions/{session_id}/attendance
```

### Purpose

Stores attendance.

### Access

* ADMIN only

### Screen Mapping

* Session Detail

---

## 13.12 Auto-Create Teams Meeting

### Endpoint

```text
POST /api/v1/sessions/{session_id}/teams-link
```

### Purpose

Attempts Teams meeting creation.

### Access

* ADMIN only

### Screen Mapping

* Session Editor

---

# 14. Compliance APIs

---

## 14.1 Get My Compliance

### Endpoint

```text
GET /api/v1/compliance/me
```

### Purpose

Returns current user compliance state.

### Access

* EMPLOYEE + SELF_ONLY

### Screen Mapping

* Profile & Certificates
* Employee Dashboard

---

## 14.2 Get Team Compliance

### Endpoint

```text
GET /api/v1/compliance/team
```

### Purpose

Returns compliance for hierarchy-scoped team members.

### Access

* Authenticated user + TEAM_ONLY

### Screen Mapping

* Compliance Report
* Manager Dashboard

---

## 14.3 Recalculate Compliance

### Endpoint

```text
POST /api/v1/compliance/recalculate
```

### Purpose

Triggers compliance recalculation job.

### Access

* ADMIN only

### Screen Mapping

* Admin operational tools if exposed

---

# 15. Reporting APIs

---

## 15.1 Get Reporting Summary

### Endpoint

```text
GET /api/v1/reports/summary
```

### Purpose

Returns reporting dashboard summary.

### Access

* ADMIN
* HR
* hierarchy-scoped team summary where allowed

### Screen Mapping

* Reporting Dashboard

---

## 15.2 Get Compliance Report Dataset

### Endpoint

```text
GET /api/v1/reports/compliance
```

### Purpose

Returns compliance-focused dataset.

### Access

* HR
* ADMIN
* TEAM_ONLY hierarchy scope if allowed

### Screen Mapping

* Compliance Report

---

## 15.3 Get Team Report

### Endpoint

```text
GET /api/v1/reports/team
```

### Purpose

Returns team learning metrics.

### Access

* Authenticated user + TEAM_ONLY

### Screen Mapping

* Manager Dashboard
* Team Training

---

## 15.4 Create Report Export Job

### Endpoint

```text
POST /api/v1/reports/export
```

### Purpose

Creates export job.

### Access

* ADMIN
* HR
* hierarchy-scoped manager access if valid

### Request Example

```json
{
  "report_type": "compliance",
  "format": "excel",
  "filters": {
    "department": "IT",
    "status": "non_compliant"
  }
}
```

### Screen Mapping

* Reporting Dashboard
* Compliance Report

---

## 15.5 Get Export Job Status

### Endpoint

```text
GET /api/v1/reports/export/{job_id}
```

### Purpose

Checks export generation status.

### Access

* creator only or admin

---

## 15.6 Download Export File

### Endpoint

```text
GET /api/v1/reports/export/{job_id}/download
```

### Purpose

Downloads finished export.

### Access

* creator only or admin

---

# 16. Certificate APIs

---

## 16.1 List My Certificates

### Endpoint

```text
GET /api/v1/certificates/me
```

### Purpose

Returns certificates for current user.

### Access

* EMPLOYEE + SELF_ONLY

### Screen Mapping

* Profile & Certificates
* Training Detail

---

## 16.2 Get Certificate Detail

### Endpoint

```text
GET /api/v1/certificates/{certificate_id}
```

### Purpose

Returns certificate metadata.

### Access

* SELF_ONLY
* ADMIN / HR as permitted
* TEAM_ONLY where hierarchy permits visibility

### Screen Mapping

* Profile & Certificates
* User Detail

---

## 16.3 Download Certificate

### Endpoint

```text
GET /api/v1/certificates/{certificate_id}/download
```

### Purpose

Downloads certificate file or secure reference.

### Access

* SELF_ONLY
* ADMIN / HR as permitted
* TEAM_ONLY where hierarchy permits visibility

### Screen Mapping

* Profile & Certificates
* Training Detail
* User Detail

---

# 17. Notification APIs

---

## 17.1 List My Notifications

### Endpoint

```text
GET /api/v1/notifications/me
```

### Purpose

Returns in-app notifications.

### Access

* authenticated user + SELF_ONLY

### Screen Mapping

* Notification Center

---

## 17.2 Get Unread Notification Count

### Endpoint

```text
GET /api/v1/notifications/me/unread-count
```

### Purpose

Returns unread count for notification bell.

### Access

* authenticated user + SELF_ONLY

### Screen Mapping

* Global header
* Notification bell

---

## 17.3 Mark Notification Read

### Endpoint

```text
POST /api/v1/notifications/{notification_id}/read
```

### Purpose

Marks notification as read.

### Access

* owner only

### Screen Mapping

* Notification Center

---

## 17.4 Mark All Notifications Read

### Endpoint

```text
POST /api/v1/notifications/me/read-all
```

### Purpose

Marks all current user notifications as read.

### Access

* SELF_ONLY

---

# 18. Audit APIs

---

## 18.1 Search Audit Logs

### Endpoint

```text
GET /api/v1/audit
```

### Purpose

Searches audit logs.

### Access

* ADMIN + ORG_WIDE
* HR scoped access
* TEAM_ONLY hierarchy access only if explicitly supported

### Filters

* module
* action
* date_range
* actor
* entity_id

### Screen Mapping

* Audit Log Search

---

## 18.2 Get Audit Record Detail

### Endpoint

```text
GET /api/v1/audit/{event_id}
```

### Purpose

Returns audit detail.

### Access

* same as audit search scope

### Screen Mapping

* Audit detail drawer

---

# 19. Search APIs

---

## 19.1 Global Search

### Endpoint

```text
GET /api/v1/search
```

### Purpose

Performs filtered keyword search across searchable domains.

### Access

* authenticated users
* results filtered by role + hierarchy

### Query Parameters

* q
* scope
* status
* department
* due_date
* mandatory
* capability
* designation

### Screen Mapping

* Global search bar
* Learning Catalog
* My Training
* Users Management
* Audit Search

---

## 19.2 Search Suggestions

### Endpoint

```text
GET /api/v1/search/suggestions
```

### Purpose

Returns typeahead suggestions.

### Access

* authenticated users
* filtered by permissions

### Screen Mapping

* Search bar
* Catalog search

---

# 20. Integration APIs

---

## 20.1 Get Integration Health

### Endpoint

```text
GET /api/v1/integrations/health
```

### Purpose

Returns overall integration status.

### Access

* ADMIN only

### Screen Mapping

* Integration Health Dashboard

---

## 20.2 Get Integration Detail

### Endpoint

```text
GET /api/v1/integrations/{integration_name}
```

### Purpose

Returns detail for named integration.

### Access

* ADMIN only

### Screen Mapping

* Integration Detail / Logs

---

## 20.3 Retry Integration Job

### Endpoint

```text
POST /api/v1/integrations/{integration_name}/retry
```

### Purpose

Retries failed job or triggers sync.

### Access

* ADMIN only

### Screen Mapping

* Integration Health Dashboard
* Integration Detail / Logs

---

## 20.4 Get Integration Job Logs

### Endpoint

```text
GET /api/v1/integrations/{integration_name}/logs
```

### Purpose

Returns job history.

### Access

* ADMIN only

### Screen Mapping

* Integration Detail / Logs

---

## 20.5 Trigger Zoho Sync

### Endpoint

```text
POST /api/v1/integrations/zoho/sync
```

### Purpose

Triggers Zoho sync job explicitly.

### Access

* ADMIN only

### Screen Mapping

* Integration Health Dashboard

---

## 20.6 Trigger Employee DB Sync

### Endpoint

```text
POST /api/v1/integrations/employee-db/sync
```

### Purpose

Triggers employee/timesheet DB sync job explicitly.

### Access

* ADMIN only

### Screen Mapping

* Integration Health Dashboard

---

## 20.7 PES Compliance Read API

### Endpoint

```text
GET /api/v1/integrations/pes/compliance/{employee_id}
```

### Purpose

Returns compliance result for PES integration.

### Access

* external PES client through APISIX-secured integration path

### Screen Mapping

* Not UI driven
* External integration

---

# 21. Admin Configuration APIs

---

## 21.1 Get Admin Settings

### Endpoint

```text
GET /api/v1/admin/settings
```

### Purpose

Returns configurable settings.

### Access

* ADMIN only

### Screen Mapping

* Admin Settings

---

## 21.2 Update Admin Settings

### Endpoint

```text
PUT /api/v1/admin/settings
```

### Purpose

Updates system settings.

### Access

* ADMIN only

### Screen Mapping

* Admin Settings

---

## 21.3 Get Config History

### Endpoint

```text
GET /api/v1/admin/settings/history
```

### Purpose

Returns configuration change history.

### Access

* ADMIN only

### Screen Mapping

* Admin Settings (future/history view)

---

# 22. Migration APIs

---

## 22.1 Get Migration Status

### Endpoint

```text
GET /api/v1/migration/status
```

### Purpose

Returns migration status and summary.

### Access

* ADMIN
* HR if validation view allowed

### Screen Mapping

* Migration Control

---

## 22.2 Start Migration

### Endpoint

```text
POST /api/v1/migration/start
```

### Purpose

Starts migration process.

### Access

* ADMIN only

### Screen Mapping

* Migration Control

---

## 22.3 Validate Migration

### Endpoint

```text
POST /api/v1/migration/validate
```

### Purpose

Runs validation checks.

### Access

* ADMIN
* HR if collaborative validation supported

### Screen Mapping

* Migration Control

---

## 22.4 Get Migration Failures

### Endpoint

```text
GET /api/v1/migration/failures
```

### Purpose

Returns failed records.

### Access

* ADMIN only

### Screen Mapping

* Migration Control

---

## 22.5 Download Migration Report

### Endpoint

```text
GET /api/v1/migration/report
```

### Purpose

Downloads migration verification report.

### Access

* ADMIN
* HR if allowed

### Screen Mapping

* Migration Control

---

# 23. Screen-to-API Mapping Summary

## Authentication Screens

* `GET /auth/me`
* `POST /auth/policy-acceptance`
* `POST /auth/logout`

## Employee Screens

* `GET /dashboard/me`
* `GET /assignments/me`
* `GET /trainings`
* `GET /trainings/{id}`
* `GET /sessions/me`
* `GET /notifications/me`
* `GET /notifications/me/unread-count`
* `GET /compliance/me`
* `GET /users/me`
* `GET /certificates/me`

## Manager Screens

* `GET /dashboard/team`
* `GET /users/team-members`
* `GET /assignments/team`
* `GET /approvals/pending`
* `GET /reports/team`
* `GET /compliance/team`
* `GET /sessions/team`

## HR Screens

* `GET /dashboard/hr`
* `GET /reports/compliance`
* `GET /audit`

## Admin Screens

* `GET /dashboard/admin`
* `GET /users`
* `GET /trainings`
* `POST /trainings`
* `POST /assignments`
* `GET /sessions`
* `POST /sessions`
* `GET /integrations/health`
* `GET /admin/settings`
* `GET /migration/status`

---

# 24. Recommended Build Sequence for APIs

## Phase 1

1. Auth / Me
2. Dashboard APIs
3. User APIs
4. Training APIs
5. Assignment APIs
6. Approval APIs

## Phase 2

7. Session APIs
8. Compliance APIs
9. Notification APIs
10. Search APIs
11. Certificate APIs

## Phase 3

12. Reporting APIs
13. Audit APIs
14. Integration APIs
15. Migration APIs
16. Admin Settings APIs

---

# 25. Final Guidance

This API list should be used as the base input for:

* OpenAPI spec generation
* FastAPI router/module creation
* frontend service layer generation
* backend authorization policy mapping
* database schema planning

Do not let controllers directly implement business rules.
All business rules must stay inside module application/domain services.

---

# End of Document