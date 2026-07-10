export const fontFamilies = {
  // Display serif — Instrument Serif (screen titles, section heads, artist/tour names)
  display: 'InstrumentSerif',
  displayItalic: 'InstrumentSerif-Italic',
  // UI / editorial body — Space Grotesk (spec `editorial` Text family)
  ui: 'SpaceGrotesk',
  uiMedium: 'SpaceGrotesk-Medium',
  uiSemi: 'SpaceGrotesk-Semi',
  uiBold: 'SpaceGrotesk-Bold',
  // Inter kept loaded as a fallback family
  inter: 'Inter',
  interMedium: 'Inter-Medium',
  interSemi: 'Inter-Semi',
  interBold: 'Inter-Bold',
  // Mono — JetBrains Mono (eyebrows, labels, stats)
  mono: 'JetBrainsMono',
  monoMedium: 'JetBrainsMono-Medium',
  monoSemi: 'JetBrainsMono-Semi',
  monoBold: 'JetBrainsMono-Bold',
} as const;
