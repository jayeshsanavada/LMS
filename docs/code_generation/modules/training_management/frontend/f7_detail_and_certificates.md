# Sub-task F7: Training Detail Page + Resource Player + My Certificates Page
# Training Management — Frontend Layer 7 of 7

---

## Files to Read BEFORE Writing Code (in this order)

1. `docs/code_generation/modules/_shared.md` — useQuery, Ant Design v5, named exports, status badge colors
2. `docs/code_generation/modules/training_management/_module.md` — certificate states (PENDING_APPROVAL/APPROVED/REJECTED), BR-43–BR-46, resource access (BR-21), prerequisites (BR-06)
3. `docs/requirements/03_ux/02_screens.md` — Screen 9 (L516): Training Detail; Screen 10 (L570): Resource Player; Screen 30 (L1853): My Certificates
4. `docs/requirements/02_features/03_training_management.md` — §4 Resource Access Control, §4 Certificate Generation, Certificate Approval Flow
5. Prototype files:
   - `prototype/course-detail.html` — full Training Detail page
   - `prototype/certificate.html` — certificate card layouts (Approved/Pending/Rejected)

---

## Scope

**Generate (3 sub-sections, in order):**

### Section A — Training Detail Page
- Full training information: title, code, type, category, tags, difficulty
- Version info (current version number)
- Mandatory / approval-required badges
- Estimated duration
- Description
- Prerequisites list (with completion status per prerequisite — ✓ / ⏰)
- Resource list (title, type, duration, completion status per resource)
- Progress bar (shown if assignment exists)
- Due date + assignment status badge
- Certificate section (shown if training completed + issue_certificate = true)
- Linked sessions (upcoming) — if SESSION-type resource
- Action buttons (role-based): Start/Resume, Self-Enroll, Request Approval, Download Certificate, Assign (Admin/Manager), Publish/Inactivate (Admin)

### Section B — Resource Player / Resource Viewer
- Resource title
- Viewer area: video player (HTML5 video with OneDrive stream URL), PDF viewer (iframe or PDF.js), external link (opens in new tab)
- Progress indicator
- Next / Previous resource navigation
- Completion status indicator
- Error message panel (OneDrive unavailable)
- SCORM player: Phase 2 — show placeholder "SCORM content not available in Phase 1"
- Track progress: call `POST /api/v1/resources/{id}/progress` as user consumes content

### Section C — My Certificates Page
- Summary tiles: Total, Active, Pending Approval, Rejected
- Filter pills: All / Active / Pending Approval / Rejected
- Certificate cards grid (one per certificate):
  - **APPROVED** (Active): green ribbon; View, Download, Share buttons
  - **PENDING_APPROVAL**: amber ribbon; "Download will be available once admin approves" message; Download button = locked "Download Locked" indicator
  - **REJECTED**: red ribbon; rejection reason from admin; Re-attempt button (links to training in catalog/my-training)
- No EXPIRING / EXPIRED state — certificates do not expire (Screen 30 note)

---

## Pre-Code Declaration (REQUIRED before writing any code)

```
### PRE-CODE DECLARATION — F7 Detail + Certificates

#### Files Read
| File | Lines Read | Key Fact |
|---|---|---|
| _shared.md | all | useQuery; Ant Design Progress, Tag, Card |
| _module.md | all | BR-21 (assignment required for resource access); BR-06 (prerequisites); cert states |
| screens.md | Screen 9 (L516), Screen 10 (L570), Screen 30 (L1853) | all UI elements confirmed |
| 03_training_management.md | §4 Resource Access, §4 Cert Generation | confirmed no EXPIRED cert state |
| prototype | course-detail.html | training detail layout |
| prototype | certificate.html | 3 card states (green/amber/red) |

#### Training Detail Element Checklist
| Element | In Generated Code? |
|---|---|
| Training title, code, type, category | Yes |
| Difficulty badge | Yes |
| Mandatory badge | Yes |
| Requires approval badge | Yes |
| Version number | Yes |
| Estimated duration | Yes |
| Description | Yes |
| Prerequisites list (with completion indicator) | Yes |
| Resource list (with completion status per resource) | Yes |
| Progress bar (if enrolled) | Yes |
| Due date + assignment status badge | Yes |
| Certificate section (if completed + issue_certificate=true) | Yes |
| Start/Resume button | Yes |
| Self-Enroll button (if not enrolled, requires_approval=false) | Yes |
| Request Approval button (if not enrolled, requires_approval=true) | Yes |
| Download Certificate button (if APPROVED) | Yes |
| Admin: Publish / Inactivate buttons | Yes |
| Manager: Assign button | Yes |

#### My Certificates Element Checklist
| Element | In Generated Code? |
|---|---|
| Summary tiles: Total / Active / Pending / Rejected | Yes |
| Filter pills | Yes |
| APPROVED card: green ribbon, View/Download/Share | Yes |
| PENDING_APPROVAL card: amber ribbon, locked download | Yes |
| REJECTED card: red ribbon, rejection reason, Re-attempt | Yes |
| No EXPIRING/EXPIRED state | Confirmed — omitted |

I confirm all files read. Beginning F7 code generation.
```

---

## API Calls

### Training Detail
```typescript
GET /api/v1/trainings/{training_id}              // training metadata
GET /api/v1/trainings/{training_id}/resources    // ordered resource list with progress status
GET /api/v1/trainings/{training_id}/structure    // for LP/Curriculum: nested structure
```

### Resource Player
```typescript
GET /api/v1/resources/{resource_id}              // get OneDrive stream URL (reference_url)
POST /api/v1/resources/{resource_id}/progress    // track progress
  Body: { assignment_id, status: "IN_PROGRESS"|"COMPLETED", progress_percent }
```

### My Certificates
```typescript
GET /api/v1/certificates/me                     // list own certificates
GET /api/v1/certificates/{id}/download          // download PDF (only when APPROVED)
```

## Certificate Card Colors (match prototype)

| Status | Card ribbon | Badge color |
|---|---|---|
| APPROVED | Green | `success` |
| PENDING_APPROVAL | Amber | `warning` |
| REJECTED | Red | `error` |

## Progress Tracking Logic

```typescript
// Video: track progress as percentage viewed
// Call POST /progress when progress_percent changes significantly (e.g. every 10%)
// Final call at 100% triggers course completion evaluation server-side

// PDF/Document: single call at time of open:
// POST /progress { status: "COMPLETED", progress_percent: 100 }

// External Link: on click:
// POST /progress { status: "COMPLETED", progress_percent: 100 }

// Assessment: handled by assessment endpoints (not by /progress endpoint)
// Session: handled by session attendance (not by /progress endpoint)
```

---

## Stop Point

```
✅ F7 Complete — Training Detail + Resource Player + My Certificates
Components: TrainingDetailPage, ResourcePlayer (video + PDF + link), MyCertificatesPage, CertificateCard (3 states)
API calls: trainings/{id}, resources/{id}, resources/{id}/progress, certificates/me, certificates/{id}/download

FRONTEND COMPLETE for Training Management. All 7 sub-tasks done (F1–F7).
Reply YES to signal review complete, or list items to fix.
```

**STOP. Training Management frontend generation is complete.**
