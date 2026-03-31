const DEFAULT_EAS_PROJECT_ID = '303e87e6-cab0-40d8-bb4d-1765ed3a1dc5';
const projectId = process.env.EXPO_EAS_PROJECT_ID || DEFAULT_EAS_PROJECT_ID;

module.exports = {
  expo: {
    name: 'AIM ERP Mobile',
    slug: 'aim-erp-mobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    assetBundlePatterns: ['**/*'],
    android: {
      package: 'com.aim.erp.mobile',
      versionCode: 1,
      permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION', 'ACCESS_BACKGROUND_LOCATION', 'FOREGROUND_SERVICE'],
    },
    plugins: [
      'expo-secure-store',
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission: 'Allow AIM ERP to track your location during duty even in background.',
          locationWhenInUsePermission: 'Allow AIM ERP to access your location while using the app.',
          isAndroidBackgroundLocationEnabled: true,
          isIosBackgroundLocationEnabled: true,
        },
      ],
    ],
    extra: {
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://www.aimhygienics.com',
      eas: {
        projectId,
      },
    },
  },
};