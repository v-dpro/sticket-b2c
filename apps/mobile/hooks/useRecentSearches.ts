import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { RecentSearch } from '../types/search';

const STORAGE_KEY = 'sticket_recent_searches';
const MAX_RECENT = 10;

export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) setRecentSearches(JSON.parse(stored));
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to load recent searches:', err);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const save = useCallback(async (searches: RecentSearch[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(searches));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to save recent searches:', err);
    }
  }, []);

  const addSearch = useCallback(
    (search: Omit<RecentSearch, 'timestamp'>) => {
      setRecentSearches((prev) => {
        const filtered = prev.filter((s) => s.query.toLowerCase() !== search.query.toLowerCase());
        const updated = [{ ...search, timestamp: Date.now() }, ...filtered].slice(0, MAX_RECENT);
        void save(updated);
        return updated;
      });
    },
    [save]
  );

  const removeSearch = useCallback(
    (query: string) => {
      setRecentSearches((prev) => {
        const updated = prev.filter((s) => s.query.toLowerCase() !== query.toLowerCase());
        void save(updated);
        return updated;
      });
    },
    [save]
  );

  const clearAll = useCallback(async () => {
    setRecentSearches([]);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    recentSearches,
    loading,
    addSearch,
    removeSearch,
    clearAll,
  };
}



