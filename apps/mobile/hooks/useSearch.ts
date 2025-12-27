import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { search } from '../lib/api/search';
import { searchArtistsSpotify } from '../lib/api/logShow';
import type { SearchResults, SearchTab } from '../types/search';

const EMPTY_RESULTS: SearchResults = {
  artists: [],
  venues: [],
  events: [],
  users: [],
  totalCount: 0,
};

export function useSearch() {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const [allResults, setAllResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const performSearch = useCallback(async (searchQuery: string) => {
    const trimmed = searchQuery.trim();

    if (!trimmed) {
      setAllResults(EMPTY_RESULTS);
      setSearched(false);
      return;
    }

    // Cancel previous request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const reqId = ++requestIdRef.current;

    setLoading(true);
    setSearched(true);

    try {
      const data = await search(trimmed, {
        // Always fetch "all" once, then filter locally by tab.
        limit: 20,
        signal: controller.signal,
      });

      // Ignore stale responses
      if (reqId !== requestIdRef.current) return;

      // Spotify fallback: if no artists found, search Spotify
      if (data.artists.length === 0) {
        try {
          const spotifyArtists = await searchArtistsSpotify(trimmed);
          data.artists = spotifyArtists.map((a) => ({
            id: a.id,
            name: a.name,
            imageUrl: a.imageUrl ?? undefined,
            genres: a.genres ?? [],
            upcomingEventCount: 0,
          }));
          data.totalCount += spotifyArtists.length;
        } catch (spotifyError) {
          // eslint-disable-next-line no-console
          console.error('Spotify fallback search failed:', spotifyError);
        }
      }

      setAllResults(data);
    } catch (err: any) {
      // Abort is expected during fast typing / tab changes
      if (err?.name === 'AbortError' || err?.code === 'ERR_CANCELED') return;
      // eslint-disable-next-line no-console
      console.error('Search failed:', err);
      setAllResults(EMPTY_RESULTS);
    } finally {
      if (reqId === requestIdRef.current) setLoading(false);
    }
  }, []);

  // Debounced search on query / tab change
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    if (query.trim()) {
      debounceRef.current = setTimeout(() => {
        void performSearch(query);
      }, 300);
    } else {
      setAllResults(EMPTY_RESULTS);
      setSearched(false);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [query, performSearch]);

  const clear = useCallback(() => {
    setQuery('');
    setAllResults(EMPTY_RESULTS);
    setSearched(false);
    setLoading(false);

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = null;

    requestIdRef.current += 1;
  }, []);

  const changeTab = useCallback((tab: SearchTab) => {
    setActiveTab(tab);
  }, []);

  const filteredResults = useMemo<SearchResults>(() => {
    switch (activeTab) {
      case 'artists':
        return { ...EMPTY_RESULTS, artists: allResults.artists, totalCount: allResults.artists.length };
      case 'venues':
        return { ...EMPTY_RESULTS, venues: allResults.venues, totalCount: allResults.venues.length };
      case 'events':
        return { ...EMPTY_RESULTS, events: allResults.events, totalCount: allResults.events.length };
      case 'users':
        return { ...EMPTY_RESULTS, users: allResults.users, totalCount: allResults.users.length };
      default:
        return allResults;
    }
  }, [activeTab, allResults]);

  return {
    query,
    setQuery,
    activeTab,
    changeTab,
    results: filteredResults,
    allResults,
    loading,
    searched,
    clear,
  };
}



