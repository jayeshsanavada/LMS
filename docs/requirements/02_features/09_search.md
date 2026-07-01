# Feature: Search (Enterprise Learning Discovery & Information Retrieval)

---

# 1. Feature Overview

## Purpose

The Search feature provides a centralized, secure, and high-performance capability to locate training content, users, and sessions within the LMS.

It acts as the **discovery layer of the LMS**, enabling users to find training via keyword search and catalog browsing without navigating across multiple modules.

Search is powered by **PostgreSQL full-text search** (`tsvector` / `GIN` indexes) on LMS data. No external search engine is required at < 1000 users.

---

## Why Business Needs It

As LMS data grows, users require fast and accurate access to information to maintain productivity and compliance:

* Faster training discovery via keyword or browse
* Typeahead suggestions reduce navigation friction
* Catalog browsing enables self-directed learning
* Admin user lookup for management and investigation
* Role-scoped results protect data confidentiality

---

## Problems This Feature Solves

* Difficulty finding training content
* Manual navigation across modules
* No catalog browsing experience
* Poor search UX without autocomplete
* Inconsistent search security

---

## Integration with Other LMS Modules

| Module          | Search Purpose                            |
| --------------- | ----------------------------------------- |
| Training Management | Source of training catalog data       |
| Assignment Engine | Assignment scope filter                 |
| Sessions        | Session discovery                         |
| User Management | User search (Admin only)                  |

Search is read-only — it never modifies system state.

---

# 2. Actors

## Employee

* Keyword search across training catalog and assigned training
* Browse training catalog (filter without keyword)
* Typeahead suggestions on search bar
* Access restricted to: own assignments + all published training in catalog

---

## Manager

Derived from hierarchy (NOT a role)

* Search own assignments + team assignments
* Browse catalog
* Access restricted to own data + direct reports (TEAM_ONLY)

---

## Admin

* Global search across training, users, sessions
* Full visibility — ORG_WIDE
* User search (name, email, employee ID, department)

---

## HR

* Search training catalog and compliance-relevant data
* ORG_WIDE for compliance search; own data for personal search

---

# 2A. User Scenarios

(No major change — already correct)

---

# 3. Functional Overview

Search has two distinct interaction patterns:

### Pattern 1: Keyword Search
User types a query (min 2 characters) → system executes PostgreSQL full-text search → results ranked by relevance + mandatory-first boost → results filtered by role + hierarchy before return.

### Pattern 2: Catalog Browse
User opens training catalog without typing a query → system returns all visible published training → user applies filters (category / tag / type / difficulty / mandatory) → paginated results returned.

These are served by different endpoints with different behavior.

### Typeahead / Suggestions
As user types (min 2 chars), system returns up to 10 title-match suggestions from training catalog. Fast prefix search using `ILIKE` on `training_items.title`.

---

# 4. Functional Requirements

## 4.1 Training Catalog Visibility Rules

All PUBLISHED training is visible to all active employees in the catalog regardless of assignment status. The `requires_approval` flag controls the enrollment flow — not catalog visibility.

| Training State | Visible in Catalog |
|---|---|
| PUBLISHED | Yes — always |
| DRAFT | No |
| INACTIVE | No (Admin can see with filter) |

Employee catalog visibility:
* All PUBLISHED training items (course, learning path, curriculum)
* No distinction between mandatory and optional — both visible
* `requires_approval = false` → "Enroll" button shown
* `requires_approval = true` → "Request Approval" button shown
* Already-assigned training shown with assignment status badge

---

## 4.2 Global Federated Search

Single search endpoint returns results across multiple entity types in one response. Each result carries a `result_type` discriminator so the frontend can render the appropriate card.

**Result types returned per role:**

| result_type | Employee | Manager | Admin | HR |
|---|---|---|---|---|
| `training` | Own + catalog | Own + catalog | All | All PUBLISHED |
| `session` | Own sessions | Own + team sessions | All | All |
| `user` | No | No | All | No |

Results ranked by: `ts_rank` (relevance) first, mandatory training boosted, then `created_at` desc.

---

## 4.3 Catalog Browse (Filter Without Keyword)

Separate endpoint for catalog browsing — no keyword required. All filters optional. Returns paginated published training.

Filters:
* `category`
* `training_type` (COURSE / LEARNING_PATH / CURRICULUM)
* `difficulty_level`
* `is_mandatory`
* `tag`
* `requires_approval`

---

## 4.4 Scoped Training Search

Dedicated endpoint for training keyword search with full filter set. Requires `q` (min 2 chars).

Searched columns (via tsvector):
* `training_items.title` (weight A — highest)
* `training_items.description` (weight B)
* `training_items.category` (weight C)
* tag names (weight C — via join)

---

## 4.5 User Search (Admin Only)

Admin-only endpoint for user lookup by:
* Full name (tsvector weight A)
* Email (tsvector weight A)
* Employee ID (exact match)
* Department (tsvector weight B)
* Designation (tsvector weight B)

Employees cannot search other users.

---

## 4.6 Typeahead / Autocomplete

Returns up to 10 title-prefix matches for the training catalog as user types. Min 2 characters. Fast `ILIKE` query on `training_items.title` (not full-text search — prefix match is faster for typeahead).

Scoped by caller role:
* Employee / Manager / HR: PUBLISHED training only
* Admin: PUBLISHED + DRAFT + INACTIVE with lifecycle_state label

---

## 4.7 Query Constraints (Enterprise Standard)

| Constraint | Value |
|---|---|
| Minimum query length (`q`) | 2 characters |
| Maximum query length | 200 characters |
| Maximum results per page | 50 |
| Default results per page | 20 |
| Typeahead max results | 10 |
| Search response target | < 500ms |

---

## 4.8 Result Ranking Strategy

For keyword search results (full-text):
1. `ts_rank(search_vector, query)` — PostgreSQL relevance score
2. Mandatory training boosted: `is_mandatory = true` results promoted within same rank tier
3. Tie-break: `created_at DESC` (most recent first)

For catalog browse (no keyword):
1. Mandatory training first
2. Then alphabetical by `title`

---

## 4.9 Security Filtering

Search results are always filtered **before return** based on:
* Role (Keycloak `realm_access.roles`)
* Hierarchy (Employee DB — for team-scoped manager search)

An employee querying a training item they are not permitted to see will receive an empty result — not a 403 (to avoid information leakage on existence of records).

---

# 5. Business Rules

## Query Rules

BR-01 Minimum query length: 2 characters — shorter queries rejected with `QUERY_TOO_SHORT` (422)
BR-02 Maximum query length: 200 characters — longer queries rejected with `QUERY_TOO_LONG` (422)
BR-03 Empty query on catalog browse is allowed — returns all visible published training

---

## Catalog Visibility Rules

BR-04 All PUBLISHED training visible to all active employees in catalog
BR-05 DRAFT and INACTIVE training not visible in employee/manager catalog
BR-06 Admin can see all lifecycle states with filter
BR-07 `requires_approval` controls enrollment flow, not catalog visibility
BR-08 Mandatory training always discoverable regardless of assignment status

---

## Authorization Rules

BR-09 Role + hierarchy enforced before results returned
BR-10 Employee sees own assignments + all published catalog training
BR-11 Manager sees own + team data (direct reports only, depth = 1)
BR-12 Admin sees ORG_WIDE for all result types including users
BR-13 User search restricted to Admin only — employees cannot search other users
BR-14 Result existence must not be disclosed to unauthorized users — return empty, not 403

---

## Ranking Rules

BR-15 Full-text results ranked by `ts_rank` then mandatory-first then recency
BR-16 Catalog browse results sorted mandatory-first then alphabetical

---

## Performance Rules

BR-17 Search response target: < 500ms at < 1000 users
BR-18 Typeahead uses `ILIKE` prefix match (faster than full-text for < 3 char queries)
BR-19 GIN indexes maintained on `tsvector` columns for each searchable entity
BR-20 Catalog browse uses standard B-tree indexes on `lifecycle_state`, `category`, `is_mandatory`

---

# 6. Search Index Strategy

## `training_items` — Full-Text Index

```sql
ALTER TABLE training_items
ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(category, '')), 'C')
) STORED;

CREATE INDEX idx_training_items_search ON training_items USING GIN(search_vector);
```

Tags added to search vector via query-time join (not stored — tags can change independently).

## `users` — Full-Text Index (Admin search only)

```sql
ALTER TABLE users
ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('simple', coalesce(full_name, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(email, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(department, '')), 'B') ||
  setweight(to_tsvector('simple', coalesce(designation, '')), 'B')
) STORED;

CREATE INDEX idx_users_search ON users USING GIN(search_vector);
```

## `sessions` — Full-Text Index

```sql
ALTER TABLE sessions
ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(session_code, '')), 'A')
) STORED;

CREATE INDEX idx_sessions_search ON sessions USING GIN(search_vector);
```

> **Note:** `physical_location` was removed — sessions now use `venue_id FK` to `session_venues` (Module 5). `GENERATED ALWAYS AS STORED` cannot reference joined tables. Venue-name search is a Phase 2 enhancement requiring a denormalized `venue_name` column or trigger on `sessions`.

---

# 7. Workflows

## Keyword Search Flow

User types query (≥ 2 chars) → `GET /api/v1/search?q=...&type=training`
→ Role + hierarchy scope determined
→ PostgreSQL `@@` operator executed against `search_vector` + tag join
→ Results ranked by ts_rank + mandatory boost
→ Filtered by role scope
→ Paginated results returned

---

## Catalog Browse Flow

User opens catalog (no query) → `GET /api/v1/search/catalog`
→ Filters applied (category / tag / type / difficulty / mandatory)
→ All PUBLISHED training matching filters returned
→ Sorted: mandatory first, then alphabetical
→ Paginated results returned

---

## Typeahead Flow

User types ≥ 2 chars in search bar → `GET /api/v1/search/suggestions?q=...`
→ `ILIKE 'query%'` on `training_items.title`
→ Max 10 results returned within < 200ms

---

# 8. Edge Cases

## Query Below Minimum Length

Returns `QUERY_TOO_SHORT` (422). No DB query executed.

---

## No Results Found

Returns empty `items: []` with `total: 0`. No error. Frontend shows empty state.

---

## Inactive User Searching

Deactivated users cannot authenticate — search never reached.

---

## Admin Searches for Inactive Training

Default catalog excludes INACTIVE. Admin can include with `lifecycle_state=INACTIVE` filter.

---

## Unauthorized Access Attempt

Returns empty results — not 403. Prevents information leakage about record existence.

---

# 9. Acceptance Criteria

* Global search returns federated results with `result_type` discriminator
* Training catalog browse works with no keyword (filter-only)
* Typeahead returns ≤ 10 title-prefix suggestions within 200ms
* Minimum 2-character query enforced
* Employee cannot search or see other users' data
* User search (Admin only) works by name / email / employee ID / department
* Role + hierarchy filtering applied before results returned
* Mandatory training always discoverable by any active employee
* All PUBLISHED training visible in employee catalog
* Result ranking: ts_rank → mandatory-first → recency
* Search response < 500ms at operating scale
* INACTIVE/DRAFT training excluded from employee catalog by default

---

# 10. Dependencies

* Training Management (`training_items`, `training_item_tags`, `training_tags`)
* Sessions (`sessions`)
* User Management (`users`)
* Assignment Engine (`assignments` — for assignment status badges in catalog)
* PostgreSQL GIN indexes (full-text)
* Employee DB (hierarchy — for manager team scope)

---

# 11. Assumptions

* < 1000 users; single tenant
* PostgreSQL full-text search sufficient — no Elasticsearch needed at this scale
* `tsvector` computed columns maintained automatically by PostgreSQL (GENERATED ALWAYS AS STORED)
* Search is read-only — no state modifications

---

# 12. Future Enhancements

* AI-based semantic ranking (vector embeddings)
* Natural language search
* Search analytics (most searched terms, zero-result queries)
* Personalised search ranking (based on learning history)
* Auto-suggestions based on role and mandatory training

---

# End of Document
