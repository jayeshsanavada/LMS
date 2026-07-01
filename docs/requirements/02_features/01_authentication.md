# Feature: Authentication & Access Management (SSO via Keycloak)

---

# 1. Feature Overview

## Purpose

The Authentication feature enables secure access to the LMS using Single Sign-On (SSO) via Keycloak, integrated with Azure Active Directory.

The LMS does not manage user credentials. Instead, it relies entirely on Keycloak for identity verification and uses token-based authentication to authorize access to system resources.

This feature acts as the **secure entry layer of the LMS**, ensuring that all access is authenticated, validated, and controlled.

---

## Why Business Needs It

The organization requires:

* Centralized authentication across systems
* Elimination of password management within LMS
* Secure and standardized access control
* Seamless user login experience
* Alignment with enterprise identity policies

---

## Problems This Feature Solves

* Duplicate authentication systems
* Password security risks
* Inconsistent identity management
* Unauthorized system access
* Manual user credential handling

---

## Integration with Other LMS Modules

| Module          | Role                                    |
| --------------- | --------------------------------------- |
| User Management | Maps authenticated identity to LMS user |
| Authorization   | Applies role + hierarchy access         |
| Audit           | Logs authentication events              |
| Integrations    | Keycloak interaction                    |
| API Gateway     | Secures APIs (APISIX)                   |

---

# 2. Actors

## Employee / Manager / HR / Admin

* Authenticate via SSO
* Access LMS features based on authorization

---

## External Systems

### Keycloak

* Handles authentication
* Issues JWT tokens
* Manages global roles

---

### Azure AD

* Identity provider (via Keycloak federation)

---

# 3. Functional Overview

Authentication is fully delegated to Keycloak.

### Login Flow

User accesses LMS
→ Redirected to Keycloak
→ Authenticates via Azure AD
→ Keycloak issues JWT token
→ LMS validates token
→ LMS maps identity to user
→ Session established

---

### Session Model

* Stateless authentication using JWT
* Token validated on every request
* No password stored in LMS
* Session derived from token validity

---

### Logout Flow

User logs out
→ LMS clears session context
→ Redirects to Keycloak logout
→ Identity session terminated

---

# 4. Functional Requirements

## SSO Authentication

* LMS must redirect all unauthenticated users to Keycloak
* No local login mechanism allowed
* Authentication handled only via Azure AD (through Keycloak)

---

## Token Validation

* JWT token required for all protected APIs
* Token must be validated for:

  * Signature
  * Expiry
  * Issuer
  * Audience (`aud` claim must include the LMS Keycloak client ID — tokens issued for other clients in the same realm must be rejected)

Invalid token → access denied

---

## Service Account Authentication (Machine-to-Machine)

* External systems (e.g. PES) that call LMS APIs authenticate using Keycloak client credentials grant (OAuth2 `client_credentials` flow)
* A dedicated Keycloak service account is provisioned per integration (e.g. `pes-service-account`)
* Service account tokens are validated by the LMS the same way as user tokens (signature, expiry, issuer, audience)
* Service accounts are assigned a specific LMS role (e.g. `INTEGRATION`) to scope their access
* Service account tokens do not carry `realm_access.roles` for ADMIN/HR/EMPLOYEE — they are identified by client ID in the token

---

## Concurrent Session Policy

* Concurrent sessions from multiple devices/browsers are permitted in Phase 1
* Keycloak session limits are not enforced
* Each device/browser maintains its own independent token and refresh cycle

---

## Session Inactivity Timeout

* Keycloak SSO session idle timeout is configured to 30 minutes
* If user is inactive for 30 minutes the refresh token expires and the user must re-login
* Active users (making requests) are never timed out regardless of session age
* Timeout value is configurable via Keycloak realm settings — not hardcoded in LMS

---

## User Mapping

* Token identity must map to LMS user
* User must exist (via Zoho sync)

IF user not found:
→ Access denied
→ Admin intervention required

---

## Session Management

* Session validity tied to token
* Frontend must silently refresh the access token using the Keycloak refresh token before expiry
* Hard re-login required only when the refresh token itself expires (typically 30 days)
* No server-side session persistence required

---

## Token Refresh Strategy

* Frontend uses Keycloak JS adapter with PKCE flow
* Silent token refresh is handled by Keycloak JS adapter directly to Keycloak — no LMS backend endpoint needed
* Token stored in memory only (not localStorage or cookies)
* APISIX validates the JWT on every request but does not manage the OIDC redirect

---

## OIDC Flow (Frontend)

* React frontend uses Keycloak JS adapter (keycloak-js) with PKCE flow
* Keycloak redirect and callback handled entirely by the frontend adapter
* No `/auth/callback` endpoint required in the LMS FastAPI backend
* Frontend passes token as `Authorization: Bearer <token>` on every API call

---

## JWT Role Claim

* Global roles are extracted from the JWT claim `realm_access.roles`
* The backend auth middleware must read this claim path for all role-based checks
* Valid LMS roles in this claim: `ADMIN`, `HR`, `EMPLOYEE`
* If no recognized LMS role is present → default to `EMPLOYEE`
* Keycloak internal admin roles (e.g. `realm-management`) must be ignored

---

## Authorization Integration (CRITICAL)

Authentication only verifies identity.

Authorization is enforced separately using:

* Global roles → from Keycloak
* Hierarchy → from Employee DB

---

## Policy Acceptance Handling

On every successful login:

* System compares `users.policy_accepted_version` against the current active policy version (stored in `admin_settings`)
* IF versions do not match → redirect to policy acceptance screen before granting access
* IF accepted → update `users.policy_accepted_version` and `users.policy_accepted_at`
* Access is blocked until acceptance is recorded

---

## Logout Handling

* Clear local token/session
* Redirect to Keycloak logout endpoint
* Ensure no residual session remains

---

## Error Handling

System must handle:

* Keycloak unavailable → login blocked
* Azure AD failure → no LMS session created
* Invalid token → 401, error code `AUTH_TOKEN_INVALID`, audit logged
* Expired token → 401, error code `AUTH_TOKEN_EXPIRED`, redirect to login
* User not provisioned (not synced from Zoho) → 401, error code `USER_NOT_PROVISIONED`, message: "Account not provisioned. Contact admin."
* User deactivated → 403, error code `USER_DEACTIVATED`, message: "Your account has been deactivated."

Note: `USER_NOT_PROVISIONED` and `USER_DEACTIVATED` must return distinct status codes and error codes so support can diagnose the issue from logs.

---

## Correlation ID

* Auth middleware must generate a UUID v4 correlation ID on every incoming request
* If the request already carries an `X-Correlation-ID` header, use that value; otherwise generate a new one
* Attach the correlation ID to the request context
* All audit log entries and downstream service calls for that request must include the correlation ID

---

## API Security (APISIX Integration)

* All APIs protected via APISIX
* Token required at gateway level
* Unauthorized requests blocked before reaching LMS

---

## Admin Impersonation

* Admin impersonation (acting as another user) is not supported in Phase 1
* Admins diagnose user issues via audit logs and the admin user detail screen
* May be enabled via Keycloak in Phase 2 if business requires it

---

## Audit Logging

System must log the following events with defined minimum data:

| Event | event_code | Minimum Data Captured |
| ----- | ---------- | --------------------- |
| Login success | `LOGIN_SUCCESS` | user_id, keycloak_user_id, ip_address, correlation_id, timestamp |
| Login failure | `LOGIN_FAILED` | keycloak_user_id (if available), failure_reason, ip_address, correlation_id, timestamp |
| Token invalid | `TOKEN_INVALID` | token_fragment (first 8 chars), failure_reason, endpoint, correlation_id, timestamp |
| Token expired | `TOKEN_EXPIRED` | user_id, endpoint, correlation_id, timestamp |
| Logout | `LOGOUT` | user_id, correlation_id, timestamp |
| Access denied | `ACCESS_DENIED` | user_id, endpoint, denial_reason, denial_code, correlation_id, timestamp |
| Policy accepted | `POLICY_ACCEPTED` | user_id, policy_version, correlation_id, timestamp |

---

# 5. Business Rules

BR-01 LMS must not store passwords
BR-02 Authentication must use Keycloak
BR-03 Azure AD is identity source
BR-04 Token must be validated on every request
BR-05 Unauthorized users must be denied access
BR-06 Authentication is separate from authorization
BR-07 Manager is NOT a role (derived from hierarchy)
BR-08 Global roles extracted from JWT claim `realm_access.roles`
BR-09 Token stored in memory only on frontend — not in localStorage or cookies
BR-10 Policy acceptance must be re-checked on every login against current active policy version
BR-11 USER_NOT_PROVISIONED and USER_DEACTIVATED must return distinct HTTP status codes and error codes
BR-12 Every request must carry a correlation ID (X-Correlation-ID) for traceability
BR-13 `authorization_policies` table is managed by Admin module — Auth module reads only
BR-14 JWT `aud` claim must be validated — tokens for other Keycloak clients must be rejected
BR-15 External integrations (e.g. PES) must use Keycloak client credentials grant — not user tokens
BR-16 Concurrent sessions from multiple devices are permitted in Phase 1
BR-17 Session idle timeout is 30 minutes — configurable in Keycloak realm settings
BR-18 Admin impersonation is not supported in Phase 1

---

# 6. Workflows

## Login Flow

User accesses LMS
→ Redirect to Keycloak
→ Authentication
→ Token issued
→ Token validated
→ User mapped
→ Access granted

---

## Token Validation Flow

API request received
→ Token validated
→ Authorization evaluated
→ Request processed

---

## Token Expiry Flow

User makes request
→ Token expired
→ Access denied
→ Redirect to login

---

## Logout Flow

User logs out
→ Session cleared
→ Keycloak logout
→ Redirect to login

---

## Access Denied Flow

User attempts restricted action
→ Authorization check fails
→ Access denied
→ Audit logged

---

# 7. Data Rules

## Data Ownership

| System   | Data                           |
| -------- | ------------------------------ |
| Keycloak | Authentication                 |
| Azure AD | Identity                       |
| LMS      | User mapping + session context |

---

## Data Storage

* No password stored
* Token handled securely
* Minimal session data retained

---

## Identifiers

* User ID
* Token ID
* Session ID (logical)

---

# 8. Edge Cases

## Keycloak Unavailable

* Login not possible
* System access blocked

---

## Token Expired

* Access denied
* Re-login required

---

## Invalid Token

* Request rejected
* Audit logged

---

## User Not Provisioned (Not Synced)

* HTTP 401, error code `USER_NOT_PROVISIONED`
* Message: "Account not provisioned. Contact admin."
* Admin must trigger Zoho/Employee DB sync to resolve

---

## User Deactivated After Login

* HTTP 403, error code `USER_DEACTIVATED`
* Message: "Your account has been deactivated."
* Access revoked on next request — no logout of active session required, denied on next API call

---

## Hierarchy Changed After Login

* Authorization recalculated dynamically
* No logout required

---

## Service Account Token Misuse

* If a service account token (client credentials) is used to call a user-scoped endpoint → 403 ACCESS_DENIED
* Service accounts may only access endpoints explicitly permitted for their role (e.g. `INTEGRATION`)

---

## Inactivity Timeout During Active Work

* If user is actively making requests, refresh token idle timer resets on each request
* User is only timed out if genuinely idle for 30 minutes

---

# 9. Acceptance Criteria

* User can login via Keycloak SSO
* Token validation works correctly (signature, expiry, issuer, audience)
* Unauthorized users cannot access LMS
* Logout clears session and redirects to Keycloak logout
* No password stored in LMS
* Role + hierarchy authorization enforced
* API gateway blocks unauthorized requests
* Audit logs generated for all auth events with defined event codes and data fields
* PES service account authenticates via client credentials grant successfully
* Session idle timeout enforced at 30 minutes via Keycloak
* Concurrent sessions from multiple devices work correctly
* Tokens issued for other Keycloak clients are rejected

---

# 10. Dependencies

* Keycloak
* Azure AD
* User Management (user lookup, policy version check)
* Employee DB (hierarchy context in /auth/me response)
* APISIX API Gateway
* Audit module (receives auth events)
* Admin module (owns `authorization_policies` table — Auth reads from it)

---

# 11. Assumptions

* SSO mandatory
* Users pre-synced via Zoho
* Hybrid authorization model
* On-prem deployment
* JWT-based authentication

---

# 12. Future Enhancements

* Multi-factor authentication (via Keycloak)
* Device/session tracking
* Risk-based authentication
* Session analytics

---

# End of Document