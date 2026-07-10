import { useCallback, useEffect, useState } from 'react';

import { apiClient } from '../lib/api/client';
import { getErrorMessage } from '../lib/api/errorUtils';
import { useSession } from './useSession';

interface ConcertLifeData {
  pastLogs: any[];
  upcomingLogs?: any[];
  upcomingTickets: any[];
  tracking: any[];
  presaleAlerts: any[];
  years: number[];
  stats: {
    totalShows: number;
    upcomingCount: number;
    trackingCount: number;
  };
}

export function useConcertLife(year?: number) {
  const { user } = useSession();
  const [data, setData] = useState<ConcertLifeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        if (!user?.id) {
          setData(null);
          setError('Authentication required');
          return;
        }

        const params = year ? { year: year.toString() } : {};
        const response = await apiClient.get('/users/me/concert-life', { params });
        setData(response.data);
        setError(null);
      } catch (err: any) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [year, user?.id]
  );

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const refresh = useCallback(() => {
    void fetchData(true);
  }, [fetchData]);

  return {
    data,
    loading,
    refreshing,
    error,
    refresh,
  };
}
