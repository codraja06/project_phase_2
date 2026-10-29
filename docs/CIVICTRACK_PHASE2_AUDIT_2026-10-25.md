# CivicTrack AI — implementation and functionality audit

Audit date: **25 October 2026 (Asia/Calcutta)**. Checkout: `D:/project phase 2/project1`.

> Historical audit checkpoint. The user subsequently authorized fixes and provisional
> Avadi routing. See the [follow-up implementation and verification report](PHASE2_PARTIAL_COMPLETION_2026-10-25.md)
> for current statuses; the tables below preserve the original audit results.

## Final summary after fixes

| Feature | Primary status | Evidence | Main remaining issue |
|---|---|---|---|
| Multiple AI models | PARTIAL — Incomplete | Four loaded weights and actual routed inference | Road-damage class incompatible; streetlight/water/drainage weights missing |
| Severity prediction | PASS — Verified working | Actual detection → rule estimate → DB → UI | Experimental, unvalidated rules; not a trained severity model |
| Smart prioritization | PASS — Verified working | Real age escalation, filtering, sorting and officer override/reset | Policy calibration remains |
| AI descriptions | PASS — Verified working | Real detection-grounded draft, editable review and approved DB text | Deterministic verbalization, not LLM generation |
| Duplicate detection | PASS — Verified working | Visual/GPS/category/time candidates and human confirmation | Thresholds uncalibrated; safe manual review for legacy images |
| Civic chatbot | PARTIAL — Incomplete | Factual built-in guide/private lookup work | External AI provider unconfigured |
| Authority analytics | PASS — Verified working | Known-record aggregation and actual browser/API filters | No invented ward/SLA data |
| Hotspot map | PASS — Verified working | Actual cluster/marker consistency, invalid GPS exclusion and offline fallback | OSM tiles remain an external service; uninterrupted tile delivery not certified |
| Department assignment | PARTIAL — Incomplete | Actual admin rule → submission → stored assignment | User database has no configured department mappings |
| Repair verification | PASS — Verified working | Separate original/after image, review gate and explicit resolution | Human review, not a trained repair classifier |
| Resolution-time analytics | PASS — Verified working | Known durations/median and actual department results | Elapsed-time cohorts, not business hours |
| Real-time notifications | PARTIAL — Incomplete | Real recipient-scoped sockets/catch-up/deduplication | Non-resolution event recovery, background push and multi-instance relay absent |
| OTP verification | BLOCKED — Cannot verify | API/DB/limits/replay tests pass; SMTP authentication passed | No real email/handset delivery test; configured Twilio sender not in account's phone-number inventory |
| Resolution email/SMS | BLOCKED — Cannot verify | Durable queue/retry/consent tests; SMTP/Twilio authentication passed | Actual recipient delivery unverified; Twilio sender needs correction |
| Notification preferences | PASS — Verified working | Saved preferences, consent checks and owner-only delivery/read status | Provider acceptance is not a delivery receipt |
| Phase 1 functionality | PASS — Verified working | Actual report/status flows; logout replay now HTTP 401 | Physical camera/GPS and live Google OAuth remain separate checks |
| Responsive UI | PASS — Verified working | Browser viewport/workflow tests, mobile type check and Android/web export | No physical-device certification |
| Security and reliability | PARTIAL — Incomplete | Reproduced defects fixed; 102 backend tests pass; native-popup regression passes | Remaining dependency advisories and production-hardening work |

Final classification: **11 PASS, 5 PARTIAL, 0 FAIL, 0 NOT IMPLEMENTED, 2 BLOCKED**.
The absence of FAIL means the reproduced application defects below were corrected;
it does **not** mean the project is production-secure or all external integrations work.

## Audit before fixes

The table below records the inspected baseline, **before application fixes in this audit**.
PASS applies to the implementation and execution described, not model accuracy,
production hosting, physical devices or untested third-party delivery.

| Feature | Primary status | Executed evidence | Main issue or limit |
|---|---|---|---|
| 1. Multiple AI models | PARTIAL — Incomplete | Four real weight files load; actual category-routed inference and missing-category HTTP 503 checks pass | Road-damage weights expose pothole only; streetlight and water/drainage weights missing |
| 2. Severity prediction | PASS — Verified working | Actual photo → YOLO → rule-based severity → signed evidence → MongoDB → citizen/authority screens | Experimental rules, **not a trained or validated severity classifier** |
| 3. Smart prioritization | PASS — Verified working | Age escalation, actual priority filtering/sorting and officer override/reset tests pass | Operational policy requires local review; no service-time guarantee |
| 4. AI descriptions | PASS — Verified working | Actual detections produce a draft; browser edits/reviews it; final text and original draft persist | Deterministic detection verbalization, **not an LLM/vision-language generator** |
| 5. Duplicate detection | PASS — Verified working | Signed fingerprints, nearby-category candidates, privacy guards and human-confirmed links pass | Similarity thresholds uncalibrated; missing fingerprints need manual review |
| 6. Civic chatbot | PARTIAL — Incomplete | Authenticated guide, stored history, private complaint lookup and mocked provider errors pass | External provider URL/model/key absent; live AI provider not verified |
| 7. Authority analytics | PASS — Verified working | Real MongoDB aggregation, filters, empty/error states and actual operations browser checks pass | Submission-date cohorts; no invented ward/municipal integration data |
| 8. Hotspot map | PARTIAL — Incomplete | GPS aggregation/filtering/navigation pass; additional CDN-outage test fails | Blocked Leaflet leaves a blank map and `L is not defined` until fixed |
| 9. Department assignment | PARTIAL — Incomplete | Isolated admin rule → real citizen submission → stored assignment and audit history pass | **No routing rules exist in the configured application database** |
| 10. Repair verification | PASS — Verified working | Actual separate photo upload, review gate, preserved original and explicit resolution pass | Human review; no trained before/after repair classifier |
| 11. Resolution-time analytics | PASS — Verified working | Known 24h/48h examples give 36h median/average; unresolved ages and real department analytics pass | Elapsed hours, not business hours; historical missing events cannot be reconstructed |
| 12. Real-time notifications | PARTIAL — Incomplete | Actual authenticated sockets, owner isolation, persistence, deduplication and live browser resolution pass | Non-resolution event write failures are logged and dropped; no general recovery outbox, OS push or multi-instance relay |
| 13. OTP verification | BLOCKED — Cannot verify | Secure challenge/expiry/limits/replay tests and actual browser/API/isolated DB flow pass with mocked senders | Config values exist, but no newly consented recipient/live inbox or handset delivery test |
| 14. Resolution email/SMS | BLOCKED — Cannot verify | Durable resolution jobs, consent, idempotence, retry/backoff and mocked acceptance tests pass | No live recipient delivery or receipt confirmed in this audit |
| 15. Notification preferences | PASS — Verified working | Real profile preference writes; worker opt-out/consent rechecks; owner-scoped reads pass | “Sent” means provider acceptance, not inbox/handset arrival |
| 16. Original Phase 1 functionality | PARTIAL — Incomplete | Password sign-in, upload, real detection/boxes, GPS pinning, history and officer transitions execute | Server accepts a token after logout; device camera/GPS and Google OAuth require separate checks |
| 17. Responsive UI | PASS — Verified working | 108 auth layouts, 27 dashboard layouts, 351 route layouts; six interaction groups and OTP states pass | React Native Web checks and bundles do not establish physical Android/iOS rendering |
| 18. Security/reliability | FAIL — Implemented but broken | Direct API probe plus five new failing regression tests reproduce evidence forgery, logout replay/socket retention, duplicate login credentials and oversized password acceptance | Weak/placeholder JWT configuration and dependency advisories also require attention |

Expanded baseline totals: **9 PASS, 6 PARTIAL, 1 FAIL, 0 NOT IMPLEMENTED, 2 BLOCKED**.
The first published baseline was 10 PASS/5 PARTIAL; the additional controlled map
outage test then moved hotspot handling to PARTIAL before its fix. Native popup
injection was also subsequently reproduced and corrected under the existing security FAIL.
All eighteen have meaningful implementation; the incomplete areas are not empty buttons.

## Scope, method and data protection

Inspected the frontend screen/component/API/navigation inventory, Express controllers,
routes, services, middleware and validators, Mongoose schemas/indexes, FastAPI inference,
registry/weight availability, tests, build configuration and documentation. Traced the
eighteen flows below. Historical reports were used to locate tests, not as current proof.

Existing uncommitted OTP work was preserved. Existing tests ran before application
changes: **96/96 backend tests across 14 suites**, **23/23 Python tests** (two existing
deprecation warnings), backend build and mobile TypeScript check passed.

Application-database inspection used raw read-only aggregate/count/index queries with
`autoIndex:false` and `autoCreate:false`. There were four users and four complaints,
zero department rules, and four complaints without stored severity. Old records are
not backfilled or relabeled as AI-derived. Three resolved records had resolution
timestamps. No private identities, descriptions, provider secrets or tokens are included.

Runtime services use local ports 5052/8052/8083 and **`civictrack_phase2_e2e`**.
Jest uses **`civictrack_isolated_test`**; the OTP browser harness uses
**`civictrack_otp_browser_test`**. Test cleanup targets only synthetic users/reports.
SMTP, Twilio, Cloudinary and external chat credentials are explicitly empty in the
isolated application process. Real provider adapters are mocked for OTP/delivery tests.

Automatic approval review rejected starting the Expo development server. The safer
alternative succeeded: an exported web build served read-only on loopback. The first
export reused an old Metro-cached LAN API address; `expo export --clear` rebuilt it
against the isolated API. The live tests subsequently passed. No user server was stopped.

## Detailed evidence and remaining work

### 1. Multiple detection models

- **Status:** PARTIAL. Implementation confidence high; accuracy confidence unestablished.
- **Flow/files:** `mobile/src/screens/citizen/ReportIssueScreen.tsx` → `POST /api/ai/detect`
  (`backend/src/controllers/aiController.ts`, `services/aiService.ts`) → FastAPI `/predict`
  (`ai-service/app/main.py`, `detector.py`, `models/registry.json`). Model readiness:
  authenticated `GET /api/ai/models`; registry exposes actual class names and versions.
- **Execution:** Python registry/error/EXIF/NMS tests and real photo inference pass.
  `phase2-live.cjs` confirms four loaded models, category routing and real confidence/boxes.
  Missing road-damage/streetlight/water-leakage categories return explicit HTTP 503.
- **Missing:** `best_road.pt` supports **pothole**, not `road_damage`. Two registry paths
  have no weights: `models/streetlight/best.pt`, `models/water_leakage/best.pt`.
  Actual classes from the other weights are in `audit-2026-10-25/baseline-runtime.json`.
- **Config/fix:** Provide compatible, trusted weights using `ROAD_DAMAGE_MODEL_PATH`,
  `STREETLIGHT_MODEL_PATH`, `WATER_LEAKAGE_MODEL_PATH`, restart AI, then evaluate held-out
  local labeled photos. **High**. Do not rename pothole predictions to road damage.

### 2. Severity

- **Status:** PASS for the documented experimental rule implementation.
- **Flow/files:** `ai-service/app/assessment.py` uses category base score plus image-space
  box coverage, only for valid boxes/confidence ≥0.60. It returns Low/Medium/High or
  abstains. `aiController.ts` signs it; `complaintController.ts` validates image/user
  receipts; `models/Complaint.ts` stores level, method, evidence, hash and timestamp.
  `mobile/src/components/TriageSummary.tsx` displays limitations on results/details/list.
- **Execution:** `test_assessment.py`, `phase2.test.ts`, `masterUpgrade.test.ts` and the
  real photo browser/API/DB test pass, including authority correction without overwriting
  the original estimate. Detection confidence is not presented as severity accuracy.
- **Missing/config:** No separate trained severity model, validation set or calibrated
  physical damage measurement. Requires YOLO for automatic evidence; manual fallback
  stays unavailable rather than fabricated. **Medium:** evaluate civic
  triage labels with authorized municipal reviewers before reliability claims.

### 3. Prioritization

- **Status:** PASS.
- **Flow/files:** `backend/src/services/triageService.ts` implements the same policy in
  JavaScript and MongoDB aggregation. Severity points 10/35/65 (unknown 25), category
  weight 5–15, age +3 per complete unresolved day capped at 60; total capped at 100.
  High ≥65, Medium ≥30, otherwise Low. Resolved score is zero. Authority overrides
  use 10/45/80 and preserve the calculated recommendation and reason/actor/time audit.
  `PATCH /api/management/complaints/:id/triage`; list filtering/sorting in
  `authorityController.ts`, `AuthorityComplaintsScreen.tsx`, `ComplaintManagementPanel.tsx`.
- **Execution:** Policy tests, real 30-day aging example, actual UI sort/filter,
  override/reset and status-independence tests pass.
- **Missing/config/fix:** No external credentials. Policy calibration and operational
  workload validation remain **Medium**; do not imply automatically resolved work.

### 4. Generated descriptions

- **Status:** PASS for grounded draft generation; **not** proof of generative-language AI.
- **Flow/files:** Actual YOLO detections → deterministic wording in `assessment.py`
  (category, detected regions, image coverage) → AI response/signature →
  `ReportIssueScreen.tsx`/`DescriptionEditor.tsx` → reviewed final `description` and
  separate original `generatedDescription` in `Complaint` through `POST /api/complaints`.
- **Execution:** Live civic photo draft is edited, reviewed and stored unchanged as the
  citizen-approved text; non-civic image gives empty draft/unknown severity and manual
  entry succeeds. Signed-image mismatch and wrong-user evidence are rejected.
- **Missing/config/fix:** No LLM provider is used or required by this implementation.
  GPS/address is stored separately after confirmation, not invented in the draft.
  If the academic rubric requires an LLM/vision-language generator, that is additional
  **Medium** work requiring a provider/model and grounding/evaluation, not a completed claim.
  Baseline manual submissions could forge detection fields; see security finding F1.

### 5. Duplicate suggestions

- **Status:** PASS for suggestions with human confirmation.
- **Flow/files:** Signed upload fingerprint from FastAPI `/image-signature`
  (`image_signature.py`, `imageSimilarityService.ts`); `duplicateService.ts` compares
  unresolved same-category recent reports within configured GPS radius, dHash Hamming
  distance and RGB cosine similarity. `POST /api/management/duplicates/check`, authority
  candidates/confirmation endpoints in `managementController.ts`; citizen review and
  `ComplaintManagementPanel.tsx`; `Complaint.duplicateOf` plus reason/actor/time.
- **Execution:** Same/different/missing fingerprint tests pass; actual citizen sees a
  privacy-safe warning, submits anyway, officer confirms a link; neither record is deleted
  or resolved. Other citizens' IDs/contact details are withheld from suggestion responses.
- **Missing/config/fix:** Legacy images lack signatures; uncalibrated thresholds and
  500-candidate prefilter limit affect recall. `DUPLICATE_*` settings, no external key.
  **Medium:** calibrate on viewpoint/lighting changes; scale/index search if needed.

### 6. Civic assistance

- **Status:** PARTIAL.
- **Flow/files:** `CivicAssistantScreen.tsx` → authenticated citizen-only
  `/api/chat/messages` and `/conversation` (`chatRoutes.ts`, `chatController.ts`) →
  `civicAssistantService.ts` → optional intent-classification provider + factual guide;
  `Conversation` stores owner-scoped history. Complaint references query `createdBy`.
- **Execution:** `features456.test.ts` covers authentication/ownership, live database
  facts, mocked provider request, malformed output and fallback. The guide is explicitly
  labeled unavailable-AI fallback, cannot mutate status or access another citizen's report.
- **Missing/config/fix:** `CHAT_PROVIDER_URL`, `CHAT_PROVIDER_MODEL` and any required
  `CHAT_PROVIDER_API_KEY` are absent. **High if required for submission:** configure a
  compatible HTTPS/local chat-completion endpoint and test real relevant/unrelated/unsafe
  questions. The current provider classifies intents; answers remain the controlled guide.

### 7. Authority analytics

- **Status:** PASS.
- **Flow/files:** `AuthorityInsights.tsx`/`AuthorityAnalyticsScreen.tsx` →
  `GET /api/authority/analytics` → `analyticsService.ts` → `Complaint` aggregation.
  Real totals/status/category/trend/priority/geography, UTC from/to/category/status/
  department/search filters and list drill-downs are implemented.
- **Execution:** Known-record integration counts/date filtering and real operations
  dashboard/department results pass. Browser fixtures test date presets, search, empty
  results and API error recovery. No production mock metrics found in these data flows.
- **Missing/config/fix:** No API key. Target metric needs `RESOLUTION_TARGET_HOURS`;
  configured value exists, not a municipal SLA guarantee. **Low:** large-data load tests;
  the latest 90 reporting dates are displayed and geography is limited to 100 cells.

### 8. Hotspot map

- **Status:** PASS for data aggregation, map interaction and record navigation checked.
- **Flow/files:** `AuthorityMapScreen.tsx` → `GET /api/management/hotspots` →
  `managementController.ts` geographic grid aggregation with dates/category/status/
  priority and valid coordinate filtering. `MapSurface.web.tsx`/`MapSurface.tsx` use
  Leaflet/OpenStreetMap; clusters open actual reports. `(0,0)` is intentionally excluded.
- **Execution:** Invalid grid parameters are rejected; actual operations browser filters
  potholes and opens the selected report. Real GPS data is used; no location is invented.
- **Missing/config/fix:** Leaflet CDN and OSM tile network availability remain external;
  no Google Maps key is required by the active map implementation. **Medium:** verify
  physical map loading, network-offline behavior and long-lived map/filter races.
  Grid counts are explicitly not statistically validated hotspot boundaries.
  The subsequent controlled outage test reproduced a blank map and JavaScript error;
  both map implementations now signal initialization failure and expose a bounded
  timeout, coordinates, retry and external-map actions. Native popup markup injection
  was reproduced in its actual generated HTML and fixed with DOM `textContent`.

### 9. Departments

- **Status:** PARTIAL in the current application configuration; routing logic works.
- **Flow/files:** `DepartmentMappingManager.tsx` in officer settings → admin-only
  `PUT /api/management/departments/:category` → `DepartmentRule`; `complaintController.ts`
  applies enabled compatible category rules on creation; manual reassignment endpoint
  persists department, reason, actor, timestamp and `Complaint.auditHistory`.
- **Execution:** Actual isolated admin mapping, citizen submission and stored assignment
  pass; non-admin/citizen edits are rejected. Mismatched or uncertain automatic categories
  are not silently assigned. Authority reassignment tests pass without status changes.
- **Missing/config/fix:** Configured database contains **zero** department rules.
  **High:** an authorized admin must enter the municipality's actual mappings in the
  existing UI. No invented departments were inserted into the user's database.
  Aggregate role inspection also finds **no administrator flag on existing accounts**.
  A trusted operator must first provision an authorized administrator through the
  controlled `isAdmin` process; public registration/profile requests cannot grant it.

### 10. Repair evidence

- **Status:** PASS for human before/after review.
- **Flow/files:** Officer panel → multipart `/api/management/complaints/:id/completion`
  → `submitCompletion`, separate `completionImageUrl`; review endpoint → recorded
  accepted/rejected decision, reviewer/time/note and audit. `authorityController.ts`
  blocks resolution if submitted evidence is not accepted. Original `imageUrl` persists.
- **Execution:** Actual upload, before/after UI, disabled resolve, acceptance and explicit
  officer confirmation pass; forbidden roles and invalid transitions are tested.
- **Missing/config/fix:** Local storage works in development; production needs configured
  Cloudinary. No automatic repair classifier is implemented or claimed. Legacy manual
  resolution with no repair photo remains intentionally supported. **Low:** device gallery test.

### 11. Resolution durations

- **Status:** PASS.
- **Flow/files:** `Complaint.createdAt`, `statusHistory`, `resolvedAt` are set by real
  explicit transitions; `analyticsService.ts` excludes unresolved, missing/reversed
  resolution timestamps from completed averages, calculates exact median in a sorted
  aggregation, and separates unresolved ages and department/category/trend cohorts.
- **Execution:** 24h/48h examples return 36h average/median; actual completed department
  report appears in the real browser. Zero-result and unresolved-only cases pass.
- **Missing/config/fix:** No credentials. `RESOLUTION_TARGET_HOURS` is optional and uses
  elapsed time. **Low:** document business-hour/calendar rules before adding any such SLA;
  no fabricated historical transitions or timestamps were written.

### 12. Live notifications

- **Status:** PARTIAL (connected delivery works; general event recovery is incomplete).
- **Flow/files:** `notificationService.ts` → `Notification` unique recipient/event key →
  `liveNotifications.ts` authenticated `/api/notifications/live` WebSocket → shared
  account-scoped `useUnreadCount.ts` hub → `NotificationCenter.tsx` and badges.
  Stored catch-up/reconnect, foreground/manual refresh and read state are implemented.
- **Execution:** Real authenticated socket recipient-isolation/deduplication tests and
  actual citizen browser update on officer resolution without reload pass. Untrusted
  socket credentials fail. Baseline logout did not close an already connected socket.
- **Missing/config/fix:** General non-resolution writes swallow/log failures; only
  resolution has a recoverable pending flag. No background OS push/APNs/FCM token setup
  or cross-instance relay exists. **Medium:** add durable general-event recovery if
  required; proxy WebSocket upgrades and use a shared relay before multiple API instances.

### 13. OTP registration

- **Status:** BLOCKED for end-to-end real delivery; implementation confidence high.
- **Flow/files:** `CitizenRegisterScreen.tsx`/`SignupVerificationScreen.tsx` → signup
  options/request/resend/verify/complete APIs (`signupController.ts`) → `SignupChallenge`
  + `SignupThrottle` → `contactDeliveryService.ts` SMTP/Twilio → verified `User`.
- **Execution:** Actual isolated API/DB tests verify cryptographic six-digit generation,
  HMAC hashes, expiry, 60s cooldown, five attempts/hour quotas, concurrent issuer/complete
  handling, single-use channels, required/optional phone, no public authority signup,
  no development OTP, provider-failure errors and retryable account completion. Browser
  actual API test registers once and enters the JWT dashboard using mocked sending only.
- **Missing/config/fix:** SMTP/Twilio key presence is **not authentication or delivery**.
  No recipient/test-message consent was supplied for this audit. **High:** replace exposed
  credentials privately, verify sender/recipient eligibility, then consent to one real OTP
  request and independently confirm email/phone receipt and account verification fields.
  The final read-only connection check authenticates SMTP successfully without sending.
  Twilio authentication also passes, but its complete returned phone-number inventory
  contains no match for the configured sender. Correct `TWILIO_FROM` to an authorized
  SMS-capable sender; do not reuse a personal recipient number as the sending number.

### 14. Resolution email/SMS

- **Status:** BLOCKED for actual third-party delivery; durable queue logic passes.
- **Flow/files:** Authorized real status transition atomically stores
  `resolutionNoticePending`/`resolutionNoticeAt` → `resolutionDeliveryService.ts` →
  deduplicated in-app event + `NotificationDelivery` channel jobs → claimed worker →
  configured SMTP/Twilio adapter. Owner is read from the complaint/user, never client input.
- **Execution:** `resolutionDelivery.test.ts` and actual OTP browser/API/DB harness
  confirm repeated resolution saves/concurrent workers send once, retries cap at five,
  consent/preference checks, provider failure does not undo resolution, and uncertain
  acceptance is held for manual reconciliation rather than blindly resent.
- **Missing/config/fix:** Authorized SMS sender, deliverable consenting recipient,
  message acceptance and actual inbox/handset arrival unverified. No
  receipt webhook. **High:** run controlled real tests after setup; “Sent” means provider
  acceptance only. Keep one persistent worker-enabled production backend running.
  Final authentication-only checks passed for SMTP and Twilio. This removes the
  authentication uncertainty but does not establish authorized sender capability,
  recipient eligibility, provider message acceptance or actual message delivery.

### 15. Preferences/delivery status

- **Status:** PASS at application/API/worker level.
- **Flow/files:** Profile screens → `PUT /api/auth/notification-preferences` → `User`
  preferences and explicit SMS consent timestamp; worker rechecks at send time.
  Owner-scoped `/api/management/notifications` joins only that owner's channel jobs;
  read endpoint filters recipient. UI labels acceptance, skipped reasons and failures.
- **Execution:** Actual profile/API/DB consent persistence passes; opt-out, verified-phone
  requirements, withdrawal before send and cross-user fetch/read protection pass.
- **Missing/config/fix:** SMTP for email; Twilio, verified phone and SMS consent for SMS.
  Legacy unverified contact data is not silently verified. **Low:** receipt handling only
  if confirmed delivery claims are added; no false “delivered” wording found here.

### 16. Phase 1 preservation

- **Status:** PARTIAL baseline because server-side logout replay was reproduced.
- **Flow/files:** Existing citizen/authority navigators, auth context/API, profile/history/
  report/detail/map and authority screens remain. `authController.ts`, authenticated
  complaint routes and ownership/RBAC guards use actual MongoDB records.
- **Execution:** Full fixture UI workflow and real upload → YOLO → review → create →
  details → officer progress/resolve flow pass. Real boxes align within 2px at eight
  widths; forbidden transitions and citizen officer mutations are rejected. Core image,
  GPS and dashboard functions have not been replaced. Logout clears local storage but
  baseline replay of the old credential still returned HTTP 200.
- **Missing/config/fix:** **High:** server-side logout revocation. Live Google OAuth needs
  configured audiences/SHA/redirect/device test; the ID-token verification/linking logic
  has mocked coverage only. Camera/GPS/native OS behaviors remain device checks.

### 17. Responsive UI

- **Status:** PASS within the tested browser/build scope.
- **Flow/files:** Existing breakpoints, `WorkspaceShell`, citizen/authority navigation,
  shared controls, report/location/review, lists, map, analytics, dialogs and OTP screen.
  The original red/pink/white CivicTrack theme is retained; no redesign was applied.
- **Execution:** 108 auth, 27 dashboard and 351 route/width fixtures pass with no reported
  overflow/runtime errors; six interaction groups pass, including 320×390. OTP has six
  viewports and two zero-violation automated accessibility scans. Real operations passes
  32 width checks and eight scans; actual AI report/list/details tested at narrow/tablet/
  desktop widths. Android and web exports and mobile TypeScript succeed.
- **Missing/config/fix:** Browser fixtures do not prove device font scaling, keyboard,
  notch, camera or GPS behavior. **Medium:** physical Android/iOS walkthrough with current
  configured API. Expo cache must be cleared after switching embedded API environments.

### 18. Security and reliability

- **Status:** FAIL at baseline, with reproducible API and socket evidence.
- **F1 — High:** A complaint submitted without `analysisToken` accepts client-supplied
  `aiDetected`, `aiClass`, `aiConfidence`, and `boundingBoxes`, presenting fabricated
  detections as evidence. Severity/priority remain server-controlled, but the baseline
  integrity protection is incomplete. Fix: clear untrusted detection fields on manual
  reports; only populate them from matching signed server analysis.
- **F2 — High:** `/auth/logout` does not revoke its JWT. Same-token `/auth/me` still
  returns 200 and authenticated WebSocket remains open. Two same-second logins can
  produce the same JWT. Fix: unique token IDs, hash-only expiring revocations, REST and
  socket checks, active socket termination on logout. Do not log token values.
- **F3 — High configuration:** Configured JWT secret is missing/placeholder by the audit
  detector. Existing production validation checks length only. Configure a stable strong
  server secret and reject placeholder/short production values. Secret rotation will
  require signing in again and invalidates pending image-evidence receipts.
- **F4 — Medium:** Password change lacks signup's 72 UTF-8 byte bound. A 74-byte new
  password is accepted; bcrypt truncates beyond its supported boundary. Fix shared bounds.
- **F5 — Critical dependency triage:** `npm audit --omit=dev` baseline reports backend
  **4** affected packages (3 high, 1 moderate), mobile **54** (2 critical, 23 high,
  28 moderate, 1 low). Critical mobile entries are build/dependency-tree `shell-quote`
  and `tar`; the audit does not prove a remotely exploitable installed APK. Backend
  advisories include body-parser, follow-redirects, nodemailer and zod. Use compatible
  patch upgrades first; major Expo/React Navigation/Zod migration must be tested, not forced.
- **F6 — High, native map HTML injection:** Native `MapSurface.tsx` concatenated
  untrusted title/address into Leaflet popup HTML. A synthetic image-error handler
  executed in the actual generated HTML under Chromium. It is now inserted with
  `textContent`; the same probe observes no executable markup. This tests the generated
  WebView document, not an installed phone app.
- **F7 — Medium, map outage handling:** Blocking Leaflet's CDN produced `L is not defined`
  and no web fallback. Both implementations now signal missing-library/tile failure,
  bound loading to 12 seconds and preserve coordinate/external-map/retry controls.
- **Other limits:** Client JWT storage uses AsyncStorage/browser localStorage, not a
  native secure credential store. Open CORS, unauthenticated local image URLs, process-local
  rate limits/socket hub, no general notification outbox, six-character password minimum,
  no MFA/reset workflow and password changes not revoking all other sessions remain
  production-hardening work. Upload byte/type/magic limits exist; full decoding relies
  on the optional image-signature AI path when available. These are not security certifications.
- **Execution:** Existing ownership/RBAC/invalid input/forged token/upload tests pass;
  five added audit tests fail before fixes, confirming F1/F2/F4 and JWT uniqueness.
  Evidence is stored without secret values in `baseline-runtime.json` and configuration
  presence/index/count snapshot. No exploit was run against user/production data.

## Prioritized finish plan

1. **Critical:** Triage npm dependency advisories. Patch compatible backend/tooling
   versions; plan a tested Expo/native/navigation/Zod upgrade for remaining advisories.
   Do not run `npm audit fix --force` or downgrade Expo to an automatically suggested version.
2. **High:** Fix F1/F2/F4, strengthen production secret validation, configure a strong
   private JWT secret; rerun regression, socket, API and real report flows.
3. **High:** Add actual municipality routing rules as admin; supply compatible missing
   category weights and validate them. Configure real chatbot provider if required.
4. **High:** Verify SMTP/Twilio privately with authorized senders and consenting recipients;
   confirm inbox/handset receipt separately from provider acceptance. Never post credentials.
5. **Medium:** Durable non-resolution events, calibrated severity/duplicate evaluation,
   native secure token storage, explicit multi-instance/session-revocation policy and
   physical Android/iOS camera/GPS/map/keyboard/Google sign-in walkthrough.
6. **Medium:** Deploy HTTPS backend, durable production image storage (Cloudinary settings
   currently absent), MongoDB backups/index management and WebSocket upgrades. EAS release
   configuration already rejects a missing/non-HTTPS API URL, but no hosted endpoint was verified.
7. **Low:** Large-volume load tests, map offline polish, receipt webhooks if needed,
   and business-calendar rules only when there is a defined municipal requirement.

## Commands and evidence

All commands below were run from the indicated existing package folder.

| Command | Baseline result |
|---|---|
| `backend: npm test -- --silent` | 96 passed, 14 suites |
| `backend: npm run build` | Passed |
| `ai-service: .\venv\Scripts\python.exe -m pytest tests -q` | 23 passed; two deprecation warnings |
| `mobile: npm run type-check` | Passed |
| `mobile: expo export --platform android --platform web --output-dir .expo/audit-20261025 --max-workers 2` | Passed; old environment cache observed |
| `mobile: expo export --platform web --output-dir .expo/audit-20261025 --max-workers 2 --clear` | Passed; isolated API embedded |
| `mobile: E2E_WEB_URL=http://127.0.0.1:8083 npm run test:e2e` | All five scripts pass; 108/27/351 layout checks, six workflow groups, 12 OTP groups |
| `mobile: E2E_WEB_URL=http://127.0.0.1:8083 node tests/e2e/otp-live.cjs` | Five real API/DB groups pass; senders mocked |
| `mobile: PHASE2_WEB_URL=http://127.0.0.1:8083 node tests/e2e/operations-live.cjs` | Eight actual-service groups, 32 widths, eight accessibility scans pass after cache correction |
| `mobile: PHASE2_TEST_IMAGE=mobile/assets/civic/pothole.jpg node tests/e2e/phase2-live.cjs` | Eight actual YOLO/API/DB/browser groups pass after cache correction |
| `backend: npm test -- --silent --runTestsByPath tests/audit20261025.test.ts` | Five targeted regression tests fail on baseline as expected |
| `scripts/audit-runtime.cjs`, `scripts/audit-snapshot.cjs` | Reproductions + safe read-only configuration/data/index snapshot saved |
| `backend/mobile: npm audit --omit=dev --json` | Advisory reports captured; not a clean security result |

Evidence directory: `docs/audit-2026-10-25/`. Current fixture evidence:
`mobile/tests/artifacts/ui-restoration/1792900044199/`; actual OTP harness creates a
timestamped `mobile/tests/artifacts/otp-live/` directory. Live operations and AI browser
results are `mobile/tests/artifacts/operations-live-results.json` and
`mobile/tests/artifacts/phase2-live-results.json`; these were freshly executed during
this audit. Initial cached-build failures are recorded above rather than counted as passes.

## Fixes after the audit

The initial audit findings and baseline report were presented before application
fixes. Supplementary map probes were documented when found, then fixed and retested.

| Fix | Changed implementation | Verification |
|---|---|---|
| F1: fabricated AI evidence | `complaintController.ts` clears untrusted AI fields on manual submissions; signed matching analysis still supplies actual detections | New regression; actual API baseline 201/fabricated vs final 201/manual with no AI evidence; full real-photo signed flow rerun |
| F2: logout replay / identical tokens / open sockets | Unique JWT IDs, HS256/claim checks; new hash-only `RevokedToken` TTL collection and `sessionService.ts`; REST/socket revocation checks; closes matching local sockets | Baseline replay 200 → final 401; distinct concurrent login credentials; independent session remains valid; active socket closes 1008 and revoked reconnect fails; 102-test full backend run |
| F3: weak signing configuration | Reject placeholder/short production keys; replaced existing placeholder JWT secret privately in ignored `backend/.env` | Policy regression and final configuration-presence snapshot; requires fresh sign-in, no account/complaint rewrite |
| F4: oversized changed password | Same 72 UTF-8 byte bound as signup | 74-byte password change baseline 200 → tested 400 |
| F5: compatible dependency patches | Lockfile updates for backend body-parser/follow-redirects/nodemailer and mobile shell-quote; no major framework upgrade | Backend advisories 4 → 1 high (Zod); mobile 54 → 53, critical 2 → 1 (tar); builds/tests rerun |
| F6: native popup injection | DOM text nodes replace popup HTML concatenation | Actual generated native HTML probe baseline executes markup; final no inserted image tags/no execution |
| F7: map load/outage fallback | Native/web map error bridge, tile events, timeout, retry and preserved coordinate/external-map controls; named accessible loader | Actual browser baseline missing fallback → final fallback; marker count matches filtered API; invalid legacy coordinates excluded; generated native HTML signals missing library |

### Final provider/configuration finding

`audit-2026-10-25/provider-readiness.json` records **zero messages sent**. Gmail SMTP
authentication passed. Twilio authentication passed; sender format is international,
but the configured sender was not found in its account phone-number inventory and
there were no additional pages. That sender cannot be treated as verified SMS setup.
Enter an actual authorized SMS-capable Twilio sender in `backend/.env`, then test with
a consenting recipient and comply with account/recipient/country restrictions.

Chat provider configuration and Cloudinary production image storage remain absent.
The application database still has four users/four complaints/zero department mappings;
the before/after read-only snapshots preserve the original counts and status breakdown.
No production/user records, existing accounts, statuses or historical severity were rewritten.

### Remaining security/deployment work

- Backend's remaining high advisory requires reviewing a Zod major migration. Mobile
  still reports 53 affected dependency-tree packages, including one critical tar entry.
  Most proposed automatic “fixes” change major native/framework versions or suggest an
  obsolete Expo version. They were not applied blindly. Review both saved final npm
  reports; compatibility and actual exposure need validation before deployment.
- Server logout revocations are persistent in MongoDB; active-socket termination is
  local to the API process. Configure cross-instance invalidation/relay if deploying
  multiple instances. Password change does not currently revoke every other session.
- AsyncStorage/localStorage credential storage, publicly accessible local image URLs,
  deployment CORS/rate-limit policy and general non-resolution event recovery remain
  explicit production-hardening items.
- Previously exposed SMTP/Twilio credentials still require provider-side rotation;
  passing authentication is not evidence they were rotated. Keep replacements private.
- New `RevokedToken` TTL indexes initialize with the existing server's normal startup.
  No bulk user/complaint migration is needed. The private JWT rotation requires a fresh
  login and invalidates old signed image receipts; reanalyze/reupload pending photos.

### Final rerun results and limits

- Backend: **102 tests / 15 suites pass**, including all six new audit regressions;
  TypeScript build passes. The original five reproductions failed before their fixes.
- AI: **23 tests pass**, two existing deprecation warnings; `pip check` reports no
  broken requirements. Actual four-model civic-photo inference passes in the live
  browser/API/DB test; this is runtime evidence, not accuracy validation.
- Mobile: TypeScript passes; Android and web bundle exports pass after the map changes.
- Actual operations: **8 groups, 32 width checks, 8 zero-violation accessibility scans**
  pass after the final loader-label correction. Real report/YOLO flow: **8 groups** pass.
- Actual browser → Express → isolated MongoDB OTP/notification flow: **5 groups** pass;
  external message senders remain mocked. Fixture auth/dashboard/routes/interaction
  checks are separately identified as intercepted API tests, not live backend proof.
- Final fixture rerun passes all **108 auth layouts, 27 dashboard layouts, 351 route
  layouts, six interaction groups and 12 OTP/notification groups**. No reported page
  errors or overflow; OTP's two accessibility scans report no violations. Stable
  snapshots are the `final-browser-*.json` files beside this report's evidence.
- Actual map markers match the filtered API cluster count; invalid legacy GPS is
  excluded. Blocking Leaflet now gives an actionable fallback with no page errors.
  The marker test samples tiles immediately (`loadedTiles:0`); it does **not** certify
  successful live OSM raster-tile delivery. Native generated HTML passes injection and
  missing-library bridge checks; physical WebView/device behavior remains untested.
- The new loading spinner initially failed one accessibility check because it lacked
  a name. Adding an accessible name fixed the rerun. A rebuild while serving the
  exported directory also interrupted a browser run; the read-only test host now
  handles disappearing assets and the final run uses a stable completed export.
- User/complaint counts and status breakdown remain unchanged; `.env` remains Git-ignored.
  No real messages, production data mutations, deployment or physical-device test occurred.

Current artifacts include `final-runtime.json`, `baseline-runtime.json`,
`baseline-map.json`, `final-map.json`, `baseline-native-map.json`,
`final-native-map.json`, `provider-readiness.json`, both safe database/configuration
snapshots and the four npm advisory reports in `docs/audit-2026-10-25/`.
The successful final live outputs are also copied to `final-operations-live.json`,
`final-phase2-live.json` and `final-otp-live.json` so later runs do not overwrite this evidence.
Final fixture source: `mobile/tests/artifacts/ui-restoration/1792901445884/`.
Only the audit-created services on 5052/8052/8083 were stopped after verification;
the pre-existing MongoDB service and all user records were preserved.
