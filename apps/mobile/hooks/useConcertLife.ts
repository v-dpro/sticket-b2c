import { useCallback, useEffect, useState } from 'react';

import { apiClient } from '../lib/api/client';
import * as SecureStore from '../lib/storage/secureStore';
import { listLogsForUser } from '../lib/local/repo/logsRepo';
import { listTicketsForUser } from '../lib/local/repo/ticketsRepo';
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

function startOfTodayLocal() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
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
        const token =
          (await SecureStore.getItemAsync('access_token')) ?? (await SecureStore.getItemAsync('auth_token'));

        const isLocalOnlyUser = Boolean(user?.id && user.id.startsWith('user_'));
        const shouldUseLocal = !token || isLocalOnlyUser;

        if (shouldUseLocal) {
          if (!user?.id) {
            setData(null);
            setError('Authentication required');
            return;
          }

          const startOfToday = startOfTodayLocal();
          const allLogs = await listLogsForUser(user.id);
          const logs =
            typeof year === 'number'
              ? allLogs.filter((l) => new Date(l.event.date).getFullYear() === year)
              : allLogs;

          const allTickets = await listTicketsForUser(user.id);
          const tickets =
            typeof year === 'number'
              ? allTickets.filter((t) => new Date(t.event.date).getFullYear() === year)
              : allTickets;

          const upcomingLogs = logs
            .filter((l) => new Date(l.event.date).getTime() >= startOfToday.getTime())
            .map((l) => ({
              type: 'log' as const,
              id: l.id,
              date: new Date(l.event.date).toISOString(),
              event: l.event,
              rating: typeof l.rating === 'number' ? l.rating : null,
              note: l.note ?? null,
              photos: [],
              commentCount: 0,
              wasThereCount: 0,
            }));

          const pastLogs = logs
            .filter((l) => new Date(l.event.date).getTime() < startOfToday.getTime())
            .map((l) => ({
              type: 'log' as const,
              id: l.id,
              date: new Date(l.event.date).toISOString(),
              event: l.event,
              rating: typeof l.rating === 'number' ? l.rating : null,
              note: l.note ?? null,
              photos: [],
              commentCount: 0,
              wasThereCount: 0,
            }));

          const upcomingTickets = tickets
            .filter((t) => new Date(t.event.date).getTime() >= startOfToday.getTime())
            .map((t) => ({
              type: 'ticket' as const,
              id: t.id,
              date: new Date(t.event.date).toISOString(),
              event: t.event,
              section: t.section ?? null,
              row: t.row ?? null,
              seat: t.seat ?? null,
              status: t.status,
            }));

          const allDates = [
            ...logs.map((l) => new Date(l.event.date)),
            ...tickets.map((t) => new Date(t.event.date)),
          ];
          const years = [...new Set(allDates.map((d) => d.getFullYear()))].sort((a, b) => b - a);

          setData({
            upcomingLogs,
            pastLogs,
            upcomingTickets,
            tracking: [],
            presaleAlerts: [],
            years,
            stats: {
              totalShows: logs.length,
              upcomingCount: upcomingTickets.length,
              trackingCount: 0,
            },
          });
          setError(null);
          return;
        }

        const params = year ? { year: year.toString() } : {};
        const response = await apiClient.get('/users/me/concert-life', { params });
        setData(response.data);
        setError(null);
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Failed to load concert life');
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


