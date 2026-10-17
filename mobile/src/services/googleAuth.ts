import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { Platform } from 'react-native';
import { authApi } from '../api/authApi';
import { User } from '../types/auth';

WebBrowser.maybeCompleteAuthSession();

export interface GoogleAuthResult {
  user: User;
  token: string;
}

const getGoogleCredential = async (): Promise<{ token: string; nonce: string }> => {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('Google sign-in is not configured. Please use email and password.');
  }

  const state = Crypto.randomUUID();
  const nonce = Crypto.randomUUID();
  const redirectUri =
    Platform.OS === 'web'
      ? (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8081')
      : AuthSession.makeRedirectUri({ scheme: 'civictrack' });

  const authUrl =
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}&` +
    `response_type=id_token&` +
    `scope=openid%20profile%20email&` +
    `state=${encodeURIComponent(state)}&` +
    `nonce=${encodeURIComponent(nonce)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}`;

  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
  if (result.type === 'cancel' || result.type === 'dismiss') {
    throw new Error('Google Sign-In was cancelled.');
  }

  if (result.type === 'success' && result.url) {
    // Google returns the ID token in the redirect fragment.
    const hash = result.url.includes('#') ? result.url.split('#')[1] : (result.url.split('?')[1] || '');
    const params = new URLSearchParams(hash);
    if (params.get('state') !== state) throw new Error('Google sign-in response could not be verified. Please try again.');
    if (params.get('error')) throw new Error('Google sign-in was not completed. Please choose an account and try again.');
    const idToken = params.get('id_token');
    if (!idToken) throw new Error('No authentication token received from Google.');
    return { token: idToken, nonce };
  }

  throw new Error('Google authentication could not be completed.');
};

export const googleAuthService = {
  async signInWithGoogle(role: 'citizen' | 'authority' = 'citizen'): Promise<GoogleAuthResult> {
    return authApi.googleLogin({ ...await getGoogleCredential(), role });
  },

  async linkGoogle(): Promise<User> {
    return authApi.linkGoogle(await getGoogleCredential());
  },
};
