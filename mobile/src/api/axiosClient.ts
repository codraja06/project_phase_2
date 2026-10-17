import axios, { AxiosError } from 'axios';
import { API_BASE_URL } from '../constants/config';
import { storageService } from '../services/storage';

let onUnauthorizedCallback: (() => void) | null = null;
const requestStarts = new WeakMap<object, number>();

const safeEndpoint = (baseURL: string | undefined, path: string | undefined): string =>
  `${baseURL || API_BASE_URL}${(path || '').split('?')[0]}`.replace(/\/\/[^/@]+@/, '//');

const elapsed = (config: object | undefined): string => {
  const start = config ? requestStarts.get(config) : undefined;
  return start === undefined ? 'unknown duration' : `${Date.now() - start}ms`;
};

export const setOnUnauthorizedCallback = (cb: () => void) => {
  onUnauthorizedCallback = cb;
};

/**
 * Returns the currently active Base URL (custom saved override if present, else default).
 */
export const getActiveBaseUrl = async (): Promise<string> => {
  const custom = await storageService.getCustomServerUrl();
  return custom || API_BASE_URL;
};

export const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor: attach authorization token and apply dynamic server override
axiosClient.interceptors.request.use(
  async (config) => {
    // 1. Resolve custom server URL if configured on device
    try {
      const customUrl = await storageService.getCustomServerUrl();
      if (customUrl) {
        config.baseURL = customUrl;
      }
    } catch {
      // Ignore storage read error, fallback to initial baseURL
    }

    // 2. Attach JWT token
    const token = await storageService.getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    requestStarts.set(config, Date.now());
    // Do not log credentials, tokens, request bodies, or query parameters.
    if (__DEV__) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${safeEndpoint(config.baseURL, config.url)}`);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: structured error handling and friendly diagnostic messages
axiosClient.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.log(`[API Response] ${response.status} ${safeEndpoint(response.config.baseURL, response.config.url)} (${elapsed(response.config)})`);
    }
    // Express API wraps responses in { success, data, message }
    return response.data;
  },
  async (error: AxiosError<any>) => {
    const attemptedUrl = safeEndpoint(error.config?.baseURL, error.config?.url);
    const isCredentialEndpoint = ['/auth/login', '/auth/google'].some(
      endpoint => error.config?.url === endpoint || error.config?.url?.startsWith(`${endpoint}/`)
    );

    let userFriendlyMessage = 'An unexpected error occurred. Please try again.';

    if (error.response) {
      const status = error.response.status;
      const responseData = error.response.data;

      // Only invoke unauthorized callback on session expiration for protected endpoints,
      // never when Google or password credentials are being verified.
      if (status === 401 && !isCredentialEndpoint) {
        await storageService.clearSession();
        if (onUnauthorizedCallback) {
          onUnauthorizedCallback();
        }
      }

      // Extract meaningful server error message
      if (status === 503 && (isCredentialEndpoint || error.config?.url === '/ai/detect') && typeof responseData?.message === 'string') {
        userFriendlyMessage = responseData.message;
      } else if (status >= 500) {
        userFriendlyMessage = 'Backend server encountered an error. Please try again later.';
      } else if (typeof responseData?.message === 'string') {
        userFriendlyMessage = responseData.message;
      } else if (Array.isArray(responseData?.errors) && responseData.errors.length > 0) {
        userFriendlyMessage = responseData.errors
          .map((e: any) => (typeof e === 'string' ? e : e.message || 'Validation error'))
          .join('. ');
      } else if (responseData?.detail) {
        userFriendlyMessage = responseData.detail;
      } else if (status === 400) {
        userFriendlyMessage = 'Invalid request. Please check the entered data.';
      } else if (status === 401) {
        userFriendlyMessage = 'Invalid email or password.';
      } else if (status === 403) {
        userFriendlyMessage = 'Access denied. You do not have permission to perform this action.';
      } else if (status === 404) {
        userFriendlyMessage = 'Requested service endpoint was not found (404).';
      } else {
        userFriendlyMessage = `Server responded with status ${status}.`;
      }

      if (__DEV__) {
        console.warn(`[API Response Error] ${status} ${attemptedUrl} (${elapsed(error.config)}):`, userFriendlyMessage);
      }
    } else if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
      const timeoutSeconds = Math.round((error.config?.timeout || 15000) / 1000);
      userFriendlyMessage = `Connection to the backend timed out after ${timeoutSeconds} seconds. Open Server Settings to test the address.`;
      if (__DEV__) {
        console.warn(`[API Timeout] ${attemptedUrl} (${elapsed(error.config)})`);
      }
    } else if (error.request) {
      // Native Android / iOS network error where no HTTP response was received
      const targetBase = error.config?.baseURL || API_BASE_URL;
      userFriendlyMessage = `Cannot reach backend server at ${targetBase}. Open Server Settings to test the address and check that the backend is running.`;
      if (__DEV__) {
        console.warn(`[API Network Failure] ${attemptedUrl} (${elapsed(error.config)}; ${error.code || error.message}; no HTTP response)`);
      }
    } else if (error.message) {
      userFriendlyMessage = error.message;
    }

    return Promise.reject(new Error(userFriendlyMessage));
  }
);
