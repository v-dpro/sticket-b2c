import { useEffect, useState } from 'react';

import { getUserTopArtists, type SpotifyArtist } from '../lib/api/spotify';

export function useSpotifyArtists() {
  const [artists, setArtists] = useState<SpotifyArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const top = await getUserTopArtists(50, 'medium_term');
        if (!cancelled) setArtists(top);
      } catch (e) {
        if (!cancelled) setError('Failed to load Spotify artists');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { artists, loading, error };
}




