/**
 * Expo Router expects `process.env.EXPO_ROUTER_APP_ROOT` to be a string so it can
 * build the route context via `require.context(process.env.EXPO_ROUTER_APP_ROOT, ...)`.
 *
 * In some setups (especially monorepos) this env var is not injected, causing:
 * "First argument of require.context should be a string denoting the directory to require."
 *
 * Setting it here ensures it's defined *before* `expo-router/entry` is evaluated.
 */
// Set EXPO_ROUTER_APP_ROOT using Object.defineProperty to work around readonly process.env
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
        // Ignore - Metro/Babel should handle this
      }
    };
    
    if (!p.env.EXPO_ROUTER_APP_ROOT) {
      defineEnvVar('EXPO_ROUTER_APP_ROOT', './app');
    }
    if (!p.env.EXPO_ROUTER_IMPORT_MODE) {
      defineEnvVar('EXPO_ROUTER_IMPORT_MODE', 'sync');
    }
  }
} catch {
  // Ignore - Metro/Babel should handle this
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('expo-router/entry');
