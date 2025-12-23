import { useEffect, useState } from 'react';

import type { Event } from '../types/event';
import { getFriendsGoingShows } from '../lib/api/discovery';

export function useFriendsActivity(limit: number = 20) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getFriendsGoingShows(limit);
        if (!cancelled) setEvents(result);
      } catch (e) {
        if (!cancelled) setError("Failed to load friends' activity");
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




