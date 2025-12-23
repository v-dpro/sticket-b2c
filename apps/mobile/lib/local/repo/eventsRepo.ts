import { initDb } from '../db';

export type Artist = { id: string; name: string; imageUrl: string | null; genres: string[] };
export type Venue = {
  id: string;
  name: string;
  city: string;
  state: string | null;
  country: string;
  imageUrl: string | null;
};

export type Event = {
  id: string;
  name: string;
  date: string;
  imageUrl: string | null;
  artist: Artist;
  venue: Venue;
};

function parseGenres(raw: string | null) {
  if (!raw) return [];
  try {
    const x = JSON.parse(raw);
    return Array.isArray(x) ? x.map(String) : [];
  } catch {
    return [];
  }
}

function rowToEvent(r: any): Event {
  return {
    id: r.event_id,
    name: r.event_name,
    date: r.event_date,
    imageUrl: r.event_image_url,
    artist: {
      id: r.artist_id,
      name: r.artist_name,
      imageUrl: r.artist_image_url,
      genres: parseGenres(r.artist_genres),
    },
    venue: {
      id: r.venue_id,
      name: r.venue_name,
      city: r.venue_city,
      state: r.venue_state,
      country: r.venue_country,
      imageUrl: r.venue_image_url,
    },
  };
}

export async function searchArtists(query: string): Promise<Artist[]> {
  const db = await initDb();
  const q = `%${query.trim()}%`;
  const rows = await db.getAllAsync<any>(
    'SELECT id, name, image_url, genres FROM artists WHERE name LIKE ? ORDER BY name LIMIT 25',
    q
  );
  return rows.map((r) => ({ id: r.id, name: r.name, imageUrl: r.image_url, genres: parseGenres(r.genres) }));
}

export async function searchVenues(query: string): Promise<Venue[]> {
  const db = await initDb();
  const q = `%${query.trim()}%`;
  const rows = await db.getAllAsync<any>(
    'SELECT id, name, city, state, country, image_url FROM venues WHERE name LIKE ? ORDER BY name LIMIT 25',
    q
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    city: r.city,
    state: r.state,
    country: r.country,
    imageUrl: r.image_url,
  }));
}

export async function searchEvents(query: string, city: string | null = null): Promise<Event[]> {
  const db = await initDb();
  const q = `%${query.trim()}%`;

  const params: any[] = [q, q, q];
  let where = '(e.name LIKE ? OR a.name LIKE ? OR v.name LIKE ?)';
  if (city) {
    where += ' AND v.city = ?';
    params.push(city);
  }

  const rows = await db.getAllAsync<any>(
    `
    SELECT
      e.id as event_id,
      e.name as event_name,
      e.date as event_date,
      e.image_url as event_image_url,
      a.id as artist_id,
      a.name as artist_name,
      a.image_url as artist_image_url,
      a.genres as artist_genres,
      v.id as venue_id,
      v.name as venue_name,
      v.city as venue_city,
      v.state as venue_state,
      v.country as venue_country,
      v.image_url as venue_image_url
    FROM events e
    JOIN artists a ON a.id = e.artist_id
    JOIN venues v ON v.id = e.venue_id
    WHERE ${where}
    ORDER BY e.date DESC
    LIMIT 25
    `,
    ...params
  );

  return rows.map(rowToEvent);
}

function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function createOrGetArtistByName(name: string): Promise<Artist> {
  const db = await initDb();
  const normalized = name.trim();
  if (!normalized) throw new Error('Artist name is required');

  const existing = await db.getFirstAsync<any>(
    'SELECT id, name, image_url, genres FROM artists WHERE lower(name) = lower(?) LIMIT 1',
    normalized
  );
  if (existing) {
    return { id: existing.id, name: existing.name, imageUrl: existing.image_url, genres: parseGenres(existing.genres) };
  }

  const id = newId('artist');
  const createdAt = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO artists (id, name, image_url, genres, created_at) VALUES (?, ?, ?, ?, ?)',
    id,
    normalized,
    null,
    JSON.stringify([]),
    createdAt
  );

  return { id, name: normalized, imageUrl: null, genres: [] };
}

export async function createOrGetVenue(params: {
  name: string;
  city: string;
  state?: string | null;
  country?: string;
}): Promise<Venue> {
  const db = await initDb();
  const name = params.name.trim();
  const city = params.city.trim();
  const state = (params.state ?? null)?.trim?.() ? String(params.state).trim() : null;
  const country = (params.country ?? 'USA').trim() || 'USA';

  if (!name) throw new Error('Venue name is required');
  if (!city) throw new Error('City is required');

  const existing = await db.getFirstAsync<any>(
    'SELECT id, name, city, state, country, image_url FROM venues WHERE lower(name) = lower(?) AND lower(city) = lower(?) LIMIT 1',
    name,
    city
  );
  if (existing) {
    return {
      id: existing.id,
      name: existing.name,
      city: existing.city,
      state: existing.state,
      country: existing.country,
      imageUrl: existing.image_url,
    };
  }

  const id = newId('venue');
  const createdAt = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO venues (id, name, city, state, country, lat, lng, capacity, image_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    id,
    name,
    city,
    state,
    country,
    null,
    null,
    null,
    null,
    createdAt
  );

  return { id, name, city, state, country, imageUrl: null };
}

export async function createOrGetEvent(params: {
  artistId: string;
  venueId: string;
  artistName: string;
  dateIso: string; // full ISO string
  imageUrl?: string | null;
  source?: string | null;
  externalId?: string | null;
}): Promise<Event> {
  const db = await initDb();
  const createdAt = new Date().toISOString();

  const existing = await db.getFirstAsync<any>(
    `
    SELECT
      e.id as event_id,
      e.name as event_name,
      e.date as event_date,
      e.image_url as event_image_url,
      a.id as artist_id,
      a.name as artist_name,
      a.image_url as artist_image_url,
      a.genres as artist_genres,
      v.id as venue_id,
      v.name as venue_name,
      v.city as venue_city,
      v.state as venue_state,
      v.country as venue_country,
      v.image_url as venue_image_url
    FROM events e
    JOIN artists a ON a.id = e.artist_id
    JOIN venues v ON v.id = e.venue_id
    WHERE e.artist_id = ? AND e.venue_id = ? AND e.date = ?
    LIMIT 1
    `,
    params.artistId,
    params.venueId,
    params.dateIso
  );
  if (existing) return rowToEvent(existing);

  const id = newId('event');
  const name = params.artistName.trim() || 'Show';
  await db.runAsync(
    'INSERT INTO events (id, name, date, image_url, source, external_id, artist_id, venue_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    id,
    name,
    params.dateIso,
    params.imageUrl ?? null,
    params.source ?? 'MANUAL',
    params.externalId ?? null,
    params.artistId,
    params.venueId,
    createdAt
  );

  // Load with joins for consistent shape
  const e = await getEventById(id);
  if (!e) throw new Error('Failed to create event');
  return e;
}

export async function getArtistById(artistId: string): Promise<Artist | null> {
  const db = await initDb();
  const row = await db.getFirstAsync<any>(
    'SELECT id, name, image_url, genres FROM artists WHERE id = ? LIMIT 1',
    artistId
  );
  if (!row) return null;
  return { id: row.id, name: row.name, imageUrl: row.image_url, genres: parseGenres(row.genres) };
}

export async function getVenueById(venueId: string): Promise<Venue | null> {
  const db = await initDb();
  const row = await db.getFirstAsync<any>(
    'SELECT id, name, city, state, country, image_url FROM venues WHERE id = ? LIMIT 1',
    venueId
  );
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    state: row.state,
    country: row.country,
    imageUrl: row.image_url,
  };
}

export async function getUpcomingEvents(city: string | null): Promise<Event[]> {
  const db = await initDb();
  const nowIso = new Date().toISOString();

  const params: any[] = [nowIso];
  let where = 'e.date >= ?';
  if (city) {
    where += ' AND v.city = ?';
    params.push(city);
  }

  const rows = await db.getAllAsync<any>(
    `
    SELECT
      e.id as event_id,
      e.name as event_name,
      e.date as event_date,
      e.image_url as event_image_url,
      a.id as artist_id,
      a.name as artist_name,
      a.image_url as artist_image_url,
      a.genres as artist_genres,
      v.id as venue_id,
      v.name as venue_name,
      v.city as venue_city,
      v.state as venue_state,
      v.country as venue_country,
      v.image_url as venue_image_url
    FROM events e
    JOIN artists a ON a.id = e.artist_id
    JOIN venues v ON v.id = e.venue_id
    WHERE ${where}
    ORDER BY e.date ASC
    LIMIT 50
    `,
    ...params
  );

  return rows.map(rowToEvent);
}

export async function getEventsByArtist(artistId: string): Promise<Event[]> {
  const db = await initDb();
  const rows = await db.getAllAsync<any>(
    `
    SELECT
      e.id as event_id,
      e.name as event_name,
      e.date as event_date,
      e.image_url as event_image_url,
      a.id as artist_id,
      a.name as artist_name,
      a.image_url as artist_image_url,
      a.genres as artist_genres,
      v.id as venue_id,
      v.name as venue_name,
      v.city as venue_city,
      v.state as venue_state,
      v.country as venue_country,
      v.image_url as venue_image_url
    FROM events e
    JOIN artists a ON a.id = e.artist_id
    JOIN venues v ON v.id = e.venue_id
    WHERE a.id = ?
    ORDER BY e.date DESC
    LIMIT 50
    `,
    artistId
  );

  return rows.map(rowToEvent);
}

export async function getEventsByVenue(venueId: string): Promise<Event[]> {
  const db = await initDb();
  const rows = await db.getAllAsync<any>(
    `
    SELECT
      e.id as event_id,
      e.name as event_name,
      e.date as event_date,
      e.image_url as event_image_url,
      a.id as artist_id,
      a.name as artist_name,
      a.image_url as artist_image_url,
      a.genres as artist_genres,
      v.id as venue_id,
      v.name as venue_name,
      v.city as venue_city,
      v.state as venue_state,
      v.country as venue_country,
      v.image_url as venue_image_url
    FROM events e
    JOIN artists a ON a.id = e.artist_id
    JOIN venues v ON v.id = e.venue_id
    WHERE v.id = ?
    ORDER BY e.date DESC
    LIMIT 100
    `,
    venueId
  );
  return rows.map(rowToEvent);
}

export async function getEventById(eventId: string): Promise<Event | null> {
  const db = await initDb();
  const r = await db.getFirstAsync<any>(
    `
    SELECT
      e.id as event_id,
      e.name as event_name,
      e.date as event_date,
      e.image_url as event_image_url,
      a.id as artist_id,
      a.name as artist_name,
      a.image_url as artist_image_url,
      a.genres as artist_genres,
      v.id as venue_id,
      v.name as venue_name,
      v.city as venue_city,
      v.state as venue_state,
      v.country as venue_country,
      v.image_url as venue_image_url
    FROM events e
    JOIN artists a ON a.id = e.artist_id
    JOIN venues v ON v.id = e.venue_id
    WHERE e.id = ?
    LIMIT 1
    `,
    eventId
  );
  if (!r) return null;
  return rowToEvent(r);
}



