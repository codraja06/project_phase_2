import AsyncStorage from '@react-native-async-storage/async-storage';
import { tokenStore } from './tokenStore';

const USER_KEY = '@civic_auth_user';
const SERVER_URL_KEY = '@civic_server_url';

export const storageService = {
  async setToken(token: string): Promise<void> {
    await tokenStore.set(token);
  },

  async getToken(): Promise<string | null> {
    return await tokenStore.get();
  },

  async removeToken(): Promise<void> {
    await tokenStore.remove();
  },

  async setUser(user: any): Promise<void> {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  async getUser(): Promise<any | null> {
    const data = await AsyncStorage.getItem(USER_KEY);
    return data ? JSON.parse(data) : null;
  },

  async removeUser(): Promise<void> {
    await AsyncStorage.removeItem(USER_KEY);
  },

  async clearSession(): Promise<void> {
    await tokenStore.remove();
    await AsyncStorage.removeItem(USER_KEY);
  },

  async setCustomServerUrl(url: string): Promise<void> {
    await AsyncStorage.setItem(SERVER_URL_KEY, url.trim().replace(/\/$/, ''));
  },

  async getCustomServerUrl(): Promise<string | null> {
    return await AsyncStorage.getItem(SERVER_URL_KEY);
  },

  async removeCustomServerUrl(): Promise<void> {
    await AsyncStorage.removeItem(SERVER_URL_KEY);
  },
};
