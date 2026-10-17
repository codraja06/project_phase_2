# Master implementation checkpoint — 17 October 2026

This report supersedes the earlier TVK visual direction and the earlier instruction not
to run tests. The latest request specifies a green/blue civic interface and verification.
The existing Expo/React Native, Express/Mongoose and FastAPI/YOLO project was extended
in place. No production database reset, seed or destructive migration was performed.

## Feature status

| # | Area | Implementation and limits |
|---|---|---|
| 1 | Multiple detection models | Registry loads compatible supplied weights once, routes by actual class names, exposes readiness/version and retains real boxes. Four weight files load. Dedicated road-damage, streetlight and water-leakage capability needs compatible weights and held-out evaluation. No accuracy claim. |
| 2 | Civic assistance | Authenticated backend provider integration, private conversation history, owner-scoped complaint lookup and clearly labeled built-in guide. External provider credentials/model still require configuration and a live provider test. |
| 3 | Authority dashboard | Actual MongoDB totals, categories, trends, recent reports, geography and filtered list navigation. No production mock statistics. |
| 4 | Duplicate review | GPS radius, matching category, unresolved status, lookback and dHash/RGB image comparison. Signed upload fingerprints; incompatible visuals excluded. Legacy/missing images are manual-review candidates. Citizen can continue; only authority confirms a link. Thresholds are uncalibrated for arbitrary scene/viewpoint changes. |
| 5 | Hotspot map | Configurable geographic grid/time window, status/category/date/priority filters, zoom-dependent aggregation and direct scale controls. Opens underlying reports. Counts describe concentrations, not statistical significance or verified hazard boundaries. |
| 6 | Department routing | Administrator category rules, uncertain/mismatched AI categories remain unassigned, explicit manual categories may use mappings. Authority reassignment includes reason, actor, time and history. No external municipal API is implied. |
| 7 | Repair verification | Original and completion photos remain separate. Authority accept/reject review, replacement history, explicit status confirmation and transition history. Existing no-photo manual status flow is preserved. |
| 8 | Notifications | Durable recipient-scoped events and authenticated WebSocket change delivery while app is connected, reconnect catch-up, foreground/manual refresh and read state. Background OS push requires provider/device registration; multi-instance broadcasting requires a shared relay. |
| 9 | Resolution analytics | Actual completed average/median, category/department duration, unresolved average/oldest age, resolution trends, configured overdue target and list drill-downs. Ordinary elapsed hours, not business hours. Missing historical transitions are not reconstructed. |
| 10 | Severity | Explicitly unvalidated, versioned rule-based estimate from actual detections and image coverage, with abstention. Separate authority correction preserves original evidence and appends audit history. |
| 11 | Priority | Explainable deterministic severity/category/age policy, calculated consistently for lists/maps/analytics. Officer override/reset with reason and audit; status remains independent. Original recommendation remains visible. |
| 12 | Description | Detection-grounded draft, citizen editing/review, valid GPS only, manual fallback and final approved text stored. Deterministic verbalization, not an externally configured generative model. |
| 13 | Responsive UI | Shared deep green/blue tokens across auth, citizen/officer workflows, rail/sidebar/bottom navigation, forms, charts, maps, repair and notifications. UI/UX Pro Max guidance and existing routes/components retained. |

## Changed file groups

- AI: `app/detector.py`, `main.py`, `schemas.py`, new `image_signature.py`,
  signature tests, model configuration and training/evaluation documentation.
- Backend: complaint schema/validation, upload evidence, duplicate comparison, triage
  decisions, department/repair audit, map aggregation, resolution analytics,
  `liveNotifications.ts`, notification persistence/delivery, server setup and environment
  examples. `ws` and its TypeScript types are the only added packages in this increment.
- Mobile: shared theme/shell/map components, complaint triage/review controls,
  notification connection/list, report receipt integration, analytics and filtered list
  navigation, API types and responsive browser verification scripts/artifacts.
- Documentation: README, DESIGN and `docs/OPERATIONS_FEATURES.md` describe current
  behavior, setup, policy, external dependencies and limitations.

## Database compatibility

New optional complaint fields: image fingerprint, model version on detection boxes,
authority severity review, priority override and administrative audit history. Existing
records remain readable. There is no bulk rewrite or invented backfill. Old images lack
fingerprints until explicitly reprocessed; old administrative events cannot be recovered.
The existing notification and department-rule collections remain in use. Test data is
created only in isolated test databases and cleanup targets those test accounts/records.

## Setup and run (three terminals)

Use Node dependencies already declared in each package, MongoDB and the AI Python
environment. From the repository root:

```powershell
cd backend
npm install
# Copy .env.example to .env only when creating a new local configuration.
# Set MONGODB_URI, JWT_SECRET, AI_SERVICE_URL and BACKEND_PUBLIC_URL.
npm run dev
```

```powershell
cd ai-service
python -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

```powershell
cd mobile
npm install
# EXPO_PUBLIC_API_URL must be reachable from the device, ending in /api.
npm start
```

Existing environment files should be edited, not overwritten. Physical devices need
the host's LAN/public address rather than localhost. Configure provider keys only in
the backend. TLS deployments must forward WebSocket upgrades at
`/api/notifications/live`. See `.env.example` for duplicate thresholds, grid/window and
optional `RESOLUTION_TARGET_HOURS`. Configure administrator mappings through the
existing controlled `isAdmin` provisioning process; public registration cannot grant it.

## Verification

Current completed checks:

- Backend build succeeded; 50 tests across 10 suites passed, including real authenticated
  sockets, recipient isolation, durable notification deduplication, role guards,
  severity/priority audit preservation, visual comparison and exact median calculation.
- AI service: 23 tests passed. Existing FastAPI/Pydantic deprecation warnings
  remain; these tests do not establish trained-model or duplicate-classifier accuracy.
- Mobile TypeScript check passed; Expo Android and web exports succeeded.
- Live browser: 144 route/viewport checks across 320, 375, 430, 768, 1024, 1280, 1440,
  1920 pixels, plus landscape. Nine sampled accessibility scans found no violations.
  Actual private lookup, provider-unavailable guide, analytics/list navigation and
  keyboard navigation passed. Artifacts: `mobile/tests/artifacts/redesign/results.json`.

- Live operations: eight workflow groups, 32 width checks and eight accessibility scans
  passed, with no browser runtime errors. Verified administrator routing, citizen manual
  fallback/duplicate warning, map record navigation, confirmed duplicate link, authority
  severity correction, priority override/reset, reviewed repair evidence, explicit
  resolution, live citizen notification delivery without refresh, read state and real
  department resolution analytics. Artifact: `mobile/tests/artifacts/operations-live-results.json`.
- Notification badges share one account-scoped socket. Incoming bursts are coalesced,
  unread fetches deduplicated, and account changes discard stale responses. A rerun
  verified live list updates after this correction. API rate limits were preserved.

- Real-photo inference: eight integration groups passed using the actual four loaded
  YOLO models and real Express/FastAPI/MongoDB/Expo services. Bounding boxes remained
  aligned within two pixels at all eight widths. Verified category-specific routing,
  explicit unavailable-model responses, generated draft editing/approval, signed image
  evidence, valid GPS, manual fallback for a non-civic image, aged-report escalation,
  actual priority filters/sorting, authorized status updates and resolved score zero.
  No browser runtime errors. Artifact: `mobile/tests/artifacts/phase2-live-results.json`.
- Final socket/triage/visual-evidence focused rerun: six tests passed after heartbeat
  handling was added. Final mobile type check and backend build passed.
- `git diff --check` passed. Expo exports are build checks, not physical-device tests.

The browser scripts use isolated services on 5052/8052/8083 and dedicated test database
`civictrack_phase2_e2e`; existing application servers are not stopped. Test script
selectors were updated for the current dashboard heading and visible navigation screens.
The inference script now defaults to the same isolated Expo port as the other live tests.
Temporary test services were stopped after verification.

An initial full test attempt ran alongside model startup and both exports, exceeded a
five-second multi-step integration timeout and caused dependent assertions to fail.
The integration test timeout was adjusted to 20 seconds; the clean rerun passed all
50 tests. An oversized Python parameter ID also exceeded Windows filename limits;
short test IDs fixed it, and all 23 Python tests then passed.

## Remaining external validation and deployment work

- Supply and evaluate missing class-compatible weights; document dataset provenance
  and precision/recall/mAP before making accuracy claims.
- Configure and test the external civic chat provider. The built-in guide is working.
- Calibrate severity and visual duplicate thresholds against reviewed local data.
- Configure background push only when device registration and APNs/FCM credentials
  are available. Current delivery is live while connected plus stored catch-up.
- For multiple API instances, add a shared delivery relay. The current socket hub is
  process-local and is not marketed as cross-instance delivery.
- Physical Android/iOS runtime and hosted production infrastructure are not verified
  by local Expo web tests or successful Android bundle export.

Existing dependency advisories were reported during backend dependency installation.
No forced dependency upgrade was applied; framework/package remediation remains a
separate compatibility review. Local tests do not certify production security.
