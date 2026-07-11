// ---------------------------------------------------------------------------
// Sticket API — STOCK CATALOG seed
//
// Populates a searchable, real-world catalog of artists / venues / tours /
// events so the app can be used to search shows and log them, independent
// of any user/log/photo data. Fully idempotent: every row is written with a
// deterministic id (or stable natural unique key) via `upsert`, so re-runs
// converge on the same dataset instead of duplicating rows. No `new Date()`
// / `Math.random()` is used anywhere below — every date is a fixed calendar
// date baked into this file — so re-running the script is byte-for-byte
// idempotent regardless of what day it's actually run on.
//
// Catalog-only: this script never touches User / UserLog / LogPhoto / etc.
//
// Run with:  npm run db:seed:catalog
// ---------------------------------------------------------------------------

import 'dotenv/config';

import { prisma } from '../src/lib/prisma.js';

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** UTC calendar date at a fixed 19:30 show time (no timezone, no "now"). */
function d(iso: string): Date {
  const dt = new Date(`${iso}T19:30:00.000Z`);
  dt.setUTCHours(19, 30, 0, 0);
  return dt;
}

/** Evenly spread `count` show dates (inclusive) across [start, end]. */
function spreadDates(start: Date, end: Date, count: number): Date[] {
  const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000));
  const dates: Date[] = [];
  for (let i = 0; i < count; i++) {
    const dayOffset = count === 1 ? 0 : Math.round((i * totalDays) / (count - 1));
    const dt = new Date(start.getTime() + dayOffset * 86_400_000);
    dt.setUTCHours(19, 30, 0, 0);
    dates.push(dt);
  }
  return dates;
}

// ---------------------------------------------------------------------------
// Venue pools (by genre / scale) — reused for both tour-date and one-off
// venue assignment so a given artist always plays plausible rooms.
// ---------------------------------------------------------------------------

type VenuePool = 'STADIUM_POP' | 'ARENA_ROCK_INDIE' | 'ARENA_HIPHOP' | 'EDM' | 'COUNTRY' | 'LATIN';

const VENUE_POOLS: Record<VenuePool, string[]> = {
  STADIUM_POP: ['cat-venue-msg', 'cat-venue-sofi-stadium', 'cat-venue-wembley-stadium', 'cat-venue-metlife-stadium', 'cat-venue-the-o2', 'cat-venue-crypto-com-arena', 'cat-venue-accor-arena', 'cat-venue-barclays-center'],
  ARENA_ROCK_INDIE: ['cat-venue-radio-city', 'cat-venue-terminal-5', 'cat-venue-the-fillmore', 'cat-venue-brooklyn-mirage', 'cat-venue-msg', 'cat-venue-united-center', 'cat-venue-the-o2', 'cat-venue-kia-forum'],
  ARENA_HIPHOP: ['cat-venue-barclays-center', 'cat-venue-crypto-com-arena', 'cat-venue-united-center', 'cat-venue-the-o2', 'cat-venue-scotiabank-arena', 'cat-venue-msg', 'cat-venue-kia-forum'],
  EDM: ['cat-venue-sphere', 'cat-venue-brooklyn-mirage', 'cat-venue-the-gorge', 'cat-venue-red-rocks', 'cat-venue-kia-forum'],
  COUNTRY: ['cat-venue-bridgestone-arena', 'cat-venue-ryman-auditorium', 'cat-venue-moody-center', 'cat-venue-fenway-park', 'cat-venue-united-center'],
  LATIN: ['cat-venue-kia-forum', 'cat-venue-crypto-com-arena', 'cat-venue-sofi-stadium', 'cat-venue-accor-arena', 'cat-venue-united-center'],
};

// ---------------------------------------------------------------------------
// Artists (~60), real acts touring 2025-2027
// ---------------------------------------------------------------------------

type SeedArtist = { id: string; name: string; genres: string[]; pool: VenuePool };

const ARTISTS: SeedArtist[] = [
  // --- pop / stadium ---
  { id: 'cat-artist-taylor-swift', name: 'Taylor Swift', genres: ['pop'], pool: 'STADIUM_POP' },
  { id: 'cat-artist-beyonce', name: 'Beyoncé', genres: ['pop', 'r&b'], pool: 'STADIUM_POP' },
  { id: 'cat-artist-olivia-rodrigo', name: 'Olivia Rodrigo', genres: ['pop', 'pop rock'], pool: 'STADIUM_POP' },
  { id: 'cat-artist-sabrina-carpenter', name: 'Sabrina Carpenter', genres: ['pop'], pool: 'STADIUM_POP' },
  { id: 'cat-artist-billie-eilish', name: 'Billie Eilish', genres: ['pop', 'alt-pop'], pool: 'STADIUM_POP' },
  { id: 'cat-artist-dua-lipa', name: 'Dua Lipa', genres: ['pop', 'dance'], pool: 'STADIUM_POP' },
  { id: 'cat-artist-the-weeknd', name: 'The Weeknd', genres: ['pop', 'r&b'], pool: 'STADIUM_POP' },
  { id: 'cat-artist-bad-bunny', name: 'Bad Bunny', genres: ['reggaeton', 'latin trap'], pool: 'LATIN' },
  // --- rock / indie ---
  { id: 'cat-artist-arctic-monkeys', name: 'Arctic Monkeys', genres: ['indie rock', 'alternative'], pool: 'ARENA_ROCK_INDIE' },
  { id: 'cat-artist-oasis', name: 'Oasis', genres: ['britpop', 'rock'], pool: 'STADIUM_POP' },
  { id: 'cat-artist-the-1975', name: 'The 1975', genres: ['indie pop', 'rock'], pool: 'ARENA_ROCK_INDIE' },
  { id: 'cat-artist-phoebe-bridgers', name: 'Phoebe Bridgers', genres: ['indie', 'folk'], pool: 'ARENA_ROCK_INDIE' },
  { id: 'cat-artist-boygenius', name: 'boygenius', genres: ['indie rock', 'folk'], pool: 'ARENA_ROCK_INDIE' },
  { id: 'cat-artist-turnstile', name: 'Turnstile', genres: ['hardcore punk', 'rock'], pool: 'ARENA_ROCK_INDIE' },
  { id: 'cat-artist-fontaines-dc', name: 'Fontaines D.C.', genres: ['post-punk', 'rock'], pool: 'ARENA_ROCK_INDIE' },
  // --- hip-hop / R&B ---
  { id: 'cat-artist-kendrick-lamar', name: 'Kendrick Lamar', genres: ['hip-hop'], pool: 'STADIUM_POP' },
  { id: 'cat-artist-tyler-the-creator', name: 'Tyler, The Creator', genres: ['hip-hop', 'alternative rap'], pool: 'ARENA_HIPHOP' },
  { id: 'cat-artist-travis-scott', name: 'Travis Scott', genres: ['hip-hop', 'trap'], pool: 'ARENA_HIPHOP' },
  { id: 'cat-artist-doja-cat', name: 'Doja Cat', genres: ['pop', 'hip-hop'], pool: 'ARENA_HIPHOP' },
  { id: 'cat-artist-sza', name: 'SZA', genres: ['r&b', 'neo-soul'], pool: 'ARENA_HIPHOP' },
  { id: 'cat-artist-frank-ocean', name: 'Frank Ocean', genres: ['r&b', 'alternative'], pool: 'ARENA_HIPHOP' },
  // --- EDM / DJs ---
  { id: 'cat-artist-fred-again', name: 'Fred again..', genres: ['edm', 'electronic'], pool: 'EDM' },
  { id: 'cat-artist-fisher', name: 'Fisher', genres: ['tech house'], pool: 'EDM' },
  { id: 'cat-artist-charlotte-de-witte', name: 'Charlotte de Witte', genres: ['techno'], pool: 'EDM' },
  { id: 'cat-artist-skrillex', name: 'Skrillex', genres: ['dubstep', 'edm'], pool: 'EDM' },
  { id: 'cat-artist-john-summit', name: 'John Summit', genres: ['house'], pool: 'EDM' },
  { id: 'cat-artist-dom-dolla', name: 'Dom Dolla', genres: ['house'], pool: 'EDM' },
  { id: 'cat-artist-anyma', name: 'Anyma', genres: ['melodic techno'], pool: 'EDM' },
  { id: 'cat-artist-peggy-gou', name: 'Peggy Gou', genres: ['house', 'electronic'], pool: 'EDM' },
  // --- country ---
  { id: 'cat-artist-zach-bryan', name: 'Zach Bryan', genres: ['country', 'folk'], pool: 'COUNTRY' },
  { id: 'cat-artist-morgan-wallen', name: 'Morgan Wallen', genres: ['country'], pool: 'COUNTRY' },
  { id: 'cat-artist-chris-stapleton', name: 'Chris Stapleton', genres: ['country', 'southern rock'], pool: 'COUNTRY' },
  // --- latin ---
  { id: 'cat-artist-karol-g', name: 'Karol G', genres: ['reggaeton', 'latin pop'], pool: 'LATIN' },
  { id: 'cat-artist-rauw-alejandro', name: 'Rauw Alejandro', genres: ['reggaeton', 'r&b'], pool: 'LATIN' },
  // --- more, to reach ~60 ---
  { id: 'cat-artist-ariana-grande', name: 'Ariana Grande', genres: ['pop', 'r&b'], pool: 'STADIUM_POP' },
  { id: 'cat-artist-harry-styles', name: 'Harry Styles', genres: ['pop rock'], pool: 'STADIUM_POP' },
  { id: 'cat-artist-ed-sheeran', name: 'Ed Sheeran', genres: ['pop', 'folk pop'], pool: 'STADIUM_POP' },
  { id: 'cat-artist-coldplay', name: 'Coldplay', genres: ['rock', 'pop'], pool: 'STADIUM_POP' },
  { id: 'cat-artist-post-malone', name: 'Post Malone', genres: ['hip-hop', 'pop'], pool: 'ARENA_HIPHOP' },
  { id: 'cat-artist-chappell-roan', name: 'Chappell Roan', genres: ['pop', 'synth-pop'], pool: 'ARENA_ROCK_INDIE' },
  { id: 'cat-artist-benson-boone', name: 'Benson Boone', genres: ['pop', 'pop rock'], pool: 'STADIUM_POP' },
  { id: 'cat-artist-lady-gaga', name: 'Lady Gaga', genres: ['pop', 'dance'], pool: 'STADIUM_POP' },
  { id: 'cat-artist-the-strokes', name: 'The Strokes', genres: ['indie rock', 'garage rock'], pool: 'ARENA_ROCK_INDIE' },
  { id: 'cat-artist-vampire-weekend', name: 'Vampire Weekend', genres: ['indie rock'], pool: 'ARENA_ROCK_INDIE' },
  { id: 'cat-artist-king-gizzard', name: 'King Gizzard & the Lizard Wizard', genres: ['psychedelic rock', 'garage rock'], pool: 'ARENA_ROCK_INDIE' },
  { id: 'cat-artist-wet-leg', name: 'Wet Leg', genres: ['indie rock', 'post-punk'], pool: 'ARENA_ROCK_INDIE' },
  { id: 'cat-artist-idles', name: 'IDLES', genres: ['post-punk', 'punk'], pool: 'ARENA_ROCK_INDIE' },
  { id: 'cat-artist-the-killers', name: 'The Killers', genres: ['rock', 'alternative'], pool: 'ARENA_ROCK_INDIE' },
  { id: 'cat-artist-foo-fighters', name: 'Foo Fighters', genres: ['rock', 'alternative'], pool: 'ARENA_ROCK_INDIE' },
  { id: 'cat-artist-greta-van-fleet', name: 'Greta Van Fleet', genres: ['rock', 'hard rock'], pool: 'ARENA_ROCK_INDIE' },
  { id: 'cat-artist-drake', name: 'Drake', genres: ['hip-hop', 'r&b'], pool: 'ARENA_HIPHOP' },
  { id: 'cat-artist-j-cole', name: 'J. Cole', genres: ['hip-hop'], pool: 'ARENA_HIPHOP' },
  { id: 'cat-artist-playboi-carti', name: 'Playboi Carti', genres: ['hip-hop', 'trap'], pool: 'ARENA_HIPHOP' },
  { id: 'cat-artist-chris-brown', name: 'Chris Brown', genres: ['r&b', 'pop'], pool: 'ARENA_HIPHOP' },
  { id: 'cat-artist-summer-walker', name: 'Summer Walker', genres: ['r&b'], pool: 'ARENA_HIPHOP' },
  { id: 'cat-artist-kaskade', name: 'Kaskade', genres: ['house', 'edm'], pool: 'EDM' },
  { id: 'cat-artist-diplo', name: 'Diplo', genres: ['edm', 'electronic'], pool: 'EDM' },
  { id: 'cat-artist-luke-combs', name: 'Luke Combs', genres: ['country'], pool: 'COUNTRY' },
  { id: 'cat-artist-kacey-musgraves', name: 'Kacey Musgraves', genres: ['country', 'pop'], pool: 'COUNTRY' },
  { id: 'cat-artist-peso-pluma', name: 'Peso Pluma', genres: ['corridos tumbados', 'regional mexican'], pool: 'LATIN' },
];

// ---------------------------------------------------------------------------
// Venues (~25), real rooms with correct city/state/country/capacity
// ---------------------------------------------------------------------------

type SeedVenue = { id: string; name: string; city: string; state: string | null; country: string; capacity: number };

const VENUES: SeedVenue[] = [
  { id: 'cat-venue-msg', name: 'Madison Square Garden', city: 'New York', state: 'NY', country: 'USA', capacity: 20789 },
  { id: 'cat-venue-barclays-center', name: 'Barclays Center', city: 'Brooklyn', state: 'NY', country: 'USA', capacity: 19000 },
  { id: 'cat-venue-kia-forum', name: 'Kia Forum', city: 'Inglewood', state: 'CA', country: 'USA', capacity: 17505 },
  { id: 'cat-venue-crypto-com-arena', name: 'Crypto.com Arena', city: 'Los Angeles', state: 'CA', country: 'USA', capacity: 19068 },
  { id: 'cat-venue-hollywood-bowl', name: 'Hollywood Bowl', city: 'Los Angeles', state: 'CA', country: 'USA', capacity: 17500 },
  { id: 'cat-venue-shrine-auditorium', name: 'Shrine Auditorium', city: 'Los Angeles', state: 'CA', country: 'USA', capacity: 6300 },
  { id: 'cat-venue-red-rocks', name: 'Red Rocks Amphitheatre', city: 'Morrison', state: 'CO', country: 'USA', capacity: 9525 },
  { id: 'cat-venue-the-gorge', name: 'The Gorge Amphitheatre', city: 'George', state: 'WA', country: 'USA', capacity: 27500 },
  { id: 'cat-venue-sphere', name: 'Sphere', city: 'Las Vegas', state: 'NV', country: 'USA', capacity: 17500 },
  { id: 'cat-venue-united-center', name: 'United Center', city: 'Chicago', state: 'IL', country: 'USA', capacity: 20917 },
  { id: 'cat-venue-wembley-stadium', name: 'Wembley Stadium', city: 'London', state: null, country: 'United Kingdom', capacity: 90000 },
  { id: 'cat-venue-the-o2', name: 'The O2', city: 'London', state: null, country: 'United Kingdom', capacity: 20000 },
  { id: 'cat-venue-sofi-stadium', name: 'SoFi Stadium', city: 'Inglewood', state: 'CA', country: 'USA', capacity: 70240 },
  { id: 'cat-venue-metlife-stadium', name: 'MetLife Stadium', city: 'East Rutherford', state: 'NJ', country: 'USA', capacity: 82500 },
  { id: 'cat-venue-fenway-park', name: 'Fenway Park', city: 'Boston', state: 'MA', country: 'USA', capacity: 37755 },
  { id: 'cat-venue-radio-city', name: 'Radio City Music Hall', city: 'New York', state: 'NY', country: 'USA', capacity: 5960 },
  { id: 'cat-venue-brooklyn-mirage', name: 'Brooklyn Mirage', city: 'Brooklyn', state: 'NY', country: 'USA', capacity: 6000 },
  { id: 'cat-venue-terminal-5', name: 'Terminal 5', city: 'New York', state: 'NY', country: 'USA', capacity: 3000 },
  { id: 'cat-venue-the-fillmore', name: 'The Fillmore', city: 'San Francisco', state: 'CA', country: 'USA', capacity: 1150 },
  { id: 'cat-venue-ryman-auditorium', name: 'Ryman Auditorium', city: 'Nashville', state: 'TN', country: 'USA', capacity: 2362 },
  { id: 'cat-venue-bridgestone-arena', name: 'Bridgestone Arena', city: 'Nashville', state: 'TN', country: 'USA', capacity: 19395 },
  { id: 'cat-venue-moody-center', name: 'Moody Center', city: 'Austin', state: 'TX', country: 'USA', capacity: 15000 },
  { id: 'cat-venue-climate-pledge-arena', name: 'Climate Pledge Arena', city: 'Seattle', state: 'WA', country: 'USA', capacity: 18100 },
  { id: 'cat-venue-scotiabank-arena', name: 'Scotiabank Arena', city: 'Toronto', state: 'ON', country: 'Canada', capacity: 19800 },
  { id: 'cat-venue-accor-arena', name: 'Accor Arena', city: 'Paris', state: null, country: 'France', capacity: 20300 },
];

// ---------------------------------------------------------------------------
// Tours (~20 majors) — plausible names, date ranges anchored to "today" ~=
// 2026-07-11, so the mix of dates below reads as ~60% already-happened /
// ~40% still-upcoming once combined with the one-off events further down.
// ---------------------------------------------------------------------------

type SeedTour = { id: string; artistId: string; name: string; year: number; startDate: Date; endDate: Date; dateCount: number };

const TOURS: SeedTour[] = [
  { id: 'cat-tour-taylor-swift-eras', artistId: 'cat-artist-taylor-swift', name: 'The Eras Tour', year: 2024, startDate: d('2024-06-07'), endDate: d('2024-12-08'), dateCount: 12 },
  { id: 'cat-tour-beyonce-cowboy-carter', artistId: 'cat-artist-beyonce', name: 'Cowboy Carter Tour', year: 2025, startDate: d('2025-04-28'), endDate: d('2025-07-26'), dateCount: 10 },
  { id: 'cat-tour-olivia-rodrigo-guts', artistId: 'cat-artist-olivia-rodrigo', name: 'GUTS World Tour', year: 2025, startDate: d('2024-02-23'), endDate: d('2025-06-06'), dateCount: 8 },
  { id: 'cat-tour-sabrina-carpenter-short-n-sweet', artistId: 'cat-artist-sabrina-carpenter', name: "Short n' Sweet Tour", year: 2024, startDate: d('2024-09-23'), endDate: d('2025-05-17'), dateCount: 9 },
  { id: 'cat-tour-billie-eilish-hit-me-hard-and-soft', artistId: 'cat-artist-billie-eilish', name: 'Hit Me Hard and Soft: The Tour', year: 2025, startDate: d('2025-09-29'), endDate: d('2026-11-15'), dateCount: 10 },
  { id: 'cat-tour-dua-lipa-radical-optimism', artistId: 'cat-artist-dua-lipa', name: 'Radical Optimism Tour', year: 2024, startDate: d('2024-11-04'), endDate: d('2025-11-15'), dateCount: 8 },
  { id: 'cat-tour-the-weeknd-after-hours-encore', artistId: 'cat-artist-the-weeknd', name: 'After Hours Til Dawn: Encore', year: 2026, startDate: d('2026-05-01'), endDate: d('2026-12-20'), dateCount: 10 },
  { id: 'cat-tour-bad-bunny-debi-tirar-mas-fotos', artistId: 'cat-artist-bad-bunny', name: 'Debí Tirar Más Fotos World Tour', year: 2025, startDate: d('2025-11-21'), endDate: d('2026-12-05'), dateCount: 12 },
  { id: 'cat-tour-arctic-monkeys-the-car-redux', artistId: 'cat-artist-arctic-monkeys', name: 'The Car Tour: Redux', year: 2026, startDate: d('2026-09-01'), endDate: d('2027-03-01'), dateCount: 9 },
  { id: 'cat-tour-oasis-live-27', artistId: 'cat-artist-oasis', name: "Oasis Live '27", year: 2027, startDate: d('2027-01-15'), endDate: d('2027-07-30'), dateCount: 14 },
  { id: 'cat-tour-the-1975-still-at-their-very-best', artistId: 'cat-artist-the-1975', name: 'Still... At Their Very Best Tour', year: 2025, startDate: d('2025-05-01'), endDate: d('2025-12-15'), dateCount: 7 },
  { id: 'cat-tour-turnstile-never-enough', artistId: 'cat-artist-turnstile', name: 'Never Enough Tour', year: 2025, startDate: d('2025-03-01'), endDate: d('2025-10-01'), dateCount: 6 },
  { id: 'cat-tour-kendrick-lamar-grand-national', artistId: 'cat-artist-kendrick-lamar', name: 'Grand National Tour', year: 2025, startDate: d('2025-04-19'), endDate: d('2025-08-30'), dateCount: 9 },
  { id: 'cat-tour-zach-bryan-quittin-time', artistId: 'cat-artist-zach-bryan', name: 'The Quittin Time Tour', year: 2025, startDate: d('2025-04-01'), endDate: d('2025-10-01'), dateCount: 9 },
  { id: 'cat-tour-travis-scott-usb', artistId: 'cat-artist-travis-scott', name: 'USB Tour', year: 2026, startDate: d('2026-08-01'), endDate: d('2027-02-01'), dateCount: 10 },
  { id: 'cat-tour-tyler-the-creator-chromakopia', artistId: 'cat-artist-tyler-the-creator', name: 'Chromakopia: The World Tour', year: 2025, startDate: d('2025-01-31'), endDate: d('2025-06-15'), dateCount: 7 },
  { id: 'cat-tour-doja-cat-ma-vie', artistId: 'cat-artist-doja-cat', name: 'Ma Vie World Tour', year: 2025, startDate: d('2025-08-01'), endDate: d('2025-12-01'), dateCount: 8 },
  { id: 'cat-tour-fred-again-ten-days', artistId: 'cat-artist-fred-again', name: 'Ten Days World Tour', year: 2026, startDate: d('2026-02-01'), endDate: d('2026-10-01'), dateCount: 11 },
  { id: 'cat-tour-chris-stapleton-all-american-road-show', artistId: 'cat-artist-chris-stapleton', name: 'All-American Road Show', year: 2025, startDate: d('2025-05-01'), endDate: d('2026-09-01'), dateCount: 10 },
  { id: 'cat-tour-karol-g-tropicoqueta', artistId: 'cat-artist-karol-g', name: 'Tropicoqueta World Tour', year: 2025, startDate: d('2025-02-01'), endDate: d('2025-08-01'), dateCount: 8 },
];

// ---------------------------------------------------------------------------
// One-off event dates for the ~40 non-tour artists — a fixed rotating pool
// of calendar dates spanning mid-2024 (past) through mid-2027 (upcoming).
// ---------------------------------------------------------------------------

const ONE_OFF_DATES: Date[] = [
  // past (10)
  d('2024-07-12'), d('2024-10-05'), d('2025-01-17'), d('2025-03-22'),
  d('2025-05-10'), d('2025-06-28'), d('2025-09-05'), d('2025-11-30'),
  d('2026-02-14'), d('2026-05-02'),
  // upcoming (18)
  d('2026-08-01'), d('2026-08-22'), d('2026-09-12'), d('2026-10-03'),
  d('2026-10-24'), d('2026-11-14'), d('2026-12-05'), d('2027-01-09'),
  d('2027-01-30'), d('2027-02-20'), d('2027-03-13'), d('2027-04-03'),
  d('2027-04-24'), d('2027-05-15'), d('2027-06-05'), d('2027-06-26'),
  d('2027-07-10'), d('2027-07-17'),
];

// Non-tour artists that get 2 one-off shows apiece (the rest below get 1).
const TWO_SHOW_ARTIST_IDS = new Set<string>([
  'cat-artist-phoebe-bridgers', 'cat-artist-boygenius', 'cat-artist-fontaines-dc',
  'cat-artist-sza', 'cat-artist-frank-ocean', 'cat-artist-morgan-wallen',
  'cat-artist-rauw-alejandro', 'cat-artist-ariana-grande', 'cat-artist-harry-styles',
  'cat-artist-ed-sheeran', 'cat-artist-coldplay', 'cat-artist-post-malone',
  'cat-artist-chappell-roan', 'cat-artist-benson-boone', 'cat-artist-lady-gaga',
  'cat-artist-the-strokes', 'cat-artist-vampire-weekend', 'cat-artist-king-gizzard',
  'cat-artist-wet-leg', 'cat-artist-idles', 'cat-artist-the-killers',
  'cat-artist-foo-fighters', 'cat-artist-greta-van-fleet', 'cat-artist-drake',
  'cat-artist-j-cole', 'cat-artist-playboi-carti', 'cat-artist-chris-brown',
  'cat-artist-summer-walker', 'cat-artist-luke-combs', 'cat-artist-kacey-musgraves',
  'cat-artist-peso-pluma',
]);

// ---------------------------------------------------------------------------
// Generator: builds the Event rows for tours + one-offs, deduping against
// the (artistId, venueId, date) unique constraint as it goes.
// ---------------------------------------------------------------------------

type GeneratedEvent = {
  id: string;
  name: string;
  date: Date;
  artistId: string;
  venueId: string;
  tourId: string | null;
};

function buildEvents(): GeneratedEvent[] {
  const events: GeneratedEvent[] = [];
  const usedKeys = new Set<string>();

  const keyFor = (artistId: string, venueId: string, date: Date) => `${artistId}|${venueId}|${date.toISOString()}`;

  /** Nudges `date` forward a day at a time until (artistId, venueId, date) is free. */
  function reserve(artistId: string, venueId: string, date: Date): Date {
    let candidate = date;
    while (usedKeys.has(keyFor(artistId, venueId, candidate))) {
      candidate = new Date(candidate.getTime() + 86_400_000);
    }
    usedKeys.add(keyFor(artistId, venueId, candidate));
    return candidate;
  }

  const artistById = new Map(ARTISTS.map((a) => [a.id, a]));
  const tourArtistIds = new Set(TOURS.map((t) => t.artistId));

  // --- tour dates ---
  for (const tour of TOURS) {
    const artist = artistById.get(tour.artistId)!;
    const pool = VENUE_POOLS[artist.pool];
    const dates = spreadDates(tour.startDate, tour.endDate, tour.dateCount);

    dates.forEach((rawDate, i) => {
      const venueId = pool[i % pool.length];
      const date = reserve(artist.id, venueId, rawDate);
      events.push({
        id: `cat-event-${artist.id.replace('cat-artist-', '')}-${i + 1}`,
        name: `${artist.name} — ${tour.name}`,
        date,
        artistId: artist.id,
        venueId,
        tourId: tour.id,
      });
    });
  }

  // --- one-off events for every artist without a tour ---
  let dateCursor = 0;
  for (const artist of ARTISTS) {
    if (tourArtistIds.has(artist.id)) continue;
    const pool = VENUE_POOLS[artist.pool];
    const showCount = TWO_SHOW_ARTIST_IDS.has(artist.id) ? 2 : 1;

    for (let i = 0; i < showCount; i++) {
      const rawDate = ONE_OFF_DATES[dateCursor % ONE_OFF_DATES.length];
      const venueId = pool[dateCursor % pool.length];
      dateCursor++;

      const date = reserve(artist.id, venueId, rawDate);
      const venueName = VENUES.find((v) => v.id === venueId)!.name;
      events.push({
        id: `cat-event-${artist.id.replace('cat-artist-', '')}-${i + 1}`,
        name: `${artist.name} at ${venueName}`,
        date,
        artistId: artist.id,
        venueId,
        tourId: null,
      });
    }
  }

  return events;
}

// ---------------------------------------------------------------------------
// Seed steps
// ---------------------------------------------------------------------------

async function seedArtists() {
  for (const a of ARTISTS) {
    await prisma.artist.upsert({
      where: { id: a.id },
      update: { name: a.name, genres: a.genres, spotifyId: `cat:${a.id.replace('cat-artist-', '')}`, imageUrl: null },
      create: { id: a.id, name: a.name, genres: a.genres, spotifyId: `cat:${a.id.replace('cat-artist-', '')}`, imageUrl: null },
    });
  }
  console.log(`  artists: ${ARTISTS.length}`);
}

async function seedVenues() {
  for (const v of VENUES) {
    await prisma.venue.upsert({
      where: { id: v.id },
      update: { name: v.name, city: v.city, state: v.state, country: v.country, capacity: v.capacity, imageUrl: null },
      create: { id: v.id, name: v.name, city: v.city, state: v.state, country: v.country, capacity: v.capacity, imageUrl: null },
    });
  }
  console.log(`  venues: ${VENUES.length}`);
}

async function seedTours() {
  for (const t of TOURS) {
    await prisma.tour.upsert({
      where: { id: t.id },
      update: { name: t.name, year: t.year, startDate: t.startDate, endDate: t.endDate, artistId: t.artistId, imageUrl: null },
      create: { id: t.id, name: t.name, year: t.year, startDate: t.startDate, endDate: t.endDate, artistId: t.artistId, imageUrl: null },
    });
  }
  console.log(`  tours: ${TOURS.length}`);
}

async function seedEvents() {
  const events = buildEvents();
  let past = 0;
  let upcoming = 0;
  // Fixed reference point (not `new Date()`) matching the design anchor
  // used to build the catalog's date ranges above.
  const referenceNow = d('2026-07-11');

  for (const e of events) {
    await prisma.event.upsert({
      where: { id: e.id },
      update: { name: e.name, date: e.date, artistId: e.artistId, venueId: e.venueId, tourId: e.tourId, source: 'catalog-seed', imageUrl: null },
      create: { id: e.id, name: e.name, date: e.date, artistId: e.artistId, venueId: e.venueId, tourId: e.tourId, source: 'catalog-seed', imageUrl: null },
    });
    if (e.date < referenceNow) past++;
    else upcoming++;
  }

  console.log(`  events: ${events.length} (past: ${past}, upcoming: ${upcoming})`);
  return events.length;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('Seeding Sticket catalog (artists / venues / tours / events)...');

  await seedArtists();
  await seedVenues();
  await seedTours();
  await seedEvents();

  console.log('Catalog seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
