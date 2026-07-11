import { apiClient } from './client';
import type { Badge } from '../../types/badge';

export async function checkAlreadyLogged(eventId: string) {
  const res = await apiClient.get('/logs/check', { params: { eventId } });
  return res.data as { logged: boolean; logId?: string };
}

export async function createLog(payload: {
  eventId: string;
  rating?: number;
  note?: string;
  section?: string;
  row?: string;
  seat?: string;
  visibility?: 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
}) {
  const res = await apiClient.post('/logs', payload);
  return res.data as {
    id: string;
    newBadges?: Badge[];
    xpGain?: number;
    xpBefore?: number;
    xpAfter?: number;
    leveledUp?: boolean;
    /** Whether the user already has scored logs — drives the post-create
     * flow: true → compare loop, false → first-ever vibe pick. */
    hasScoredHistory?: boolean;
  };
}

// ─── Compare-to-rank scoring (the Beli loop) ────────────────────────
// Sequence after POST /logs: GET next-opponent → POST compare (repeat
// until resolved / opponent null) → POST score. First-ever scored log
// skips straight to POST score with a vibe.

export type CompareOpponent = {
  id: string;
  score: number;
  event: { id: string; name: string; date: string };
  photo?: string;
};

export type CompareOutcome = 'win' | 'loss' | 'tie';

export type LogVibe = 'bad' | 'fine' | 'great';

/** Server-picked binary-search midpoint to duel against, or null when placement is resolved. */
export async function getNextOpponent(logId: string) {
  const res = await apiClient.get(`/logs/${logId}/next-opponent`);
  return res.data as { opponent: CompareOpponent | null };
}

/** Record one duel round. `resolved: true` means placement is final — POST score next. */
export async function compareLog(logId: string, opponentLogId: string, result: CompareOutcome) {
  const res = await apiClient.post(`/logs/${logId}/compare`, { opponentLogId, result });
  return res.data as { id: string; round: number; result: CompareOutcome; resolved: boolean };
}

/** Finalize the score. Pass `vibe` only for the user's first-ever scored log. */
export async function scoreLog(logId: string, vibe?: LogVibe) {
  const res = await apiClient.post(`/logs/${logId}/score`, vibe ? { vibe } : {});
  return res.data as { id: string; score: number; scoreRank: number; rank: number; totalScored: number };
}

export async function deleteLog(logId: string) {
  const res = await apiClient.delete(`/logs/${logId}`);
  return res.data as { success: boolean };
}

export async function updateLog(
  logId: string,
  patch: {
    rating?: number | null;
    note?: string | null;
    section?: string | null;
    row?: string | null;
    seat?: string | null;
    visibility?: 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
  }
) {
  const res = await apiClient.patch(`/logs/${logId}`, patch);
  return res.data as { id: string };
}

export async function uploadLogPhoto(logId: string, photo: { uri: string; type: string; name: string }) {
  const formData = new FormData();
  formData.append(
    'photo',
    {
      uri: photo.uri,
      type: photo.type || 'image/jpeg',
      name: photo.name || 'photo.jpg',
    } as any
  );

  const res = await apiClient.post(`/logs/${logId}/photos`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return res.data as { id: string; photoUrl: string };
}

export async function tagFriendsOnLog(logId: string, userIds: string[]) {
  const res = await apiClient.post(`/logs/${logId}/tags`, { userIds });
  return res.data as { success: boolean; taggedUserIds: string[] };
}



