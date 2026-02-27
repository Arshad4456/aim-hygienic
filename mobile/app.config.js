export default {
  expo: {
    name: 'AIM ERP Mobile',
    slug: 'aim-erp-mobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assests/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assests/splash.png',
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
        projectId: 'replace-with-eas-project-id',
      },
    },
  },
};
