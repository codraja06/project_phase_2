# CivicTrack Phase 2 — partial-feature follow-up

Verified on 25 October 2026 against the existing checkout. This follows the
[original audit](CIVICTRACK_PHASE2_AUDIT_2026-10-25.md) and the user's authorization
to fix its five partial areas. The original architecture and CivicTrack theme remain.

## Current result

| Previously partial area | Current primary status | Implemented and verified | Remaining requirement |
|---|---|---|---|
| Multiple AI models | **BLOCKED — Cannot verify full coverage** | Existing real models still run; `.env` model overrides work; class-based readiness command and configuration tests added | Compatible road-damage, broken-streetlight and water/drainage weights, followed by real inference and held-out evaluation |
| Civic chatbot | **BLOCKED — Cannot verify live provider** | Existing factual guide/private complaint lookup preserved; safe provider-readiness command added | Configure a real compatible provider URL/model and optional server key; run the probe and actual authenticated chat |
| Department assignment | **PASS — Verified working** | Nine editable provisional Avadi mappings stored; actual existing authority authorized as administrator; browser editing and assignment integration pass | Municipality's official structure is **not verified**; administrator must verify/update with a source |
| Real-time notifications | **PASS — Verified working** | Atomic complaint event intents, retry recovery, deduplication, cross-process database relay, session invalidation and actual browser receipt pass | Connected-app notifications; OS/background push is not implemented or claimed |
| Security and reliability | **PARTIAL — Incomplete** | Session rotation, native SecureStore adapter, strict image decode, MongoDB rate limits, production CORS restrictions and dependency patches pass | Older Expo/React Native tooling still reports advisories; device/hosted security validation remains |

Across the same eighteen audit features: **13 PASS, 1 PARTIAL, 4 BLOCKED**.
The other eleven PASS results remain supported by the regression checks below.
The other two BLOCKED items remain actual OTP delivery and resolution email/SMS
delivery: mocked provider tests do not establish arrival in an inbox or on a phone.
The earlier provider check also found the configured Twilio sender absent from
that account's authorized phone-number inventory. No real messages were sent here.
Moving a missing-model/provider area to BLOCKED does **not** mean it was completed.

## Configurable Avadi setup and existing data

The user selected **Avadi City Municipal Corporation, Tamil Nadu, India** as a
provisional context. This is not an official municipal integration.

| Category keys | Proposed department |
|---|---|
| `pothole`, `road_damage` | Roads and Engineering Department |
| `garbage`, `garbage_overflow` | Solid Waste Management Department |
| `drainage`, `drainage_problem` | Public Health / Drainage Department |
| `water_leakage` | Water Supply Department |
| `broken_streetlight` | Electrical / Street Lighting Department |
| `broken_tree` | Parks / Horticulture or relevant emergency department |

`backend/config/municipalities/avadi.provisional.json` is an operator bootstrap
template. Operational assignment reads the editable MongoDB `DepartmentRule`
records. Unknown categories remain unassigned. No dead-animal mapping was invented.

Actual database inspection found one existing authority account. Under the user's
explicit instruction that account was authorized as administrator, an
`AdministrationAudit` entry was saved, and nine proposed rules were inserted.
No passwords or private identities are published. No account was invented.
Post-change aggregate inspection confirms **4 users, 4 complaints, 9 rules, and
1 authority administrator**. Complaint status counts remain **1 Pending,
3 Resolved**. Existing complaint assignments, descriptions and severity were not
backfilled; no complaint was resolved by these changes.

Sign in through the officer portal, open **Profile & Settings → Department routing
rules**, choose **Edit**, update the municipality/department/source, then save.
If an officer session was already open during authorization, sign out and sign
back in to refresh the administrator permissions shown by the app.
**Mark verified with source** requires a source note; it records an administrator's
verification assertion, not automatic verification by this application. Existing
complaint assignments remain unchanged when rules change. New assignments snapshot
their provisional/verified context for citizen and authority details. Manual
reassignment keeps the existing officer reason/history workflow.

For a separate installation, run from `backend` after building:

```powershell
npm run build
node scripts/configure-municipality.cjs
# Preview first. Apply only the intended configuration:
node scripts/configure-municipality.cjs --apply
```

The local operator script selects an existing authority automatically only when
exactly one exists. With multiple authorities, supply
`--administrator-id=<existing-authority-id>`. It rejects a missing/non-authority
account and does not expose an admin-granting API. Apply uses insert-only upserts,
preserving existing customized rules. This checkout has already been configured.

## Durable, distributed notifications

`NotificationIntent` entries are embedded in the complaint. Receipt, initial
routing, new-report authority notices, In Progress, duplicate confirmation,
reassignment, repair submission and repair rejection commit their event intent
with the domain write. The existing resolution outbox remains in place.
Notifications retain unique recipient/event keys and retries preserve read state.
The pending flag cannot be cleared over a concurrently appended event.

`notificationOutboxService.ts` flushes after successful mutations and the existing
delivery worker recovers pending events every five seconds. A notification write
outage leaves the complaint change saved and the intent pending. No MongoDB replica
set/transaction service or additional broker is required for this single-document
commit approach. At least one persistent API process must run with
`DELIVERY_WORKER_ENABLED=true` (the default).

`liveNotifications.ts` sends authenticated local socket hints immediately and
polls persisted notification/delivery revisions every 1.5 seconds for connected
recipients. Separate API processes therefore observe writes made elsewhere.
Session revocation/password-version changes also close stale sockets on other
processes. The app fetches owner-scoped records and catches up on reconnect.
Database failures retain stored records; reconnect/manual refresh remains available.
This is not a claim about OS push delivery while the app is closed.

## Security changes and deployment configuration

Password changes atomically increment `User.sessionVersion`, return a replacement
session and invalidate older HTTP tokens and sockets. Both profile screens store
the replacement session. Actual browser testing verified a subsequent authorized
mapping change and saved-session resume; old-token requests returned HTTP 401.
Legacy accounts with no stored version remain compatible until their credentials
change. The existing force-login/explicit-resume behavior is preserved.

Native bearer tokens now use `expo-secure-store`, with write-before-delete
migration from the legacy AsyncStorage key. The web adapter preserves the existing
browser storage behavior. Native plugin introspection and Android export pass,
but a **new native build** and device test are required to verify platform storage.
Browser token storage and existing public image URL access remain production
hardening limitations; an export is not a security certification.

Image upload validation now decodes JPEG/PNG/WebP locally with Sharp, checks the
declared format, rejects corrupt/multipage images, and caps decoding at 24 million
pixels in addition to the existing 10 MB upload limit. Manual complaint uploads
do not depend on the Python service being available for content validation.

Set these in the **existing** `backend/.env`, without sharing secrets:

```dotenv
# Defaults to mongo outside tests; keep replicas on the same DB and JWT secret.
RATE_LIMIT_STORE=mongo
# Actual trusted web origins, comma-separated. No wildcard.
CORS_ORIGINS=https://your-actual-web-origin.example
# Existing delivery worker also recovers general complaint notification intents.
DELIVERY_WORKER_ENABLED=true
```

The example origin is a placeholder, not a deployed site. In production, an empty
origin list denies browser origins. Native requests without an Origin header remain
supported. Development preserves the existing local-origin behavior. CORS is not
authentication. Shared `RateLimitBucket` counters use atomic MongoDB updates,
hashed identifiers, window reset and TTL cleanup. Tests explicitly use memory
limits; a production deployment must retain shared MongoDB storage. Startup waits
for the relevant declared indexes before accepting requests.

Backend production dependencies: **0 npm advisories**. Mobile production dependency
tree: **22 advisories: 0 critical, 14 high, 7 moderate, 1 low**, compared with the
46-advisory intermediate snapshot before the targeted overrides. These counts
include transitive build/CLI packages; they are not 22 reproduced application
exploits. Remaining chains include old Expo/React Native CLI, `node-forge`,
`image-size`, `fast-xml-parser`, `send`, and compiler-transitive Zod 3. Fixing all
requires further dependency/SDK compatibility work and native regression testing.
No forced SDK downgrade/major framework replacement was applied merely to remove
audit output. Keep the lockfile; the patched installation was reconciled with
`npm install --legacy-peer-deps` to preserve React Native 0.74.5 and React 18.

## Model and chatbot readiness

The AI loader now reads `ai-service/.env` independently of working directory;
process environment wins, and an explicitly empty model path disables that entry.
Path, enabled and confidence overrides are tested against actual class metadata.
No filenames or confidence scores are used to fabricate category compatibility.

```powershell
# From ai-service; exit 2 means required classes remain unavailable.
.\venv\Scripts\python.exe -m app.model_readiness
# From backend, after npm run build:
node scripts/check-chat-provider.cjs
# Once privately configured, exercise the real provider:
node scripts/check-chat-provider.cjs --probe
```

Current readiness reports four loaded models but missing `road_damage`,
`broken_streetlight`, `water_leakage`, and `drainage_problem` coverage. Configure
compatible reviewed weights using `ROAD_DAMAGE_MODEL_PATH`,
`STREETLIGHT_MODEL_PATH`, and `WATER_LEAKAGE_MODEL_PATH`, restart and run actual
category inference. See [model configuration/training](../ai-service/models/MODEL_CONFIGURATION.md).
No compatible additional weights or labeled training datasets were supplied.
Existing severity remains explicitly experimental and unvalidated.

`CHAT_PROVIDER_URL` and `CHAT_PROVIDER_MODEL` remain absent; put the provider's
optional `CHAT_PROVIDER_API_KEY` in the backend only. The readiness check prints
configuration/availability booleans, not keys or generated content. The existing
provider performs constrained intent classification with factual guide responses;
the unconfigured fallback is labeled as a built-in guide, not live AI.

## Executed verification

| Check | Result |
|---|---|
| Backend TypeScript build | PASS |
| Full backend Jest suite | **112 tests / 16 suites PASS** |
| Python suite | **25 tests PASS**, one Starlette/httpx deprecation warning |
| Mobile TypeScript | PASS |
| Android and web Expo exports | PASS, existing Expo 51 / React Native 0.74.5 |
| Expo native plugin introspection | PASS; physical build/device not tested |
| Native token adapter ordering/failure handling | 4 checks PASS with mocked platform storage |
| Browser fixtures | 108 auth + 27 dashboard + 351 route layouts, 6 interactions, 12 OTP/notification groups PASS |
| Actual YOLO/API/MongoDB/browser flow | 8 groups PASS, including geometry, edited text, fallback, priority filtering/sorting and explicit status control |
| Actual operations browser/API flow | 8 groups PASS, including routing, repair review and live resolution receipt |
| Actual OTP API/browser flow | 5 groups PASS, **mocked senders only** |
| New routing/password browser/API flow | 3 groups PASS; 320/375/768/1440 px; no measured page overflow; two WCAG A/AA scans with no violations |
| Cross-process notification/logout recovery | PASS using a separate actual Node API process and isolated MongoDB |
| Model/readiness and chat checks | Correctly report external blockers, not PASS |

New targeted backend coverage injects notification persistence outages, runs
concurrent retry workers, verifies intent privacy/idempotency/read-state retention,
tests shared rate counters and expiry, rejects corrupt magic-prefix images, checks
password invalidation and cross-process socket closure, and verifies idempotent
Avadi setup, source requirements and production CORS behavior.

Synthetic tests use `civictrack_isolated_test`, `civictrack_phase2_e2e` and
`civictrack_otp_browser_test`. Real delivery credentials were disabled in test
processes. No private records/credentials or real delivery assertions are included.
The only authorized application-data changes were admin authorization/audit and
the proposed routing rules described above.

Evidence: [follow-up evidence folder](partial-fixes-2026-10-25/),
[verification summary](partial-fixes-2026-10-25/verification-summary.json),
[backend tests](partial-fixes-2026-10-25/backend-tests.json),
[actual routing/password results](../mobile/tests/artifacts/partial-live-results.json),
[actual operations](../mobile/tests/artifacts/operations-live-results.json),
[browser fixtures](../mobile/tests/artifacts/ui-restoration/1792903956211/),
[actual OTP with mocked senders](../mobile/tests/artifacts/otp-live/1792903958948/results.json).

Main changed areas: backend complaint/management/authority controllers and models;
`notificationOutboxService`, `liveNotifications`, `mongoRateLimitStore`, municipal
setup script/template; authentication/upload/CORS middleware; mobile auth context,
token adapters, profile screens and department mapping/details components; Python
configuration/readiness/tests; dependency manifests/locks and documentation.

The isolated audit services on 5052/8052/8083 were stopped after verification;
MongoDB and unrelated user processes were left running. Restart the normal API/AI
services and refresh the app to use the changes; rebuild native clients for the
new SecureStore plugin.
