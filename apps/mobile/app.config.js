/** @type {import('expo/config').ExpoConfig} */
const scheme = process.env.EXPO_PUBLIC_APP_SCHEME ?? 'tscopier'

const easProjectId =
  process.env.EAS_PROJECT_ID ?? '2ef40380-e6ae-4f88-8d36-bd99d7561d0c'
const updatesUrl =
  process.env.EAS_UPDATE_URL ??
  'https://u.expo.dev/2ef40380-e6ae-4f88-8d36-bd99d7561d0c'

/** @type {import('expo/config').ExpoConfig} */
const config = {
  name: 'TScopier',
  slug: 'tscopier',
  owner: 'tartarix',
  version: '1.0.1',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme,
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'ai.tscopier.app',
    infoPlist: {
      UIBackgroundModes: ['remote-notification'],
      ITSAppUsesNonExemptEncryption: false,
    },
    associatedDomains: ['applinks:app.tscopier.ai'],
  },
  android: {
    package: 'ai.tscopier.app',
    adaptiveIcon: {
      backgroundColor: '#0f766e',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          { scheme },
          { scheme: 'https', host: 'app.tscopier.ai', pathPrefix: '/auth' },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-secure-store',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#0f172a',
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/images/icon.png',
        color: '#14b8a6',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: easProjectId,
    },
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    supabaseRealtimeUrl: process.env.EXPO_PUBLIC_SUPABASE_REALTIME_URL,
    workerUrl: process.env.EXPO_PUBLIC_WORKER_URL,
    appScheme: scheme,
    privacyPolicyUrl: 'https://tscopier.ai/privacy',
    termsUrl: 'https://tscopier.ai/terms',
    riskDisclaimerUrl: 'https://tscopier.ai/risk-disclaimer',
  },
  updates: {
    url: updatesUrl,
    enabled: true,
    checkAutomatically: 'ON_LOAD',
    // Don't block first paint waiting for the network; JS hook still downloads in background.
    fallbackToCacheTimeout: 0,
  },
  // Bare workflow (ios/ present) cannot use runtimeVersion policies.
  runtimeVersion: '1.0.1',
}

module.exports = config
