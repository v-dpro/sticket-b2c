import { apiClient } from './client';
import type { DiscoveryData, Event } from '../../types/event';

export async function getDiscoveryFeed(city: string): Promise<DiscoveryData> {
  const response = await apiClient.get('/discover', {
    params: { city },
  });
  return response.data;
}

export async function getComingUpShows(limit: number = 20): Promise<Event[]> {
  const response = await apiClient.get('/discover/coming-up', {
    params: { limit },
  });
  return response.data;
}

export async function getFriendsGoingShows(limit: number = 20): Promise<Event[]> {
  const response = await apiClient.get('/discover/friends-going', {
    params: { limit },
  });
  return response.data;
}

export async function getPopularShows(city: string, limit: number = 10): Promise<Event[]> {
  const response = await apiClient.get('/discover/popular', {
    params: { city, limit },
  });
  return response.data;
}

export async function markInterested(eventId: string): Promise<void> {
  await apiClient.post(`/events/${eventId}/interested`);
}

export async function removeInterested(eventId: string): Promise<void> {
  await apiClient.delete(`/events/${eventId}/interested`);
}




