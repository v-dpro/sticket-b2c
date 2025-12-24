/**
 * Monorepo convenience entrypoint.
 *
 * If someone runs `expo start` from `sticket-app/` (workspace root), Expo's default
 * entry (`expo/AppEntry`) imports `../../App` relative to `node_modules/expo/AppEntry.js`,
 * which resolves to THIS file.
 *
 * We delegate to the real Expo app under `apps/mobile/` so Metro resolves `expo-router`
 * from that workspace (it may not be hoisted to the monorepo root).
 */

// Set EXPO_ROUTER_APP_ROOT using Object.defineProperty to work around readonly process.env
// This is needed when running from root directory in dev mode
try {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p: any = typeof process !== 'undefined' ? (process as any) : undefined;
  if (p?.env) {
    const defineEnvVar = (key: string, value: string) => {
      try {
        const descriptor = Object.getOwnPropertyDescriptor(p.env, key);
        if (descriptor && !descriptor.configurable) {
          // Property exists and is not configurable, skip
          return;
        }
        Object.defineProperty(p.env, key, {
          value,
          writable: true,
          enumerable: true,
          configurable: true,
        });
      } catch {
        // Ignore if we can't set it
      }
    };
    
    if (!p.env.EXPO_ROUTER_APP_ROOT) {
      defineEnvVar('EXPO_ROUTER_APP_ROOT', './apps/mobile/app');
    }
    if (!p.env.EXPO_ROUTER_IMPORT_MODE) {
      defineEnvVar('EXPO_ROUTER_IMPORT_MODE', 'sync');
    }
  }
} catch {
  // Ignore - Metro/Babel should handle this
}

// Same reasoning as apps/mobile/App.tsx: avoid re-export hoisting.
// eslint-disable-next-line @typescript-eslint/no-var-requires
let MobileAppModule: any;
try {
  MobileAppModule = require('./apps/mobile/App');
} catch (error) {
  console.error('Failed to load mobile app:', error);
  throw error;
}

function unwrapDefault(mod: any): any {
  if (!mod) {
    return null;
  }
  if (typeof mod === 'function') {
    return mod;
  }
  if (mod && typeof mod === 'object') {
    if ('default' in mod && mod.default !== undefined) {
      return unwrapDefault(mod.default);
    }
    // If no default but it's an object, return the object itself
    return mod;
  }
  return mod;
}

const AppComponent = unwrapDefault(MobileAppModule);

// Fallback component if unwrapping failed
// eslint-disable-next-line @typescript-eslint/no-var-requires
const React = require('react');
function FallbackApp() {
  console.warn('App component not found, using fallback. This should not happen.');
  return null;
}

// Export the component (or fallback)
// eslint-disable-next-line import/no-default-export
export default AppComponent || FallbackApp;


