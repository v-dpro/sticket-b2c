import { useCallback, useEffect, useState } from 'react';

import { apiClient } from '../lib/api/client';

interface MyArtistsData {
  topTier: any[];
  following: any[];
  casual: any[];
  bucketList: any[];
  withPresales: any[];
  totalArtists: number;
  totalSeen: number;
}

export function useMyArtists() {
  const [data, setData] = useState<MyArtistsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await apiClient.get('/users/me/artists');
      setData(response.data);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load artists');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const refresh = useCallback(() => {
    void fetchData(true);
  }, [fetchData]);

  const updateTier = useCallback(
    async (artistId: string, tier: string) => {
      await apiClient.patch(`/users/me/artists/${artistId}/tier`, { tier });
      void fetchData(true);
    },
    [fetchData]
  );

  return {
    data,
    loading,
    refreshing,
    error,
    refresh,
    updateTier,
  };
}


