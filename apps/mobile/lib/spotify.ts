import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { apiClient } from './api/client';

export async function startSpotifyOAuth(): Promise<{ code: string } | null> {
  const { data } = await apiClient.get('/auth/spotify/url');
  const url = data?.url as string | undefined;
  if (!url) return null;

  const redirectUrl = Linking.createURL('spotify-callback');
  const result = await WebBrowser.openAuthSessionAsync(url, redirectUrl);
  if (result.type !== 'success' || !result.url) return null;

  const code = result.url.match(/code=([^&]*)/)?.[1];
  if (!code) return null;

  return { code };
}

export async function finishSpotifyConnect(code: string) {
  const res = await apiClient.post('/auth/spotify/callback', { code });
  return res.data as any;
}

export async function getSpotifyTopArtists(params?: { limit?: number; time_range?: string }) {
  // Prefer the checklist route alias.
  const res = await apiClient.get('/users/me/spotify/top-artists', { params });
  return res.data as any;
}

export async function disconnectSpotify() {
  const res = await apiClient.post('/auth/spotify/disconnect');
  return res.data as { success: boolean };
}



