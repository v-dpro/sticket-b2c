import { apiClient } from './client';
import type { SearchResults, TrendingData } from '../../types/search';

// Unified search
export async function search(
  query: string,
  options?: {
    type?: 'all' | 'artists' | 'venues' | 'events' | 'users';
    limit?: number;
    signal?: AbortSignal;
  }
): Promise<SearchResults> {
  const response = await apiClient.get('/search', {
    params: { q: query, type: options?.type, limit: options?.limit },
    signal: options?.signal,
  });
  return response.data;
}

// Get trending
export async function getTrending(): Promise<TrendingData> {
  const response = await apiClient.get('/search/trending');
  return response.data;
}

// Log search (for trending/analytics)
export async function logSearch(query: string): Promise<void> {
  await apiClient.post('/search/log', { query });
}



