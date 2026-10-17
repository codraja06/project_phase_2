# Complaint operations: duplicates, routing, repair, notifications and analytics

These features extend the existing MongoDB complaint records and Expo screens. Existing
complaints remain available. New fields are optional so no destructive migration is needed.

## Duplicate review

On the citizen review step, `POST /api/management/duplicates/check` checks unresolved,
same-category complaints with valid GPS within `DUPLICATE_RADIUS_METERS` (default 120 m)
and `DUPLICATE_LOOKBACK_DAYS` (default 30 days). Distances use the Haversine formula.
The search uses a coordinate bounding box then an exact distance calculation; it shows
up to five nearby candidates. Generic `other` reports are not compared. An unknown
location skips the check. New uploads receive a server-signed dHash64 plus RGB48
histogram computed by Pillow in the existing AI service. Both image hashes must be
within `DUPLICATE_MAX_HASH_DISTANCE` (default 10 of 64 bits) and histogram cosine
similarity at least `DUPLICATE_MIN_COLOR_SIMILARITY` (default 0.85). Visually
incompatible candidates are excluded. Missing signatures (including legacy records)
are explicitly labeled manual-review candidates, never confirmed visual matches.
This lightweight method supports near-identical photos, not arbitrary viewpoints;
thresholds have not been calibrated against a labeled same-incident dataset. A warning is only a
suggestion; the citizen can still submit. Another citizen's reference and ID are hidden
in the warning. Authority users can query candidates with
`GET /api/management/complaints/:id/duplicates` and explicitly link one with
`PATCH /api/management/complaints/:id/duplicate` and a reason. The original must
predate the new report and have the same category. The link, reason, officer and time
are stored; neither complaint is deleted, merged or automatically resolved.

## Internal department routing

`GET /api/management/departments` lists rules for authority users. Only an authority
with `isAdmin: true` may `PUT /api/management/departments/:category` with
`{ "department": "Local Road Team", "enabled": true }`. The administrator can
create, replace, enable and disable category mappings in the Officer Profile screen.
Provision the first administrator through your controlled account-management process
by setting `isAdmin: true` on an existing `role: "authority"` user document. Citizen
registration cannot grant this flag. No municipality name is hardcoded. New reports
use the currently enabled exact-category rule, or show **Awaiting assignment**.
Officers may change a report's assignment with
`PATCH /api/management/complaints/:id/department` plus a reason. Routing and
reassignment do not change complaint status. Initial assignment and every reassignment
append an officer/time/reason entry to `auditHistory`. Unknown categories, absent rules,
and AI results that do not confidently support the selected category remain unassigned.
Manual category selections are explicit citizen input and may follow configured rules. A citizen receives an in-app notice.

## Repair evidence and status history

An officer may upload a JPEG, PNG or WebP completion image (maximum 10 MB) using
`POST /api/management/complaints/:id/completion` while a complaint is In Progress.
The same file-content validation and local/Cloudinary storage path used by the original
photo apply. The original photo remains. The completion photo, submitting officer and
timestamp are stored separately; review begins as `pending`. An authority must use
`PATCH /api/management/complaints/:id/completion/review` with `accepted` or
`rejected`. Rejection requires an explanation. If evidence has been submitted, the
existing explicit Resolve status action is blocked until evidence is accepted.
Complaints with no completion photo retain the existing manual authority status flow.
Neither an upload nor acceptance changes status automatically. New status changes are
appended to `statusHistory`. Older records keep their existing status and timestamps;
events before this implementation cannot be reconstructed.

## In-app notifications

`GET /api/management/notifications?page=1` returns up to 30 recipient-owned events,
counts and unread total. `PATCH /api/management/notifications/:id/read` records read
time for that same authenticated recipient. The database enforces unique event keys per
recipient to avoid duplicate event notices. Events include complaint receipt,
initial department assignment/reassignment, authority new-report notice, status
changes, repair evidence submission/rejection and confirmed duplicate links. The
mobile and web notification screens load real records and open the referenced complaint.
The app connects to `/api/notifications/live` using WebSockets. Authentication is the
first frame containing the existing JWT (never a URL parameter). Only the authenticated
recipient receives a change signal, after the event is persisted. The app fetches the
current recipient-owned unread count/list, catches up on reconnect, retries with backoff
and refreshes after foregrounding. Expired tokens close the connection. Failed delivery
never deletes the stored event. Pull-to-refresh remains available during outages.
This is live in-app delivery while connected, not background OS push. No push provider,
APNs/FCM credentials or device-token registration are configured. The socket hub is
single-process: multiple API instances need a shared event broker/change-stream relay
before claiming cross-instance live delivery. Deploy the API with WebSocket upgrades
and HTTPS/WSS; restart the API after installing dependencies.

## Hotspots and resolution metrics

`GET /api/management/hotspots` is authority-only. It accepts `category`, `status`,
`priority`, `from` and `to` filters. Valid nonzero complaint coordinates are grouped
into configurable geographic grid cells (`HOTSPOT_CELL_DEGREES`, default 0.01 degrees;
API `cellDegrees` range 0.001-1). `HOTSPOT_WINDOW_DAYS` defaults to 30 unless explicit
dates are supplied. The map switches block/neighbourhood/area grouping with zoom and
also exposes direct scale controls. Cells use floor(coordinate / size), with counts and up to 20 report references per cell;
the response is limited to the top 100 cells. The map uses only stored complaint
coordinates and opens authorized complaint details. The location grouping is an
approximate visualization, not a verified physical hazard boundary.

The existing `GET /api/authority/analytics` additionally returns unresolved count,
department resolution counts and average hours, and UTC daily resolution counts and
average hours. Completed duration is `(resolvedAt - createdAt) / 3,600,000`; only
Resolved records with valid, ordered timestamps enter completed averages. Date filters
select complaints by their submission date, and the daily trend groups their resolution
dates. Department output shows count alongside average to provide workload context.
When `RESOLUTION_TARGET_HOURS` is set to a positive number, an unresolved complaint
older than that target counts as overdue. With no configured target, the dashboard
shows no overdue claim. No service deadline is assumed. Targets use ordinary elapsed hours, not business hours.
The API/UI also provide exact median completed duration, unresolved average/oldest age,
and resolution count/average by category. Median uses a database count followed by a
sorted query selecting only the middle one/two durations; it does not fetch all records
into Node memory. These two queries can observe concurrent changes; analytics are a
live operational view, not a transactional financial report. Department/category rows
open filtered resolved lists; configured overdue counts open their unresolved records.

## Authority severity corrections and priority overrides

`PATCH /api/management/complaints/:id/triage` accepts `kind: severity|priority`,
`level` and a required reason (10-500 characters). Severity uses Low/Medium/High;
priority uses low/medium/high, or null to restore calculated priority. The original
`severity` evidence remains unchanged. The latest `severityReview` or `priorityOverride`
is stored separately with officer/time/reason; every decision appends `auditHistory`.
List/filter/map/analytics priority calculations all use the same effective policy.
The response identifies authority override and shows the underlying recommendation.
Resolved complaints remain outside the attention queue. No review changes status.

## Data and security

New complaint fields are `duplicateOf`, `duplicateReason`, `duplicateConfirmedAt/By`,
`assignedDepartment/At/By`, `completionImageUrl`, submission and review metadata,
and `statusHistory`. New collections are `departmentrules` and `notifications`, each
with indexes. Citizen access remains scoped to their own complaint; all mapping,
hotspot and repair actions require authority authentication, and mapping edits
require the additional administrator flag. There is no external government integration.

## Verification

From `backend`, run `npm run build` and `npm test -- --silent`. From `mobile`, run
`npm run type-check` and `npm run test:e2e` against the local Expo web server.
The opt-in real-service browser script is `node tests/e2e/operations-live.cjs` from
`mobile`; it expects Expo on 8083 and Express on 5052 using isolated local database
`civictrack_phase2_e2e`. It creates and removes only its own test users, complaints,
rules and notifications. It checks duplicate warning, routing, hotspot navigation,
repair review, read state, analytics and eight requested widths.
