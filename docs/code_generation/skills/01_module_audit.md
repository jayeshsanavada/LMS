# SKILL: AZ-LMS Module Sync Audit

---

## About This File

| Field | Detail |
|---|---|
| **Purpose** | Enforces a structured, step-by-step documentation sync audit for ONE module at a time. Checks that the feature spec, DB schema, API contract, UX flows, screens, architecture, and prototypes are fully consistent with each other — before any code is generated. |
| **When to Use** | Before writing any code for a module. Run this audit to find discrepancies early so they don't become bugs in generated code. Also invoked by `03_sync_audit_prompts.md` — each module prompt runs this skill's checklist as the standard base. |
| **How to Use** | Paste the invocation command below into a new AI conversation. Specify the module name. The AI will follow every step in order. |
| **Used By Agents?** | Yes — the `auditor.md` Claude Code agent follows the same process automatically when you describe an audit task in Claude Code. For Antigravity or other tools, invoke this skill manually. |
| **Output** | A structured audit report: list of discrepancies (with severity), confirmed alignments, and recommended fixes. |
| **One Rule** | ONE module per conversation. Never audit multiple modules in one session — context drift leads to missed discrepancies. |
| **Related Files** | `docs/prompts/03_sync_audit_prompts.md` — per-module prompts that invoke this skill. `docs/code_generation/skills/03_module_file_index.md` — file index used in Step 2. |

---

## How to Invoke

**In Antigravity / ChatGPT / any AI tool:**
> *"Read and execute the skill at `docs/code_generation/skills/01_module_audit.md`. Today's module: [MODULE NAME]"*

**In Claude Code:**
> Claude Code will use `.claude/agents/auditor.md` automatically — but you can still reference this file for the detailed checklist.

**Via module-specific prompts:**
> See `docs/prompts/03_sync_audit_prompts.md` — each module prompt specifies the exact files to read and any module-specific checks on top of this skill's standard checklist.

---

## STEP 1 — Read Master Context

Read completely before anything else:
```
docs/AI_CONTEXT.md
```
Confirm: you understand the module boundary rules, source-of-truth priority, and Phase 2 restrictions.

---

## STEP 2 — Look Up the Module's Required Files

Open:
```
docs/code_generation/skills/03_module_file_index.md
```
Find the section for today's module. Note every file listed — you will read ALL of them.

---

## STEP 3 — Read ALL Source Files for the Module

Read every file from the index. Rules:
- If a file is > 800 lines → read in multiple passes using StartLine + EndLine
- Do NOT skip any file
- After each file, note in one sentence what you learned

Files span ALL of these folders:
- `docs/requirements/02_features/` — business rules (authoritative)
- `docs/requirements/03_ux/01_ux_flows.md` — user flows
- `docs/requirements/03_ux/02_screens.md` — screen definitions
- `docs/requirements/04_architecture/01_architecture.md` — system architecture
- `docs/requirements/04_architecture/03_modules.md` — module boundaries and ownership
- `docs/requirements/04_architecture/04_integrations.md` — integration details (where relevant)
- `docs/requirements/05_engineering/features/[XX]/api.md` — API contracts
- `docs/requirements/05_engineering/features/[XX]/schema.md` — DB schema
- `docs/requirements/05_engineering/er_diagram.md` — relevant section for this module
- `docs/requirements/05_engineering/00_apisix_routes.md` — relevant routes for this module
- `prototype/[file].html` — prototype HTML file(s) for this module (check `03_module_file_index.md` for the correct filename)

Confirm before proceeding:
> "I have read all [N] files for module: [MODULE NAME]. Files: [list them]"

> **Minimum expected file count:** feature spec (1) + api.md (1) + schema.md (1) + architecture/modules.md (1) + ux flows section (1) + screens section (1) + er_diagram section (1) + apisix routes section (1) + prototype HTML (1+) = at least 9 files. If you have fewer than 9, you have skipped something.

---

## STEP 4 — Run the Sync Audit Checklist

Check ALL of the following. For each item that fails, record it in the discrepancy table.

---

### CHECK 1 — Feature Spec → API Alignment
- [ ] Every workflow step in the feature spec has a corresponding API endpoint
- [ ] Every business rule (BR-XX) has enforcement in at least one endpoint
- [ ] Every error code mentioned in the spec is defined in `api.md`
- [ ] Every audit event listed in the spec exists in `api.md` or `schema.md`
- [ ] Every status value / enum in the spec is covered by an endpoint's request or response
- [ ] Actor access rules in the feature spec match the Access Control section in `api.md`

---

### CHECK 2 — Feature Spec → Schema Alignment
- [ ] Every entity mentioned in the spec has a table in `schema.md`
- [ ] Every field referenced in the spec has a column in the correct table
- [ ] Every enum value (e.g. status, type) in the spec appears in the schema constraint
- [ ] Every FK relationship implied by the spec is defined in the schema

---

### CHECK 3 — API → Schema Alignment
- [ ] Every request body field maps to a real schema column (no invented fields)
- [ ] Every response field maps to a real schema column (no ghost fields)
- [ ] No tables exist in schema that aren't referenced by any API endpoint
- [ ] Pagination responses match schema (total count, page, page_size)
- [ ] Enum values in API request/response match enum values in schema exactly

---

### CHECK 4 — Schema → ER Diagram Alignment
- [ ] Every table in `schema.md` appears in `er_diagram.md` (relevant section)
- [ ] Every FK relationship in `schema.md` matches the relationship shown in `er_diagram.md`
- [ ] No table in `er_diagram.md` for this module is missing from `schema.md`
- [ ] FK column names in ER diagram match actual column names in schema

---

### CHECK 5 — Module Ownership vs modules.md
- [ ] Tables defined in `schema.md` match what `03_modules.md` says this module owns
- [ ] Responsibilities in the feature spec match what `03_modules.md` lists for this module
- [ ] No table claimed by this module is also claimed by another module
- [ ] No cross-module table writes — this module does not write to other modules' tables

---

### CHECK 6 — Architecture & Integration Alignment
- [ ] Feature spec is consistent with the module's description in `01_architecture.md`
- [ ] Any integration described in the feature spec matches `04_integrations.md`
- [ ] Manager scope always uses `user_hierarchy` table — never derived from a Keycloak role
- [ ] Module-specific architectural constraints (e.g. "stream only, no download") are reflected in schema and API
- [ ] Any external service dependency (Teams, OneDrive, Zoho, Employee DB) is consistent across feature spec, architecture, and schema

---

### CHECK 7 — Admin Settings Cross-Check
*(Skip if this module has no configurable settings)*

- [ ] Every configurable threshold in the feature spec (escalation days, reminder hours, approval expiry, retention days, etc.) has a corresponding key in the Admin settings catalog (`11_admin/schema.md`)
- [ ] No threshold is hardcoded in `schema.md` or `api.md` that should be in the settings catalog
- [ ] Setting key names referenced in the module's code comments or schema notes match the actual keys in Admin schema

---

### CHECK 8 — UX Flows vs Feature Spec
- [ ] Every workflow in the feature spec has a corresponding flow in `01_ux_flows.md`
- [ ] The sequence of steps in UX flows matches the workflow described in the feature spec
- [ ] All actor types described in the feature spec are present as flow actors in `01_ux_flows.md`
- [ ] Edge cases described in the feature spec (e.g. approval expiry, overdue detection) are reflected in the flows

---

### CHECK 9 — UX Flows vs Screens
- [ ] Every screen name referenced in the UX flows for this module exists in `02_screens.md`
- [ ] Navigation between screens described in flows matches the screen definitions
- [ ] No broken flow references (flow references a screen that doesn't exist in screens.md)

---

### CHECK 10 — Screens vs Feature Spec
- [ ] Screen filter options match the filterable fields defined in the feature spec
- [ ] Role-based field visibility on screens matches the feature spec access rules
- [ ] Action buttons on screens (e.g. approve, assign, archive) match the feature spec workflow steps
- [ ] Status badges/labels on screens match the enum values in the feature spec

---

### CHECK 11 — UX → API Alignment
- [ ] Every action on the screen has a corresponding API call documented in `02_screens.md`
- [ ] Every API listed in `02_screens.md` exists in `api.md`
- [ ] No screen shows data that no endpoint returns

---

### CHECK 12 — API → APISIX Routes Alignment
- [ ] Every endpoint in `api.md` has a corresponding route in `00_apisix_routes.md`
- [ ] HTTP method matches between `api.md` and `00_apisix_routes.md` (GET/POST/PATCH/DELETE)
- [ ] Auth plugin configuration in APISIX route matches the expected auth behavior for the endpoint
- [ ] Role requirements in APISIX min_role match the Access Control in `api.md`
- [ ] External-facing endpoints (PES, integrations) use the correct auth plugin, not standard JWT

---

### CHECK 13 — Prototype → Screens & UX Flows Alignment
- [ ] Every field and button in the prototype HTML exists in the `02_screens.md` screen definition
- [ ] Every action/button in the prototype calls an API that exists in `api.md`
- [ ] No data shown in the prototype is missing from any API response
- [ ] Navigation links in the prototype follow the flow defined in `01_ux_flows.md`
- [ ] Error states and empty states shown in the prototype are covered in `02_screens.md`
- [ ] Role-based UI (admin vs employee vs manager) in the prototype matches feature spec access rules

---

### CHECK 14 — Cross-Module Dependency Check
*(Only applies to modules with declared cross-module dependencies)*

- [ ] Every FK to another module's table (e.g. `training_item_id`, `user_id`) references a column that actually exists in that module's schema
- [ ] Cross-module data reads (not writes) are through defined API endpoints — not direct DB joins across module boundaries
- [ ] If this module depends on a probation gate or compliance status, the dependency is confirmed in the Assignment Engine schema
- [ ] Compliance logic is only in Assignment Engine — not duplicated in this module

---

### CHECK 15 — Audit Event Coverage Check
*(Only applies to the Audit module — Module 10)*

- [ ] Read ALL feature spec files in `02_features/`
- [ ] Extract EVERY `event_code` mentioned in any feature spec
- [ ] Verify each `event_code` is documented in `08_audit.md` event catalog and/or `audit/schema.md`
- [ ] Produce a coverage table: `| event_code | Source Feature Spec | Documented in audit.md? |`
- [ ] Flag every `event_code` found in feature specs but missing from the audit event catalog

---

### CHECK 16 — Notification Event Coverage Check
*(Only applies to the Notifications module — Module 9)*

- [ ] Read ALL feature spec files in `02_features/`
- [ ] Extract every notification trigger described in any feature spec
- [ ] Verify each trigger has a corresponding `event_code` documented in `06_notifications.md` event catalog
- [ ] Flag every notification trigger in feature specs not covered in the notifications module

---

### CHECK 17 — Phase 2 Check
- [ ] No Phase 2 features appear in the API or schema (flag them if found)
- [ ] Any Phase 2 note in the feature spec is consistently marked as out-of-scope in `api.md` and `schema.md`

---

## STEP 5 — Output the Audit Report

```
## Sync Audit Report — [Module Name]
**Date:** [today]
**Auditor:** AI (Claude Code / Antigravity / etc.)
**Files read:** [complete list]
**Status:** ✅ CLEAN | ⚠️ DISCREPANCIES FOUND

---

### CONFIRMED CONSISTENT
- (list each confirmed check with a brief note — so the user knows what's good)

---

### MINOR MISMATCHES (terminology / naming — not blocking)
| Location | Issue | Suggested Fix |
|---|---|---|

---

### REAL GAPS (must fix before code generation)
| Check # | Location | Gap Description | Required Action |
|---|---|---|---|

Severity:
🔴 Critical — blocks code generation, must fix first
🟡 Warning — needs clarification before coding
🟢 Minor — cosmetic / non-blocking

---

### SUMMARY
Confirmed: X | Minor mismatches: Y | Real gaps: Z

---

### Recommended Fixes Before Code Generation
(numbered action list, ordered by severity — 🔴 first)
1.
2.
...
```

---

## STEP 6 — Final Cross-Cutting Audit (Run After ALL Modules Are Complete)

Run this step ONLY after all individual module audits are done and all gaps are fixed.
This step verifies consistency ACROSS modules — things that individual module audits cannot catch.

### CROSS-CHECK 1 — ER Diagram Completeness
- [ ] List every table across ALL schema.md files — verify each appears in `er_diagram.md`
- [ ] Flag any table in `er_diagram.md` NOT in any schema.md (orphaned)
- [ ] Flag any table in any schema.md NOT in `er_diagram.md` (missing from diagram)
- [ ] Verify FK column names in ER diagram match actual column names in schema files

### CROSS-CHECK 2 — APISIX Routes Completeness
- [ ] List every endpoint path across ALL api.md files — verify each has a route in `00_apisix_routes.md`
- [ ] Flag any endpoint in api.md without an APISIX route
- [ ] Flag any APISIX route with no corresponding api.md endpoint (orphaned route)
- [ ] Verify HTTP methods match between api.md and APISIX for every route

### CROSS-CHECK 3 — Module Ownership Consistency
- [ ] From `03_modules.md`: extract table ownership claims per module
- [ ] From each schema.md: extract tables that module defines
- [ ] Flag any table claimed in modules.md not found in that module's schema.md
- [ ] Flag any table in a schema.md not claimed in modules.md
- [ ] Verify no table is claimed by more than one module

### CROSS-CHECK 4 — Audit Event Coverage (Org-wide)
- [ ] From ALL feature specs: extract every `event_code` mentioned
- [ ] From `08_audit.md` and `audit/schema.md`: list all documented event_codes
- [ ] Produce: `| event_code | Source Module | In audit.md? |`
- [ ] Flag every event_code in feature specs NOT in audit documentation

### CROSS-CHECK 5 — Notification Event Coverage (Org-wide)
- [ ] From ALL feature specs: extract every notification trigger described
- [ ] From `06_notifications.md` and `notifications/schema.md`: list all documented event_codes
- [ ] Flag every notification trigger in feature specs NOT covered in notifications module

### CROSS-CHECK 6 — Cross-Module FK Consistency
- [ ] From `er_diagram.md`: list all cross-module FK relationships
- [ ] Verify referenced table exists in target module's schema.md
- [ ] Verify FK column name matches actual PK column name in target table

### CROSS-CHECK 7 — NFR Compliance (from `02_nfr.md`)
- [ ] All list endpoints have pagination parameters (page, size)
- [ ] All write endpoints have audit event emission
- [ ] Soft deletes used everywhere (no hard DELETE on domain entities)
- [ ] Sensitive data not exposed in API responses
- [ ] Rate limiting configured in APISIX for external-facing endpoints

### CROSS-CHECK 8 — UX Flows vs Screens Completeness
- [ ] Every screen name referenced in `01_ux_flows.md` exists in `02_screens.md`
- [ ] Every screen in `02_screens.md` is reachable from at least one flow in `01_ux_flows.md`
- [ ] Flag orphaned screens (in screens.md but not in any flow)
- [ ] Flag broken flow references (flow references screen not in screens.md)

### CROSS-CHECK 9 — Prototype Coverage vs Screens
- [ ] List all HTML files in `prototype/` directory
- [ ] List all screens defined in `02_screens.md`
- [ ] Flag screens in screens.md with NO prototype HTML file
- [ ] Flag prototype HTML files with NO corresponding screen in screens.md

### CROSS-CHECK 10 — Admin Settings Completeness
- [ ] From ALL feature specs: extract every configurable setting mentioned (reminder days, escalation thresholds, approval expiry, retention periods, etc.)
- [ ] From `11_admin/schema.md`: verify each setting has a row in the settings catalog
- [ ] Flag any configurable setting in feature specs not in the admin settings catalog

---

## IMPORTANT RULES

- Do NOT use AI-generated files (sync audit outputs, diagram files) as source of truth
- Always read original spec files (`02_features/`, `05_engineering/`, `04_architecture/`)
- If a file is too long, read it in sections — NEVER skip sections
- If any required file doesn't exist yet → flag as 🔴 Critical discrepancy
- After the audit is complete, do NOT start code generation in the same conversation
  → Start a new conversation with `02_code_generation.md` or the backend/frontend agent
- Checks 15 and 16 are module-specific — only run Check 15 for the Audit module, Check 16 for Notifications
- Check 7 (Admin Settings) only applies to modules that reference configurable system settings
- Step 6 (Final Cross-Cutting) runs ONCE at the end of all module audits — not per module
