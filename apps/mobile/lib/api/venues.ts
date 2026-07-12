import { apiClient } from './client';
import type { SeatView, VenueDetails, VenueRatingsSubmission, VenueShow, VenueTip } from '../../types/venue';

// Get venue details
export async function getVenue(venueId: string): Promise<VenueDetails> {
  const response = await apiClient.get(`/venues/${venueId}`);
  return response.data;
}

// Get venue shows
export async function getVenueShows(
  venueId: string,
  options?: {
    upcoming?: boolean;
    limit?: number;
    offset?: number;
  }
): Promise<VenueShow[]> {
  const response = await apiClient.get(`/venues/${venueId}/events`, {
    params: options,
  });
  return response.data;
}

// ---------------------------------------------------------------------------
// Entity deep-dive (additive)
// ---------------------------------------------------------------------------

// GET /venues/:id/events?cursor&limit&scope — cursor-paginated event rows for
// the "All shows here" screen (the offset-based getVenueShows above predates
// this and stays for older call sites).
export type VenueEventsScope = 'all' | 'upcoming' | 'past';

export interface VenueEventItem {
  id: string;
  name: string;
  date: string;
  artist: {
    id: string;
    name: string;
  };
  logCount: number;
  avgScore: number | null;
}

export interface VenueEventsResponse {
  items: VenueEventItem[];
  nextCursor?: string | null;
}

export async function getVenueEvents(
  venueId: string,
  options?: { cursor?: string; limit?: number; scope?: VenueEventsScope },
): Promise<VenueEventsResponse> {
  const response = await apiClient.get(`/venues/${venueId}/events`, {
    params: options,
  });
  return response.data;
}

// Submit venue ratings
export async function submitVenueRatings(venueId: string, ratings: VenueRatingsSubmission): Promise<void> {
  await apiClient.post(`/venues/${venueId}/ratings`, ratings);
}

// Get venue tips
export async function getVenueTips(
  venueId: string,
  options?: { limit?: number; offset?: number }
): Promise<VenueTip[]> {
  const response = await apiClient.get(`/venues/${venueId}/tips`, {
    params: options,
  });
  return response.data;
}

// Submit venue tip
export async function submitVenueTip(venueId: string, tip: { text: string; category: string }): Promise<VenueTip> {
  const response = await apiClient.post(`/venues/${venueId}/tips`, tip);
  return response.data;
}

// Upvote tip
export async function upvoteTip(venueId: string, tipId: string): Promise<void> {
  await apiClient.post(`/venues/${venueId}/tips/${tipId}/upvote`);
}

// Remove upvote
export async function removeUpvote(venueId: string, tipId: string): Promise<void> {
  await apiClient.delete(`/venues/${venueId}/tips/${tipId}/upvote`);
}

// Get seat views
export async function getSeatViews(venueId: string, options?: { section?: string; limit?: number }): Promise<SeatView[]> {
  const response = await apiClient.get(`/venues/${venueId}/seat-views`, {
    params: options,
  });
  return response.data;
}

// Submit seat rating (photo-less quick 1-5 rating)
export interface SeatRatingSubmission {
  section: string;
  row?: string;
  rating: number;
  eventId?: string;
}

export interface SeatRating {
  id: string;
  section: string;
  row?: string;
  rating: number;
}

export async function submitSeatRating(venueId: string, data: SeatRatingSubmission): Promise<SeatRating> {
  const response = await apiClient.post(`/venues/${venueId}/seat-ratings`, data);
  return response.data;
}

// Submit seat view (multipart)
export async function submitSeatView(
  venueId: string,
  data: { section: string; row?: string; photo: { uri: string } }
): Promise<SeatView> {
  const formData = new FormData();
  formData.append('section', data.section);
  if (data.row) formData.append('row', data.row);

  formData.append(
    'photo',
    {
      uri: data.photo.uri,
      type: 'image/jpeg',
      name: 'seat-view.jpg',
    } as any
  );

  const response = await apiClient.post(`/venues/${venueId}/seat-views`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data;
}



