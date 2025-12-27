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
    // IMPORTANT: If user exists, never set requiresAuth to true
    // requiresAuth should only be true when there's no user at all
    setRequiresAuth(!user);

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

    // User exists - log for debugging (only in dev)
    if (__DEV__) {
      const tokenCheck = await SecureStore.getItemAsync('access_token') ?? await SecureStore.getItemAsync('auth_token');
      console.log('[useFeed] User exists:', user.id, 'Token exists:', !!tokenCheck);
    }

    // User exists, check for token
    const hasToken = await SecureStore.getItemAsync('access_token') ?? await SecureStore.getItemAsync('auth_token');
    if (!hasToken) {
      // User exists in local DB but no API token
      // Check if this is a local-only user (ID starts with "user_")
      const isLocalOnlyUser = user.id.startsWith('user_');
      if (isLocalOnlyUser) {
        // Local-only user - friends feed requires API account
        setItems([]);
        setHasMore(false);
        setNextCursor(null);
        setHasNoFriends(false);
        setRequiresAuth(false); // Don't show "sign in" - user IS signed in
        setError('Friends feed requires an online account. Please sign in with your email and password to connect to the server.');
        setLoading(false);
        setRefreshing(false);
        return;
      } else {
        // API user but token missing - might have expired or been cleared
        // Try to refresh session or show helpful message
        setItems([]);
        setHasMore(false);
        setNextCursor(null);
        setHasNoFriends(false);
        setRequiresAuth(false); // Don't show "sign in" - user IS signed in
        setError('Your session expired. Please sign in again to refresh your connection.');
        setLoading(false);
        setRefreshing(false);
        return;
      }
    }

    // User exists and has token, try to fetch feed
    try {
      // Token exists, try to fetch feed
      // The token refresh interceptor will handle 401s automatically
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
        // 401 after token refresh attempt failed - check if we still have a user
        // If user exists, it's a token issue, not an auth issue
        const stillHasToken = await SecureStore.getItemAsync('access_token') ?? await SecureStore.getItemAsync('auth_token');
        if (user) {
          // User exists - don't show "sign in", show helpful error
          setRequiresAuth(false);
          if (stillHasToken) {
            setError('Unable to load feed. Your session may have expired. Please try again.');
          } else {
            setError('Your session expired. Please sign in again to refresh your connection.');
          }
        } else {
          // No user - they need to sign in
          setRequiresAuth(true);
          setError('Sign in to view your friends feed.');
        }
      } else {
        // Other errors (network, server, etc.)
        setError(getErrorMessage(err));
        // Only set requiresAuth if there's no user
        setRequiresAuth(!user);
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



