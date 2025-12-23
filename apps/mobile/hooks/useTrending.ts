import { useCallback, useEffect, useState } from 'react';

import { getTrending } from '../lib/api/search';
import type { TrendingData } from '../types/search';

export function useTrending() {
  const [trending, setTrending] = useState<TrendingData>({ artists: [], searches: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getTrending();
      setTrending(data);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch trending:', err);
      setError(err?.message || 'Failed to load trending');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return {
    trending,
    loading,
    error,
    refresh: fetch,
  };
}



