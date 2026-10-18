/**
 * CivicTrack Design System — Typography Scale
 *
 * Modular scale based on 1.250 (Major Third) ratio.
 * Base: 16px → 12.8, 16, 20, 25, 31.25, 39
 *
 * Uses system fonts for best performance and native feel.
 * Font weight hierarchy:
 *   900: Display / Hero
 *   800: H1 / Section headers
 *   700: H2 / Card titles
 *   600: H3 / Emphasis / Labels
 *   500: Body emphasis
 *   400: Body default
 */

import { Platform } from 'react-native';
import { COLORS } from './colors';

// ─── Font Family ───────────────────────────────────────────────────────────────

export const FONT_FAMILY = Platform.select({
  ios: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },
  android: {
    regular: 'Roboto',
    medium: 'Roboto',
    semibold: 'Roboto',
    bold: 'Roboto',
  },
  web: {
    regular: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif',
    medium: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif',
    semibold: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif',
    bold: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif',
  },
  default: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },
})!;

// ─── Responsive Detection ──────────────────────────────────────────────────────
// Note: These are STATIC — used for initial StyleSheet creation.
// For dynamic responsive behavior, use the useBreakpoint() hook in components.

import { Dimensions } from 'react-native';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const IS_TABLET = SCREEN_WIDTH >= 768;
export const IS_SMALL_PHONE = SCREEN_WIDTH < 360;

// ─── Type Scale ────────────────────────────────────────────────────────────────

export const TYPOGRAPHY = {
  // Display — hero numbers, splash branding
  display: {
    fontSize: IS_TABLET ? 40 : 32,
    fontWeight: '900' as const,
    color: COLORS.textPrimary,
    lineHeight: IS_TABLET ? 48 : 40,
    letterSpacing: -0.8,
    ...(Platform.OS === 'web' ? { fontFamily: FONT_FAMILY.bold } : {}),
  },

  // H1 — page titles
  h1: {
    fontSize: IS_TABLET ? 28 : 24,
    fontWeight: '800' as const,
    color: COLORS.textPrimary,
    lineHeight: IS_TABLET ? 36 : 32,
    letterSpacing: -0.5,
    ...(Platform.OS === 'web' ? { fontFamily: FONT_FAMILY.bold } : {}),
  },

  // H2 — section headers
  h2: {
    fontSize: IS_TABLET ? 22 : 20,
    fontWeight: '700' as const,
    color: COLORS.textPrimary,
    lineHeight: IS_TABLET ? 30 : 28,
    letterSpacing: -0.3,
    ...(Platform.OS === 'web' ? { fontFamily: FONT_FAMILY.bold } : {}),
  },

  // H3 — card titles, sub-sections
  h3: {
    fontSize: IS_TABLET ? 18 : 16,
    fontWeight: '700' as const,
    color: COLORS.textPrimary,
    lineHeight: IS_TABLET ? 26 : 24,
    letterSpacing: -0.2,
    ...(Platform.OS === 'web' ? { fontFamily: FONT_FAMILY.semibold } : {}),
  },

  // H4 — small headings
  h4: {
    fontSize: IS_TABLET ? 16 : 14,
    fontWeight: '600' as const,
    color: COLORS.textPrimary,
    lineHeight: IS_TABLET ? 24 : 20,
    letterSpacing: -0.1,
    ...(Platform.OS === 'web' ? { fontFamily: FONT_FAMILY.semibold } : {}),
  },

  // Body — default text
  body: {
    fontSize: IS_TABLET ? 16 : 15,
    fontWeight: '400' as const,
    color: COLORS.textPrimary,
    lineHeight: IS_TABLET ? 24 : 22,
    letterSpacing: 0,
    ...(Platform.OS === 'web' ? { fontFamily: FONT_FAMILY.regular } : {}),
  },

  // Body bold
  bodyBold: {
    fontSize: IS_TABLET ? 16 : 15,
    fontWeight: '600' as const,
    color: COLORS.textPrimary,
    lineHeight: IS_TABLET ? 24 : 22,
    letterSpacing: 0,
    ...(Platform.OS === 'web' ? { fontFamily: FONT_FAMILY.semibold } : {}),
  },

  // Body small — secondary text, descriptions
  bodySmall: {
    fontSize: IS_TABLET ? 14 : 13,
    fontWeight: '400' as const,
    color: COLORS.textSecondary,
    lineHeight: IS_TABLET ? 20 : 18,
    letterSpacing: 0,
    ...(Platform.OS === 'web' ? { fontFamily: FONT_FAMILY.regular } : {}),
  },

  // Caption — timestamps, metadata
  caption: {
    fontSize: IS_TABLET ? 13 : 12,
    fontWeight: '500' as const,
    color: COLORS.textMuted,
    lineHeight: IS_TABLET ? 18 : 16,
    letterSpacing: 0.1,
    ...(Platform.OS === 'web' ? { fontFamily: FONT_FAMILY.medium } : {}),
  },

  // Overline — section labels (UPPERCASE)
  overline: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: COLORS.textMuted,
    lineHeight: 16,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
    ...(Platform.OS === 'web' ? { fontFamily: FONT_FAMILY.semibold } : {}),
  },

  // Badge / Chip — tiny labels
  badge: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.4,
    ...(Platform.OS === 'web' ? { fontFamily: FONT_FAMILY.semibold } : {}),
  },

  // KPI Number — stat cards, dashboard metrics
  kpiNumber: {
    fontSize: IS_TABLET ? 32 : 28,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
    lineHeight: IS_TABLET ? 40 : 36,
    ...(Platform.OS === 'web' ? { fontFamily: FONT_FAMILY.bold } : {}),
  },

  // Button text
  button: {
    fontSize: IS_TABLET ? 15 : 14,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
    lineHeight: IS_TABLET ? 22 : 20,
    ...(Platform.OS === 'web' ? { fontFamily: FONT_FAMILY.semibold } : {}),
  },

  // Input text
  input: {
    fontSize: IS_TABLET ? 16 : 15,
    fontWeight: '400' as const,
    lineHeight: IS_TABLET ? 24 : 22,
    color: COLORS.textPrimary,
    ...(Platform.OS === 'web' ? { fontFamily: FONT_FAMILY.regular } : {}),
  },
};

export type TypographyTokens = typeof TYPOGRAPHY;
