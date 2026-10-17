# CivicTrack — green and blue interface system

Public-service software for citizens and municipal officers. Keep reports, evidence,
location and next actions clear. Preserve the existing React Native / Expo / TypeScript
implementation and React Navigation routes. The current visual direction uses
deep green, professional blue, restrained civic photography and light neutral surfaces.

## Direction and research

UI/UX Pro Max was read from the installed source at
`.agents/skills/ui-ux-pro-max/.claude/skills/ui-ux-pro-max/SKILL.md` and its local
design-system and React Native searches were run. Its Accessible & Ethical and Data-Dense
Dashboard guidance fits the product. Its Enterprise Gateway marketing sections did not
match this application, so those suggestions were excluded. The latest requested
green and blue palette and adaptive application layouts take precedence over generated
palette suggestions.

References studied: [shadcn sidebar](https://ui.shadcn.com/docs/components/radix/sidebar),
[Vercel](https://vercel.com/), [Linear](https://linear.app/),
[Material layout](https://m3.material.io/foundations/layout/canonical-examples/overview),
[Apple layout](https://developer.apple.com/design/human-interface-guidelines/layout).
Apply clear section hierarchy, restrained surfaces, persistent desktop navigation,
adaptive bar/rail/pane regions and safe areas. Components are original React Native
implementations; no web-only UI framework is added.

## Tokens and components

- Brand/action: green `#16634B`, dark green `#104936`, pale green `#EAF5EF`.
- Cinematic/navigation: dark green `#102F27`, raised green `#183E34`.
- Accent: blue `#245CB3`; pale blue `#93C5FD` for readable accent text on white.
- Canvas `#F4F7F6`, surface white, ink `#182D28`, secondary ink `#52635E`.
- Status colors are reserved for status: amber pending, blue in progress, green resolved,
  red error/high priority. Every status also has a text label.
- Display system sans-serif paired with Segoe UI/native body fonts; Nirmala UI and
  Noto Sans Tamil fallbacks on web. Titles 24–44, sections 18–22, body 15–16, metadata 12–13.
- Spacing uses the existing 4/8px scale. Page gutters 16/24/32px, content max 1520px.
- Corners: inputs/buttons 8px, surfaces 12px, large panels 16px. Subtle border and shadow.
- Primary filled green buttons, pale blue hero actions with dark text, neutral outline actions.
- Inputs have persistent labels, inline validation, 44px minimum controls and visible focus.
- Charts include values/labels and a readable data alternative. No decorative chart claims.

## Adaptive shell

- Under 768px: compact content and at most five primary bottom navigation actions;
  secondary destinations remain available through workspace actions/profile/drawer.
- 768–1199px: compact labeled navigation rail; useful two-column content without squeezing forms.
- 1200px and above: 232px sidebar, persistent workspace header, multi-column content.
- Use measured available width for grids and forms; never infer content width only from screen width.
- Report workflow: wide evidence/workflow panes; mobile stacked image/results/form/actions.
- Tables begin only where available content width supports them. Mobile uses complaint cards.
- Maps occupy the available pane with a separate scrollable list rather than oversized margins.
- Chat uses an optional guidance pane on wide screens and a single conversation on mobile.
- The hotspot view places filters above the map, with a report list beside the map on
  desktop and below it on phones. Every cluster has a text count and records can be
  opened without relying on marker interaction alone.
- Repair comparison uses labeled original/completion images in two columns when space
  permits and stacks them on phones. Its review state remains text-visible.
- Notifications show title, event time and an unread mark, and a tap both records read
  state and opens the authorized complaint.

## Interaction and accessibility

Keep Ionicons consistent, remove emoji used as icons, preserve visible keyboard focus,
label icon buttons, respect reduced motion, retain field values on errors, and provide
loading/empty/error/retry states. No automatic complaint status updates, invented metrics,
model results or private-data access. Keep long text within a readable measure. Target widths
320, 375, 430, 768, 1024, 1280, 1440, 1920 plus a short landscape viewport.

## Photography and screen composition

Seven locally bundled Commons photographs cover Chennai infrastructure, Marina Beach,
road damage, waste, street lighting and leaking water infrastructure. Each has source,
author, license and transformation metadata in `mobile/assets/civic/credits.json`.
Attribution is available in both profile screens. No reference photo is inserted as a
citizen's complaint evidence or an AI result. Actual uploaded photos retain their
aspect ratio and measured bounding-box coordinate logic.

`CivicVisuals.tsx` provides photographic mastheads, dark green scrims, green/blue edge rules
and a small original geometric detail. Auth pages use immersive photographic panes
beside the existing forms; phones use compact image headers. The citizen dashboard
uses an image-led reporting hero and photographic category shortcuts. Authority views
keep charts, filters and tables on neutral surfaces beneath restrained image banners.
Profiles, notifications, assistance, upload/empty states, maps and detail controls use
the same tokens. Validation for the latest implementation is recorded in MASTER_IMPLEMENTATION_VERIFICATION.md.
