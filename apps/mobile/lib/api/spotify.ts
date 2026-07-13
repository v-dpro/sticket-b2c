// Spotify top-artists for the app's own screens (onboarding artist-pick,
// log-flow "From your Spotify" suggestions).
//
// This USED to read a `spotify_access_token` from SecureStore and call the
// Spotify Web API directly — but that key is never written anywhere (only
// deleted on logout), so it always returned null → []. The real, working
// path is server-backed: the API holds the user's Spotify token and refreshes
// it, exposing GET /users/me/spotify/top-artists. We now go through that
// (see getSpotifyTopArtists in ../spotify) so connected users actually get
// their artists; not-connected users get a 400 which we swallow to [], and
// the callers fall back to /artists/search.

import { getSpotifyTopArtists } from '../spotify';

export interface SpotifyArtist {
  id: string;
  name: string;
  images: { url: string; width: number; height: number }[];
  genres: string[];
  popularity: number;
}

export async function getUserTopArtists(
  limit: number = 50,
  timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term'
): Promise<SpotifyArtist[]> {
  try {
    // Server proxies Spotify's /me/top/artists, returning the raw items
    // (id/name/images/genres/popularity) — the exact SpotifyArtist shape.
    const data = await getSpotifyTopArtists({ limit, time_range: timeRange });
    return Array.isArray(data) ? (data as SpotifyArtist[]) : [];
  } catch {
    // 400 when Spotify isn't connected, or a network error — either way the
    // callers fall back to the /artists/search path.
    return [];
  }
}
