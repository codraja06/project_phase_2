/**
 * CivicTrack Design System — Color Palette
 * 
 * CivicTrack original identity: deep green, professional blue and neutral surfaces.
 * Semantic tokens keep text, status and decorative accents distinct.
 *
 * Contrast requirements (WCAG 2.1 AA):
 *   - Body text: ≥ 4.5:1
 *   - Large text (18px+ bold or 24px+): ≥ 3:1
 *   - UI components & graphical objects: ≥ 3:1
 */

// ─── Light Mode Palette ────────────────────────────────────────────────────────

export const LIGHT_COLORS = {
  // Primary actions and selected navigation
  primary: '#16634B',
  primaryDark: '#104936',
  primaryDeep: '#0C372A',
  primaryLight: '#EAF5EF',
  primarySurface: '#D5EBDF',
  primaryHover: '#12543F',
  primaryGlow: 'rgba(22, 99, 75, 0.14)',

  // Professional blue secondary actions
  secondary: '#245CB3',
  secondaryDark: '#1B478D',
  secondaryDeep: '#153C79',
  secondaryLight: '#EDF3FC',
  secondarySurface: '#DDE8FA',
  secondaryHover: '#1B478D',
  secondaryGlow: 'rgba(36, 92, 179, 0.14)',
  gold: '#93C5FD',
  goldLight: '#EDF3FC',
  cinematic: '#102F27',
  onCinematic: '#FFFFFF',

  // Authority Command Accents
  authorityPrimary: '#183E34',
  authorityDark: '#102F27',
  authorityLight: '#EAF5EF',
  authoritySurface: '#D5EBDF',
  authorityGlow: 'rgba(15, 23, 42, 0.12)',

  // Neutrals (Zinc scale — warmer than pure gray)
  darkCharcoal: '#182D28',
  slateDark: '#27272A',
  slateMedium: '#52635E',
  slateMuted: '#596B65',
  slateLight: '#EDF2EF',

  // Backgrounds & Surfaces
  background: '#F4F7F6',
  backgroundNeutral: '#EDF2EF',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  card: '#FFFFFF',
  cardHover: '#F5FAF7',
  cardBorder: '#DFE7E2',

  // Warm ink and readable secondary text on light surfaces
  textPrimary: '#182D28',
  textSecondary: '#52635E',
  textMuted: '#596B65',
  textInverse: '#FFFFFF',
  textLink: '#16634B',

  // Borders
  border: '#CAD6CF',
  borderLight: '#DFE7E2',
  borderStrong: '#B1BFB7',
  borderMaroon: '#FECACA',
  borderYellow: '#FDE68A',
  divider: '#DFE7E2',

  // Status colors retain independent text labels alongside color
  pending: '#D97706',           // Amber
  pendingLight: '#FFFBEB',
  pendingDark: '#92400E',
  pendingBorder: '#FDE68A',

  inProgress: '#2563EB',        // Blue
  inProgressLight: '#EFF6FF',
  inProgressDark: '#1D4ED8',
  inProgressBorder: '#BFDBFE',

  resolved: '#059669',          // Emerald (darker for contrast)
  resolvedLight: '#ECFDF5',
  resolvedDark: '#047857',
  resolvedBorder: '#A7F3D0',

  rejected: '#52525B',
  rejectedLight: '#F4F4F5',
  rejectedDark: '#27272A',
  rejectedBorder: '#D4D4D8',

  // Alerts
  error: '#DC2626',
  errorLight: '#FEF2F2',
  errorDark: '#991B1B',
  errorBorder: '#FECACA',

  warning: '#D97706',
  warningLight: '#FFFBEB',
  warningDark: '#92400E',

  success: '#059669',
  successLight: '#ECFDF5',
  successDark: '#047857',
  successBorder: '#A7F3D0',

  info: '#2563EB',
  infoLight: '#EFF6FF',

  // AI Overlay
  overlayBox: '#F59E0B',
  overlayBoxBg: 'rgba(245, 158, 11, 0.15)',
  overlayBoxBorder: '#F59E0B',
  overlayBoxMaroon: '#B71C1C',

  // Scrim / Overlay
  scrim: 'rgba(0, 0, 0, 0.5)',
  scrimLight: 'rgba(0, 0, 0, 0.25)',
};

// ─── Dark Mode Palette ─────────────────────────────────────────────────────────

export const DARK_COLORS: typeof LIGHT_COLORS = {
  primary: '#6EE7B7',
  primaryDark: '#FCA5A5',
  primaryDeep: '#B91C1C',
  primaryLight: '#1C1012',
  primarySurface: '#2A1215',
  primaryHover: '#F87171',
  primaryGlow: 'rgba(239, 68, 68, 0.20)',

  secondary: '#93C5FD',
  secondaryDark: '#FCD34D',
  secondaryDeep: '#D97706',
  secondaryLight: '#1A1708',
  secondarySurface: '#2A2210',
  secondaryHover: '#FBBF24',
  secondaryGlow: 'rgba(245, 158, 11, 0.20)',
  gold: '#93C5FD',
  goldLight: '#30250F',
  cinematic: '#102F27',
  onCinematic: '#FFFFFF',

  authorityPrimary: '#E2E8F0',
  authorityDark: '#F8FAFC',
  authorityLight: '#1E293B',
  authoritySurface: '#334155',
  authorityGlow: 'rgba(226, 232, 240, 0.12)',

  darkCharcoal: '#FAFAF9',
  slateDark: '#E4E4E7',
  slateMedium: '#D4D4D8',
  slateMuted: '#A1A1AA',
  slateLight: '#52525B',

  background: '#09090B',
  backgroundNeutral: '#18181B',
  surface: '#1C1C1E',
  surfaceElevated: '#2C2C2E',
  card: '#1C1C1E',
  cardHover: '#2C2C2E',
  cardBorder: '#3F3F46',

  textPrimary: '#FAFAF9',
  textSecondary: '#D4D4D8',
  textMuted: '#A1A1AA',
  textInverse: '#18181B',
  textLink: '#F87171',

  border: '#3F3F46',
  borderLight: '#27272A',
  borderStrong: '#52525B',
  borderMaroon: '#7F1D1D',
  borderYellow: '#78350F',
  divider: '#27272A',

  pending: '#F59E0B',
  pendingLight: '#1A1708',
  pendingDark: '#FCD34D',
  pendingBorder: '#78350F',

  inProgress: '#3B82F6',
  inProgressLight: '#0C1526',
  inProgressDark: '#93C5FD',
  inProgressBorder: '#1E3A5F',

  resolved: '#10B981',
  resolvedLight: '#052E16',
  resolvedDark: '#6EE7B7',
  resolvedBorder: '#064E3B',

  rejected: '#A1A1AA',
  rejectedLight: '#27272A',
  rejectedDark: '#D4D4D8',
  rejectedBorder: '#3F3F46',

  error: '#EF4444',
  errorLight: '#1C1012',
  errorDark: '#FCA5A5',
  errorBorder: '#7F1D1D',

  warning: '#F59E0B',
  warningLight: '#1A1708',
  warningDark: '#FCD34D',

  success: '#10B981',
  successLight: '#052E16',
  successDark: '#6EE7B7',
  successBorder: '#064E3B',

  info: '#3B82F6',
  infoLight: '#0C1526',

  overlayBox: '#FBBF24',
  overlayBoxBg: 'rgba(251, 191, 36, 0.20)',
  overlayBoxBorder: '#FBBF24',
  overlayBoxMaroon: '#EF4444',

  scrim: 'rgba(0, 0, 0, 0.7)',
  scrimLight: 'rgba(0, 0, 0, 0.4)',
};

// ─── Default Export (Light) ────────────────────────────────────────────────────

export const COLORS = LIGHT_COLORS;

export type ColorTokens = typeof LIGHT_COLORS;
