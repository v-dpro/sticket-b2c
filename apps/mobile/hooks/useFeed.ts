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
  const [hasCheckedTokens, setHasCheckedTokens] = useState(false);

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
    
    // If we've already checked and determined user is local-only with no tokens, don't check again
    // (unless refreshing)
    if (!refresh && hasCheckedTokens && !user) {
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

    // User exists, check for token
    // IMPORTANT: Check for refresh token too - if refresh token exists, we can refresh the access token
    const accessToken = await SecureStore.getItemAsync('access_token') ?? await SecureStore.getItemAsync('auth_token');
    const refreshToken = await SecureStore.getItemAsync('refresh_token');
    const hasToken = Boolean(accessToken) || Boolean(refreshToken);
    
    // Enhanced logging for debugging (only in dev, and only log once per unique state)
    if (__DEV__) {
      const logKey = `${user.id}_${!!accessToken}_${!!refreshToken}`;
      const lastLogKey = (globalThis as any).__useFeedLastLogKey;
      if (lastLogKey !== logKey) {
        (globalThis as any).__useFeedLastLogKey = logKey;
        console.log('[useFeed] User state:', {
          userId: user.id,
          isLocalOnly: user.id.startsWith('user_'),
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          hasToken: hasToken,
          accessTokenLength: accessToken?.length || 0,
          refreshTokenLength: refreshToken?.length || 0,
        });
      }
    }
    
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
        setHasCheckedTokens(true);
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
        setHasCheckedTokens(true);
        setLoading(false);
        setRefreshing(false);
        return;
      }
    }
    
    // If we have a refresh token but no access token, try to refresh it first
    if (refreshToken && !accessToken) {
      if (__DEV__) {
        console.log('[useFeed] Attempting to refresh access token using refresh token');
      }
      try {
        const { apiClient } = await import('../lib/api/client');
        const response = await apiClient.post('/auth/refresh', { refreshToken });
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;
        if (newAccessToken) {
          await SecureStore.setItemAsync('access_token', newAccessToken);
          await SecureStore.setItemAsync('auth_token', newAccessToken);
          if (newRefreshToken) {
            await SecureStore.setItemAsync('refresh_token', newRefreshToken);
          }
          if (__DEV__) {
            console.log('[useFeed] Successfully refreshed access token');
          }
        }
      } catch (refreshError: any) {
        if (__DEV__) {
          console.error('[useFeed] Token refresh failed:', {
            error: refreshError?.message,
            status: refreshError?.response?.status,
            data: refreshError?.response?.data,
          });
        }
        // Refresh failed - tokens are invalid, clear them
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
        await SecureStore.deleteItemAsync('auth_token');
        setItems([]);
        setHasMore(false);
        setNextCursor(null);
        setHasNoFriends(false);
        setRequiresAuth(false);
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
      if (__DEV__) {
        console.log('[useFeed] Feed fetched successfully:', {
          itemCount: data.items?.length || 0,
          hasNextCursor: !!data.nextCursor,
          hasNoFriends: data.hasNoFriends,
        });
      }
      setItems(data.items ?? []);
      setNextCursor(data.nextCursor);
      setHasMore(Boolean(data.nextCursor));
      setHasNoFriends(Boolean(data.hasNoFriends));
      setRequiresAuth(false);
      setError(null);
    } catch (err: any) {
      if (__DEV__) {
        console.error('[useFeed] Feed fetch failed:', {
          error: err?.message,
          status: err?.response?.status,
          statusText: err?.response?.statusText,
          data: err?.response?.data,
          url: err?.config?.url,
        });
      }
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



