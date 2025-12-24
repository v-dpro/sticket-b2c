// Metro configuration for running Expo from `sticket-app/` (workspace root).
// This mirrors `apps/mobile/metro.config.js`, but overrides Expo Router's `_ctx`
// to use a string-literal require.context root (`./apps/mobile/app`).

const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { resolve } = require('metro-resolver');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// Ensure Metro can resolve dependencies from both the workspace root and the mobile app.
// Prioritize mobile's node_modules since that's where all app dependencies are
config.watchFolders = [path.resolve(projectRoot, 'apps/mobile')];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'apps/mobile/node_modules'),
  path.resolve(projectRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = false;

const ctxOverridePath = path.resolve(projectRoot, '_expoRouterCtx.js');
const fs = require('fs');

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

  // Handle @babel/runtime and its sub-paths (check mobile first, then root)
  if (moduleName.startsWith('@babel/runtime/')) {
    const mobilePath = path.resolve(projectRoot, 'apps/mobile/node_modules/@babel/runtime');
    const rootPath = path.resolve(projectRoot, 'node_modules/@babel/runtime');
    const subPath = moduleName.replace('@babel/runtime/', '');
    
    for (const babelRuntimePath of [mobilePath, rootPath]) {
      const possiblePaths = [
        path.resolve(babelRuntimePath, `${subPath}.js`),
        path.resolve(babelRuntimePath, subPath, 'index.js'),
      ];
      
      for (const filePath of possiblePaths) {
        if (fs.existsSync(filePath)) {
          return {
            type: 'sourceFile',
            filePath: filePath,
          };
        }
      }
    }
  }

  // Handle invariant (check mobile first, then root)
  if (moduleName === 'invariant') {
    const mobilePath = path.resolve(projectRoot, 'apps/mobile/node_modules/invariant/invariant.js');
    const rootPath = path.resolve(projectRoot, 'node_modules/invariant/invariant.js');
    
    for (const invariantPath of [mobilePath, rootPath]) {
      if (fs.existsSync(invariantPath)) {
        return {
          type: 'sourceFile',
          filePath: invariantPath,
        };
      }
    }
  }

  return upstreamResolveRequest
    ? upstreamResolveRequest(context, moduleName, platform)
    : resolve(context, moduleName, platform);
};

module.exports = config;


