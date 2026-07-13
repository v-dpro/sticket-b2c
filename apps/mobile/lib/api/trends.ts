// lib/api/trends.ts — crowd-tagged trends (C23 Trends UI).
//
// GET /events/:id/trends · GET /tours/:id/trends → { trends: [{ tag, count,
// photos: [{ url, logId }] }] }. The backend is being built in parallel, so
// both calls are defensive: a 404 (route not live yet), an empty body, or
// any other failure all resolve to an empty trends list rather than
// throwing — callers (TrendsRail) render nothing in that case.

import { apiClient } from './client';

export interface TrendPhoto {
  url: string;
  logId: string;
}

export interface Trend {
  tag: string;
  count: number;
  photos: TrendPhoto[];
}

export interface TrendsResponse {
  trends: Trend[];
}

const EMPTY_TRENDS: TrendsResponse = { trends: [] };

export async function getEventTrends(eventId: string): Promise<TrendsResponse> {
  try {
    const response = await apiClient.get(`/events/${eventId}/trends`);
    const trends = response.data?.trends;
    return { trends: Array.isArray(trends) ? trends : [] };
  } catch {
    return EMPTY_TRENDS;
  }
}

export async function getTourTrends(tourId: string): Promise<TrendsResponse> {
  try {
    const response = await apiClient.get(`/tours/${tourId}/trends`);
    const trends = response.data?.trends;
    return { trends: Array.isArray(trends) ? trends : [] };
  } catch {
    return EMPTY_TRENDS;
  }
}
