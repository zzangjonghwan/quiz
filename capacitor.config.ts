import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  // Never change appId after the first APK is shared: Android treats it as a different app.
  appId: 'com.sangsikhanip.app',
  appName: '상식한입',
  webDir: 'dist',
  backgroundColor: '#0b0b0c',
  plugins: {
    SystemBars: {
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
      style: 'DARK',
    },
  },
}

export default config
