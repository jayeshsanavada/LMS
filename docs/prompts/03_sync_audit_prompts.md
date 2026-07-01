# AZ-LMS Documentation Sync Audit — Complete Prompt Set

**Instructions:**
- Run one prompt per new conversation (keeps context clean, avoids token overflow)
- Run in the ORDER listed below (dependency order)
- Save each output to `docs/sync_audit/` as `module_01_auth.md`, `module_02_users.md`, etc.
- Fix all REAL GAPS before starting AI code generation
- Re-run the affected module prompt after fixes to confirm resolution

**Execution Order (dependency-based):**
```
1.  Auth                  ← foundational, no dependencies
2.  User Management       ← foundational, everything depends on users
3.  Admin                 ← settings catalog affects ALL modules below
4.  Training Management   ← core domain
5.  Search                ← only reads training_items
6.  Assignment Engine     ← depends on Training + User
7.  Probation             ← depends on Assignment Engine
8.  Sessions              ← depends on Training + User
9.  Notifications         ← cross-cutting, triggered by all modules
10. Audit                 ← cross-cutting, events from all modules
11. Reporting             ← reads from all modules
12. Integrations          ← external systems
13. Dashboards            ← cross-module UI
14. Final                 ← runs after everything else
15. Technical Infrastructure ← run last; verifies AI workflow files are ready for code generation
```

**Base path for all files:**
`c:\Users\jayesh.sanavada\OneDrive - Azilen Technologies Pvt. Ltd\Development\AZ-LMS\lms_rad\`

**How these prompts work:**
Each module prompt below tells you which files to read and which module-specific checks to run
ON TOP OF the standard checklist. The standard base checklist (Checks 1–17) is in:
`docs/code_generation/skills/01_module_audit.md` → Step 4

Read that file FIRST in every module session. It is the master checklist.

---

## MODULE 1 — Authentication

```
You are performing a documentation sync audit for the AZ-LMS project.

STEP 0 — Read the master audit skill file first:
docs/code_generation/skills/01_module_audit.md

This file defines the standard checklist (Checks 1–17) that you will run for every module.
Read it completely before proceeding.

STEP 1 — Read ALL of the following files for this module:

FEATURE & ENGINEERING:
1. docs\requirements\02_features\01_authentication.md
2. docs\requirements\05_engineering\features\01_auth\schema.md
3. docs\requirements\05_engineering\features\01_auth\api.md
4. docs\requirements\05_engineering\er_diagram.md (AUTH section only)
5. docs\requirements\05_engineering\00_apisix_routes.md (auth routes only)

ARCHITECTURE:
6. docs\requirements\04_architecture\01_architecture.md (Authorization Module section)
7. docs\requirements\04_architecture\03_modules.md (Auth module section)

UX:
8. docs\requirements\03_ux\01_ux_flows.md (authentication flows only)
9. docs\requirements\03_ux\02_screens.md (authentication screens only)

PROTOTYPE:
10. prototype\login.html

All paths relative to:
c:\Users\jayesh.sanavada\OneDrive - Azilen Technologies Pvt. Ltd\Development\AZ-LMS\lms_rad\

STEP 2 — Run the standard checklist from docs/code_generation/skills/01_module_audit.md Step 4 (Checks 1–17).

STEP 3 — Run these MODULE-SPECIFIC checks in addition:

AUTH-SPECIFIC CHECK A — Keycloak Integration:
- keycloak_user_id field exists in the users or auth schema
- "Roles read from JWT at runtime, not stored in LMS DB" is consistent across feature spec, schema, and API
- Hybrid auth model (Keycloak for global roles + user_hierarchy for manager scope) is reflected in feature spec and architecture

AUTH-SPECIFIC CHECK B — Last Admin Protection:
- Last Admin protection rule exists in BOTH the feature spec AND the API error codes
- The rule prevents removing the last ADMIN role assignment

AUTH-SPECIFIC CHECK C — SSO & Token Handling:
- SSO flow steps in UX flows match the feature spec SSO workflow
- Token expiry / session timeout behavior is consistent between feature spec, API, and prototype

Output your findings using the standard format from docs/code_generation/skills/01_module_audit.md Step 5.
```

---

## MODULE 2 — User Management

```
You are performing a documentation sync audit for the AZ-LMS project.

STEP 0 — Read the master audit skill file first:
docs/code_generation/skills/01_module_audit.md

STEP 1 — Read ALL of the following files for this module:

FEATURE & ENGINEERING:
1. docs\requirements\02_features\02_user_management.md
2. docs\requirements\05_engineering\features\02_user_management\schema.md
3. docs\requirements\05_engineering\features\02_user_management\api.md
4. docs\requirements\05_engineering\er_diagram.md (User Management section only)
5. docs\requirements\05_engineering\00_apisix_routes.md (user management routes)

ARCHITECTURE:
6. docs\requirements\04_architecture\01_architecture.md (User Management / Authorization sections)
7. docs\requirements\04_architecture\03_modules.md (User Management module section)
8. docs\requirements\04_architecture\04_integrations.md (Zoho HR and Employee DB sections)

UX:
9. docs\requirements\03_ux\01_ux_flows.md (user management flows)
10. docs\requirements\03_ux\02_screens.md (user management screens)

PROTOTYPE:
11. prototype\admin-users.html
12. prototype\user-detail.html
13. prototype\profile.html

All paths relative to:
c:\Users\jayesh.sanavada\OneDrive - Azilen Technologies Pvt. Ltd\Development\AZ-LMS\lms_rad\

STEP 2 — Run the standard checklist from docs/code_generation/skills/01_module_audit.md Step 4 (Checks 1–17).

STEP 3 — Run these MODULE-SPECIFIC checks in addition:

USER-SPECIFIC CHECK A — Dual Sync Source Tables:
- user_hierarchy table exists with manager relationship fields
- user_project_allocations table exists
- user_source_references table exists for tracking external system IDs (Zoho ID, Employee DB ID)
- user_field_overrides table exists for Admin overrides
- All enum values (employment_status, employment_type, employment_phase, global_role) match feature spec
- Zoho-overridable vs non-overridable fields are distinguished in schema

USER-SPECIFIC CHECK B — Integration Source-of-Truth Alignment:
- "Zoho is source of truth for HR fields" is consistent across feature spec, schema, and architecture
- "Employee DB is source of truth for hierarchy/capability/designation" is consistent
- Admin-overridden fields are protected from sync overwrites in BOTH feature spec AND schema

USER-SPECIFIC CHECK C — Access Rule Verification:
- Sync trigger endpoints (Zoho, Employee DB) are Admin-only in APISIX
- Manager scope = depth 1 direct reports only — confirmed in feature spec AND API filter logic

Output your findings using the standard format from docs/code_generation/skills/01_module_audit.md Step 5.
```

---

## MODULE 3 — Admin

```
You are performing a documentation sync audit for the AZ-LMS project.

NOTE: Admin is audited EARLY because its system settings catalog (notification timings,
overdue thresholds, approval expiry days, etc.) is referenced by ALL other modules.
Confirm the settings catalog is complete before auditing dependent modules.

STEP 0 — Read the master audit skill file first:
docs/code_generation/skills/01_module_audit.md

STEP 1 — Read ALL of the following files for this module:

FEATURE & ENGINEERING:
1. docs\requirements\02_features\11_admin.md
2. docs\requirements\05_engineering\features\11_admin\schema.md
3. docs\requirements\05_engineering\features\11_admin\api.md
4. docs\requirements\05_engineering\00_apisix_routes.md (admin and settings routes)

ARCHITECTURE:
5. docs\requirements\04_architecture\01_architecture.md (Admin section)
6. docs\requirements\04_architecture\03_modules.md (Admin module section)
7. docs\requirements\04_architecture\04_integrations.md (Keycloak section)

CROSS-MODULE FEATURE SPECS (extract configurable settings they reference):
8.  docs\requirements\02_features\04_assignment_engine.md
9.  docs\requirements\02_features\06_notifications.md
10. docs\requirements\02_features\05_sessions.md

UX:
11. docs\requirements\03_ux\01_ux_flows.md (admin settings flows)
12. docs\requirements\03_ux\02_screens.md (admin/settings screens)

PROTOTYPE:
13. prototype\admin-settings.html

All paths relative to:
c:\Users\jayesh.sanavada\OneDrive - Azilen Technologies Pvt. Ltd\Development\AZ-LMS\lms_rad\

STEP 2 — Run the standard checklist from docs/code_generation/skills/01_module_audit.md Step 4 (Checks 1–17).

STEP 3 — Run these MODULE-SPECIFIC checks in addition:

ADMIN-SPECIFIC CHECK A — Settings Catalog Cross-Module Coverage (CRITICAL):
- From assignment_engine.md: extract all configurable thresholds (overdue escalation days, approval expiry days, recertification periods)
- From notifications.md: extract all configurable timings (reminder days, session reminder hours, notification retention days)
- From sessions.md: extract any configurable session settings
- Verify EVERY setting extracted above has a corresponding row in the admin settings catalog schema
- Each setting must have: key, value, data_type (STRING/INT/BOOL), default_value, description

ADMIN-SPECIFIC CHECK B — Schema Integrity:
- No separate roles table in LMS DB (roles are in Keycloak — not stored in admin schema)
- Mandatory assignment rules are in Assignment Engine schema, NOT in admin settings

ADMIN-SPECIFIC CHECK C — Keycloak Role Management:
- Role assignment endpoint wraps Keycloak Admin API (no direct DB role changes)
- All admin endpoints require ADMIN role in APISIX config (no lower min_role)

Output your findings using the standard format from docs/code_generation/skills/01_module_audit.md Step 5.
```

---

## MODULE 4 — Training Management

```
You are performing a documentation sync audit for the AZ-LMS project.

STEP 0 — Read the master audit skill file first:
docs/code_generation/skills/01_module_audit.md

STEP 1 — Read ALL of the following files for this module:

FEATURE & ENGINEERING:
1. docs\requirements\02_features\03_training_management.md
2. docs\requirements\05_engineering\features\03_training_management\schema.md
3. docs\requirements\05_engineering\features\03_training_management\api.md
4. docs\requirements\05_engineering\er_diagram.md (Training Management section)
5. docs\requirements\05_engineering\00_apisix_routes.md (training routes)

ARCHITECTURE:
6. docs\requirements\04_architecture\01_architecture.md (Training Management section)
7. docs\requirements\04_architecture\03_modules.md (Training Management module section)
8. docs\requirements\04_architecture\04_integrations.md (OneDrive section)

UX:
9. docs\requirements\03_ux\01_ux_flows.md (training management flows)
10. docs\requirements\03_ux\02_screens.md (training screens)

PROTOTYPE:
11. prototype\admin-training.html
12. prototype\admin-training-resources.html
13. prototype\catalog.html
14. prototype\course-detail.html
15. prototype\my-training.html
16. prototype\certificate.html

All paths relative to:
c:\Users\jayesh.sanavada\OneDrive - Azilen Technologies Pvt. Ltd\Development\AZ-LMS\lms_rad\

STEP 2 — Run the standard checklist from docs/code_generation/skills/01_module_audit.md Step 4 (Checks 1–17).

STEP 3 — Run these MODULE-SPECIFIC checks in addition:

TRAINING-SPECIFIC CHECK A — Table Completeness:
- training_items table supports all 3 types: COURSE, LEARNING_PATH, CURRICULUM
- training_versions table exists for the versioning model
- training_structure_links table exists for hierarchy (Curriculum > LP > Course)
- training_prerequisites table exists
- training_resources table exists with all resource types (VIDEO, DOCUMENT, ASSESSMENT, LINK, SESSION)
- resource_files table exists for OneDrive file references
- training_completion_rules table exists
- All lifecycle states (DRAFT, REVIEW, PUBLISHED, ARCHIVED) appear in schema enum
- Certificates table exists with required fields

TRAINING-SPECIFIC CHECK B — OneDrive Integration:
- "OneDrive stores file content, LMS stores metadata only" is reflected in schema (no binary content columns)
- "Stream only, no download" rule is reflected in API (no download endpoint)

TRAINING-SPECIFIC CHECK C — Catalog Access:
- Catalog endpoints are accessible to authenticated employees (not Admin-only) in APISIX
- Catalog shows only PUBLISHED training to employees (no DRAFT/ARCHIVED visibility in employee API)

Output your findings using the standard format from docs/code_generation/skills/01_module_audit.md Step 5.
```

---

## MODULE 5 — Search

```
You are performing a documentation sync audit for the AZ-LMS project.

STEP 0 — Read the master audit skill file first:
docs/code_generation/skills/01_module_audit.md

STEP 1 — Read ALL of the following files for this module:

FEATURE & ENGINEERING:
1. docs\requirements\02_features\09_search.md
2. docs\requirements\05_engineering\features\09_search\schema.md
3. docs\requirements\05_engineering\features\09_search\api.md
4. docs\requirements\05_engineering\00_apisix_routes.md (search routes)

SOURCE TABLES (Search reads these — verify tsvector additions):
5. docs\requirements\05_engineering\features\03_training_management\schema.md
6. docs\requirements\05_engineering\features\02_user_management\schema.md
7. docs\requirements\05_engineering\features\05_sessions\schema.md

ARCHITECTURE:
8. docs\requirements\04_architecture\01_architecture.md (Search Module section)
9. docs\requirements\04_architecture\03_modules.md (Search module section)

UX:
10. docs\requirements\03_ux\01_ux_flows.md (search and catalog flows)
11. docs\requirements\03_ux\02_screens.md (search and catalog screens)

PROTOTYPE:
12. prototype\catalog.html

All paths relative to:
c:\Users\jayesh.sanavada\OneDrive - Azilen Technologies Pvt. Ltd\Development\AZ-LMS\lms_rad\

STEP 2 — Run the standard checklist from docs/code_generation/skills/01_module_audit.md Step 4 (Checks 1–17).

STEP 3 — Run these MODULE-SPECIFIC checks in addition:

SEARCH-SPECIFIC CHECK A — No-Table Ownership:
- Search module owns NO data tables (Check 5 from the standard skill — confirm explicitly)
- tsvector computed columns are additions to OTHER modules' tables — listed under Search's responsibility in schema.md
- "No external search engine (no Elasticsearch/Algolia)" is confirmed in architecture and schema

SEARCH-SPECIFIC CHECK B — Index Strategy:
- tsvector column + GIN index defined for training_items (title weight A, description weight B, category weight C)
- tsvector column + GIN index defined for users (full_name/email weight A, department/designation weight B)
- tsvector column + GIN index defined for sessions (title weight A, session_code weight A)
- text_pattern_ops B-tree index on training_items.title for typeahead prefix matching
- Verify NO use of physical_location in sessions search vector (column was removed in Module 5 — venue_id FK used instead; GENERATED ALWAYS AS STORED cannot reference joined tables)

SEARCH-SPECIFIC CHECK C — Federated Result Types:
- Global search endpoint returns results with result_type discriminator (training / session / user)
- User search results (result_type = "user") are restricted to Admin only in APISIX

Output your findings using the standard format from docs/code_generation/skills/01_module_audit.md Step 5.
```

---

## MODULE 6 — Assignment Engine

```
You are performing a documentation sync audit for the AZ-LMS project.

STEP 0 — Read the master audit skill file first:
docs/code_generation/skills/01_module_audit.md

STEP 1 — Read ALL of the following files for this module:

FEATURE & ENGINEERING:
1. docs\requirements\02_features\04_assignment_engine.md
2. docs\requirements\05_engineering\features\04_assignment_engine\schema.md
3. docs\requirements\05_engineering\features\04_assignment_engine\api.md
4. docs\requirements\05_engineering\er_diagram.md (Assignment Engine section)
5. docs\requirements\05_engineering\00_apisix_routes.md (assignment routes)

ARCHITECTURE:
6. docs\requirements\04_architecture\01_architecture.md (Assignment Engine section)
7. docs\requirements\04_architecture\03_modules.md (Assignment Engine module section)

ADMIN SETTINGS (verify configurable thresholds are in settings catalog):
8. docs\requirements\05_engineering\features\11_admin\schema.md

UX:
9. docs\requirements\03_ux\01_ux_flows.md (assignment and compliance flows)
10. docs\requirements\03_ux\02_screens.md (assignment and compliance screens)

PROTOTYPE:
11. prototype\compliance.html
12. prototype\approvals.html
13. prototype\team-assignments.html

All paths relative to:
c:\Users\jayesh.sanavada\OneDrive - Azilen Technologies Pvt. Ltd\Development\AZ-LMS\lms_rad\

STEP 2 — Run the standard checklist from docs/code_generation/skills/01_module_audit.md Step 4 (Checks 1–17).
Note: Check 7 (Admin Settings Cross-Check) applies to this module — verify the specific settings below.

STEP 3 — Run these MODULE-SPECIFIC checks in addition:

ASSIGNMENT-SPECIFIC CHECK A — Table Completeness:
- assignments table has all status values: PENDING_APPROVAL, APPROVED, REJECTED, IN_PROGRESS, COMPLETED, OVERDUE, CANCELLED
- mandatory_assignment_rules table exists with scope fields
- assignment_history table exists for full audit trail
- assignment_requests table exists for self-enrollment/approval workflow
- compliance_status table exists with states: PENDING, COMPLIANT, NON_COMPLIANT
- Probation gate flag (is_probation_gate) exists in both assignments and rules tables
- Due date and overdue escalation threshold fields exist

ASSIGNMENT-SPECIFIC CHECK B — Compliance Ownership:
- "Compliance is NOT a standalone module" confirmed — compliance_status owned by Assignment Engine
- "Approval workflow is part of Assignment Engine" confirmed — no separate approval module
- Compliance status READ endpoint exists for PES integration (correct auth plugin — client credentials)

ASSIGNMENT-SPECIFIC CHECK C — Admin Settings Verification:
- Overdue escalation threshold (manager notification) setting exists in admin settings schema
- Overdue escalation threshold (HR/Admin notification) setting exists in admin settings schema
- Approval expiry days setting exists in admin settings schema
- No threshold is hardcoded in assignment schema — all reference admin settings catalog

ASSIGNMENT-SPECIFIC CHECK D — Manager Scope:
- Manager derived from user_hierarchy (NOT from a Keycloak role) confirmed in API access rules
- Assignments are never hard-deleted (CANCELLED status only) — confirmed in schema and API

Output your findings using the standard format from docs/code_generation/skills/01_module_audit.md Step 5.
```

---

## MODULE 7 — Probation Management

```
You are performing a documentation sync audit for the AZ-LMS project.

STEP 0 — Read the master audit skill file first:
docs/code_generation/skills/01_module_audit.md

STEP 1 — Read ALL of the following files for this module:

FEATURE & ENGINEERING:
1. docs\requirements\02_features\12_probation_management.md
2. docs\requirements\05_engineering\features\12_probation\schema.md
3. docs\requirements\05_engineering\features\12_probation\api.md
4. docs\requirements\05_engineering\er_diagram.md (USER_PROBATION section)
5. docs\requirements\05_engineering\00_apisix_routes.md (probation routes)

CROSS-MODULE DEPENDENCY (Probation depends on probation gate assignments):
6. docs\requirements\05_engineering\features\04_assignment_engine\schema.md

ARCHITECTURE:
7. docs\requirements\04_architecture\01_architecture.md (any probation references)
8. docs\requirements\04_architecture\03_modules.md (Probation or User Management section)

UX:
9. docs\requirements\03_ux\01_ux_flows.md (probation flows)
10. docs\requirements\03_ux\02_screens.md (probation screens)

PROTOTYPE:
11. prototype\hr-probation.html

All paths relative to:
c:\Users\jayesh.sanavada\OneDrive - Azilen Technologies Pvt. Ltd\Development\AZ-LMS\lms_rad\

STEP 2 — Run the standard checklist from docs/code_generation/skills/01_module_audit.md Step 4 (Checks 1–17).
Note: Check 14 (Cross-Module Dependency) is critical for this module — verify the probation gate FK chain.

STEP 3 — Run these MODULE-SPECIFIC checks in addition:

PROBATION-SPECIFIC CHECK A — Table & Enum Completeness:
- user_probation table exists with all required fields: probation_status, probation_start_date, probation_end_date, extended_until, confirmed_at, confirmed_by
- Probation status enum has all values from feature spec (PROBATION, EXTENDED, CONFIRMED, FAILED)

PROBATION-SPECIFIC CHECK B — Cross-Module Gate Chain:
- is_probation_gate flag exists in the ASSIGNMENTS table (Assignment Engine schema — file #6)
- Probation gate assignments are auto-created by Assignment Engine (not Probation module)
- "All probation gate trainings COMPLIANT" is what drives probation confirmation — verify this logic is in the feature spec and API, not duplicated in a separate compliance check
- compliance_status table (owned by Assignment Engine) is what the Probation module reads for confirmation — verify this dependency is one-directional (read only)

PROBATION-SPECIFIC CHECK C — Module Ownership Clarity:
- Confirm which module owns the user_probation table — User Management or Probation module — and that modules.md, schema.md, and er_diagram.md all agree

Output your findings using the standard format from docs/code_generation/skills/01_module_audit.md Step 5.
```

---

## MODULE 8 — Sessions

```
You are performing a documentation sync audit for the AZ-LMS project.

STEP 0 — Read the master audit skill file first:
docs/code_generation/skills/01_module_audit.md

STEP 1 — Read ALL of the following files for this module:

FEATURE & ENGINEERING:
1. docs\requirements\02_features\05_sessions.md
2. docs\requirements\05_engineering\features\05_sessions\schema.md
3. docs\requirements\05_engineering\features\05_sessions\api.md
4. docs\requirements\05_engineering\er_diagram.md (Sessions section)
5. docs\requirements\05_engineering\00_apisix_routes.md (sessions routes)

ARCHITECTURE:
6. docs\requirements\04_architecture\01_architecture.md (Session Management section)
7. docs\requirements\04_architecture\03_modules.md (Sessions module section)
8. docs\requirements\04_architecture\04_integrations.md (Microsoft Teams section)

ADMIN SETTINGS:
9. docs\requirements\05_engineering\features\11_admin\schema.md

UX:
10. docs\requirements\03_ux\01_ux_flows.md (session flows)
11. docs\requirements\03_ux\02_screens.md (session screens)

PROTOTYPE:
12. prototype\admin-sessions.html
13. prototype\sessions.html
14. prototype\session-detail.html

All paths relative to:
c:\Users\jayesh.sanavada\OneDrive - Azilen Technologies Pvt. Ltd\Development\AZ-LMS\lms_rad\

STEP 2 — Run the standard checklist from docs/code_generation/skills/01_module_audit.md Step 4 (Checks 1–17).
Note: Check 7 (Admin Settings Cross-Check) applies — verify session reminder settings below.

STEP 3 — Run these MODULE-SPECIFIC checks in addition:

SESSIONS-SPECIFIC CHECK A — Hybrid-Only Enforcement:
- "All sessions are HYBRID" is reflected in schema — NO session_type column exists
- sessions table uses venue_id FK → session_venues (NOT a physical_location text column — that was removed)
- teams_link_status enum values (AUTO_CREATED, MANUAL, PENDING_MANUAL) match feature spec
- Admin session editor screen has NO Session Type dropdown in prototype

SESSIONS-SPECIFIC CHECK B — Teams Integration:
- Teams meeting creation on session save is described in feature spec and integrations doc
- Teams attendance pull after session end matches integration architecture
- teams_meeting_link and teams_meeting_id columns exist in sessions schema
- Excel attendance import endpoint and template download endpoint both exist

SESSIONS-SPECIFIC CHECK C — Nomination Workflow:
- Session nomination endpoints exist (nominate, cancel nomination, decide nomination)
- SESSION_NOMINATED, SESSION_NOMINATION_CANCELLED, SESSION_NOMINATION_DECIDED are in the feature spec event list
- Nomination status (NOMINATED) exists in session_participants participant_status enum

SESSIONS-SPECIFIC CHECK D — Admin Settings Verification:
- Session reminder hours (first) setting exists in admin settings schema
- Session reminder hours (second) setting exists in admin settings schema

Output your findings using the standard format from docs/code_generation/skills/01_module_audit.md Step 5.
```

---

## MODULE 9 — Notifications

```
You are performing a documentation sync audit for the AZ-LMS project.

STEP 0 — Read the master audit skill file first:
docs/code_generation/skills/01_module_audit.md

STEP 1 — Read ALL of the following files for this module:

FEATURE & ENGINEERING:
1. docs\requirements\02_features\06_notifications.md
2. docs\requirements\05_engineering\features\06_notifications\schema.md
3. docs\requirements\05_engineering\features\06_notifications\api.md
4. docs\requirements\05_engineering\er_diagram.md (Notifications section)
5. docs\requirements\05_engineering\00_apisix_routes.md (notification routes)

ARCHITECTURE:
6. docs\requirements\04_architecture\01_architecture.md (Notification Module section)
7. docs\requirements\04_architecture\03_modules.md (Notifications module section)

ADMIN SETTINGS:
8. docs\requirements\05_engineering\features\11_admin\schema.md

UX:
9. docs\requirements\03_ux\01_ux_flows.md (notification flows)
10. docs\requirements\03_ux\02_screens.md (notification screens)

PROTOTYPE:
11. prototype\notifications.html

All paths relative to:
c:\Users\jayesh.sanavada\OneDrive - Azilen Technologies Pvt. Ltd\Development\AZ-LMS\lms_rad\

STEP 2 — Run the standard checklist from docs/code_generation/skills/01_module_audit.md Step 4 (Checks 1–17).
Note: Check 7 (Admin Settings) and Check 16 (Notification Event Coverage) both apply to this module.

STEP 3 — Run these MODULE-SPECIFIC checks in addition:

NOTIFICATIONS-SPECIFIC CHECK A — Table Completeness:
- notifications table (or notification_events) has all required fields including idempotency key
- notification_delivery_log table exists with channel (IN_APP, EMAIL) and delivery_status
- notification_preferences table exists if feature spec mentions user preferences
- Mandatory vs non-mandatory notification distinction is capturable in schema
- No direct notification CREATE endpoint — notifications are system-emitted only

NOTIFICATIONS-SPECIFIC CHECK B — Admin Settings Verification:
- Notification due date reminder days setting exists in admin settings schema
- Session reminder hours (first) setting exists in admin settings schema
- Session reminder hours (second) setting exists in admin settings schema
- Notification retention days setting exists in admin settings schema

NOTIFICATIONS-SPECIFIC CHECK C — Architecture Consistency:
- "All notifications async" is confirmed in schema (no synchronous write path)
- Idempotency key format matches the feature spec description
- Mandatory events bypass user notification preferences — confirmed in feature spec and schema logic

NOTIFICATIONS-SPECIFIC CHECK D — Event Coverage (Check 16 from skill):
Run Check 16 from docs/code_generation/skills/01_module_audit.md:
- Read ALL feature spec files to extract every notification trigger
- Verify each trigger has a corresponding event_code in 06_notifications.md event catalog
- Produce the coverage table; flag missing event codes

Output your findings using the standard format from docs/code_generation/skills/01_module_audit.md Step 5.
Include the notification event coverage table from Check 16.
```

---

## MODULE 10 — Audit

```
You are performing a documentation sync audit for the AZ-LMS project.

STEP 0 — Read the master audit skill file first:
docs/code_generation/skills/01_module_audit.md

STEP 1 — Read ALL of the following files for this module:

FEATURE & ENGINEERING:
1. docs\requirements\02_features\08_audit.md
2. docs\requirements\05_engineering\features\08_audit\schema.md
3. docs\requirements\05_engineering\features\08_audit\api.md
4. docs\requirements\05_engineering\er_diagram.md (Audit section)
5. docs\requirements\05_engineering\00_apisix_routes.md (audit routes)

ARCHITECTURE:
6. docs\requirements\04_architecture\01_architecture.md (Audit section)
7. docs\requirements\04_architecture\03_modules.md (Audit module section)

ALL FEATURE SPECS (to extract audit events they emit):
8.  docs\requirements\02_features\01_authentication.md
9.  docs\requirements\02_features\02_user_management.md
10. docs\requirements\02_features\03_training_management.md
11. docs\requirements\02_features\04_assignment_engine.md
12. docs\requirements\02_features\05_sessions.md
13. docs\requirements\02_features\06_notifications.md
14. docs\requirements\02_features\11_admin.md
15. docs\requirements\02_features\12_probation_management.md

UX:
16. docs\requirements\03_ux\01_ux_flows.md (audit flows)
17. docs\requirements\03_ux\02_screens.md (audit screens)

PROTOTYPE:
18. prototype\audit-logs.html

All paths relative to:
c:\Users\jayesh.sanavada\OneDrive - Azilen Technologies Pvt. Ltd\Development\AZ-LMS\lms_rad\

STEP 2 — Run the standard checklist from docs/code_generation/skills/01_module_audit.md Step 4 (Checks 1–17).
Note: Check 15 (Audit Event Coverage) is the primary check for this module — it is CRITICAL.

STEP 3 — Run these MODULE-SPECIFIC checks in addition:

AUDIT-SPECIFIC CHECK A — Schema Immutability:
- audit_logs table is INSERT-only — schema business rules explicitly prohibit UPDATE and DELETE
- 5-year retention policy is captured in schema (legal_hold flag + purge job reference)
- audit_write_failures dead-letter table exists with retry tracking fields
- audit_export_jobs table exists separate from report_exports
- No FK constraint on entity_id — audit records must outlive referenced entities

AUDIT-SPECIFIC CHECK B — Event Coverage (Check 15 from skill) — CRITICAL:
Run Check 15 from docs/code_generation/skills/01_module_audit.md:
- Read ALL feature spec files listed above (files 8–15)
- Extract EVERY event_code mentioned in any feature spec
- Verify each event_code is in the 08_audit.md event catalog
- Produce the full coverage table: | event_code | Source Feature Spec | Documented in audit.md? |
- Flag EVERY missing event_code as a REAL GAP

AUDIT-SPECIFIC CHECK C — API Write Restriction:
- NO write endpoints exist in audit API (audit_logs is system-created only)
- Admin can trigger retry of failed writes (via audit_write_failures API), but not create or modify audit_logs

AUDIT-SPECIFIC CHECK D — Access Control:
- Admin has full ORG_WIDE access to all event types
- HR has access restricted to compliance-relevant event types only
- Manager has TEAM_ONLY access to assignment/approval/session events for direct reports only
- Employee has NO access — verify APISIX routes enforce this

Output your findings using the standard format from docs/code_generation/skills/01_module_audit.md Step 5.
Include the audit event coverage table from Check 15.
```

---

## MODULE 11 — Reporting

```
You are performing a documentation sync audit for the AZ-LMS project.

STEP 0 — Read the master audit skill file first:
docs/code_generation/skills/01_module_audit.md

STEP 1 — Read ALL of the following files for this module:

FEATURE & ENGINEERING:
1. docs\requirements\02_features\07_reporting.md
2. docs\requirements\05_engineering\features\07_reporting\schema.md
3. docs\requirements\05_engineering\features\07_reporting\api.md
4. docs\requirements\05_engineering\00_apisix_routes.md (reporting routes)

ARCHITECTURE:
5. docs\requirements\04_architecture\01_architecture.md (Reporting section)
6. docs\requirements\04_architecture\03_modules.md (Reporting module section)
7. docs\requirements\04_architecture\02_nfr.md (performance NFRs for reports)

UX:
8. docs\requirements\03_ux\01_ux_flows.md (reporting flows)
9. docs\requirements\03_ux\02_screens.md (reporting screens)

PROTOTYPE:
10. prototype\reports.html

All paths relative to:
c:\Users\jayesh.sanavada\OneDrive - Azilen Technologies Pvt. Ltd\Development\AZ-LMS\lms_rad\

STEP 2 — Run the standard checklist from docs/code_generation/skills/01_module_audit.md Step 4 (Checks 1–17).

STEP 3 — Run these MODULE-SPECIFIC checks in addition:

REPORTING-SPECIFIC CHECK A — No Domain Data Ownership:
- Reporting module owns NO domain data — only report_exports and reporting_snapshots tables
- All report data is read from other modules' tables (training_items, assignments, sessions, users)
- Background/export job table ownership is clarified in modules.md

REPORTING-SPECIFIC CHECK B — NFR Compliance:
- Pagination exists on all report list endpoints (from 02_nfr.md performance requirements)
- Large report exports follow async pattern (POST to start → GET to poll → GET to download)
- Response time considerations reflected: async export for large datasets

REPORTING-SPECIFIC CHECK C — Filter Accuracy:
- Session Attendance Report uses facilitator_id as filter (NOT instructor_id — instructor is not the correct Sessions module field name)
- All filter parameters in report APIs match actual column names in source module schemas
- BU Head / Department filters exist where feature spec mentions them

REPORTING-SPECIFIC CHECK D — APISIX Role Access:
- Manager report endpoints return TEAM_ONLY data — not ORG_WIDE — confirm via API and APISIX
- HR report endpoints are accessible to HR role (not HR-only to the exclusion of Manager — verify min_role settings are correct)
- Compliance report endpoints should NOT have min_role=HR if managers need them too

Output your findings using the standard format from docs/code_generation/skills/01_module_audit.md Step 5.
```

---

## MODULE 12 — Integrations

```
You are performing a documentation sync audit for the AZ-LMS project.

NOTE: This module's primary spec is 04_integrations.md (architecture), NOT a feature spec.
The standard checklist's "Feature Spec → Schema" and "Feature Spec → API" checks should use
04_integrations.md as the authoritative source instead of a 02_features/ file.

STEP 0 — Read the master audit skill file first:
docs/code_generation/skills/01_module_audit.md

STEP 1 — Read ALL of the following files for this module:

FEATURE & ENGINEERING:
1. docs\requirements\05_engineering\features\10_integrations\schema.md
2. docs\requirements\05_engineering\features\10_integrations\api.md
3. docs\requirements\05_engineering\00_apisix_routes.md (integration routes, PES routes)

ARCHITECTURE (PRIMARY SPEC for this module):
4. docs\requirements\04_architecture\04_integrations.md
5. docs\requirements\04_architecture\01_architecture.md (Integration section)
6. docs\requirements\04_architecture\03_modules.md (Integration module section)

UX:
7. docs\requirements\03_ux\01_ux_flows.md (integration/admin flows)
8. docs\requirements\03_ux\02_screens.md (integration monitoring screens)

PROTOTYPE:
9. prototype\admin-integrations.html

All paths relative to:
c:\Users\jayesh.sanavada\OneDrive - Azilen Technologies Pvt. Ltd\Development\AZ-LMS\lms_rad\

STEP 2 — Run the standard checklist from docs/code_generation/skills/01_module_audit.md Step 4 (Checks 1–17).
For this module, use 04_integrations.md as the "feature spec" equivalent in Checks 1–3.

STEP 3 — Run these MODULE-SPECIFIC checks in addition:

INTEGRATIONS-SPECIFIC CHECK A — Schema Completeness:
- integration_jobs table exists with job_type, job_status, started_at, completed_at
- integration_job_logs table exists for per-record sync logs
- Integration health status tracking table exists
- Schema covers all 6 integrations: Zoho HR, Employee DB, Keycloak, PES, Teams, OneDrive
- Retry tracking fields exist (retry_count, last_error, next_retry_at or equivalent)

INTEGRATIONS-SPECIFIC CHECK B — PES Route Security (CRITICAL):
- PES compliance routes have a SEPARATE route group in APISIX with client credentials validation (NOT standard JWT)
- PES rate limiting is defined in APISIX (default 100 req/min per architecture doc)
- IP allowlist for PES is referenced in APISIX config if architecture doc mentions it
- Sync trigger routes (Zoho, Employee DB) are Admin-only in APISIX

INTEGRATIONS-SPECIFIC CHECK C — Retry Policy:
- Architecture doc defines retry policies per integration — verify each is reflected in schema fields
- Admin notification on integration failure covers all 6 integrations
- Failed sync record tracking exists (records that failed to sync, not just job-level failure)

Output your findings using the standard format from docs/code_generation/skills/01_module_audit.md Step 5.
```

---

## MODULE 13 — Dashboards (Cross-Module)

```
You are performing a documentation sync audit for the AZ-LMS project.

NOTE: Dashboards have no schema or API of their own — this audit is purely a UX/prototype
consistency check against the feature specs that supply dashboard data.

STEP 0 — Read the master audit skill file first:
docs/code_generation/skills/01_module_audit.md

STEP 1 — Read ALL of the following files for this module:

FEATURE SPECS (dashboards pull from all modules):
1. docs\requirements\02_features\03_training_management.md
2. docs\requirements\02_features\04_assignment_engine.md
3. docs\requirements\02_features\05_sessions.md
4. docs\requirements\02_features\07_reporting.md
5. docs\requirements\02_features\12_probation_management.md

UX:
6. docs\requirements\03_ux\01_ux_flows.md (dashboard and post-login flows)
7. docs\requirements\03_ux\02_screens.md (dashboard screens for all 4 roles)

PROTOTYPE:
8. prototype\dashboard-admin.html
9. prototype\dashboard-employee.html
10. prototype\dashboard-hr.html
11. prototype\dashboard-manager.html

All paths relative to:
c:\Users\jayesh.sanavada\OneDrive - Azilen Technologies Pvt. Ltd\Development\AZ-LMS\lms_rad\

STEP 2 — For this module, skip the schema/API/APISIX checks (no schema or API owned).
Run only these checks from docs/code_generation/skills/01_module_audit.md Step 4:
- Check 8 (UX Flows vs Feature Spec)
- Check 9 (UX Flows vs Screens)
- Check 10 (Screens vs Feature Spec)
- Check 13 (Prototype → Screens & UX Flows)

STEP 3 — Run these MODULE-SPECIFIC checks in addition:

DASHBOARD-SPECIFIC CHECK A — Widget vs Feature Spec:
- Admin dashboard widgets reference data from correct feature modules
- Employee dashboard: my assignments, compliance status, upcoming sessions match feature specs
- HR dashboard: org-wide compliance, probation stats match feature specs
- Manager dashboard: team compliance, team assignments match feature specs

DASHBOARD-SPECIFIC CHECK B — Post-Login Routing:
- Post-login destination per role in each dashboard prototype matches 01_ux_flows.md
- Navigation FROM dashboards to other screens matches UX flow paths
- Quick action links on each dashboard follow valid UX flow paths

DASHBOARD-SPECIFIC CHECK C — Role Isolation:
- Each dashboard prototype shows ONLY data appropriate for that role
- Admin dashboard does NOT show employee-only content
- Employee dashboard does NOT show admin controls or other users' data
- Manager dashboard shows team data filtered to direct reports only (not org-wide)

Output your findings using the standard format from docs/code_generation/skills/01_module_audit.md Step 5.
```

---

## MODULE 14 — Final Cross-Cutting Audit

Run this LAST, after all 13 module prompts are complete and their gaps are fixed.

```
You are performing the final cross-cutting documentation sync audit for the AZ-LMS project.

STEP 0 — Read the master audit skill file first:
docs/code_generation/skills/01_module_audit.md

Read Step 6 (Final Cross-Cutting Audit) — that is the complete checklist for this session.
All 10 cross-checks are defined there. Execute all 10.

STEP 1 — Read ALL of the following files:

ENGINEERING:
1. docs\requirements\05_engineering\er_diagram.md
2. docs\requirements\05_engineering\00_apisix_routes.md

ARCHITECTURE:
3. docs\requirements\04_architecture\01_architecture.md
4. docs\requirements\04_architecture\02_nfr.md
5. docs\requirements\04_architecture\03_modules.md
6. docs\requirements\04_architecture\04_integrations.md

ALL FEATURE SPECS:
7.  docs\requirements\02_features\01_authentication.md
8.  docs\requirements\02_features\02_user_management.md
9.  docs\requirements\02_features\03_training_management.md
10. docs\requirements\02_features\04_assignment_engine.md
11. docs\requirements\02_features\05_sessions.md
12. docs\requirements\02_features\06_notifications.md
13. docs\requirements\02_features\07_reporting.md
14. docs\requirements\02_features\08_audit.md
15. docs\requirements\02_features\09_search.md
16. docs\requirements\02_features\11_admin.md
17. docs\requirements\02_features\12_probation_management.md

UX:
18. docs\requirements\03_ux\01_ux_flows.md
19. docs\requirements\03_ux\02_screens.md

All paths relative to:
c:\Users\jayesh.sanavada\OneDrive - Azilen Technologies Pvt. Ltd\Development\AZ-LMS\lms_rad\

STEP 2 — Execute ALL 10 cross-checks from docs/code_generation/skills/01_module_audit.md Step 6.

Output format:

## Final Cross-Cutting Audit Report

### CROSS-CHECK 1 — ER Diagram Completeness
(tables confirmed, missing tables, orphaned tables, FK mismatches)

### CROSS-CHECK 2 — APISIX Routes Completeness
(confirmed routes, missing routes, orphaned routes)

### CROSS-CHECK 3 — Module Ownership Consistency
(confirmed ownership, mismatches)

### CROSS-CHECK 4 — Audit Event Coverage
| event_code | Source Module | In audit.md? |
|---|---|---|
(list all events found)

### CROSS-CHECK 5 — Notification Event Coverage
(covered notifications, missing notifications)

### CROSS-CHECK 6 — Cross-Module FK Consistency
(confirmed FKs, broken FKs)

### CROSS-CHECK 7 — NFR Compliance
(compliant items, violations)

### CROSS-CHECK 8 — UX Flows vs Screens Completeness
(confirmed, orphaned screens, broken references)

### CROSS-CHECK 9 — Prototype Coverage
| Screen (screens.md) | Prototype HTML | Status |
|---|---|---|

### CROSS-CHECK 10 — Admin Settings Completeness
| Setting | Referenced In | In Admin Schema? |
|---|---|---|

### OVERALL SUMMARY
Total cross-checks: 10
Confirmed consistent: X
Minor mismatches: Y
Real gaps to fix: Z

### PRIORITY FIX LIST
(Ordered by severity — highest impact first)
1.
2.
...
```

---

## MODULE 15 — Technical Infrastructure Audit

Run this LAST — after Module 14 (Final) is complete and all gaps are fixed.
This audit does NOT re-check feature content (that is Module 14's job).
It verifies that the AI workflow files themselves are internally consistent and ready for code generation.

```
You are performing the Technical Infrastructure Audit for the AZ-LMS project.

This audit checks that the AI workflow files (skills, module index, code generation plan,
engineering infrastructure docs) are internally consistent and that every file they reference
actually exists on disk. A broken file reference here will cause silent failures during code
generation — an AI will either hallucinate content or skip required context entirely.

Read ALL of the following files before performing any checks:

WORKFLOW FILES:
1. docs\AI_CONTEXT.md
2. docs\code_generation\skills\03_module_file_index.md
3. docs\code_generation\skills\01_module_audit.md
4. docs\code_generation\skills\02_code_generation.md
5. docs\code_generation\planning\code_generation_plan.md

ENGINEERING INFRASTRUCTURE:
6. docs\requirements\05_engineering\01_tech_stack.md
7. docs\requirements\05_engineering\02_project_scaffold.md
8. docs\requirements\05_engineering\03_coding_conventions.md

All paths relative to:
c:\Users\jayesh.sanavada\OneDrive - Azilen Technologies Pvt. Ltd\Development\AZ-LMS\lms_rad\

NOTE: Do NOT re-check feature spec vs schema vs API alignment — that is covered by Modules 1–14.
Focus only on the checks below.

---

CHECK 1 — File Existence (from 03_module_file_index.md)

For every file path listed in 03_module_file_index.md, verify the file exists on disk.
In addition, verify these files referenced directly by code_generation_plan.md:
- prototype\index.html
- prototype\css\styles.css

For each file: PASS (exists) or FAIL (missing).
A missing file is 🔴 Critical — code generation prompts that reference it will silently
use stale or hallucinated content.

Produce a table:
| File Path | Referenced In | Exists? | Severity |
|---|---|---|---|

---

CHECK 2 — Module Index Completeness

Compare:
- The Module File Map table in docs\AI_CONTEXT.md  (lists all modules + their file paths)
- The module sections in docs\code_generation\skills\03_module_file_index.md

Verify:
- Every module in AI_CONTEXT.md Module File Map has a corresponding section in 03_module_file_index.md
- Every module section in 03_module_file_index.md has a corresponding entry in AI_CONTEXT.md
- The file paths listed for each module in AI_CONTEXT.md match what 03_module_file_index.md lists
  for the same module (no renamed or missing paths between the two)

Flag any module present in one file but absent from the other as 🔴 Critical.
Flag any file path that differs between the two files as 🟡 Warning.

---

CHECK 3 — Engineering Docs Internal Alignment (Tech Stack vs Scaffold)

Read 01_tech_stack.md and 02_project_scaffold.md together.

Verify:
- Every major library/framework in 01_tech_stack.md (FastAPI, SQLAlchemy, React, Ant Design, etc.)
  has a corresponding folder, config file, or dependency entry defined in 02_project_scaffold.md
- No library version in 01_tech_stack.md conflicts with a version constraint mentioned in
  02_project_scaffold.md
- The backend folder structure in 02_project_scaffold.md follows the DDD Modular Monolith pattern
  described in AI_CONTEXT.md (module boundaries, no cross-module imports)
- Frontend folder structure follows the React + TypeScript conventions described in AI_CONTEXT.md

Flag mismatches between tech stack and scaffold as 🟡 Warning.
Flag any DDD boundary violation in the scaffold structure as 🔴 Critical.

---

CHECK 4 — Coding Conventions vs AI_CONTEXT.md Key Decisions

Read 03_coding_conventions.md and the Key Decisions table in AI_CONTEXT.md.

For each key decision in AI_CONTEXT.md, verify it is reflected consistently in 03_coding_conventions.md:

| Key Decision | AI_CONTEXT.md Says | Conventions Says | Match? |
|---|---|---|---|
| PK type | UUID v4 everywhere | | |
| Token storage | Memory only — never localStorage | | |
| Hard deletes | Never — use soft delete / CANCELLED status | | |
| Audit writes | Always async — never block main operation | | |
| Manager scope | user_hierarchy table — NOT a Keycloak role | | |
| Compliance owner | Assignment Engine only — not standalone | | |
| File storage | OneDrive only — LMS stores metadata only | | |
| Export formats | Excel (.xlsx) and PDF only — no CSV | | |

Flag any convention that contradicts a key decision as 🔴 Critical.
Flag any key decision with no corresponding guidance in conventions as 🟡 Warning.

---

CHECK 5 — Skills Files vs AI_CONTEXT.md Key Decisions

Read 01_module_audit.md and 02_code_generation.md (the pre-code architecture checklists).

Verify that the backend and frontend checklists in 02_code_generation.md still reflect
the current key decisions in AI_CONTEXT.md:

- "All PKs are UUID v4" in checklist ↔ UUID PK decision in AI_CONTEXT.md
- "No hard deletes" in checklist ↔ soft delete decision in AI_CONTEXT.md
- "All state-changing operations emit an audit event (async)" ↔ async audit decision
- "JWT stored in memory only" in checklist ↔ token storage decision
- "Manager scope validated via user_hierarchy table" in checklist ↔ manager decision
- "Compliance logic is ONLY in Assignment Engine" in checklist ↔ compliance owner decision
- "No Phase 2 features implemented" in checklist ↔ Phase 2 restrictions in AI_CONTEXT.md

Also verify: 01_module_audit.md Step 2 still correctly points to 03_module_file_index.md
and 02_code_generation.md Step 2 still correctly points to 03_module_file_index.md.

Flag any checklist item that contradicts a key decision as 🔴 Critical.
Flag any key decision with no checklist item enforcing it as 🟡 Warning.

---

CHECK 6 — Code Generation Plan Soundness

Read docs\code_generation\planning\code_generation_plan.md.

Verify:
- Every task prompt that says "read docs/code_generation/skills/03_module_file_index.md → MODULE XX" has that
  module (MODULE XX) actually defined in 03_module_file_index.md
- Every task prompt that directly references a skill file (02_code_generation.md) — that skill
  file exists on disk (already confirmed in Check 1, just flag here if not)
- Phase dependencies in the Progress Tracker are logically ordered:
  no task lists a dependency on a task with a HIGHER phase number
- Phase 2 items listed in AI_CONTEXT.md do NOT appear as tasks in the plan
  (SCORM, CSV export, waitlist, RSVP, impersonation, custom cert templates, migration, etc.)

Flag any module reference in a task prompt that has no corresponding section in
03_module_file_index.md as 🔴 Critical.
Flag any Phase 2 item found in the plan as 🔴 Critical.
Flag any illogical dependency ordering as 🟡 Warning.

---

Output format:

## Module 15: Technical Infrastructure Audit

### CHECK 1 — File Existence
| File Path | Referenced In | Exists? | Severity |
|---|---|---|---|
(one row per file)

**Missing files (action required):**
(list or "None — all files exist")

### CHECK 2 — Module Index Completeness
**Modules in AI_CONTEXT.md but missing from 03_module_file_index.md:** (list or "None")
**Modules in 03_module_file_index.md but missing from AI_CONTEXT.md:** (list or "None")
**File path mismatches between the two files:** (list or "None")

### CHECK 3 — Engineering Docs Internal Alignment
**Libraries in tech stack with no scaffold home:** (list or "None")
**Version conflicts between tech stack and scaffold:** (list or "None")
**DDD boundary violations in scaffold structure:** (list or "None")

### CHECK 4 — Coding Conventions vs Key Decisions
| Key Decision | AI_CONTEXT.md Says | Conventions Says | Match? |
|---|---|---|---|

**Contradictions found:** (list or "None")
**Key decisions with no convention coverage:** (list or "None")

### CHECK 5 — Skills Files vs Key Decisions
**Checklist items contradicting key decisions:** (list or "None")
**Key decisions with no checklist enforcement:** (list or "None")
**Broken skill file cross-references:** (list or "None")

### CHECK 6 — Code Generation Plan Soundness
**Task prompts referencing undefined modules:** (list or "None")
**Phase 2 items found in plan:** (list or "None")
**Illogical dependency ordering:** (list or "None")

### SUMMARY
Confirmed consistent: X
Minor mismatches (🟡): Y
Critical gaps (🔴): Z

### PRIORITY FIX LIST
(Ordered by severity — fix all 🔴 before starting any code generation task)
1.
2.
...
```

---
