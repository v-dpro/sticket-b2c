import { apiClient } from './client';

export async function signUp(email: string, password: string, username: string) {
  const res = await apiClient.post('/auth/signup', { email, password, username });
  return res.data as { user: any; accessToken: string; refreshToken: string };
}

export async function login(email: string, password: string) {
  const res = await apiClient.post('/auth/login', { email, password });
  return res.data as { user: any; accessToken: string; refreshToken: string };
}

export async function logout() {
  const res = await apiClient.post('/auth/logout');
  return res.data as { success: boolean };
}

export async function refresh(refreshToken: string) {
  const res = await apiClient.post('/auth/refresh', { refreshToken });
  return res.data as { accessToken: string; refreshToken: string };
}

export async function forgotPassword(email: string) {
  const res = await apiClient.post('/auth/forgot-password', { email });
  return res.data as { success: boolean; message?: string };
}

export async function getMe() {
  const res = await apiClient.get('/auth/me');
  return res.data as any;
}



