/**
 * CivicTrack Design System — Color Palette
 * 
 * CivicTrack original TVK-inspired identity: vermilion, maroon and warm gold.
 * Enhanced with proper WCAG AA contrast ratios and dark mode support.
 *
 * Contrast requirements (WCAG 2.1 AA):
 *   - Body text: ≥ 4.5:1
 *   - Large text (18px+ bold or 24px+): ≥ 3:1
 *   - UI components & graphical objects: ≥ 3:1
 */

// ─── Light Mode Palette ────────────────────────────────────────────────────────

export const LIGHT_COLORS = {
  // Primary actions and selected navigation
  primary: '#BE2638',
  primaryDark: '#901B30',
  primaryDeep: '#5B1226',
  primaryLight: '#FCECEF',
  primarySurface: '#F5D4DA',
  primaryHover: '#A41F32',
  primaryGlow: 'rgba(190, 38, 56, 0.14)',

  // Gold on light surfaces uses a dark ochre for readable text
  secondary: '#98610B',
  secondaryDark: '#744807',
  secondaryDeep: '#593606',
  secondaryLight: '#FFF4D7',
  secondarySurface: '#F8E4AA',
  secondaryHover: '#744807',
  secondaryGlow: 'rgba(242, 193, 78, 0.18)',
  gold: '#F2C14E',
  goldLight: '#FFF4D7',
  cinematic: '#2C101B',
  onCinematic: '#FFF9F1',

  // Authority Command Accents
  authorityPrimary: '#411426',
  authorityDark: '#2C101B',
  authorityLight: '#F8ECF0',
  authoritySurface: '#ECD5DE',
  authorityGlow: 'rgba(15, 23, 42, 0.12)',

  // Neutrals (Zinc scale — warmer than pure gray)
  darkCharcoal: '#281E23',
  slateDark: '#27272A',
  slateMedium: '#65565C',
  slateMuted: '#74636B',
  slateLight: '#F3ECE8',

  // Backgrounds & Surfaces
  background: '#FAF6F2',
  backgroundNeutral: '#F3ECE8',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  card: '#FFFFFF',
  cardHover: '#FFF9F5',
  cardBorder: '#E9DED8',

  // Warm ink and readable secondary text on light surfaces
  textPrimary: '#281E23',
  textSecondary: '#65565C',
  textMuted: '#74636B',
  textInverse: '#FFF9F1',
  textLink: '#BE2638',

  // Borders
  border: '#DACBC5',
  borderLight: '#E9DED8',
  borderStrong: '#BEAAA4',
  borderMaroon: '#FECACA',
  borderYellow: '#FDE68A',
  divider: '#E9DED8',

  // Status: Semantic colors — each pair tested for contrast
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
  primary: '#EF4444',
  primaryDark: '#FCA5A5',
  primaryDeep: '#B91C1C',
  primaryLight: '#1C1012',
  primarySurface: '#2A1215',
  primaryHover: '#F87171',
  primaryGlow: 'rgba(239, 68, 68, 0.20)',

  secondary: '#F59E0B',
  secondaryDark: '#FCD34D',
  secondaryDeep: '#D97706',
  secondaryLight: '#1A1708',
  secondarySurface: '#2A2210',
  secondaryHover: '#FBBF24',
  secondaryGlow: 'rgba(245, 158, 11, 0.20)',
  gold: '#F2C14E',
  goldLight: '#30250F',
  cinematic: '#2C101B',
  onCinematic: '#FFF9F1',

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
