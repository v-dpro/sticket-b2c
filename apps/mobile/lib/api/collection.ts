// lib/api/collection.ts — the viewer's collection: how many times they've
// seen each artist, which venues, which cities (GET /users/me/collection).

import { apiClient } from './client';
import type { FacePerson } from '../../components/ui/DegreeFacepile';

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

// ── Trophies (ARTISTS · TROPHIES section) ───────────────────────────
// Backend is being built in parallel — every field here is optional at
// the top (`trophies?`) so the section renders nothing until it lands.

export type CollectionFirstShow = {
  artistName: string;
  venueName: string;
  date: string;
};

export type CollectionLeaderboardRow = {
  artist: { id: string; name: string; imageUrl?: string | null };
  you: number;
  topFriend: { person: FacePerson; count: number } | null;
  /** Friends also tracking this artist — rendered as a facepile on the row. */
  friendsTracking?: FacePerson[];
  /** Times seen by the leading friend, when it differs from topFriend.count. */
  topFriendCount?: number;
};

export type CollectionTrophies = {
  firsts: {
    firstShow: CollectionFirstShow | null;
    venuesCount: number;
    citiesCount: number;
  };
  streak: { months: number };
  years: { year: number; shows: number }[];
  mostSeenLeaderboard: CollectionLeaderboardRow[];
};

export type MyCollection = {
  artists: CollectionArtist[];
  venues: CollectionVenue[];
  cities: CollectionCity[];
  trophies?: CollectionTrophies;
};

export async function getMyCollection(): Promise<MyCollection> {
  const res = await apiClient.get('/users/me/collection');
  return res.data as MyCollection;
}
