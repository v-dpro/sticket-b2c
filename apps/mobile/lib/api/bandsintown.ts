import axios from 'axios';

const BANDSINTOWN_API = 'https://rest.bandsintown.com';
const APP_ID = process.env.EXPO_PUBLIC_BANDSINTOWN_APP_ID || 'sticket';

export interface BandsintownEvent {
  id: string;
  artist_id: string;
  url: string;
  datetime: string;
  title: string;
  description: string;
  venue: {
    name: string;
    city: string;
    region: string;
    country: string;
    latitude: string;
    longitude: string;
  };
  lineup: string[];
  offers: { type: string; url: string; status: string }[];
}

export async function getArtistEvents(artistName: string): Promise<BandsintownEvent[]> {
  try {
    const encodedName = encodeURIComponent(artistName);
    const response = await axios.get(`${BANDSINTOWN_API}/artists/${encodedName}/events`, {
      params: { app_id: APP_ID },
    });
    return response.data || [];
  } catch (error) {
    console.error(`Failed to fetch events for ${artistName}:`, error);
    return [];
  }
}

export async function getEventsForMultipleArtists(artistNames: string[], limit: number = 20): Promise<BandsintownEvent[]> {
  const batchSize = 5;
  const allEvents: BandsintownEvent[] = [];

  for (let i = 0; i < artistNames.length; i += batchSize) {
    const batch = artistNames.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(getArtistEvents));
    allEvents.push(...results.flat());
  }

  return allEvents
    .filter((e) => new Date(e.datetime) > new Date())
    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())
    .slice(0, limit);
}




