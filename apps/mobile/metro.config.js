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

module.exports = config;




