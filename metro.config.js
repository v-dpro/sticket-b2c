// Metro configuration for running Expo from `sticket-app/` (workspace root).
// This mirrors `apps/mobile/metro.config.js`, but overrides Expo Router's `_ctx`
// to use a string-literal require.context root (`./apps/mobile/app`).

const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { resolve } = require('metro-resolver');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// Ensure Metro can resolve dependencies from both the workspace root and the mobile app.
config.watchFolders = [path.resolve(projectRoot, 'apps/mobile')];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(projectRoot, 'apps/mobile/node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

const ctxOverridePath = path.resolve(projectRoot, '_expoRouterCtx.js');

const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Expo Router imports one of:
  // - expo-router/_ctx
  // - expo-router/_ctx.ios
  // - expo-router/_ctx.ios.js
  if (moduleName === 'expo-router/_ctx' || moduleName.startsWith('expo-router/_ctx.')) {
    return {
      type: 'sourceFile',
      filePath: ctxOverridePath,
    };
  }

  return upstreamResolveRequest
    ? upstreamResolveRequest(context, moduleName, platform)
    : resolve(context, moduleName, platform);
};

module.exports = config;


