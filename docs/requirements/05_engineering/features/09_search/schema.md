# Search — Database Schema

---

## 1. Design Principles

- Search owns **no database tables** — it queries existing module tables via PostgreSQL full-text search
- `tsvector` computed columns added to source tables (`training_items`, `users`, `sessions`) via `GENERATED ALWAYS AS STORED`
- `GIN` indexes on `tsvector` columns provide < 500ms keyword search at < 1000 users
- Catalog browse uses standard B-tree indexes on `lifecycle_state`, `category`, `is_mandatory` (already defined in Training Management schema)
- Typeahead uses `ILIKE 'prefix%'` on `training_items.title` — no tsvector needed
- No separate search index table, search history table, or cache table in Phase 1

---

## 2. Full-Text Search Index Strategy

These `tsvector` columns and `GIN` indexes are **additions to tables owned by other modules**. They are documented here as the Search module's responsibility to define and maintain.

---

### `training_items` — Search Vector

**Indexed columns:**

| Column | tsvector Weight | Rationale |
|---|---|---|
| `title` | A (highest) | Primary discovery field |
| `description` | B | Secondary discovery |
| `category` | C | Category name in body |
| Tag names | C | Via query-time join on `training_item_tags` + `training_tags` |

**DDL:**
```sql
ALTER TABLE training_items
ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(category, '')), 'C')
) STORED;

CREATE INDEX idx_training_items_search_vector
ON training_items USING GIN(search_vector);
```

**Notes:**
- Tags are joined at query time (not stored in vector) — tags can change without vector rebuild
- `training_code` intentionally excluded — not a discovery field; used for exact lookup
- Vector language: `english` (stemming applied)

---

### `users` — Search Vector (Admin Search Only)

**Indexed columns:**

| Column | tsvector Weight | Rationale |
|---|---|---|
| `full_name` | A | Primary user lookup |
| `email` | A | Direct identifier lookup |
| `department` | B | Org filter field |
| `designation` | B | Role filter field |

**DDL:**
```sql
ALTER TABLE users
ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('simple', coalesce(full_name, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(email, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(department, '')), 'B') ||
  setweight(to_tsvector('simple', coalesce(designation, '')), 'B')
) STORED;

CREATE INDEX idx_users_search_vector
ON users USING GIN(search_vector);
```

**Notes:**
- Language: `simple` (no stemming — names and emails should match exactly)
- `employee_id` searched via exact `ILIKE` match (not tsvector — format is structured)
- Email partially masked in API response layer — full email stored in DB for search accuracy

---

### `sessions` — Search Vector

**Indexed columns:**

| Column | tsvector Weight | Rationale |
|---|---|---|
| `title` | A | Primary session discovery |
| `session_code` | A | Direct reference lookup |

> **Note:** `physical_location` removed — sessions now reference `venue_id FK` → `session_venues` (Module 5 schema change). `GENERATED ALWAYS AS STORED` cannot join to other tables. Venue-name search is a Phase 2 enhancement requiring a denormalized `venue_name` column or trigger on `sessions`.

**DDL:**
```sql
ALTER TABLE sessions
ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(session_code, '')), 'A')
) STORED;

CREATE INDEX idx_sessions_search_vector
ON sessions USING GIN(search_vector);
```

---

## 3. Catalog Browse Indexes

Catalog browse (`GET /search/catalog`) uses existing B-tree indexes on `training_items`. No new indexes required — these are already defined in the Training Management schema:

| Index | Column(s) | Used For |
|---|---|---|
| `idx_training_items_lifecycle` | `lifecycle_state` | Filter PUBLISHED only |
| `idx_training_items_mandatory` | `is_mandatory` | Mandatory-first sort |
| `idx_training_items_category` | `category` | Category filter |
| `idx_training_items_type` | `training_type` | Type filter |

Catalog browse query pattern:
```sql
SELECT * FROM training_items
WHERE lifecycle_state = 'PUBLISHED'
  AND (is_mandatory = :is_mandatory OR :is_mandatory IS NULL)
  AND (category = :category OR :category IS NULL)
  AND (training_type = :training_type OR :training_type IS NULL)
ORDER BY is_mandatory DESC, title ASC
LIMIT :size OFFSET :offset;
```

---

## 4. Typeahead Index

Typeahead (`GET /search/suggestions`) uses a standard B-tree index for prefix matching:

```sql
CREATE INDEX idx_training_items_title_prefix
ON training_items (title text_pattern_ops)
WHERE lifecycle_state = 'PUBLISHED';
```

`text_pattern_ops` enables efficient `ILIKE 'prefix%'` queries on `title`.

---

## 5. Query Execution Pattern

### Keyword Search (Full-Text)

```sql
SELECT
  id, title, training_type, category, is_mandatory, requires_approval,
  ts_rank(search_vector, query) AS relevance_score
FROM training_items,
  to_tsquery('english', :normalized_query) query
WHERE lifecycle_state = 'PUBLISHED'
  AND search_vector @@ query
ORDER BY
  is_mandatory DESC,           -- mandatory training boosted
  ts_rank(search_vector, query) DESC,
  created_at DESC
LIMIT :size OFFSET :offset;
```

### Typeahead

```sql
SELECT id, title, training_type, is_mandatory
FROM training_items
WHERE lifecycle_state = 'PUBLISHED'
  AND title ILIKE :prefix || '%'
ORDER BY is_mandatory DESC, title ASC
LIMIT 10;
```

---

## 6. Tables Modified (Owned by Other Modules)

| Table | Owning Module | Modification |
|---|---|---|
| `training_items` | Training Management | Add `search_vector` computed column + GIN index |
| `users` | User Management | Add `search_vector` computed column + GIN index |
| `sessions` | Sessions | Add `search_vector` computed column + GIN index |

These modifications are coordinated with the owning module teams but maintained by the Search module's migration scripts.

---

## 7. Cross-Check Notes

Verified against:
- `09_search.md` — all data requirements covered including all 7 enterprise additions
- `02_database_schema.md` §7.1 — no owned tables in master schema for Search (confirmed)

**Additions vs master schema:**
- `tsvector` computed columns + GIN indexes on `training_items`, `users`, `sessions` (fully specified — master had no index definitions)
- `text_pattern_ops` B-tree index on `training_items.title` for typeahead prefix matching
- Catalog browse query pattern documented with index usage
- No separate search index table required at < 1000 users (master had none — confirmed correct)
- Language strategy: `english` for content fields (stemming), `simple` for identifiers (exact match)
