/**
 * Expo Router expects `process.env.EXPO_ROUTER_APP_ROOT` to be a string so it can
 * build the route context via `require.context(process.env.EXPO_ROUTER_APP_ROOT, ...)`.
 *
 * In some setups (especially monorepos) this env var is not injected, causing:
 * "First argument of require.context should be a string denoting the directory to require."
 *
 * Setting it here ensures it's defined *before* `expo-router/entry` is evaluated.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const p: any = typeof process !== 'undefined' ? (process as any) : undefined;
if (p) {
  if (!p.env) p.env = {};
  if (!p.env.EXPO_ROUTER_APP_ROOT) p.env.EXPO_ROUTER_APP_ROOT = './app';
  // Avoid async imports until we explicitly opt in.
  if (!p.env.EXPO_ROUTER_IMPORT_MODE) p.env.EXPO_ROUTER_IMPORT_MODE = 'sync';
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('expo-router/entry');
