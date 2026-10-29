import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const KEY = 'civic_auth_token';
const LEGACY_KEY = '@civic_auth_token';
export const tokenStore = {
  async get() {
    const stored = await SecureStore.getItemAsync(KEY);
    if (stored) { await AsyncStorage.removeItem(LEGACY_KEY); return stored; }
    const legacy = await AsyncStorage.getItem(LEGACY_KEY);
    if (legacy) {
      await SecureStore.setItemAsync(KEY, legacy);
      await AsyncStorage.removeItem(LEGACY_KEY);
    }
    return legacy;
  },
  async set(token: string) { await SecureStore.setItemAsync(KEY, token); await AsyncStorage.removeItem(LEGACY_KEY); },
  async remove() { await SecureStore.deleteItemAsync(KEY); await AsyncStorage.removeItem(LEGACY_KEY); },
};
