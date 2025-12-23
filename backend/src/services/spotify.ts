import axios from 'axios';

import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_URL = 'https://api.spotify.com/v1';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new AppError(`${name} is required`, 500);
  return v;
}

export type SpotifyTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export async function exchangeSpotifyCode(code: string): Promise<SpotifyTokens> {
  try {
    const response = await axios.post(
      SPOTIFY_TOKEN_URL,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: requireEnv('SPOTIFY_REDIRECT_URI'),
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${requireEnv('SPOTIFY_CLIENT_ID')}:${requireEnv('SPOTIFY_CLIENT_SECRET')}`).toString('base64')}`,
        },
      }
    );

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Spotify code exchange failed:', error);
    throw new AppError('Failed to exchange Spotify code', 400);
  }
}

export async function refreshSpotifyToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
  try {
    const response = await axios.post(
      SPOTIFY_TOKEN_URL,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${requireEnv('SPOTIFY_CLIENT_ID')}:${requireEnv('SPOTIFY_CLIENT_SECRET')}`).toString('base64')}`,
        },
      }
    );

    return {
      accessToken: response.data.access_token,
      expiresIn: response.data.expires_in,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Spotify token refresh failed:', error);
    throw new AppError('Failed to refresh Spotify token', 400);
  }
}

export async function getSpotifyProfile(accessToken: string): Promise<{
  id: string;
  email?: string;
  display_name?: string;
  images?: { url: string }[];
}> {
  try {
    const response = await axios.get(`${SPOTIFY_API_URL}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to get Spotify profile:', error);
    throw new AppError('Failed to get Spotify profile', 400);
  }
}

export async function getSpotifyTopArtists(
  accessToken: string,
  limit = 50,
  timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term'
): Promise<any[]> {
  try {
    const response = await axios.get(`${SPOTIFY_API_URL}/me/top/artists`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { limit, time_range: timeRange },
    });
    return response.data.items;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to get Spotify top artists:', error);
    return [];
  }
}

export async function handleSpotifyConnect(userId: string, code: string): Promise<{ success: boolean; topArtists: any[] }> {
  const tokens = await exchangeSpotifyCode(code);
  const profile = await getSpotifyProfile(tokens.accessToken);

  await prisma.user.update({
    where: { id: userId },
    data: {
      spotifyId: profile.id,
      spotifyUsername: profile.display_name ?? null,
      spotifyToken: tokens.accessToken,
      spotifyRefresh: tokens.refreshToken,
      spotifyTokenExpiry: new Date(Date.now() + tokens.expiresIn * 1000),
      ...(profile.images?.[0]?.url ? { avatarUrl: profile.images[0].url } : {}),
    },
  });

  const topArtists = await getSpotifyTopArtists(tokens.accessToken);

  for (const spotifyArtist of topArtists) {
    const artist = await prisma.artist.upsert({
      where: { spotifyId: spotifyArtist.id },
      update: {
        name: spotifyArtist.name,
        imageUrl: spotifyArtist.images?.[0]?.url,
        genres: spotifyArtist.genres || [],
      },
      create: {
        spotifyId: spotifyArtist.id,
        name: spotifyArtist.name,
        imageUrl: spotifyArtist.images?.[0]?.url,
        genres: spotifyArtist.genres || [],
      },
    });

    // Auto-follow up to 20 top artists.
    if (topArtists.indexOf(spotifyArtist) < 20) {
      await prisma.userArtistFollow.upsert({
        where: { userId_artistId: { userId, artistId: artist.id } },
        update: {},
        create: { userId, artistId: artist.id, notify: true },
      });
    }
  }

  return { success: true, topArtists };
}

export async function getUserWithFreshSpotifyToken(userId: string): Promise<{ user: any; spotifyToken: string | null }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user || !user.spotifyToken || !user.spotifyRefresh) {
    return { user, spotifyToken: null };
  }

  const isExpired = user.spotifyTokenExpiry && new Date(user.spotifyTokenExpiry).getTime() < Date.now() + 5 * 60 * 1000;

  if (isExpired) {
    try {
      const newTokens = await refreshSpotifyToken(user.spotifyRefresh);

      await prisma.user.update({
        where: { id: userId },
        data: {
          spotifyToken: newTokens.accessToken,
          spotifyTokenExpiry: new Date(Date.now() + newTokens.expiresIn * 1000),
        },
      });

      return { user, spotifyToken: newTokens.accessToken };
    } catch (error) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          spotifyToken: null,
          spotifyRefresh: null,
          spotifyTokenExpiry: null,
          spotifyId: null,
          spotifyUsername: null,
        },
      });
      return { user, spotifyToken: null };
    }
  }

  return { user, spotifyToken: user.spotifyToken };
}

export { axios as spotifyHttp };



