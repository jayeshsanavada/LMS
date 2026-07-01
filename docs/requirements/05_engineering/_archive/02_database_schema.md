# 10_Database_Schema.md

---

# 1. Overview

This document defines the logical database schema for the Enterprise LMS.

It is intended to:

* define core entities and relationships
* establish module-wise data ownership
* support SQL schema creation
* support ORM model generation
* guide API implementation
* ensure alignment with DDD modular monolith architecture

The database will be implemented as a **single relational database** for the modular monolith.

---

# 2. Database Design Principles

## Selected Strategy

* Single relational database
* Module-owned tables
* Foreign key integrity where appropriate
* Auditability for critical records
* Soft-delete / inactive-state preference over hard delete
* Historical retention for compliance-related records

## Design Goals

* clear ownership boundaries
* normalized core transactional data
* reporting-friendly structure
* support for async/background processing
* compatibility with SQL full-text search
* future extensibility without re-modeling core entities

---

# 3. Schema Organization by Module

## Core Modules

* User Management
* Training Management
* Assignment Engine
* Sessions
* Compliance

## Supporting Modules

* Notifications
* Reporting
* Audit
* Migration
* Integrations

## Generic / Platform Modules

* Authentication & Access
* Authorization
* Search
* File Management
* Admin Configuration
* Background Jobs

---

# 4. Common Columns Standard

These columns should be used consistently where applicable:

| Column     | Purpose                               |
| ---------- | ------------------------------------- |
| id         | Primary key                           |
| created_at | Record creation timestamp             |
| created_by | User/system actor that created record |
| updated_at | Last update timestamp                 |
| updated_by | User/system actor that updated record |
| is_active  | Active/inactive flag                  |
| remarks    | Optional note field                   |

---

# 5. Core Module Schema

---

## 5.1 User Management Schema

### Table: users

### Purpose

Stores LMS user records mapped from synced sources.

### Columns

| Column                  | Type          | Notes                       |
| ----------------------- | ------------- | --------------------------- |
| id                      | UUID / BIGINT | Primary key                 |
| employee_id             | VARCHAR(50)   | Unique business identifier  |
| keycloak_user_id        | VARCHAR(100)  | External identity reference |
| email                   | VARCHAR(255)  | Unique                      |
| full_name               | VARCHAR(255)  |                             |
| department              | VARCHAR(150)  | Synced                      |
| designation             | VARCHAR(150)  | Synced from employee DB     |
| capability              | VARCHAR(150)  | Synced from employee DB     |
| location                | VARCHAR(150)  | Optional                    |
| joining_date            | DATE          |                             |
| employment_status       | VARCHAR(50)   | ACTIVE / INACTIVE / EXITED  |
| policy_accepted         | BOOLEAN       | First login acceptance flag |
| policy_accepted_version | VARCHAR(50)   | Accepted policy version     |
| policy_accepted_at      | TIMESTAMP     |                             |
| is_active               | BOOLEAN       | LMS participation flag      |
| created_at              | TIMESTAMP     |                             |
| updated_at              | TIMESTAMP     |                             |

### Rules

* `employee_id` must be unique
* `email` must be unique
* user is not deleted, only deactivated
* `keycloak_user_id` should be unique when present

---

### Table: user_source_references

### Purpose

Tracks source-system identifiers for user mapping.

### Columns

| Column           | Type           | Notes                         |
| ---------------- | -------------- | ----------------------------- |
| id               | UUID / BIGINT  | Primary key                   |
| user_id          | FK -> users.id |                               |
| source_system    | VARCHAR(50)    | ZOHO / EMPLOYEE_DB / KEYCLOAK |
| source_record_id | VARCHAR(150)   | External identifier           |
| is_current       | BOOLEAN        |                               |
| created_at       | TIMESTAMP      |                               |

### Rules

* one current mapping per `(source_system, source_record_id)`
* supports sync reconciliation and troubleshooting

---

### Table: user_hierarchy

### Purpose

Stores reporting relationships derived from employee/timesheet DB.

### Columns

| Column          | Type           | Notes             |
| --------------- | -------------- | ----------------- |
| id              | UUID / BIGINT  | Primary key       |
| user_id         | FK -> users.id | User              |
| manager_user_id | FK -> users.id | Reporting manager |
| effective_from  | DATE           |                   |
| effective_to    | DATE           | Nullable          |
| is_current      | BOOLEAN        |                   |
| source_system   | VARCHAR(50)    | EMPLOYEE_DB       |
| created_at      | TIMESTAMP      |                   |
| updated_at      | TIMESTAMP      |                   |

### Rules

* one current hierarchy row per user
* used for team visibility and approvals
* manager is not stored as a role

---

### Table: user_project_allocations

### Purpose

Stores user project allocation details from employee/timesheet DB.

### Columns

| Column             | Type                   |
| ------------------ | ---------------------- |
| id                 | UUID / BIGINT          |
| user_id            | FK -> users.id         |
| project_code       | VARCHAR(100)           |
| project_name       | VARCHAR(255)           |
| allocation_percent | DECIMAL(5,2), nullable |
| effective_from     | DATE                   |
| effective_to       | DATE, nullable         |
| is_current         | BOOLEAN                |
| source_system      | VARCHAR(50)            |
| created_at         | TIMESTAMP              |
| updated_at         | TIMESTAMP              |

### Rules

* supports multiple project allocations per user
* current allocations drive assignment rules and reporting filters

---

### Table: user_attributes_sync_log

### Purpose

Tracks sync updates to user-related fields.

### Columns

| Column              | Type                      |
| ------------------- | ------------------------- |
| id                  | UUID / BIGINT             |
| user_id             | FK -> users.id            |
| source_system       | VARCHAR(50)               |
| sync_job_id         | FK -> integration_jobs.id |
| changed_fields_json | JSON / TEXT               |
| sync_status         | VARCHAR(50)               |
| created_at          | TIMESTAMP                 |

---

## 5.2 Authentication & Authorization Schema

> Authentication is owned by Keycloak. LMS stores only mapped references and policy/rule data.

### Table: role_mappings

### Purpose

Stores effective global role mapping from Keycloak.

### Columns

| Column        | Type           | Notes                 |
| ------------- | -------------- | --------------------- |
| id            | UUID / BIGINT  | Primary key           |
| user_id       | FK -> users.id |                       |
| global_role   | VARCHAR(50)    | ADMIN / HR / EMPLOYEE |
| source_system | VARCHAR(50)    | KEYCLOAK              |
| assigned_at   | TIMESTAMP      |                       |
| is_active     | BOOLEAN        |                       |

### Rules

* only global roles stored
* manager not stored here

---

### Table: authorization_policies

### Purpose

Stores configurable authorization policy metadata.

### Columns

| Column             | Type                  |
| ------------------ | --------------------- |
| id                 | UUID / BIGINT         |
| policy_code        | VARCHAR(100)          |
| module_name        | VARCHAR(100)          |
| action_name        | VARCHAR(100)          |
| description        | TEXT                  |
| requires_role      | VARCHAR(50), nullable |
| requires_hierarchy | BOOLEAN               |
| is_active          | BOOLEAN               |
| created_at         | TIMESTAMP             |
| updated_at         | TIMESTAMP             |

---

### Table: access_denied_logs

### Purpose

Stores denied access attempts for audit/security.

### Columns

| Column             | Type                     |
| ------------------ | ------------------------ |
| id                 | UUID / BIGINT            |
| user_id            | FK -> users.id, nullable |
| module_name        | VARCHAR(100)             |
| action_name        | VARCHAR(100)             |
| target_entity_type | VARCHAR(100)             |
| target_entity_id   | VARCHAR(100)             |
| denial_reason      | TEXT                     |
| created_at         | TIMESTAMP                |

---

## 5.3 Training Management Schema

### Table: training_items

### Purpose

Stores all training entities.

### Columns

| Column             | Type           | Notes                               |
| ------------------ | -------------- | ----------------------------------- |
| id                 | UUID / BIGINT  | Primary key                         |
| training_code      | VARCHAR(50)    | Unique                              |
| training_type      | VARCHAR(50)    | COURSE / LEARNING_PATH / CURRICULUM |
| title              | VARCHAR(255)   |                                     |
| description        | TEXT           |                                     |
| category           | VARCHAR(100)   |                                     |
| difficulty_level   | VARCHAR(50)    | Nullable                            |
| is_mandatory       | BOOLEAN        | Default false                       |
| requires_approval  | BOOLEAN        | Default false                       |
| lifecycle_state    | VARCHAR(50)    | DRAFT / PUBLISHED / INACTIVE        |
| current_version_no | INTEGER        |                                     |
| created_at         | TIMESTAMP      |                                     |
| created_by         | FK -> users.id | nullable/system                     |
| updated_at         | TIMESTAMP      |                                     |
| updated_by         | FK -> users.id | nullable/system                     |

### Rules

* only `PUBLISHED` training is assignable
* inactive training preserved historically

---

### Table: training_versions

### Purpose

Stores version history of training.

### Columns

| Column           | Type                    |
| ---------------- | ----------------------- |
| id               | UUID / BIGINT           |
| training_item_id | FK -> training_items.id |
| version_no       | INTEGER                 |
| version_label    | VARCHAR(100)            |
| change_summary   | TEXT                    |
| is_current       | BOOLEAN                 |
| published_at     | TIMESTAMP               |
| created_at       | TIMESTAMP               |
| created_by       | FK -> users.id          |

### Rules

* one current version per training item
* assignments must reference a specific version

---

### Table: training_tags

### Purpose

Stores tags used for discovery.

| Column   | Type          |
| -------- | ------------- |
| id       | UUID / BIGINT |
| tag_name | VARCHAR(100)  |

---

### Table: training_item_tags

### Purpose

Mapping table between training items and tags.

| Column           | Type                    |
| ---------------- | ----------------------- |
| id               | UUID / BIGINT           |
| training_item_id | FK -> training_items.id |
| tag_id           | FK -> training_tags.id  |

---

### Table: training_structure_links

### Purpose

Represents hierarchy:

* curriculum contains learning paths
* learning path contains courses

| Column             | Type                    |
| ------------------ | ----------------------- |
| id                 | UUID / BIGINT           |
| parent_training_id | FK -> training_items.id |
| child_training_id  | FK -> training_items.id |
| sequence_no        | INTEGER                 |
| relation_type      | VARCHAR(50)             |

---

### Table: training_completion_rules

### Purpose

Stores completion logic.

| Column                  | Type                       |                                        |
| ----------------------- | -------------------------- | -------------------------------------- |
| id                      | UUID / BIGINT              |                                        |
| training_item_id        | FK -> training_items.id    |                                        |
| version_id              | FK -> training_versions.id |                                        |
| completion_mode         | VARCHAR(50)                | ALL_RESOURCES / ADMIN_OVERRIDE / MIXED |
| required_resource_count | INTEGER, nullable          |                                        |
| created_at              | TIMESTAMP                  |                                        |
| updated_at              | TIMESTAMP                  |                                        |

---

### Table: certificates

### Purpose

Stores generated certificate references.

| Column               | Type                           |
| -------------------- | ------------------------------ |
| id                   | UUID / BIGINT                  |
| user_id              | FK -> users.id                 |
| training_item_id     | FK -> training_items.id        |
| assignment_id        | FK -> assignments.id, nullable |
| certificate_no       | VARCHAR(100)                   |
| issued_at            | TIMESTAMP                      |
| certificate_file_ref | TEXT                           |
| version_id           | FK -> training_versions.id     |

### Rules

* `certificate_no` must be unique

---

## 5.4 File Management Schema

### Table: resource_files

### Purpose

Stores LMS-side metadata for OneDrive-backed resources.

| Column                | Type                   |             |
| --------------------- | ---------------------- | ----------- |
| id                    | UUID / BIGINT          |             |
| external_file_id      | VARCHAR(255)           |             |
| external_file_version | VARCHAR(100), nullable |             |
| storage_provider      | VARCHAR(50)            | ONEDRIVE    |
| file_name             | VARCHAR(255)           |             |
| file_type             | VARCHAR(50)            |             |
| mime_type             | VARCHAR(100)           |             |
| file_size_bytes       | BIGINT                 |             |
| reference_url         | TEXT                   |             |
| access_mode           | VARCHAR(50)            | STREAM_ONLY |
| created_at            | TIMESTAMP              |             |
| updated_at            | TIMESTAMP              |             |

---

### Table: training_resources

### Purpose

Links resource files to training version.

| Column               | Type                              |                                      |
| -------------------- | --------------------------------- | ------------------------------------ |
| id                   | UUID / BIGINT                     |                                      |
| training_item_id     | FK -> training_items.id           |                                      |
| version_id           | FK -> training_versions.id        |                                      |
| resource_type        | VARCHAR(50)                       | VIDEO / PDF / SCORM / LINK / SESSION |
| resource_title       | VARCHAR(255)                      |                                      |
| resource_description | TEXT                              |                                      |
| resource_file_id     | FK -> resource_files.id, nullable |                                      |
| external_link        | TEXT, nullable                    |                                      |
| sequence_no          | INTEGER                           |                                      |
| is_required          | BOOLEAN                           |                                      |
| created_at           | TIMESTAMP                         |                                      |
| updated_at           | TIMESTAMP                         |                                      |

---

## 5.5 Assignment Engine Schema

### Table: assignments

### Purpose

Stores training assignments.

### Columns

| Column              | Type                       |                                              |
| ------------------- | -------------------------- | -------------------------------------------- |
| id                  | UUID / BIGINT              |                                              |
| user_id             | FK -> users.id             |                                              |
| training_item_id    | FK -> training_items.id    |                                              |
| training_version_id | FK -> training_versions.id |                                              |
| assignment_source   | VARCHAR(50)                | MANDATORY / MANAGER / ADMIN / SELF_APPROVED  |
| assignment_status   | VARCHAR(50)                | ASSIGNED / IN_PROGRESS / COMPLETED / OVERDUE |
| assigned_at         | TIMESTAMP                  |                                              |
| assigned_by_user_id | FK -> users.id, nullable   |                                              |
| due_date            | TIMESTAMP, nullable        |                                              |
| note                | TEXT                       |                                              |
| completed_at        | TIMESTAMP, nullable        |                                              |
| is_migrated         | BOOLEAN                    |                                              |
| created_at          | TIMESTAMP                  |                                              |
| updated_at          | TIMESTAMP                  |                                              |

### Rules

* duplicate active assignment must be prevented
* assignment status auto-updated by progress/completion/overdue jobs

---

### Table: assignment_requests

### Purpose

Stores optional training requests needing approval.

| Column            | Type                     |                               |
| ----------------- | ------------------------ | ----------------------------- |
| id                | UUID / BIGINT            |                               |
| requester_user_id | FK -> users.id           |                               |
| training_item_id  | FK -> training_items.id  |                               |
| request_reason    | TEXT                     |                               |
| request_status    | VARCHAR(50)              | PENDING / APPROVED / REJECTED |
| approver_user_id  | FK -> users.id, nullable |                               |
| decided_at        | TIMESTAMP, nullable      |                               |
| rejection_reason  | TEXT, nullable           |                               |
| created_at        | TIMESTAMP                |                               |
| updated_at        | TIMESTAMP                |                               |

---

### Table: assignment_history

### Purpose

Tracks major lifecycle changes on assignments.

| Column             | Type                     |                             |
| ------------------ | ------------------------ | --------------------------- |
| id                 | UUID / BIGINT            |                             |
| assignment_id      | FK -> assignments.id     |                             |
| previous_status    | VARCHAR(50)              |                             |
| new_status         | VARCHAR(50)              |                             |
| action_source      | VARCHAR(50)              | SYSTEM / USER / ADMIN / JOB |
| changed_by_user_id | FK -> users.id, nullable |                             |
| changed_at         | TIMESTAMP                |                             |
| remarks            | TEXT                     |                             |

---

## 5.6 Training Progress Schema

### Table: resource_progress

### Purpose

Tracks learner-level progress on resources.

| Column           | Type                        |                                       |
| ---------------- | --------------------------- | ------------------------------------- |
| id               | UUID / BIGINT               |                                       |
| user_id          | FK -> users.id              |                                       |
| assignment_id    | FK -> assignments.id        |                                       |
| resource_id      | FK -> training_resources.id |                                       |
| progress_status  | VARCHAR(50)                 | NOT_STARTED / IN_PROGRESS / COMPLETED |
| progress_percent | DECIMAL(5,2)                |                                       |
| last_accessed_at | TIMESTAMP                   |                                       |
| completed_at     | TIMESTAMP, nullable         |                                       |
| created_at       | TIMESTAMP                   |                                       |
| updated_at       | TIMESTAMP                   |                                       |

### Rules

* one progress row per `(assignment_id, resource_id)`

---

### Table: training_completions

### Purpose

Stores completion event for a training item.

| Column              | Type                       |                        |
| ------------------- | -------------------------- | ---------------------- |
| id                  | UUID / BIGINT              |                        |
| user_id             | FK -> users.id             |                        |
| assignment_id       | FK -> assignments.id       |                        |
| training_item_id    | FK -> training_items.id    |                        |
| training_version_id | FK -> training_versions.id |                        |
| completion_source   | VARCHAR(50)                | AUTO / ADMIN / SESSION |
| completed_at        | TIMESTAMP                  |                        |
| created_at          | TIMESTAMP                  |                        |

### Rules

* one completion row per assignment

---

## 5.7 Sessions Schema

### Table: sessions

### Purpose

Stores classroom / Teams session definitions.

| Column             | Type                    |                                   |
| ------------------ | ----------------------- | --------------------------------- |
| id                 | UUID / BIGINT           |                                   |
| session_code       | VARCHAR(50)             |                                   |
| training_item_id   | FK -> training_items.id |                                   |
| session_title      | VARCHAR(255)            |                                   |
| instructor_name    | VARCHAR(255), nullable  |                                   |
| session_mode       | VARCHAR(50)             | TEAMS / HYBRID                    |
| session_state      | VARCHAR(50)             | SCHEDULED / COMPLETED / CANCELLED |
| start_time         | TIMESTAMP               |                                   |
| end_time           | TIMESTAMP               |                                   |
| physical_location  | VARCHAR(255), nullable  |                                   |
| teams_meeting_link | TEXT, nullable          |                                   |
| recording_link     | TEXT, nullable          |                                   |
| created_at         | TIMESTAMP               |                                   |
| created_by         | FK -> users.id          |                                   |
| updated_at         | TIMESTAMP               |                                   |
| updated_by         | FK -> users.id          |                                   |

---

### Table: session_participants

### Purpose

Stores assigned session participants.

| Column             | Type                           |                              |
| ------------------ | ------------------------------ | ---------------------------- |
| id                 | UUID / BIGINT                  |                              |
| session_id         | FK -> sessions.id              |                              |
| user_id            | FK -> users.id                 |                              |
| assignment_id      | FK -> assignments.id, nullable |                              |
| participant_status | VARCHAR(50)                    | ASSIGNED / ATTENDED / MISSED |
| created_at         | TIMESTAMP                      |                              |
| updated_at         | TIMESTAMP                      |                              |

### Rules

* one participant row per `(session_id, user_id)`

---

### Table: session_attendance

### Purpose

Stores attendance records.

| Column            | Type                     |                         |
| ----------------- | ------------------------ | ----------------------- |
| id                | UUID / BIGINT            |                         |
| session_id        | FK -> sessions.id        |                         |
| user_id           | FK -> users.id           |                         |
| attendance_status | VARCHAR(50)              | ATTENDED / NOT_ATTENDED |
| attendance_source | VARCHAR(50)              | SYSTEM / ADMIN          |
| marked_by_user_id | FK -> users.id, nullable |                         |
| marked_at         | TIMESTAMP                |                         |
| remarks           | TEXT                     |                         |

### Rules

* one attendance row per `(session_id, user_id)`

---

## 5.8 Compliance Schema

### Table: compliance_status

### Purpose

Stores current compliance state per user and training scope.

| Column                   | Type                    |                                     |
| ------------------------ | ----------------------- | ----------------------------------- |
| id                       | UUID / BIGINT           |                                     |
| user_id                  | FK -> users.id          |                                     |
| training_item_id         | FK -> training_items.id |                                     |
| assignment_id            | FK -> assignments.id    |                                     |
| compliance_state         | VARCHAR(50)             | PENDING / COMPLIANT / NON_COMPLIANT |
| evaluated_at             | TIMESTAMP               |                                     |
| due_date_snapshot        | TIMESTAMP, nullable     |                                     |
| completion_date_snapshot | TIMESTAMP, nullable     |                                     |
| is_migrated_basis        | BOOLEAN                 |                                     |
| created_at               | TIMESTAMP               |                                     |
| updated_at               | TIMESTAMP               |                                     |

### Rules

* current compliance should be uniquely traceable per assignment

---

### Table: compliance_rules

### Purpose

Stores mandatory applicability rules.

| Column           | Type                    |                                                          |
| ---------------- | ----------------------- | -------------------------------------------------------- |
| id               | UUID / BIGINT           |                                                          |
| training_item_id | FK -> training_items.id |                                                          |
| rule_scope       | VARCHAR(50)             | GLOBAL / DEPARTMENT / DESIGNATION / CAPABILITY / PROJECT |
| scope_value      | VARCHAR(150), nullable  |                                                          |
| priority_order   | INTEGER, nullable       |                                                          |
| is_active        | BOOLEAN                 |                                                          |
| created_at       | TIMESTAMP               |                                                          |
| created_by       | FK -> users.id          |                                                          |
| updated_at       | TIMESTAMP               |                                                          |
| updated_by       | FK -> users.id          |                                                          |

---

### Table: compliance_history

### Purpose

Stores compliance state changes over time.

| Column               | Type                       |                                      |
| -------------------- | -------------------------- | ------------------------------------ |
| id                   | UUID / BIGINT              |                                      |
| compliance_status_id | FK -> compliance_status.id |                                      |
| previous_state       | VARCHAR(50)                |                                      |
| new_state            | VARCHAR(50)                |                                      |
| changed_at           | TIMESTAMP                  |                                      |
| trigger_source       | VARCHAR(50)                | COMPLETION / JOB / MIGRATION / ADMIN |
| remarks              | TEXT                       |                                      |

---

# 6. Supporting Module Schema

---

## 6.1 Notifications Schema

### Table: notifications

### Purpose

Stores in-app notification records.

| Column              | Type                |                                  |
| ------------------- | ------------------- | -------------------------------- |
| id                  | UUID / BIGINT       |                                  |
| user_id             | FK -> users.id      |                                  |
| notification_type   | VARCHAR(100)        |                                  |
| title               | VARCHAR(255)        |                                  |
| message             | TEXT                |                                  |
| related_entity_type | VARCHAR(100)        |                                  |
| related_entity_id   | VARCHAR(100)        |                                  |
| is_read             | BOOLEAN             |                                  |
| read_at             | TIMESTAMP, nullable |                                  |
| delivery_status     | VARCHAR(50)         | CREATED / QUEUED / SENT / FAILED |
| created_at          | TIMESTAMP           |                                  |
| updated_at          | TIMESTAMP           |                                  |

---

### Table: notification_delivery_attempts

### Purpose

Tracks retry attempts.

| Column           | Type                   |                |
| ---------------- | ---------------------- | -------------- |
| id               | UUID / BIGINT          |                |
| notification_id  | FK -> notifications.id |                |
| attempt_no       | INTEGER                |                |
| delivery_channel | VARCHAR(50)            | IN_APP / EMAIL |
| attempt_status   | VARCHAR(50)            |                |
| attempted_at     | TIMESTAMP              |                |
| error_message    | TEXT, nullable         |                |

---

## 6.2 Reporting Schema

### Table: report_exports

### Purpose

Stores asynchronous export jobs.

| Column               | Type                |                                           |
| -------------------- | ------------------- | ----------------------------------------- |
| id                   | UUID / BIGINT       |                                           |
| requested_by_user_id | FK -> users.id      |                                           |
| report_type          | VARCHAR(100)        |                                           |
| export_format        | VARCHAR(50)         | EXCEL / PDF                               |
| request_filters_json | JSON / TEXT         |                                           |
| job_status           | VARCHAR(50)         | PENDING / PROCESSING / COMPLETED / FAILED |
| file_reference       | TEXT, nullable      |                                           |
| created_at           | TIMESTAMP           |                                           |
| completed_at         | TIMESTAMP, nullable |                                           |

---

### Table: reporting_snapshots (optional)

### Purpose

Optional cached aggregation layer.

| Column           | Type          |
| ---------------- | ------------- |
| id               | UUID / BIGINT |
| snapshot_type    | VARCHAR(100)  |
| snapshot_date    | DATE          |
| snapshot_payload | JSON / TEXT   |
| created_at       | TIMESTAMP     |

---

## 6.3 Audit Schema

### Table: audit_logs

### Purpose

Stores immutable audit events.

| Column              | Type                     |                             |
| ------------------- | ------------------------ | --------------------------- |
| id                  | UUID / BIGINT            |                             |
| event_code          | VARCHAR(100)             |                             |
| actor_user_id       | FK -> users.id, nullable |                             |
| actor_type          | VARCHAR(50)              | USER / SYSTEM / INTEGRATION |
| module_name         | VARCHAR(100)             |                             |
| action_name         | VARCHAR(100)             |                             |
| entity_type         | VARCHAR(100)             |                             |
| entity_id           | VARCHAR(100)             |                             |
| previous_value_json | JSON / TEXT, nullable    |                             |
| new_value_json      | JSON / TEXT, nullable    |                             |
| source_system       | VARCHAR(100), nullable   |                             |
| correlation_id      | VARCHAR(100), nullable   |                             |
| created_at          | TIMESTAMP                |                             |

### Rules

* immutable
* searchable
* retention minimum 5 years

---

## 6.4 Migration Schema

### Table: migration_jobs

### Purpose

Tracks one-time migration execution.

| Column             | Type                |                                                      |
| ------------------ | ------------------- | ---------------------------------------------------- |
| id                 | UUID / BIGINT       |                                                      |
| migration_status   | VARCHAR(50)         | PENDING / RUNNING / COMPLETED / FAILED / ROLLED_BACK |
| started_at         | TIMESTAMP           |                                                      |
| completed_at       | TIMESTAMP, nullable |                                                      |
| started_by_user_id | FK -> users.id      |                                                      |
| summary_json       | JSON / TEXT         |                                                      |
| created_at         | TIMESTAMP           |                                                      |

---

### Table: migration_failures

### Purpose

Stores failed records during migration.

| Column            | Type                    |
| ----------------- | ----------------------- |
| id                | UUID / BIGINT           |
| migration_job_id  | FK -> migration_jobs.id |
| entity_type       | VARCHAR(100)            |
| source_record_key | VARCHAR(255)            |
| failure_reason    | TEXT                    |
| raw_payload_json  | JSON / TEXT             |
| created_at        | TIMESTAMP               |

---

### Table: migration_mappings

### Purpose

Maps legacy identifiers to LMS identifiers.

| Column           | Type                    |
| ---------------- | ----------------------- |
| id               | UUID / BIGINT           |
| migration_job_id | FK -> migration_jobs.id |
| entity_type      | VARCHAR(100)            |
| legacy_id        | VARCHAR(255)            |
| lms_id           | VARCHAR(255)            |
| created_at       | TIMESTAMP               |

---

## 6.5 Integrations Schema

### Table: integration_jobs

### Purpose

Tracks integration job executions.

| Column               | Type                     |                                                        |
| -------------------- | ------------------------ | ------------------------------------------------------ |
| id                   | UUID / BIGINT            |                                                        |
| integration_name     | VARCHAR(100)             | ZOHO / EMPLOYEE_DB / KEYCLOAK / TEAMS / ONEDRIVE / PES |
| job_type             | VARCHAR(100)             | SYNC / RETRY / HEALTHCHECK / API_ACCESS                |
| job_status           | VARCHAR(50)              | PENDING / RUNNING / COMPLETED / FAILED                 |
| started_at           | TIMESTAMP                |                                                        |
| completed_at         | TIMESTAMP, nullable      |                                                        |
| records_processed    | INTEGER                  |                                                        |
| records_failed       | INTEGER                  |                                                        |
| error_summary        | TEXT, nullable           |                                                        |
| correlation_id       | VARCHAR(100), nullable   |                                                        |
| triggered_by_user_id | FK -> users.id, nullable |                                                        |
| created_at           | TIMESTAMP                |                                                        |

---

### Table: integration_job_logs

### Purpose

Detailed log rows per job.

| Column             | Type                      |
| ------------------ | ------------------------- |
| id                 | UUID / BIGINT             |
| integration_job_id | FK -> integration_jobs.id |
| log_level          | VARCHAR(20)               |
| message            | TEXT                      |
| reference_key      | VARCHAR(255), nullable    |
| created_at         | TIMESTAMP                 |

---

### Table: integration_health_status

### Purpose

Stores current health summary.

| Column           | Type                |                           |
| ---------------- | ------------------- | ------------------------- |
| id               | UUID / BIGINT       |                           |
| integration_name | VARCHAR(100)        |                           |
| last_success_at  | TIMESTAMP, nullable |                           |
| last_failure_at  | TIMESTAMP, nullable |                           |
| current_status   | VARCHAR(50)         | HEALTHY / DEGRADED / DOWN |
| remarks          | TEXT                |                           |
| updated_at       | TIMESTAMP           |                           |

---

# 7. Generic / Platform Module Schema

---

## 7.1 Search Schema

### Table: search_index_queue

### Purpose

Queues index refresh actions.

| Column            | Type                |                                      |
| ----------------- | ------------------- | ------------------------------------ |
| id                | UUID / BIGINT       |                                      |
| entity_type       | VARCHAR(100)        |                                      |
| entity_id         | VARCHAR(100)        |                                      |
| action_type       | VARCHAR(50)         | CREATE / UPDATE / DELETE / REINDEX   |
| processing_status | VARCHAR(50)         | PENDING / PROCESSING / DONE / FAILED |
| created_at        | TIMESTAMP           |                                      |
| processed_at      | TIMESTAMP, nullable |                                      |

---

### Table: search_query_logs (optional)

### Purpose

Stores search analytics.

| Column     | Type                     |
| ---------- | ------------------------ |
| id         | UUID / BIGINT            |
| user_id    | FK -> users.id, nullable |
| query_text | TEXT                     |
| scope      | VARCHAR(100), nullable   |
| created_at | TIMESTAMP                |

---

## 7.2 Admin Configuration Schema

### Table: admin_settings

### Purpose

Stores configurable system settings.

| Column        | Type           |                                   |
| ------------- | -------------- | --------------------------------- |
| id            | UUID / BIGINT  |                                   |
| setting_key   | VARCHAR(150)   |                                   |
| setting_value | TEXT           |                                   |
| value_type    | VARCHAR(50)    | STRING / BOOLEAN / JSON / INTEGER |
| module_name   | VARCHAR(100)   |                                   |
| is_active     | BOOLEAN        |                                   |
| updated_at    | TIMESTAMP      |                                   |
| updated_by    | FK -> users.id |                                   |

---

### Table: admin_settings_history

### Purpose

Tracks setting changes.

| Column             | Type           |
| ------------------ | -------------- |
| id                 | UUID / BIGINT  |
| setting_key        | VARCHAR(150)   |
| previous_value     | TEXT           |
| new_value          | TEXT           |
| changed_by_user_id | FK -> users.id |
| changed_at         | TIMESTAMP      |

---

## 7.3 Background Jobs Schema

### Table: background_jobs

### Purpose

Generic async job tracker.

| Column             | Type                   |                                           |
| ------------------ | ---------------------- | ----------------------------------------- |
| id                 | UUID / BIGINT          |                                           |
| job_type           | VARCHAR(100)           |                                           |
| job_reference_type | VARCHAR(100), nullable |                                           |
| job_reference_id   | VARCHAR(100), nullable |                                           |
| job_status         | VARCHAR(50)            | PENDING / PROCESSING / COMPLETED / FAILED |
| attempt_count      | INTEGER                |                                           |
| max_attempts       | INTEGER                |                                           |
| scheduled_at       | TIMESTAMP              |                                           |
| started_at         | TIMESTAMP, nullable    |                                           |
| completed_at       | TIMESTAMP, nullable    |                                           |
| error_message      | TEXT, nullable         |                                           |
| payload_json       | JSON / TEXT            |                                           |
| created_at         | TIMESTAMP              |                                           |

---

# 8. Relationships Summary

## Key Relationships

* `users` 1 → many `assignments`
* `users` 1 → many `notifications`
* `users` 1 → many `audit_logs` (actor_user_id)
* `users` 1 → many `user_hierarchy`
* `users` 1 → many `user_project_allocations`
* `users` 1 → many `assignment_requests`
* `users` 1 → many `certificates`
* `training_items` 1 → many `training_versions`
* `training_items` 1 → many `assignments`
* `training_items` 1 → many `sessions`
* `training_items` 1 → many `training_resources`
* `assignments` 1 → many `resource_progress`
* `assignments` 1 → 0..1 `training_completions`
* `assignments` 1 → many `assignment_history`
* `sessions` 1 → many `session_participants`
* `sessions` 1 → many `session_attendance`
* `compliance_status` 1 → many `compliance_history`

---

# 9. Recommended Indexing Strategy

## Unique Indexes

* `users.employee_id`
* `users.email`
* `users.keycloak_user_id`
* `training_items.training_code`
* `certificates.certificate_no`
* `session_participants(session_id, user_id)`
* `session_attendance(session_id, user_id)`
* `resource_progress(assignment_id, resource_id)`

## Foreign Key / Query Indexes

* `user_hierarchy.user_id`
* `user_hierarchy.manager_user_id`
* `user_hierarchy.is_current`
* `user_project_allocations.user_id`
* `user_project_allocations.is_current`
* `assignments.user_id`
* `assignments.training_item_id`
* `assignments.assignment_status`
* `assignment_requests.requester_user_id`
* `assignment_requests.request_status`
* `session_participants.user_id`
* `session_attendance.user_id`
* `compliance_status.user_id`
* `compliance_status.compliance_state`
* `notifications.user_id`
* `notifications.is_read`
* `audit_logs.module_name`
* `audit_logs.created_at`
* `integration_jobs.integration_name`
* `background_jobs.job_status`

## Full-Text Search Candidates

* `training_items.title`
* `training_items.description`
* `notifications.message`
* `audit_logs.action_name`
* optional combined search view/materialized structure

---

# 10. Soft Delete / Retention Strategy

## Hard Delete Should Be Avoided For

* users
* assignments
* completions
* compliance
* audit logs
* migration logs

## Preferred Pattern

* `is_active`
* lifecycle state columns
* history tables for key transitions

---

# 11. Suggested Enum Values

## user employment_status

* ACTIVE
* INACTIVE
* EXITED

## training lifecycle_state

* DRAFT
* PUBLISHED
* INACTIVE

## assignment_status

* ASSIGNED
* IN_PROGRESS
* COMPLETED
* OVERDUE

## request_status

* PENDING
* APPROVED
* REJECTED

## session_state

* SCHEDULED
* COMPLETED
* CANCELLED

## compliance_state

* PENDING
* COMPLIANT
* NON_COMPLIANT

## notification delivery_status

* CREATED
* QUEUED
* SENT
* FAILED

## job_status

* PENDING
* PROCESSING
* COMPLETED
* FAILED

---

# 12. Schema Notes for AI / ORM Generation

## ORM Guidance

* use one module folder per aggregate root
* keep write models separated by module
* avoid exposing ORM entities directly to API responses
* define repository/service boundaries per module

## Integrity Guidance

* use application service logic for:

  * duplicate assignment prevention
  * hierarchy validation
  * compliance recalculation
  * session completion propagation

## Performance Guidance

* reporting-heavy queries may use views or materialized summaries later
* export jobs should not run as inline API transactions
* search re-indexing should be asynchronous

---

# 13. Future Expansion Areas

Potential future tables if scope expands:

* skills
* competency_levels
* recommendation_engine_results
* notification_preferences
* MFA device/session registry
* feedback_surveys
* waitlists
* delegated_admins

---

# 14. Final Guidance

This schema should be treated as the primary logical database design for the LMS.

Before physical implementation:

* confirm SQL dialect (PostgreSQL or SQL Server)
* confirm naming conventions
* confirm JSON support strategy
* align ORM models with `07_Modules.md`
* create `001_initial_schema.sql`
* create incremental schema update scripts when module development requires refinements

---

# End of Document