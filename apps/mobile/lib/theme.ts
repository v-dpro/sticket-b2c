// lib/theme.ts — SINGLE SOURCE OF TRUTH
// Sticket redesign tokens — "Ticket Stub" identity system

export { fontFamilies } from './fonts';

export const colors = {
  // Core palette (aligned to DESIGN_TOKENS.md)
  ink: '#0B0B14',
  pitch: '#05050B',
  navy: '#0A0B1E',
  surface: '#121220',
  elevated: '#1B1B2B',
  hairline: '#20202B', // subtle divider / card border (softer than `line`)
  line: '#2A2A3A', // dividers, borders at 100%
  lineSoft: 'rgba(255,255,255,0.08)', // subtle dividers (spec `lineSoft`)
  bone: '#EFE9DC',
  paper: '#F6F1E4', // NOTE: app-specific cream for ticket-stub cards (not spec `paper` bg)

  // Text hierarchy — spec: text #E8E8EE / mute #8B8B9E / muteSoft #5A5A6C
  textPrimary: '#E8E8EE',
  textHi: '#E8E8EE',
  textMid: '#8B8B9E',
  textLo: '#5A5A6C',
  textSecondary: '#8B8B9E',
  textTertiary: '#5A5A6C',
  textMuted: '#4A4A6A',
  // Spec-named text tokens
  text: '#E8E8EE',
  textSoft: '#B4B4C2', // body copy
  mute: '#8B8B9E',
  muteSoft: '#5A5A6C',
  onAccent: '#0A0A12', // near-black text on accent-filled surfaces
  white: '#FFFFFF', // true white — barcode/QR scan surfaces, camera controls

  // Brand accents (spec palette)
  brandCyan: '#00D4FF',
  brandPurple: '#8B5CF6',
  brandPink: '#EC4899',
  brandBlue: '#4A90F7',
  cyan: '#00D4FF',
  purple: '#8B5CF6',
  amber: '#F59E0B',
  lime: '#BEF264',
  red: '#EF4444',
  gold: '#FFD700',
  pink: '#EC4899',

  // Semantic
  primary: '#8B5CF6',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',

  // Back-compat aliases
  background: '#0B0B14',
  backgroundAlt: '#121220',
  inkAlt: '#121220',
  surfaceElevated: '#1B1B2B',
  border: '#20202B',
  borderLight: '#2A2A3A',
} as const;

export const accentSets = {
  cyan: { hex: colors.brandCyan, soft: 'rgba(0,212,255,0.12)', line: 'rgba(0,212,255,0.35)' },
  purple: { hex: colors.brandPurple, soft: 'rgba(139,92,246,0.14)', line: 'rgba(139,92,246,0.4)' },
  pink: { hex: colors.pink, soft: 'rgba(236,72,153,0.14)', line: 'rgba(236,72,153,0.4)' },
  amber: { hex: colors.amber, soft: 'rgba(245,158,11,0.14)', line: 'rgba(245,158,11,0.4)' },
  lime: { hex: colors.lime, soft: 'rgba(190,242,100,0.14)', line: 'rgba(190,242,100,0.4)' },
  red: { hex: colors.red, soft: 'rgba(239,68,68,0.14)', line: 'rgba(239,68,68,0.4)' },
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
