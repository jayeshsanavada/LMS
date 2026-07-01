# AZ-LMS — Tech Stack Decisions

---

## About This File

| Field | Detail |
|---|---|
| **Purpose** | Single authoritative source for all technology choices — exact libraries, versions, and the rationale for each. AI must read this before generating any code to ensure consistent library usage across all modules. |
| **When to Use** | Before any code generation session. Also read when setting up project scaffold, writing dependencies files (requirements.txt, package.json), or making architecture decisions. |
| **How to Use** | Read completely. Use the exact library names and versions listed here — never substitute alternatives unless a decision is recorded in this file. |
| **Used By Agents?** | Yes — `backend-dev.md` and `frontend-dev.md` reference this file. It is also in the SHARED section of `docs/code_generation/skills/03_module_file_index.md`. |
| **Related Files** | `docs/requirements/05_engineering/02_project_scaffold.md`, `docs/requirements/05_engineering/03_coding_conventions.md`, `docs/AI_CONTEXT.md` |

---

## BACKEND STACK

### Core Framework
| Library | Version | Purpose | Decision |
|---|---|---|---|
| **Python** | 3.12+ | Runtime | Latest stable — async support, type hints |
| **FastAPI** | 0.115+ | Web framework | Best async Python framework; auto OpenAPI docs |
| **Uvicorn** | 0.29+ | ASGI server | Standard production ASGI server for FastAPI |
| **pydantic** | v2.x | Data validation | FastAPI native; v2 for performance |
| **pydantic-settings** | 2.x | Config management | `.env` file + environment variable loading |

### Database
| Library | Version | Purpose | Decision |
|---|---|---|---|
| **PostgreSQL** | 15 | Primary database | Single relational DB, single schema |
| **SQLAlchemy** | 2.x (async) | ORM | Async-first ORM; mapped_column() style (NOT legacy Column style) |
| **asyncpg** | 0.29+ | PostgreSQL async driver | Fastest async PostgreSQL driver for Python |
| **Alembic** | 1.13+ | DB migrations | Standard SQLAlchemy migration tool |

> **ORM Style Rule:** Use SQLAlchemy 2.x declarative style with `mapped_column()` and type annotations. Never use the legacy `Column()` style from SQLAlchemy 1.x.

### Background Jobs
| Library | Version | Purpose | Decision |
|---|---|---|---|
| **APScheduler** | 3.x | Scheduled jobs (cron-like) | Simple, battle-tested. Used for daily/hourly/weekly scheduled jobs |
| **FastAPI BackgroundTasks** | built-in | Event-driven async tasks | For per-request async jobs (audit writes, notification dispatch) |

> **Rule:** APScheduler runs in the **Worker Service** (separate process). FastAPI BackgroundTasks run in the **API Service process**. Never use APScheduler in the API process.

### HTTP Client (for external integrations)
| Library | Version | Purpose |
|---|---|---|
| **httpx** | 0.27+ | Async HTTP client for Zoho, Employee DB, Teams, OneDrive, Keycloak Admin API |

### Auth / Security
| Library | Version | Purpose |
|---|---|---|
| **python-jose** | 3.x | JWT decode and validation |
| **cryptography** | 42+ | JWT signature verification (RS256) |

### File Handling / Export
| Library | Version | Purpose |
|---|---|---|
| **openpyxl** | 3.x | Excel (.xlsx) read/write for reports and attendance import |
| **weasyprint** OR **reportlab** | latest | PDF report generation (decide before Phase 7) |
| **python-multipart** | 0.0.9+ | File upload handling in FastAPI |

### Testing
| Library | Version | Purpose |
|---|---|---|
| **pytest** | 8.x | Test runner |
| **pytest-asyncio** | 0.23+ | Async test support |
| **httpx** | 0.27+ | Test client for FastAPI (AsyncClient) |
| **factory-boy** | 3.x | Test data factories |
| **pytest-cov** | 4.x | Code coverage |

### Utilities
| Library | Version | Purpose |
|---|---|---|
| **python-dotenv** | 1.x | .env file loading in development |
| **structlog** | 24.x | Structured JSON logging |
| **uuid** | built-in | UUID4 generation for all PKs |
| **email-validator** | 2.x | Email validation in Pydantic schemas |

---

## FRONTEND STACK

### Core Framework
| Library | Version | Purpose | Decision |
|---|---|---|---|
| **React** | 18.x | UI framework | Concurrent rendering, hooks |
| **TypeScript** | 5.x | Type safety | Strict mode enabled |
| **Vite** | 5.x | Build tool & dev server | Fastest dev server; replaces CRA |

### Routing
| Library | Version | Purpose |
|---|---|---|
| **React Router** | v6.x | Client-side routing | Nested routes, loader pattern |

### Auth
| Library | Version | Purpose | Decision |
|---|---|---|---|
| **keycloak-js** | 24.x | Keycloak PKCE adapter | Official Keycloak JS library; manages token lifecycle |

> **Token Storage Rule:** Keycloak JS adapter stores tokens in memory internally. Never extract and manually store the token in localStorage, sessionStorage, or cookies.

### HTTP Client
| Library | Version | Purpose |
|---|---|---|
| **axios** | 1.x | HTTP requests to backend API |

> **Axios Instance Rule:** One shared Axios instance (`src/api/client.ts`) with interceptors for: Authorization header injection, X-Correlation-ID injection, 401 handler (trigger Keycloak refresh).

### Server State (API data fetching/caching)
| Library | Version | Purpose | Decision |
|---|---|---|---|
| **TanStack Query (React Query)** | v5.x | Server state management | All GET calls use `useQuery`. All mutations use `useMutation`. Handles loading, error, cache invalidation. |

### Client State (UI state)
| Library | Version | Purpose | Decision |
|---|---|---|---|
| **Zustand** | 4.x | Global UI state | Lightweight. Use for: auth user context, notification count, UI preferences. NOT for server data (that's React Query). |

### UI Component Library
| Library | Version | Purpose | Decision |
|---|---|---|---|
| **Ant Design (antd)** | v5.x | Component library | User-chosen library. Prototype HTML uses Bootstrap 5 styling — match colors/spacing by customizing the Ant Design theme token config. |
| **bootstrap-icons** | 1.11.x | Icon set | Used in all 27 prototype HTML files — must use same icons in React for visual consistency. |

### Forms
| Library | Version | Purpose |
|---|---|---|
| **React Hook Form** | 7.x | Form state management |
| **Zod** | 3.x | Schema validation (used with React Hook Form) |

> **Form Rule:** Every form uses React Hook Form + Zod. Never use uncontrolled inputs or custom form state with useState.

### Testing
| Library | Version | Purpose |
|---|---|---|
| **Vitest** | 1.x | Unit test runner (Vite-native) |
| **React Testing Library** | 14.x | Component testing |
| **Playwright** | 1.x | End-to-end testing |
| **MSW (Mock Service Worker)** | 2.x | API mocking in tests |

### Utilities
| Library | Version | Purpose |
|---|---|---|
| **date-fns** | 3.x | Date formatting and manipulation |
| **xlsx** | 0.18+ | Client-side Excel file generation (for report exports) |
| **react-dropzone** | 14.x | File drag-and-drop (attendance Excel import) |

---

## INFRASTRUCTURE STACK

| Component | Technology | Version | Purpose |
|---|---|---|---|
| **API Gateway** | APISIX | 3.x | JWT validation, routing, rate limiting, TLS termination |
| **Identity Provider** | Keycloak | 24.x | SSO, PKCE auth, role management |
| **Federation** | Azure AD | — | Federated into Keycloak |
| **Container** | Docker | 25.x | Containerization |
| **Orchestration** | Docker Compose | v2.x | Local dev + on-premise deployment |
| **Database** | PostgreSQL | 15 | Primary data store |
| **File Storage** | Microsoft OneDrive | Graph API v1.0 | Training resource storage (LMS stores only metadata) |
| **Meeting** | Microsoft Teams | Graph API v1.0 | Session online meetings + attendance |
| **Email** | SMTP | — | Notification email delivery (configurable host) |

---

## KEY TECHNOLOGY DECISIONS (Final — Do Not Re-debate)

| Decision | Choice | Reason |
|---|---|---|
| Python ORM style | SQLAlchemy 2.x `mapped_column()` declarative | Modern async-first approach |
| Scheduled jobs lib | APScheduler (not Celery/RQ) | Lower complexity; no Redis dependency needed |
| Frontend state splits into two | Zustand (UI) + React Query (server data) | Clear separation of concerns |
| Form library | React Hook Form + Zod | Best performance + type-safe validation |
| Frontend UI library | **Ant Design v5** | User's stated choice. Prototype uses Bootstrap 5 HTML — replicate look by customizing Ant Design theme tokens. |
| Excel generation | openpyxl (backend) | Server-side export is more reliable |
| PDF generation | Decide before Phase 7 | weasyprint (HTML→PDF) or reportlab (programmatic) |
| Search engine | PostgreSQL FTS only | No Elasticsearch — on-prem simplicity |
| No message broker | No Redis / RabbitMQ / Kafka | APScheduler + FastAPI BackgroundTasks sufficient for scale |
| No WebSocket | Polling for notifications | <1000 users; polling every 30s is acceptable |
