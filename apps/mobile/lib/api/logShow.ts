import { apiClient } from './client';

export type SearchArtist = {
  id: string;
  name: string;
  imageUrl: string | null;
  genres: string[];
  spotifyId: string | null;
  source?: string;
};

export type SearchEvent = {
  id: string;
  externalId?: string;
  source: string;
  name: string;
  date: string;
  artist: {
    id: string;
    name: string;
    imageUrl: string | null;
    spotifyId?: string | null;
  };
  venue: {
    id: string;
    name: string;
    city: string;
    state: string | null;
    country: string;
  };
  ticketUrl?: string | null;
  lineup?: string[];
};

/**
 * Search for artists via Spotify
 */
export async function searchArtistsSpotify(query: string): Promise<SearchArtist[]> {
  if (!query || query.length < 2) return [];

  try {
    const res = await apiClient.get('/artists/search/spotify', {
      params: { q: query, limit: 15 },
    });
    return res.data ?? [];
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Artist search error:', error);
    return [];
  }
}

/**
 * Search for artists in database (fallback)
 */
export async function searchArtistsDB(query: string): Promise<SearchArtist[]> {
  if (!query || query.length < 2) return [];

  try {
    const res = await apiClient.get('/artists/search', {
      params: { q: query, limit: 15 },
    });
    return res.data ?? [];
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Artist DB search error:', error);
    return [];
  }
}

/**
 * Get events for an artist from Bandsintown
 */
export async function getArtistEventsBandsintown(artistId: string, includePast: boolean = true): Promise<SearchEvent[]> {
  try {
    const res = await apiClient.get(`/artists/${artistId}/events/bandsintown`, {
      params: { includePast: String(includePast) },
    });
    return res.data ?? [];
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Bandsintown events error:', error);
    return [];
  }
}

/**
 * Search the app's OWN catalog (real Ticketmaster/Bandsintown DB events) by
 * artist or event name. This is the primary source for logging — the same real
 * shows surfaced across the app — with the external APIs as fallback.
 */
export async function searchEventsDB(query: string): Promise<SearchEvent[]> {
  if (!query || query.length < 2) return [];
  try {
    // import=1 → the server first pulls this artist's full current tour from TM
    // live (all cities) and upserts it, so the log flow isn't limited to the
    // few markets the background cron happened to cover.
    const res = await apiClient.get('/events/search', { params: { q: query, limit: 25, import: 1 } });
    return res.data ?? [];
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('DB event search error:', error);
    return [];
  }
}

/**
 * Search events by artist name directly (no artist ID needed)
 */
export async function searchEventsByArtist(artistName: string, includePast: boolean = true): Promise<SearchEvent[]> {
  if (!artistName || artistName.length < 2) return [];

  try {
    const res = await apiClient.get('/events/search/bandsintown', {
      params: { artist: artistName, includePast: String(includePast) },
    });
    return res.data ?? [];
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Event search error:', error);
    return [];
  }
}



