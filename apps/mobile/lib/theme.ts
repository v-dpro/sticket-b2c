// lib/theme.ts — SINGLE SOURCE OF TRUTH
// Sticket design tokens — "SCORECARD STUB" identity system (Phase C).
// B1 Stagelight's cold neutrals + giant score typography as the base;
// B2 Stub's ticket construction (perforations, notches, rotated stamp)
// as the shape language for logged memories and tickets.
//
// Two palettes (darkTokens / lightTokens) share one shape: ThemeTokens.
// Resolve the active palette with useTheme() from lib/theme-context.tsx.
//
// LOCKED DIRECTION (user-approved, Phase C sign-off):
// - C1 ZERO ACCENT HUE. Ink, hairlines, semantic red/green, and the
//   3-moment gradient. Active states are ink-weight, not color — the
//   `accent` token now RESOLVES TO INK so legacy call sites go mono.
// - C2 The score has two bodies: on media = giant bare mono digits; on
//   flat surfaces = the rotated 2px-border stamp. Never both at once.
// - C3 Stub = something you attended. Perforation + notches appear only
//   on logged memories and tickets; plans/entities/settings stay plain.
// - C4 Native nav (iOS push + sheets), budgeted flourish: the tear-in
//   and stamp-thunk are the signature moves.
// - Buttons are MONOCHROME: primary = ink-on-bg inversion, secondary =
//   card2 soft pill. Never gradient-filled or color-filled buttons.
// - The brand gradient (#45E3FF → #7C5CFF → #EFA1EF) is RESERVED for the
//   brand mark, the timeline "Today" divider, and ~1s milestone flashes.

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
  // Scorecard Stub semantic radii (Phase C token sheet).
  chip: 10,
  stub: 14,
  card: 16,
  hero: 22,
} as const;

export const fonts = {
  // Sizes — redesign type ramp
  screenTitle: 34,
  sectionHeader: 22,
  cardTitle: 17,
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
  // ── Scorecard Stub core surfaces ──
  bg: '#0B0B10',
  card: '#15151C',
  card2: '#1E1E27', // elevated / secondary-button fill
  line: '#23232E', // dividers, borders at 100%
  hairline: '#1C1C26', // subtle divider / card border (softer than `line`)
  lineSoft: 'rgba(255,255,255,0.07)', // subtlest dividers
  dash: '#3A3A46', // planned/dashed borders · perforation on flat surfaces

  // ── Foreground ──
  fg: '#FFFFFF', // design "ink" — strongest foreground
  text: '#E9E9EF',
  textSoft: '#B4B4C2', // body copy
  mute: '#A6A6B3',
  muteSoft: '#7C7C89', // eyebrows, mono labels

  // ── Monochrome button inversion (primary buttons) ──
  inverseBg: '#FFFFFF', // white pill…
  inverseFg: '#0B0B10', // …with near-black label

  // ── "Accent" — C1 ZERO ACCENT: resolves to ink. Active = weight, not hue. ──
  accent: '#FFFFFF',
  accentSoft: 'rgba(255,255,255,0.10)',
  accentLine: 'rgba(255,255,255,0.28)',
  onAccent: '#0B0B10', // ink-filled chip/dot carries bg-colored text

  // ── Text hierarchy (legacy names, kept near-current) ──
  textPrimary: '#E9E9EF',
  textHi: '#E9E9EF',
  textMid: '#A6A6B3',
  textLo: '#7C7C89',
  textSecondary: '#A6A6B3',
  textTertiary: '#7C7C89',
  textMuted: '#4B4B5A',

  // ── Legacy surfaces (deprecated aliases — prefer bg/card/card2) ──
  ink: '#0B0B10', // LEGACY: app background (NOT the design "ink" — see fg)
  pitch: '#05050B',
  navy: '#0A0B1E',
  surface: '#15151C', // = card
  elevated: '#1E1E27', // = card2
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

  // ── Semantic — like/error and success are the ONLY hues in the app ──
  primary: '#FFFFFF', // = accent (ink)
  like: '#EF4444', // heart, destructive — only
  success: '#30D158', // copied ✓, ticket confirmed — only
  warning: '#F5A623',
  error: '#EF4444',

  // ── Back-compat aliases ──
  background: '#0B0B10',
  backgroundAlt: '#15151C',
  inkAlt: '#15151C',
  surfaceElevated: '#1E1E27',
  border: '#1C1C26',
  borderLight: '#23232E',
} as const;

export type ThemeColors = { readonly [K in keyof typeof darkColors]: string };

const lightColors: ThemeColors = {
  // ── Scorecard Stub core surfaces (designed, not inverted) ──
  bg: '#FAFAFC',
  card: '#FFFFFF',
  card2: '#F0F0F6',
  line: '#E7E6EF',
  hairline: '#EFEDF5',
  lineSoft: 'rgba(20,19,25,0.06)',
  dash: '#C9C7D4', // planned/dashed borders · perforation on flat surfaces

  // ── Foreground ──
  fg: '#131218',
  text: '#1A1922',
  textSoft: '#3E3D49',
  mute: '#6C6B78',
  muteSoft: '#9997A6', // eyebrows, mono labels

  // ── Monochrome button inversion (primary buttons) ──
  inverseBg: '#131218', // black pill…
  inverseFg: '#FFFFFF', // …with white label

  // ── "Accent" — C1 ZERO ACCENT: resolves to ink ──
  accent: '#131218',
  accentSoft: 'rgba(19,18,24,0.07)',
  accentLine: 'rgba(19,18,24,0.22)',
  onAccent: '#FFFFFF',

  // ── Text hierarchy ──
  textPrimary: '#1A1922',
  textHi: '#1A1922',
  textMid: '#6C6B78',
  textLo: '#9997A6',
  textSecondary: '#6C6B78',
  textTertiary: '#9997A6',
  textMuted: '#A5A3B0',

  // ── Legacy surfaces (deprecated aliases) ──
  ink: '#FAFAFC', // LEGACY alias = bg (dominant legacy use is backgrounds)
  pitch: '#F2F1F7',
  navy: '#ECEBF4',
  surface: '#FFFFFF', // = card
  elevated: '#F0F0F6', // = card2
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

  // ── Semantic — like/error and success are the ONLY hues in the app ──
  primary: '#131218', // = accent (ink)
  like: '#DC2626',
  success: '#1F9D50',
  warning: '#B45309',
  error: '#DC2626',

  // ── Back-compat aliases ──
  background: '#FAFAFC',
  backgroundAlt: '#FFFFFF',
  inkAlt: '#FFFFFF',
  surfaceElevated: '#F0F0F6',
  border: '#EFEDF5',
  borderLight: '#E7E6EF',
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
