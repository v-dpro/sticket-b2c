import { useCallback, useEffect, useState } from 'react';

import { addComment, getLogDetail, getLogComments, markWasThere, removeWasThere } from '../lib/api/feed';
import type { FeedComment, LogDetail } from '../types/feed';

export function useLogDetail(logId: string) {
  const [data, setData] = useState<LogDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async (refresh = false) => {
    if (!logId) return;

    if (refresh) setRefreshing(true);
    else setLoading(true);

    setError(null);

    try {
      const detail = await getLogDetail(logId);
      setData(detail);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load log');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [logId]);

  useEffect(() => {
    void fetchDetail();
  }, [fetchDetail]);

  const fetchComments = useCallback(
    async (options?: { limit?: number; offset?: number }) => {
      if (!logId) return [] as FeedComment[];
      return await getLogComments(logId, options);
    },
    [logId]
  );

  const submitComment = useCallback(
    async (text: string) => {
      if (!logId) return null;
      const comment = await addComment(logId, text);
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          commentCount: prev.commentCount + 1,
          comments: [...prev.comments, comment].slice(-2),
          allComments: [...(prev.allComments ?? []), comment],
        };
      });
      return comment;
    },
    [logId]
  );

  const toggleWasThere = useCallback(
    async (current: boolean) => {
      if (!logId) return false;
      try {
        if (current) await removeWasThere(logId);
        else await markWasThere(logId);

        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            userWasThere: !current,
            wasThereCount: Math.max(0, prev.wasThereCount + (current ? -1 : 1)),
          };
        });

        return true;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to toggle was there:', err);
        return false;
      }
    },
    [logId]
  );

  return {
    data,
    loading,
    refreshing,
    error,
    refresh: () => fetchDetail(true),
    fetchComments,
    submitComment,
    toggleWasThere,
  };
}



