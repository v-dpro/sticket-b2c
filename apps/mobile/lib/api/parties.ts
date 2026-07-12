// lib/api/parties.ts — typed client for the party (event meetup) endpoints.
//
// A Party is a host-run pre/post-show meetup attached to an Event.
// Membership states: HOST (creator), INVITED (host invited, hasn't answered),
// REQUESTED (asked to join a PUBLIC party), GOING (approved / accepted),
// DECLINED (host declined a request).
//
// NOTE: there is no leave-party endpoint yet — once GOING, a member stays on
// the list. The party page intentionally omits a "Can't make it" action.

import { apiClient } from './client';

export type PartyVisibility = 'PUBLIC' | 'INVITE';

export type PartyMemberStatus = 'HOST' | 'INVITED' | 'REQUESTED' | 'GOING' | 'DECLINED';

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
  createdAt: string;
  host: PartyUser;
  counts: PartyCounts;
  yourStatus: PartyMemberStatus | null;
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

// POST /parties/:id/invite — host invites users (existing membership rows,
// any status, are left untouched).
export async function inviteToParty(
  partyId: string,
  userIds: string[],
): Promise<{ invited: number; notFound: string[] }> {
  const response = await apiClient.post(`/parties/${partyId}/invite`, { userIds });
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
