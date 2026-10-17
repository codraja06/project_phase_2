# Features 4–6 and adaptive UI verification

Implemented and verified locally on 17 October 2026 in the existing CivicTrack project.
The prior severity, priority and citizen-approved-description features remain integrated.
No replacement frontend/backend, database reset, new runtime dependency, or new production
service was introduced. Existing authentication and uncommitted user changes were preserved.

## Changes

| Area | Main files | Result |
| --- | --- | --- |
| Independent models | `ai-service/models/registry.json`, `app/detector.py`, `app/main.py`, `app/config.py`, `app/schemas.py` | Separate paths, enable flags and thresholds; actual-class category routing; automatic mode; missing/error/partial-failure states; EXIF orientation normalization and actual pixel boxes. |
| Detection integration | `backend/src/controllers/aiController.ts`, `routes/aiRoutes.ts`, `services/aiService.ts`, `mobile/src/api/aiApi.ts`, `screens/citizen/ReportIssueScreen.tsx` | Authenticated model availability, category selection, actual model IDs/warnings, clear manual fallback. Existing signed evidence and photo binding remain in use. |
| Citizen assistance | `backend/src/models/Conversation.ts`, `services/civicAssistantService.ts`, `controllers/chatController.ts`, `routes/chatRoutes.ts`, `mobile/src/api/chatApi.ts`, `screens/citizen/CivicAssistantScreen.tsx` | Secure configurable provider adapter, bounded private conversation history, validated civic intents, factual local replies, owned complaint lookup, loading/error/retry/empty states and explicit provider-unavailable fallback. |
| Analytics | `backend/src/services/analyticsService.ts`, `controllers/analyticsController.ts`, `controllers/authorityController.ts`, `services/triageService.ts`, `mobile/src/components/AuthorityInsights.tsx` | MongoDB aggregation of real counts, status/category distribution, trends, valid geographic cells, recent reports, date/search/status/category filtering, metric navigation and paginated complaint lists. Mongo and TypeScript share the versioned priority policy. |
| Adaptive shell | `mobile/src/components/WorkspaceShell.tsx`, `PrimaryTabBar.tsx`, `AdaptiveGrid.tsx`, `navigation/*`, `hooks/useBreakpoint.ts` | Mobile primary navigation capped at five; tablet rail; desktop sidebar/header; details remain in the workspace; role-specific navigation; citizen map route. |
| Design and screen updates | `mobile/src/theme/*`, `constants/theme.ts`, `utils/webStyles.web.ts`, existing citizen/auth/authority screens and shared components | Green/blue semantic palette, consistent surfaces/type/spacing, wide report evidence/form panes, responsive lists/details/profile/notifications, focused charts, readable data alternatives and visible keyboard focus. |
| Maps and evidence | `mobile/src/components/MapSurface*.tsx`, `DetectionOverlay.tsx`, detail screens | Named map markers, text-safe popups, correctly measured overlay area, keyboard-scrollable details, and evidence/map layouts that fit the available content area. |

Design decisions and reference links are in `DESIGN.md`. UI/UX Pro Max's installed skill,
local design-system search, React Native search and accessibility checklist were used.
No suggested marketing-page structure was copied into the application.

## Tests actually run

| Command/check | Result |
| --- | --- |
| `backend`: `npm run build` | Passed |
| `backend`: `npm test -- --silent` | **8 suites / 39 tests passed** |
| `ai-service`: `venv/Scripts/python.exe -m pytest -q` | **18 tests passed**; two existing framework deprecation warnings |
| `mobile`: `npm run type-check` | Passed |
| `mobile`: `npm exec --offline -- expo export --platform android --platform web --output-dir dist-phase2 --max-workers 2` | Passed for Android and web; generated output is Git-ignored |
| Existing `npm run test:e2e` against the local web build | Passed: 108 authentication, 27 dashboard and 351 route/viewport checks; dashboard search/date/empty/error recovery; six existing profile/complaint/map workflow groups |
| `node tests/e2e/adaptive-live.cjs` | Passed against real Express/MongoDB: **144 route/viewport checks**, plus 18 short landscape checks; nine targeted Axe WCAG 2 A/AA scans with zero violations; zero browser runtime errors |
| `node tests/e2e/phase2-live.cjs` | Passed against actual FastAPI/YOLO/Express/MongoDB: eight integration groups including model routing, missing models, image submission, description editing, persistence, priority, manual fallback and explicit authority status changes |
| Real bounding-box alignment | Within **2 pixels** at all eight requested widths after resize/layout settles |
| Keyboard navigation | Mobile authority menu opens with Enter and closes with Escape |
| `git diff --check` | Passed |

Requested widths tested: **320, 375, 430, 768, 1024, 1280, 1440, 1920px**. The existing
test suite additionally covers more widths and short screens. Tests used reduced motion.
The live matrix covers login/registration, both workspaces, report/history/details, maps,
notifications, assistance, analytics and profiles. Accessibility scans cover the three
authentication pages, assistance, analytics, both profiles and both complaint-detail pages;
the existing dashboard accessibility scan also passed. This is scoped automated evidence,
not a claim of complete accessibility certification.

The existing browser regression suite uses clearly isolated API fixtures. The two live
scripts use actual backend services and MongoDB; the inference script uses the four
existing trained weights and a real existing photo. Backend provider tests use a local
HTTP contract server, not a commercial model. No mock data is added to production screens.

Live services ran on test ports 5052/8052/8083 with the separate
`civictrack_phase2_e2e` local database. Backend Jest tests force
`civictrack_isolated_test`. Each live script cleans up only its own account/conversation/
complaint documents. Application complaint records were not migrated, reseeded or deleted.
User-started development services on other ports were preserved.

## Configuration limits

- The four existing models load and real category-specific pothole/garbage inference was
  exercised. `best_road.pt` actually exposes **Pothole only**. A dedicated road-damage model
  and compatible streetlight/water-leakage weights are absent. Requests for those categories
  return an explicit unavailable-model response; manual reporting still works.
- No real external AI provider was configured. The secure provider adapter and local HTTP
  contract are tested; the current UI clearly labels built-in guide fallback. Configure
  and test a provider before describing AI-backed assistance as operational.
- YOLO and severity accuracy were not evaluated against a labeled dataset. Integration
  tests establish behavior, not prediction accuracy. Severity remains experimental.
- Android bundle export passed. Physical Android/iOS devices, native text scaling and a
  hosted production deployment were not tested. External map tiles require network access.

See `ai-service/models/MODEL_CONFIGURATION.md` for enabling/training/evaluating additional
models and `docs/CIVIC_ASSISTANCE.md` for provider configuration and privacy behavior.

## Running the existing project

Use three terminals, each in the indicated existing directory:

```powershell
# D:\project phase 2\project1\ai-service
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000

# D:\project phase 2\project1\backend
npm run dev

# D:\project phase 2\project1\mobile
npm run web
# Use npm start for the Expo mobile development workflow.
```

Existing `MONGODB_URI`, `JWT_SECRET`, `AI_SERVICE_URL`, image storage, OAuth and
`EXPO_PUBLIC_API_URL` configuration remains in place. Restart existing services after code
or environment changes. Provider keys belong only in backend configuration.

Evidence is saved in `mobile/tests/artifacts/redesign/results.json`, the adjacent PNGs,
`mobile/tests/artifacts/phase2-live-results.json`, and the existing regression result files.
The temporary test servers were stopped after verification; they are not a deployment.
