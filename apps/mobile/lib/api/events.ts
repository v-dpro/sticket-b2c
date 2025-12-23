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

// Get setlist (stubbed server-side for now)
export async function getSetlist(eventId: string): Promise<any> {
  const response = await apiClient.get(`/events/${eventId}/setlist`);
  return response.data;
}

// Report moment (stubbed server-side for now)
export async function reportMoment(eventId: string, moment: { type: string; label?: string }): Promise<void> {
  await apiClient.post(`/events/${eventId}/moments`, moment);
}




