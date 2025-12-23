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
  return res.data as { id: string; newBadges?: Badge[] };
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



