import { useCallback, useEffect, useState } from 'react';

import { getSetlist } from '../lib/api/events';

export function useSetlist(eventId: string) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchSetlist = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const res = await getSetlist(eventId);
      setData(res);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to load setlist:', err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void fetchSetlist();
  }, [fetchSetlist]);

  return { data, loading, refresh: fetchSetlist };
}



