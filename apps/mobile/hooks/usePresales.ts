import { useCallback, useEffect, useMemo, useState } from 'react';

import { apiClient } from '../lib/api/client';

export type PresaleItem = {
  id: string;
  artistName: string;
  tourName: string | null;
  venueName: string;
  venueCity: string;
  venueState: string | null;
  eventDate: string;
  presaleType: string;
  presaleStart: string;
  presaleEnd: string | null;
  onsaleStart?: string | null;
  code: string | null;
  signupUrl: string | null;
  signupDeadline: string | null;
  ticketUrl?: string | null;
  source?: string;
  notes?: string | null;
  hasAlert?: boolean;
  isFollowed?: boolean;
};

export function usePresales() {
  const [presales, setPresales] = useState<PresaleItem[]>([]);
  const [myAlerts, setMyAlerts] = useState<PresaleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    const [presalesResp, alertsResp] = await Promise.allSettled([
      apiClient.get('/presales', { params: { limit: 100 } }),
      apiClient.get('/presales/my-alerts'),
    ]);

    if (presalesResp.status === 'fulfilled') {
      setPresales(presalesResp.value.data ?? []);
    } else {
      // Log error but don't crash - gracefully handle API failures
      if (__DEV__) {
        console.warn('[usePresales] Failed to fetch presales:', presalesResp.reason?.message);
      }
      setPresales([]);
    }

    if (alertsResp.status === 'fulfilled') {
      setMyAlerts(alertsResp.value.data ?? []);
    } else {
      // Log error but don't crash
      if (__DEV__) {
        console.warn('[usePresales] Failed to fetch alerts:', alertsResp.reason?.message);
      }
      setMyAlerts([]);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchAll()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [fetchAll]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchAll();
    } finally {
      setRefreshing(false);
    }
  }, [fetchAll]);

  const myArtistPresales = useMemo(() => presales.filter((p) => p.isFollowed), [presales]);

  const toggleAlert = useCallback(
    async (presaleId: string, currentlyHasAlert: boolean | undefined) => {
      // Optimistic update in the main list
      setPresales((prev) => prev.map((p) => (p.id === presaleId ? { ...p, hasAlert: !currentlyHasAlert } : p)));

      try {
        if (currentlyHasAlert) {
          await apiClient.delete(`/presales/${presaleId}/alert`);
        } else {
          await apiClient.post(`/presales/${presaleId}/alert`, {});
        }
      } catch {
        // Rollback
        setPresales((prev) => prev.map((p) => (p.id === presaleId ? { ...p, hasAlert: currentlyHasAlert } : p)));
        throw new Error('Failed to update alert');
      }

      // Refresh alerts list (best effort)
      void apiClient
        .get('/presales/my-alerts')
        .then((r) => setMyAlerts(r.data ?? []))
        .catch(() => undefined);
    },
    []
  );

  return {
    presales,
    myArtistPresales,
    myAlerts,
    loading,
    refreshing,
    refresh,
    toggleAlert,
  };
}



