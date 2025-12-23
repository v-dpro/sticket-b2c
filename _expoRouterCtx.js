// Expo Router context override for monorepo/workspace root.
// Metro requires the first argument to `require.context()` to be a string literal.
// When starting Expo from `sticket-app/`, the router app lives at `./apps/mobile/app`.

export const ctx = require.context(
  './apps/mobile/app',
  true,
  /^(?:\.\/)(?!(?:(?:(?:.*\+api)|(?:\+html)|(?:\+middleware)))\.[tj]sx?$).*(?:\.android|\.web)?\.[tj]sx?$/
);


