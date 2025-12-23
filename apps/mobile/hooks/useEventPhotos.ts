import { useCallback, useEffect, useState } from 'react';

import { getEventPhotos } from '../lib/api/events';
import type { EventPhoto } from '../types/event';

export function useEventPhotos(eventId: string) {
  const [photos, setPhotos] = useState<EventPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const LIMIT = 20;

  const fetchPhotos = useCallback(
    async (reset = false) => {
      if (!eventId) return;

      setLoading(true);

      try {
        const newOffset = reset ? 0 : offset;
        const data = await getEventPhotos(eventId, { limit: LIMIT, offset: newOffset });

        if (reset) {
          setPhotos(data);
          setOffset(LIMIT);
        } else {
          setPhotos((prev) => [...prev, ...data]);
          setOffset((prev) => prev + LIMIT);
        }

        setHasMore(data.length === LIMIT);
      } catch (err) {
        // Avoid redbox spam in dev for common "API offline" scenarios.
        // eslint-disable-next-line no-console
        console.warn('Failed to load photos:', err);
      } finally {
        setLoading(false);
      }
    },
    [eventId, offset]
  );

  useEffect(() => {
    void fetchPhotos(true);
  }, [eventId]);

  const loadMore = () => {
    if (!loading && hasMore) {
      void fetchPhotos(false);
    }
  };

  return {
    photos,
    loading,
    hasMore,
    loadMore,
    refresh: () => fetchPhotos(true),
  };
}




