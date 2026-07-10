// ---------------------------------------------------------------------------
// Sticket API — production-grade seed
//
// Fully idempotent: every row is created with a deterministic id (or a
// stable natural unique key) and written via `upsert`, so re-running this
// script any number of times converges on the same dataset instead of
// duplicating rows.
//
// Run with:  npx prisma db seed   (wired via prisma.config.ts -> migrations.seed)
//       or:  npm run db:seed
// ---------------------------------------------------------------------------

import 'dotenv/config';
import bcrypt from 'bcryptjs';

import { prisma } from '../src/lib/prisma.js';
import { ensureBadgeCatalog, checkBadges } from '../src/lib/badges/badgeChecker.js';
import { computeLogXp, buildXpReason, monthKey, type XpBonusInputs } from '../src/lib/xp.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Password shared by every seed user — matches hashPassword()'s cost factor (12). */
const SEED_PASSWORD_HASH = await bcrypt.hash('password123', 12);

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setUTCHours(19, 30, 0, 0);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

/** picsum.photos gives deterministic placeholder images keyed by seed string. */
function placeholderImage(seed: string, w = 800, h = 800): string {
  return `https://picsum.photos/seed/${seed}/${w}/${h}`;
}

// ---------------------------------------------------------------------------
// Artists (~15)
// ---------------------------------------------------------------------------

type SeedArtist = { id: string; name: string; spotifyId: string; genres: string[]; bio: string };

const ARTISTS: SeedArtist[] = [
  { id: 'artist-taylor-swift', name: 'Taylor Swift', spotifyId: 'seed:taylor-swift', genres: ['pop'], bio: 'Singer-songwriter and one of the best-selling music artists of all time.' },
  { id: 'artist-the-weeknd', name: 'The Weeknd', spotifyId: 'seed:the-weeknd', genres: ['pop', 'r&b'], bio: 'Canadian singer known for his cinematic blend of pop and R&B.' },
  { id: 'artist-bad-bunny', name: 'Bad Bunny', spotifyId: 'seed:bad-bunny', genres: ['reggaeton', 'latin trap'], bio: 'Puerto Rican rapper and singer who redefined the sound of Latin trap.' },
  { id: 'artist-billie-eilish', name: 'Billie Eilish', spotifyId: 'seed:billie-eilish', genres: ['pop', 'alt-pop'], bio: 'Genre-bending pop artist known for whispery vocals and moody production.' },
  { id: 'artist-kendrick-lamar', name: 'Kendrick Lamar', spotifyId: 'seed:kendrick-lamar', genres: ['hip-hop'], bio: 'Pulitzer Prize-winning rapper regarded as one of the greatest of his generation.' },
  { id: 'artist-sza', name: 'SZA', spotifyId: 'seed:sza', genres: ['r&b', 'neo-soul'], bio: 'R&B singer-songwriter behind the generation-defining album SOS.' },
  { id: 'artist-tame-impala', name: 'Tame Impala', spotifyId: 'seed:tame-impala', genres: ['psychedelic rock'], bio: 'Kevin Parker’s psychedelic rock project known for lush, dreamy production.' },
  { id: 'artist-phoebe-bridgers', name: 'Phoebe Bridgers', spotifyId: 'seed:phoebe-bridgers', genres: ['indie', 'folk'], bio: 'Indie folk singer-songwriter known for devastatingly intimate lyrics.' },
  { id: 'artist-mitski', name: 'Mitski', spotifyId: 'seed:mitski', genres: ['indie rock', 'art rock'], bio: 'Singer-songwriter known for raw, emotionally direct indie rock.' },
  { id: 'artist-odesza', name: 'ODESZA', spotifyId: 'seed:odesza', genres: ['edm', 'electronic'], bio: 'Electronic duo known for euphoric, festival-scale production.' },
  { id: 'artist-illenium', name: 'ILLENIUM', spotifyId: 'seed:illenium', genres: ['edm', 'dubstep'], bio: 'Melodic bass producer known for emotional, festival-headlining sets.' },
  { id: 'artist-radiohead', name: 'Radiohead', spotifyId: 'seed:radiohead', genres: ['alternative', 'art rock'], bio: 'English rock band widely regarded as one of the most influential of their era.' },
  { id: 'artist-arctic-monkeys', name: 'Arctic Monkeys', spotifyId: 'seed:arctic-monkeys', genres: ['indie rock', 'alternative'], bio: 'English rock band that evolved from garage rock into lounge-inflected art rock.' },
  { id: 'artist-dua-lipa', name: 'Dua Lipa', spotifyId: 'seed:dua-lipa', genres: ['pop', 'dance'], bio: 'Pop star known for disco-inflected dance-pop and stadium-scale tours.' },
  { id: 'artist-doja-cat', name: 'Doja Cat', spotifyId: 'seed:doja-cat', genres: ['pop', 'hip-hop'], bio: 'Genre-hopping pop and hip-hop artist known for viral hits and theatrical shows.' },
];

// ---------------------------------------------------------------------------
// Venues (~10, spread across cities)
// ---------------------------------------------------------------------------

type SeedVenue = { id: string; name: string; city: string; state: string; country: string; capacity: number };

const VENUES: SeedVenue[] = [
  { id: 'venue-msg', name: 'Madison Square Garden', city: 'New York', state: 'NY', country: 'USA', capacity: 20789 },
  { id: 'venue-forum', name: 'Kia Forum', city: 'Inglewood', state: 'CA', country: 'USA', capacity: 17505 },
  { id: 'venue-redrocks', name: 'Red Rocks Amphitheatre', city: 'Morrison', state: 'CO', country: 'USA', capacity: 9525 },
  { id: 'venue-unitedcenter', name: 'United Center', city: 'Chicago', state: 'IL', country: 'USA', capacity: 20917 },
  { id: 'venue-statefarm', name: 'State Farm Arena', city: 'Atlanta', state: 'GA', country: 'USA', capacity: 18118 },
  { id: 'venue-moody', name: 'Moody Center', city: 'Austin', state: 'TX', country: 'USA', capacity: 15000 },
  { id: 'venue-climatepledge', name: 'Climate Pledge Arena', city: 'Seattle', state: 'WA', country: 'USA', capacity: 18100 },
  { id: 'venue-hollywoodbowl', name: 'Hollywood Bowl', city: 'Los Angeles', state: 'CA', country: 'USA', capacity: 17500 },
  { id: 'venue-brooklynmirage', name: 'Brooklyn Mirage', city: 'Brooklyn', state: 'NY', country: 'USA', capacity: 6000 },
  { id: 'venue-gorge', name: 'The Gorge Amphitheatre', city: 'George', state: 'WA', country: 'USA', capacity: 27500 },
];

// ---------------------------------------------------------------------------
// Events (~30, mix of past + upcoming)
// ---------------------------------------------------------------------------

type SeedEvent = { id: string; name: string; artistId: string; venueId: string; daysOffset: number };

const EVENTS: SeedEvent[] = [
  { id: 'event-taylor-eras-msg', name: 'Taylor Swift — The Eras Tour', artistId: 'artist-taylor-swift', venueId: 'venue-msg', daysOffset: 21 },
  { id: 'event-taylor-eras-unitedcenter', name: 'Taylor Swift — The Eras Tour', artistId: 'artist-taylor-swift', venueId: 'venue-unitedcenter', daysOffset: -200 },
  { id: 'event-weeknd-afterhours-msg', name: 'The Weeknd — After Hours Til Dawn', artistId: 'artist-the-weeknd', venueId: 'venue-msg', daysOffset: 45 },
  { id: 'event-weeknd-afterhours-forum', name: 'The Weeknd — After Hours Tour', artistId: 'artist-the-weeknd', venueId: 'venue-forum', daysOffset: -160 },
  { id: 'event-badbunny-mostwanted-statefarm', name: 'Bad Bunny — Most Wanted Tour', artistId: 'artist-bad-bunny', venueId: 'venue-statefarm', daysOffset: 30 },
  { id: 'event-badbunny-worldshottest-moody', name: 'Bad Bunny — World’s Hottest Tour', artistId: 'artist-bad-bunny', venueId: 'venue-moody', daysOffset: -90 },
  { id: 'event-billie-hitmehard-climatepledge', name: 'Billie Eilish — Hit Me Hard and Soft', artistId: 'artist-billie-eilish', venueId: 'venue-climatepledge', daysOffset: 60 },
  { id: 'event-billie-happier-hollywoodbowl', name: 'Billie Eilish — Happier Than Ever Tour', artistId: 'artist-billie-eilish', venueId: 'venue-hollywoodbowl', daysOffset: -220 },
  { id: 'event-kendrick-bigsteppers-forum', name: 'Kendrick Lamar — The Big Steppers Tour', artistId: 'artist-kendrick-lamar', venueId: 'venue-forum', daysOffset: -150 },
  { id: 'event-kendrick-gnx-unitedcenter', name: 'Kendrick Lamar — GNX Tour', artistId: 'artist-kendrick-lamar', venueId: 'venue-unitedcenter', daysOffset: 75 },
  { id: 'event-sza-sos-brooklynmirage', name: 'SZA — SOS Tour', artistId: 'artist-sza', venueId: 'venue-brooklynmirage', daysOffset: -95 },
  { id: 'event-sza-sos-statefarm', name: 'SZA — SOS Tour', artistId: 'artist-sza', venueId: 'venue-statefarm', daysOffset: -40 },
  { id: 'event-tame-currents-hollywoodbowl', name: 'Tame Impala — Currents Tour', artistId: 'artist-tame-impala', venueId: 'venue-hollywoodbowl', daysOffset: -300 },
  { id: 'event-tame-slowrush-redrocks', name: 'Tame Impala — The Slow Rush Tour', artistId: 'artist-tame-impala', venueId: 'venue-redrocks', daysOffset: -60 },
  { id: 'event-phoebe-reunion-msg', name: 'Phoebe Bridgers — Reunion Tour', artistId: 'artist-phoebe-bridgers', venueId: 'venue-msg', daysOffset: -14 },
  { id: 'event-phoebe-punisher-moody', name: 'Phoebe Bridgers — Punisher Tour', artistId: 'artist-phoebe-bridgers', venueId: 'venue-moody', daysOffset: -365 },
  { id: 'event-mitski-landishospitable-climatepledge', name: 'Mitski — The Land Is Inhospitable Tour', artistId: 'artist-mitski', venueId: 'venue-climatepledge', daysOffset: -30 },
  { id: 'event-mitski-laurelhell-unitedcenter', name: 'Mitski — Laurel Hell Tour', artistId: 'artist-mitski', venueId: 'venue-unitedcenter', daysOffset: -180 },
  { id: 'event-odesza-lastgoodbye-gorge', name: 'ODESZA — The Last Goodbye Tour', artistId: 'artist-odesza', venueId: 'venue-gorge', daysOffset: -180 },
  { id: 'event-odesza-momentapart-redrocks', name: 'ODESZA — A Moment Apart Tour', artistId: 'artist-odesza', venueId: 'venue-redrocks', daysOffset: 90 },
  { id: 'event-illenium-trilogy-redrocks', name: 'ILLENIUM — Trilogy', artistId: 'artist-illenium', venueId: 'venue-redrocks', daysOffset: -240 },
  { id: 'event-illenium-fallenembers-gorge', name: 'ILLENIUM — Fallen Embers Tour', artistId: 'artist-illenium', venueId: 'venue-gorge', daysOffset: 50 },
  { id: 'event-radiohead-moonshapedpool-msg', name: 'Radiohead — A Moon Shaped Pool Tour', artistId: 'artist-radiohead', venueId: 'venue-msg', daysOffset: -400 },
  { id: 'event-radiohead-inrainbows-hollywoodbowl', name: 'Radiohead — In Rainbows Anniversary', artistId: 'artist-radiohead', venueId: 'venue-hollywoodbowl', daysOffset: 110 },
  { id: 'event-arcticmonkeys-thecar-unitedcenter', name: 'Arctic Monkeys — The Car Tour', artistId: 'artist-arctic-monkeys', venueId: 'venue-unitedcenter', daysOffset: -70 },
  { id: 'event-arcticmonkeys-amanniversary-forum', name: 'Arctic Monkeys — AM Anniversary Tour', artistId: 'artist-arctic-monkeys', venueId: 'venue-forum', daysOffset: 25 },
  { id: 'event-dualipa-futurenostalgia-statefarm', name: 'Dua Lipa — Future Nostalgia Tour', artistId: 'artist-dua-lipa', venueId: 'venue-statefarm', daysOffset: -110 },
  { id: 'event-dualipa-radicaloptimism-moody', name: 'Dua Lipa — Radical Optimism Tour', artistId: 'artist-dua-lipa', venueId: 'venue-moody', daysOffset: 40 },
  { id: 'event-dojacat-scarlet-brooklynmirage', name: 'Doja Cat — Scarlet Tour', artistId: 'artist-doja-cat', venueId: 'venue-brooklynmirage', daysOffset: -20 },
  { id: 'event-dojacat-planether-climatepledge', name: 'Doja Cat — Planet Her Tour', artistId: 'artist-doja-cat', venueId: 'venue-climatepledge', daysOffset: -280 },
];

// ---------------------------------------------------------------------------
// Users (5 demo accounts, all password "password123")
// ---------------------------------------------------------------------------

type SeedUser = { id: string; email: string; username: string; displayName: string; city: string; bio: string };

const USERS: SeedUser[] = [
  { id: 'user-alex-chen', email: 'alex@seed.sticket.dev', username: 'alexchen', displayName: 'Alex Chen', city: 'New York, NY', bio: 'Always chasing the next encore. NYC show diary.' },
  { id: 'user-jordan-rivera', email: 'jordan@seed.sticket.dev', username: 'jordanrivera', displayName: 'Jordan Rivera', city: 'Los Angeles, CA', bio: 'West coast shows, front row when I can get it.' },
  { id: 'user-sam-taylor', email: 'sam@seed.sticket.dev', username: 'samtaylor', displayName: 'Sam Taylor', city: 'Chicago, IL', bio: 'Concert photographer on the side.' },
  { id: 'user-maya-patel', email: 'maya@seed.sticket.dev', username: 'mayapatel', displayName: 'Maya Patel', city: 'Austin, TX', bio: 'Festival season is a lifestyle.' },
  { id: 'user-devon-lee', email: 'devon@seed.sticket.dev', username: 'devonlee', displayName: 'Devon Lee', city: 'Seattle, WA', bio: 'Red Rocks regular. Bass music forever.' },
];

// ---------------------------------------------------------------------------
// Logs (~25: 5 per user), each tied to a past event
// ---------------------------------------------------------------------------

type SeedLog = {
  id: string;
  userId: string;
  eventId: string;
  rating: number;
  note?: string;
  photos: number;
  daysAfterEvent: number;
};

const LOGS: SeedLog[] = [
  // --- Alex Chen ---
  { id: 'log-alex-phoebe-reunion', userId: 'user-alex-chen', eventId: 'event-phoebe-reunion-msg', rating: 5, note: 'Encore was unhinged — she played Motion Sickness twice and nobody wanted to leave.', photos: 2, daysAfterEvent: 1 },
  { id: 'log-alex-sza-sos-mirage', userId: 'user-alex-chen', eventId: 'event-sza-sos-brooklynmirage', rating: 4.5, note: 'Kill Bill live gave me chills, the stage setup was incredible.', photos: 1, daysAfterEvent: 2 },
  { id: 'log-alex-radiohead-msg', userId: 'user-alex-chen', eventId: 'event-radiohead-moonshapedpool-msg', rating: 5, note: 'Everything In Its Right Place opener into the full album — best show I’ve ever seen.', photos: 0, daysAfterEvent: 3 },
  { id: 'log-alex-billie-hollywoodbowl', userId: 'user-alex-chen', eventId: 'event-billie-happier-hollywoodbowl', rating: 4, note: 'Hollywood Bowl at night with Billie is a different sport.', photos: 1, daysAfterEvent: 2 },
  { id: 'log-alex-dojacat-mirage', userId: 'user-alex-chen', eventId: 'event-dojacat-scarlet-brooklynmirage', rating: 4.5, photos: 0, daysAfterEvent: 1 },

  // --- Jordan Rivera ---
  { id: 'log-jordan-weeknd-forum', userId: 'user-jordan-rivera', eventId: 'event-weeknd-afterhours-forum', rating: 5, note: 'After Hours Til Dawn era but at the Forum — production was next level.', photos: 2, daysAfterEvent: 2 },
  { id: 'log-jordan-kendrick-forum', userId: 'user-jordan-rivera', eventId: 'event-kendrick-bigsteppers-forum', rating: 5, note: 'HUMBLE hit so hard the floor was shaking.', photos: 0, daysAfterEvent: 1 },
  { id: 'log-jordan-arcticmonkeys-unitedcenter', userId: 'user-jordan-rivera', eventId: 'event-arcticmonkeys-thecar-unitedcenter', rating: 4, note: 'Alex Turner’s stage banter alone was worth the ticket.', photos: 1, daysAfterEvent: 3 },
  { id: 'log-jordan-tame-redrocks', userId: 'user-jordan-rivera', eventId: 'event-tame-slowrush-redrocks', rating: 4.5, note: 'Let It Happen with the Red Rocks sunset — unreal.', photos: 1, daysAfterEvent: 1 },
  { id: 'log-jordan-dojacat-climatepledge', userId: 'user-jordan-rivera', eventId: 'event-dojacat-planether-climatepledge', rating: 4, photos: 0, daysAfterEvent: 2 },

  // --- Sam Taylor ---
  { id: 'log-sam-taylor-eras-unitedcenter', userId: 'user-sam-taylor', eventId: 'event-taylor-eras-unitedcenter', rating: 5, note: 'The Midnights set with the rain effect was magic.', photos: 2, daysAfterEvent: 1 },
  { id: 'log-sam-mitski-unitedcenter', userId: 'user-sam-taylor', eventId: 'event-mitski-laurelhell-unitedcenter', rating: 5, note: 'The most emotionally devastating 75 minutes of my life.', photos: 0, daysAfterEvent: 2 },
  { id: 'log-sam-sza-statefarm', userId: 'user-sam-taylor', eventId: 'event-sza-sos-statefarm', rating: 4, note: 'Snooze acoustic broke me.', photos: 1, daysAfterEvent: 1 },
  { id: 'log-sam-badbunny-moody', userId: 'user-sam-taylor', eventId: 'event-badbunny-worldshottest-moody', rating: 4.5, note: 'Moody Center was rocking — he brought out a surprise guest.', photos: 1, daysAfterEvent: 2 },
  { id: 'log-sam-dualipa-statefarm', userId: 'user-sam-taylor', eventId: 'event-dualipa-futurenostalgia-statefarm', rating: 4, photos: 0, daysAfterEvent: 3 },

  // --- Maya Patel ---
  { id: 'log-maya-phoebe-moody', userId: 'user-maya-patel', eventId: 'event-phoebe-punisher-moody', rating: 4, note: 'My first Phoebe show — Kyoto live was everything.', photos: 0, daysAfterEvent: 4 },
  { id: 'log-maya-badbunny-moody', userId: 'user-maya-patel', eventId: 'event-badbunny-worldshottest-moody', rating: 5, note: 'Second time seeing him and it topped the first.', photos: 1, daysAfterEvent: 2 },
  { id: 'log-maya-mitski-climatepledge', userId: 'user-maya-patel', eventId: 'event-mitski-landishospitable-climatepledge', rating: 5, note: 'Washing Machine Heart live hits different.', photos: 1, daysAfterEvent: 1 },
  { id: 'log-maya-odesza-gorge', userId: 'user-maya-patel', eventId: 'event-odesza-lastgoodbye-gorge', rating: 5, note: 'The Gorge at sunset with ODESZA is a spiritual experience.', photos: 2, daysAfterEvent: 3 },
  { id: 'log-maya-tame-hollywoodbowl', userId: 'user-maya-patel', eventId: 'event-tame-currents-hollywoodbowl', rating: 4, photos: 0, daysAfterEvent: 2 },

  // --- Devon Lee ---
  { id: 'log-devon-sza-mirage', userId: 'user-devon-lee', eventId: 'event-sza-sos-brooklynmirage', rating: 4, note: 'Kill Bill hits different live.', photos: 0, daysAfterEvent: 3 },
  { id: 'log-devon-illenium-redrocks', userId: 'user-devon-lee', eventId: 'event-illenium-trilogy-redrocks', rating: 5, note: 'Three sets. Cried during Crawl Outta Love.', photos: 1, daysAfterEvent: 1 },
  { id: 'log-devon-tame-redrocks', userId: 'user-devon-lee', eventId: 'event-tame-slowrush-redrocks', rating: 4.5, note: 'Second Red Rocks show this year and it still gets me.', photos: 0, daysAfterEvent: 2 },
  { id: 'log-devon-dojacat-climatepledge', userId: 'user-devon-lee', eventId: 'event-dojacat-planether-climatepledge', rating: 4, photos: 1, daysAfterEvent: 1 },
  { id: 'log-devon-billie-hollywoodbowl', userId: 'user-devon-lee', eventId: 'event-billie-happier-hollywoodbowl', rating: 4.5, note: 'Second Billie show — Happier Than Ever hit even harder live.', photos: 0, daysAfterEvent: 2 },
];

// ---------------------------------------------------------------------------
// Comments (a handful of realistic replies across logs)
// ---------------------------------------------------------------------------

const COMMENTS: { id: string; logId: string; userId: string; text: string }[] = [
  { id: 'comment-devon-on-alex-sza', logId: 'log-alex-sza-sos-mirage', userId: 'user-devon-lee', text: 'I was two rows behind you at this one, insane night.' },
  { id: 'comment-jordan-on-alex-phoebe', logId: 'log-alex-phoebe-reunion', userId: 'user-jordan-rivera', text: 'Motion Sickness x2 is criminal. So jealous.' },
  { id: 'comment-alex-on-jordan-weeknd', logId: 'log-jordan-weeknd-forum', userId: 'user-alex-chen', text: 'The Forum sound system for that show was unreal.' },
  { id: 'comment-maya-on-sam-badbunny', logId: 'log-sam-badbunny-moody', userId: 'user-maya-patel', text: 'Wait I was at this one too?! Small world.' },
  { id: 'comment-sam-on-maya-badbunny', logId: 'log-maya-badbunny-moody', userId: 'user-sam-taylor', text: 'See above — we need to compare notes.' },
  { id: 'comment-devon-on-jordan-tame', logId: 'log-jordan-tame-redrocks', userId: 'user-devon-lee', text: 'Red Rocks + Tame Impala sunset is unbeatable.' },
  { id: 'comment-jordan-on-devon-illenium', logId: 'log-devon-illenium-redrocks', userId: 'user-jordan-rivera', text: 'Crawl Outta Love live destroys me every time.' },
  { id: 'comment-alex-on-devon-billie', logId: 'log-devon-billie-hollywoodbowl', userId: 'user-alex-chen', text: 'Need to catch her at the Bowl someday, looks incredible.' },
];

// ---------------------------------------------------------------------------
// Presales (~6, tied to upcoming events)
// ---------------------------------------------------------------------------

type SeedPresale = {
  eventId: string;
  presaleType: string;
  presaleStartOffsetDays: number;
  onsaleStartOffsetDays: number;
  code?: string;
  source: string;
};

const PRESALES: SeedPresale[] = [
  { eventId: 'event-taylor-eras-msg', presaleType: 'Verified Fan', presaleStartOffsetDays: -10, onsaleStartOffsetDays: -3, code: 'SWIFTIE24', source: 'ERP' },
  { eventId: 'event-weeknd-afterhours-msg', presaleType: 'Fan Club', presaleStartOffsetDays: -14, onsaleStartOffsetDays: -7, code: 'XOFAN', source: 'ERP' },
  { eventId: 'event-badbunny-mostwanted-statefarm', presaleType: 'American Express', presaleStartOffsetDays: -8, onsaleStartOffsetDays: -2, source: 'ERP' },
  { eventId: 'event-billie-hitmehard-climatepledge', presaleType: 'Artist Presale', presaleStartOffsetDays: -12, onsaleStartOffsetDays: -5, code: 'BILLIE2026', source: 'ERP' },
  { eventId: 'event-kendrick-gnx-unitedcenter', presaleType: 'Spotify', presaleStartOffsetDays: -9, onsaleStartOffsetDays: -4, source: 'ERP' },
  { eventId: 'event-dualipa-radicaloptimism-moody', presaleType: 'Citi Card', presaleStartOffsetDays: -11, onsaleStartOffsetDays: -6, code: 'CITIPRESALE', source: 'ERP' },
];

// ---------------------------------------------------------------------------
// Tickets (a few upcoming-show tickets)
// ---------------------------------------------------------------------------

type SeedTicket = {
  id: string;
  userId: string;
  eventId: string;
  section?: string;
  row?: string;
  seat?: string;
  isGeneralAdmission?: boolean;
  status: 'KEEPING' | 'SELLING';
  purchasePrice?: number;
  askingPrice?: number;
};

const TICKETS: SeedTicket[] = [
  { id: 'ticket-alex-taylor-msg', userId: 'user-alex-chen', eventId: 'event-taylor-eras-msg', section: '104', row: 'C', seat: '12', status: 'KEEPING', purchasePrice: 349 },
  { id: 'ticket-jordan-kendrick-unitedcenter', userId: 'user-jordan-rivera', eventId: 'event-kendrick-gnx-unitedcenter', isGeneralAdmission: true, status: 'KEEPING', purchasePrice: 120 },
  { id: 'ticket-sam-badbunny-statefarm', userId: 'user-sam-taylor', eventId: 'event-badbunny-mostwanted-statefarm', section: '212', row: 'F', seat: '5', status: 'SELLING', purchasePrice: 180, askingPrice: 240 },
  { id: 'ticket-maya-dualipa-moody', userId: 'user-maya-patel', eventId: 'event-dualipa-radicaloptimism-moody', section: '108', row: 'A', seat: '20', status: 'KEEPING', purchasePrice: 210 },
];

// ---------------------------------------------------------------------------
// Follows
// ---------------------------------------------------------------------------

const FOLLOWS: { followerId: string; followingId: string }[] = [
  { followerId: 'user-alex-chen', followingId: 'user-jordan-rivera' },
  { followerId: 'user-alex-chen', followingId: 'user-sam-taylor' },
  { followerId: 'user-alex-chen', followingId: 'user-maya-patel' },
  { followerId: 'user-jordan-rivera', followingId: 'user-alex-chen' },
  { followerId: 'user-jordan-rivera', followingId: 'user-devon-lee' },
  { followerId: 'user-sam-taylor', followingId: 'user-alex-chen' },
  { followerId: 'user-sam-taylor', followingId: 'user-maya-patel' },
  { followerId: 'user-maya-patel', followingId: 'user-jordan-rivera' },
  { followerId: 'user-maya-patel', followingId: 'user-devon-lee' },
  { followerId: 'user-devon-lee', followingId: 'user-alex-chen' },
  { followerId: 'user-devon-lee', followingId: 'user-sam-taylor' },
];

// ---------------------------------------------------------------------------
// Seed steps
// ---------------------------------------------------------------------------

async function seedArtists() {
  for (const a of ARTISTS) {
    await prisma.artist.upsert({
      where: { id: a.id },
      update: { name: a.name, spotifyId: a.spotifyId, genres: a.genres, bio: a.bio, imageUrl: placeholderImage(a.id) },
      create: { id: a.id, name: a.name, spotifyId: a.spotifyId, genres: a.genres, bio: a.bio, imageUrl: placeholderImage(a.id) },
    });
  }
  console.log(`  artists: ${ARTISTS.length}`);
}

async function seedVenues() {
  for (const v of VENUES) {
    await prisma.venue.upsert({
      where: { id: v.id },
      update: { name: v.name, city: v.city, state: v.state, country: v.country, capacity: v.capacity, imageUrl: placeholderImage(v.id) },
      create: { id: v.id, name: v.name, city: v.city, state: v.state, country: v.country, capacity: v.capacity, imageUrl: placeholderImage(v.id) },
    });
  }
  console.log(`  venues: ${VENUES.length}`);
}

async function seedEvents() {
  for (const e of EVENTS) {
    const date = daysFromNow(e.daysOffset);
    await prisma.event.upsert({
      where: { id: e.id },
      update: { name: e.name, artistId: e.artistId, venueId: e.venueId, date, source: 'seed' },
      create: { id: e.id, name: e.name, artistId: e.artistId, venueId: e.venueId, date, source: 'seed' },
    });
  }
  console.log(`  events: ${EVENTS.length}`);
}

async function seedUsers() {
  for (const u of USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        username: u.username,
        displayName: u.displayName,
        city: u.city,
        homeCity: u.city,
        bio: u.bio,
        avatarUrl: placeholderImage(u.id, 400, 400),
        passwordHash: SEED_PASSWORD_HASH,
      },
      create: {
        id: u.id,
        email: u.email,
        username: u.username,
        displayName: u.displayName,
        city: u.city,
        homeCity: u.city,
        bio: u.bio,
        avatarUrl: placeholderImage(u.id, 400, 400),
        passwordHash: SEED_PASSWORD_HASH,
        emailVerified: true,
      },
    });
  }
  console.log(`  users: ${USERS.length} (password: "password123" for all)`);
}

async function seedFollows() {
  for (const f of FOLLOWS) {
    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId: f.followerId, followingId: f.followingId } },
      update: {},
      create: f,
    });
  }
  console.log(`  follows: ${FOLLOWS.length}`);

  // Each user follows the artists behind their own logs, so /discover-style
  // artist feeds have real content.
  const artistsByUser = new Map<string, Set<string>>();
  for (const log of LOGS) {
    const event = EVENTS.find((e) => e.id === log.eventId)!;
    if (!artistsByUser.has(log.userId)) artistsByUser.set(log.userId, new Set());
    artistsByUser.get(log.userId)!.add(event.artistId);
  }

  let artistFollowCount = 0;
  for (const [userId, artistIds] of artistsByUser) {
    for (const artistId of artistIds) {
      await prisma.userArtistFollow.upsert({
        where: { userId_artistId: { userId, artistId } },
        update: {},
        create: { userId, artistId, tier: 'following' },
      });
      artistFollowCount++;
    }
  }
  console.log(`  artist follows: ${artistFollowCount}`);
}

async function seedLogs() {
  const eventById = new Map(EVENTS.map((e) => [e.id, e]));

  // Track running XP state per user, and "seen" sets per user, applying logs
  // in event-chronological order (mirrors GAMIFICATION.md's recompute rule:
  // iterate logs in the order they happened, accumulating seenVenues /
  // seenArtists / seenMonths).
  const logsByUser = new Map<string, SeedLog[]>();
  for (const log of LOGS) {
    if (!logsByUser.has(log.userId)) logsByUser.set(log.userId, []);
    logsByUser.get(log.userId)!.push(log);
  }

  let totalPhotos = 0;

  for (const user of USERS) {
    const userLogs = (logsByUser.get(user.id) ?? []).slice().sort((a, b) => {
      const ea = eventById.get(a.eventId)!.daysOffset;
      const eb = eventById.get(b.eventId)!.daysOffset;
      return ea - eb; // chronological by show date, oldest first
    });

    const seenVenues = new Set<string>();
    const seenArtists = new Set<string>();
    const seenMonths = new Set<string>();
    let xpTotal = 0;

    for (const log of userLogs) {
      const event = eventById.get(log.eventId)!;
      const eventDate = daysFromNow(event.daysOffset);
      const key = monthKey(eventDate);

      const isNewVenue = !seenVenues.has(event.venueId);
      const isNewArtist = !seenArtists.has(event.artistId);
      const firstOfMonth = !seenMonths.has(key);
      const hasReview = Boolean(log.note && log.note.trim().length > 0);
      const hasPhoto = log.photos > 0;

      seenVenues.add(event.venueId);
      seenArtists.add(event.artistId);
      seenMonths.add(key);

      const xpInputs: XpBonusInputs = { isNewVenue, isNewArtist, hasReview, hasPhoto, firstOfMonth };
      const xpGain = computeLogXp(xpInputs);
      xpTotal += xpGain;

      const createdAt = new Date(eventDate.getTime() + log.daysAfterEvent * 24 * 60 * 60 * 1000);

      const createdLog = await prisma.userLog.upsert({
        where: { userId_eventId: { userId: log.userId, eventId: log.eventId } },
        update: {
          rating: log.rating,
          note: log.note ?? null,
          visibility: 'PUBLIC',
          createdAt,
          updatedAt: createdAt,
        },
        create: {
          id: log.id,
          userId: log.userId,
          eventId: log.eventId,
          rating: log.rating,
          note: log.note ?? null,
          visibility: 'PUBLIC',
          createdAt,
          updatedAt: createdAt,
        },
      });

      for (let i = 0; i < log.photos; i++) {
        const photoId = `photo-${log.id}-${i + 1}`;
        await prisma.logPhoto.upsert({
          where: { id: photoId },
          update: { photoUrl: placeholderImage(photoId, 900, 1200) },
          create: {
            id: photoId,
            logId: createdLog.id,
            userId: log.userId,
            photoUrl: placeholderImage(photoId, 900, 1200),
            visibility: 'PUBLIC',
          },
        });
        totalPhotos++;
      }

      const xpEntryId = `xp-${log.id}`;
      await prisma.xpEntry.upsert({
        where: { id: xpEntryId },
        update: { amount: xpGain, reason: buildXpReason(xpInputs), logId: createdLog.id },
        create: {
          id: xpEntryId,
          userId: log.userId,
          logId: createdLog.id,
          amount: xpGain,
          reason: buildXpReason(xpInputs),
          createdAt,
        },
      });
    }

    // Set (not increment) so the script stays idempotent across re-runs.
    await prisma.user.update({ where: { id: user.id }, data: { xpTotal } });
  }

  console.log(`  logs: ${LOGS.length}, photos: ${totalPhotos}`);
}

async function seedComments() {
  for (const c of COMMENTS) {
    await prisma.comment.upsert({
      where: { id: c.id },
      update: { text: c.text },
      create: { id: c.id, logId: c.logId, userId: c.userId, text: c.text },
    });
  }
  console.log(`  comments: ${COMMENTS.length}`);
}

async function seedLogLikes() {
  // Deterministic: each log gets liked by the next two users in the roster
  // (wrapping around), skipping the log's own author.
  const userIds = USERS.map((u) => u.id);
  let count = 0;

  for (const log of LOGS) {
    const others = userIds.filter((id) => id !== log.userId);
    const likers = others.slice(0, 2);
    for (const likerId of likers) {
      await prisma.logLike.upsert({
        where: { userId_logId: { userId: likerId, logId: log.id } },
        update: {},
        create: { userId: likerId, logId: log.id },
      });
      count++;
    }
  }
  console.log(`  log likes: ${count}`);
}

async function seedBadges() {
  await ensureBadgeCatalog();
  let totalNewBadges = 0;
  for (const user of USERS) {
    const result = await checkBadges(user.id, { award: true });
    totalNewBadges += result.newBadges.length;
  }
  const catalogSize = await prisma.badge.count();
  console.log(`  badge catalog: ${catalogSize}, user badges awarded: ${totalNewBadges}`);
}

async function seedPresales() {
  for (const p of PRESALES) {
    const event = EVENTS.find((e) => e.id === p.eventId)!;
    const venue = VENUES.find((v) => v.id === event.venueId)!;
    const artist = ARTISTS.find((a) => a.id === event.artistId)!;
    const eventDate = daysFromNow(event.daysOffset);

    await prisma.presale.upsert({
      where: {
        artistName_venueName_eventDate_presaleType: {
          artistName: artist.name,
          venueName: venue.name,
          eventDate,
          presaleType: p.presaleType,
        },
      },
      update: {
        tourName: event.name,
        venueCity: venue.city,
        venueState: venue.state,
        presaleStart: daysFromNow(event.daysOffset + p.presaleStartOffsetDays),
        onsaleStart: daysFromNow(event.daysOffset + p.onsaleStartOffsetDays),
        code: p.code ?? null,
        source: p.source,
      },
      create: {
        artistName: artist.name,
        tourName: event.name,
        venueName: venue.name,
        venueCity: venue.city,
        venueState: venue.state,
        eventDate,
        presaleType: p.presaleType,
        presaleStart: daysFromNow(event.daysOffset + p.presaleStartOffsetDays),
        onsaleStart: daysFromNow(event.daysOffset + p.onsaleStartOffsetDays),
        code: p.code ?? null,
        source: p.source,
      },
    });
  }
  console.log(`  presales: ${PRESALES.length}`);
}

async function seedTickets() {
  for (const t of TICKETS) {
    const barcode = `SEED-${t.id.toUpperCase()}`;
    await prisma.userTicket.upsert({
      where: { userId_eventId_barcode: { userId: t.userId, eventId: t.eventId, barcode } },
      update: {
        section: t.section ?? null,
        row: t.row ?? null,
        seat: t.seat ?? null,
        isGeneralAdmission: t.isGeneralAdmission ?? false,
        status: t.status,
        purchasePrice: t.purchasePrice ?? null,
        askingPrice: t.askingPrice ?? null,
      },
      create: {
        id: t.id,
        userId: t.userId,
        eventId: t.eventId,
        section: t.section ?? null,
        row: t.row ?? null,
        seat: t.seat ?? null,
        isGeneralAdmission: t.isGeneralAdmission ?? false,
        status: t.status,
        source: 'MANUAL',
        barcode,
        purchasePrice: t.purchasePrice ?? null,
        askingPrice: t.askingPrice ?? null,
      },
    });
  }
  console.log(`  tickets: ${TICKETS.length}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('Seeding Sticket API database...');

  await seedArtists();
  await seedVenues();
  await seedEvents();
  await seedUsers();
  await seedFollows();
  await seedLogs();
  await seedComments();
  await seedLogLikes();
  await seedBadges();
  await seedPresales();
  await seedTickets();

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
