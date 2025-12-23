import axios from 'axios';
import * as SecureStore from '../storage/secureStore';

const SPOTIFY_API = 'https://api.spotify.com/v1';

export interface SpotifyArtist {
  id: string;
  name: string;
  images: { url: string; width: number; height: number }[];
  genres: string[];
  popularity: number;
}

export async function getSpotifyAccessToken(): Promise<string | null> {
  return await SecureStore.getItemAsync('spotify_access_token');
}

export async function getUserTopArtists(
  limit: number = 50,
  timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term'
): Promise<SpotifyArtist[]> {
  const token = await getSpotifyAccessToken();
  if (!token) return [];

  try {
    const response = await axios.get(`${SPOTIFY_API}/me/top/artists`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { limit, time_range: timeRange },
    });
    return response.data.items;
  } catch (error) {
    console.error('Failed to fetch Spotify top artists:', error);
    return [];
  }
}




