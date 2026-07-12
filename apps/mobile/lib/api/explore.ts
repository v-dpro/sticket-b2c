// GET /explore — the mixed discovery stream (Explore tab, batch 5 / C14).
// One authed call returns every section of the stanza: presales, trending
// events, rising artists, spotlight tours, venues, and crowd posts.

import { apiClient } from './client';

// Structurally identical to FacePerson (components/ui/DegreeFacepile) —
// declared here so the API layer doesn't import from components.
export type ExplorePerson = {
  id: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  /** 1 = you follow them · 2 = friend-of-friend. Absent = outside 2 hops. */
  degree?: 1 | 2;
};

export type ExplorePresale = {
  id: string;
  artistId: string | null;
  artistName: string;
  presaleType: string;
  presaleStart: string;
  code?: string | null;
};

export type ExploreTrendingEvent = {
  id: string;
  name: string;
  date: string;
  imageUrl?: string | null;
  artist: { id: string; name: string; imageUrl?: string | null };
  venue: { id: string; name: string; city: string };
  logCount: number;
  interestedCount: number;
  /** ≤5 — friends (1st/2nd degree) who logged or are going. */
  friendsWent: ExplorePerson[];
  /** ≤3 — photo URLs from crowd logs at this event. */
  crowdPhotos: string[];
};

export type ExploreRisingArtist = {
  id: string;
  name: string;
  imageUrl?: string | null;
  followerCount: number;
  logCount: number;
  /** ≤4 */
  friendsWent: ExplorePerson[];
};

export type ExploreSpotlightTour = {
  id: string;
  name: string;
  artistId: string;
  artistName: string;
  imageUrl?: string | null;
  eventCount: number;
  avgScore?: number | null;
  /** ≤4 */
  friendsWent: ExplorePerson[];
};

export type ExploreVenue = {
  id: string;
  name: string;
  city: string;
  imageUrl?: string | null;
  eventCount: number;
};

export type ExploreCrowdPost = {
  logId: string;
  eventId: string;
  photoUrl: string;
  artistName: string;
  venueName?: string | null;
  score?: number | null;
  user: ExplorePerson;
};

export type ExplorePublicParty = {
  id: string;
  title: string;
  startsAt: string | null;
  event: { id: string; name: string; date: string; venue?: { name: string; city?: string | null } | null };
  host: ExplorePerson;
  goingCount: number;
};

export type ExploreData = {
  presales: ExplorePresale[];
  trendingEvents: ExploreTrendingEvent[];
  risingArtists: ExploreRisingArtist[];
  spotlightTours: ExploreSpotlightTour[];
  venues: ExploreVenue[];
  crowdPosts: ExploreCrowdPost[];
  publicParties: ExplorePublicParty[];
};

export async function getExplore(): Promise<ExploreData> {
  const response = await apiClient.get('/explore');
  const data = response.data ?? {};
  // Defensive defaults — every section renders (or skips) independently.
  return {
    presales: Array.isArray(data.presales) ? data.presales : [],
    trendingEvents: Array.isArray(data.trendingEvents) ? data.trendingEvents : [],
    risingArtists: Array.isArray(data.risingArtists) ? data.risingArtists : [],
    spotlightTours: Array.isArray(data.spotlightTours) ? data.spotlightTours : [],
    venues: Array.isArray(data.venues) ? data.venues : [],
    crowdPosts: Array.isArray(data.crowdPosts) ? data.crowdPosts : [],
    publicParties: Array.isArray(data.publicParties) ? data.publicParties : [],
  };
}
