import { useCallback, useEffect, useMemo, useState } from 'react';

import type { DiscoveryData } from '../types/event';
import { getDiscoveryFeed } from '../lib/api/discovery';
import { useAuthStore } from '../stores/authStore';
import { useSession } from './useSession';

export function useDiscovery() {
  const [data, setData] = useState<DiscoveryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const session = useSession();
  const authCity = useAuthStore((state) => state.user?.city);
  const sessionCity = session.profile?.city;

  const city = useMemo(() => authCity || sessionCity || 'New York', [authCity, sessionCity]);

  const fetchData = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        setError(null);
        const result = await getDiscoveryFeed(city);
        setData(result);
      } catch (err) {
        setError('Failed to load discovery feed');
        // Include baseURL when available (Axios puts it on err.config.baseURL)
        const anyErr = err as any;
        const baseURL = anyErr?.config?.baseURL;
        const url = anyErr?.config?.url;
        console.error('[discover] failed', { baseURL, url, err });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [city]
  );

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const refresh = useCallback(() => {
    void fetchData(true);
  }, [fetchData]);

  return { data, loading, refreshing, error, refresh, city };
}





