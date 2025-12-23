import { initDb } from '../db';

function nowIso() {
  return new Date().toISOString();
}

type SeedArtist = { id: string; name: string; imageUrl?: string; genres: string[] };
type SeedVenue = {
  id: string;
  name: string;
  city: string;
  state?: string;
  country: string;
  lat?: number;
  lng?: number;
  capacity?: number;
  imageUrl?: string;
};

type SeedEvent = {
  id: string;
  name: string;
  date: string;
  artistId: string;
  venueId: string;
  imageUrl?: string;
  source?: string;
};

const artists: SeedArtist[] = [
  { id: 'artist_taylor', name: 'Taylor Swift', genres: ['pop'] },
  { id: 'artist_bts', name: 'BTS', genres: ['k-pop'] },
  { id: 'artist_newjeans', name: 'NewJeans', genres: ['k-pop'] },
  { id: 'artist_illenium', name: 'ILLENIUM', genres: ['edm'] },
  { id: 'artist_odesza', name: 'ODESZA', genres: ['edm'] },
];

const venues: SeedVenue[] = [
  { id: 'venue_msg', name: 'Madison Square Garden', city: 'New York', state: 'NY', country: 'USA' },
  { id: 'venue_forum', name: 'Kia Forum', city: 'Inglewood', state: 'CA', country: 'USA' },
  { id: 'venue_redrocks', name: 'Red Rocks Amphitheatre', city: 'Morrison', state: 'CO', country: 'USA' },
];

function daysFromNow(d: number) {
  const dt = new Date();
  dt.setDate(dt.getDate() + d);
  return dt.toISOString();
}

const events: SeedEvent[] = [
  {
    id: 'event_taylor_msg_1',
    name: 'Taylor Swift — The Eras Tour',
    date: daysFromNow(14),
    artistId: 'artist_taylor',
    venueId: 'venue_msg',
    source: 'seed',
  },
  {
    id: 'event_bts_forum_1',
    name: 'BTS — Live',
    date: daysFromNow(30),
    artistId: 'artist_bts',
    venueId: 'venue_forum',
    source: 'seed',
  },
  {
    id: 'event_illenium_redrocks_1',
    name: 'ILLENIUM — Red Rocks',
    date: daysFromNow(7),
    artistId: 'artist_illenium',
    venueId: 'venue_redrocks',
    source: 'seed',
  },
  {
    id: 'event_newjeans_forum_1',
    name: 'NewJeans — World Tour',
    date: daysFromNow(45),
    artistId: 'artist_newjeans',
    venueId: 'venue_forum',
    source: 'seed',
  },
];

export async function seedIfEmpty() {
  const db = await initDb();
  // Make seeding safe to run multiple times (and concurrently) by serializing with a write lock
  // and using "INSERT OR IGNORE" for deterministic IDs. We intentionally do not short-circuit
  // based on COUNT(*), so a partially applied seed (from a prior crash) can self-heal.
  await db.execAsync('BEGIN IMMEDIATE;');
  try {
    const createdAt = nowIso();

    for (const a of artists) {
      await db.runAsync(
        'INSERT OR IGNORE INTO artists (id, name, image_url, genres, created_at) VALUES (?, ?, ?, ?, ?)',
        a.id,
        a.name,
        a.imageUrl ?? null,
        JSON.stringify(a.genres),
        createdAt
      );
    }

    for (const v of venues) {
      await db.runAsync(
        'INSERT OR IGNORE INTO venues (id, name, city, state, country, lat, lng, capacity, image_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        v.id,
        v.name,
        v.city,
        v.state ?? null,
        v.country,
        v.lat ?? null,
        v.lng ?? null,
        v.capacity ?? null,
        v.imageUrl ?? null,
        createdAt
      );
    }

    for (const e of events) {
      await db.runAsync(
        'INSERT OR IGNORE INTO events (id, name, date, image_url, source, external_id, artist_id, venue_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        e.id,
        e.name,
        e.date,
        e.imageUrl ?? null,
        e.source ?? null,
        null,
        e.artistId,
        e.venueId,
        createdAt
      );
    }

    await db.execAsync('COMMIT;');
  } catch (e) {
    try {
      await db.execAsync('ROLLBACK;');
    } catch {
      // ignore rollback errors
    }
    throw e;
  }
}



