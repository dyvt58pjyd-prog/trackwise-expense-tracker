import { CapacitorConfig } from '@capacitor/cli';

/**
 * TrackWise Capacitor Android Configuration
 * 
 * To connect your Android APK directly to your live Vercel deployment:
 * 1. Uncomment the `url` property below and insert your Vercel URL.
 * 2. Run: npx cap sync android
 */
const config: CapacitorConfig = {
  appId: 'com.trackwise.finance',
  appName: 'TrackWise Finance',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Optional: Point directly to your deployed Vercel domain for instant live sync:
    // url: 'https://your-expense-tracker.vercel.app',
    // cleartext: true,
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
