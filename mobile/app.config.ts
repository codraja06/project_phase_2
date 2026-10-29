import { ExpoConfig, ConfigContext } from 'expo/config';

const releaseBuild = ['production', 'render-apk'].includes(process.env.EAS_BUILD_PROFILE || '');
const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

if (releaseBuild && (!configuredApiUrl || !/^https:\/\/[^\s]+\/api\/?$/.test(configuredApiUrl))) {
  throw new Error('Release builds require EXPO_PUBLIC_API_URL=https://your-api-host/api in the EAS production environment.');
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Civic Track',
  slug: 'civic-issue-detection',
  extra: {
    ...config.extra,
    apiUrl: configuredApiUrl || config.extra?.apiUrl || 'http://192.168.29.44:5000/api',
    mapProvider: process.env.EXPO_PUBLIC_MAP_PROVIDER || 'osm',
  },
  android: {
    ...config.android,
    softwareKeyboardLayoutMode: 'resize',
  },
  plugins: [
    ...(config.plugins || []),
    'expo-secure-store',
    ['expo-build-properties', {
      android: {
        // Only the local LAN preview profile needs HTTP. Other builds keep cleartext disabled.
        usesCleartextTraffic: process.env.CIVICTRACK_ALLOW_LOCAL_HTTP === 'true',
      },
    }],
  ],
});
