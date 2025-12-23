import { useCallback, useEffect, useState } from 'react';

import { apiClient } from '../lib/api/client';
import type { FeedComment, FeedItem } from '../types/feed';

export function usePublicFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);

  const LIMIT = 20;

  const fetchItems = useCallback(
    async (reset = false) => {
      if (reset) setRefreshing(true);
      else if (offset === 0) setLoading(true);
      else setLoadingMore(true);

      try {
        const newOffset = reset ? 0 : offset;
        const response = await apiClient.get('/feed/public', {
          params: { limit: LIMIT, offset: newOffset },
        });

        const newItems = response.data as FeedItem[];

        if (reset) {
          setItems(newItems);
          setOffset(LIMIT);
        } else {
          setItems((prev) => [...prev, ...newItems]);
          setOffset((prev) => prev + LIMIT);
        }

        setHasMore(newItems.length === LIMIT);
        setError(null);
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Failed to load feed');
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [offset]
  );

  useEffect(() => {
    void fetchItems(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = useCallback(() => {
    setOffset(0);
    void fetchItems(true);
  }, [fetchItems]);

  const loadMore = useCallback(() => {
    if (!loading && !loadingMore && hasMore) void fetchItems(false);
  }, [loading, loadingMore, hasMore, fetchItems]);

  const updateItem = useCallback((logId: string, updates: Partial<FeedItem>) => {
    setItems((prev) => prev.map((item) => (item.log.id === logId ? { ...item, ...updates } : item)));
  }, []);

  const addCommentToItem = useCallback((logId: string, comment: FeedComment) => {
    setItems((prev) =>
      prev.map((item) =>
        item.log.id === logId
          ? {
              ...item,
              commentCount: (item.commentCount || 0) + 1,
              comments: [...(item.comments || []), comment].slice(-3),
            }
          : item
      )
    );
  }, []);

  return {
    items,
    loading,
    refreshing,
    loadingMore,
    hasMore,
    hasNoFriends: false,
    error,
    requiresAuth: false,
    refresh,
    loadMore,
    updateItem,
    addCommentToItem,
  };
}


