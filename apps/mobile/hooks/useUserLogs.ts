import { useCallback, useEffect, useMemo, useState } from 'react';

import { getUserLogs } from '../lib/api/profile';
import { listLogsForUser } from '../lib/local/repo/logsRepo';
import type { LogEntry } from '../types/profile';

function toLogEntry(local: any): LogEntry {
  return {
    id: local.id,
    rating: typeof local.rating === 'number' ? local.rating : undefined,
    note: typeof local.note === 'string' ? local.note : undefined,
    section: typeof local.section === 'string' ? local.section : undefined,
    row: typeof local.row === 'string' ? local.row : undefined,
    seat: typeof local.seat === 'string' ? local.seat : undefined,
    visibility: 'PUBLIC',
    createdAt: local.createdAt || new Date().toISOString(),
    event: {
      id: local.event.id,
      name: local.event.name,
      date: local.event.date,
      artist: {
        id: local.event.artist.id,
        name: local.event.artist.name,
        imageUrl: local.event.artist.imageUrl ?? undefined,
      },
      venue: {
        id: local.event.venue.id,
        name: local.event.venue.name,
        city: local.event.venue.city,
        state: local.event.venue.state ?? undefined,
        lat: undefined,
        lng: undefined,
      },
    },
    photos: [],
    _count: undefined,
  };
}

export function useUserLogs(userId: string, year?: number) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const LIMIT = 20;

  const fetchLogs = useCallback(
    async (reset = false) => {
      if (!userId) {
        setLogs([]);
        setHasMore(false);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const newOffset = reset ? 0 : offset;
        // Local-only users do not exist in the API DB; read logs from local DB instead.
        let data: LogEntry[];
        if (userId.startsWith('user_')) {
          const all = await listLogsForUser(userId);
          const filtered = typeof year === 'number' ? all.filter((l) => new Date(l.event.date).getFullYear() === year) : all;
          data = filtered.slice(newOffset, newOffset + LIMIT).map(toLogEntry);
        } else {
          data = await getUserLogs(userId, {
            limit: LIMIT,
            offset: newOffset,
            year,
          });
        }

        if (reset) {
          setLogs(data);
          setOffset(LIMIT);
        } else {
          setLogs((prev) => [...prev, ...data]);
          setOffset((prev) => prev + LIMIT);
        }

        setHasMore(data.length === LIMIT);
      } catch (err: any) {
        const status = err?.response?.status;
        // For "user not found" (common when viewing a local-only id against the API),
        // treat as empty logs so the UI doesn't hang.
        if (status === 404) {
          if (reset) {
            setLogs([]);
            setOffset(0);
          }
          setHasMore(false);
          setError(null);
        } else {
          setError(err?.response?.data?.error || 'Failed to load logs');
        }
      } finally {
        setLoading(false);
      }
    },
    [userId, year, offset]
  );

  // Initial fetch and when year changes
  useEffect(() => {
    setOffset(0);
    if (!userId) {
      setLogs([]);
      setHasMore(false);
      setError(null);
      setLoading(false);
      return;
    }
    void fetchLogs(true);
  }, [userId, year, fetchLogs]);

  const loadMore = () => {
    if (!loading && hasMore) {
      void fetchLogs(false);
    }
  };

  const refresh = () => {
    setOffset(0);
    void fetchLogs(true);
  };

  // Get unique years from logs for filter
  const years = useMemo(
    () =>
      [...new Set(logs.map((log) => new Date(log.event.date).getFullYear()))].sort((a, b) => b - a),
    [logs]
  );

  return {
    logs,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    years,
  };
}




