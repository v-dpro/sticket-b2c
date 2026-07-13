import { apiClient } from './client';
import type { LogEntry, ProfileStats, UserBadge, UserProfile, VenueMarker } from '../../types/profile';
import type { DiscoverySettings } from '../../types/settings';

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

// ── Artist collection (profile ARTISTS tab) ────────────────────────

export type UserArtistItem = {
  id: string;
  name: string;
  imageUrl?: string;
  seenCount: number;
};

// Distinct artists from a user's logged shows, seen-count desc. The API
// returns [] when the owner's showCollection privacy flag is off.
export async function getUserArtists(userId: string): Promise<UserArtistItem[]> {
  // Local-only users don't exist in the API DB.
  if (!userId || userId.startsWith('user_')) return [];
  const response = await apiClient.get(`/users/${userId}/artists`);
  return response.data;
}

// ── Masthead sheets: friends + followed artists ────────────────────
// Both mirror the /users/:id/logs privacy gate on the server (they return
// [] when the profile is restricted for the viewer), so the tapped masthead
// count and the sheet list stay in lockstep.

export type ProfileFriend = {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  showCount: number;
};

// The target's degree-1 people (users they follow). Count == stats.following.
export async function getUserFriends(
  userId: string,
  options?: { limit?: number; offset?: number }
): Promise<ProfileFriend[]> {
  if (!userId || userId.startsWith('user_')) return [];
  const response = await apiClient.get(`/users/${userId}/friends`, { params: options });
  return response.data;
}

export type FollowedArtist = {
  id: string;
  name: string;
  imageUrl?: string;
};

// Artists the target follows (taste). Count == stats.followingArtists. There
// is no venue-follow model, so the FOLLOWING sheet is artists-only.
export async function getUserFollowingArtists(
  userId: string,
  options?: { limit?: number; offset?: number }
): Promise<FollowedArtist[]> {
  if (!userId || userId.startsWith('user_')) return [];
  const response = await apiClient.get(`/users/${userId}/following-artists`, { params: options });
  return response.data;
}

// ── Shared history ("YOU × THEM") ──────────────────────────────────

export type SharedHistoryEntry = {
  eventId: string;
  eventName: string;
  date: string; // ISO
  venueName: string;
  yourScore: number | null;
  theirScore: number | null;
};

export type SharedHistory = {
  /** Total events both the viewer and this user have logged (visible side only). */
  sharedCount: number;
  /** Count of artists both users follow. */
  artistOverlap: number;
  /** One of the overlapping artists' names, for "You both follow X" copy. */
  topSharedArtist: string | null;
  /** Shared events, newest show first, capped at 50. */
  entries: SharedHistoryEntry[];
};

// Get the overlap between the signed-in viewer and another user.
export async function getSharedHistory(userId: string): Promise<SharedHistory> {
  const response = await apiClient.get(`/users/${userId}/shared-history`);
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

// ── Discovery dials (additive) ─────────────────────────────────────
// GET /auth/me carries sameShowRadius / tasteRadius / showInGalleries
// alongside the rest of the profile payload; PATCH /users/me/discovery
// writes them back. Enums: OFF | FRIENDS | FOF | EVERYONE.

export async function getMyDiscoverySettings(): Promise<DiscoverySettings> {
  const response = await apiClient.get('/auth/me');
  const data = (response.data ?? {}) as Partial<DiscoverySettings>;
  return {
    sameShowRadius: data.sameShowRadius ?? 'OFF',
    tasteRadius: data.tasteRadius ?? 'OFF',
    showInGalleries: Boolean(data.showInGalleries),
  };
}

// Response only echoes back whatever the server persisted; callers should
// merge this into existing state rather than replace it wholesale.
export async function updateDiscoverySettings(
  updates: Partial<DiscoverySettings>
): Promise<Partial<DiscoverySettings>> {
  const response = await apiClient.patch('/users/me/discovery', updates);
  const data = (response.data ?? {}) as Partial<DiscoverySettings>;
  const result: Partial<DiscoverySettings> = {};
  if (data.sameShowRadius) result.sameShowRadius = data.sameShowRadius;
  if (data.tasteRadius) result.tasteRadius = data.tasteRadius;
  if (typeof data.showInGalleries === 'boolean') result.showInGalleries = data.showInGalleries;
  return result;
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




