import { useCallback, useEffect, useRef, useState } from 'react';
import { getArtistShows } from '../lib/api/artists';
import type { ArtistShow } from '../types/artist';

export function useArtistShows(artistId: string, upcoming: boolean = false) {
  const [shows, setShows] = useState<ArtistShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  const offsetRef = useRef(0);
  const LIMIT = 20;

  const fetchShows = useCallback(
    async (reset = false) => {
      if (!artistId) return;

      setLoading(true);
      try {
        const currentOffset = reset ? 0 : offsetRef.current;

        const data = await getArtistShows(artistId, {
          upcoming,
          limit: LIMIT,
          offset: currentOffset,
        });

        if (reset) setShows(data);
        else setShows((prev) => [...prev, ...data]);

        offsetRef.current = currentOffset + data.length;
        setHasMore(data.length === LIMIT);
      } catch (err) {
        console.error('Failed to load shows:', err);
      } finally {
        setLoading(false);
      }
    },
    [artistId, upcoming]
  );

  useEffect(() => {
    offsetRef.current = 0;
    fetchShows(true);
  }, [fetchShows]);

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchShows(false);
    }
  };

  const updateInterested = (showId: string, isInterested: boolean) => {
    setShows((prev) => prev.map((show) => (show.id === showId ? { ...show, isInterested } : show)));
  };

  return {
    shows,
    loading,
    hasMore,
    loadMore,
    refresh: () => fetchShows(true),
    updateInterested,
  };
}



