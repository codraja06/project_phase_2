# CivicTrack interface system

Public-service software for citizens and municipal officers. Keep reports, evidence,
location and next actions clear. Preserve the existing React Native / Expo / TypeScript
implementation and React Navigation routes.

## Direction and research

UI/UX Pro Max was read from the installed source at
`.agents/skills/ui-ux-pro-max/.claude/skills/ui-ux-pro-max/SKILL.md` and its local
design-system and React Native searches were run. Its Accessible & Ethical and Data-Dense
Dashboard guidance fits the product. Its Enterprise Gateway marketing sections did not
match this application, so those suggestions were excluded. The requested green/blue
palette and adaptive application layouts take precedence over generated recommendations.

References studied: [shadcn sidebar](https://ui.shadcn.com/docs/components/radix/sidebar),
[Vercel](https://vercel.com/), [Linear](https://linear.app/),
[Material layout](https://m3.material.io/foundations/layout/canonical-examples/overview),
[Apple layout](https://developer.apple.com/design/human-interface-guidelines/layout).
Apply clear section hierarchy, restrained surfaces, persistent desktop navigation,
adaptive bar/rail/pane regions and safe areas. Components are original React Native
implementations; no web-only UI framework is added.

## Tokens and components

- Brand: deep green `#16634B`, dark green `#104936`, pale green `#EAF5EF`.
- Secondary: professional blue `#245CB3`, pale blue `#EDF3FC`.
- Canvas `#F4F7F6`, surface white, ink `#182D28`, secondary ink `#52635E`.
- Status colors are reserved for status: amber pending, blue in progress, green resolved,
  red error/high priority. Every status also has a text label.
- System sans-serif font; titles 24–32, sections 18–22, body 15–16, metadata 12–13.
- Spacing uses the existing 4/8px scale. Page gutters 16/24/32px, content max 1520px.
- Corners: inputs/buttons 8px, surfaces 12px, large panels 16px. Subtle border and shadow.
- Primary filled green buttons, secondary/outline neutral buttons, red destructive buttons.
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
model results or private-data access. Keep long text within a readable measure. Test widths
320, 375, 430, 768, 1024, 1280, 1440, 1920 plus a short landscape viewport.
