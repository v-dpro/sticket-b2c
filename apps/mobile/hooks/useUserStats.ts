import { useCallback, useEffect, useState } from 'react';

import { getUserStats } from '../lib/api/profile';
import type { ProfileStats } from '../types/profile';

export function useUserStats(userId: string) {
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getUserStats(userId);
      setStats(data);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}




