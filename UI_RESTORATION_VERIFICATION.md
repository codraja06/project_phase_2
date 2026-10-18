# Original CivicTrack UI restoration

## What was restored

The existing Phase 1 checkout at `D:/project phase 1/project1` (clean frontend,
Git HEAD `151ccd4`) contains the previous implementation. Its actual source and
`mobile/tests/dashboard-desktop.png` were inspected alongside this repository's history,
including `b74b27d` before the redesign. No separate application was created.

Restored the original citizen dashboard composition: greeting, citizen-account shield,
search, reporting hero with red action, pastel icon categories, activity overview and
recent complaints. Restored the circular leaf/building logo, original system typography,
red/pink accents, white sidebar/cards, neutral backgrounds and navy authority styling.
Removed the subsequently introduced photographic mastheads. Prior screen visual styles
were reused for authentication, history, profiles, complaint details, tables and headers.

Current responsive behavior remains: 260px desktop sidebar, tablet rail and mobile
bottom navigation. Citizen primary navigation follows the original five destinations;
Map and Civic Assistance remain available. Existing authority analytics, triage,
assignment, duplicate review, repair verification and status controls remain connected.
Authority KPIs use actual backend totals, pending, priority, active, progress and resolved
data. The added citizen summary cards use real own-report and unread-notification counts;
Nearby Issues is a map shortcut, not a fabricated nearby-complaint statistic. The citizen
badge denotes an authenticated account, not unrecorded government identity verification.

## Reference limitation

The six specifically named ChatGPT Library PNGs were not attached, were not found in the
local project/download/attachment search, and no tool access to the Library was established.
This restoration uses recovered source and the available local screenshot. It is a
compatible source-based restoration, not a full Git rollback or a claim of pixel-identical
matching against images that were not available. Original Phase 1 code was reused rather
than recreating the application from a static mockup.

## Scope and safeguards

No backend or AI source changes were made in this restoration. File hashes captured
before editing were compared afterward. Existing uncommitted Phase 2 backend/AI work
was preserved. Authentication handlers, Axios integrations, Mongoose models, YOLO
predictions, signed evidence and database records were not rolled back. No production
seed, migration, record deletion or status update was used for visual restoration.

A recoverable frontend snapshot was saved before changes:
`D:/project phase 2/project1-ui-before-restoration-2026-10-17.zip`.
The original Phase 1 checkout was read only. No new dependencies were installed.

## Actual verification

- Backend: `npm run build` and `npm test -- --silent` passed: **50 tests, 10 suites**.
- AI: `venv/Scripts/python.exe -m pytest -q` passed: **23 tests**, with the two existing
  FastAPI/Starlette and Pydantic deprecation warnings.
- Mobile: `npm run type-check` passed. Expo Android and web exports passed.
- Live app: `node tests/e2e/adaptive-live.cjs` passed **144 layout checks** across
  320, 375, 430, 768, 1024, 1280, 1440 and 1920 pixels, plus landscape. This includes
  all five requested widths. Nine sampled accessibility scans had no violations.
  Verified citizen/authority routes, actual analytics/list drill-down, private complaint
  lookup, provider-unavailable fallback and keyboard drawer behavior.
- Initial browser inspection found low-contrast legacy authority footer text, gray
  severity badges and selected amber chips. These were corrected within the original
  palette; a notifications heading was retained after removing the decorative banner.
- No lint command is configured in either package; no lint run is claimed.

Live operations also passed: eight workflow groups, 32 viewport checks and eight
accessibility scans. These verified department rules, manual reporting/duplicate warning,
adjacent map-cell navigation, duplicate confirmation, audited severity/priority changes,
repair review, explicit resolution, live notification delivery/read state and actual
department analytics. No browser runtime errors. The map test was corrected to inspect
adjacent geographic cells rather than assuming all nearby coordinates share one cell.

Actual real-photo inference also passed all eight integration groups against the
existing four YOLO weights: category-specific routing and unavailable-model fallbacks,
real boxes aligned within two pixels at all eight widths, generated-description editing
and approval, signed evidence/GPS persistence, non-civic/manual fallback, aged priority
escalation, real filters/sorting and explicit authorized resolution. No runtime errors.

The final `E2E_WEB_URL=http://localhost:8083 npm run test:e2e` run passed:
**108 authentication checks, 27 dashboard layouts, 351 route checks and six interaction
flows**, with no overflow/runtime errors and no dashboard accessibility violations.
Flows include profile save, password change, notification preferences, photo upload,
manual GPS, complaint creation/details, officer verification/progress/resolution and
opening a selected map report. These are explicitly mocked fixture tests, separate
from the actual-service operations and YOLO checks described above.

Results are stored under `mobile/tests/artifacts/ui-restoration/1792260430971/`, with
live results in `redesign/results.json`, `operations-live-results.json` and
`phase2-live-results.json` in the artifacts directory. A fresh actual-app screenshot
is `mobile/tests/artifacts/restored-citizen-1440.png`.

An initial fixture attempt encountered Windows UNKNOWN file-open errors when replacing
shared screenshots. The runner now writes into a unique directory per run; the complete
rerun passed. Test selectors were also scoped to visible sidebar controls when both
a dashboard action and navigation button had the same label. `git diff --check` passed.
Temporary services on 5052/8052/8083 were stopped afterward; existing application services
were left running. Browser test data is confined to isolated test databases. Fixture
responses are used only by the explicit test harness, never by application production code.

## Frontend files changed in this restoration

- `mobile/src/components/AuthorityHeader.tsx`
- `mobile/src/components/AuthorityInsights.tsx`
- `mobile/src/components/AuthoritySidebar.tsx`
- `mobile/src/components/CivicTrackLogo.tsx`
- `mobile/src/components/FilterChip.tsx`
- `mobile/src/components/MapLocationPicker.tsx`
- `mobile/src/components/MapSurface.tsx`
- `mobile/src/components/MapSurface.web.tsx`
- `mobile/src/components/NotificationCenter.tsx`
- `mobile/src/components/RequestError.tsx`
- `mobile/src/components/SkeletonLoader.tsx`
- `mobile/src/components/StatusBadge.tsx`
- `mobile/src/components/WorkspaceShell.tsx`
- `mobile/src/navigation/CitizenNavigator.tsx`
- `mobile/src/theme/colors.ts`
- `mobile/src/theme/typography.ts`
- `mobile/src/screens/auth/AuthorityLoginScreen.tsx`
- `mobile/src/screens/auth/CitizenLoginScreen.tsx`
- `mobile/src/screens/auth/CitizenRegisterScreen.tsx`
- `mobile/src/screens/auth/SplashScreen.tsx`
- `mobile/src/screens/authority/AuthorityComplaintsScreen.tsx`
- `mobile/src/screens/authority/AuthorityDashboardScreen.tsx`
- `mobile/src/screens/authority/AuthorityDetailScreen.tsx`
- `mobile/src/screens/authority/AuthorityMapScreen.tsx`
- `mobile/src/screens/authority/AuthorityProfileScreen.tsx`
- `mobile/src/screens/citizen/CitizenDashboardScreen.tsx`
- `mobile/src/screens/citizen/ComplaintDetailScreen.tsx`
- `mobile/src/screens/citizen/ComplaintHistoryScreen.tsx`
- `mobile/src/screens/citizen/ProfileScreen.tsx`
- `mobile/src/screens/citizen/ReportIssueScreen.tsx`
- `mobile/src/components/ui/Badge.tsx`

Documentation: `DESIGN.md`, current-identity text in `README.md`, and this report.
The browser runner now isolates each run's screenshots/results under `mobile/tests/artifacts/ui-restoration/` to avoid shared output files.
Browser test selectors were updated from the newer Operational Command Center heading
to the original Command Center heading. The operations script now selects an adjacent
map cell when nearby GPS points fall on different grid boundaries; this changes test
navigation, not the map aggregation or stored coordinates.

## Remaining limits

The unavailable Library images prevent exact reference-image comparison. Physical-device
Android/iOS testing and hosted production deployment were not performed. Export success
is not device-runtime validation. Previously documented missing trained models, external
chat-provider setup, unvalidated severity/duplicate baselines and push configuration
remain unchanged by this UI task. See the master implementation report for those existing
feature limitations. Local screenshots may show explicitly isolated test records.
