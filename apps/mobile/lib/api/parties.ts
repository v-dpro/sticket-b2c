// lib/api/parties.ts — typed client for the party (event meetup) endpoints.
//
// A Party is a host-run pre/post-show meetup attached to an Event.
// Membership states: HOST (creator), COHOST (promoted GOING member with host
// powers — approve/deny, invite, edit, announce; not cancel/promote),
// INVITED (host invited, hasn't answered), REQUESTED (asked to join a PUBLIC
// party), GOING (approved / accepted), DECLINED (host declined a request).
// Cancelling is soft: the party stays readable with status CANCELLED so
// members see it struck through.
//
// NOTE: there is no leave-party endpoint yet — once GOING, a member stays on
// the list. The party page intentionally omits a "Can't make it" action.

import { apiClient } from './client';

export type PartyVisibility = 'PUBLIC' | 'INVITE';

export type PartyStatus = 'ACTIVE' | 'CANCELLED';

export type PartyMemberStatus = 'HOST' | 'COHOST' | 'INVITED' | 'REQUESTED' | 'GOING' | 'DECLINED';

export interface PartyUser {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface PartyCounts {
  /** Includes the host. */
  going: number;
  requested: number;
  invited: number;
}

export interface Party {
  id: string;
  eventId: string;
  title: string;
  description?: string;
  location?: string;
  startsAt?: string; // ISO
  visibility: PartyVisibility;
  status: PartyStatus;
  createdAt: string;
  host: PartyUser;
  /** All hosts, original host first, then co-hosts. */
  hosts: PartyUser[];
  counts: PartyCounts;
  yourStatus: PartyMemberStatus | null;
  /** Alias of yourStatus under the role reading (HOST/COHOST/GOING/...). */
  myRole: PartyMemberStatus | null;
}

export interface PartyMember {
  user: PartyUser;
  status: PartyMemberStatus;
  respondedAt?: string;
}

export interface PartyAnnouncement {
  id: string;
  text: string;
  createdAt: string;
  author: PartyUser;
}

/** GET /parties/:id payload — party + members (host also sees pending
 * requests / outstanding invites) + announcements (newest first). */
export interface PartyDetail extends Party {
  members: PartyMember[];
  announcements: PartyAnnouncement[];
}

export interface CreatePartyInput {
  title: string;
  description?: string;
  location?: string;
  startsAt?: string; // ISO
  visibility: PartyVisibility;
}

// POST /events/:id/parties — create a party; the creator becomes its HOST.
export async function createParty(eventId: string, input: CreatePartyInput): Promise<Party> {
  const response = await apiClient.post(`/events/${eventId}/parties`, input);
  return response.data;
}

// GET /events/:id/parties — public parties for the event, plus any INVITE
// parties you're a member of (any status).
export async function getEventParties(
  eventId: string,
  options?: { limit?: number; offset?: number },
): Promise<{ parties: Party[] }> {
  const response = await apiClient.get(`/events/${eventId}/parties`, { params: options });
  return response.data;
}

// GET /parties/:id — detail + members + announcements. INVITE parties 403
// for non-members.
export async function getParty(partyId: string): Promise<PartyDetail> {
  const response = await apiClient.get(`/parties/${partyId}`);
  return response.data;
}

// POST /parties/:id/join — request to join a PUBLIC party (→ REQUESTED) or
// accept your invite (INVITED → GOING). Idempotent for existing members.
export async function joinParty(partyId: string): Promise<{ status: PartyMemberStatus }> {
  const response = await apiClient.post(`/parties/${partyId}/join`);
  return response.data;
}

// POST /parties/:id/respond — host approves/declines a pending request.
export async function respondToRequest(
  partyId: string,
  userId: string,
  accept: boolean,
): Promise<{ userId: string; status: PartyMemberStatus }> {
  const response = await apiClient.post(`/parties/${partyId}/respond`, { userId, accept });
  return response.data;
}

// POST /parties/:id/invite — a host or co-host invites users (existing
// membership rows, any status, are left untouched).
export async function inviteToParty(
  partyId: string,
  userIds: string[],
): Promise<{ invited: number; notFound: string[] }> {
  const response = await apiClient.post(`/parties/${partyId}/invite`, { userIds });
  return response.data;
}

/** PATCH /parties/:id body — omitted fields are untouched; null clears the
 * optional ones. */
export interface UpdatePartyInput {
  title?: string;
  description?: string | null;
  location?: string | null;
  startsAt?: string | null; // ISO
  visibility?: PartyVisibility;
}

// PATCH /parties/:id — a host or co-host edits the party. Members are
// notified (party_update) server-side.
export async function updateParty(partyId: string, input: UpdatePartyInput): Promise<Party> {
  const response = await apiClient.patch(`/parties/${partyId}`, input);
  return response.data;
}

// POST /parties/:id/cancel — the original host soft-cancels (status
// CANCELLED, members notified). The party stays readable, struck through.
export async function cancelParty(partyId: string): Promise<{ id: string; status: PartyStatus }> {
  const response = await apiClient.post(`/parties/${partyId}/cancel`);
  return response.data;
}

// POST /parties/:id/cohosts — the original host promotes a GOING member to
// co-host (they're notified with party_cohost).
export async function promoteCohost(
  partyId: string,
  userId: string,
): Promise<{ userId: string; status: PartyMemberStatus }> {
  const response = await apiClient.post(`/parties/${partyId}/cohosts`, { userId });
  return response.data;
}

// POST /parties/:id/announcements — host posts an announcement.
export async function postPartyAnnouncement(
  partyId: string,
  text: string,
): Promise<PartyAnnouncement> {
  const response = await apiClient.post(`/parties/${partyId}/announcements`, { text });
  return response.data;
}

// DELETE /parties/:id — host deletes the party (members + announcements
// cascade server-side).
export async function deleteParty(partyId: string): Promise<void> {
  await apiClient.delete(`/parties/${partyId}`);
}

// ── Party group chat (members only — both endpoints 403 for outsiders) ──

export interface PartyMessage {
  id: string;
  text: string;
  author: PartyUser;
  createdAt: string; // ISO
}

// GET /parties/:id/messages — the party's group chat.
export async function getPartyMessages(partyId: string): Promise<{ messages: PartyMessage[] }> {
  const response = await apiClient.get(`/parties/${partyId}/messages`);
  return response.data;
}

// POST /parties/:id/messages — send a chat message.
export async function postPartyMessage(partyId: string, text: string): Promise<PartyMessage> {
  const response = await apiClient.post(`/parties/${partyId}/messages`, { text });
  return response.data;
}

// ── Plan tab: the viewer's party world ──────────────────────────────

export interface PartyLite {
  id: string;
  title: string;
  startsAt: string | null;
  location?: string | null;
  visibility: PartyVisibility;
  status: PartyStatus;
  event: {
    id: string;
    name: string;
    date: string;
    artist?: { name: string } | null;
    venue?: { name: string; city?: string | null } | null;
  };
  hostId: string;
  host: { id: string; username: string; avatarUrl?: string | null };
  goingCount: number;
  myStatus?: PartyMemberStatus | null;
}

export interface MyParties {
  hosting: PartyLite[];
  going: PartyLite[];
  invited: PartyLite[];
  requests: {
    party: PartyLite;
    requester: { id: string; username: string; displayName?: string | null; avatarUrl?: string | null };
  }[];
}

export async function getMyParties(): Promise<MyParties> {
  const res = await apiClient.get('/users/me/parties');
  return res.data as MyParties;
}
