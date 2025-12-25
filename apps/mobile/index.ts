/**
 * Expo Router expects `process.env.EXPO_ROUTER_APP_ROOT` to be a string so it can
 * build the route context via `require.context(process.env.EXPO_ROUTER_APP_ROOT, ...)`.
 *
 * In some setups (especially monorepos) this env var is not injected, causing:
 * "First argument of require.context should be a string denoting the directory to require."
 *
 * Setting it here ensures it's defined *before* `expo-router/entry` is evaluated.
 */
// NOTE: Do NOT modify process.env here - it's read-only in React Native/Hermes
// and will cause "property is not writable" errors.
// EXPO_ROUTER_APP_ROOT should be set by:
// 1. Metro/Babel transforms (via babel-preset-expo)
// 2. EAS build environment variables (see eas.json)
// 3. The _expoRouterCtx.js file handles require.context routing

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('expo-router/entry');
