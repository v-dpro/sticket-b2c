// lib/api/tasteMatch.ts — shared-taste percentages for the Attendees sheet
// (Facepile Taste Popup). GET /users/taste-match?ids=a,b,c (≤10) is being
// built in parallel and may 404 or 500 until it lands — every failure mode
// (network, non-2xx, malformed payload) degrades to an empty map so the
// sheet just omits the "N% TASTE MATCH" line rather than erroring.

import { apiClient } from './client';

const MAX_IDS = 10;

interface TasteMatchResponse {
  matches?: { userId: string; pct: number }[];
}

/** userId → shared-taste percentage (0-100). Empty map on any failure. */
export async function getTasteMatch(ids: string[]): Promise<Map<string, number>> {
  const uniqueIds = Array.from(new Set(ids)).slice(0, MAX_IDS);
  if (uniqueIds.length === 0) return new Map();

  try {
    const response = await apiClient.get<TasteMatchResponse>('/users/taste-match', {
      params: { ids: uniqueIds.join(',') },
    });
    const map = new Map<string, number>();
    for (const m of response.data?.matches ?? []) {
      if (m && typeof m.userId === 'string' && typeof m.pct === 'number') {
        map.set(m.userId, m.pct);
      }
    }
    return map;
  } catch {
    return new Map();
  }
}
