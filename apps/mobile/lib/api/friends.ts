import { apiClient } from './client';
import type { ContactMatch, FriendSuggestion, UserSearchResult } from '../../types/friends';

// Search users
export async function searchUsers(query: string, options?: { limit?: number }): Promise<UserSearchResult[]> {
  const response = await apiClient.get('/users/search', {
    params: { q: query, ...options },
  });
  return response.data;
}

// Sync contacts - send phone numbers/emails, get matches
export async function syncContacts(
  contacts: { name: string; phoneNumber?: string; email?: string }[]
): Promise<ContactMatch[]> {
  const response = await apiClient.post('/users/contacts-sync', { contacts });
  return response.data;
}

// Get friend suggestions
export async function getSuggestions(options?: { limit?: number }): Promise<FriendSuggestion[]> {
  const response = await apiClient.get('/users/suggestions', { params: options });
  return response.data;
}

// Get user by QR code / username
export async function getUserByUsername(username: string): Promise<UserSearchResult> {
  const response = await apiClient.get(`/users/username/${username}`);
  return response.data;
}

// Follow user (already exists, re-export)
export { followUser, unfollowUser } from './users';




