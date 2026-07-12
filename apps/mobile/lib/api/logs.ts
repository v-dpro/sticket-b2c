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
    /** Post a log as a shared memory. `share: true` stamps sharedAt = now(). */
    share?: boolean;
    /** Explicit ISO string, or null to un-share. */
    sharedAt?: string | null;
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

  // The server awards a one-time XP bonus on a log's first photo: xpGain is
  // the amount (0 when not the first) and xpAfter the new total (null when
  // no bonus was granted).
  return res.data as { id: string; photoUrl: string; xpGain: number; xpAfter: number | null };
}

export async function tagFriendsOnLog(logId: string, userIds: string[]) {
  const res = await apiClient.post(`/logs/${logId}/tags`, { userIds });
  return res.data as { success: boolean; taggedUserIds: string[] };
}

// ─── Co-authored memories (joint posts) ─────────────────────────────
// The log owner invites friends who were there; once a co-author accepts, the
// memory also lands on their timeline. Backing endpoints: POST/GET
// /logs/:id/coauthors, POST /logs/:id/coauthors/respond,
// GET /users/me/coauthor-invites.

export type CoAuthorStatus = 'INVITED' | 'ACCEPTED' | 'DECLINED';

export type LogCoAuthor = {
  user: { id: string; username: string; displayName?: string; avatarUrl?: string };
  status: CoAuthorStatus;
};

export type CoAuthorInvite = {
  logId: string;
  eventName: string;
  owner: { id: string; username: string; displayName?: string; avatarUrl?: string };
  invitedAt: string;
};

/** Owner-only: invite users to co-author a log. Skips self/dupes server-side. */
export async function inviteCoAuthors(logId: string, userIds: string[]) {
  const res = await apiClient.post(`/logs/${logId}/coauthors`, { userIds });
  return res.data as { invited: string[] };
}

/** Owner or invitee: the full co-author list with each person's status. */
export async function getCoAuthors(logId: string) {
  const res = await apiClient.get(`/logs/${logId}/coauthors`);
  return res.data as LogCoAuthor[];
}

/** The invited user accepts or declines their co-author invite for a log. */
export async function respondCoAuthor(logId: string, accept: boolean) {
  const res = await apiClient.post(`/logs/${logId}/coauthors/respond`, { accept });
  return res.data as { logId: string; status: CoAuthorStatus };
}

/** The viewer's pending (INVITED) co-author invites. */
export async function getMyCoAuthorInvites() {
  const res = await apiClient.get('/users/me/coauthor-invites');
  return res.data as CoAuthorInvite[];
}



