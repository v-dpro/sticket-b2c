import { apiClient } from './client';
import type { LogEntry, ProfileStats, UserBadge, UserProfile, VenueMarker } from '../../types/profile';

// Get user profile
export async function getUserProfile(userId: string): Promise<UserProfile> {
  const response = await apiClient.get(`/users/${userId}`);
  return response.data;
}

// Get current user's profile
export async function getMyProfile(): Promise<UserProfile> {
  const response = await apiClient.get('/auth/me');
  return {
    ...response.data,
    isOwnProfile: true,
  };
}

// Update profile
export async function updateProfile(updates: {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  city?: string;
  username?: string;
}): Promise<UserProfile> {
  const response = await apiClient.patch('/users/me', updates);
  return response.data;
}

// Get user's logs
export async function getUserLogs(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    year?: number;
  }
): Promise<LogEntry[]> {
  const response = await apiClient.get(`/users/${userId}/logs`, {
    params: options,
  });
  return response.data;
}

// Get user stats
export async function getUserStats(userId: string): Promise<ProfileStats> {
  const response = await apiClient.get(`/users/${userId}/stats`);
  return response.data;
}

// Get venue markers for map
export async function getUserVenueMarkers(userId: string): Promise<VenueMarker[]> {
  // Local-only users don't exist in the API DB.
  if (!userId || userId.startsWith('user_')) return [];
  const response = await apiClient.get(`/users/${userId}/venues`);
  return response.data;
}

// Get user's badges
export async function getUserBadges(userId: string): Promise<UserBadge[]> {
  const response = await apiClient.get(`/users/${userId}/badges`);
  return response.data;
}

// Follow user
export async function followUser(userId: string): Promise<void> {
  await apiClient.post(`/users/${userId}/follow`);
}

// Unfollow user
export async function unfollowUser(userId: string): Promise<void> {
  await apiClient.delete(`/users/${userId}/follow`);
}

export type FollowUserListItem = {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
};

// Get followers
export async function getFollowers(
  userId: string,
  options?: { limit?: number; offset?: number }
): Promise<FollowUserListItem[]> {
  const response = await apiClient.get(`/users/${userId}/followers`, {
    params: options,
  });
  return response.data;
}

// Get following
export async function getFollowing(
  userId: string,
  options?: { limit?: number; offset?: number }
): Promise<FollowUserListItem[]> {
  const response = await apiClient.get(`/users/${userId}/following`, {
    params: options,
  });
  return response.data;
}

// Upload avatar
export async function uploadAvatar(photo: { uri: string; type: string; name: string }): Promise<{ avatarUrl: string }> {
  const formData = new FormData();
  formData.append(
    'avatar',
    {
      uri: photo.uri,
      type: photo.type || 'image/jpeg',
      name: photo.name || 'avatar.jpg',
    } as any
  );

  const response = await apiClient.post('/users/me/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}




