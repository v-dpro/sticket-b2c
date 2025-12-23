import { useCallback, useEffect, useState } from 'react';

import { getSuggestions } from '../lib/api/friends';
import type { FriendSuggestion } from '../types/friends';

export function useSuggestions() {
  const [suggestions, setSuggestions] = useState<FriendSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getSuggestions({ limit: 20 });
      setSuggestions(data);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Failed to load suggestions:', err);
      setError(err?.message || 'Failed to load suggestions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const updateFollowStatus = (userId: string, isFollowing: boolean) => {
    setSuggestions((prev) => prev.map((user) => (user.id === userId ? { ...user, isFollowing } : user)));
  };

  const dismiss = (userId: string) => {
    setSuggestions((prev) => prev.filter((user) => user.id !== userId));
  };

  return {
    suggestions,
    loading,
    error,
    refresh: fetch,
    updateFollowStatus,
    dismiss,
  };
}




