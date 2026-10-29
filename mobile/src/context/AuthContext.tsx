import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types/auth';
import { storageService } from '../services/storage';
import { authApi } from '../api/authApi';
import { googleAuthService } from '../services/googleAuth';
import { setOnUnauthorizedCallback } from '../api/axiosClient';

interface SavedSession {
  user: User;
  token: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  savedSession: SavedSession | null;
  isLoading: boolean;
  login: (data: any, expectedRole?: 'citizen' | 'authority') => Promise<User>;
  loginWithGoogle: (role: 'citizen' | 'authority') => Promise<User>;
  register: (data: any) => Promise<User>;
  resumeSavedSession: (expectedRole?: 'citizen' | 'authority') => Promise<User>;
  clearSavedSession: () => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  updateSession: (session: { user: User; token: string }) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  savedSession: null,
  isLoading: false,
  login: async () => ({} as User),
  loginWithGoogle: async () => ({} as User),
  register: async () => ({} as User),
  resumeSavedSession: async () => ({} as User),
  clearSavedSession: async () => {},
  logout: async () => {},
  updateUser: () => {},
  updateSession: async () => {},
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [savedSession, setSavedSession] = useState<SavedSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    setOnUnauthorizedCallback(() => {
      setToken(null);
      setUser(null);
      setSavedSession(null);
    });
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      // Requirement 1: Force login on every app launch.
      // Always show Login screen first on cold start (user and token state remain null).
      // We read the stored token and user so that the Login screen can offer 1-tap fast resume.
      const storedToken = await storageService.getToken();
      const storedUser = await storageService.getUser();

      if (storedToken && storedUser) {
        setSavedSession({ user: storedUser, token: storedToken });
      } else {
        setSavedSession(null);
      }
      // Never auto-route to dashboard on launch
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Error inspecting saved session:', error);
      setSavedSession(null);
    } finally {
      setIsLoading(false);
    }
  };

  const resumeSavedSession = async (expectedRole?: 'citizen' | 'authority'): Promise<User> => {
    if (!savedSession) {
      throw new Error('No saved login session found. Please enter your credentials.');
    }

    const userRole = (savedSession.user?.role || '').toLowerCase().trim();
    if (expectedRole) {
      const expected = expectedRole.toLowerCase().trim();
      if (expected === 'authority' && userRole !== 'authority') {
        throw new Error(
          'Access denied. This saved session belongs to a Citizen. Please use the Citizen Login screen.'
        );
      }
      if (expected === 'citizen' && userRole === 'authority') {
        throw new Error(
          'This saved session belongs to a Municipal Officer. Please use the Officer Login screen.'
        );
      }
    }

    const verifiedUser = await authApi.getMe();
    if (expectedRole && verifiedUser.role !== expectedRole) throw new Error('Please use the correct account portal.');
    setToken(savedSession.token);
    setUser(verifiedUser);
    return verifiedUser;
  };

  const clearSavedSession = async () => {
    await storageService.clearSession();
    setSavedSession(null);
  };

  const login = async (data: any, expectedRole?: 'citizen' | 'authority'): Promise<User> => {
    const result = await authApi.login(data);

    const userRole = (result.user?.role || '').toLowerCase().trim();

    if (expectedRole) {
      const expected = expectedRole.toLowerCase().trim();
      if (expected === 'authority' && userRole !== 'authority') {
        throw new Error(
          'Access denied. This account is registered as a Citizen. Please use the Citizen Login screen.'
        );
      }
      if (expected === 'citizen' && userRole === 'authority') {
        throw new Error(
          'This account has Municipal Officer credentials. Please use the Officer / Authority Login screen.'
        );
      }
    }

    await storageService.setToken(result.token);
    await storageService.setUser(result.user);
    setToken(result.token);
    setUser(result.user);
    setSavedSession({ user: result.user, token: result.token });
    return result.user;
  };

  const loginWithGoogle = async (role: 'citizen' | 'authority'): Promise<User> => {
    const result = await googleAuthService.signInWithGoogle(role);
    await storageService.setToken(result.token);
    await storageService.setUser(result.user);
    setToken(result.token);
    setUser(result.user);
    setSavedSession({ user: result.user, token: result.token });
    return result.user;
  };

  const register = async (data: any): Promise<User> => {
    const result = await authApi.register(data);
    await storageService.setToken(result.token);
    await storageService.setUser(result.user);
    setToken(result.token);
    setUser(result.user);
    setSavedSession({ user: result.user, token: result.token });
    return result.user;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      // ignore network errors on logout
    } finally {
      try { await storageService.clearSession(); }
      finally { setToken(null); setUser(null); setSavedSession(null); }
    }
  };

  const updateSession = async (session: { user: User; token: string }) => {
    await storageService.setToken(session.token);
    await storageService.setUser(session.user);
    setToken(session.token); setUser(session.user); setSavedSession(session);
  };
  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    storageService.setUser(updatedUser);
    if (token) {
      setSavedSession({ user: updatedUser, token });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        savedSession,
        isLoading,
        login,
        loginWithGoogle,
        register,
        resumeSavedSession,
        clearSavedSession,
        logout,
        updateUser,
        updateSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
