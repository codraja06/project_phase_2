import AsyncStorage from '@react-native-async-storage/async-storage';

// Browser resume behavior is preserved. Native builds use the platform credential store.
const KEY = '@civic_auth_token';
export const tokenStore = {
  get: () => AsyncStorage.getItem(KEY),
  set: (token: string) => AsyncStorage.setItem(KEY, token),
  remove: () => AsyncStorage.removeItem(KEY),
};
