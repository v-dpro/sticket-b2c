import * as WebBrowser from 'expo-web-browser';

import { apiClient } from './api/client';

// The exact redirect the in-app auth session must watch for. Spotify redirects
// to the SERVER's registered SPOTIFY_REDIRECT_URI, which is the app scheme
// `sticket://spotify-callback` (app.json scheme = "sticket"). We must hardcode
// that scheme URL rather than Linking.createURL('spotify-callback'), which
// yields an `exp://…/--/spotify-callback` in Expo Go (never matches Spotify's
// sticket:// redirect) and can yield a triple-slash `sticket:///…` in a
// standalone build (also never matches). Matching the server verbatim is what
// lets openAuthSessionAsync capture the callback and hand back the `code`.
//
// TRADEOFF: OAuth only completes in standalone / dev-client / TestFlight builds
// where the `sticket://` deep link routes back into the app. In Expo Go the
// custom scheme can't be captured (Expo Go owns no `sticket://` scheme), so the
// session won't close — but that was already true with the old exp:// return
// URL, since the server always redirects to sticket://. No Expo Go regression.
export const SPOTIFY_REDIRECT_URI = 'sticket://spotify-callback';

export async function startSpotifyOAuth(): Promise<{ code: string } | null> {
  const { data } = await apiClient.get('/auth/spotify/url');
  const url = data?.url as string | undefined;
  if (!url) return null;

  const result = await WebBrowser.openAuthSessionAsync(url, SPOTIFY_REDIRECT_URI);
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



