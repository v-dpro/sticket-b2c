import { useCallback, useEffect, useState } from 'react';

import { getBadgeProgress } from '../lib/api/badges';
import type { BadgeProgress } from '../types/badge';

export function useBadgeProgress() {
  const [progress, setProgress] = useState<BadgeProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBadgeProgress();
      setProgress(data);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to load badge progress');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return { progress, loading, error, refresh: fetch };
}



