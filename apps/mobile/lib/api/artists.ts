import { apiClient } from './client';
import type { ArtistDetails, ArtistShow } from '../../types/artist';

// Get artist details
export async function getArtist(artistId: string): Promise<ArtistDetails> {
  const response = await apiClient.get(`/artists/${artistId}`);
  return response.data;
}

// Get artist shows
export async function getArtistShows(
  artistId: string,
  options?: {
    upcoming?: boolean;
    limit?: number;
    offset?: number;
  }
): Promise<ArtistShow[]> {
  const response = await apiClient.get(`/artists/${artistId}/events`, {
    params: options,
  });
  return response.data;
}

// Follow artist
export async function followArtist(artistId: string): Promise<void> {
  await apiClient.post(`/artists/${artistId}/follow`);
}

// Unfollow artist
export async function unfollowArtist(artistId: string): Promise<void> {
  await apiClient.delete(`/artists/${artistId}/follow`);
}

// Search artists
export async function searchArtists(
  query: string,
  options?: { limit?: number }
): Promise<any[]> {
  const response = await apiClient.get('/artists/search', {
    params: { q: query, ...options },
  });
  return response.data;
}

// Get user's history with artist
export async function getArtistHistory(artistId: string): Promise<any[]> {
  const response = await apiClient.get(`/artists/${artistId}/my-history`);
  return response.data;
}



