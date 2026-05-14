import 'dotenv/config';

export default {
  expo: {
    name: 'Monai',
    slug: 'monai',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'monai',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    splash: {
      image: './assets/images/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff'
    },
    ios: {
      supportsTablet: true
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#ffffff'
      },
      edgeToEdgeEnabled: true,
      package: 'com.monai',
      googleServicesFile: './google-services.json'
    },
    plugins: [
      'expo-router',
      '@react-native-firebase/app',
      '@react-native-firebase/auth',
      [
        'expo-image-picker',
        {
          'photosPermission': 'Allow Monai to access your photos to analyze financial graphs.',
          'cameraPermission': 'Allow Monai to access your camera when selecting financial graph images.'
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    }
  }
};
