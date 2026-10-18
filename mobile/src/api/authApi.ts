import { axiosClient } from './axiosClient';
import { ENDPOINTS } from '../constants/endpoints';
import { User } from '../types/auth';
export interface SignupSession { challengeId: string; expiresAt: string; resendAvailableAt: string; smsStatus: 'sent' | 'failed' | 'not_configured'; phoneVerificationRequired: boolean; }

// NOTE: axiosClient interceptor returns response.data directly.
// Backend envelope: { success: true, data: { user, token } }
// So axiosClient returns the envelope object { success, data: { user, token } }

export const authApi = {
  async register(data: any): Promise<{ user: User; token: string }> {
    const envelope: any = await axiosClient.post('/auth/signup/complete', data);
    return envelope.data; // { user, token }
  },
  async requestSignupOtp(data: { name: string; email: string; phone: string; password: string }): Promise<SignupSession> {
    const envelope: any = await axiosClient.post('/auth/signup/request-otp', data, { timeout: 60000 }); return envelope.data;
  },
  async resendSignupOtp(challengeId: string): Promise<SignupSession> {
    const envelope: any = await axiosClient.post('/auth/signup/resend-otp', { challengeId }, { timeout: 60000 }); return envelope.data;
  },
  async verifySignupOtp(challengeId: string, channel: 'email' | 'sms', code: string): Promise<{ emailVerified: boolean; phoneVerified: boolean }> {
    const envelope: any = await axiosClient.post('/auth/signup/verify-otp', { challengeId, channel, code }); return envelope.data;
  },
  async updateNotificationPreferences(email: boolean, sms: boolean): Promise<User> {
    const envelope: any = await axiosClient.put('/auth/notification-preferences', { email, sms }); return envelope.data;
  },

  async login(data: any): Promise<{ user: User; token: string }> {
    const envelope: any = await axiosClient.post(ENDPOINTS.AUTH.LOGIN, data);
    if (envelope?.success !== true || !envelope.data?.user || typeof envelope.data.token !== 'string' || !envelope.data.token) {
      throw new Error('Login service returned an invalid response. Please try again later.');
    }
    return envelope.data; // { user, token }
  },

  async googleLogin(payload: {
    token?: string;
    nonce?: string;
    role?: 'citizen' | 'authority';
    userInfo?: { email: string; name: string; picture?: string; id?: string };
  }): Promise<{ user: User; token: string }> {
    const envelope: any = await axiosClient.post(ENDPOINTS.AUTH.GOOGLE, payload);
    if (envelope?.success !== true || !envelope.data?.user || typeof envelope.data.token !== 'string' || !envelope.data.token) {
      throw new Error('Google login service returned an invalid response. Please try again later.');
    }
    return envelope.data; // { user, token }
  },

  async linkGoogle(payload: { token: string; nonce?: string }): Promise<User> {
    const envelope: any = await axiosClient.post('/auth/google/link', payload);
    if (envelope?.success !== true || !envelope.data?.googleId) {
      throw new Error('Google account linking returned an invalid response. Please try again later.');
    }
    return envelope.data;
  },

  async logout(): Promise<void> {
    await axiosClient.post(ENDPOINTS.AUTH.LOGOUT);
  },

  async getMe(): Promise<User> {
    const envelope: any = await axiosClient.get(ENDPOINTS.AUTH.ME);
    return envelope.data; // User object
  },

  async updateProfile(data: any): Promise<User> {
    const envelope: any = await axiosClient.put(ENDPOINTS.AUTH.PROFILE, data);
    return envelope.data;
  },

  async changePassword(data: any): Promise<void> {
    await axiosClient.put(ENDPOINTS.AUTH.CHANGE_PASSWORD, data);
  },
};
