# Probation Management — Database Schema

---

## 1. Design Principles

- Probation is a lifecycle state on the user — not a separate entity for most access patterns
- `user_probation` table provides the full history/audit trail of each probation period
- Gate evaluation is done by reading `compliance_status` for assignments where `is_probation_gate = true`
- Rules are stored in `mandatory_assignment_rules` (owned by Assignment Engine) — probation adds `EMPLOYMENT_PHASE` scope + filters

---

## 2. Tables Owned by Probation Module

The primary tables added for probation are defined in the User Management and Assignment Engine schema files. This file provides the cross-module view.

---

### Table: `user_probation`

> Owned by: **User Management** — defined in `features/02_user_management/schema.md`

**Purpose**
Tracks each probation period for a user. Created automatically when a user is onboarded with `employment_phase = PROBATION`. One active row per user at any time.

**Columns**

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | UUID | No | Primary key |
| `user_id` | UUID | No | FK → `users.id` |
| `probation_start_date` | DATE | No | Set at user creation (typically `joining_date`) |
| `probation_end_date` | DATE | No | `probation_start_date` + configured days (default 90) |
| `probation_status` | VARCHAR(50) | No | `PROBATION` / `CONFIRMED` / `EXTENDED` / `TERMINATED` |
| `extended_until` | DATE | Yes | Set when HR extends the probation deadline |
| `extension_reason` | TEXT | Yes | HR-provided reason for extension |
| `confirmed_at` | TIMESTAMP | Yes | When HR confirmed probation completion |
| `confirmed_by` | UUID | Yes | FK → `users.id` — HR actor who confirmed |
| `created_at` | TIMESTAMP | No | |
| `created_by` | UUID | No | FK → `users.id` or system |
| `updated_at` | TIMESTAMP | No | |
| `updated_by` | UUID | No | FK → `users.id` or system |

**Indexes**
- `user_id`
- `(user_id, probation_status)`
- `probation_end_date` (deadline alerts)

---

## 3. Probation-Related Columns on Other Module Tables

### `users` table (User Management)

| Column | Type | Notes |
|---|---|---|
| `employment_phase` | VARCHAR(50) | `PROBATION` / `CONFIRMED` / `EXITED`; default `CONFIRMED` |
| `probation_end_date` | DATE | Quick access to deadline; mirrors `user_probation.probation_end_date` |

---

### `mandatory_assignment_rules` table (Assignment Engine)

| Column | Type | Notes |
|---|---|---|
| `rule_scope` | VARCHAR(50) | Added `EMPLOYMENT_PHASE` value — targets users with `employment_phase = PROBATION` |
| `designation_filter` | VARCHAR(150) | Nullable — secondary filter for EMPLOYMENT_PHASE scope |
| `capability_filter` | VARCHAR(150) | Nullable — secondary filter for EMPLOYMENT_PHASE scope |
| `is_probation_gate` | BOOLEAN | Default false — when true, completion required for probation confirmation |

---

### `assignments` table (Assignment Engine)

| Column | Type | Notes |
|---|---|---|
| `is_probation_gate` | BOOLEAN | Copied from rule at assignment creation; enables efficient gate queries |

---

### `training_items` table (Training Management)

| Column | Type | Notes |
|---|---|---|
| `is_probation_gateway` | BOOLEAN | Default false — marks training eligible for EMPLOYMENT_PHASE rule targeting |

---

## 4. Referenced Tables (Cross-Module FKs for Probation Feature)

| Table | Owning Module | How Probation Uses It |
|---|---|---|
| `users` | User Management | `user_probation.user_id`, `user_probation.confirmed_by`; `employment_phase` flag |
| `mandatory_assignment_rules` | Assignment Engine | Stores EMPLOYMENT_PHASE rules that generate probation gate assignments |
| `assignments` | Assignment Engine | Gate assignments tracked via `is_probation_gate = true` |
| `compliance_status` | Assignment Engine | Gate evaluation checks `compliance_state = COMPLIANT` for all probation gate assignments |
| `training_items` | Training Management | `is_probation_gateway` flag determines eligibility for probation rule targeting |

---

## 5. Gate Evaluation Query Pattern

```sql
-- Check if all probation gate assignments for a user are COMPLIANT
SELECT COUNT(*) AS total,
       SUM(CASE WHEN cs.compliance_state = 'COMPLIANT' THEN 1 ELSE 0 END) AS compliant_count
FROM assignments a
JOIN compliance_status cs ON cs.assignment_id = a.id
WHERE a.user_id = :user_id
  AND a.is_probation_gate = true
  AND a.assignment_status != 'CANCELLED';

-- Confirmation allowed when total = compliant_count AND total > 0
```

---

## 6. Enum Values

### `probation_status` (user_probation table)
- `PROBATION` — active, gate trainings not yet complete or deadline not passed
- `CONFIRMED` — all gate trainings COMPLIANT; HR confirmed
- `EXTENDED` — HR extended the deadline
- `TERMINATED` — employment ended during probation

### `employment_phase` (users table)
- `PROBATION`
- `CONFIRMED`
- `EXITED`

---

## 7. Cross-Check Notes

Verified against `12_probation_management.md` feature spec.

**Tables modified in other modules for this feature:**
- `users` — `employment_phase`, `probation_end_date` (User Management schema)
- `mandatory_assignment_rules` — `EMPLOYMENT_PHASE` scope, `designation_filter`, `capability_filter`, `is_probation_gate` (Assignment Engine schema)
- `assignments` — `is_probation_gate` column (Assignment Engine schema)
- `training_items` — `is_probation_gateway` column (Training Management schema)

**New table added:**
- `user_probation` — defined in User Management schema (logically part of user lifecycle)
