// Local override for Expo Router context in monorepo setups.
// Metro requires the first argument to `require.context()` to be a string literal.
// This file lives at the project root, so `./app` resolves correctly.

export const ctx = require.context(
  './app',
  true,
  /^(?:\.\/)(?!(?:(?:(?:.*\+api)|(?:\+html)|(?:\+middleware)))\.[tj]sx?$).*(?:\.android|\.web)?\.[tj]sx?$/
);



