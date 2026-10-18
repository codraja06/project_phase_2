/**
 * CivicTrack Design System — Color Palette
 * 
 * Restored CivicTrack identity: crimson red, soft pink, white and dark navy
 * Enhanced with proper WCAG AA contrast ratios and dark mode support.
 *
 * Contrast requirements (WCAG 2.1 AA):
 *   - Body text: ≥ 4.5:1
 *   - Large text (18px+ bold or 24px+): ≥ 3:1
 *   - UI components & graphical objects: ≥ 3:1
 */

// ─── Light Mode Palette ────────────────────────────────────────────────────────

export const LIGHT_COLORS = {
  // Primary: Deep Crimson Red (Flag inspired)
  primary: '#B71C1C',
  primaryDark: '#7F1416',
  primaryDeep: '#5C0E0E',
  primaryLight: '#FEF2F2',
  primarySurface: '#FEE2E2',
  primaryHover: '#991B1B',
  primaryGlow: 'rgba(183, 28, 28, 0.16)',

  // Secondary / Accent: Golden Amber (Flag inspired — tuned for readability)
  secondary: '#D97706',
  secondaryDark: '#B45309',
  secondaryDeep: '#92400E',
  secondaryLight: '#FFFBEB',
  secondarySurface: '#FEF3C7',
  secondaryHover: '#B45309',
  secondaryGlow: 'rgba(217, 119, 6, 0.18)',

  // Authority Command Accents
  authorityPrimary: '#0F172A',
  authorityDark: '#020617',
  authorityLight: '#F1F5F9',
  authoritySurface: '#E2E8F0',
  authorityGlow: 'rgba(15, 23, 42, 0.12)',
  gold: '#B71C1C', goldLight: '#FEF2F2', cinematic: '#0F172A', onCinematic: '#FFFFFF',

  // Neutrals (Zinc scale — warmer than pure gray)
  darkCharcoal: '#18181B',
  slateDark: '#27272A',
  slateMedium: '#3F3F46',
  slateMuted: '#52525B',
  slateLight: '#A1A1AA',

  // Backgrounds & Surfaces
  background: '#FAFAF9',
  backgroundNeutral: '#F5F5F4',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  card: '#FFFFFF',
  cardHover: '#FAFAF9',
  cardBorder: '#E4E4E7',

  // Typography — all meet WCAG AA on #FAFAF9 background
  textPrimary: '#18181B',    // 15.4:1 contrast on #FAFAF9
  textSecondary: '#3F3F46',  // 9.6:1
  textMuted: '#52525B',      // 6.7:1
  textInverse: '#FAFAF9',
  textLink: '#B71C1C',       // 5.9:1

  // Borders
  border: '#D4D4D8',
  borderLight: '#E4E4E7',
  borderStrong: '#A1A1AA',
  borderMaroon: '#FECACA',
  borderYellow: '#FDE68A',
  divider: '#E4E4E7',

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

  authorityPrimary: '#E2E8F0',
  authorityDark: '#F8FAFC',
  authorityLight: '#1E293B',
  authoritySurface: '#334155',
  authorityGlow: 'rgba(226, 232, 240, 0.12)',
  gold: '#FCA5A5', goldLight: '#2A1215', cinematic: '#0F172A', onCinematic: '#FFFFFF',

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
