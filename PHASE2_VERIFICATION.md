# Phase 2 implementation and verification

Verified locally on 17 October 2026. The existing project now includes exactly the three
requested feature additions: detection-derived severity estimates, complaint prioritization,
and descriptions generated from actual image detections.

## Implementation map

| Area | Main files | Behavior |
| --- | --- | --- |
| AI analysis | `ai-service/app/assessment.py`, `main.py`, `schemas.py` | Versioned experimental severity rules, evidence/uncertainty, and grounded description generation alongside unchanged YOLO detection. |
| Storage and validation | `backend/src/models/Complaint.ts`, `validators/complaintValidator.ts` | Optional structured assessment and priority metadata; citizen-approved description retained in the existing field; signed evidence inputs validated. |
| API integration | `backend/src/controllers/aiController.ts`, `uploadController.ts`, `complaintController.ts`, `services/aiService.ts` | User-bound signed analysis matched to uploaded image bytes and URL; final edited description and service evidence stored in MongoDB. |
| Priority | `backend/src/services/triageService.ts`, `controllers/authorityController.ts` | Severity/category/age scoring, priority filtering and sorting, current scores on reads, resolved complaints removed from attention scoring. |
| Citizen interface | `mobile/src/screens/citizen/ReportIssueScreen.tsx`, `ComplaintDetailScreen.tsx`, `components/DescriptionEditor.tsx` | Experimental severity, editable/restorable AI draft, manual fallback, and final review before submission. |
| Authority interface | `mobile/src/screens/authority/AuthorityComplaintsScreen.tsx`, `AuthorityDashboardScreen.tsx`, `AuthorityDetailScreen.tsx`, `components/ComplaintCard.tsx`, `TriageSummary.tsx` | Severity/priority badges, approved descriptions, independent priority filters and sort controls. |
| Client contracts | `mobile/src/api/aiApi.ts`, `authorityApi.ts`, `types/ai.ts`, `types/complaint.ts` | Actual backend fields and signed upload/analysis evidence pass through the existing API client. |

The four existing YOLO weights were copied unchanged from the local Phase 1 checkout into
the Phase 2 checkout's expected model directories. No replacement models were downloaded.
They remain Git-ignored and need separate deployment provisioning.

## Checks completed

| Check | Result |
| --- | --- |
| Backend `npm run build` | Passed |
| Backend `npm test -- --silent` | 7 suites, 33 tests passed |
| Python `venv/Scripts/python.exe -m pytest -q` | 13 tests passed; existing framework deprecation warnings |
| Mobile `npm run type-check` | Passed |
| Existing `node tests/e2e/flows.cjs` | All 6 workflow groups passed; no browser runtime errors. Uses isolated API fixtures. |
| `node tests/e2e/phase2-live.cjs` | All 6 integration groups passed against real services; no API mocks and no browser runtime errors. |
| Responsive live checks | 320×568, 768×1024, 1440×900; no document horizontal overflow |
| `git diff --check` | Passed |

The live test used Express on port 5052, FastAPI on 8052 with all four YOLO models loaded,
and the Expo web app on 8081. It verified:

1. Real photo upload and YOLO inference produce severity evidence and a detection-grounded draft.
2. The citizen edits the draft, confirms a valid southern-hemisphere coordinate, reviews the
   final text, and submits. MongoDB contains the approved text, original generated draft,
   matching severity/evidence, assessment timestamp, coordinates, and Pending status.
3. A real non-civic image produces no severity level or draft. Manual description/category
   entry still submits successfully.
4. An aged low-severity unresolved complaint receives High Priority through the actual API.
5. Authority dashboard/list/details display actual API data. Priority filters and sorting
   issue real backend requests, and layouts work at phone, tablet, and desktop widths.
6. Only explicit authority status requests progress/resolve a report. Resolved scores become zero.

Backend tests additionally cover forged evidence, wrong users, mismatched images,
client attempts to invent severity/priority, legacy records, persistence, and role guards.
Python assessment tests cover all three levels, low confidence, unsupported categories,
invalid boxes, non-finite confidence, empty detections, and mixed-category evidence.

The database tests used dedicated local test databases. The live test deletes its own
temporary accounts and complaint documents in its cleanup handler. No application complaint
records were migrated, reseeded, deleted, or used as test fixtures. Existing uncommitted
authentication/profile/authority changes were preserved.

## Evidence and limits

`mobile/tests/artifacts/phase2-live-results.json` contains the live workflow results.
`mobile/tests/artifacts/phase2-*.png` contains captured citizen review/details and authority
list/badge views. `README.md` documents configuration, scoring, tokens, fallback behavior,
legacy-data behavior, and deployment requirements.

Severity is an **unvalidated rule-based estimate derived from YOLO output**. The description
generator verbalizes those detections using deterministic rules. Image-space coverage
does not establish physical damage size. No severity accuracy, detection accuracy, or
language-model performance claim follows from these tests. Existing YOLO classification
errors can propagate into assessments and drafts; citizen review and authority verification
remain necessary. A labeled severity evaluation remains future work.

Verification covered local services and Expo web; physical Android/iOS devices and hosted
production deployments were not tested. No new runtime dependencies or external services
were introduced for Phase 2. Temporary test servers were stopped after verification.
