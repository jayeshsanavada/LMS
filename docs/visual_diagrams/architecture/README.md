# AZ-LMS Architecture Diagrams

> **Generated from:** `docs/prompts/01_architecture_prompts.md`
> **Source specs:** `docs/requirements/04_architecture/` + `docs/requirements/05_engineering/`
> **Last updated:** 2026-04-11

---

## Diagram Index

| # | File | Diagram | Type | Primary Source |
|---|---|---|---|---|
| 1 | [01_system_architecture.md](./01_system_architecture.md) | System Architecture Overview | Layered flowchart (C4-style) | `01_architecture.md` §3 |
| 2 | [02_module_dependency.md](./02_module_dependency.md) | Module Dependency Map | Directed dependency graph | `03_modules.md` §3–8 |
| 3 | [03_database_er_diagram.md](./03_database_er_diagram.md) | Database ER Diagram (Module-Colored) | Mermaid erDiagram | `er_diagram.md` |
| 4 | [04_auth_flow.md](./04_auth_flow.md) | Authentication & Authorization Flow | Sequence diagram (4 sequences) | `01_architecture.md` §10 |
| 5 | [05_integration_data_flow.md](./05_integration_data_flow.md) | Integration Data Flow | Flowchart (6 integrations) | `01_architecture.md` §9 |
| 6 | [06_background_jobs.md](./06_background_jobs.md) | Background Jobs & Worker Architecture | Flowchart (scheduled + event-driven) | `01_architecture.md` §8 + `03_modules.md` M16 |
| 7 | [07_apisix_route_map.md](./07_apisix_route_map.md) | APISIX API Gateway Route Map | Flowchart (route groups) | `00_apisix_routes.md` |
| 8 | [08_deployment_architecture.md](./08_deployment_architecture.md) | Deployment & Physical Architecture | Flowchart (on-prem topology) | `01_architecture.md` §6 + `02_nfr.md` |

---

## Quick Reference — What Each Diagram Shows

### Diagram 1 — System Architecture Overview
The end-to-end 8-layer architecture: Browser → APISIX → FastAPI → Application/Domain/Infrastructure layers → PostgreSQL + OneDrive, with the Worker Service shown as a parallel process and all 6 external systems annotated with data flow directions.

### Diagram 2 — Module Dependency Map
All 16 modules grouped into Core (4), Supporting (5), and Generic/Platform (7) layers with directed dependency arrows showing which modules depend on which. Includes forbidden dependency patterns.

### Diagram 3 — Database ER Diagram
All 51+ tables across 13 module groups with key FK relationships. Table ownership is annotated per module. Critical ownership notes: `resource_files` → File Management (M13), `compliance_status` → Assignment Engine (M3).

### Diagram 4 — Auth & Authorization Flow
Four distinct sequences: PKCE login flow, API request validation (dual JWT check at APISIX + FastAPI), silent token refresh, and PES M2M Client Credentials flow. Annotates where Manager scope is derived and hierarchy depth = 1 rule.

### Diagram 5 — Integration Data Flow
All 6 integrations (Zoho HR, Employee DB, Keycloak, PES, Teams, OneDrive) with directions, mechanisms, triggers, stored data, and failure behaviors. Color-coded: green = external-initiated, orange = LMS-initiated, purple = bidirectional.

### Diagram 6 — Background Jobs & Worker Architecture
13 scheduled jobs (APScheduler) and 12 event-driven jobs (FastAPI background tasks) with their owners, schedules, and failure/dead-letter paths. Includes retry policy table.

### Diagram 7 — APISIX Route Map
APISIX as central routing hub with Route Group 1 (134 standard JWT routes across 12 modules) and Route Group 2 (2 PES M2M routes). Shows internal loopback routes that must NOT appear in APISIX config.

### Diagram 8 — Deployment & Physical Architecture
On-premises deployment topology: Browser → APISIX (port 443) → FastAPI (port 8000, internal) + Worker (separate process) → PostgreSQL. External cloud services and on-premise external systems annotated. NFR targets and availability behavior table included.

---

## How to View Diagrams

All diagrams are Mermaid blocks embedded in Markdown files. They render natively in:
- VS Code with the **Markdown Preview Mermaid Support** extension
- GitHub repository view
- GitLab repository view
- Notion (paste Mermaid code block)
- Any Mermaid-compatible renderer (https://mermaid.live)

---

*Folder: `docs/visual_diagrams/architecture/`*
