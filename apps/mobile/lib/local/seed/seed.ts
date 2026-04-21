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

type SeedLog = {
  id: string;
  userId: string;
  eventId: string;
  rating: number;
  note?: string;
  createdAt: string;
};

const artists: SeedArtist[] = [
  { id: 'artist_taylor', name: 'Taylor Swift', genres: ['pop'] },
  { id: 'artist_bts', name: 'BTS', genres: ['k-pop'] },
  { id: 'artist_newjeans', name: 'NewJeans', genres: ['k-pop'] },
  { id: 'artist_illenium', name: 'ILLENIUM', genres: ['edm'] },
  { id: 'artist_odesza', name: 'ODESZA', genres: ['edm'] },
  { id: 'artist_phoebe', name: 'Phoebe Bridgers', genres: ['indie', 'folk'] },
  { id: 'artist_mitski', name: 'Mitski', genres: ['indie', 'art rock'] },
  { id: 'artist_boygenius', name: 'boygenius', genres: ['indie rock'] },
  { id: 'artist_weeknd', name: 'The Weeknd', genres: ['r&b', 'pop'] },
  { id: 'artist_sza', name: 'SZA', genres: ['r&b', 'neo-soul'] },
  { id: 'artist_tameimpala', name: 'Tame Impala', genres: ['psychedelic rock'] },
  { id: 'artist_radiohead', name: 'Radiohead', genres: ['alternative', 'art rock'] },
  { id: 'artist_kendrick', name: 'Kendrick Lamar', genres: ['hip-hop'] },
  { id: 'artist_billie', name: 'Billie Eilish', genres: ['pop', 'alt pop'] },
  { id: 'artist_fka', name: 'FKA twigs', genres: ['art pop', 'electronic'] },
];

const venues: SeedVenue[] = [
  { id: 'venue_msg', name: 'Madison Square Garden', city: 'New York', state: 'NY', country: 'USA', capacity: 20789 },
  { id: 'venue_forum', name: 'Kia Forum', city: 'Inglewood', state: 'CA', country: 'USA', capacity: 17505 },
  { id: 'venue_redrocks', name: 'Red Rocks Amphitheatre', city: 'Morrison', state: 'CO', country: 'USA', capacity: 9525 },
  { id: 'venue_bowery', name: 'Bowery Ballroom', city: 'New York', state: 'NY', country: 'USA', capacity: 550 },
  { id: 'venue_webster', name: 'Webster Hall', city: 'New York', state: 'NY', country: 'USA', capacity: 1500 },
  { id: 'venue_terminal5', name: 'Terminal 5', city: 'New York', state: 'NY', country: 'USA', capacity: 3000 },
  { id: 'venue_barclays', name: 'Barclays Center', city: 'Brooklyn', state: 'NY', country: 'USA', capacity: 19000 },
  { id: 'venue_hollywood', name: 'Hollywood Bowl', city: 'Los Angeles', state: 'CA', country: 'USA', capacity: 17500 },
  { id: 'venue_gorge', name: 'The Gorge Amphitheatre', city: 'George', state: 'WA', country: 'USA', capacity: 27500 },
  { id: 'venue_brooklyn_mirage', name: 'Brooklyn Mirage', city: 'Brooklyn', state: 'NY', country: 'USA', capacity: 6000 },
];

function daysFromNow(d: number) {
  const dt = new Date();
  dt.setDate(dt.getDate() + d);
  return dt.toISOString();
}

function daysAgo(d: number) {
  const dt = new Date();
  dt.setDate(dt.getDate() - d);
  return dt.toISOString();
}

// Upcoming events
const upcomingEvents: SeedEvent[] = [
  { id: 'event_taylor_msg', name: 'Taylor Swift — The Eras Tour', date: daysFromNow(14), artistId: 'artist_taylor', venueId: 'venue_msg', source: 'seed' },
  { id: 'event_bts_forum', name: 'BTS — Yet To Come', date: daysFromNow(30), artistId: 'artist_bts', venueId: 'venue_forum', source: 'seed' },
  { id: 'event_illenium_rr', name: 'ILLENIUM — Red Rocks', date: daysFromNow(7), artistId: 'artist_illenium', venueId: 'venue_redrocks', source: 'seed' },
  { id: 'event_newjeans_forum', name: 'NewJeans — World Tour', date: daysFromNow(45), artistId: 'artist_newjeans', venueId: 'venue_forum', source: 'seed' },
  { id: 'event_weeknd_msg', name: 'The Weeknd — After Hours', date: daysFromNow(21), artistId: 'artist_weeknd', venueId: 'venue_msg', source: 'seed' },
  { id: 'event_billie_barclays', name: 'Billie Eilish — Hit Me Hard and Soft', date: daysFromNow(60), artistId: 'artist_billie', venueId: 'venue_barclays', source: 'seed' },
];

// Past events (for logged shows)
const pastEvents: SeedEvent[] = [
  { id: 'event_phoebe_bowery', name: 'Phoebe Bridgers — Reunion Tour', date: daysAgo(14), artistId: 'artist_phoebe', venueId: 'venue_bowery', source: 'seed' },
  { id: 'event_mitski_webster', name: 'Mitski — The Land Is Inhospitable', date: daysAgo(30), artistId: 'artist_mitski', venueId: 'venue_webster', source: 'seed' },
  { id: 'event_boygenius_terminal', name: 'boygenius — the record', date: daysAgo(45), artistId: 'artist_boygenius', venueId: 'venue_terminal5', source: 'seed' },
  { id: 'event_tame_hollywood', name: 'Tame Impala — Currents', date: daysAgo(75), artistId: 'artist_tameimpala', venueId: 'venue_hollywood', source: 'seed' },
  { id: 'event_sza_barclays', name: 'SZA — SOS Tour', date: daysAgo(90), artistId: 'artist_sza', venueId: 'venue_barclays', source: 'seed' },
  { id: 'event_radiohead_msg', name: 'Radiohead — A Moon Shaped Pool', date: daysAgo(120), artistId: 'artist_radiohead', venueId: 'venue_msg', source: 'seed' },
  { id: 'event_kendrick_forum', name: 'Kendrick Lamar — The Big Steppers', date: daysAgo(150), artistId: 'artist_kendrick', venueId: 'venue_forum', source: 'seed' },
  { id: 'event_odesza_gorge', name: 'ODESZA — The Last Goodbye', date: daysAgo(180), artistId: 'artist_odesza', venueId: 'venue_gorge', source: 'seed' },
  { id: 'event_fka_mirage', name: 'FKA twigs — CAPRISONGS', date: daysAgo(200), artistId: 'artist_fka', venueId: 'venue_brooklyn_mirage', source: 'seed' },
  { id: 'event_illenium_rr_past', name: 'ILLENIUM — Trilogy', date: daysAgo(240), artistId: 'artist_illenium', venueId: 'venue_redrocks', source: 'seed' },
  { id: 'event_taylor_forum', name: 'Taylor Swift — Midnights Tour', date: daysAgo(300), artistId: 'artist_taylor', venueId: 'venue_forum', source: 'seed' },
  { id: 'event_phoebe_webster', name: 'Phoebe Bridgers — Punisher', date: daysAgo(365), artistId: 'artist_phoebe', venueId: 'venue_webster', source: 'seed' },
];

const allEvents = [...upcomingEvents, ...pastEvents];

// Stock logged shows (past events the user attended)
const stockLogs: SeedLog[] = [
  { id: 'log_phoebe_bowery', userId: '', eventId: 'event_phoebe_bowery', rating: 5, note: 'Encore was unhinged. She played Motion Sickness twice and nobody wanted to leave.', createdAt: daysAgo(13) },
  { id: 'log_mitski_webster', userId: '', eventId: 'event_mitski_webster', rating: 5, note: 'The most emotionally devastating 75 minutes of my life. Washing Machine Heart live hits different.', createdAt: daysAgo(29) },
  { id: 'log_boygenius_terminal', userId: '', eventId: 'event_boygenius_terminal', rating: 5, note: 'Three of the best songwriters alive on one stage. Not Over You had the whole room in tears.', createdAt: daysAgo(44) },
  { id: 'log_tame_hollywood', userId: '', eventId: 'event_tame_hollywood', rating: 4, note: 'The visuals at Hollywood Bowl were otherworldly. Let It Happen with the confetti was peak.', createdAt: daysAgo(74) },
  { id: 'log_sza_barclays', userId: '', eventId: 'event_sza_barclays', rating: 4, note: 'Kill Bill live gave me chills. The stage setup was incredible.', createdAt: daysAgo(89) },
  { id: 'log_radiohead_msg', userId: '', eventId: 'event_radiohead_msg', rating: 5, note: 'Everything In Its Right Place opener into the full album. Best show of the year.', createdAt: daysAgo(119) },
  { id: 'log_kendrick_forum', userId: '', eventId: 'event_kendrick_forum', rating: 5, note: 'HUMBLE hit so hard the floor was shaking. He brought out Baby Keem.', createdAt: daysAgo(149) },
  { id: 'log_odesza_gorge', userId: '', eventId: 'event_odesza_gorge', rating: 5, note: 'The Gorge at sunset with ODESZA is a spiritual experience. Drumline finale was insane.', createdAt: daysAgo(179) },
  { id: 'log_fka_mirage', userId: '', eventId: 'event_fka_mirage', rating: 4, note: 'FKA twigs is a performer on another level. The choreography was mesmerizing.', createdAt: daysAgo(199) },
  { id: 'log_illenium_rr', userId: '', eventId: 'event_illenium_rr_past', rating: 5, note: 'Trilogy at Red Rocks. Three sets. Cried during Crawl Outta Love.', createdAt: daysAgo(239) },
  { id: 'log_taylor_forum', userId: '', eventId: 'event_taylor_forum', rating: 5, note: 'The Midnights set with the rain effect was magical. All Too Well 10min version live.', createdAt: daysAgo(299) },
  { id: 'log_phoebe_webster', userId: '', eventId: 'event_phoebe_webster', rating: 4, note: 'My first Phoebe show. Kyoto live was everything.', createdAt: daysAgo(364) },
];

export async function seedIfEmpty() {
  const db = await initDb();
  await db.execAsync('BEGIN IMMEDIATE;');
  try {
    const createdAt = nowIso();

    for (const a of artists) {
      await db.runAsync(
        'INSERT OR IGNORE INTO artists (id, name, image_url, genres, created_at) VALUES (?, ?, ?, ?, ?)',
        a.id, a.name, a.imageUrl ?? null, JSON.stringify(a.genres), createdAt
      );
    }

    for (const v of venues) {
      await db.runAsync(
        'INSERT OR IGNORE INTO venues (id, name, city, state, country, lat, lng, capacity, image_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        v.id, v.name, v.city, v.state ?? null, v.country, v.lat ?? null, v.lng ?? null, v.capacity ?? null, v.imageUrl ?? null, createdAt
      );
    }

    for (const e of allEvents) {
      await db.runAsync(
        'INSERT OR IGNORE INTO events (id, name, date, image_url, source, external_id, artist_id, venue_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        e.id, e.name, e.date, e.imageUrl ?? null, e.source ?? null, null, e.artistId, e.venueId, createdAt
      );
    }

    // Seed logs — get the current user ID from SecureStore
    // We'll fill in userId at runtime since we don't know it at seed time
    // The logs table uses user_id — if it's empty, skip log seeding
    const userRow = await db.getFirstAsync<{ id: string }>('SELECT id FROM users LIMIT 1');
    if (userRow) {
      for (const log of stockLogs) {
        await db.runAsync(
          'INSERT OR IGNORE INTO user_logs (id, user_id, event_id, rating, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          log.id, userRow.id, log.eventId, log.rating, log.note ?? null, log.createdAt, log.createdAt
        );
      }
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
