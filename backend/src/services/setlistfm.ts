import axios from 'axios';

import { AppError } from '../middleware/errorHandler';

const API_KEY = process.env.SETLISTFM_API_KEY;
const BASE_URL = 'https://api.setlist.fm/rest/1.0';

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    Accept: 'application/json',
    ...(API_KEY ? { 'x-api-key': API_KEY } : {}),
  },
});

export interface SetlistSong {
  name: string;
  info?: string;
  cover?: { name: string };
  tape?: boolean;
}

export interface Setlist {
  id: string;
  eventDate: string; // DD-MM-YYYY
  artist: { name: string; mbid?: string };
  venue: {
    name: string;
    city: { name: string; state?: string; country: { code: string } };
  };
  sets?: {
    set: Array<{ song?: SetlistSong[]; encore?: number }>;
  };
  url: string;
}

function requireSetlistKey() {
  if (!process.env.SETLISTFM_API_KEY) {
    throw new AppError('Setlist.fm is not configured on this server', 501);
  }
}

function toSetlistDate(date: Date): string {
  // Setlist.fm expects DD-MM-YYYY
  const [yyyy, mm, dd] = date.toISOString().slice(0, 10).split('-');
  return `${dd}-${mm}-${yyyy}`;
}

export async function searchSetlists(params: Record<string, string | number | undefined>) {
  requireSetlistKey();
  const response = await client.get('/search/setlists', { params });
  const setlists = (response.data?.setlist || []) as Setlist[];
  return setlists;
}

export async function getSetlist(setlistId: string): Promise<Setlist | null> {
  requireSetlistKey();
  try {
    const response = await client.get(`/setlist/${setlistId}`);
    return response.data as Setlist;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Setlist.fm get error:', error);
    return null;
  }
}

export function extractSongs(setlist: Setlist): Array<{ name: string; info?: string; isEncore: boolean }> {
  const songs: Array<{ name: string; info?: string; isEncore: boolean }> = [];

  const sets = setlist.sets?.set ?? [];
  for (const set of sets) {
    const isEncore = Boolean(set.encore && set.encore > 0);
    for (const song of set.song ?? []) {
      if ((song as any).tape) continue;
      songs.push({ name: song.name, info: song.info, isEncore });
    }
  }

  return songs;
}

export async function findSetlistForShow(artistName: string, venueName: string, date: Date): Promise<Setlist | null> {
  requireSetlistKey();
  try {
    const dateStr = toSetlistDate(date);
    const setlists = await searchSetlists({ artistName, date: dateStr, p: 1 });
    if (!setlists.length) return null;

    const venueLower = venueName.toLowerCase();
    const match =
      setlists.find((s) => s.venue?.name?.toLowerCase().includes(venueLower) || venueLower.includes(s.venue?.name?.toLowerCase() ?? '')) ??
      setlists[0];

    return match ?? null;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Setlist.fm find error:', error);
    return null;
  }
}

export async function getSetlistForEvent(artistName: string, venueName: string, date: Date) {
  const found = await findSetlistForShow(artistName, venueName, date);
  if (!found) return null;
  const full = await getSetlist(found.id);
  return full ?? found;
}

export { axios as setlistfmHttp };



