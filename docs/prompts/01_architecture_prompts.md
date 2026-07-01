# AZ-LMS — Architecture Diagram Generation Prompts (v2)

**Output format:** Each diagram must be saved as a **self-contained `.html` file** in `docs/visual_diagrams/architecture/`.
Use the HTML shell at the bottom of this file. Embed the Mermaid diagram inside the `<div class="mermaid">` block.

**Diagram quality rules (apply to every prompt):**
- Use ONE layout direction for the entire diagram (`TD` or `LR`). Never add `direction` overrides inside subgraphs.
- Maximum 2 levels of subgraph nesting.
- Maximum 25 nodes per diagram. If more are needed, split into multiple diagrams.
- Node labels: max 2 lines, no raw `\n` — use `<br/>` in HTML-labelled nodes or keep labels to one line.
- Arrows: show only the 10–15 most architecturally significant connections. Annotate arrows sparingly (only where the label adds real meaning).
- No emojis in node IDs or labels (they break some Mermaid renderers). Use plain text.
- Do not include `%%{init}%%` blocks — theme is set by the HTML wrapper.
- Color coding must always have a Legend node or subgraph.
- Failure paths belong in a **separate table below the diagram**, not inside the diagram itself.

---

## HTML Shell (use for every output file)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DIAGRAM_TITLE — AZ-LMS Architecture</title>
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
<style>
  :root {
    --bg: #0d1117; --card: #161b22; --border: #30363d;
    --accent: #58a6ff; --text: #c9d1d9; --muted: #8b949e;
    --green: #3fb950; --orange: #d29922; --red: #f85149;
    --purple: #bc8cff; --yellow: #e3b341;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--bg); color: var(--text); font-family: 'Segoe UI', system-ui, sans-serif; }
  header { background: var(--card); border-bottom: 1px solid var(--border); padding: 14px 28px; display: flex; align-items: center; justify-content: space-between; }
  .header-left .label { font-size: 11px; font-weight: 700; letter-spacing: 2px; color: var(--accent); text-transform: uppercase; }
  .header-left .title { font-size: 18px; font-weight: 600; margin-top: 2px; }
  .header-left .subtitle { font-size: 12px; color: var(--muted); margin-top: 2px; }
  nav { background: var(--card); border-bottom: 1px solid var(--border); padding: 8px 28px; display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
  nav a { font-size: 11px; padding: 4px 10px; border-radius: 5px; color: var(--muted); text-decoration: none; border: 1px solid var(--border); white-space: nowrap; transition: all 0.15s; }
  nav a:hover { color: var(--text); border-color: var(--muted); }
  nav a.active { background: var(--accent); color: #0d1117; border-color: var(--accent); font-weight: 600; }
  .desc { max-width: 1000px; margin: 20px auto 0; padding: 12px 20px; background: var(--card); border: 1px solid var(--border); border-radius: 8px; font-size: 13px; line-height: 1.6; color: var(--muted); }
  .desc strong { color: var(--text); }
  .diagram-wrap { padding: 24px 28px 40px; display: flex; justify-content: center; overflow-x: auto; }
  .diagram-card { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 28px 32px; max-width: 100%; overflow: auto; }
  .mermaid { display: flex; justify-content: center; min-width: 400px; }
  .mermaid svg { max-width: 100%; height: auto; }
  .info-table { max-width: 1000px; margin: 0 auto 40px; padding: 0 28px; }
  .info-table h3 { font-size: 13px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: var(--card); color: var(--muted); font-weight: 600; padding: 8px 12px; text-align: left; border: 1px solid var(--border); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 8px 12px; border: 1px solid var(--border); color: var(--text); vertical-align: top; }
  tr:nth-child(even) td { background: rgba(255,255,255,0.02); }
  .controls { position: fixed; bottom: 20px; right: 20px; display: flex; flex-direction: column; gap: 6px; z-index: 100; }
  .ctrl-btn { background: var(--card); border: 1px solid var(--border); color: var(--text); width: 34px; height: 34px; border-radius: 7px; cursor: pointer; font-size: 15px; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
  .ctrl-btn:hover { background: var(--accent); border-color: var(--accent); color: #0d1117; }
  .badge { display: inline-block; padding: 1px 7px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .badge-blue { background: rgba(88,166,255,0.15); color: var(--accent); }
  .badge-green { background: rgba(63,185,80,0.15); color: var(--green); }
  .badge-orange { background: rgba(210,153,34,0.15); color: var(--orange); }
  .badge-red { background: rgba(248,81,73,0.15); color: var(--red); }
</style>
</head>
<body>
<header>
  <div class="header-left">
    <div class="label">AZ-LMS · Architecture Diagrams</div>
    <div class="title">DIAGRAM_TITLE</div>
    <div class="subtitle">DIAGRAM_SUBTITLE</div>
  </div>
  <div style="font-size:11px;color:var(--muted)">Last updated: LAST_UPDATED</div>
</header>
<nav>
  <a href="index.html">Index</a>
  <a href="01_system_architecture.html">1. System</a>
  <a href="02_module_dependency.html">2. Modules</a>
  <a href="03_database_er_diagram.html">3. ER Diagram</a>
  <a href="04_auth_flow.html">4. Auth Flow</a>
  <a href="05_integration_data_flow.html">5. Integrations</a>
  <a href="06_background_jobs.html">6. Background Jobs</a>
  <a href="07_apisix_route_map.html">7. APISIX Routes</a>
  <a href="08_deployment_architecture.html">8. Deployment</a>
</nav>
<div class="desc">
  <strong>Source:</strong> SOURCE_FILES &nbsp;|&nbsp;
  <strong>Type:</strong> DIAGRAM_TYPE &nbsp;|&nbsp;
  DESCRIPTION
</div>
<div class="diagram-wrap">
  <div class="diagram-card">
    <div class="mermaid">
MERMAID_DIAGRAM_HERE
    </div>
  </div>
</div>
<!-- Optional info table below diagram -->
<div class="controls">
  <button class="ctrl-btn" onclick="zoomIn()" title="Zoom in">+</button>
  <button class="ctrl-btn" onclick="zoomOut()" title="Zoom out">−</button>
  <button class="ctrl-btn" onclick="resetZoom()" title="Reset zoom">⟲</button>
</div>
<script>
  mermaid.initialize({ startOnLoad: true, theme: 'dark', securityLevel: 'loose',
    flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis' },
    sequence: { useMaxWidth: true, actorMargin: 60 }
  });
  let s = 1;
  const getSvg = () => document.querySelector('.mermaid svg');
  function zoomIn()  { s = Math.min(s * 1.25, 4);  getSvg() && (getSvg().style.transform = `scale(${s})`); getSvg().style.transformOrigin = 'top center'; }
  function zoomOut() { s = Math.max(s * 0.8, 0.3); getSvg() && (getSvg().style.transform = `scale(${s})`); getSvg().style.transformOrigin = 'top center'; }
  function resetZoom() { s = 1; getSvg() && (getSvg().style.transform = 'scale(1)'); }
</script>
</body>
</html>
```

---

## DIAGRAM 1 — System Architecture Overview

**Output file:** `docs/visual_diagrams/architecture/01_system_architecture.html`
**Mark nav link `1. System` as active.**

```
Read: docs/requirements/04_architecture/01_architecture.md (Section 3)

Generate a Mermaid flowchart TD showing the layered architecture.

RULES:
- Direction: TD only. No direction overrides in subgraphs.
- Max 20 nodes total (combine minor nodes).
- No emojis in node IDs.
- Show only the 12 most important connections with directional arrows.
- Annotate only 3–4 arrows (the most architecturally significant ones).

LAYERS (top to bottom — use subgraph for each):

PRESENTATION ["Presentation Layer"]
  - SPA ["ReactJS SPA + Keycloak JS Adapter"]

GATEWAY ["Gateway Layer"]
  - APISIX ["APISIX API Gateway\nJWT validation · TLS · Rate limit · X-Correlation-ID"]

API ["API Layer"]
  - FASTAPI ["FastAPI (Python) — /api/v1/\nBusiness logic · Role + hierarchy auth"]

WORKER ["Worker Layer (separate process)"]
  - Two nodes: SCHED["APScheduler\nScheduled Jobs"] and ASYNC["Background Tasks\nEvent-Driven"]

MODULES ["Application Modules (16)"]
  - Three sub-groups: CORE["Core: Users · Training · Assignments · Sessions"],
    SUPPORT["Support: Notifications · Reporting · Audit · Integrations"],
    PLATFORM["Platform: Auth · Authorization · Search · Files · Admin · BG Jobs"]

DATA ["Data Layer"]
  - PG[("PostgreSQL")] and OD[("OneDrive — file storage")]

EXTERNAL ["External Systems"]
  - KC["Keycloak + Azure AD"]
  - ZOHO["Zoho HR"]
  - EDB["Employee DB"]
  - TEAMS["Microsoft Teams"]
  - PES["PES (M2M)"]

KEY CONNECTIONS (show these only):
  SPA -->|"Bearer JWT"| APISIX
  PES -->|"M2M JWT · 100 req/min"| APISIX
  APISIX -->|"JWT validated, forwarded"| FASTAPI
  SPA <-->|"PKCE / OIDC"| KC
  FASTAPI --> MODULES
  MODULES --> DATA
  SCHED -->|"scheduled triggers"| MODULES
  ASYNC -->|"event-driven"| MODULES
  FASTAPI <-->|"Admin API"| KC
  SUPPORT -->|"Graph API"| TEAMS
  SUPPORT -->|"Scheduled pull"| ZOHO
  SUPPORT -->|"Scheduled pull"| EDB

COLOR CODING (classDef):
  presentation: fill:#1565c0,color:#fff,stroke:#0d47a1
  gateway: fill:#e65100,color:#fff,stroke:#bf360c
  api: fill:#1b5e20,color:#fff,stroke:#003300
  worker: fill:#4a148c,color:#fff,stroke:#2a004a
  module: fill:#006064,color:#fff,stroke:#003d40
  data: fill:#b71c1c,color:#fff,stroke:#7f0000
  external: fill:#37474f,color:#fff,stroke:#1c313a

LEGEND: Add a subgraph LEGEND at the bottom-right with 4-5 color sample nodes.
```

---

## DIAGRAM 2 — Module Dependency Map

**Output file:** `docs/visual_diagrams/architecture/02_module_dependency.html`
**Mark nav link `2. Modules` as active.**

```
Read: docs/requirements/04_architecture/03_modules.md (Sections 3–8)

Generate a Mermaid flowchart LR showing all 16 modules and dependencies.

RULES:
- Direction: LR only. No direction overrides inside subgraphs.
- Use 3 subgraphs: CORE, SUPPORT, PLATFORM.
- Arrow label: only where direction is not obvious (e.g., "via BG Jobs").
- Show all listed dependencies — but use simple unlabelled arrows unless noted.

MODULE IDs (use short IDs):
  Core:     UM, TM, AE, SM
  Support:  NOTIF, RPT, AUDIT, INTEG, MIGR (label: "Phase 2 — Deferred")
  Platform: AUTHN, AUTHZ, SEARCH, FM, ADMCFG, APIL, BGJOBS

DEPENDENCIES (A --> B = A depends on B):
  UM --> INTEG, AUTHN, AUTHZ
  TM --> FM
  AE --> UM, TM, AUTHZ, ADMCFG
  SM --> TM, INTEG, AUTHZ
  NOTIF --> AE, SM, INTEG, ADMCFG, BGJOBS
  RPT --> UM, AE, SM, TM, BGJOBS
  AUDIT --> BGJOBS
  INTEG --> BGJOBS, ADMCFG
  MIGR --> UM, TM, AE, SM, AUDIT
  AUTHZ --> UM, AUTHN
  SEARCH --> TM, AUTHZ
  FM --> INTEG, TM
  ADMCFG --> AUDIT
  BGJOBS --> INTEG, NOTIF, AE, RPT, AUDIT
  APIL --> UM, TM, AE, SM, NOTIF, RPT, AUDIT, INTEG, SEARCH, ADMCFG

COLOR CODING:
  core: fill:#1565c0,color:#fff,stroke:#0d47a1
  support: fill:#e65100,color:#fff,stroke:#bf360c
  platform: fill:#1b5e20,color:#fff,stroke:#003300
  deferred: fill:#424242,color:#bbb,stroke:#212121,stroke-dasharray:5 3

FOOTER NOTE (as a node RULES): "No cross-table writes · Reporting is read-only · Compliance logic in AE only"
LEGEND subgraph: show 4 color samples.
```

---

## DIAGRAM 3 — Database ER Diagram (Split into 3 focused diagrams)

**Output file:** `docs/visual_diagrams/architecture/03_database_er_diagram.html`
**Mark nav link `3. ER Diagram` as active.**

```
Read: docs/requirements/05_engineering/er_diagram.md

IMPORTANT: Do NOT attempt one giant erDiagram. Instead generate THREE focused erDiagrams
on a single HTML page using three separate <div class="mermaid"> blocks,
each with a clear heading. The page uses tabs or visual section separators.

SECTION 1 — Core Business Tables (heading: "Users · Training · Assignments · Sessions"):
Show these tables and their KEY relationships (FK lines only — no attribute lists except PK/FK):
  USERS, USER_HIERARCHY, USER_PROJECT_ALLOCATIONS, USER_PROBATION
  TRAINING_ITEMS, TRAINING_VERSIONS, TRAINING_RESOURCES, RESOURCE_FILES
  ASSIGNMENTS, ASSIGNMENT_HISTORY, MANDATORY_ASSIGNMENT_RULES, ASSIGNMENT_REQUESTS, COMPLIANCE_STATUS
  SESSIONS, SESSION_PARTICIPANTS, SESSION_ATTENDANCE

SECTION 2 — Platform & Support Tables (heading: "Auth · Notifications · Reporting · Admin · Audit"):
  ROLE_MAPPINGS, AUTHORIZATION_POLICIES, ACCESS_DENIED_LOGS
  NOTIFICATIONS, NOTIFICATION_DELIVERY_LOG, NOTIFICATION_PREFERENCES
  REPORT_EXPORTS, REPORTING_SNAPSHOTS
  ADMIN_SETTINGS, ADMIN_SETTINGS_HISTORY
  AUDIT_LOGS, AUDIT_WRITE_FAILURES, AUDIT_EXPORT_JOBS

SECTION 3 — Integration & Assessment Tables (heading: "Integrations · Assessments · Progress"):
  INTEGRATION_JOBS, INTEGRATION_JOB_LOGS, INTEGRATION_HEALTH_STATUS
  USER_ATTRIBUTES_SYNC_LOG, USER_SOURCE_REFERENCES, USER_CAPABILITIES
  RESOURCE_ASSESSMENTS, ASSESSMENT_QUESTIONS, ASSESSMENT_OPTIONS, ASSESSMENT_ATTEMPTS, ASSESSMENT_RESPONSES
  RESOURCE_PROGRESS, TRAINING_COMPLETIONS, CERTIFICATES

For each table show: PK column, FK columns, 2–3 key data columns (omit timestamps and minor fields).
Use ||--o{ for one-to-many, ||--|| for one-to-one.
```

---

## DIAGRAM 4 — Authentication & Authorization Flow

**Output file:** `docs/visual_diagrams/architecture/04_auth_flow.html`
**Mark nav link `4. Auth Flow` as active.**

```
Read:
  - docs/requirements/02_features/01_authentication.md
  - docs/requirements/04_architecture/01_architecture.md (Section 10)

Generate a Mermaid sequenceDiagram with 4 clearly labelled sequences.

PARTICIPANTS (left to right):
  Browser, APISIX, FastAPI, Keycloak, AzureAD, DB

RULES:
  - Do NOT use rect rgb() colored backgrounds — they render inconsistently.
  - Use Note over X,Y: "── SEQUENCE N: Title ──" as section separators instead.
  - Use autonumber.
  - Keep participant names short (no spaces).

SEQUENCE 1 — PKCE Login:
  Browser->>Keycloak: PKCE authorization request (code_challenge)
  Keycloak->>AzureAD: Redirect to Azure AD
  AzureAD-->>Keycloak: Auth code returned
  Keycloak-->>Browser: JWT issued (sub, email, realm_access.roles)
  Note over Browser: JWT stored in MEMORY ONLY — never localStorage/cookie

SEQUENCE 2 — API Request:
  Browser->>APISIX: API request · Authorization: Bearer JWT
  Note over APISIX: Validates: signature, expiry, aud claim · Injects X-Correlation-ID
  APISIX->>FastAPI: Forwarded (JWT validated)
  FastAPI->>DB: SELECT user WHERE keycloak_user_id = sub
  DB-->>FastAPI: User record + hierarchy (depth=1)
  Note over FastAPI: Manager role derived from user_hierarchy — NOT a Keycloak role
  FastAPI->>FastAPI: Route guard: role + hierarchy scope check
  FastAPI-->>Browser: Response (via APISIX)

SEQUENCE 3 — Token Refresh:
  Browser->>Keycloak: Silent refresh (PKCE iframe)
  Keycloak-->>Browser: New JWT (in memory)
  Browser->>APISIX: Next request with refreshed JWT

SEQUENCE 4 — PES M2M:
  PES->>Keycloak: client_credentials grant
  Keycloak-->>PES: M2M JWT (INTEGRATION scope only)
  PES->>APISIX: GET /api/v1/integrations/pes/compliance/{employee_id}
  Note over APISIX: PES route group · 100 req/min · IP allowlist
  APISIX->>FastAPI: Forwarded
  FastAPI->>DB: SELECT compliance_status
  FastAPI->>DB: INSERT audit_logs (async — PES_API_ACCESSED)
  FastAPI-->>PES: Compliance data

After the diagram, include a Markdown table: "Security Rules" with Rule and Enforcement Point columns
(7 rows covering: JWT in memory, dual validation, aud claim, manager derivation, hierarchy depth, PES rate limit, PES audit).
```

---

## DIAGRAM 5 — Integration Data Flow

**Output file:** `docs/visual_diagrams/architecture/05_integration_data_flow.html`
**Mark nav link `5. Integrations` as active.**

```
Read: docs/requirements/04_architecture/04_integrations.md

Generate a Mermaid flowchart LR — LMS in the center, 6 external systems around it.

RULES:
- Direction: LR. One level of subgraph only.
- No failure path nodes in the diagram itself — put failure info in the summary table below.
- Annotate every arrow with: trigger type + data type (keep labels to 1 line).
- Color-code by direction: Green = external→LMS, Orange = LMS→external, Purple = bidirectional.

NODES:
  LMS["AZ-LMS\n(FastAPI + PostgreSQL)"] — center, styled distinctly
  ZOHO["Zoho HR"] — external
  EDB["Employee DB"] — external
  KC["Keycloak + Azure AD"] — external
  PES["PES (M2M)"] — external
  TEAMS["Microsoft Teams"] — external
  OD["OneDrive"] — external

ARROWS:
  ZOHO -->|"Scheduled pull daily 02:00\nHR fields: name, dept, status"| LMS
  EDB -->|"Scheduled pull daily 02:30\nhierarchy + capabilities"| LMS
  KC <-->|"OIDC per-request (read)\n+ Admin API (write)"| LMS
  PES -->|"On-demand REST · M2M JWT\ncompliance data"| LMS
  LMS -->|"Graph API · per session\ncreate/update/cancel meeting"| TEAMS
  LMS -->|"Graph API · per resource\nupload / delete / stream URL"| OD

COLOR CLASSES:
  external_in: fill:#1b5e20,color:#fff,stroke:#003300
  external_bidi: fill:#4a148c,color:#fff,stroke:#2a004a
  lms_out: fill:#e65100,color:#fff,stroke:#bf360c
  lms_center: fill:#1565c0,color:#fff,stroke:#0d47a1,font-weight:bold

After the diagram include a table with columns:
  # | System | Direction | Mechanism | Trigger | LMS Stores | Failure Behavior
(6 rows, one per integration)
```

---

## DIAGRAM 6 — Background Jobs & Worker Architecture

**Output file:** `docs/visual_diagrams/architecture/06_background_jobs.html`
**Mark nav link `6. Background Jobs` as active.**

```
Read:
  - docs/requirements/04_architecture/01_architecture.md (Section 8)
  - docs/requirements/04_architecture/03_modules.md (Module 16)

Generate a Mermaid flowchart TD.

RULES:
- Direction: TD only. No direction overrides in subgraphs.
- Two top-level subgraphs: SCHED (Section A) and EVENTS (Section B).
- Worker process node at the top connecting to both subgraphs.
- Dead-letter and failure paths shown BELOW as a third subgraph FAIL.
- No more than 25 nodes total.

WORKER ["Worker Service\n(Separate process — not API server)"]

SECTION A subgraph SCHED ["Scheduled Jobs — APScheduler"]:
  Group by owning module (4 sub-groups, 2-3 jobs each):
  INTEG_JOBS: ZohoSync["Zoho HR Sync\nDaily 02:00"], EDBSync["Employee DB Sync\nDaily 02:30"], HealthCheck["Integration Health\nEvery 15 min"]
  AE_JOBS: ComplianceEval["Compliance Eval\nNightly 03:00"], OverdueCheck["Overdue + Escalation\nDaily"], ApprovalExpiry["Approval Expiry\nDaily"]
  NOTIF_JOBS: ReminderDispatch["Reminders\nDaily / Hourly"], NotifPurge["Notification Purge\nDaily"], DeadLetterRetry["Dead-letter Retry\nHourly"]
  SYSTEM_JOBS: ExportCleanup["Export Cleanup\nDaily"], AuditPurge["Audit Retention\nWeekly"]

SECTION B subgraph EVENTS ["Event-Driven Jobs — FastAPI Background Tasks"]:
  Show as a single-column flow (no sub-groups):
  EV1["Assignment created → notify employee"]
  EV2["Session created → create Teams meeting"]
  EV3["Session changed → update Teams + re-notify"]
  EV4["Session cancelled → cancel Teams + notify"]
  EV5["Session ended → pull Teams attendance"]
  EV6["Approval expired → update status + notify"]
  EV7["Completion expired → create recertification"]
  EV8["NON_COMPLIANT → escalation notification"]
  EV9["State change → write audit_logs (async)"]

FAIL subgraph ["Failure & Dead-Letter"]:
  DL_NOTIF["notification_delivery_log\n(FAILED status)"]
  DL_AUDIT["audit_write_failures\n(never blocks originating op)"]
  ADMIN_DASH["Admin Dashboard\nFailed audits · failed notifications · integration errors"]

CONNECTIONS:
  WORKER --> SCHED
  WORKER --> EVENTS
  DeadLetterRetry -->|"retries hourly"| DL_NOTIF
  EV9 -->|"on write fail"| DL_AUDIT
  DL_NOTIF --> ADMIN_DASH
  DL_AUDIT --> ADMIN_DASH

COLOR: worker=purple, integ=blue, ae=green, notif=orange, system=grey, event=red-orange, fail=dark-red

After diagram: include two small tables:
  1. "Scheduled Jobs" (Name | Schedule | Module)
  2. "Idempotency + Failure rules" (Job Type | Retries | Behavior)
```

---

## DIAGRAM 7 — API Gateway Route Map (APISIX)

**Output file:** `docs/visual_diagrams/architecture/07_apisix_route_map.html`
**Mark nav link `7. APISIX Routes` as active.**

```
Read:
  - docs/requirements/05_engineering/00_apisix_routes.md
  - docs/requirements/04_architecture/01_architecture.md (Section: API Exposure via APISIX)

Generate a Mermaid flowchart TD.

RULES:
- Direction: TD.
- Show APISIX as the central routing node.
- Two incoming arrows (Browser with user JWT, PES with M2M JWT).
- Two route group subgraphs.
- Internal routes shown separately (dashed arrows, bypasses APISIX).
- FastAPI as final destination.
- Max 22 nodes total.

NODES:
  BROWSER["Browser (ReactJS SPA)\nJWT via PKCE"]
  PES_SVC["PES Service\nM2M JWT via Client Credentials"]
  KC["Keycloak\n(issues both JWT types)"]
  APISIX["APISIX API Gateway\nTLS · JWT validation (sig+expiry+aud)\nX-Correlation-ID · Rate limit\nROLE CHECKS: done in FastAPI"]

  subgraph RG1 ["Route Group 1 — Standard APIs (JWT/PKCE) · 134 routes"]:
    R_AUTH["/auth/* — 3 routes"]
    R_USERS["/users/* — 17 routes"]
    R_TRAIN["/trainings/* — 22 routes"]
    R_ASSIGN["/assignments/* + /approvals/* — 20 routes"]
    R_SESS["/sessions/* — 24 routes"]
    R_OTHER["/notifications/* /reports/* /admin/*\n/audit/* /search/* /integrations/* /probation/*\n— 48 routes"]

  subgraph RG2 ["Route Group 2 — PES M2M · 2 routes · 100 req/min"]:
    PES_SINGLE["GET /api/v1/integrations/pes/compliance/{id}"]
    PES_BULK["POST /api/v1/integrations/pes/compliance/bulk"]

  subgraph INTERNAL ["Internal Routes — NOT in APISIX (loopback only)"]:
    INT_NOTIF["/internal/notifications"]
    INT_AUDIT["/internal/audit"]

  FASTAPI["FastAPI :8000 (internal)\nRole + hierarchy enforcement\nBusiness logic"]

CONNECTIONS:
  KC -->|"Issues PKCE JWT"| BROWSER
  KC -->|"Issues M2M JWT"| PES_SVC
  BROWSER -->|"HTTPS · Bearer JWT"| APISIX
  PES_SVC -->|"HTTPS · Bearer M2M JWT"| APISIX
  APISIX --> RG1 --> FASTAPI
  APISIX --> RG2 --> FASTAPI
  FASTAPI -.->|"emits events (loopback)"| INT_NOTIF
  FASTAPI -.->|"emits events (loopback)"| INT_AUDIT
  INT_NOTIF -.->|"direct loopback"| FASTAPI
  INT_AUDIT -.->|"direct loopback"| FASTAPI

After diagram: include route count table (Module | Prefix | Count | Auth Type).
```

---

## DIAGRAM 8 — Deployment & Physical Architecture

**Output file:** `docs/visual_diagrams/architecture/08_deployment_architecture.html`
**Mark nav link `8. Deployment` as active.**

```
Read:
  - docs/requirements/04_architecture/01_architecture.md (Section 6 + Section 18)
  - docs/requirements/04_architecture/02_nfr.md

Generate a Mermaid flowchart TD.

RULES:
- Direction: TD.
- Three top-level subgraphs: CLIENT, ONPREM (the server), EXTERNAL.
- A DATA STORAGE subgraph at the bottom.
- NFR targets shown as a styled note node (not a subgraph).
- Max 20 nodes total.
- No direction overrides inside subgraphs.

CLIENT subgraph:
  BROWSER["Browser\nReactJS SPA · Keycloak JS Adapter"]

ONPREM subgraph ["On-Premise Server (single deployment unit)"]:
  APISIX_PROC["APISIX\nPort 443 · TLS · JWT validation\nX-Correlation-ID · Rate limit"]
  FASTAPI_PROC["FastAPI\nPort 8000 (internal only)\nBusiness logic · Role + hierarchy auth"]
  WORKER_PROC["Worker Service\nSeparate process\nAPScheduler + Background Tasks"]
  PG_DB[("PostgreSQL\nSingle DB · Single Schema")]

EXTERNAL subgraph ["External Systems"]:
  Left side (cloud): KC_EXT["Keycloak + Azure AD"], TEAMS_EXT["Microsoft Teams\n(Graph API)"], OD_EXT["OneDrive\n(Graph API)"], ZOHO_EXT["Zoho HR\n(REST API)"]
  Right side (on-prem): EDB_EXT["Employee / Timesheet DB"], PES_EXT["PES\nM2M · 100 req/min"]

NFR_NODE["NFR Targets:\nAPI P95 < 500ms · Page load < 2s\nAvailability 99.5% · Users < 1000\nAudit retention 5yr · Exports 24h"]

KEY CONNECTIONS:
  BROWSER <-->|"HTTPS :443"| APISIX_PROC
  PES_EXT -->|"HTTPS · M2M JWT"| APISIX_PROC
  APISIX_PROC -->|"http://fastapi:8000\n(JWT validated)"| FASTAPI_PROC
  FASTAPI_PROC <-->|"SQLAlchemy ORM"| PG_DB
  WORKER_PROC <-->|"SQL queries"| PG_DB
  FASTAPI_PROC <-->|"OIDC + Admin API"| KC_EXT
  BROWSER <-->|"PKCE flow"| KC_EXT
  WORKER_PROC -->|"Graph API"| TEAMS_EXT
  WORKER_PROC -->|"Graph API · upload/delete"| OD_EXT
  FASTAPI_PROC -->|"Graph API · streaming URL"| OD_EXT
  WORKER_PROC -->|"REST · daily pull"| ZOHO_EXT
  WORKER_PROC -->|"REST · daily pull"| EDB_EXT

SECURITY ANNOTATIONS (as a separate note node SECURITY_NOTE):
  "JWT: in memory only — never in localStorage or DB\nJWT validated at BOTH APISIX and FastAPI\n/internal/* NOT exposed via APISIX\nPES M2M: separate route group + IP allowlist"

COLOR CODING:
  client: fill:#1565c0,color:#fff,stroke:#0d47a1
  server: fill:#1b5e20,color:#fff,stroke:#003300
  worker: fill:#4a148c,color:#fff,stroke:#2a004a
  db: fill:#b71c1c,color:#fff,stroke:#7f0000
  cloud: fill:#e65100,color:#fff,stroke:#bf360c
  onprem_ext: fill:#37474f,color:#fff,stroke:#1c313a

After diagram: include "Availability Behavior When External Systems Fail" table (6 rows).
```

---

*Last updated: 2026-04-14*
*Base path: `c:\Users\jayesh.sanavada\OneDrive - Azilen Technologies Pvt. Ltd\Development\AZ-LMS\lms_rad\`*
*Output format changed from `.md` to `.html` — all diagrams are self-contained, browser-viewable HTML files.*
