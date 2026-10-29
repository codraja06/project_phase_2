# OTP and resolution-notification verification — 18 October 2026

Implementation and automated/local integration checks completed in the existing
project. Real SMTP/Twilio delivery was not exercised by the automated checks below.
No real email or SMS was sent during these checks. Email previews use synthetic
codes and do not contain account or provider credentials.

## Actual results

| Check | Result |
| --- | --- |
| Backend TypeScript build | Passed |
| Backend Jest + isolated MongoDB | **96 tests passed, 14 suites** including delivery availability, the development-OTP/retry fix and verification email content |
| Mobile TypeScript | Passed |
| Expo Android and web export | Both passed; this is build evidence, not a physical-device test |
| Existing AI pytest suite | **23 passed**; two existing dependency deprecation warnings |
| Browser regression suite | 108 auth-layout checks, 27 dashboard layouts, 351 route/width checks; no overflow/runtime failures |
| Existing browser interaction flows | Six groups passed: profile, password, server preferences, reporting, authority updates and map navigation |
| New OTP/notification browser API-fixture suite | Twelve groups, six viewport sizes, two accessibility scans; passed, including disabling unavailable OTP requests, completion retry, existing-email sign-in navigation and ignoring an old development-code payload |
| New browser → real Express → MongoDB flow, mocked external senders | Five groups passed, including actual account creation, JWT dashboard, persisted SMS consent, idempotent resolution, delivery states and read/details navigation |
| Existing real local operations flow | Eight groups, 32 width checks, eight accessibility scans; passed, including live WebSocket resolution updates without reload |
| Existing real local AI/report flow | Eight groups passed, including four-model inference, signed evidence, final editable description, manual fallback, priority and explicit authority status control |
| Real YOLO bounding-box alignment | Within the existing 2px tolerance at eight widths |
| Provider adapter tests | SMTP/Twilio network transports mocked; real adapter request formats and failure classification verified |
| Git whitespace check / ignored `.env` | Passed; `.env` remains ignored |

The last full backend run used deterministic test keys, an isolated database and
empty real-provider credentials. New tests mock the send functions or network
transport; none can silently fall back to sending through configured production
credentials. Synthetic accounts/reports exist only in the isolated verification
databases and are cleaned by their tests. Existing application records were not
deleted or backfilled.

## Acceptance coverage

| Requested criterion | Evidence |
| --- | --- |
| 1. Valid OTP registration | `signupVerification.test.ts`; `otp-live.cjs` uses actual API/DB and browser dashboard navigation |
| 2. Invalid code rejected | API and browser tests |
| 3. Expired code rejected | API checks logical expiry before TTL; browser expiry state |
| 4. No OTP reuse | Atomic concurrent verification test, consumed hash, completion replay rejection |
| 5. Attempt limit | Five wrong guesses block the correct code afterward |
| 6. Resend cooldown/limits | Persistent cooldown, hourly cap/reset, concurrent issuer and old-challenge invalidation; browser countdown |
| 7. Duplicate accounts | Existing email and formatted legacy phone rejected after contact verification; unique canonical-phone index |
| 8. No verification bypass | Completion and old raw-register endpoint reject unverified inputs; required-phone case checked separately |
| 9. Delivery errors | Missing SMTP, failed email, optional/required SMS failure; safe setup/error UI |
| 10. One resolution event | Actual authorized transition creates exact owned notification with category/date |
| 11. Eligible channels only | Verified email, preference, phone verification, SMS consent, provider configuration and pre-send consent recheck |
| 12. Repeated Resolved save | No second event/job/send; concurrent workers and post-success reruns tested |
| 13. Authority permission | Citizen and unauthenticated status changes rejected |
| 14. Notification ownership | Another citizen cannot fetch or mark the event read |
| 15. Failure preserves status | Retry/backoff, permanent failures, five-attempt stop, uncertain acceptance and outbox recovery leave Resolved saved |
| 16. Existing features | Existing sign-in/Google tests, real local complaint/AI/GPS-map/dashboard/repair/analytics/live-notification flows |

Additional checks cover hashed OTP storage, bcrypt password reuse on completion,
separate email/SMS verification, phone changes clearing verification/consent,
HTML escaping/plain-text fallback, stable message IDs, encrypted SMTP options,
and actual Twilio request construction without real outbound delivery.

## Reproduce

Run MongoDB locally. Existing dependency/install instructions still apply.

From `backend`:

```powershell
npm run build
npm test
```

Tests force `mongodb://127.0.0.1:27017/civictrack_isolated_test` and do not use the
application MongoDB URI. Do not run application workloads in that test database.

From `ai-service`:

```powershell
.\venv\Scripts\python.exe -m pytest tests -q
```

From `mobile`, with Expo web running:

```powershell
npm run type-check
$env:E2E_WEB_URL='http://localhost:8083'
npm run test:e2e
node tests/e2e/otp-live.cjs
npm exec --offline -- expo export --platform android --platform web --output-dir dist-phase2 --max-workers 2
```

`otp-live.cjs` requires a built backend and MongoDB. It creates its own ephemeral
HTTP server, uses `civictrack_otp_browser_test`, forwards the frontend requests
to actual Express, and replaces only external senders inside that test process.
It does not expose a test-code endpoint or add any production bypass.

For operations/YOLO regression, follow the existing scripts' local service setup:
isolated API 5052 (`civictrack_phase2_e2e`), AI 8052 and Expo web 8083 pointing to
that API. Run `operations-live.cjs`; set `PHASE2_TEST_IMAGE` to a real civic image
and run `phase2-live.cjs`. These opt-in suites create and clean only their own users
and reports. Keep provider variables empty during regression runs.

## Saved evidence

- Browser fixture regression: `mobile/tests/artifacts/ui-restoration/1792294190469/`
- Actual OTP browser/API/DB flow: `mobile/tests/artifacts/otp-live/1792294647979/results.json`
- Final existing interaction flows: `mobile/tests/artifacts/otp-final-flows/flows-results.json`
- Existing real-service operations: `mobile/tests/artifacts/operations-live-results.json`
- Existing actual AI/report flow: `mobile/tests/artifacts/phase2-live-results.json`
- Latest OTP fix browser fixtures: `mobile/tests/artifacts/otp/1792297118670/results.json`
- Latest actual API/MongoDB OTP fix flow: `mobile/tests/artifacts/otp-live/1792297215472/results.json`
- Current signup-availability fixtures: `mobile/tests/artifacts/otp/1792297827725/results.json`
- Current actual API/MongoDB signup-availability flow: `mobile/tests/artifacts/otp-live/1792297843239/results.json`
- Actual running app signup status screenshot: `mobile/tests/artifacts/signup-provider-status-fixed.png`
- Existing-email sign-in action fixtures: `mobile/tests/artifacts/otp/1792299487944/results.json`
- Actual API/MongoDB flow after the sign-in action change: `mobile/tests/artifacts/otp-live/1792299504248/results.json`

The screenshots of the OTP screen were captured with empty inputs. Real codes,
passwords, auth tokens and provider secrets are not recorded in these artifacts.

## Verification email and OTP screen polish (2026-10-18)

The email HTML now lives in `backend/src/services/verificationEmailTemplate.ts`.
It renders the actual issued code and configured expiry, with a plain-text alternative,
responsive table layout, no remote assets and optional dark-mode styles. The existing
signup controller uses this template for both initial requests and resends.
The Expo verification screen retains the existing APIs while adding a prominent
numeric input, focus state, expiry timer, grouped status panels and simpler actions.

Checks completed after these changes:

- Backend TypeScript build and 96 tests across 14 suites passed.
- Mobile TypeScript check and Android/web bundle export passed.
- OTP browser regression passed all 12 groups at six viewport sizes, including
  320×568; both WCAG A/AA automated scans reported zero violations.
- The actual Expo → Express → isolated MongoDB flow passed all five groups;
  external email/SMS senders were mocked in the test process.
- Synthetic email previews passed at 320px and 600px in light and dark browser modes,
  with no horizontal overflow and a contiguous, copyable six-digit code.

Evidence:

- `mobile/tests/artifacts/otp/1792300083388/results.json`
- `mobile/tests/artifacts/otp-live/1792300085230/results.json`
- `mobile/tests/artifacts/verification-email/1792300145813/results.json`
- Email preview HTML and light/dark screenshots are beside the last results file.

No real email or SMS was sent by these tests. Browser-rendered email previews do
not establish identical rendering in every Gmail/Outlook client. Physical-device
keyboard/autofill behavior remains untested; Android bundling passed. Existing
inbox messages retain their old appearance; newly requested codes use the new template.

## Remaining external setup and practical limits

1. Rotate the exposed SMTP app password and Twilio token. Enter replacements only
   in ignored backend configuration or the deployment secret store.
2. Configure the actual SMTP sender and optional Twilio sender using
   [the setup guide](OTP_NOTIFICATIONS.md). Replace example strings with real values.
3. Supply an owned recipient and explicit consent before any real delivery test.
   Until then, email/SMS acceptance and inbox/handset arrival are unverified.
4. Provider acceptance is shown as such. Delivery receipts/webhook callbacks and
   closed-app push are not implemented. An uncertain timeout/crash is held for
   manual provider reconciliation rather than blindly resending a possible duplicate.
5. Keep a persistent worker-enabled backend running; review the rollout/index
   instructions. Old records are not automatically verified or replayed.
6. Physical Android/iOS, live Google OAuth and production hosting were not tested
   by these local checks. Existing severity estimates remain experimental.
