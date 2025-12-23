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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const p: any = typeof process !== 'undefined' ? (process as any) : undefined;
if (p) {
  if (!p.env) p.env = {};
  if (!p.env.EXPO_ROUTER_APP_ROOT) p.env.EXPO_ROUTER_APP_ROOT = './apps/mobile/app';
  if (!p.env.EXPO_ROUTER_IMPORT_MODE) p.env.EXPO_ROUTER_IMPORT_MODE = 'sync';
}

// Same reasoning as apps/mobile/App.tsx: avoid re-export hoisting.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const MobileAppModule = require('./apps/mobile/App');

function unwrapDefault(mod: any): any {
  if (!mod) return mod;
  if (typeof mod === 'function') return mod;
  if (mod.default) return unwrapDefault(mod.default);
  return mod;
}

export default unwrapDefault(MobileAppModule);


