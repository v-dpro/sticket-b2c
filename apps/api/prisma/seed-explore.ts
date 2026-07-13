// ---------------------------------------------------------------------------
// Sticket API — EXPLORE ENRICHMENT seed
//
// Adds a degree-rich social graph on top of user-alex-chen (from seed.ts)
// and the cat-* catalog (from seed-catalog.ts) so the Explore page and
// degree-based facepiles (who-went, was-there, friends-going) have real,
// varied data to render: a 2nd-degree-deep follow graph, artist follows,
// public shared logs with photos clustered on shared events, event
// interest, presales, and engagement (likes/comments).
//
// Fully idempotent: every row is written with a deterministic id prefixed
// 'exp-' (or a stable natural unique key) via `upsert`, so re-running this
// script any number of times converges on the same dataset instead of
// duplicating rows. No `Math.random()` anywhere — every "random-looking"
// choice is a stable hash of fixed strings.
//
// Prereqs: `npm run db:seed` (for user-alex-chen) and `npm run db:seed:catalog`
// (for cat-artist-*/cat-venue-*/cat-event-* rows) must have already run.
//
// Run with:  DATABASE_URL=<url> npx tsx prisma/seed-explore.ts
//       or:  npm run db:seed:explore
// ---------------------------------------------------------------------------

import 'dotenv/config';
import bcrypt from 'bcryptjs';

import { prisma } from '../src/lib/prisma.js';

// ---------------------------------------------------------------------------
// Small deterministic helpers (mirrors prisma/seed-playground.ts's style —
// no shared seed-utils module exists in this repo, so each seed script is
// self-contained).
// ---------------------------------------------------------------------------

function placeholderImage(seed: string, w = 800, h = 800): string {
  return `https://picsum.photos/seed/${seed}/${w}/${h}`;
}

// Real concert/festival photography (Unsplash CDN, every URL verified live)
// — logs get believable stage/crowd shots instead of picsum noise.
const CONCERT_PHOTOS = [
  'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=1200&q=80',
  'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&q=80',
  'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1200&q=80',
  'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200&q=80',
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&q=80',
  'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=1200&q=80',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&q=80',
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&q=80',
  'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=1200&q=80',
  'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1200&q=80',
  'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=1200&q=80',
  'https://images.unsplash.com/photo-1563841930606-67e2bce48b78?w=1200&q=80',
  'https://images.unsplash.com/photo-1522158637959-30385a09e0da?w=1200&q=80',
  'https://images.unsplash.com/photo-1478147427282-58a87a120781?w=1200&q=80',
  'https://images.unsplash.com/photo-1509824227185-9c5a01ceba0d?w=1200&q=80',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&q=80',
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&q=80',
  'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=1200&q=80',
  'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=1200&q=80',
  'https://images.unsplash.com/photo-1471478331149-c72f17e33c73?w=1200&q=80',
  'https://images.unsplash.com/photo-1524650359799-842906ca1c06?w=1200&q=80',
  'https://images.unsplash.com/photo-1518976024611-28bf4b48222e?w=1200&q=80',
  'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=1200&q=80',
  'https://images.unsplash.com/photo-1496337589254-7e19d01cec44?w=1200&q=80',
  'https://images.unsplash.com/photo-1499364615650-ec38552f4f34?w=1200&q=80',
  'https://images.unsplash.com/photo-1484755560615-a4c64e778a6c?w=1200&q=80',
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&q=80',
  'https://images.unsplash.com/photo-1461784121038-f088ca1e7714?w=1200&q=80',
  'https://images.unsplash.com/photo-1521337581100-8ca9a73a5f79?w=1200&q=80',
  'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=1200&q=80',
] as const;

function concertPhoto(seed: string): string {
  return CONCERT_PHOTOS[stableHash(seed) % CONCERT_PHOTOS.length]!;
}

/** Realistic face avatars (pravatar, stable per user). */
function faceAvatar(seed: string): string {
  return `https://i.pravatar.cc/300?img=${(stableHash(seed) % 70) + 1}`;
}


/** FNV-1a style string hash — deterministic, no external deps. */
function stableHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Evenly spread `count` items (inclusive of both ends) across `arr`, preserving order. */
function pickSpread<T>(arr: T[], count: number): T[] {
  if (arr.length === 0 || count <= 0) return [];
  if (arr.length <= count) return arr.slice();
  const out: T[] = [];
  for (let i = 0; i < count; i++) {
    const idx = count === 1 ? 0 : Math.round((i * (arr.length - 1)) / (count - 1));
    out.push(arr[idx]!);
  }
  return out;
}

/** n distinct one-decimal scores in [min, max], descending. */
function buildScorePool(n: number, min: number, max: number): number[] {
  const scores: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1);
    let v = Math.round((max - t * (max - min)) * 10) / 10;
    while (scores.includes(v)) v = Math.round((v - 0.1) * 10) / 10;
    scores.push(v);
  }
  return scores;
}

/** Assigns each eventId a (score, scoreRank) pair in [min, max], in a fixed but hashed order. */
function assignScores(userId: string, eventIds: string[], min: number, max: number): Map<string, { score: number; scoreRank: number }> {
  const pool = buildScorePool(eventIds.length, min, max); // descending
  const order = eventIds.slice().sort((a, b) => stableHash(`${userId}:${a}`) - stableHash(`${userId}:${b}`));
  const map = new Map<string, { score: number; scoreRank: number }>();
  order.forEach((eventId, i) => {
    map.set(eventId, { score: pool[i]!, scoreRank: (pool.length - i) * 137 });
  });
  return map;
}

const SEED_PASSWORD_HASH = await bcrypt.hash('password123', 12);

// ---------------------------------------------------------------------------
// The 12 new Explore users
// ---------------------------------------------------------------------------

type ExpUser = { id: string; email: string; username: string; displayName: string; city: string; bio: string };

// Order matters: first 6 are Alex's direct follows (degree 1), last 6 are
// friends-of-those-friends (degree 2 relative to Alex, never followed by
// Alex directly).
const EXP_USERS: ExpUser[] = [
  { id: 'exp-user-riley-nguyen', email: 'exp-riley@seed.sticket.dev', username: 'rileynguyen', displayName: 'Riley Nguyen', city: 'Brooklyn, NY', bio: 'Always down for a last-minute show.' },
  { id: 'exp-user-jasmine-cole', email: 'exp-jasmine@seed.sticket.dev', username: 'jasminecole', displayName: 'Jasmine Cole', city: 'Los Angeles, CA', bio: 'Front row hunter, encore chaser.' },
  { id: 'exp-user-marcus-webb', email: 'exp-marcus@seed.sticket.dev', username: 'marcuswebb', displayName: 'Marcus Webb', city: 'Chicago, IL', bio: 'Vinyl collector who never misses a tour stop.' },
  { id: 'exp-user-priya-shah', email: 'exp-priya@seed.sticket.dev', username: 'priyashah', displayName: 'Priya Shah', city: 'Austin, TX', bio: 'Festival season is a lifestyle, not a phase.' },
  { id: 'exp-user-noah-kim', email: 'exp-noah@seed.sticket.dev', username: 'noahkim', displayName: 'Noah Kim', city: 'Seattle, WA', bio: 'Rain or shine, always at the Gorge.' },
  { id: 'exp-user-ella-brandt', email: 'exp-ella@seed.sticket.dev', username: 'ellabrandt', displayName: 'Ella Brandt', city: 'Nashville, TN', bio: 'Songwriter rounds and stadium shows both.' },
  { id: 'exp-user-diego-alvarez', email: 'exp-diego@seed.sticket.dev', username: 'diegoalvarez', displayName: 'Diego Alvarez', city: 'Miami, FL', bio: 'Reggaeton and late nights.' },
  { id: 'exp-user-hana-suzuki', email: 'exp-hana@seed.sticket.dev', username: 'hanasuzuki', displayName: 'Hana Suzuki', city: 'San Francisco, CA', bio: 'Photo pit or nothing.' },
  { id: 'exp-user-cole-fitzgerald', email: 'exp-cole@seed.sticket.dev', username: 'colefitzgerald', displayName: 'Cole Fitzgerald', city: 'Denver, CO', bio: 'Red Rocks regular, altitude be damned.' },
  { id: 'exp-user-zoe-martins', email: 'exp-zoe@seed.sticket.dev', username: 'zoemartins', displayName: 'Zoe Martins', city: 'Boston, MA', bio: 'Keeping a spreadsheet of every show I have seen.' },
  { id: 'exp-user-omar-hassan', email: 'exp-omar@seed.sticket.dev', username: 'omarhassan', displayName: 'Omar Hassan', city: 'Portland, OR', bio: 'Bass-heavy nights only.' },
  { id: 'exp-user-lucy-bennett', email: 'exp-lucy@seed.sticket.dev', username: 'lucybennett', displayName: 'Lucy Bennett', city: 'New York, NY', bio: 'Collecting ticket stubs since 2015.' },
];

// The ANCHOR — the account the degree graph is built around. Defaults to
// the demo user; ANCHOR_SOLE_APPLE=1 resolves the DB's single Apple-sign-in
// user instead (the playground convention for prod), and ANCHOR_USER_ID
// pins an explicit id. Resolved in main() before any rows are written.
let ALEX_ID = process.env.ANCHOR_USER_ID || 'user-alex-chen';

const DEGREE1_IDS = EXP_USERS.slice(0, 6).map((u) => u.id);
const DEGREE2_IDS = EXP_USERS.slice(6, 12).map((u) => u.id);
const [riley, jasmine, marcus, priya, noah, ella] = DEGREE1_IDS as [string, string, string, string, string, string];
const [diego, hana, cole, zoe, omar, lucy] = DEGREE2_IDS as [string, string, string, string, string, string];

// ---------------------------------------------------------------------------
// Follow graph — degree-rich: Alex -> 6 (degree 1); those 6 -> the other 6
// among themselves (degree 2 from Alex, never touched by Alex directly);
// plus a handful of mutuals so the graph isn't a strict tree.
// ---------------------------------------------------------------------------

// Anchor-dependent rows are read through this getter so the anchor can be
// resolved at runtime (ANCHOR_SOLE_APPLE) before any row is written.
const FOLLOWS: { followerId: string; followingId: string }[] = [];
function buildFollows(): void {
  FOLLOWS.length = 0;
  FOLLOWS.push(
  // anchor -> degree 1
  { followerId: ALEX_ID, followingId: riley },
  { followerId: ALEX_ID, followingId: jasmine },
  { followerId: ALEX_ID, followingId: marcus },
  { followerId: ALEX_ID, followingId: priya },
  { followerId: ALEX_ID, followingId: noah },
  { followerId: ALEX_ID, followingId: ella },
  // a few follow the anchor back (mutual)
  { followerId: riley, followingId: ALEX_ID },
  { followerId: jasmine, followingId: ALEX_ID },
  { followerId: marcus, followingId: ALEX_ID },
  // degree 1 -> degree 2 (each degree-2 user picked up by exactly two degree-1 friends)
  { followerId: riley, followingId: diego },
  { followerId: riley, followingId: hana },
  { followerId: jasmine, followingId: hana },
  { followerId: jasmine, followingId: cole },
  { followerId: marcus, followingId: cole },
  { followerId: marcus, followingId: zoe },
  { followerId: priya, followingId: zoe },
  { followerId: priya, followingId: omar },
  { followerId: noah, followingId: omar },
  { followerId: noah, followingId: lucy },
  { followerId: ella, followingId: lucy },
  { followerId: ella, followingId: diego },
  // mutuals within degree 1
  { followerId: riley, followingId: jasmine },
  { followerId: jasmine, followingId: riley },
  { followerId: marcus, followingId: noah },
  { followerId: noah, followingId: marcus },
  // mutuals within degree 2 (they know each other directly; Alex never does)
  { followerId: diego, followingId: hana },
  { followerId: hana, followingId: diego },
  { followerId: cole, followingId: zoe },
  { followerId: zoe, followingId: cole },
  { followerId: omar, followingId: lucy },
  { followerId: lucy, followingId: omar },
  );
}

// ---------------------------------------------------------------------------
// Artist follows — every seed user follows 3-8 cat-* artists; Alex gets 3
// explicit follows on artists with near-term upcoming shows so the presale
// step below has something real to attach to.
// ---------------------------------------------------------------------------

const ARTIST_POOL = [
  'cat-artist-taylor-swift',
  'cat-artist-billie-eilish',
  'cat-artist-the-weeknd',
  'cat-artist-bad-bunny',
  'cat-artist-sza',
  'cat-artist-kendrick-lamar',
  'cat-artist-doja-cat',
  'cat-artist-dua-lipa',
  'cat-artist-arctic-monkeys',
  'cat-artist-phoebe-bridgers',
  'cat-artist-fred-again',
  'cat-artist-chappell-roan',
  'cat-artist-tyler-the-creator',
  'cat-artist-olivia-rodrigo',
  'cat-artist-zach-bryan',
];

const ALEX_ARTIST_FOLLOWS = ['cat-artist-the-weeknd', 'cat-artist-fred-again', 'cat-artist-billie-eilish'];

function pickArtistFollows(userId: string): string[] {
  const count = 3 + (stableHash(`af-count:${userId}`) % 6); // 3..8
  const ordered = ARTIST_POOL.slice().sort((a, b) => stableHash(`af:${userId}:${a}`) - stableHash(`af:${userId}:${b}`));
  return ordered.slice(0, count);
}

// ---------------------------------------------------------------------------
// Captions / comments — short, concert-energy, no emoji.
// ---------------------------------------------------------------------------

const LOG_CAPTIONS = [
  'voice is gone, no regrets.',
  'that encore alone was worth the drive.',
  'front section for this one, worth every penny.',
  'openers were better than half the headliners I have seen.',
  'sound in this room is criminally underrated.',
  'crowd carried the whole night.',
  'setlist read like my most-played of the year.',
  'stayed through the rain for the encore and it was worth it.',
  'first time seeing them live and it will not be the last.',
  'lighting rig alone deserves a review.',
  'got there for soundcheck, no regrets doing that again.',
  'surprise cover mid-set had the whole floor screaming.',
  'bass hit different from the pit.',
  'ran into three people I knew and none of us planned it.',
  'this venue has the best sightlines I have found yet.',
  'still thinking about that transition into the last song.',
  'confetti drop got me even though I saw it coming.',
  'acoustic break broke the whole room.',
  'closer than I ever expected to get for this price.',
  'second time seeing this tour and it topped the first.',
];

function pickCaption(seed: string): string {
  return LOG_CAPTIONS[stableHash(seed) % LOG_CAPTIONS.length]!;
}

// --- C23 TRENDS: hashtag captions with real clustering -----------------------
// Hub event 0's four attendees all tag #frontrail and hub event 1's first
// three tag #proposal, so those two events cross the demo TREND_THRESHOLD (3)
// and promote to their HIGHLIGHTS rails. Everything else is a scattered
// one-off tag that deliberately stays below the threshold. Captions sit in
// the upsert's update clause too, so re-running refreshes them in place.

const FRONTRAIL_CAPTIONS = [
  'four hours in line and worth every single minute. #frontrail is the only way to see this show.',
  'she pointed at our row during the bridge, I am never recovering. #frontrail',
  'the setlist hits different from up close. #frontrail crew knows.',
  'rail or nothing tonight, no regrets about the early alarm. #frontrail #noregrets',
];

const PROPOSAL_CAPTIONS = [
  'someone got engaged during the acoustic set and the whole floor lost it. #proposal',
  'witnessed a #proposal two rows over during the encore. crying in section A.',
  'the #proposal on the big screen tonight had the entire venue screaming.',
];

// One use each — scattered organic tags that never cross the threshold.
const SCATTER_TAGS = ['#encore', '#confetti', '#barricade', '#setlist', '#merchhaul', '#roadtrip', '#openingnight', '#pit'];

/** Keys `${userId}:${eventId}` of hub logs whose captions carry the clustered tags. */
function buildCaptionOverrides(hubEvents: CatEvent[]): Map<string, string> {
  const overrides = new Map<string, string>();
  const frontrailEvent = hubEvents[0];
  if (frontrailEvent) {
    HUB_ATTENDEES[0]!.forEach((userId, i) => {
      overrides.set(`${userId}:${frontrailEvent.id}`, FRONTRAIL_CAPTIONS[i % FRONTRAIL_CAPTIONS.length]!);
    });
  }
  const proposalEvent = hubEvents[1];
  if (proposalEvent) {
    HUB_ATTENDEES[1]!.slice(0, PROPOSAL_CAPTIONS.length).forEach((userId, i) => {
      overrides.set(`${userId}:${proposalEvent.id}`, PROPOSAL_CAPTIONS[i]!);
    });
  }
  return overrides;
}

const COMMENT_POOL = [
  'wait I need to catch this tour next time',
  'the way you described this has me reconsidering my plans',
  'okay this setlist is insane, so jealous',
  'we need to go together next run',
  'your photos from this one are so good',
  'this is exactly why I love that room',
  'front section?? show off',
  'I was on the fence about this one, now I regret skipping',
];

const REPLY_POOL = [
  'right?? still thinking about it',
  'you have to come next time, no excuses',
  'honestly one of the best nights all year',
  'yes, bring the whole group next time',
];

function pickFrom(pool: string[], seed: string): string {
  return pool[stableHash(seed) % pool.length]!;
}

/** Deterministically pick `n` other user ids from `candidates`, excluding `excludeId`. */
function pickOthers(candidates: string[], excludeId: string, n: number, seed: string): string[] {
  const pool = candidates.filter((id) => id !== excludeId);
  const ordered = pool.slice().sort((a, b) => stableHash(`${seed}:${a}`) - stableHash(`${seed}:${b}`));
  return ordered.slice(0, Math.min(n, ordered.length));
}

// ---------------------------------------------------------------------------
// Catalog loading
// ---------------------------------------------------------------------------

type CatEvent = {
  id: string;
  name: string;
  date: Date;
  artistId: string;
  artistName: string;
  venueId: string;
  venueName: string;
  venueCity: string;
  venueState: string | null;
};

async function verifyPrereqs(): Promise<void> {
  const [alex, catalogArtists, catalogEvents] = await Promise.all([
    prisma.user.findUnique({ where: { id: ALEX_ID }, select: { id: true } }),
    prisma.artist.count({ where: { id: { startsWith: 'cat-artist-' } } }),
    prisma.event.count({ where: { id: { startsWith: 'cat-event-' } } }),
  ]);
  if (!alex) {
    console.error(`ERROR: ${ALEX_ID} not found. Run \`npm run db:seed\` first. Nothing was created.`);
    process.exit(1);
  }
  if (catalogArtists === 0 || catalogEvents === 0) {
    console.error('ERROR: catalog not found (no cat-artist-*/cat-event-* rows). Run `npm run db:seed:catalog` first. Nothing was created.');
    process.exit(1);
  }
  console.log(`  prereqs ok: ${ALEX_ID} exists, ${catalogArtists} catalog artists, ${catalogEvents} catalog events`);
}

async function loadCatalogEvents(): Promise<{ past: CatEvent[]; future: CatEvent[] }> {
  const rows = await prisma.event.findMany({
    where: { id: { startsWith: 'cat-event-' } },
    include: {
      artist: { select: { id: true, name: true } },
      venue: { select: { id: true, name: true, city: true, state: true } },
    },
    orderBy: { date: 'asc' },
  });

  const mapped: CatEvent[] = rows.map((e) => ({
    id: e.id,
    name: e.name,
    date: e.date,
    artistId: e.artist.id,
    artistName: e.artist.name,
    venueId: e.venue.id,
    venueName: e.venue.name,
    venueCity: e.venue.city,
    venueState: e.venue.state,
  }));

  const now = new Date();
  return { past: mapped.filter((e) => e.date < now), future: mapped.filter((e) => e.date >= now) };
}

// ---------------------------------------------------------------------------
// Seed steps
// ---------------------------------------------------------------------------

async function seedUsers(): Promise<void> {
  for (const u of EXP_USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        username: u.username,
        displayName: u.displayName,
        city: u.city,
        homeCity: u.city,
        bio: u.bio,
        avatarUrl: faceAvatar(u.id),
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
        avatarUrl: faceAvatar(u.id),
        passwordHash: SEED_PASSWORD_HASH,
        emailVerified: true,
      },
    });
  }
  console.log(`  users: ${EXP_USERS.length} (password: "password123" for all)`);
}

async function seedFollows(): Promise<number> {
  for (const f of FOLLOWS) {
    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId: f.followerId, followingId: f.followingId } },
      update: {},
      create: { id: `exp-follow-${f.followerId}-${f.followingId}`, followerId: f.followerId, followingId: f.followingId },
    });
  }
  console.log(`  follows: ${FOLLOWS.length} (Alex degree-1: 6, degree-1<->degree-2: 12, mutuals: 10, back-follows to Alex: 3)`);
  return FOLLOWS.length;
}

async function seedArtistFollows(): Promise<number> {
  let count = 0;

  for (const artistId of ALEX_ARTIST_FOLLOWS) {
    await prisma.userArtistFollow.upsert({
      where: { userId_artistId: { userId: ALEX_ID, artistId } },
      update: { tier: 'following' },
      create: { id: `exp-artistfollow-${ALEX_ID}-${artistId}`, userId: ALEX_ID, artistId, tier: 'following' },
    });
    count++;
  }

  for (const u of EXP_USERS) {
    const artistIds = pickArtistFollows(u.id);
    for (const artistId of artistIds) {
      await prisma.userArtistFollow.upsert({
        where: { userId_artistId: { userId: u.id, artistId } },
        update: { tier: 'following' },
        create: { id: `exp-artistfollow-${u.id}-${artistId}`, userId: u.id, artistId, tier: 'following' },
      });
      count++;
    }
  }

  console.log(`  artist follows: ${count} (Alex: ${ALEX_ARTIST_FOLLOWS.length}, others: ${count - ALEX_ARTIST_FOLLOWS.length})`);
  return count;
}

// --- Logs: hub events (4+ mixed-degree attendees) + per-user filler picks ---

const HUB_ATTENDEES: string[][] = [
  [riley, jasmine, diego, hana], // H1: 2 degree-1 + 2 degree-2
  [marcus, priya, cole, zoe], // H2
  [noah, ella, omar, lucy], // H3
  [riley, marcus, noah, diego, cole], // H4: 3 degree-1 + 2 degree-2
  [jasmine, priya, ella, hana, zoe, omar], // H5: 3 degree-1 + 3 degree-2
];

// Aligned to EXP_USERS order: riley, jasmine, marcus, priya, noah, ella, diego, hana, cole, zoe, omar, lucy
const TARGET_LOG_COUNTS = [4, 4, 3, 3, 3, 3, 4, 3, 3, 3, 4, 3];

type LogPlan = { userId: string; event: CatEvent };

function buildLogPlans(past: CatEvent[]): { plans: LogPlan[]; hubEvents: CatEvent[] } {
  const hubEvents = pickSpread(past, HUB_ATTENDEES.length);
  const plans: LogPlan[] = [];
  const usedByUser = new Map<string, Set<string>>();

  function addPlan(userId: string, event: CatEvent) {
    const used = usedByUser.get(userId) ?? new Set<string>();
    if (used.has(event.id)) return;
    used.add(event.id);
    usedByUser.set(userId, used);
    plans.push({ userId, event });
  }

  HUB_ATTENDEES.forEach((attendees, i) => {
    const event = hubEvents[i];
    if (!event) return;
    for (const userId of attendees) addPlan(userId, event);
  });

  EXP_USERS.forEach((u, idx) => {
    const target = TARGET_LOG_COUNTS[idx] ?? 3;
    const already = usedByUser.get(u.id)?.size ?? 0;
    const need = Math.max(0, target - already);
    const excludeIds = usedByUser.get(u.id) ?? new Set<string>();
    const pool = past
      .filter((e) => !excludeIds.has(e.id))
      .slice()
      .sort((a, b) => stableHash(`log-extra:${u.id}:${a.id}`) - stableHash(`log-extra:${u.id}:${b.id}`));
    for (let i = 0; i < need && i < pool.length; i++) addPlan(u.id, pool[i]!);
  });

  return { plans, hubEvents };
}

type LogRow = { id: string; userId: string; event: CatEvent; score: number; scoreRank: number; note: string; photos: string[]; createdAt: Date };

function buildLogRows(plans: LogPlan[], hubEvents: CatEvent[]): LogRow[] {
  const captionOverrides = buildCaptionOverrides(hubEvents);

  const byUser = new Map<string, LogPlan[]>();
  for (const p of plans) {
    const arr = byUser.get(p.userId) ?? [];
    arr.push(p);
    byUser.set(p.userId, arr);
  }

  const rows: LogRow[] = [];
  for (const [userId, userPlans] of byUser) {
    const eventIds = userPlans.map((p) => p.event.id);
    const scores = assignScores(userId, eventIds, 6.5, 9.8);

    for (const p of userPlans) {
      const s = scores.get(p.event.id)!;
      const dayOffset = 1 + (stableHash(`offset:${userId}:${p.event.id}`) % 5); // 1-5 days after the show
      const createdAt = new Date(p.event.date.getTime() + dayOffset * 86_400_000);
      const photoCount = 1 + (stableHash(`photos:${userId}:${p.event.id}`) % 3); // 1-3
      const id = `exp-log-${userId.replace('exp-user-', '')}-${p.event.id.replace('cat-event-', '')}`;

      rows.push({
        id,
        userId,
        event: p.event,
        score: s.score,
        scoreRank: s.scoreRank,
        note: captionOverrides.get(`${userId}:${p.event.id}`) ?? pickCaption(`cap:${userId}:${p.event.id}`),
        photos: Array.from({ length: photoCount }, (_, i) => concertPhoto(`exp-photo-${id}-${i + 1}`)),
        createdAt,
      });
    }
  }

  // Scattered one-off tags on a stable subset of the non-clustered logs so
  // hashtags feel organic, not just present on the two trending events.
  const scatterRows = rows
    .filter((r) => !captionOverrides.has(`${r.userId}:${r.event.id}`))
    .sort((a, b) => stableHash(`scatter:${a.id}`) - stableHash(`scatter:${b.id}`))
    .slice(0, SCATTER_TAGS.length);
  scatterRows.forEach((row, i) => {
    row.note = `${row.note} ${SCATTER_TAGS[i]}`;
  });

  return rows;
}

async function seedLogs(logRows: LogRow[]): Promise<{ logCount: number; photoCount: number }> {
  let photoCount = 0;

  for (const row of logRows) {
    await prisma.userLog.upsert({
      where: { userId_eventId: { userId: row.userId, eventId: row.event.id } },
      update: {
        note: row.note,
        score: row.score,
        scoreRank: row.scoreRank,
        visibility: 'PUBLIC',
        sharedAt: row.createdAt,
        createdAt: row.createdAt,
        updatedAt: row.createdAt,
      },
      create: {
        id: row.id,
        userId: row.userId,
        eventId: row.event.id,
        note: row.note,
        score: row.score,
        scoreRank: row.scoreRank,
        visibility: 'PUBLIC',
        sharedAt: row.createdAt,
        createdAt: row.createdAt,
        updatedAt: row.createdAt,
      },
    });

    for (let i = 0; i < row.photos.length; i++) {
      const photoId = `exp-photo-${row.id}-${i + 1}`;
      await prisma.logPhoto.upsert({
        where: { id: photoId },
        update: { photoUrl: row.photos[i]!, visibility: 'PUBLIC' },
        create: { id: photoId, logId: row.id, userId: row.userId, photoUrl: row.photos[i]!, visibility: 'PUBLIC' },
      });
      photoCount++;
    }
  }

  console.log(`  logs: ${logRows.length}, photos: ${photoCount}`);
  return { logCount: logRows.length, photoCount };
}

// --- Engagement: likes + comments on a subset of the shared logs ---

async function seedEngagement(logRows: LogRow[]): Promise<{ likeCount: number; commentCount: number }> {
  const allUserIds = EXP_USERS.map((u) => u.id);

  // "a handful" — engage on about 40% of the logs, not every single one.
  const engagementLogs = logRows
    .slice()
    .sort((a, b) => stableHash(`eng:${a.id}`) - stableHash(`eng:${b.id}`))
    .slice(0, 16);

  let likeCount = 0;
  let commentCount = 0;

  for (const log of engagementLogs) {
    const likerCount = 2 + (stableHash(`like:${log.id}`) % 3); // 2-4
    const likers = pickOthers(allUserIds, log.userId, likerCount, `like:${log.id}`);
    for (const likerId of likers) {
      await prisma.logLike.upsert({
        where: { userId_logId: { userId: likerId, logId: log.id } },
        update: {},
        create: { id: `exp-like-${likerId}-${log.id}`, userId: likerId, logId: log.id },
      });
      likeCount++;
    }
  }

  const commentLogs = engagementLogs.slice(0, 10);
  for (const log of commentLogs) {
    const commenterCount = 1 + (stableHash(`cmt:${log.id}`) % 2); // 1-2
    const commenters = pickOthers(allUserIds, log.userId, commenterCount, `cmt:${log.id}`);
    let rootId: string | null = null;
    for (let i = 0; i < commenters.length; i++) {
      const commenterId = commenters[i]!;
      const id = `exp-comment-${log.id}-${i + 1}`;
      const text = i === 0 ? pickFrom(COMMENT_POOL, `c0:${log.id}`) : pickFrom(REPLY_POOL, `c${i}:${log.id}`);
      const parentId = i === 0 ? null : rootId;

      await prisma.comment.upsert({
        where: { id },
        update: { text, parentId },
        create: { id, logId: log.id, userId: commenterId, text, parentId },
      });
      if (i === 0) rootId = id;
      commentCount++;
    }
  }

  // A few from Alex himself on his degree-1 friends' logs, so his own feed
  // shows him engaging with people he follows.
  const alexLogs = logRows.filter((l) => DEGREE1_IDS.includes(l.userId)).slice(0, 3);
  for (const log of alexLogs) {
    await prisma.logLike.upsert({
      where: { userId_logId: { userId: ALEX_ID, logId: log.id } },
      update: {},
      create: { id: `exp-like-alex-${log.id}`, userId: ALEX_ID, logId: log.id },
    });
    likeCount++;
  }
  const alexCommentLog = alexLogs[0];
  if (alexCommentLog) {
    const id = `exp-comment-alex-${alexCommentLog.id}`;
    await prisma.comment.upsert({
      where: { id },
      update: { text: 'need to catch this tour, looks incredible' },
      create: { id, logId: alexCommentLog.id, userId: ALEX_ID, text: 'need to catch this tour, looks incredible' },
    });
    commentCount++;
  }

  console.log(`  engagement: ${likeCount} likes, ${commentCount} comments (on ${engagementLogs.length} of ${logRows.length} logs)`);
  return { likeCount, commentCount };
}

// --- Tour thread: one seeded discussion on The 1975's tour ---

const THREAD_TOUR_ID = 'cat-tour-the-1975-still-at-their-very-best';

// (authorId, text) in posting order; createdAt is staggered a minute apart so
// the flat list renders in a stable order.
const THREAD_MESSAGES: Array<{ authorId: string; text: string }> = [
  { authorId: riley, text: 'Setlist has been basically locked all leg but they swapped in Robbers last night??' },
  { authorId: diego, text: 'Can confirm, Robbers over Fallingforyou. The crowd lost it.' },
  { authorId: marcus, text: 'They did the same swap in Chicago. Feels permanent now.' },
  { authorId: hana, text: 'Photo pit tip: Matty comes to the left catwalk during Love It If We Made It.' },
  { authorId: riley, text: 'ok updating my predictions doc lol. see everyone at the closer' },
];

async function seedTourThread(): Promise<number> {
  const tour = await prisma.tour.findUnique({ where: { id: THREAD_TOUR_ID }, select: { id: true } });
  if (!tour) {
    console.log(`  tour thread: skipped (${THREAD_TOUR_ID} not found — run db:seed:catalog first)`);
    return 0;
  }

  // Messages start a few days ago and land a minute apart; the thread's
  // updatedAt (its "last activity" clock) is pinned to the final message.
  const base = new Date(Date.now() - 3 * 86_400_000);
  const messageAt = (i: number) => new Date(base.getTime() + i * 60_000);
  const lastAt = messageAt(THREAD_MESSAGES.length - 1);

  await prisma.tourThread.upsert({
    where: { id: 'exp-thread-1' },
    update: { title: 'Setlist watch: what are they playing this leg?', updatedAt: lastAt },
    create: {
      id: 'exp-thread-1',
      tourId: THREAD_TOUR_ID,
      authorId: riley,
      title: 'Setlist watch: what are they playing this leg?',
      createdAt: base,
      updatedAt: lastAt,
    },
  });

  for (let i = 0; i < THREAD_MESSAGES.length; i++) {
    const m = THREAD_MESSAGES[i]!;
    const id = `exp-thread-1-msg-${i + 1}`;
    await prisma.threadMessage.upsert({
      where: { id },
      update: { text: m.text },
      create: { id, threadId: 'exp-thread-1', authorId: m.authorId, text: m.text, createdAt: messageAt(i) },
    });
  }

  console.log(`  tour thread: exp-thread-1 on ${THREAD_TOUR_ID} (${THREAD_MESSAGES.length} messages)`);
  return THREAD_MESSAGES.length;
}

// --- Event interest (UserInterested) on future events ---

const INTEREST_ASSIGN: string[][] = [
  [riley, jasmine], // degree 1
  [marcus, priya], // degree 1
  [noah, ella], // degree 1
  [diego, hana], // degree 2
  [cole, zoe], // degree 2
];

async function seedEventInterest(future: CatEvent[]): Promise<number> {
  const interestEvents = pickSpread(future, INTEREST_ASSIGN.length);
  let count = 0;

  for (let i = 0; i < INTEREST_ASSIGN.length; i++) {
    const event = interestEvents[i];
    if (!event) continue;
    for (const userId of INTEREST_ASSIGN[i]!) {
      const id = `exp-interested-${userId}-${event.id}`;
      await prisma.userInterested.upsert({
        where: { userId_eventId: { userId, eventId: event.id } },
        update: {},
        create: { id, userId, eventId: event.id },
      });
      count++;
    }
  }

  console.log(`  event interest: ${count} rows across ${interestEvents.length} future events`);
  return count;
}

// --- Presales (4-6, within the next 14 days, on artists Alex follows) ---

const PRESALE_TYPES = ['Verified Fan', 'Artist Presale', 'Fan Club', 'American Express', 'Spotify', 'Citi Card'];

/** Keeps presaleStart inside [now+1day, now+13days] regardless of how far out the event itself is. */
function clampPresaleStart(eventDate: Date, now: Date): Date {
  const minStart = new Date(now.getTime() + 1 * 86_400_000);
  const maxStart = new Date(now.getTime() + 13 * 86_400_000);
  const ideal = new Date(eventDate.getTime() - 5 * 86_400_000);
  if (ideal < minStart) return minStart;
  if (ideal > maxStart) return maxStart;
  return ideal;
}

/**
 * The `Presale` unique key is a natural key (artistName+venueName+eventDate+
 * presaleType), not an id, and other seed scripts (seed.ts, seed-playground.ts)
 * write into the same table with their own artist/date picks. If our
 * deterministic pick happens to land on a key another script already owns
 * (a non "exp-" id), we must NOT upsert over it — skip and try the next
 * candidate instead, so this script only ever creates/updates its own rows.
 */
async function seedPresales(future: CatEvent[]): Promise<number> {
  const now = new Date();
  let count = 0;
  const targetPerArtist = 2;

  for (const artistId of ALEX_ARTIST_FOLLOWS) {
    const candidates = future.filter((e) => e.artistId === artistId).sort((a, b) => a.date.getTime() - b.date.getTime());

    let created = 0;
    let typeCursor = 0;
    for (const event of candidates) {
      if (created >= targetPerArtist) break;

      const presaleType = PRESALE_TYPES[typeCursor % PRESALE_TYPES.length]!;
      typeCursor++;
      const key = { artistName: event.artistName, venueName: event.venueName, eventDate: event.date, presaleType };

      const existing = await prisma.presale.findUnique({
        where: { artistName_venueName_eventDate_presaleType: key },
        select: { id: true },
      });
      if (existing && !existing.id.startsWith('exp-')) continue; // owned by another seed script — skip, don't overwrite

      const presaleStart = clampPresaleStart(event.date, now);
      const idealOnsale = new Date(presaleStart.getTime() + 4 * 86_400_000);
      const onsaleStart = idealOnsale < event.date ? idealOnsale : null;
      const code = `EXP${artistId.replace('cat-artist-', '').toUpperCase().replace(/-/g, '').slice(0, 8)}`;
      // Content-addressed id (event + presale type), NOT a running counter — the
      // counter shifts whenever a collision above is skipped, which would let the
      // same id get reassigned to a different natural key across runs and collide
      // with a row a prior run already created under that id.
      const id = `exp-presale-${event.id.replace('cat-event-', '')}-${presaleType.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

      await prisma.presale.upsert({
        where: { artistName_venueName_eventDate_presaleType: key },
        update: {
          tourName: event.name,
          venueCity: event.venueCity,
          venueState: event.venueState,
          presaleStart,
          onsaleStart,
          code,
          source: 'Explore Seed',
        },
        create: {
          id,
          ...key,
          tourName: event.name,
          venueCity: event.venueCity,
          venueState: event.venueState,
          presaleStart,
          onsaleStart,
          code,
          source: 'Explore Seed',
        },
      });
      count++;
      created++;
    }
  }

  console.log(`  presales: ${count} (artists: ${ALEX_ARTIST_FOLLOWS.join(', ')})`);
  return count;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('Seeding Sticket EXPLORE enrichment data...');

  // ANCHOR_SOLE_APPLE=1: build the graph around the DB's single Apple
  // sign-in account (prod convention — no emails printed).
  if (process.env.ANCHOR_SOLE_APPLE === '1') {
    const appleUsers = await prisma.user.findMany({
      where: { appleId: { not: null } },
      select: { id: true },
      take: 2,
    });
    if (appleUsers.length !== 1) {
      console.error(`ERROR: ANCHOR_SOLE_APPLE=1 needs exactly 1 Apple user, found ${appleUsers.length}. Nothing was created.`);
      process.exit(1);
    }
    ALEX_ID = appleUsers[0]!.id;
    console.log('  anchor: sole Apple sign-in user');
  }
  buildFollows();

  await verifyPrereqs();

  await seedUsers();
  const followCount = await seedFollows();
  const artistFollowCount = await seedArtistFollows();

  const { past, future } = await loadCatalogEvents();
  console.log(`  catalog events available: ${past.length} past, ${future.length} future`);

  const { plans, hubEvents } = buildLogPlans(past);
  const logRows = buildLogRows(plans, hubEvents);
  const { logCount, photoCount } = await seedLogs(logRows);

  const hubAttendeeCounts = HUB_ATTENDEES.map((a) => a.length);
  console.log(`  hub events (4+ mixed-degree attendees): ${hubEvents.map((e, i) => `${e.name} (${hubAttendeeCounts[i]})`).join(' | ')}`);
  console.log(
    `  trends: #frontrail x${HUB_ATTENDEES[0]!.length} on ${hubEvents[0]?.id ?? '(none)'}, ` +
      `#proposal x${PROPOSAL_CAPTIONS.length} on ${hubEvents[1]?.id ?? '(none)'}, ` +
      `${SCATTER_TAGS.length} scattered one-off tags`
  );

  const engagement = await seedEngagement(logRows);
  const threadMessageCount = await seedTourThread();
  const interestCount = await seedEventInterest(future);
  const presaleCount = await seedPresales(future);

  console.log('\n=== EXPLORE SEED SUMMARY ===');
  console.table({
    users: EXP_USERS.length,
    follows: followCount,
    'artist follows': artistFollowCount,
    logs: logCount,
    photos: photoCount,
    likes: engagement.likeCount,
    comments: engagement.commentCount,
    'thread messages': threadMessageCount,
    'event interest': interestCount,
    presales: presaleCount,
  });

  console.log('\nExplore seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
