// lib/api/tours.ts — tour entity endpoints.
//
// GET /tours/:id          — tour header + its show-by-show event list.
// GET /tours/:id/photos   — cursor-paginated crowd photos across the tour.

import { apiClient } from './client';

// ── GET /tours/:id ─────────────────────────────────────────────────

export interface TourEvent {
  id: string;
  name: string;
  date: string;
  venue: {
    id: string;
    name: string;
    city: string;
  };
  logCount: number;
  avgScore: number | null;
}

export interface TourDetail {
  tour: {
    id: string;
    name: string;
    year: number | null;
    artist: {
      id: string;
      name: string;
    };
  };
  events: TourEvent[];
}

export async function getTour(tourId: string): Promise<TourDetail> {
  const response = await apiClient.get(`/tours/${tourId}`);
  return response.data;
}

// ── GET /tours/:id/photos ──────────────────────────────────────────

export interface TourPhoto {
  id: string;
  photoUrl: string;
  thumbnailUrl?: string;
  eventId: string;
  eventName: string;
  logId: string;
}

export interface TourPhotosResponse {
  items: TourPhoto[];
  nextCursor?: string | null;
}

export async function getTourPhotos(
  tourId: string,
  options?: { cursor?: string; limit?: number },
): Promise<TourPhotosResponse> {
  const response = await apiClient.get(`/tours/${tourId}/photos`, {
    params: options,
  });
  return response.data;
}
