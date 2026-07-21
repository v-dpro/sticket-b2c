// Metro configuration for Expo Router in a monorepo.
// We override `expo-router/_ctx` to ensure the `require.context()` root is a string literal.

const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { resolve } = require('metro-resolver');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');
const config = getDefaultConfig(projectRoot);

// Ensure Metro resolves hoisted deps from the monorepo root (npm workspaces).
config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

const ctxOverridePath = path.resolve(projectRoot, '_expoRouterCtx.js');

const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Expo Router may import:
  // - expo-router/_ctx
  // - expo-router/_ctx.ios
  // - expo-router/_ctx.ios.js
  if (moduleName === 'expo-router/_ctx' || moduleName.startsWith('expo-router/_ctx.')) {
    return {
      type: 'sourceFile',
      filePath: ctxOverridePath,
    };
  }

  // Let Metro handle everything else.
  // IMPORTANT: Must always return a valid resolution object.
  return upstreamResolveRequest
    ? upstreamResolveRequest(context, moduleName, platform)
    : resolve(context, moduleName, platform);
};

// Release/CI builds set METRO_NO_CACHE=1 (see fastlane/Fastfile) to disable
// Metro's persistent transform cache. Otherwise Xcode's "Bundle React Native
// code" phase can ship a STALE main.jsbundle (old JS / old API URL) even on a
// clean build, because the cache lives outside Xcode's DerivedData.
if (process.env.METRO_NO_CACHE) {
  config.cacheStores = [];
}

module.exports = config;
