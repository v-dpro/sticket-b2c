import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as SecureStore from '../storage/secureStore';

function getDevHostFromExpo(): string | null {
  const candidates = [
    // Some Expo SDKs / dev clients provide hostUri directly
    (Constants.expoConfig as any)?.hostUri,
    (Constants as any)?.manifest2?.extra?.expoClient?.hostUri,
    (Constants as any)?.manifest?.hostUri,

    // Expo Go commonly provides debuggerHost instead
    (Constants as any)?.expoGoConfig?.debuggerHost,
    (Constants as any)?.manifest2?.extra?.expoGo?.debuggerHost,
    (Constants as any)?.manifest2?.extra?.expoClient?.debuggerHost,
    (Constants as any)?.manifest?.debuggerHost,
  ].filter((v) => typeof v === 'string' && v.length) as string[];

  const raw = candidates[0];
  if (!raw) return null;

  // Examples:
  // - "192.168.1.172:8083"
  // - "192.168.1.172:19000"
  // - "exp://192.168.1.172:8083"
  const withoutScheme = raw.replace(/^.*?:\/\//, '');
  const hostPort = withoutScheme.split('/')[0] || '';
  const host = hostPort.split(':')[0] || '';
  return host || null;
}

function resolveApiUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  
  // In production builds, ALWAYS use the env URL
  if (!__DEV__ && envUrl) {
    return envUrl.replace(/\/+$/, '');
  }
  
  // In development with explicit non-localhost URL, use it
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl.replace(/\/+$/, '');
  }
  
  // Development fallbacks
  const fallback = envUrl || 'http://localhost:3001';
  
  // Android emulator needs special IP
  if (!Device.isDevice && Platform.OS === 'android') {
    const port = envUrl ? new URL(envUrl).port || '3001' : '3001';
    return `http://10.0.2.2:${port}`;
  }
  
  // iOS simulator can use localhost
  if (!Device.isDevice && Platform.OS === 'ios') {
    return fallback.replace(/\/+$/, '');
  }
  
  // Physical device in dev - try to get Expo host
  const devHost = getDevHostFromExpo();
  if (devHost) {
    const port = envUrl ? new URL(envUrl).port || '3001' : '3001';
    return `http://${devHost}:${port}`;
  }
  
  return fallback.replace(/\/+$/, '');
}

const API_URL = resolveApiUrl();

// Debug (dev-only): log baseURL once to help diagnose simulator/device networking.
const globalForApiClient = globalThis as unknown as { __sticketApiUrlLogged?: boolean };
if (!globalForApiClient.__sticketApiUrlLogged) {
  globalForApiClient.__sticketApiUrlLogged = true;
  // eslint-disable-next-line no-console
  console.log('[api] baseURL =', API_URL);
  if (__DEV__ && Device.isDevice) {
    // eslint-disable-next-line no-console
    console.log('[api] device detected; Expo dev host =', getDevHostFromExpo());
  }
}

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(async (config) => {
  // Prefer new key, fallback to legacy.
  const token = (await SecureStore.getItemAsync('access_token')) ?? (await SecureStore.getItemAsync('auth_token'));
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config as (typeof error.config & { _retry?: boolean }) | undefined;

    // If 401 and haven't retried yet, attempt refresh.
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await SecureStore.getItemAsync('refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        const refreshResponse = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = refreshResponse.data ?? {};
        if (!accessToken || !newRefreshToken) throw new Error('Invalid refresh response');

        await SecureStore.setItemAsync('access_token', accessToken);
        await SecureStore.setItemAsync('refresh_token', newRefreshToken);
        // legacy key for older call sites
        await SecureStore.setItemAsync('auth_token', accessToken);

        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch {
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
        await SecureStore.deleteItemAsync('auth_token');
      }
    }

    // Log after refresh attempt so we don't spam expected 401s.
    if (__DEV__) {
      const url: string | undefined = error?.config?.url;
      const status: number | undefined = error?.response?.status;
      const method: string | undefined = error?.config?.method;

      // Treat "not logged in yet" flows as expected.
      const isExpectedUnauthed =
        status === 401 &&
        (url === '/auth/me' ||
          url?.startsWith('/auth/me?') ||
          url === '/auth/refresh' ||
          url?.startsWith('/auth/refresh?') ||
          url === '/presales/my-alerts' ||
          url?.startsWith('/presales/my-alerts') ||
          url === '/feed' ||
          url?.startsWith('/feed?'));

      const payload = {
        baseURL: error?.config?.baseURL,
        url,
        method,
        status,
        data: error?.response?.data,
      };

      // eslint-disable-next-line no-console
      if (status && status >= 500) console.error('[api] request failed', payload);
      // eslint-disable-next-line no-console
      else if (isExpectedUnauthed) console.log('[api] unauthenticated (expected)', { url, method, status });
      // eslint-disable-next-line no-console
      else console.warn('[api] request failed', payload);
    }
    return Promise.reject(error);
  }
);




