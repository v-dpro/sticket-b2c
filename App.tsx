/**
 * Monorepo convenience entrypoint.
 *
 * If someone runs `expo start` from `sticket-app/` (workspace root), Expo's default
 * entry (`expo/AppEntry`) imports `../../App` relative to `node_modules/expo/AppEntry.js`,
 * which resolves to THIS file.
 *
 * We simply re-export from apps/mobile/App.tsx which handles expo-router/entry loading.
 * The _expoRouterCtx.js file handles the require.context routing override.
 */

// Re-export from the mobile app's App.tsx
// This avoids double-loading expo-router/entry
// eslint-disable-next-line @typescript-eslint/no-var-requires
const MobileApp = require('./apps/mobile/App');

// Handle default export unwrapping
function unwrapDefault(mod: any): any {
  if (!mod) return null;
  if (typeof mod === 'function') return mod;
  if (mod && typeof mod === 'object' && 'default' in mod && mod.default !== undefined) {
    return unwrapDefault(mod.default);
  }
  return mod;
}

const AppComponent = unwrapDefault(MobileApp);

// Fallback if unwrapping failed
// eslint-disable-next-line @typescript-eslint/no-var-requires
const React = require('react');
function FallbackApp() {
  console.warn('App component not found, using fallback');
  return null;
}

// eslint-disable-next-line import/no-default-export
export default AppComponent || FallbackApp;


