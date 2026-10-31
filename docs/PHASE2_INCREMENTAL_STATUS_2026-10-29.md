# Phase 2 incremental implementation status

The five requested feature groups and the department portal are not yet complete.
This record distinguishes existing functionality from the changes made in this pass.

## Change in this pass

- Added **Regenerate AI draft** to the existing citizen image-analysis step. It
  reruns the existing image-analysis API using the same photo and detection mode.
  A new signed analysis token, detections and severity are used only when the
  service returns an actual detection and a draft. Existing citizen-edited text
  is retained; the citizen can choose Restore draft. When detection fails, the
  previous description and evidence remain available. The existing generator is
  deterministic, so regenerating can return the same wording.
- Added a limit of 20 image analyses per authenticated user per 15 minutes to
  `POST /api/ai/detect`, using the existing shared rate-limit store. Both initial
  analysis and regeneration count toward the limit. HTTP 429 signals the limit.
  The store is MongoDB by default outside tests, provided the existing
  `RATE_LIMIT_STORE` configuration is unchanged. No new provider key or database
  migration is required for this change.

Files modified in this pass: `backend/src/routes/aiRoutes.ts`,
`mobile/src/screens/citizen/ReportIssueScreen.tsx`; added
`backend/tests/aiRateLimit.test.ts`. Previous uncommitted work remains present.

Verification: backend TypeScript build passed; mobile type check passed; five
existing Phase 2 backend tests passed; one new API test confirmed that the 21st
analysis request for a test account returns HTTP 429. These tests used the
isolated test database. The new regeneration action has **not** been verified in
an end-to-end browser/device flow or with a live AI provider in this pass.

## Remaining requirements

1. **Description and duplicates:** test regeneration through the real UI and AI
   service; review how duplicate results can safely expose information without
   leaking other citizens' private records. The existing system already has a
   detection-grounded draft, manual fallback and proximity/visual duplicate check.
2. **Repair verification:** existing before/after evidence and audit support need
   a review for immutable evidence versions and repair notes; visual comparison is
   not established here.
3. **Chatbot:** an existing authenticated guide and own-complaint lookup are
   present. The external AI provider remains unconfigured and real-provider
   behavior has not been verified. Department contact details need verified data.
4. **Maps and analytics:** existing GPS maps and database aggregations need the
   requested filters and additional metrics verified. They currently lack strict
   department authorization.
5. **Resolution time:** existing average and median calculations need the requested
   severity breakdown, missing-timestamp reporting and reopen-policy review.
6. **Department portal:** the existing authority APIs do not yet enforce
   department-level isolation. Officer provisioning, a central review queue,
   scoping of every list/detail/map/analytics/mutation/notification endpoint and
   cross-department authorization tests remain required. Do not treat the current
   authority portal as department-isolated.

No user complaint records were modified for this incremental change. Real email,
SMS delivery and physical-device behavior were not tested in this pass.
