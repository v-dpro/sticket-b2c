module.exports = function (api) {
  api.cache(true);
  const path = require('path');

  // When running Expo from `sticket-app/` (workspace root), some Babel plugins
  // live in `apps/mobile/node_modules` (npm workspaces) and may not be hoisted.
  const resolveFromMobile = (request) => {
    try {
      return require.resolve(request, { paths: [path.resolve(__dirname, 'apps/mobile')] });
    } catch {
      return request; // fallback: let Node/Babel try normal resolution
    }
  };

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Keep Reanimated last.
      resolveFromMobile('react-native-reanimated/plugin'),
    ],
  };
};


