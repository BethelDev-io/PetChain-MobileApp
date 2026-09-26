/* eslint-disable @typescript-eslint/no-require-imports */

// Load .env.<APP_ENV> via dotenv
const APP_ENV = process.env.APP_ENV ?? 'development';

require('dotenv').config({ path: `.env.${APP_ENV}` });

// Version codes: dev=1, staging=2, prod=3
const VERSION_CODE = { development: 1, staging: 2, production: 3 }[APP_ENV] ?? 1;
const APP_VERSION = '1.0.0';

const APP_NAME_MAP = {
  development: 'PetChain (Dev)',
  staging: 'PetChain (Staging)',
  production: 'PetChain',
};

// The runtimeVersion is what expo-updates uses (natively, before any JS runs) to decide
// whether a fetched OTA manifest is even eligible to apply to this binary. Embedding APP_ENV
// in it means a staging-published update's runtimeVersion ("staging-1.0.0") can never satisfy
// a production binary's runtimeVersion ("production-1.0.0"), even if a channel/URL were
// misconfigured — the native layer rejects the manifest outright. See issue #991.
const RUNTIME_VERSION = `${APP_ENV}-${APP_VERSION}`;

// ─── Deep / universal link policy (issue #1029) ─────────────────────────────
//
// Supported link routes and their parameter schemas are documented here in one
// central place. The native layer only ever *routes* a link to the app; the JS
// layer must validate every incoming link against this schema before acting on
// it (see the deep-link validator). Keeping the schema next to the native
// associatedDomains / intentFilters config ensures the two never drift.
//
// Each route declares:
//   path        — the URL path (matched exactly, no wildcards)
//   params      — allowed query params and their expected type
//   requiresAuth— whether the route may only be opened by an authenticated user
//   mutating    — whether opening the route can trigger a state mutation
//
// Security invariants enforced by the validator:
//   • Untrusted links cannot bypass authentication (requiresAuth routes are
//     rejected for logged-out users and replayed after sign-in).
//   • Untrusted links cannot change accounts (no account/identity params are
//     accepted from a link; the active session is never switched by a link).
//   • Untrusted links cannot trigger mutations (mutating routes require an
//     explicit in-app confirmation and a valid, unexpired signed token).
//   • Links expire or fail safely when their resource is revoked (every
//     resource-scoped route carries an `exp` and is re-checked server-side;
//     revoked/expired links resolve to a safe fallback, never a mutation).
const DEEP_LINK_ROUTES = {
  '/pet': {
    params: { id: 'string' },
    requiresAuth: true,
    mutating: false,
  },
  '/record': {
    params: { id: 'string', exp: 'number' },
    requiresAuth: true,
    mutating: false,
  },
  '/share': {
    params: { token: 'string', exp: 'number' },
    requiresAuth: false,
    mutating: false,
  },
  '/sos': {
    params: { id: 'string', exp: 'number' },
    requiresAuth: true,
    mutating: false,
  },
  '/invite': {
    params: { token: 'string', exp: 'number' },
    requiresAuth: false,
    mutating: true,
  },
};

// Hosts that are allowed to deep-link into the app. Anything else is treated as
// untrusted and must not be routed.
const DEEP_LINK_ALLOWED_HOSTS = ['petchain.app', 'www.petchain.app'];

module.exports = {
  expo: {
    name: APP_NAME_MAP[APP_ENV] ?? 'PetChain',
    slug: 'petchain-mobile',
    scheme: 'petchain',
    version: APP_VERSION,
    runtimeVersion: RUNTIME_VERSION,
    updates: {
      // Never let a dev client pull an OTA update — it always runs from the local bundler.
      enabled: APP_ENV !== 'development',
      // Don't silently run a stale cached bundle indefinitely if a check fails.
      fallbackToCacheTimeout: 0,
      checkAutomatically: 'ON_LOAD',
    },
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier:
        APP_ENV === 'production' ? 'app.petchain.mobile' : `app.petchain.mobile.${APP_ENV}`,
      associatedDomains: ['applinks:petchain.app'],
      buildNumber: String(VERSION_CODE),
      infoPlist: {
        NSCameraUsageDescription:
          'PetChain needs camera access to scan QR codes for pet identification and medical record sharing.',
        NSPhotoLibraryUsageDescription:
          'PetChain needs photo library access to upload pictures of your pets for their profiles.',
        NSPhotoLibraryAddUsageDescription: 'PetChain saves photos you take to your pet profile.',
        NSLocationWhenInUseUsageDescription:
          'PetChain uses your location for the Emergency SOS feature to share your whereabouts with emergency contacts when you request help.',
        NSLocationAlwaysAndWhenInUseUsageDescription:
          'PetChain uses your location for the Emergency SOS feature to share your whereabouts with emergency contacts when you request help.',
        NSUserTrackingUsageDescription: 'PetChain does not track you for advertising purposes.',
        NSFaceIDUsageDescription:
          "PetChain uses Face ID/Touch ID for secure biometric authentication to protect your pet's medical data.",
        UIBackgroundModes: ['location', 'background-fetch'],
      },
      // App Groups for widget data sharing
      appGroups: ['group.app.petchain.mobile'],
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#4A90A4',
      },
      package: APP_ENV === 'production' ? 'app.petchain.mobile' : `app.petchain.mobile.${APP_ENV}`,
      versionCode: VERSION_CODE,
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [{ scheme: 'https', host: 'petchain.app', pathPrefix: '/' }],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
      permissions: [
        'CAMERA',
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
        'POST_NOTIFICATIONS',
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE',
        'READ_MEDIA_IMAGES',
      ],
      softwareKeyboardLayoutMode: 'pan',
      // Widget configuration for Android
      metaData: [
        {
          name: 'com.google.android.gms.version',
          value: '@integer/google_play_services_version',
        },
      ],
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-updates',
      [
        '@sentry/react-native/expo',
        {
          organization: 'petchain',
          project: 'mobile-app',
          // Upload source maps so stack traces are human-readable in the dashboard
          uploadNativeSymbols: true,
          uploadSourceMaps: true,
        },
      ],
      // Widget support plugin (custom Expo plugin)
      [
        './expoWidgetPlugin.js',
        {
          ios: {
            appGroup: 'group.app.petchain.mobile',
            targetName: 'PetChainWidget',
          },
          android: {
            widgetName: 'PetChainWidgetProvider',
          },
        },
      ],
      // ─── Backup exclusion plugins ────────────────────────────────────────
      //
      // Android (API 23+):
      //   Sets android:allowBackup="false" in AndroidManifest.xml and
      //   references backup_rules.xml (API 23–30) and
      //   data_extraction_rules.xml (API 31+) to exclude databases/petchain.db,
      //   SharedPreferences (AsyncStorage), and the file-system documents
      //   directory from all Android Auto Backup transports (Google Drive
      //   cloud backup and device-to-device transfer).
      //
      // iOS:
      //   Injects BackupExclusion.swift into the Xcode target and patches
      //   AppDelegate to call excludeSensitiveDirectoriesFromBackup() at
      //   launch.  This sets NSURLIsExcludedFromBackupKey=true on:
      //     • Library/Application Support/  (expo-sqlite petchain.db)
      //     • Library/Preferences/          (AsyncStorage / RNCAsyncStorage)
      //     • Documents/                    (expo-file-system documentDirectory)
      //
      // expo-secure-store (Keychain/Keystore) is NOT backed up by any OS
      // transport regardless of these settings — no action needed there.
      //
      // Source files:
      //   plugins/withAndroidBackupExclusion.js
      //   plugins/withIosBackupExclusion.js
      //   android-config/backup_rules.xml
      //   android-config/data_extraction_rules.xml
      './plugins/withAndroidBackupExclusion.js',
      './plugins/withIosBackupExclusion.js',
    ],
    extra: {
      APP_ENV,
      // Central deep/universal link policy consumed by the JS deep-link validator.
      DEEP_LINK_ROUTES,
      DEEP_LINK_ALLOWED_HOSTS,
      // API_BASE_URL resolution: explicit env > profile-specific > no fallback to localhost for prod
      API_BASE_URL:
        process.env.API_BASE_URL ||
        (APP_ENV === 'production'
          ? process.env.PROD_API_URL // Production: require explicit PROD_API_URL, no fallback
          : APP_ENV === 'staging'
            ? (process.env.STAGING_API_URL ?? 'https://staging.petchain.app/api')
            : (process.env.API_BASE_URL ?? 'http://localhost:3000/api')), // Dev: localhost default
      STAGING_API_URL: process.env.STAGING_API_URL ?? 'https://staging.petchain.app/api',
      PROD_API_URL: process.env.PROD_API_URL ?? 'https://api.petchain.app/api',
      API_TIMEOUT: process.env.API_TIMEOUT ?? '10000',
      SENTRY_DSN: process.env.SENTRY_DSN ?? '',
      SENTRY_ENABLE_IN_DEV: process.env.SENTRY_ENABLE_IN_DEV ?? 'false',
      MAX_CACHE_SIZE: process.env.MAX_CACHE_SIZE ?? '50',
      PAGINATION_LIMIT: process.env.PAGINATION_LIMIT ?? '20',
      IOS_STORE_URL: process.env.IOS_STORE_URL ?? 'https://apps.apple.com/app/petchain/id000000000',
      ANDROID_STORE_URL:
        process.env.ANDROID_STORE_URL ??
        'https://play.google.com/store/apps/details?id=app.petchain.mobile',
      MIN_NATIVE_VERSION_IOS: process.env.MIN_NATIVE_VERSION_IOS ?? '1.0.0',
      MIN_NATIVE_VERSION_ANDROID: process.env.MIN_NATIVE_VERSION_ANDROID ?? '1.0.0',
    },
  },
};
