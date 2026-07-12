// Font diet (perf): the design system is SYSTEM font + JetBrains Mono.
// Instrument Serif / Space Grotesk / Inter were removed from the useFonts
// gate in app/_layout.tsx — fonts block splash-hide, so loading only the
// mono weights cuts cold start. UI text uses the system stack (no
// fontFamily + fontWeight), matching the rest of the app.
export const fontFamilies = {
  // Mono — JetBrains Mono (eyebrows, labels, stats)
  mono: 'JetBrainsMono',
  monoMedium: 'JetBrainsMono-Medium',
  monoSemi: 'JetBrainsMono-Semi',
  monoBold: 'JetBrainsMono-Bold',
} as const;
