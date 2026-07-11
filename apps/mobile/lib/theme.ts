// lib/theme.ts — SINGLE SOURCE OF TRUTH
// Sticket design tokens — "Encore, muted" identity system.
//
// Two palettes (darkTokens / lightTokens) share one shape: ThemeTokens.
// Resolve the active palette with useTheme() from lib/theme-context.tsx.
//
// LOCKED DIRECTION (user-approved mockups):
// - Buttons are MONOCHROME: primary = ink-on-bg inversion, secondary = card2
//   soft pill. Never gradient-filled or purple-filled buttons.
// - Accent (#6C55F0 dark / #5241C9 light) is for SMALL usages only:
//   links, dots, active states.
// - The brand gradient (#45E3FF → #7C5CFF → #EFA1EF) is RESERVED for the
//   brand mark, the timeline "Today" divider, and ~1s milestone flashes.
//   It is exposed as tokens (gradients.brand) but must not be applied to
//   ordinary components.

export { fontFamilies } from './fonts';
import { fontFamilies as fontFamiliesInternal } from './fonts';

export type ThemeMode = 'dark' | 'light';

// ────────────────────────────────────────────────────────────────────
// Mode-independent scales
// ────────────────────────────────────────────────────────────────────

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
} as const;

// Semantic density tokens (spec `comfortable` default)
export const density = {
  gap: 14, // gap between related elements
  pad: 20, // screen / section horizontal padding
  cardPad: 18, // padding inside cards
  rowH: 68, // standard list row height
} as const;

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  full: 9999,
} as const;

export const fonts = {
  // Sizes — redesign type ramp
  screenTitle: 34,
  sectionHeader: 22,
  cardTitle: 18,
  h1: 34,
  h2: 28,
  h3: 24,
  h4: 20,
  body: 15,
  bodySmall: 14,
  caption: 12,
  mono: 11,
  eyebrow: 10,
  overline: 10,

  // Weights
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  black: '900' as const,
} as const;

// Gamification levels
export const levels = [
  { name: 'Opener', min: 0, color: '#9AA0AE' },
  { name: 'Regular', min: 250, color: '#60A5FA' },
  { name: 'Headliner', min: 750, color: '#A78BFA' },
  { name: 'Road Dog', min: 1800, color: '#F59E0B' },
  { name: 'Lifer', min: 3500, color: '#EC4899' },
  { name: 'Legend', min: 6000, color: '#EF4444' },
] as const;

// ────────────────────────────────────────────────────────────────────
// Colors — per-palette
// ────────────────────────────────────────────────────────────────────
// NAMING NOTE: the design language calls the strongest foreground "ink"
// (#FFFFFF dark / #141319 light). The legacy `colors.ink` key is used as
// a BACKGROUND across ~150 call sites, so it keeps that meaning (= bg).
// The design's "ink" foreground lives at `fg` (and `inverseBg` for the
// monochrome button inversion). Migrating screens should move from
// `ink` → `bg` and use `fg` for the strongest text.

const darkColors = {
  // ── Encore-muted core surfaces ──
  bg: '#0B0B10',
  card: '#16161E',
  card2: '#1F1F2A', // elevated / secondary-button fill
  line: '#22222D', // dividers, borders at 100%
  hairline: '#1C1C26', // subtle divider / card border (softer than `line`)
  lineSoft: 'rgba(255,255,255,0.07)', // subtlest dividers

  // ── Foreground ──
  fg: '#FFFFFF', // design "ink" — strongest foreground
  text: '#E8E8EE',
  textSoft: '#B4B4C2', // body copy
  mute: '#A7A7B4',
  muteSoft: '#5A5A6C',

  // ── Monochrome button inversion (primary buttons) ──
  inverseBg: '#FFFFFF', // white pill…
  inverseFg: '#0B0B10', // …with near-black label

  // ── Accent — SMALL usages only (links, dots, active states) ──
  accent: '#6C55F0',
  accentSoft: 'rgba(108,85,240,0.14)',
  accentLine: 'rgba(108,85,240,0.40)',
  onAccent: '#FFFFFF', // text on an accent-filled chip/dot

  // ── Text hierarchy (legacy names, kept near-current) ──
  textPrimary: '#E8E8EE',
  textHi: '#E8E8EE',
  textMid: '#A7A7B4',
  textLo: '#5A5A6C',
  textSecondary: '#A7A7B4',
  textTertiary: '#5A5A6C',
  textMuted: '#4B4B5A',

  // ── Legacy surfaces (deprecated aliases — prefer bg/card/card2) ──
  ink: '#0B0B10', // LEGACY: app background (NOT the design "ink" — see fg)
  pitch: '#05050B',
  navy: '#0A0B1E',
  surface: '#16161E', // = card
  elevated: '#1F1F2A', // = card2
  bone: '#EFE9DC',
  paper: '#F6F1E4', // app-specific cream for ticket-stub cards
  white: '#FFFFFF', // true white — barcode/QR scan surfaces, camera controls

  // ── Brand accents (re-tuned per mode; small usages) ──
  brandCyan: '#45E3FF',
  brandPurple: '#7C5CFF',
  brandPink: '#EFA1EF',
  brandBlue: '#4A90F7',
  cyan: '#45E3FF',
  purple: '#7C5CFF',
  amber: '#F5A623',
  lime: '#BEF264',
  red: '#EF4444',
  gold: '#FFD700',
  pink: '#EC4899',

  // ── Semantic ──
  primary: '#6C55F0', // = accent
  success: '#30D158', // iOS-green (switches use this family)
  warning: '#F5A623',
  error: '#EF4444',

  // ── Back-compat aliases ──
  background: '#0B0B10',
  backgroundAlt: '#16161E',
  inkAlt: '#16161E',
  surfaceElevated: '#1F1F2A',
  border: '#1C1C26',
  borderLight: '#22222D',
} as const;

export type ThemeColors = { readonly [K in keyof typeof darkColors]: string };

const lightColors: ThemeColors = {
  // ── Encore-muted core surfaces ──
  bg: '#FAFAFC',
  card: '#FFFFFF',
  card2: '#F0EFF6',
  line: '#E8E6F0',
  hairline: '#EFEDF5',
  lineSoft: 'rgba(20,19,25,0.06)',

  // ── Foreground ──
  fg: '#141319',
  text: '#1B1A22',
  textSoft: '#3E3D49',
  mute: '#6D6B7A',
  muteSoft: '#8E8C9A',

  // ── Monochrome button inversion (primary buttons) ──
  inverseBg: '#141319', // black pill…
  inverseFg: '#FFFFFF', // …with white label

  // ── Accent — SMALL usages only ──
  accent: '#5241C9',
  accentSoft: 'rgba(82,65,201,0.10)',
  accentLine: 'rgba(82,65,201,0.35)',
  onAccent: '#FFFFFF',

  // ── Text hierarchy ──
  textPrimary: '#1B1A22',
  textHi: '#1B1A22',
  textMid: '#6D6B7A',
  textLo: '#8E8C9A',
  textSecondary: '#6D6B7A',
  textTertiary: '#8E8C9A',
  textMuted: '#A5A3B0',

  // ── Legacy surfaces (deprecated aliases) ──
  ink: '#FAFAFC', // LEGACY alias = bg (dominant legacy use is backgrounds)
  pitch: '#F2F1F7',
  navy: '#ECEBF4',
  surface: '#FFFFFF', // = card
  elevated: '#F0EFF6', // = card2
  bone: '#EFE9DC',
  paper: '#F6F1E4',
  white: '#FFFFFF',

  // ── Brand accents (darkened for contrast on light surfaces) ──
  brandCyan: '#0092C7',
  brandPurple: '#6D4FE0',
  brandPink: '#C4489E',
  brandBlue: '#2563EB',
  cyan: '#0092C7',
  purple: '#6D4FE0',
  amber: '#B45309',
  lime: '#65A30D',
  red: '#DC2626',
  gold: '#A16207',
  pink: '#C4489E',

  // ── Semantic ──
  primary: '#5241C9',
  success: '#34C759',
  warning: '#B45309',
  error: '#DC2626',

  // ── Back-compat aliases ──
  background: '#FAFAFC',
  backgroundAlt: '#FFFFFF',
  inkAlt: '#FFFFFF',
  surfaceElevated: '#F0EFF6',
  border: '#EFEDF5',
  borderLight: '#E8E6F0',
};

// ────────────────────────────────────────────────────────────────────
// Accent sets — hue + soft fill + line, tuned per mode
// ────────────────────────────────────────────────────────────────────

export type AccentSet = { readonly hex: string; readonly soft: string; readonly line: string };
export type AccentName = 'cyan' | 'purple' | 'pink' | 'amber' | 'lime' | 'red';
export type AccentSets = { readonly [K in AccentName]: AccentSet };

const darkAccentSets: AccentSets = {
  cyan: { hex: darkColors.cyan, soft: 'rgba(69,227,255,0.12)', line: 'rgba(69,227,255,0.35)' },
  purple: { hex: darkColors.purple, soft: 'rgba(124,92,255,0.14)', line: 'rgba(124,92,255,0.40)' },
  pink: { hex: darkColors.pink, soft: 'rgba(236,72,153,0.14)', line: 'rgba(236,72,153,0.40)' },
  amber: { hex: darkColors.amber, soft: 'rgba(245,166,35,0.14)', line: 'rgba(245,166,35,0.40)' },
  lime: { hex: darkColors.lime, soft: 'rgba(190,242,100,0.14)', line: 'rgba(190,242,100,0.40)' },
  red: { hex: darkColors.red, soft: 'rgba(239,68,68,0.14)', line: 'rgba(239,68,68,0.40)' },
};

const lightAccentSets: AccentSets = {
  cyan: { hex: lightColors.cyan, soft: 'rgba(0,146,199,0.10)', line: 'rgba(0,146,199,0.35)' },
  purple: { hex: lightColors.purple, soft: 'rgba(109,79,224,0.10)', line: 'rgba(109,79,224,0.35)' },
  pink: { hex: lightColors.pink, soft: 'rgba(196,72,158,0.10)', line: 'rgba(196,72,158,0.35)' },
  amber: { hex: lightColors.amber, soft: 'rgba(180,83,9,0.10)', line: 'rgba(180,83,9,0.35)' },
  lime: { hex: lightColors.lime, soft: 'rgba(101,163,13,0.10)', line: 'rgba(101,163,13,0.35)' },
  red: { hex: lightColors.red, soft: 'rgba(220,38,38,0.10)', line: 'rgba(220,38,38,0.35)' },
};

// ────────────────────────────────────────────────────────────────────
// Gradients
// ────────────────────────────────────────────────────────────────────
// `brand` is the RESERVED Encore gradient — brand mark, timeline "Today"
// divider, and ~1s milestone flash ONLY. Never fill buttons/cards with it.

export type ThemeGradients = {
  /** RESERVED — brand mark, "Today" divider, milestone flash. */
  readonly brand: readonly [string, string, string];
  readonly primary: readonly [string, string];
  readonly accent: readonly [string, string];
  readonly rainbow: readonly [string, string, string];
  readonly background: readonly [string, string];
};

const BRAND_GRADIENT = ['#45E3FF', '#7C5CFF', '#EFA1EF'] as const;

const darkGradients: ThemeGradients = {
  brand: BRAND_GRADIENT,
  primary: [darkColors.brandPurple, darkColors.brandCyan],
  accent: [darkColors.brandPurple, darkColors.brandPink],
  rainbow: BRAND_GRADIENT,
  background: [darkColors.bg, darkColors.bg],
};

const lightGradients: ThemeGradients = {
  brand: BRAND_GRADIENT,
  primary: [lightColors.brandPurple, lightColors.brandCyan],
  accent: [lightColors.brandPurple, lightColors.brandPink],
  rainbow: BRAND_GRADIENT,
  background: [lightColors.bg, lightColors.bg],
};

// ────────────────────────────────────────────────────────────────────
// Shadows
// ────────────────────────────────────────────────────────────────────

export type ThemeShadow = {
  readonly shadowColor: string;
  readonly shadowOffset: { readonly width: number; readonly height: number };
  readonly shadowOpacity: number;
  readonly shadowRadius: number;
  readonly elevation: number;
};
export type ThemeShadows = {
  readonly card: ThemeShadow;
  readonly elevated: ThemeShadow;
  readonly stub: ThemeShadow;
};

const darkShadows: ThemeShadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  stub: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.35,
    shadowRadius: 40,
    elevation: 12,
  },
};

const lightShadows: ThemeShadows = {
  card: {
    shadowColor: '#141319',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  elevated: {
    shadowColor: '#141319',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  stub: {
    shadowColor: '#141319',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 10,
  },
};

// ────────────────────────────────────────────────────────────────────
// ThemeTokens — the full per-mode token bundle
// ────────────────────────────────────────────────────────────────────

export type ThemeTokens = {
  readonly mode: ThemeMode;
  readonly isDark: boolean;
  readonly colors: ThemeColors;
  readonly accentSets: AccentSets;
  readonly gradients: ThemeGradients;
  readonly shadows: ThemeShadows;
  // Mode-independent scales, bundled for one-stop access at call sites.
  readonly spacing: typeof spacing;
  readonly radius: typeof radius;
  readonly density: typeof density;
  readonly fonts: typeof fonts;
  readonly fontFamilies: typeof fontFamiliesInternal;
  readonly levels: typeof levels;
};

export const darkTokens: ThemeTokens = {
  mode: 'dark',
  isDark: true,
  colors: darkColors,
  accentSets: darkAccentSets,
  gradients: darkGradients,
  shadows: darkShadows,
  spacing,
  radius,
  density,
  fonts,
  fontFamilies: fontFamiliesInternal,
  levels,
};

export const lightTokens: ThemeTokens = {
  mode: 'light',
  isDark: false,
  colors: lightColors,
  accentSets: lightAccentSets,
  gradients: lightGradients,
  shadows: lightShadows,
  spacing,
  radius,
  density,
  fonts,
  fontFamilies: fontFamiliesInternal,
  levels,
};

// ────────────────────────────────────────────────────────────────────
// Static exports — DEPRECATED
// ────────────────────────────────────────────────────────────────────

/**
 * @deprecated Static dark-palette snapshot. New/migrated code should use
 * `useTheme().tokens.colors` (lib/theme-context.tsx) so light mode works.
 */
export const colors = darkTokens.colors;

/**
 * @deprecated Use `useTheme().tokens.accentSets` instead.
 */
export const accentSets = darkTokens.accentSets;

/**
 * @deprecated Use `useTheme().tokens.gradients` instead. Remember: the
 * brand gradient is reserved (brand mark / "Today" divider / milestone flash).
 */
export const gradients = darkTokens.gradients;

/**
 * @deprecated Use `useTheme().tokens.shadows` instead.
 */
export const shadows = darkTokens.shadows;
