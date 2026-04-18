const TM_API = 'https://app.ticketmaster.com/discovery/v2';
const API_KEY = process.env.TICKETMASTER_API_KEY || '';

export interface TMEvent {
  id: string;
  name: string;
  url: string;
  dates: {
    start: { localDate: string; localTime?: string; dateTime?: string };
  };
  images: Array<{ url: string; width: number; height: number; ratio?: string }>;
  _embedded?: {
    venues?: Array<{
      id: string;
      name: string;
      city?: { name: string };
      state?: { stateCode: string; name: string };
      country?: { countryCode: string; name: string };
      location?: { latitude: string; longitude: string };
    }>;
    attractions?: Array<{
      id: string;
      name: string;
      images?: Array<{ url: string; width: number; height: number }>;
      classifications?: Array<{ genre?: { name: string } }>;
    }>;
  };
  priceRanges?: Array<{ min: number; max: number; currency: string }>;
}

interface TMResponse {
  _embedded?: { events?: TMEvent[] };
  page?: { totalElements: number; totalPages: number };
}

function getBestImage(images: TMEvent['images']): string | null {
  const preferred = images.find((i) => i.ratio === '16_9' && i.width >= 600 && i.width <= 1200);
  return preferred?.url ?? images[0]?.url ?? null;
}

export function tmEventToStandard(e: TMEvent) {
  const venue = e._embedded?.venues?.[0];
  const attraction = e._embedded?.attractions?.[0];
  const dateStr = e.dates.start.dateTime ?? `${e.dates.start.localDate}T${e.dates.start.localTime ?? '20:00:00'}`;

  return {
    externalId: e.id,
    name: e.name,
    datetime: dateStr,
    url: e.url,
    imageUrl: getBestImage(e.images),
    artist: {
      name: attraction?.name ?? e.name,
      externalId: attraction?.id ?? null,
      imageUrl: attraction?.images ? getBestImage(attraction.images as TMEvent['images']) : null,
      genres: attraction?.classifications?.map((c) => c.genre?.name).filter(Boolean) as string[] ?? [],
    },
    venue: {
      name: venue?.name ?? 'TBA',
      city: venue?.city?.name ?? '',
      region: venue?.state?.stateCode ?? venue?.state?.name ?? '',
      country: venue?.country?.countryCode ?? venue?.country?.name ?? 'US',
      latitude: venue?.location?.latitude ?? '',
      longitude: venue?.location?.longitude ?? '',
    },
  };
}

export async function searchEvents(opts: {
  keyword?: string;
  city?: string;
  size?: number;
  startDateTime?: string;
}): Promise<ReturnType<typeof tmEventToStandard>[]> {
  if (!API_KEY) {
    console.warn('[Ticketmaster] No API key configured');
    return [];
  }

  const url = new URL(`${TM_API}/events.json`);
  url.searchParams.set('apikey', API_KEY);
  url.searchParams.set('classificationName', 'music');
  url.searchParams.set('sort', 'date,asc');
  url.searchParams.set('size', String(opts.size ?? 20));

  if (opts.keyword) url.searchParams.set('keyword', opts.keyword);
  if (opts.city) url.searchParams.set('city', opts.city);
  if (opts.startDateTime) {
    url.searchParams.set('startDateTime', opts.startDateTime);
  } else {
    url.searchParams.set('startDateTime', new Date().toISOString().replace(/\.\d+Z$/, 'Z'));
  }

  try {
    const res = await fetch(url.toString());
    if (!res.ok) {
      console.warn(`[Ticketmaster] HTTP ${res.status}`);
      return [];
    }
    const data = (await res.json()) as TMResponse;
    const events = data._embedded?.events ?? [];
    console.log(`[Ticketmaster] Found ${events.length} events for ${opts.keyword ?? opts.city ?? 'query'}`);
    return events.map(tmEventToStandard);
  } catch (err) {
    console.error('[Ticketmaster] Request failed:', err);
    return [];
  }
}

export async function searchEventsByArtists(artistNames: string[], size = 30): Promise<ReturnType<typeof tmEventToStandard>[]> {
  const batchSize = 3;
  const all: ReturnType<typeof tmEventToStandard>[] = [];

  for (let i = 0; i < artistNames.length; i += batchSize) {
    const batch = artistNames.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map((name) => searchEvents({ keyword: name, size: 5 })),
    );
    all.push(...results.flat());
  }

  return all
    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())
    .slice(0, size);
}

export async function searchAttractions(keyword: string, size = 10): Promise<Array<{
  id: string;
  name: string;
  imageUrl: string | null;
  genres: string[];
  upcomingEvents: number;
}>> {
  if (!API_KEY) return [];

  const url = new URL(`${TM_API}/attractions.json`);
  url.searchParams.set('apikey', API_KEY);
  url.searchParams.set('keyword', keyword);
  url.searchParams.set('classificationName', 'music');
  url.searchParams.set('size', String(size));

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const data = (await res.json()) as any;
    const items = data._embedded?.attractions ?? [];
    return items.map((a: any) => ({
      id: a.id,
      name: a.name,
      imageUrl: a.images ? getBestImage(a.images) : null,
      genres: a.classifications?.map((c: any) => c.genre?.name).filter(Boolean) ?? [],
      upcomingEvents: a.upcomingEvents?._total ?? 0,
    }));
  } catch {
    return [];
  }
}
