// lib/theme.ts — SINGLE SOURCE OF TRUTH
// Sticket redesign tokens — "Ticket Stub" identity system

export const colors = {
  // Core palette
  ink: '#0B0B14',
  pitch: '#05050B',
  navy: '#0A0B1E',
  surface: '#13131F',
  elevated: '#1B1B2B',
  hairline: '#242433',
  line: '#2E2E42',
  bone: '#EFE9DC',
  paper: '#F6F1E4',

  // Text hierarchy
  textPrimary: '#FFFFFF',
  textHi: '#FFFFFF',
  textMid: '#B5B5CC',
  textLo: '#6E6E88',
  textSecondary: '#B5B5CC',
  textTertiary: '#6E6E88',
  textMuted: '#4A4A6A',

  // Brand accents
  brandCyan: '#00D4FF',
  brandPurple: '#8B5CF6',
  brandPink: '#E879F9',
  brandBlue: '#4A90F7',
  lime: '#D4FF00',
  red: '#FF4D5E',
  gold: '#FFD700',
  pink: '#EC4899',

  // Semantic
  primary: '#8B5CF6',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',

  // Back-compat aliases
  background: '#0B0B14',
  backgroundAlt: '#13131F',
  inkAlt: '#13131F',
  surfaceElevated: '#1B1B2B',
  border: '#242433',
  borderLight: '#2E2E42',
} as const;

export const accentSets = {
  cyan: { hex: colors.brandCyan, soft: 'rgba(0,212,255,0.12)', line: 'rgba(0,212,255,0.35)' },
  purple: { hex: colors.brandPurple, soft: 'rgba(139,92,246,0.14)', line: 'rgba(139,92,246,0.4)' },
  pink: { hex: colors.brandPink, soft: 'rgba(232,121,249,0.14)', line: 'rgba(232,121,249,0.4)' },
  lime: { hex: colors.lime, soft: 'rgba(212,255,0,0.12)', line: 'rgba(212,255,0,0.35)' },
} as const;

export const gradients = {
  primary: [colors.brandPurple, colors.brandCyan] as const,
  accent: [colors.brandPurple, colors.brandPink] as const,
  rainbow: [colors.brandCyan, colors.brandPurple, colors.brandPink] as const,
  background: [colors.background, colors.background] as const,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
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

export const shadows = {
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
} as const;
