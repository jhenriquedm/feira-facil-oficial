import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.feirafacil.app',
  appName: 'Feira Fácil',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined
    },
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '901690992750-jbuc5p2bebr2940uaorqtn5qcp72q6cp.apps.googleusercontent.com',
      clientId: '901690992750-jbuc5p2bebr2940uaorqtn5qcp72q6cp.apps.googleusercontent.com',
      androidClientId: '901690992750-m9tpgql30vpfnsfp2ffbrubdll1gmndl.apps.googleusercontent.com',
      forceCodeForRefreshToken: false,
    },
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#0284c7',
      showSpinner: false,
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP'
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0284c7'
    }
  }
};

export default config;
