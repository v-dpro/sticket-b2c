import { useEffect, useState } from 'react';

import type { Event } from '../types/event';
import { getComingUpShows } from '../lib/api/discovery';

export function useUpcomingShows(limit: number = 20) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getComingUpShows(limit);
        if (!cancelled) setEvents(result);
      } catch (e) {
        if (!cancelled) setError('Failed to load upcoming shows');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [limit]);

  return { events, loading, error };
}




