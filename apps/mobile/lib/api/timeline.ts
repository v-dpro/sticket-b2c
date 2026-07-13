// lib/api/timeline.ts — typed fetcher for the aggregated user timeline.
//
// GET /users/:id/timeline?cursor=&limit=
//   upcoming   — tickets / interested / tracked events (owner-only; the API
//                returns [] for other viewers), ascending by event date.
//   months     — past logged shows bucketed by month key ("2026-07"),
//                newest-first, cursor-paginated on event date.
//   nextCursor — ISO date string to pass back as `cursor`, or null when done.

import { apiClient } from './client';

export type TimelineArtist = {
  id: string;
  name: string;
  imageUrl?: string;
};

export type TimelineVenue = {
  id: string;
  name: string;
  city: string;
};

export type TimelineEventRef = {
  id: string;
  name: string;
  date: string; // ISO
};

export type TimelineEventSummary = TimelineEventRef & {
  /** Fallback-resolved cover art: event image ?? tour ad ?? artist image. */
  imageUrl?: string;
  artist: TimelineArtist;
  venue: TimelineVenue;
};

export type TimelineUpcomingItem = {
  type: 'ticket' | 'interested' | 'tracking' | 'party';
  id: string;
  date: string; // ISO — event date, used for countdowns
  event: TimelineEventSummary;
  // ticket-only
  section?: string;
  row?: string;
  seat?: string;
  status?: string;
  // interested-only
  notifyOnSale?: boolean;
  // tracking-only
  maxPrice?: number;
  /** A party on this plan (the owner hosts) — join lives on the party page. */
  party?: {
    id: string;
    title: string;
    visibility: 'PUBLIC' | 'INVITE';
    goingCount: number;
    myStatus: 'HOST' | 'GOING' | 'REQUESTED' | 'INVITED' | null;
  };
};

export type TimelineCoAuthor = {
  id: string;
  username: string;
  avatarUrl?: string;
};

export type TimelinePhoto = {
  id: string;
  photoUrl: string;
  thumbnailUrl: string;
};

export type TimelineEntry = {
  logId: string;
  score: number | null;
  sharedAt: string | null; // set ⇒ the log was shared (memory card treatment)
  visibility: 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
  note?: string;
  event: TimelineEventRef;
  artist: TimelineArtist;
  venue: TimelineVenue;
  photos: TimelinePhoto[]; // ≤ 1 today
  /** Server-resolved stand-in when no memory photo exists:
      event.imageUrl ?? tour.imageUrl ?? artist.imageUrl. */
  fallbackImageUrl?: string | null;
  coAuthors: TimelineCoAuthor[];
  // Set only when this entry is a co-authored log owned by someone else —
  // identifies the original author for the joint "maya × jordan" byline.
  coAuthorOf?: { id: string; username: string };
  likeCount: number;
  commentCount: number;
};

export type TimelineMonth = {
  key: string; // "2026-07"
  entries: TimelineEntry[];
};

export type TimelineResponse = {
  upcoming: TimelineUpcomingItem[];
  months: TimelineMonth[];
  nextCursor: string | null;
};

// Get a user's aggregated timeline (upcoming plans + month-bucketed past).
export async function getUserTimeline(
  userId: string,
  options?: {
    cursor?: string;
    limit?: number;
  }
): Promise<TimelineResponse> {
  const response = await apiClient.get(`/users/${userId}/timeline`, {
    params: options,
  });
  return response.data;
}
