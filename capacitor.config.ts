import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.8fe9e63558e44abda5bcc99567287ceb',
  appName: 'neshastyar-ai-meeting-scribe',
  webDir: 'dist',
  server: {
    url: 'https://8fe9e635-58e4-4abd-a5bc-c99567287ceb.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0
    }
  }
};

export default config;