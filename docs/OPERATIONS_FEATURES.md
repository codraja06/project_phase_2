# Complaint operations: duplicates, routing, repair, notifications and analytics

These features extend the existing MongoDB complaint records and Expo screens. Existing
complaints remain available. New fields are optional so no destructive migration is needed.

## Duplicate review

On the citizen review step, `POST /api/management/duplicates/check` checks unresolved,
same-category complaints with valid GPS within `DUPLICATE_RADIUS_METERS` (default 120 m)
and `DUPLICATE_LOOKBACK_DAYS` (default 30 days). Distances use the Haversine formula.
The search uses a coordinate bounding box then an exact distance calculation; it shows
up to five nearby candidates. Generic `other` reports are not compared. An unknown
location skips the check. Image similarity is not inferred. A warning is only a
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
reassignment do not change complaint status. A citizen receives an in-app notice.

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
No push provider is configured, so delivery is in-app when the screen refreshes.

## Hotspots and resolution metrics

`GET /api/management/hotspots` is authority-only. It accepts `category`, `status`,
`priority`, `from` and `to` filters. Valid nonzero complaint coordinates are grouped
into approximate 0.01° cells, with counts and up to 20 report references per cell;
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
shows no overdue claim. No service deadline is assumed.

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
