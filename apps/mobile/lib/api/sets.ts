// GET /users/me/sets — TOUR STUBS: your logs rolled up by tour, the
// completion-set layer of the collection. FOLLOWED at 2+ dates; COMPLETE
// when every date on the tour is collected.

import { apiClient } from './client';

export type TourSet = {
  id: string;
  name: string;
  artistId: string;
  artistName: string;
  imageUrl?: string | null;
  /** Distinct tour dates you've logged. */
  collected: number;
  /** Dates on the tour (catalog count). */
  totalDates: number;
  /** 2+ dates — you chased the tour. */
  followed: boolean;
  /** Every catalog date collected. */
  complete: boolean;
};

export async function getMySets(): Promise<TourSet[]> {
  const response = await apiClient.get('/users/me/sets');
  const tours = response.data?.tours;
  return Array.isArray(tours) ? tours : [];
}
