/**
 * Expo Router entry shim.
 *
 * Some Expo/Metro setups still try to load `App.tsx` (via `expo/AppEntry`).
 * Expo expects this file to export a React component.
 */

// NOTE: `expo-router/entry` is side-effect only (it registers the root itself) and does not
// export a component. Expo's `expo/AppEntry` expects to import a component from `App.tsx`,
// so we instead export the qualified router App component.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { App } = require('expo-router/build/qualified-entry');

export default App;
