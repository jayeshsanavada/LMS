# LMS Entity Relationship Diagram

---

## How to Use This File

This is the canonical cross-module entity relationship reference for the AZ-LMS system.

- **Developers**: Use this to understand FK dependencies before writing migrations or queries
- **QA**: Use this to verify referential integrity in test data setup
- **AI coding sessions**: Load this file when working on features that span multiple modules to avoid incorrect FK assumptions
- **Architecture reviews**: This diagram should be updated whenever a new table or cross-module FK is added

Each entity in the diagram maps directly to a database table. The relationship notation follows Mermaid `erDiagram` syntax:
- `||--||` : exactly one to exactly one
- `||--o{` : one to zero-or-many
- `}o--o{` : many-to-many (via junction table)

---

## Module Groupings

| Group | Tables |
|---|---|
| **User Management** | `users`, `user_hierarchy`, `user_project_allocations`, `user_source_references`, `user_field_overrides`, `user_probation`, `user_capabilities`, `user_attributes_sync_log` |
| **Auth** | `role_mappings`, `authorization_policies`, `access_denied_logs` |
| **Training Management** | `training_items`, `training_versions`, `training_tags`, `training_item_tags`, `training_structure_links`, `training_prerequisites`, `training_resources`, `training_completion_rules`, `resource_files` |
| **Assessment** | `resource_assessments`, `assessment_questions`, `assessment_options`, `assessment_attempts`, `assessment_responses` |
| **Progress & Completion** | `resource_progress`, `training_completions`, `certificates` |
| **Assignment Engine** | `mandatory_assignment_rules`, `assignments`, `assignment_history`, `assignment_requests`, `compliance_status` |
| **Sessions** | `sessions`, `session_participants`, `session_attendance`, `session_facilitators`, `session_venues` |
| **Probation** | `user_probation` (owned by User Management; referenced here for clarity) |
| **Notifications** | `notifications`, `notification_delivery_log`, `notification_preferences` |
| **Reporting** | `report_exports`, `reporting_snapshots` |
| **Admin** | `admin_settings`, `admin_settings_history` |
| **Audit** | `audit_logs`, `audit_write_failures`, `audit_export_jobs` |
| **Integrations** | `integration_jobs`, `integration_job_logs`, `integration_health_status` |
| **Platform** | `background_jobs` |

---

## Diagram

```mermaid
erDiagram

    %% ── USER MANAGEMENT ──────────────────────────────────────────

    USERS {
        uuid id PK
        varchar employee_id
        varchar keycloak_user_id
        varchar email
        varchar full_name
        varchar department
        varchar designation
        varchar capability
        varchar phone
        varchar location
        varchar employment_status
        varchar employment_type
        varchar employment_phase
        date joining_date
        date probation_end_date
        varchar global_role
        uuid bu_head_id FK
        varchar source_system
        boolean is_active
        timestamp last_login_at
        varchar policy_accepted_version
        timestamp policy_accepted_at
        timestamp created_at
        timestamp updated_at
    }

    USER_HIERARCHY {
        uuid id PK
        uuid user_id FK
        uuid manager_user_id FK
        date effective_from
        date effective_to
        boolean is_current
    }

    USER_PROJECT_ALLOCATIONS {
        uuid id PK
        uuid user_id FK
        varchar project_code
        varchar project_name
        decimal allocation_percent
        date start_date
        date end_date
        boolean is_current
        timestamp created_at
        timestamp updated_at
    }

    USER_SOURCE_REFERENCES {
        uuid id PK
        uuid user_id FK
        varchar source_system
        varchar source_record_id
        boolean is_current
    }

    USER_FIELD_OVERRIDES {
        uuid id PK
        uuid user_id FK
        varchar field_name
        text original_value
        text overridden_value
        uuid overridden_by FK
        text override_reason
        boolean is_active
        timestamp overridden_at
        timestamp created_at
    }

    USER_PROBATION {
        uuid id PK
        uuid user_id FK
        date probation_start_date
        date probation_end_date
        varchar probation_status
        date extended_until
        text extension_reason
        timestamp confirmed_at
        uuid confirmed_by FK
        timestamp created_at
        uuid created_by FK
        timestamp updated_at
        uuid updated_by FK
    }

    USER_CAPABILITIES {
        uuid id PK
        uuid user_id FK
        varchar capability_name
        varchar source
        boolean is_active
    }

    USER_ATTRIBUTES_SYNC_LOG {
        uuid id PK
        uuid user_id FK
        varchar source_system
        uuid sync_job_id FK
        json changed_fields_json
        json conflict_fields_json
        varchar sync_status
        timestamp created_at
    }

    %% ── AUTH ─────────────────────────────────────────────────────

    ROLE_MAPPINGS {
        uuid id PK
        uuid user_id FK
        varchar global_role
        varchar source_system
        timestamp assigned_at
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    AUTHORIZATION_POLICIES {
        uuid id PK
        varchar policy_code
        varchar module_name
        varchar action_name
        text description
        varchar requires_role
        boolean requires_hierarchy
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    ACCESS_DENIED_LOGS {
        uuid id PK
        uuid user_id FK
        varchar endpoint
        varchar http_method
        text denial_reason
        varchar denial_code
        varchar ip_address
        varchar correlation_id
        timestamp created_at
    }

    %% ── TRAINING MANAGEMENT ──────────────────────────────────────

    TRAINING_ITEMS {
        uuid id PK
        varchar training_code
        varchar training_type
        varchar title
        text description
        varchar category
        varchar difficulty_level
        boolean is_mandatory
        boolean requires_approval
        boolean issue_certificate
        boolean is_probation_gateway
        varchar lifecycle_state
        integer estimated_duration_minutes
        integer validity_period_days
        varchar completion_mode
        integer current_version_no
        boolean has_unpublished_changes
        uuid cloned_from_id FK
        uuid created_by FK
        uuid updated_by FK
        timestamp created_at
        timestamp updated_at
    }

    TRAINING_VERSIONS {
        uuid id PK
        uuid training_item_id FK
        integer version_no
        varchar version_label
        text change_summary
        boolean is_current
        timestamp published_at
        uuid created_by FK
        timestamp created_at
    }

    TRAINING_TAGS {
        uuid id PK
        varchar tag_name
    }

    TRAINING_ITEM_TAGS {
        uuid id PK
        uuid training_item_id FK
        uuid tag_id FK
    }

    TRAINING_STRUCTURE_LINKS {
        uuid id PK
        uuid parent_training_id FK
        uuid child_training_id FK
        integer sequence_no
        boolean is_required
    }

    TRAINING_PREREQUISITES {
        uuid id PK
        uuid training_item_id FK
        uuid prerequisite_training_id FK
    }

    TRAINING_RESOURCES {
        uuid id PK
        uuid training_item_id FK
        uuid version_id FK
        varchar resource_type
        varchar resource_title
        text resource_description
        uuid resource_file_id FK
        text external_link
        uuid session_id FK
        integer sequence_no
        boolean is_required
        boolean is_sequential_locked
        integer estimated_duration_minutes
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    RESOURCE_FILES {
        uuid id PK
        varchar external_file_id
        varchar external_file_version
        varchar storage_provider
        varchar file_name
        varchar file_type
        varchar mime_type
        bigint file_size_bytes
        text reference_url
        varchar access_mode
        timestamp created_at
        timestamp updated_at
    }

    TRAINING_COMPLETION_RULES {
        uuid id PK
        uuid training_item_id FK
        uuid version_id FK
        varchar completion_mode
    }

    %% ── ASSESSMENT ───────────────────────────────────────────────

    RESOURCE_ASSESSMENTS {
        uuid id PK
        uuid resource_id FK
        decimal passing_score_percent
        integer max_attempts
        integer time_limit_minutes
    }

    ASSESSMENT_QUESTIONS {
        uuid id PK
        uuid assessment_id FK
        text question_text
        varchar question_type
        integer sequence_no
        boolean is_active
    }

    ASSESSMENT_OPTIONS {
        uuid id PK
        uuid question_id FK
        varchar option_text
        boolean is_correct
        integer sequence_no
    }

    ASSESSMENT_ATTEMPTS {
        uuid id PK
        uuid resource_id FK
        uuid user_id FK
        uuid assignment_id FK
        integer attempt_no
        decimal score_percent
        boolean passed
        integer time_taken_seconds
        timestamp submitted_at
        timestamp created_at
    }

    ASSESSMENT_RESPONSES {
        uuid id PK
        uuid attempt_id FK
        uuid question_id FK
        uuid[] selected_option_ids
        boolean is_correct
        timestamp created_at
    }

    %% ── PROGRESS & COMPLETION ────────────────────────────────────

    RESOURCE_PROGRESS {
        uuid id PK
        uuid user_id FK
        uuid assignment_id FK
        uuid resource_id FK
        varchar progress_status
        decimal progress_percent
        timestamp completed_at
    }

    TRAINING_COMPLETIONS {
        uuid id PK
        uuid user_id FK
        uuid assignment_id FK
        uuid training_item_id FK
        uuid training_version_id FK
        varchar completion_source
        timestamp completed_at
        timestamp expires_at
        boolean is_expired
    }

    CERTIFICATES {
        uuid id PK
        uuid user_id FK
        uuid training_item_id FK
        uuid training_version_id FK
        uuid assignment_id FK
        uuid completion_id FK
        varchar status
        text rejection_reason
        varchar certificate_no
        timestamp issued_at
        integer validity_period_days
        timestamp expires_at
        text certificate_file_ref
        timestamp created_at
    }

    %% ── ASSIGNMENT ENGINE ────────────────────────────────────────

    MANDATORY_ASSIGNMENT_RULES {
        uuid id PK
        uuid training_item_id FK
        varchar rule_scope
        varchar scope_value
        varchar designation_filter
        varchar capability_filter
        boolean is_probation_gate
        integer due_date_days_from_assignment
        integer priority_order
        boolean is_active
        timestamp created_at
        uuid created_by FK
        timestamp updated_at
        uuid updated_by FK
    }

    ASSIGNMENTS {
        uuid id PK
        uuid user_id FK
        uuid training_item_id FK
        uuid training_version_id FK
        varchar assignment_source
        varchar assignment_status
        uuid assigned_by_user_id FK
        uuid rule_id FK
        boolean is_probation_gate
        timestamp due_date
        text note
        timestamp completed_at
        timestamp cancelled_at
        uuid cancelled_by FK
        text cancellation_reason
        boolean is_migrated
        timestamp overdue_since
        integer last_escalation_level
        timestamp last_escalation_at
        timestamp created_at
        timestamp updated_at
    }

    ASSIGNMENT_HISTORY {
        uuid id PK
        uuid assignment_id FK
        varchar previous_status
        varchar new_status
        varchar action_source
        uuid changed_by_user_id FK
        timestamp changed_at
        text remarks
    }

    ASSIGNMENT_REQUESTS {
        uuid id PK
        uuid requester_user_id FK
        uuid training_item_id FK
        text request_reason
        varchar request_status
        uuid approver_user_id FK
        timestamp decided_at
        text rejection_reason
        uuid assignment_id FK
        timestamp expires_at
        timestamp created_at
        timestamp updated_at
    }

    COMPLIANCE_STATUS {
        uuid id PK
        uuid user_id FK
        uuid training_item_id FK
        uuid assignment_id FK
        varchar compliance_state
        timestamp evaluated_at
        timestamp due_date_snapshot
        timestamp completion_date_snapshot
        boolean is_migrated_basis
        timestamp created_at
        timestamp updated_at
    }

    %% ── SESSIONS ─────────────────────────────────────────────────

    SESSION_FACILITATORS {
        uuid id PK
        varchar name
        uuid user_id FK
        boolean is_active
        timestamp created_at
        uuid created_by FK
        timestamp updated_at
        uuid updated_by FK
    }

    SESSION_VENUES {
        uuid id PK
        varchar name
        text address
        integer capacity
        boolean is_active
        timestamp created_at
        uuid created_by FK
        timestamp updated_at
        uuid updated_by FK
    }

    SESSIONS {
        uuid id PK
        varchar session_code
        uuid training_item_id FK
        varchar title
        uuid facilitator_id FK
        uuid venue_id FK
        varchar physical_location
        varchar session_state
        timestamp start_time
        timestamp end_time
        integer duration_minutes
        text teams_meeting_link
        varchar teams_meeting_id
        varchar teams_link_status
        integer max_participants
        timestamp nomination_open_at
        timestamp nomination_close_at
        text notes
        timestamp completed_at
        timestamp cancelled_at
        uuid cancelled_by FK
        text cancellation_reason
        boolean is_migrated
        timestamp created_at
        uuid created_by FK
        timestamp updated_at
        uuid updated_by FK
    }

    SESSION_PARTICIPANTS {
        uuid id PK
        uuid session_id FK
        uuid user_id FK
        uuid assignment_id FK
        varchar participant_status
        uuid added_by FK
        uuid nominated_by FK
        uuid nomination_decision_by FK
        timestamp nomination_decision_at
        text nomination_cancel_reason
        timestamp created_at
        timestamp updated_at
    }

    SESSION_ATTENDANCE {
        uuid id PK
        uuid session_id FK
        uuid user_id FK
        varchar attendance_status
        varchar attendance_mode
        varchar attendance_source
        uuid marked_by_user_id FK
        timestamp marked_at
        text remarks
        timestamp created_at
        timestamp updated_at
    }

    %% ── NOTIFICATIONS ────────────────────────────────────────────

    NOTIFICATIONS {
        uuid id PK
        uuid user_id FK
        varchar event_code
        varchar title
        text message
        varchar related_entity_type
        uuid related_entity_id
        varchar idempotency_key
        boolean is_read
        timestamp read_at
        varchar in_app_status
        varchar email_status
        integer email_retry_count
        integer in_app_retry_count
        timestamp created_at
        timestamp updated_at
    }

    NOTIFICATION_DELIVERY_LOG {
        uuid id PK
        uuid notification_id FK
        varchar channel
        integer attempt_no
        varchar attempt_status
        text error_message
        timestamp attempted_at
    }

    NOTIFICATION_PREFERENCES {
        uuid id PK
        uuid user_id FK
        varchar event_code
        boolean in_app_enabled
        boolean email_enabled
        timestamp updated_at
    }

    %% ── REPORTING ────────────────────────────────────────────────

    REPORT_EXPORTS {
        uuid id PK
        uuid requested_by_user_id FK
        varchar report_type
        varchar export_format
        text request_filters_json
        varchar job_status
        text file_reference
        varchar file_name
        text error_message
        timestamp expires_at
        timestamp created_at
        timestamp completed_at
    }

    REPORTING_SNAPSHOTS {
        uuid id PK
        varchar snapshot_type
        date snapshot_date
        text snapshot_payload
        timestamp expires_at
        timestamp created_at
    }

    %% ── ADMIN ───────────────────────────────────────────────────

    ADMIN_SETTINGS {
        uuid id PK
        varchar setting_key
        text setting_value
        varchar value_type
        varchar module_name
        text default_value
        text description
        boolean is_active
        timestamp updated_at
        uuid updated_by FK
    }

    ADMIN_SETTINGS_HISTORY {
        uuid id PK
        varchar setting_key
        varchar module_name
        text previous_value
        text new_value
        uuid changed_by_user_id FK
        timestamp changed_at
    }

    %% ── AUDIT ────────────────────────────────────────────────────

    AUDIT_LOGS {
        uuid id PK
        varchar event_code
        varchar module_name
        varchar action_name
        uuid actor_user_id FK
        varchar actor_type
        varchar entity_type
        uuid entity_id
        text previous_value_json
        text new_value_json
        varchar source_system
        uuid correlation_id
        varchar ip_address
        varchar http_method
        boolean legal_hold
        timestamp created_at
    }

    AUDIT_WRITE_FAILURES {
        uuid id PK
        text event_payload_json
        text failure_reason
        integer retry_count
        varchar status
        timestamp last_attempted_at
        timestamp resolved_at
        timestamp created_at
        timestamp updated_at
    }

    AUDIT_EXPORT_JOBS {
        uuid id PK
        uuid requested_by_user_id FK
        varchar export_format
        text request_filters_json
        varchar job_status
        text file_reference
        varchar file_name
        text error_message
        timestamp expires_at
        timestamp created_at
        timestamp completed_at
    }

    %% ── INTEGRATIONS ─────────────────────────────────────────────

    INTEGRATION_JOBS {
        uuid id PK
        varchar integration_name
        varchar job_type
        varchar triggered_by
        uuid triggered_by_user_id FK
        varchar job_status
        timestamp started_at
        timestamp completed_at
        integer records_processed
        integer records_failed
        integer retry_count
        timestamp next_retry_at
        uuid parent_job_id FK
        text error_summary
        text last_error
        uuid correlation_id
        text request_metadata_json
        timestamp created_at
    }

    INTEGRATION_JOB_LOGS {
        uuid id PK
        uuid integration_job_id FK
        varchar log_level
        text message
        varchar reference_key
        timestamp created_at
    }

    INTEGRATION_HEALTH_STATUS {
        uuid id PK
        varchar integration_name
        varchar current_status
        timestamp last_success_at
        timestamp last_failure_at
        uuid last_job_id FK
        integer consecutive_failures
        text remarks
        timestamp updated_at
    }

    %% ── RELATIONSHIPS ────────────────────────────────────────────

    %% User Management
    USERS ||--o{ USER_HIERARCHY : "reports to"
    USERS ||--o{ USER_PROJECT_ALLOCATIONS : "allocated to"
    USERS ||--o{ USER_SOURCE_REFERENCES : "identified in"
    USERS ||--o{ USER_FIELD_OVERRIDES : "has overrides"
    USERS ||--o| USER_PROBATION : "has probation"
    USERS ||--o{ USER_CAPABILITIES : "has capabilities"
    USERS ||--o{ USER_ATTRIBUTES_SYNC_LOG : "sync log"
    USERS }o--o| USERS : "bu_head_id (BU Head)"
    USERS ||--o{ ROLE_MAPPINGS : "has role"
    USERS ||--o{ ACCESS_DENIED_LOGS : "denied access"

    %% Training hierarchy
    TRAINING_ITEMS ||--o{ TRAINING_VERSIONS : "versioned as"
    TRAINING_ITEMS ||--o{ TRAINING_ITEM_TAGS : "tagged with"
    TRAINING_TAGS ||--o{ TRAINING_ITEM_TAGS : "used by"
    TRAINING_ITEMS ||--o{ TRAINING_STRUCTURE_LINKS : "parent of"
    TRAINING_ITEMS ||--o{ TRAINING_PREREQUISITES : "requires"
    TRAINING_ITEMS ||--o{ TRAINING_RESOURCES : "contains"
    TRAINING_VERSIONS ||--o{ TRAINING_RESOURCES : "scopes"
    TRAINING_VERSIONS ||--o{ TRAINING_COMPLETION_RULES : "has rules"
    RESOURCE_FILES ||--o{ TRAINING_RESOURCES : "used by"

    %% Assessment
    TRAINING_RESOURCES ||--o| RESOURCE_ASSESSMENTS : "configured by"
    RESOURCE_ASSESSMENTS ||--o{ ASSESSMENT_QUESTIONS : "has"
    ASSESSMENT_QUESTIONS ||--o{ ASSESSMENT_OPTIONS : "has options"
    USERS ||--o{ ASSESSMENT_ATTEMPTS : "attempts"
    ASSIGNMENTS ||--o{ ASSESSMENT_ATTEMPTS : "scopes"
    TRAINING_RESOURCES ||--o{ ASSESSMENT_ATTEMPTS : "assessed via"
    ASSESSMENT_ATTEMPTS ||--o{ ASSESSMENT_RESPONSES : "records"

    %% Progress & Completion
    USERS ||--o{ RESOURCE_PROGRESS : "tracks"
    ASSIGNMENTS ||--o{ RESOURCE_PROGRESS : "scopes"
    TRAINING_RESOURCES ||--o{ RESOURCE_PROGRESS : "tracked by"
    USERS ||--o{ TRAINING_COMPLETIONS : "completes"
    ASSIGNMENTS ||--o| TRAINING_COMPLETIONS : "results in"
    TRAINING_ITEMS ||--o{ TRAINING_COMPLETIONS : "completed via"
    USERS ||--o{ CERTIFICATES : "holds"
    TRAINING_ITEMS ||--o{ CERTIFICATES : "generates"
    TRAINING_COMPLETIONS ||--o| CERTIFICATES : "triggers"

    %% Assignment Engine
    TRAINING_ITEMS ||--o{ MANDATORY_ASSIGNMENT_RULES : "targeted by"
    USERS ||--o{ ASSIGNMENTS : "assigned"
    TRAINING_ITEMS ||--o{ ASSIGNMENTS : "assigned via"
    MANDATORY_ASSIGNMENT_RULES ||--o{ ASSIGNMENTS : "generates"
    ASSIGNMENTS ||--o{ ASSIGNMENT_HISTORY : "tracked in"
    ASSIGNMENTS ||--o| COMPLIANCE_STATUS : "drives"
    USERS ||--o{ COMPLIANCE_STATUS : "evaluated for"
    USERS ||--o{ ASSIGNMENT_REQUESTS : "requests"
    TRAINING_ITEMS ||--o{ ASSIGNMENT_REQUESTS : "requested for"

    %% Sessions
    SESSION_FACILITATORS ||--o{ SESSIONS : "delivers"
    SESSION_VENUES ||--o{ SESSIONS : "hosts"
    TRAINING_ITEMS ||--o{ SESSIONS : "delivered via"
    SESSIONS ||--o{ SESSION_PARTICIPANTS : "enrolls"
    USERS ||--o{ SESSION_PARTICIPANTS : "participates in"
    SESSION_PARTICIPANTS ||--o| SESSION_ATTENDANCE : "has attendance"
    TRAINING_RESOURCES ||--o| SESSIONS : "linked to"

    %% Integrations
    USERS ||--o{ INTEGRATION_JOBS : "triggered by"
    INTEGRATION_JOBS ||--o{ INTEGRATION_JOB_LOGS : "contains"
    INTEGRATION_JOBS ||--o{ INTEGRATION_HEALTH_STATUS : "latest job reference"

    %% Notifications
    USERS ||--o{ NOTIFICATIONS : "receives"
    NOTIFICATIONS ||--o{ NOTIFICATION_DELIVERY_LOG : "logged via"
    USERS ||--o{ NOTIFICATION_PREFERENCES : "sets"

    %% Admin
    USERS ||--o{ ADMIN_SETTINGS : "updates"
    USERS ||--o{ ADMIN_SETTINGS_HISTORY : "changes"
    ADMIN_SETTINGS ||--o{ ADMIN_SETTINGS_HISTORY : "versioned in"

    %% Reporting
    USERS ||--o{ REPORT_EXPORTS : "requests"

    %% Audit
    USERS ||--o{ AUDIT_LOGS : "generates"
    USERS ||--o{ AUDIT_EXPORT_JOBS : "requests"

    %% Probation
    USER_PROBATION ||--o{ ASSIGNMENTS : "requires completion of"
```

---

## Key Relationship Notes

### Cardinality Conventions
- A user has **one** active `user_probation` row at most (1:0-1)
- A training item can have **many** versions but only **one** current version (`is_current = true`)
- An assignment has **one** `compliance_status` row (1:1) — uniquely constrained on `(user_id, assignment_id)`
- `training_structure_links` is self-referential on `training_items` — a Curriculum → Learning Path → Course hierarchy

### Cascade Rules
- **Users**: never hard-deleted; `is_active = false` on deactivation. Historical assignments, completions, certificates retained.
- **Training items**: never hard-deleted; `lifecycle_state = INACTIVE`. Existing assignments still completable.
- **Assignments**: never hard-deleted; `assignment_status = CANCELLED`.
- **Audit events / assessment attempts / training completions / certificates**: immutable, no deletes.

### Cross-Module FK Dependencies

| FK Source | → Target | Note |
|---|---|---|
| `sessions.training_item_id` | `training_items.id` | Sessions module reads Training Management |
| `training_resources.session_id` | `sessions.id` | Training Management references Sessions for SESSION-type resource |
| `assignments.rule_id` | `mandatory_assignment_rules.id` | Assignment Engine tracks which rule triggered assignment |
| `compliance_status.assignment_id` | `assignments.id` | Compliance derived from assignments |
| `user_probation.confirmed_by` | `users.id` | HR who confirmed probation |
| `mandatory_assignment_rules.training_item_id` | `training_items.id` | Rules target specific trainings |
| `assessment_attempts.assignment_id` | `assignments.id` | Attempts scoped to assignment context |
| `certificates.completion_id` | `training_completions.id` | Certificate triggered by completion |

### Probation Gate Flow
```
USERS (employment_phase=PROBATION)
  → USER_PROBATION (tracks probation window)
  → MANDATORY_ASSIGNMENT_RULES (rule_scope=EMPLOYMENT_PHASE, is_probation_gate=true)
    → ASSIGNMENTS (is_probation_gate=true, due_date=joining_date+90)
      → COMPLIANCE_STATUS (all must be COMPLIANT to unlock confirmation)
        → USER_PROBATION (probation_status → CONFIRMED)
```

### Training Hierarchy
```
TRAINING_ITEMS (CURRICULUM)
  └── TRAINING_STRUCTURE_LINKS
        └── TRAINING_ITEMS (LEARNING_PATH)
              └── TRAINING_STRUCTURE_LINKS
                    └── TRAINING_ITEMS (COURSE)
                          └── TRAINING_RESOURCES (VIDEO / DOCUMENT / ASSESSMENT / LINK / SESSION)
```

---

## Schema File Index

| Module | Schema File |
|---|---|
| User Management | `features/02_user_management/schema.md` |
| Auth | `features/01_auth/schema.md` |
| Training Management | `features/03_training_management/schema.md` |
| Assignment Engine | `features/04_assignment_engine/schema.md` |
| Sessions | `features/05_sessions/schema.md` |
| Notifications | `features/06_notifications/schema.md` |
| Reporting | `features/07_reporting/schema.md` |
| Audit | `features/08_audit/schema.md` |
| Integrations | `features/10_integrations/schema.md` |
| Admin | `features/11_admin/schema.md` |
| Probation | `features/12_probation/schema.md` |

---

*Last updated: 2026-04-08*
