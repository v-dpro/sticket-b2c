import { useCallback, useEffect, useRef, useState } from 'react';

import { searchUsers } from '../lib/api/friends';
import type { UserSearchResult } from '../types/friends';

export function useUserSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const data = await searchUsers(searchQuery.trim(), { limit: 20 });
      setResults(data);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Search failed:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim()) {
      debounceRef.current = setTimeout(() => {
        search(query);
      }, 300);
    } else {
      setResults([]);
      setSearched(false);
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  const updateFollowStatus = (userId: string, isFollowing: boolean) => {
    setResults((prev) => prev.map((user) => (user.id === userId ? { ...user, isFollowing } : user)));
  };

  const clear = () => {
    setQuery('');
    setResults([]);
    setSearched(false);
  };

  return {
    query,
    setQuery,
    results,
    loading,
    searched,
    updateFollowStatus,
    clear,
  };
}




