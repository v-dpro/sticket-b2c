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
  // Require at least 2 characters
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    console.log('[searchArtists] Searching:', query);
    
    const response = await apiClient.get('/artists/search', {
      params: { q: query.trim(), ...options },
    });
    
    // Handle both array and object responses
    const data = response.data;
    
    if (Array.isArray(data)) {
      console.log('[searchArtists] Found:', data.length, 'results');
      return data;
    }
    
    if (data?.artists && Array.isArray(data.artists)) {
      console.log('[searchArtists] Found:', data.artists.length, 'results');
      return data.artists;
    }
    
    console.warn('[searchArtists] Unexpected response:', typeof data);
    return [];
  } catch (error: any) {
    console.error('[searchArtists] Error:', error?.message);
    console.error('[searchArtists] Status:', error?.response?.status);
    console.error('[searchArtists] URL:', error?.config?.baseURL);
    return [];
  }
}

// Get user's history with artist
export async function getArtistHistory(artistId: string): Promise<any[]> {
  const response = await apiClient.get(`/artists/${artistId}/my-history`);
  return response.data;
}

// ---------------------------------------------------------------------------
// Entity pages (additive)
// ---------------------------------------------------------------------------

// Shape returned by GET /artists/:id/tours
export interface ArtistTour {
  id: string;
  name: string;
  year?: number;
  startDate?: string;
  endDate?: string;
  imageUrl?: string;
  eventCount: number;
  avgScore?: number;
  scoredLogCount: number;
}

// GET /artists/:id/tours — tours with event counts + community avg score,
// newest tour first.
export async function getArtistTours(artistId: string): Promise<ArtistTour[]> {
  const response = await apiClient.get(`/artists/${artistId}/tours`);
  return Array.isArray(response.data) ? response.data : [];
}

// Typed shape of GET /artists/:id/my-history rows (same endpoint as
// getArtistHistory above, typed for the artist entity page).
export interface ArtistHistoryEntry {
  id: string;
  rating?: number;
  note?: string;
  createdAt: string;
  event: {
    id: string;
    name: string;
    date: string;
    venue: { id: string; name: string; city: string; state?: string };
  };
  photos: { id: string; photoUrl: string }[];
}

export async function getArtistMyHistory(artistId: string): Promise<ArtistHistoryEntry[]> {
  const response = await apiClient.get(`/artists/${artistId}/my-history`);
  return Array.isArray(response.data) ? response.data : [];
}



