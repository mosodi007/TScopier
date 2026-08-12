const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')
const path = require('path')

const projectRoot = __dirname
const monorepoRoot = path.resolve(projectRoot, '../..')
const mobileSupabase = path.resolve(projectRoot, 'lib/supabase.ts')
const webLibDir = path.resolve(monorepoRoot, 'src/lib')
const webLibShimDir = path.resolve(monorepoRoot, 'packages/web-lib/lib')

const config = getDefaultConfig(projectRoot)

config.watchFolders = [monorepoRoot]
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
]
config.resolver.unstable_enablePackageExports = true

/**
 * web-lib is a symlink into src/lib. Those modules import `./supabase`, which is the
 * Vite web client (VITE_* + throw). On mobile, force the Expo SecureStore client instead.
 */
const defaultResolveRequest = config.resolver.resolveRequest
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const origin = context.originModulePath || ''
  const fromWebLib =
    origin.startsWith(webLibDir + path.sep) || origin.startsWith(webLibShimDir + path.sep)

  if (
    fromWebLib
    && (moduleName === './supabase' || moduleName === '../supabase' || moduleName === '@tscopier/web-lib/supabase')
  ) {
    return { filePath: mobileSupabase, type: 'sourceFile' }
  }

  if (typeof defaultResolveRequest === 'function') {
    return defaultResolveRequest(context, moduleName, platform)
  }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = withNativeWind(config, { input: './global.css' })
