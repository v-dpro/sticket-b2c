// lib/api/reminders.ts — the Plan tab's "REMIND ME" toggle on a ticketed show.
// Backed by ShowReminder (one row per user+event). The morning of the show day
// the notification engine fires a "Tonight: <artist> at <venue>" nudge.
//
//   GET    /users/me/reminders            → string[] of reminded eventIds
//   POST   /users/me/reminders  {eventId} → { eventId, reminded: true }
//   DELETE /users/me/reminders/:eventId   → { eventId, reminded: false }

import { apiClient } from './client';

// Event ids the signed-in user has a show-day reminder on (hydrates toggles).
export async function getMyReminders(): Promise<string[]> {
  const response = await apiClient.get('/users/me/reminders');
  return response.data;
}

// Upsert a reminder — returns the resulting reminded state (true).
export async function addReminder(eventId: string): Promise<boolean> {
  const response = await apiClient.post('/users/me/reminders', { eventId });
  return Boolean(response.data?.reminded);
}

// Delete a reminder — returns the resulting reminded state (false).
export async function removeReminder(eventId: string): Promise<boolean> {
  const response = await apiClient.delete(`/users/me/reminders/${eventId}`);
  return Boolean(response.data?.reminded);
}
