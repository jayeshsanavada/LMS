# Auth & Access — API Specification

---

## 1. Common Conventions

### Base Path
```
/api/v1
```

### Authentication
- All endpoints require a valid JWT Bearer token except where noted
- Token validated by APISIX gateway and again by backend middleware
- Token extracted from: `Authorization: Bearer <token>`
- Roles extracted from JWT claim: `realm_access.roles`
- Token `aud` claim must include the LMS Keycloak client ID — tokens for other clients rejected
- External system integrations (e.g. PES) use Keycloak client credentials grant (OAuth2 `client_credentials` flow) — not user tokens
- Session idle timeout: 30 minutes (configured in Keycloak realm settings)
- Concurrent sessions from multiple devices permitted in Phase 1

### Correlation ID
- Every request must include `X-Correlation-ID` header
- If not present, middleware generates a UUID v4 and attaches it
- All responses echo back the correlation ID in `X-Correlation-ID` response header

### Standard Response Envelope
```json
{
  "success": true,
  "data": {},
  "message": null,
  "errors": []
}
```

### Error Response
```json
{
  "success": false,
  "data": null,
  "message": "Human-readable message",
  "errors": [
    {
      "code": "ERROR_CODE",
      "detail": "Technical detail"
    }
  ]
}
```

### Authorization Notation
- `ADMIN` / `HR` / `EMPLOYEE` — global roles from `realm_access.roles`
- Manager capability is **not a role** — derived from `user_hierarchy` table at runtime
- `SELF_ONLY` — access limited to own data
- `TEAM_ONLY` — access limited to reporting hierarchy
- `ORG_WIDE` — access across all users

---

## 2. Endpoints

---

### 2.1 Get Current Session User

**Endpoint**
```
GET /api/v1/auth/me
```

**Purpose**
Returns the LMS user context for the currently authenticated user. Called on every app bootstrap, header rendering, and dashboard routing.

**Access**
- Any authenticated user (valid JWT required)

**Headers**
```
Authorization: Bearer <token>
X-Correlation-ID: <uuid>
```

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "employee_id": "EMP-001",
    "full_name": "Jane Smith",
    "email": "jane@company.com",
    "global_role": "EMPLOYEE",
    "is_active": true,
    "hierarchy": {
      "manager_user_id": "uuid",
      "has_direct_reports": true
    },
    "policy_acceptance": {
      "accepted": true,
      "accepted_version": "v1",
      "current_version": "v1",
      "requires_re_acceptance": false
    }
  },
  "message": null,
  "errors": []
}
```

**Error Responses**

| HTTP | Error Code | Condition |
|---|---|---|
| 401 | `AUTH_TOKEN_INVALID` | Token signature or issuer invalid |
| 401 | `AUTH_TOKEN_EXPIRED` | Token expiry time has passed |
| 401 | `USER_NOT_PROVISIONED` | Token valid but user not found in LMS (not synced from Zoho) |
| 403 | `USER_DEACTIVATED` | User exists but is marked inactive |

**Side Effects**
- Audit event `AUTH_LOGIN_SUCCESS` emitted on first call after new token issuance

---

### 2.2 Accept Policy

**Endpoint**
```
POST /api/v1/auth/policy-acceptance
```

**Purpose**
Records the authenticated user's acceptance of the current active policy version. Called on first login or when policy version has changed since last acceptance.

**Access**
- Any authenticated user + SELF_ONLY

**Headers**
```
Authorization: Bearer <token>
X-Correlation-ID: <uuid>
Content-Type: application/json
```

**Request Body**
```json
{
  "policy_version": "v1"
}
```

**Validation Rules**
- `policy_version` must match the current active version from `admin_settings`
- User must be authenticated and active
- Submitting an already-accepted version for the same user is idempotent (no error)

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "policy_version": "v1",
    "accepted_at": "2026-04-06T10:00:00Z"
  },
  "message": "Policy accepted successfully.",
  "errors": []
}
```

**Error Responses**

| HTTP | Error Code | Condition |
|---|---|---|
| 400 | `POLICY_VERSION_MISMATCH` | Submitted version does not match current active version |
| 401 | `AUTH_TOKEN_INVALID` | Invalid or missing token |
| 403 | `USER_DEACTIVATED` | User is deactivated |

**Side Effects**
- Updates `users.policy_accepted_version` and `users.policy_accepted_at`
- Audit event `AUTH_POLICY_ACCEPTED` emitted

---

### 2.3 Logout

**Endpoint**
```
POST /api/v1/auth/logout
```

**Purpose**
Records logical LMS logout and emits the audit event. Frontend then redirects to Keycloak logout endpoint to terminate the identity session. The LMS backend does not manage the Keycloak session directly.

**Access**
- Any authenticated user

**Headers**
```
Authorization: Bearer <token>
X-Correlation-ID: <uuid>
```

**Request Body**
None

**Response: 200 OK**
```json
{
  "success": true,
  "data": {
    "keycloak_logout_url": "https://keycloak.company.com/realms/lms/protocol/openid-connect/logout"
  },
  "message": "Logged out successfully.",
  "errors": []
}
```

**Side Effects**
- Audit event `AUTH_LOGOUT` emitted
- Frontend must redirect to `keycloak_logout_url` to terminate the Keycloak session

**Note**
Token invalidation is Keycloak's responsibility. The LMS does not maintain a token blacklist.

---

### 2.4 Service Account Token Validation (Machine-to-Machine)

> This is not a standalone endpoint. It describes how external systems authenticate.

**Flow**
1. External system (e.g. PES) requests a token from Keycloak using client credentials:
```
POST https://keycloak.company.com/realms/lms/protocol/openid-connect/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_id=pes-service-account
&client_secret=<secret>
```
2. Keycloak returns a JWT access token
3. External system calls LMS API with `Authorization: Bearer <token>`
4. LMS middleware validates token identically to user tokens (signature, expiry, issuer, audience)
5. Service account identified by `client_id` in token — granted `INTEGRATION` scoped access only

**Access Control**
- Service account tokens may only access endpoints explicitly permitted for `INTEGRATION` role
- Calling user-scoped endpoints with a service account token → 403 `ACCESS_DENIED`

---

## 3. Auth Event Codes Reference

| Event Code | Trigger | HTTP Context |
|---|---|---|
| `AUTH_LOGIN_SUCCESS` | Valid token + user found + active | GET /auth/me (first call) |
| `AUTH_LOGIN_FAILURE` | Keycloak rejected credentials | Outside LMS (Keycloak-side) |
| `AUTH_TOKEN_INVALID` | Token signature/issuer fails | Any protected endpoint |
| `AUTH_TOKEN_EXPIRED` | Token expiry check fails | Any protected endpoint |
| `AUTH_LOGOUT` | POST /auth/logout called | POST /auth/logout |
| `AUTH_ACCESS_DENIED` | Authorization check fails | Any protected endpoint |
| `AUTH_POLICY_ACCEPTED` | Policy acceptance recorded | POST /auth/policy-acceptance |
| `USER_NOT_PROVISIONED` | Token valid, user not in LMS DB | GET /auth/me |
| `USER_DEACTIVATED` | User is_active = false | Any protected endpoint |

---

## 4. Cross-Check Notes

Verified against:
- `01_Authentication.md` — all functional requirements covered including enterprise additions (A1–A5)
- `01_api_list.md` §6 — all 3 endpoints present; service account flow, audience validation, inactivity timeout, and concurrent session policy added
- `02_database_schema.md` §5.2 — schema tables align with data written/read by these endpoints

**Additions vs original:**
- Token `aud` validation requirement (A5)
- Service account / client credentials authentication flow documented (A2)
- Concurrent session policy stated (A1)
- Session inactivity timeout defined (A3)
- Admin impersonation explicitly out of scope for Phase 1 (A4)
