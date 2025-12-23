import { apiClient } from './client';
import type { PrivacySettings, UserSettings } from '../../types/settings';

// Get user settings
export async function getSettings(): Promise<UserSettings> {
  const response = await apiClient.get('/settings');
  return response.data as UserSettings;
}

// Update settings
export async function updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
  const response = await apiClient.patch('/settings', settings);
  return response.data as UserSettings;
}

// Get privacy settings
export async function getPrivacySettings(): Promise<PrivacySettings> {
  const response = await apiClient.get('/settings/privacy');
  return response.data as PrivacySettings;
}

// Update privacy settings
export async function updatePrivacySettings(settings: Partial<PrivacySettings>): Promise<PrivacySettings> {
  const response = await apiClient.patch('/settings/privacy', settings);
  return response.data as PrivacySettings;
}

// Change email
export async function changeEmail(newEmail: string, password: string): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post('/auth/change-email', {
    newEmail,
    password,
  });
  return response.data as { success: boolean; message: string };
}

// Change password
export async function changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean }> {
  const response = await apiClient.post('/auth/change-password', {
    currentPassword,
    newPassword,
  });
  return response.data as { success: boolean };
}

// Disconnect service
export async function disconnectService(service: 'spotify' | 'apple_music'): Promise<void> {
  if (service === 'spotify') {
    await apiClient.post('/auth/spotify/disconnect');
    return;
  }

  // Not implemented on backend yet.
  throw new Error('Apple Music disconnect not supported');
}

// Export user data
export async function exportUserData(): Promise<{ downloadUrl: string | null; message?: string }> {
  const response = await apiClient.post('/settings/export-data');
  return response.data as { downloadUrl: string | null; message?: string };
}

// Delete account
export async function deleteAccount(password: string, reason?: string): Promise<void> {
  await apiClient.delete('/auth/account', {
    data: { password, reason },
  });
}

// Logout
export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}



