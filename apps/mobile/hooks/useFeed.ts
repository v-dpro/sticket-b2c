import { useCallback, useEffect, useRef, useState } from 'react';

import { getFeed } from '../lib/api/feed';
import * as SecureStore from '../lib/storage/secureStore';
import type { FeedComment, FeedItem } from '../types/feed';
import { getErrorMessage } from '../lib/api/errorUtils';
import { useSession } from './useSession';

const LIMIT = 20;

async function hasApiToken(): Promise<boolean> {
  const token =
    (await SecureStore.getItemAsync('access_token')) ??
    (await SecureStore.getItemAsync('auth_token'));
  return Boolean(token);
}

export function useFeed() {
  const { user, isLoading: sessionLoading } = useSession();

  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [hasNoFriends, setHasNoFriends] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresAuth, setRequiresAuth] = useState(false);

  const fetchIdRef = useRef(0);

  const fetchFeed = useCallback(
    async (isRefresh = false) => {
      if (sessionLoading) return;

      const id = ++fetchIdRef.current;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      if (!user) {
        setItems([]);
        setHasMore(false);
        setNextCursor(null);
        setHasNoFriends(false);
        setRequiresAuth(true);
        setError('Sign in to view your friends feed.');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setRequiresAuth(false);

      const tokenExists = await hasApiToken();
      if (!tokenExists) {
        const isLocal = user.id.startsWith('user_');
        setItems([]);
        setHasMore(false);
        setNextCursor(null);
        setHasNoFriends(false);
        setError(
          isLocal
            ? 'Friends feed requires an online account. Sign in with email and password to connect.'
            : 'Your session expired. Please sign in again.',
        );
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        const data = await getFeed({ limit: LIMIT });
        if (id !== fetchIdRef.current) return;
        setItems(data.items ?? []);
        setNextCursor(data.nextCursor ?? null);
        setHasMore(Boolean(data.nextCursor));
        setHasNoFriends(Boolean(data.hasNoFriends));
        setError(null);
      } catch (err: any) {
        if (id !== fetchIdRef.current) return;
        setError(getErrorMessage(err));
      } finally {
        if (id === fetchIdRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [user, sessionLoading],
  );

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !nextCursor) return;
    if (!(await hasApiToken())) return;

    setLoadingMore(true);
    try {
      const data = await getFeed({ limit: LIMIT, before: nextCursor });
      setItems((prev) => [...prev, ...(data.items ?? [])]);
      setNextCursor(data.nextCursor ?? null);
      setHasMore(Boolean(data.nextCursor));
    } catch {
      // silent — user can pull-to-refresh
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, nextCursor]);

  useEffect(() => {
    void fetchFeed();
  }, [fetchFeed]);

  const updateItem = useCallback((logId: string, updates: Partial<FeedItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.log.id === logId ? { ...item, ...updates } : item)),
    );
  }, []);

  const addCommentToItem = useCallback((logId: string, comment: FeedComment) => {
    setItems((prev) =>
      prev.map((item) =>
        item.log.id === logId
          ? {
              ...item,
              commentCount: item.commentCount + 1,
              comments: [...item.comments, comment].slice(-2),
            }
          : item,
      ),
    );
  }, []);

  return {
    items,
    loading,
    refreshing,
    loadingMore,
    hasMore,
    hasNoFriends,
    error,
    requiresAuth,
    refresh: () => fetchFeed(true),
    loadMore,
    updateItem,
    addCommentToItem,
  };
}
