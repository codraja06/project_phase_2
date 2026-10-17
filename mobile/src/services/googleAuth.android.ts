import { authApi } from '../api/authApi';
import { User } from '../types/auth';

export interface GoogleAuthResult {
  user: User;
  token: string;
}

const getGoogleToken = async (): Promise<string> => {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
  if (!webClientId) {
    throw new Error('Google sign-in is not configured. Please use email and password.');
  }

  let googleSignIn: typeof import('@react-native-google-signin/google-signin');
  try {
    googleSignIn = require('@react-native-google-signin/google-signin');
  } catch {
    throw new Error('Google sign-in requires an updated CivicTrack APK. It is unavailable in Expo Go.');
  }

  const { GoogleSignin, isErrorWithCode, statusCodes } = googleSignIn;
  GoogleSignin.configure({ webClientId });

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const result = await GoogleSignin.signIn();
    if (!result.idToken) {
      throw new Error('Google did not return an identity token. Check the Android OAuth client and app signing SHA-1.');
    }
    return result.idToken;
  } catch (error) {
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        throw new Error('Google Sign-In was cancelled.');
      }
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Google Play services are unavailable or need an update on this device.');
      }
    }
    throw error;
  }
};

export const googleAuthService = {
  async signInWithGoogle(role: 'citizen' | 'authority' = 'citizen'): Promise<GoogleAuthResult> {
    return authApi.googleLogin({ token: await getGoogleToken(), role });
  },

  async linkGoogle(): Promise<User> {
    return authApi.linkGoogle({ token: await getGoogleToken() });
  },
};
