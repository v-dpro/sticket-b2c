import { useCallback, useEffect, useRef, useState } from 'react';
import { getVenueShows } from '../lib/api/venues';
import type { VenueShow } from '../types/venue';

export function useVenueShows(venueId: string, upcoming: boolean) {
  const [shows, setShows] = useState<VenueShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  const offsetRef = useRef(0);
  const LIMIT = 20;

  const fetchShows = useCallback(
    async (reset = false) => {
      if (!venueId) return;

      setLoading(true);

      try {
        const currentOffset = reset ? 0 : offsetRef.current;
        const data = await getVenueShows(venueId, {
          upcoming,
          limit: LIMIT,
          offset: currentOffset,
        });

        if (reset) setShows(data);
        else setShows((prev) => [...prev, ...data]);

        const nextOffset = currentOffset + data.length;
        offsetRef.current = nextOffset;
        setHasMore(data.length === LIMIT);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to load venue shows:', err);
      } finally {
        setLoading(false);
      }
    },
    [venueId, upcoming]
  );

  useEffect(() => {
    offsetRef.current = 0;
    fetchShows(true);
  }, [venueId, upcoming, fetchShows]);

  const loadMore = () => {
    if (!loading && hasMore) fetchShows(false);
  };

  return {
    shows,
    loading,
    hasMore,
    loadMore,
    refresh: () => fetchShows(true),
  };
}



