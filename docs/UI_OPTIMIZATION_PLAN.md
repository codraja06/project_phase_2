# CivicTrack interface optimization — audit and plan

Recorded before implementation, 29 October 2026. This brief supersedes the decorative dashboard direction in DESIGN.md. Existing uncommitted Power BI export and safe error logging changes are retained.

## Audit and baseline

| Area / source | Current finding | Planned change |
| --- | --- | --- |
| WorkspaceShell, AuthoritySidebar, navigation | Repeated page titles; 134px branding; inconsistent drawer and desktop labels | Compact branding, grouped operations/insights/account navigation, existing route preservation |
| CitizenDashboardScreen | Search, three shortcut cards, large hero, six category tiles, four metrics, date controls, community banner, recent list compete | One reporting action, compact status summary, three recent complaints; map and help remain in navigation/profile |
| ReportIssueScreen, ImagePickerCamera, CategorySelector, DescriptionEditor | Four steps combine evidence/category/description; model controls appear before upload; GPS requested before location stage | Five stages, advanced detection disclosure, stage validation and edit links in final review |
| ComplaintHistoryScreen, ComplaintCard | Large headers, repeated descriptions/AI details on every card, always-visible filters | Compact summaries and collapsible filters with active summary |
| AuthorityDashboardScreen | KPI cards, hotspot banner, queue, resolution donut, shortcuts, trend, second report feed | Small KPI row, unresolved priority queue and one trend |
| AuthorityComplaintsScreen | Dense AI-versus-user and citizen-contact columns; three persistent filter rows; oversized headers | Essential queue columns, status/search visible, priority/sort disclosure, pagination and existing bulk actions retained |
| ComplaintDetailScreen, AuthorityDetailScreen, ComplaintManagementPanel, TriageSummary | Duplicated priority/confidence, technical language, many simultaneously open officer forms | Readable identity/evidence/description/status; secondary triage, related reports, audit and reassignment disclosures; repair review and status actions remain reachable |
| AuthorityInsights | Five repeated sparklines use the same total trend; resolution/category/geographic/recent content all rendered together | Overview, categories, geography and resolution views; shared applied filters and Power BI download preserved |
| AuthorityMapScreen, CitizenMapScreen | Many filters above map; coordinate terminology overwhelms title | Compact title, filter disclosure; real pins and report selection preserved |
| Login/register/OTP, Input, Button | Existing OTP/error/retry flow; repeated promotional text; inputs have accessible names but errors need live announcements | Retain auth and OTP logic, compact typography and shared labels/error feedback |
| Profiles, DepartmentMappingManager | Account operations already grouped; mapping editor competes with account settings | Collapsible authorized routing; retain profile/password/provider preference forms |
| NotificationCenter, Notifications screens | Shared read/unread/filter actions already implemented | Shared spacing and control improvements; keep read-all/open-report actions |
| CivicAssistantScreen | Dedicated page already exists; provider errors/fallback present | Preserve dedicated help page, avoid global panel |
| Authority APIs / User model | Role gates and admin-only mappings/export exist, but no officer department identity or record scoping | Small shared authorization scope for list/detail/mutations/analytics/hotspots; unassigned officers denied; admin provisioning process, no automatic account migration |

Source audit includes live routes and imports; legacy sidebar/button variants are not assumed active. Severity is experimental; model availability, SMS, chatbot and delivery depend on configured providers. No invented operational counts or data.

## References and adopted decisions

- [UX4G components](https://www.ux4g.gov.in/components): consistent government-service controls and clear language. Retain React Native implementation, no CSS framework migration.
- [NN/g progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/): reveal secondary options in one predictable layer; keep required actions visible.
- [Material adaptive navigation](https://developer.android.com/develop/ui/compose/layouts/adaptive/build-adaptive-navigation): adapt navigation to available width; bottom destinations on phones, rail on tablets, grouped sidebar on desktop.
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [target size minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html): visible keyboard focus, names, expanded/selected state, readable errors. Use 44px controls where practical (AA minimum is 24px subject to exceptions), not a claim of conformance from code alone.
- [Government Analysis Function charts](https://analysisfunction.civilservice.gov.uk/policy-store/data-visualisation-charts/): fewer purposeful charts, descriptive titles and text data alternatives; remove misleading repeated sparklines.
- [FixMyStreet workflow](https://fixmystreet.org/how-it-works/): make issue category, location and tracking understandable; preserve CivicTrack's actual evidence flow.

## Priority and implementation order

1. Shared spacing/typography, disclosure, navigation labels and accessibility.
2. Citizen home, five-stage reporting, tracking and detail sections.
3. Officer home/queue/details, analytics sections, map filters and authorized settings.
4. Department scoping with API regression tests. Do not modify real account records or infer departments.
5. Type/build checks, backend tests, browser route/workflow and responsive checks at 320/390/768/1366/1440px; record actual evidence and limitations separately.

## Design tokens

White/light gray surfaces, existing crimson primary, dark neutral text, system font and existing Ionicons. Shared content maximum 1280px; 16px phone / 24px wide gutters; 8/12/16/24px spacing; 24px page title and 16–17px section title. Essential badges use both text and color. No decorative charts or new dependencies.
