// lib/api/collection.ts — the viewer's collection: how many times they've
// seen each artist, which venues, which cities (GET /users/me/collection).

import { apiClient } from './client';

export type CollectionArtist = {
  artist: { id: string; name: string; imageUrl?: string | null };
  count: number;
  lastSeen: string;
};

export type CollectionVenue = {
  venue: { id: string; name: string; city: string };
  count: number;
};

export type CollectionCity = {
  city: string;
  count: number;
};

export type MyCollection = {
  artists: CollectionArtist[];
  venues: CollectionVenue[];
  cities: CollectionCity[];
};

export async function getMyCollection(): Promise<MyCollection> {
  const res = await apiClient.get('/users/me/collection');
  return res.data as MyCollection;
}
