# Admin — Database Schema

---

## 1. Design Principles

- Two tables owned by Admin: `admin_settings` (live config) and `admin_settings_history` (permanent change log)
- Settings are a typed key-value store — no schema changes needed to add new settings
- `admin_settings` is updated in place (upsert pattern per `setting_key`)
- `admin_settings_history` is append-only — never updated or deleted
- Mandatory rules are owned by the Assignment Engine module — Admin only manages them via API (no Admin-owned table)
- Global roles are owned by Keycloak — no role table in LMS database

---

## 2. Common Columns Standard

| Column | Type | Purpose |
|---|---|---|
| `id` | UUID | Primary key |
| `created_at` | TIMESTAMP | Record creation time |
| `updated_at` | TIMESTAMP | Last update time (mutable tables only) |

---

## 3. Tables Owned by Admin Module

---

### Table: `admin_settings`

**Purpose**
Stores all configurable system settings as typed key-value pairs. One row per setting. Admin reads and updates these values. Downstream modules (Assignment Engine, Notifications, Audit) read their relevant settings at runtime.

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `setting_key` | VARCHAR(150) | No | Unique namespaced key: `module.key_name` |
| `setting_value` | TEXT | No | Current value (stored as text; typed by `value_type`) |
| `value_type` | VARCHAR(50) | No | `STRING` / `BOOLEAN` / `INTEGER` / `JSON` |
| `module_name` | VARCHAR(100) | No | `assignment` / `notification` / `system` |
| `default_value` | TEXT | No | Factory default — never modified after seeding |
| `description` | TEXT | Yes | Human-readable purpose description |
| `is_active` | BOOLEAN | No | Default true; false = setting disabled/ignored |
| `updated_at` | TIMESTAMP | Yes | Set on each update; null = never changed from default |
| `updated_by` | UUID | Yes | FK → `users.id`; null = default value never changed |

**Settings Catalog (seeded at deployment)**

| `setting_key` | `module_name` | `value_type` | `default_value` |
|---|---|---|---|
| `assignment.overdue_escalation_day_manager` | assignment | INTEGER | 7 |
| `assignment.overdue_escalation_day_hr_admin` | assignment | INTEGER | 30 |
| `assignment.approval_expiry_days` | assignment | INTEGER | 30 |
| `notification.due_date_reminder_days` | notification | INTEGER | 7 |
| `notification.session_reminder_hours_first` | notification | INTEGER | 24 |
| `notification.session_reminder_hours_second` | notification | INTEGER | 1 |
| `system.export_file_retention_hours` | system | INTEGER | 24 |
| `system.notification_retention_days` | system | INTEGER | 90 |
| `system.audit_log_retention_days` | system | INTEGER | 1825 |
| `system.policy_current_version` | system | STRING | v1 |

**Business Rules**
- `setting_key` is unique — one row per setting
- Rows seeded at deployment with factory defaults; never inserted again in normal operation
- `setting_value` updated in place on Admin change; previous value written to `admin_settings_history` first
- `is_active = false` means setting is not in use (used for deprecating a setting without deletion)
- Downstream workers read settings via `setting_key` lookup; cache invalidated on update

**Indexes**
- `setting_key` (unique — primary lookup)
- `module_name` (filter by module in Admin dashboard)

---

### Table: `admin_settings_history`

**Purpose**
Append-only audit trail of every configuration change. One row per change. Never purged — permanent retention for regulatory traceability. Powers the "Settings Change History" view.

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `setting_key` | VARCHAR(150) | No | The setting that was changed |
| `module_name` | VARCHAR(100) | No | Module of the setting (denormalized for query) |
| `previous_value` | TEXT | No | Value before change |
| `new_value` | TEXT | No | Value after change |
| `changed_by_user_id` | UUID | No | FK → `users.id` — Admin who made the change |
| `changed_at` | TIMESTAMP | No | Timestamp of change |

**Business Rules**
- Written immediately before `admin_settings` is updated
- Never updated or deleted — permanent record
- `module_name` denormalized for efficient filtering without join

**Indexes**
- `setting_key` (history for one setting)
- `(module_name, changed_at DESC)` (history by module, most recent first)
- `changed_by_user_id` (changes by a specific Admin)
- `changed_at DESC` (global history timeline)

---

## 4. Tables Referenced (Owned by Other Modules)

| Table | Owning Module | Used By Admin |
|---|---|---|
| `users` | User Management | `admin_settings.updated_by` — Admin who updated setting; `admin_settings_history.changed_by_user_id` |
| `mandatory_assignment_rules` | Assignment Engine | Admin manages via API; table owned by Assignment Engine |

---

## 5. Tables NOT Owned by Admin

| Concern | Where It Lives |
|---|---|
| Global roles (ADMIN / HR / EMPLOYEE) | Keycloak — not stored in LMS DB; read from JWT at runtime |
| Mandatory assignment rules | Assignment Engine — `mandatory_assignment_rules` table |
| Integration health | Integrations — `integration_health_status` table |
| Audit events for config changes | Audit — `audit_logs` table (event `ADMIN_CONFIG_UPDATED`, `ROLE_MAPPING_UPDATED`) |

---

## 6. Enum Values

### `value_type`
- `STRING` — plain text
- `BOOLEAN` — `true` / `false` (stored as string)
- `INTEGER` — numeric (stored as string, validated on write)
- `JSON` — JSON-encoded complex value

### `module_name`
- `assignment`
- `notification`
- `system`

---

## 7. Cross-Check Notes

Verified against:
- `03_architecture/04_integrations.md` — integration monitoring is Integrations-owned; Admin reads health, does not own tables
- `02_database_schema.md` §7.2 — master schema present; additions below

**Additions vs master schema:**
- `admin_settings.default_value` — needed for "reset to default" and display of factory defaults; master had no default tracking
- `admin_settings.description` — human-readable label for Admin UI; master had no description column
- `admin_settings_history.module_name` — denormalized for efficient filtering; master had no module column in history
- Full settings catalog (10 settings) defined — master had table structure only with no catalog
- `system.policy_current_version` added — required by Auth module policy acceptance flow (`POST /auth/policy-acceptance` compares submitted version against this setting)
- `LAST_ADMIN_PROTECTED` enforcement documented — logic in API layer (no DB change required; count query on `users` + Keycloak roles)
