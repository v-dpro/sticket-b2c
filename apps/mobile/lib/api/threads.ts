// lib/api/threads.ts — tour discussion threads (Reddit-lite v1).
//
// GET  /tours/:id/threads    — thread list for a tour.
// POST /tours/:id/threads    — start a thread {title, text?}.
// GET  /threads/:id          — thread detail + its messages.
// POST /threads/:id/messages — reply {text}.
// POST /threads/:id/report   — report the thread or one message → 204.
//
// The backend is landing in parallel — screens built on this module
// degrade to their empty/error states until the routes exist.

import { apiClient } from './client';
import type { FacePerson } from '../../components/ui/DegreeFacepile';

export interface ThreadSummary {
  id: string;
  title: string;
  author: FacePerson;
  messageCount: number;
  lastActivityAt: string; // ISO
  createdAt: string; // ISO
}

export interface ThreadMessage {
  id: string;
  text: string;
  author: FacePerson;
  createdAt: string; // ISO
}

export interface ThreadDetail {
  id: string;
  title: string;
  tourId: string;
  author: FacePerson;
  messages: ThreadMessage[];
}

export async function getTourThreads(tourId: string): Promise<{ threads: ThreadSummary[] }> {
  const response = await apiClient.get(`/tours/${tourId}/threads`);
  return response.data;
}

export async function createTourThread(
  tourId: string,
  input: { title: string; text?: string },
): Promise<ThreadSummary> {
  const response = await apiClient.post(`/tours/${tourId}/threads`, input);
  return response.data;
}

export async function getThread(threadId: string): Promise<ThreadDetail> {
  const response = await apiClient.get(`/threads/${threadId}`);
  return response.data;
}

export async function postThreadMessage(threadId: string, text: string): Promise<ThreadMessage> {
  const response = await apiClient.post(`/threads/${threadId}/messages`, { text });
  return response.data;
}

// Report the thread itself (no messageId) or a single message within it.
export async function reportInThread(
  threadId: string,
  input?: { messageId?: string; reason?: string },
): Promise<void> {
  await apiClient.post(`/threads/${threadId}/report`, input ?? {});
}
