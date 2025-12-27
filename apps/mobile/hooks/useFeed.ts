import { useCallback, useEffect, useState } from 'react';

import { getFeed } from '../lib/api/feed';
import * as SecureStore from '../lib/storage/secureStore';
import type { FeedComment, FeedItem } from '../types/feed';
import { getErrorMessage } from '../lib/api/errorUtils';
import { useSession } from './useSession';

export function useFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const [hasNoFriends, setHasNoFriends] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresAuth, setRequiresAuth] = useState(false);

  // Check if we have a valid session
  const { user, loading: sessionLoading } = useSession();

  const LIMIT = 20;

  const hasToken = useCallback(async () => {
    const token = (await SecureStore.getItemAsync('access_token')) ?? (await SecureStore.getItemAsync('auth_token'));
    return Boolean(token);
  }, []);

  const fetchFeed = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    setError(null);
    setRequiresAuth(false);

    // Wait for session to finish loading before making decisions
    if (sessionLoading) {
      // Still loading, wait
      setLoading(false);
      setRefreshing(false);
      return;
    }

    // If no user after loading is complete, show auth required
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

    // User exists, try to fetch feed
    try {
      // Check for token, but don't fail if it's missing - let the API call handle it
      // The API will return 401 if token is invalid/missing, and we'll handle that
      const data = await getFeed({ limit: LIMIT });
      setItems(data.items ?? []);
      setNextCursor(data.nextCursor);
      setHasMore(Boolean(data.nextCursor));
      setHasNoFriends(Boolean(data.hasNoFriends));
      setRequiresAuth(false);
      setError(null);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401) {
        // Token expired or invalid - user needs to sign in again
        setRequiresAuth(true);
        setError('Your session expired. Please sign in again.');
      } else {
        // Other errors (network, server, etc.)
        setError(getErrorMessage(err));
        setRequiresAuth(false);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, sessionLoading]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !nextCursor) return;
    if (!(await hasToken())) return;

    setLoadingMore(true);
    try {
      const data = await getFeed({ limit: LIMIT, before: nextCursor });
      setItems((prev) => [...prev, ...(data.items ?? [])]);
      setNextCursor(data.nextCursor);
      setHasMore(Boolean(data.nextCursor));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to load more:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, hasToken, loadingMore, nextCursor]);

  useEffect(() => {
    void fetchFeed();
  }, [fetchFeed]);

  const updateItem = (logId: string, updates: Partial<FeedItem>) => {
    setItems((prev) => prev.map((item) => (item.log.id === logId ? { ...item, ...updates } : item)));
  };

  const addCommentToItem = (logId: string, comment: FeedComment) => {
    setItems((prev) =>
      prev.map((item) =>
        item.log.id === logId
          ? {
              ...item,
              commentCount: item.commentCount + 1,
              comments: [...item.comments, comment].slice(-2),
            }
          : item
      )
    );
  };

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



