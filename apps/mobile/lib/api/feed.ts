import { apiClient } from './client';
import type { FeedComment, FeedItem, LogDetail } from '../../types/feed';

export type FeedResponse = {
  items: FeedItem[];
  nextCursor?: string | null;
  hasNoFriends?: boolean;
};

// Get social feed
export async function getFeed(options?: {
  limit?: number;
  before?: string; // cursor for pagination
}): Promise<FeedResponse> {
  const response = await apiClient.get('/feed', { params: options });
  return response.data;
}

// Get single log detail
export async function getLogDetail(logId: string): Promise<LogDetail> {
  const response = await apiClient.get(`/logs/${logId}`);
  return response.data;
}

// Add comment to log
export async function addComment(logId: string, text: string): Promise<FeedComment> {
  const response = await apiClient.post(`/logs/${logId}/comments`, { text });
  return response.data;
}

// Delete comment
export async function deleteComment(logId: string, commentId: string): Promise<void> {
  await apiClient.delete(`/logs/${logId}/comments/${commentId}`);
}

// Mark "I was there too"
export async function markWasThere(logId: string): Promise<void> {
  await apiClient.post(`/logs/${logId}/was-there`);
}

// Remove "I was there too"
export async function removeWasThere(logId: string): Promise<void> {
  await apiClient.delete(`/logs/${logId}/was-there`);
}

// Get comments for a log
export async function getLogComments(
  logId: string,
  options?: { limit?: number; offset?: number }
): Promise<FeedComment[]> {
  const response = await apiClient.get(`/logs/${logId}/comments`, { params: options });
  return response.data;
}



