// lib/theme.ts - SINGLE SOURCE OF TRUTH
export const colors = {
  // Brand
  brandCyan: '#00D4FF',
  brandBlue: '#4A90F7',
  brandPurple: '#8B5CF6',
  // Used in some Figma screens (accent)
  brandPink: '#E879F9',
  // Used in some Figma screens for hearts/likes
  pink: '#EC4899',
  gold: '#FFD700',

  // Surfaces
  background: '#0A0B1E',
  // Back-compat alias (some legacy screens use this)
  backgroundAlt: '#1A1A2E',
  // Figma reference uses these exact values for cards/tab bar/inputs.
  surface: '#1A1A2E',
  surfaceElevated: '#252542',

  // Semantic
  primary: '#8B5CF6',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0B8',
  textTertiary: '#6B6B8D',
  textMuted: '#4A4A6A',

  // Border
  border: '#2D2D4A',
  borderLight: '#3A3B5D',
} as const;

export const gradients = {
  // Figma center-FAB + primary gradients run purple -> cyan (left to right).
  primary: [colors.brandPurple, colors.brandCyan] as const,
  accent: [colors.brandPurple, colors.brandPink] as const,
  rainbow: [colors.brandCyan, colors.brandPurple, colors.brandPink] as const,
  // Kept for compatibility (but <Screen /> now uses solid bg)
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
  xl: 24,
  full: 9999,
} as const;

export const fonts = {
  // Sizes
  h1: 32,
  h2: 28,
  h3: 24,
  h4: 20,
  body: 16,
  bodySmall: 14,
  caption: 12,
  overline: 10,

  // Weights
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  black: '900' as const,
} as const;

// Kept for compatibility with older components
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
  glow: {
    shadowColor: colors.brandPurple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
} as const;

// Export aliases for backward compatibility
export const COLORS = colors;
export const SPACING = spacing;
export const RADIUS = radius;
export const FONTS = fonts;
export const SHADOWS = shadows;




