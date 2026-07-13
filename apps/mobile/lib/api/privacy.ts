// lib/api/privacy.ts — the viewer's privacy controls (User privacy columns).
// GET /users/me/privacy hydrates the settings screen; PATCH accepts a partial
// body and returns the full persisted set. Values are the raw server enums.

import { apiClient } from './client';

export type ProfileVisibility = 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
export type LogVisibilityDefault = 'PUBLIC' | 'FRIENDS';
export type AudienceSetting = 'EVERYONE' | 'FRIENDS' | 'NOBODY';

export interface PrivacyControls {
  /** Who can see your full profile (PRIVATE → minimal card for others). */
  profileVisibility: ProfileVisibility;
  /** Visibility applied to new memories when none is chosen at log time. */
  defaultLogVisibility: LogVisibilityDefault;
  /** Whether others can see your timeline. */
  showTimeline: boolean;
  /** Whether others can see your logged-shows collection. */
  showCollection: boolean;
  /** Whether others can see your venue/city map. */
  showMapCities: boolean;
  /** Who can invite you to parties. */
  allowPartyInvites: AudienceSetting;
  /** Who can trigger a mention notification (mention text always stays). */
  allowMentions: AudienceSetting;
  /** Whether you appear in others' taste-match results. */
  appearInTasteMatch: boolean;
}

export async function getPrivacyControls(): Promise<PrivacyControls> {
  const response = await apiClient.get('/users/me/privacy');
  return response.data as PrivacyControls;
}

export async function updatePrivacyControls(patch: Partial<PrivacyControls>): Promise<PrivacyControls> {
  const response = await apiClient.patch('/users/me/privacy', patch);
  return response.data as PrivacyControls;
}
