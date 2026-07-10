import { useCallback, useEffect, useMemo, useState } from 'react';

import { getUserLogs } from '../lib/api/profile';
import type { LogEntry } from '../types/profile';
import { getErrorMessage } from '../lib/api/errorUtils';

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
        const data = await getUserLogs(userId, {
          limit: LIMIT,
          offset: newOffset,
          year,
        });

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
        // For "user not found", treat as empty logs so the UI doesn't hang.
        if (status === 404) {
          if (reset) {
            setLogs([]);
            setOffset(0);
          }
          setHasMore(false);
          setError(null);
        } else {
          setError(getErrorMessage(err));
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
