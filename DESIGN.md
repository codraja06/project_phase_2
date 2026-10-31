# Current direction — interface simplification

The October 2026 optimization brief supersedes the dashboard density guidance below. Preserve the red/white identity and existing functions; use compact headers, grouped navigation, five reporting steps and progressive disclosure. Current decisions and verification are in docs/UI_OPTIMIZATION_PLAN.md and docs/UI_OPTIMIZATION_VERIFICATION.md.

## Historical restoration reference

# CivicTrack original UI restoration

The latest request restores the previous CivicTrack interface rather than introducing
another theme. This direction supersedes the earlier green/blue and photographic
redesigns. Preserve the existing Expo/React Native/TypeScript stack and real APIs.

## Source and reference evidence

The existing Phase 1 checkout at `D:/project phase 1/project1` (Git HEAD `151ccd4`)
contains the original citizen dashboard, logo, typography, palette and screen styles.
Its `mobile/tests/dashboard-desktop.png` provides a local visual reference: white
sidebar, red/pink active navigation, red leaf/building logo, greeting/search, reporting
hero, pastel category icons, activity cards and recent incidents. Repository history
also contains `b74b27d` before the UI redesign and subsequent implementations.

The six specifically named ChatGPT Library PNGs were not supplied in this conversation
and were not found in the local project/download/attachment locations searched. No
Library access was established. This is restoration from available source with
compatible adaptations, not a claim of pixel-identical reproduction of unseen images.

## Original visual system

- Primary crimson `#B71C1C`; darker action text `#7F1416`.
- Soft red/pink `#FEF2F2` and `#FEE2E2`; white cards and sidebar.
- Authority navy `#0F172A` / `#020617`, neutral gray surfaces and dark readable text.
- Original system typography and Ionicons; original circular leaf/building logo.
- Reuse prior screen colors, type scale, radii and border styles. Retain current
  responsive wrapping, safe areas, focus indicators, error handling and loading states.
- Restore the original citizen reporting hero and icon category tiles. Remove the
  later decorative photographic banners. Real complaint images remain evidence.

## Layout and navigation

Desktop uses the original light sidebar (260px) with red/pink selection and full-width
content. Tablet retains a compact navigation rail. Mobile retains compact headers and
at most five bottom destinations; desktop never shows the mobile bottom bar.

Citizen primary destinations are Dashboard, Report Issue, My Complaints, Notifications,
and Profile & Settings. Map and Civic Assistance remain accessible as additional
navigation entries; mobile assistance remains in the existing profile menu.

The citizen dashboard reuses the prior greeting/search/report hero/recent incidents
layout. Summary cards use actual own-report and unread-notification counts. Nearby
Issues is a map shortcut, not an invented count of nearby private complaints. The
shield denotes a signed-in citizen account; government identity verification is not
asserted without verification data.

Authority keeps Command Center, actual complaint KPIs, triage list, category analytics,
map, notification and profile destinations. Current Phase 2 controls remain reachable.
All operational counts and lists use the current backend and MongoDB records.

## Preservation and verification

Do not roll back backend models, AI behavior, signed evidence, severity reviews,
priority overrides, department routing, duplicates, repair verification or notifications.
Only frontend styling/layout and directly related test selectors change.

See `UI_RESTORATION_VERIFICATION.md` for the restoration file list, actual test results,
known reference limitations and the frontend snapshot saved before restoration.
