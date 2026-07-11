import { apiClient } from './client';
import type { Event, EventComment, EventDetails, EventPhoto } from '../../types/event';

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

// Get setlist (stubbed server-side for now)
export async function getSetlist(eventId: string): Promise<any> {
  const response = await apiClient.get(`/events/${eventId}/setlist`);
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
  ticketUrl?: string | null;
  notes?: string | null;
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




