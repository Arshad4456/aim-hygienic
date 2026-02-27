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
      permissions: ['CAMERA', 'READ_EXTERNAL_STORAGE', 'WRITE_EXTERNAL_STORAGE'],
    },
    plugins: ['expo-secure-store'],
    extra: {
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
      eas: {
        projectId,
      },
    },
  },
};
