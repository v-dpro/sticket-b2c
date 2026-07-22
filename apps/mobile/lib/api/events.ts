import { apiClient } from './client';
import type { Event, EventComment, EventDetails, EventPhoto } from '../../types/event';
import type { FeedItem } from '../../types/feed';

export async function getEventById(eventId: string): Promise<Event> {
  const response = await apiClient.get(`/events/${eventId}`);
  return response.data;
}

// Get event details (Event Page)
export async function getEvent(eventId: string): Promise<EventDetails> {
  const response = await apiClient.get(`/events/${eventId}`);
  return response.data;
}

// Get event photos
export async function getEventPhotos(
  eventId: string,
  options?: { limit?: number; offset?: number }
): Promise<EventPhoto[]> {
  const response = await apiClient.get(`/events/${eventId}/photos`, {
    params: options,
  });
  return response.data;
}

// Get event comments
export async function getEventComments(
  eventId: string,
  options?: { limit?: number; offset?: number }
): Promise<EventComment[]> {
  const response = await apiClient.get(`/events/${eventId}/comments`, {
    params: options,
  });
  return response.data;
}

// Post comment
export async function postEventComment(eventId: string, text: string): Promise<EventComment> {
  const response = await apiClient.post(`/events/${eventId}/comments`, { text });
  return response.data;
}

// Delete comment
export async function deleteEventComment(eventId: string, commentId: string): Promise<void> {
  await apiClient.delete(`/events/${eventId}/comments/${commentId}`);
}

// Mark interested
export async function markInterested(eventId: string): Promise<void> {
  await apiClient.post(`/events/${eventId}/interested`);
}

// Remove interested
export async function removeInterested(eventId: string): Promise<void> {
  await apiClient.delete(`/events/${eventId}/interested`);
}

// A18 — interested → going auto-promote. "Going" IS having a ticket, so once
// a ticket exists for an event the UserInterested row is redundant intent
// data: clear it so the event stops showing under INTERESTED and lives only
// in the ticketed section. DELETE /events/:id/interested 500s when no row
// exists (Prisma delete on a missing row), so we check isInterested via the
// event payload first. Entirely best-effort: any failure leaves the row in
// place and the ticket flow untouched. Never throws.
export async function promoteInterestedToGoing(eventId: string): Promise<void> {
  try {
    const event = await getEvent(eventId);
    if (event?.isInterested) {
      await removeInterested(eventId);
    }
  } catch {
    // best-effort cleanup — the ticket save already succeeded
  }
}

// Import (or find) an event by artist/venue/date — used by the manual "create show" flow
export async function importEvent(data: {
  artistName: string;
  venueName: string;
  venueCity: string;
  venueCountry?: string;
  date: string; // ISO string
  title?: string;
}): Promise<{ id: string }> {
  const response = await apiClient.post('/events/import', data);
  return response.data;
}

// ---------------------------------------------------------------------------
// Crowd-sourced setlist
// ---------------------------------------------------------------------------
// The server replaced the old `{ songs: [] }` stub with crowd-sourced
// entries: loggers submit songs, attendees confirm/dispute individual
// entries. `confirmCount` is the net crowd confidence (+1 per YES, -1 per
// NO, seeded at 1 by the submitter).

export type SetlistVote = 'YES' | 'NO';

export interface SetlistEntry {
  id: string;
  position: number;
  songTitle: string;
  confirmCount: number;
  yourVote: SetlistVote | null;
}

// GET /events/:id/setlist — crowd-sourced entries ordered by position.
export async function getSetlist(eventId: string): Promise<{ entries: SetlistEntry[] }> {
  const response = await apiClient.get(`/events/${eventId}/setlist`);
  return response.data;
}

// POST /setlist-entries/:id/confirm { vote } — one vote per user per entry.
// YES = +1, NO = -1; switching moves the count by 2, repeating is a no-op.
// Returns the updated entry (with your vote applied).
export async function voteSetlistEntry(
  entryId: string,
  vote: 'yes' | 'no',
): Promise<SetlistEntry> {
  const response = await apiClient.post(`/setlist-entries/${entryId}/confirm`, { vote });
  return response.data;
}

// Report moment (stubbed server-side for now)
export async function reportMoment(eventId: string, moment: { type: string; label?: string }): Promise<void> {
  await apiClient.post(`/events/${eventId}/moments`, moment);
}

// ---------------------------------------------------------------------------
// Entity pages (additive)
// ---------------------------------------------------------------------------

// Shape of GET /presales rows (subset the event page needs).
export interface EventPresale {
  id: string;
  artistName: string;
  tourName: string | null;
  venueName: string;
  venueCity: string;
  venueState: string | null;
  eventDate: string;
  presaleType: string;
  presaleStart: string;
  presaleEnd: string | null;
  onsaleStart?: string | null;
  code: string | null;
  signupUrl: string | null;
  // Server sends this alongside signupUrl; the API never sends `code` (see
  // above) — compliance, not an omission.
  signupDeadline?: string | null;
  ticketUrl?: string | null;
  notes?: string | null;
  // Only present when the request is authenticated (GET /presales computes
  // it from the caller's PresaleAlert rows regardless of the artistId
  // filter) — absent/undefined for logged-out requests, treat as false.
  hasAlert?: boolean;
}

// GET /presales?artistId= — upcoming presales for an artist. There is no
// per-event presale endpoint; callers match rows to a specific event
// client-side (same day + venue).
export async function getArtistPresales(artistId: string): Promise<EventPresale[]> {
  const response = await apiClient.get('/presales', {
    params: { artistId, limit: 50 },
  });
  return Array.isArray(response.data) ? response.data : [];
}

// Shape of POST /onboarding/presale-preview rows. Narrower than EventPresale:
// the server returns only what the onboarding preview needs (no eventDate /
// venueState / presaleEnd / onsaleStart / ticketUrl / notes).
export interface OnboardingPresalePreviewItem {
  id: string;
  artistName: string;
  tourName?: string;
  venueName: string;
  venueCity: string;
  presaleType: string;
  presaleStart: string;
  code?: string;
  signupUrl?: string;
  signupDeadline?: string;
}

// POST /onboarding/presale-preview — upcoming presales that match the artists
// the user picked during onboarding (matched by name, server-side). Used only
// by the onboarding presale-preview screen to show a real match instead of a
// mock. Empty { presales: [], hasPresales: false } when nothing matches.
export async function getOnboardingPresalePreview(
  artistNames: string[],
): Promise<{ presales: OnboardingPresalePreviewItem[]; hasPresales: boolean }> {
  const response = await apiClient.post('/onboarding/presale-preview', { artistNames });
  const data = response.data ?? {};
  return {
    presales: Array.isArray(data.presales) ? data.presales : [],
    hasPresales: Boolean(data.hasPresales),
  };
}

// ---------------------------------------------------------------------------
// Entity deep-dive (additive)
// ---------------------------------------------------------------------------

// GET /events/:id/feed — public memory posts for one event, same item shape
// as the home feed (rendered with the existing FeedCard).
export interface EventFeedResponse {
  items: FeedItem[];
  nextCursor?: string | null;
}

export async function getEventFeed(
  eventId: string,
  options?: { cursor?: string; limit?: number },
): Promise<EventFeedResponse> {
  const response = await apiClient.get(`/events/${eventId}/feed`, {
    params: options,
  });
  return response.data;
}

// GET /events/:id/seat-sections — the "seat views" map: photos grouped by
// section with a per-section average rating (1–5).
export interface SeatSectionPhoto {
  id: string;
  photoUrl: string;
  thumbnailUrl?: string;
  source?: string;
}

export interface EventSeatSection {
  section: string;
  photoCount: number;
  avgRating: number | null;
  photos: SeatSectionPhoto[];
}

export async function getEventSeatSections(
  eventId: string,
): Promise<{ sections: EventSeatSection[] }> {
  const response = await apiClient.get(`/events/${eventId}/seat-sections`);
  return response.data;
}

// ---------------------------------------------------------------------------
// Hang (Partiful-style event chat/invite)
// ---------------------------------------------------------------------------

export async function getHang(eventId: string): Promise<any> {
  const response = await apiClient.get(`/events/${eventId}/hang`);
  return response.data;
}

export async function postHangMessage(eventId: string, text: string): Promise<any> {
  const response = await apiClient.post(`/events/${eventId}/hang/messages`, { text });
  return response.data;
}

export async function rsvpHang(eventId: string, status: 'going' | 'maybe' | 'cant'): Promise<void> {
  await apiClient.post(`/events/${eventId}/hang/rsvp`, { status });
}




