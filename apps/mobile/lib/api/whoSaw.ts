// lib/api/whoSaw.ts — C15 "who also saw" lookups for the artist and tour
// entity pages. Both endpoints share one response shape: degree-1 people
// first, capped at 12, plus the full connected total for the +N chip.
//
// GET /artists/:id/who-saw — everyone (within 2 hops) who's seen the artist.
// GET /tours/:id/who-saw   — everyone (within 2 hops) who's seen the tour.

import { apiClient } from './client';
import type { FacePerson } from '../../components/ui/DegreeFacepile';

/** One show of the tour a who-saw person attended (tour endpoint only). */
export interface WhoSawAttendedEvent {
  eventId: string;
  name: string;
  venueName: string;
  city: string;
  date: string;
}

/** attendedEvents is present on the tour endpoint, absent on the artist one. */
export type WhoSawPerson = FacePerson & { attendedEvents?: WhoSawAttendedEvent[] };

export interface WhoSawResponse {
  people: WhoSawPerson[];
  totalCount: number;
}

export async function getArtistWhoSaw(artistId: string): Promise<WhoSawResponse> {
  const response = await apiClient.get(`/artists/${artistId}/who-saw`);
  return response.data;
}

export async function getTourWhoSaw(tourId: string): Promise<WhoSawResponse> {
  const response = await apiClient.get(`/tours/${tourId}/who-saw`);
  return response.data;
}
