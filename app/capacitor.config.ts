import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ai.scanwai.scancrowd.demo',
  appName: 'ScanCrowd Demo',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_notify',
      iconColor: '#3ddc97',
    },
    Camera: {
      presentationStyle: 'fullscreen',
    },
    Geolocation: {},
  },
};

export default config;
