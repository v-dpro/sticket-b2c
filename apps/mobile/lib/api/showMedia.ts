import { apiClient } from './client';

export type ShowMedia = {
  id: string;
  uri: string;
  type: 'photo' | 'video';
  uploadedAt: string;
};

export async function uploadShowPhoto(eventId: string, uri: string, type: 'photo' | 'video'): Promise<ShowMedia> {
  const formData = new FormData();

  const filename = uri.split('/').pop() || (type === 'video' ? 'video.mp4' : 'photo.jpg');
  const match = /\.(\w+)$/.exec(filename);
  const inferred = match ? match[1].toLowerCase() : null;

  const mime =
    type === 'video'
      ? 'video/mp4'
      : inferred === 'png'
        ? 'image/png'
        : inferred === 'webp'
          ? 'image/webp'
          : 'image/jpeg';

  formData.append('file', { uri, name: filename, type: mime } as any);
  formData.append('eventId', eventId);
  formData.append('type', type);

  const response = await apiClient.post('/show-media/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data;
}

export async function getShowPhotos(eventId: string): Promise<ShowMedia[]> {
  const response = await apiClient.get(`/show-media/${eventId}`);
  return response.data;
}

export async function deleteShowPhoto(mediaId: string): Promise<void> {
  await apiClient.delete(`/show-media/${mediaId}`);
}



