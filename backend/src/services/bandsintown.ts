import axios from 'axios';

const BANDSINTOWN_API = 'https://rest.bandsintown.com';
const APP_ID = process.env.BANDSINTOWN_APP_ID || 'sticket';

export interface BandsintownEvent {
  id: string;
  artist_id: string;
  url: string;
  datetime: string;
  title?: string;
  description?: string;
  venue: {
    name: string;
    city: string;
    region: string;
    country: string;
    latitude: string;
    longitude: string;
  };
  lineup: string[];
  offers?: { type: string; url: string; status: string }[];
}

export async function getBandsintownEventsForArtist(artistName: string): Promise<BandsintownEvent[]> {
  try {
    const encodedName = encodeURIComponent(artistName);
    const url = `${BANDSINTOWN_API}/artists/${encodedName}/events`;
    const res = await axios.get(url, { params: { app_id: APP_ID } });
    if (!Array.isArray(res.data)) return [];
    return res.data as BandsintownEvent[];
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Bandsintown fetch failed for ${artistName}:`, error);
    return [];
  }
}

export { axios as bandsintownHttp };



