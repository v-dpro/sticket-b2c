/**
 * Expo Router entry shim.
 *
 * Some Expo/Metro setups still try to load `App.tsx` (via `expo/AppEntry`).
 * Since `expo-router/entry` is loaded as a side-effect in `index.ts`,
 * we just need to ensure it's loaded and then try to get the App component.
 * 
 * If we can't get the component, we'll export a fallback since expo-router/entry
 * should have already registered everything via side effects.
 */

// Ensure index.ts is loaded (which loads expo-router/entry)
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('./index');

// Try to get the App component from expo-router's qualified entry
// If this fails, the errors are caught and ignored since expo-router/entry
// should have already registered the app via side effects
let AppComponent: any;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const QualifiedEntry = require('expo-router/build/qualified-entry');
  AppComponent = QualifiedEntry?.App;
} catch {
  // qualified-entry might not exist or might fail to load
  // This is okay - expo-router/entry has side effects that register the app
  AppComponent = null;
}

// Fallback component if we couldn't load the qualified entry
// eslint-disable-next-line @typescript-eslint/no-var-requires
const React = require('react');
function FallbackApp() {
  // This should rarely/never render - expo-router handles routing via side effects
  return null;
}

// Export the component (or fallback)
// eslint-disable-next-line import/no-default-export
export default AppComponent || FallbackApp;
