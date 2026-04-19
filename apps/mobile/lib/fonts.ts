import { Platform } from 'react-native';

export const fontFamilies = {
  /** Instrument Serif fallback */
  display: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
  /** Space Grotesk / Inter fallback — system default */
  ui: Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' }),
  /** JetBrains Mono fallback */
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
};
