import { CapacitorConfig } from '@capacitor/cli';

/**
 * TrackWise Capacitor Android Configuration
 */
const config: CapacitorConfig = {
  appId: 'com.trackwise.finance',
  appName: 'TrackWise Finance',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  plugins: {
    Camera: {
      presentationStyle: 'fullscreen',
    },
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#0f172a',
    },
  },
};

export default config;
