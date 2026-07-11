// ---------------------------------------------------------------------------
// Sticket API — PLAYGROUND seeder
//
// Populates ONE real target user's account with rich demo content (a "demo
// crew" of 5 synthetic friends + a second-hop friend-of-a-friend, logs,
// engagement, upcoming shows, artist follows, venue content, presales, and
// badges) so every page in the app has something to show for that account.
//
// Contract:
//  - Reads TARGET_EMAIL (or TARGET_SOLE_APPLE=1, see below) to find the
//    target. If the target can't be resolved, prints a clear error and
//    exits(1) WITHOUT creating anything.
//  - Never modifies the target's identity fields (email/password/username/
//    avatar), except: sets avatarUrl/bio/city ONLY if currently null.
//  - Every row this script creates uses a deterministic id prefixed 'pg-',
//    and every write is an upsert — so re-running this script any number of
//    times converges on the same dataset (idempotent).
//  - Additive only: never overwrites a log the target (or a demo user)
//    already has organically for a given event — such rows are skipped.
//  - Assumes the CATALOG (cat-artist-*/cat-venue-*/cat-event-* rows from
//    `npm run db:seed:catalog`) is already present; exits(1) if not.
//
// Targeting modes:
//   TARGET_EMAIL=someone@example.com   npm run db:seed:playground
//   TARGET_SOLE_APPLE=1                npm run db:seed:playground
//     (finds the single User with a non-null appleId; hard-aborts if the
//      count isn't exactly 1 — this never guesses among multiple accounts.
//      Useful for the real production user, who signs in with Apple and may
//      not have a stable email on file.)
//
// Local-only bootstrap (never runs against a real DB):
//   LOCAL_BOOTSTRAP=1 creates a local target user (email vdp@sticket.in,
//   username vdp, password "password123", appleId "pg-local-apple" so
//   TARGET_SOLE_APPLE=1 also resolves it) IF one doesn't already exist. This
//   refuses to run unless DATABASE_URL looks like a local database.
//
// Run with:  TARGET_EMAIL=<email> DATABASE_URL=<url> npm run db:seed:playground
// ---------------------------------------------------------------------------

import 'dotenv/config';
import bcrypt from 'bcryptjs';

import { prisma } from '../src/lib/prisma.js';
import { ensureBadgeCatalog, checkBadges } from '../src/lib/badges/badgeChecker.js';
import { computeLogXp, buildXpReason, monthKey, type XpBonusInputs } from '../src/lib/xp.js';

// ---------------------------------------------------------------------------
// Small deterministic helpers (no Math.random anywhere in this file — every
// "random-looking" choice below is a stable hash of fixed strings, so
// re-running this script against the same catalog always yields the same
// picks).
// ---------------------------------------------------------------------------

function avatarImage(seed: string): string {
  return `https://picsum.photos/seed/${seed}/400`;
}

function photoImage(seed: string): string {
  return `https://picsum.photos/seed/${seed}/1200/900`;
}

function seatViewImage(seed: string): string {
  return `https://picsum.photos/seed/${seed}/900/1200`;
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

/**
 * Assigns each eventId a (score, scoreRank) pair in [min, max], consistent
 * with the app's ordering rule (`orderBy: [{score:'desc'},{scoreRank:'desc'}]`),
 * but in a fixed-but-non-chronological order (hashed per user+event) so
 * "most recent" doesn't always end up "highest rated".
 */
function assignScores(userId: string, eventIds: string[], min: number, max: number): Map<string, { score: number; scoreRank: number }> {
  const pool = buildScorePool(eventIds.length, min, max); // descending
  const order = eventIds.slice().sort((a, b) => stableHash(`${userId}:${a}`) - stableHash(`${userId}:${b}`));
  const map = new Map<string, { score: number; scoreRank: number }>();
  order.forEach((eventId, i) => {
    map.set(eventId, { score: pool[i]!, scoreRank: (pool.length - i) * 137 });
  });
  return map;
}

const SECTIONS = ['114', 'GA Floor', '212', '108', 'Pit', '305', 'Club 1', '119'];
const ROWS = ['8', 'C', 'F', '12', 'GA', '3', 'K', '20'];

function pickSeatInfo(seed: string): { section: string; row: string; seat: string } {
  const h = stableHash(seed);
  return {
    section: SECTIONS[h % SECTIONS.length]!,
    row: ROWS[Math.floor(h / 7) % ROWS.length]!,
    seat: String(1 + (h % 24)),
  };
}

const LOG_CAPTIONS = [
  'still not over this one.',
  'sang every word until my voice gave out.',
  'the encore alone was worth the ticket price.',
  'closer than I ever expected to get.',
  'openers stole the show, not mad about it.',
  'sound was a little muddy but the energy made up for it.',
  'cried during the acoustic set, no regrets.',
  'this crowd was unreal from the first note.',
  'front section for this one — worth every penny.',
  'the setlist was basically my personal playlist.',
  'lost my voice screaming the bridge.',
  'production value was next level for this run.',
  'confetti drop hit different live.',
  'first time seeing them and it will not be the last.',
  'the lighting rig alone deserves its own review.',
  'stayed for the whole encore even in the rain.',
  'bucket list show, fully lived up to the hype.',
  'the bass hit so hard I felt it in my chest.',
  'surprise cover in the middle of the set — chills.',
  'got there early for soundcheck and it was worth it.',
  'this venue has the best acoustics I have heard all year.',
  'ran into friends I did not know were coming.',
  'the crowd sang the last chorus a cappella.',
  'still thinking about that guitar solo.',
];

function pickCaption(seed: string): string {
  return LOG_CAPTIONS[stableHash(seed) % LOG_CAPTIONS.length]!;
}

const COMMENT_POOL = [
  'okay this looks incredible',
  'wait I need to go to this next time',
  'the setlist for this run is insane',
  'we need to go together next time',
  'this is exactly why I love this venue',
  'your photos from this one are so good',
  'I am so jealous, this was on my list',
  'the way you described the encore has me in my feelings',
  'this era was so slept on, glad you caught it',
  'front row?? okay show off',
];

const REPLY_POOL = [
  'right?? still thinking about it',
  'you have to come next time, no excuses',
  'honestly one of the best nights of the year',
  'yes!! bring the whole group',
  'the photos genuinely do not do it justice',
];

// ---------------------------------------------------------------------------
// Target resolution
// ---------------------------------------------------------------------------

const LOCAL_BOOTSTRAP_EMAIL = 'vdp@sticket.in';
const LOCAL_BOOTSTRAP_USERNAME = 'vdp';
const LOCAL_BOOTSTRAP_APPLE_ID = 'pg-local-apple';

/**
 * LOCAL-ONLY convenience: creates a local target user if one doesn't exist
 * yet, so this seeder (and TARGET_SOLE_APPLE=1) can be exercised against a
 * fresh local database. Gated by LOCAL_BOOTSTRAP=1 *and* a DATABASE_URL that
 * looks local — this can never run against a real database by accident.
 */
async function maybeLocalBootstrap(): Promise<void> {
  if (process.env.LOCAL_BOOTSTRAP !== '1') return;

  const dbUrl = process.env.DATABASE_URL ?? '';
  if (!/localhost|127\.0\.0\.1/.test(dbUrl)) {
    throw new Error(
      'LOCAL_BOOTSTRAP=1 refused: DATABASE_URL does not look like a local database ' +
        '(must contain "localhost" or "127.0.0.1"). Refusing to bootstrap a user anywhere else.'
    );
  }

  const existing = await prisma.user.findUnique({ where: { email: LOCAL_BOOTSTRAP_EMAIL } });
  if (existing) return;

  const passwordHash = await bcrypt.hash('password123', 12);
  await prisma.user.create({
    data: {
      email: LOCAL_BOOTSTRAP_EMAIL,
      username: LOCAL_BOOTSTRAP_USERNAME,
      displayName: 'Vincent',
      passwordHash,
      appleId: LOCAL_BOOTSTRAP_APPLE_ID,
      emailVerified: true,
    },
  });
  console.log(
    `  [LOCAL_BOOTSTRAP] created local target user ${LOCAL_BOOTSTRAP_EMAIL} ` +
      `(username=${LOCAL_BOOTSTRAP_USERNAME}, appleId=${LOCAL_BOOTSTRAP_APPLE_ID})`
  );
}

type TargetUser = { id: string; email: string; avatarUrl: string | null; bio: string | null; city: string | null };

async function resolveTargetUser(): Promise<TargetUser> {
  const useAppleMode = process.env.TARGET_SOLE_APPLE === '1';
  const targetEmail = process.env.TARGET_EMAIL?.trim().toLowerCase();

  if (!useAppleMode && !targetEmail) {
    console.error('ERROR: set TARGET_EMAIL=<email> (or TARGET_SOLE_APPLE=1 to target the single Apple-Sign-In user). Nothing was created.');
    process.exit(1);
  }

  const select = { id: true, email: true, avatarUrl: true, bio: true, city: true } as const;

  if (useAppleMode) {
    const appleUsers = await prisma.user.findMany({ where: { appleId: { not: null } }, select });
    if (appleUsers.length !== 1) {
      console.error(
        `ERROR: TARGET_SOLE_APPLE=1 requires exactly one User with a non-null appleId — found ${appleUsers.length}. ` +
          `Refusing to guess. Nothing was created.` +
          (appleUsers.length > 1 ? ` Candidate ids: ${appleUsers.map((u) => u.id).join(', ')}` : '')
      );
      process.exit(1);
    }
    return appleUsers[0]!;
  }

  const user = await prisma.user.findUnique({ where: { email: targetEmail! }, select });
  if (!user) {
    console.error(
      `ERROR: no User found with email "${targetEmail}". Nothing was created. ` +
        `(Set LOCAL_BOOTSTRAP=1 against a local DATABASE_URL to create a test user.)`
    );
    process.exit(1);
  }
  return user;
}

/** Fills avatarUrl/bio/city ONLY if currently null — never touches identity fields. */
async function fillTargetDefaults(target: TargetUser): Promise<string[]> {
  const data: { avatarUrl?: string; bio?: string; city?: string } = {};
  if (!target.avatarUrl) data.avatarUrl = avatarImage(`pg-target-${target.id}`);
  if (!target.bio) data.bio = 'Chasing the next show.';
  if (!target.city) data.city = 'New York, NY';

  const keys = Object.keys(data);
  if (keys.length) await prisma.user.update({ where: { id: target.id }, data });
  return keys;
}

async function verifyCatalog(): Promise<void> {
  const [artists, venues, events] = await Promise.all([
    prisma.artist.count({ where: { id: { startsWith: 'cat-artist-' } } }),
    prisma.venue.count({ where: { id: { startsWith: 'cat-venue-' } } }),
    prisma.event.count({ where: { id: { startsWith: 'cat-event-' } } }),
  ]);
  if (artists === 0 || venues === 0 || events === 0) {
    console.error('ERROR: catalog not found (no cat-artist-*/cat-venue-*/cat-event-* rows). Run `npm run db:seed:catalog` first. Nothing was created.');
    process.exit(1);
  }
  console.log(`  catalog check: ${artists} artists, ${venues} venues, ${events} events`);
}

// ---------------------------------------------------------------------------
// Demo crew + second-hop user
// ---------------------------------------------------------------------------

type CrewDef = { id: string; email: string; username: string; displayName: string; bio: string; city: string };

const CREW: CrewDef[] = [
  { id: 'pg-user-crew-mia', email: 'crew-mia@demo.sticket.in', username: 'mia.rows', displayName: 'Mia Rowland', bio: 'Front row or nothing. NYC via Chicago.', city: 'New York, NY' },
  { id: 'pg-user-crew-dev', email: 'crew-dev@demo.sticket.in', username: 'dev.eras', displayName: 'Devin Ortiz', bio: 'Collecting eras one tour at a time.', city: 'Los Angeles, CA' },
  { id: 'pg-user-crew-jax', email: 'crew-jax@demo.sticket.in', username: 'jax.pit', displayName: 'Jax Coleman', bio: 'Pit or bust. Photographer on the side.', city: 'Austin, TX' },
  { id: 'pg-user-crew-lena', email: 'crew-lena@demo.sticket.in', username: 'lena.frontrow', displayName: 'Lena Ashworth', bio: 'Spreadsheet of every show I still need to see.', city: 'Seattle, WA' },
  { id: 'pg-user-crew-theo', email: 'crew-theo@demo.sticket.in', username: 'theo.encore', displayName: 'Theo Park', bio: 'Always stays for the encore.', city: 'Chicago, IL' },
];

const SECOND_HOP: CrewDef = {
  id: 'pg-user-secondhop-nova',
  email: 'crew-nova@demo.sticket.in',
  username: 'nova.afterglow',
  displayName: 'Nova Bishop',
  bio: "Mia's concert buddy from way back.",
  city: 'Brooklyn, NY',
};

async function upsertDemoUser(u: CrewDef): Promise<void> {
  const passwordHash = await bcrypt.hash('password123', 12);
  await prisma.user.upsert({
    where: { email: u.email },
    update: {
      username: u.username,
      displayName: u.displayName,
      bio: u.bio,
      city: u.city,
      homeCity: u.city,
      avatarUrl: avatarImage(u.id),
    },
    create: {
      id: u.id,
      email: u.email,
      username: u.username,
      displayName: u.displayName,
      bio: u.bio,
      city: u.city,
      homeCity: u.city,
      avatarUrl: avatarImage(u.id),
      passwordHash,
      emailVerified: true,
    },
  });
}

async function upsertFollow(followerId: string, followingId: string): Promise<void> {
  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId, followingId } },
    update: {},
    create: { id: `pg-follow-${followerId}-${followingId}`, followerId, followingId },
  });
}

async function seedSocialGraph(targetId: string): Promise<void> {
  // target <-> each crew member, mutual.
  for (const c of CREW) {
    await upsertFollow(targetId, c.id);
    await upsertFollow(c.id, targetId);
  }
  // crew follow each other (full mesh).
  for (const a of CREW) {
    for (const b of CREW) {
      if (a.id !== b.id) await upsertFollow(a.id, b.id);
    }
  }
  // second-hop: a crew member's friend, mutual with that crew member, but
  // deliberately NOT followed by (or following) the target — this is what
  // makes the fof scope toggle visibly add content.
  await upsertFollow(CREW[0]!.id, SECOND_HOP.id);
  await upsertFollow(SECOND_HOP.id, CREW[0]!.id);
}

// ---------------------------------------------------------------------------
// Catalog events
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
};

async function loadCatalogEvents(): Promise<{ past: CatEvent[]; future: CatEvent[] }> {
  const rows = await prisma.event.findMany({
    where: { id: { startsWith: 'cat-event-' } },
    include: { artist: { select: { id: true, name: true } }, venue: { select: { id: true, name: true, city: true } } },
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
  }));

  const now = new Date();
  return { past: mapped.filter((e) => e.date < now), future: mapped.filter((e) => e.date >= now) };
}

// ---------------------------------------------------------------------------
// Logs + XP (shared pipeline for target, crew, and the second-hop user)
// ---------------------------------------------------------------------------

type LogPlanInput = {
  idHint: string;
  event: CatEvent;
  note: string | null;
  photos: string[];
  visibility: 'PUBLIC' | 'FRIENDS';
  sharedAt: Date | null;
  section: string | null;
  row: string | null;
  seat: string | null;
  score: number;
  scoreRank: number;
  createdAt: Date;
};

type LogPlanResult = LogPlanInput & { logId: string; created: boolean; skippedOrganic: boolean };

/**
 * Upserts each planned log for `userId`, deterministic-id + additive-only:
 * if the user already has a REAL (non "pg-") log for that event, it's left
 * completely untouched and reported as skipped.
 */
async function upsertPlannedLogs(userId: string, plans: LogPlanInput[]): Promise<LogPlanResult[]> {
  const results: LogPlanResult[] = [];

  for (const p of plans) {
    const id = `pg-log-${p.idHint}`;
    const existing = await prisma.userLog.findUnique({
      where: { userId_eventId: { userId, eventId: p.event.id } },
      select: { id: true },
    });

    if (existing && !existing.id.startsWith('pg-')) {
      results.push({ ...p, logId: existing.id, created: false, skippedOrganic: true });
      continue;
    }

    const data = {
      note: p.note,
      score: p.score,
      scoreRank: p.scoreRank,
      visibility: p.visibility,
      sharedAt: p.sharedAt,
      section: p.section,
      row: p.row,
      seat: p.seat,
      createdAt: p.createdAt,
      updatedAt: p.createdAt,
    };

    let logId: string;
    let created: boolean;
    if (existing) {
      await prisma.userLog.update({ where: { id: existing.id }, data });
      logId = existing.id;
      created = false;
    } else {
      await prisma.userLog.create({ data: { id, userId, eventId: p.event.id, ...data } });
      logId = id;
      created = true;
    }

    for (let i = 0; i < p.photos.length; i++) {
      const photoId = `pg-photo-${id}-${i + 1}`;
      await prisma.logPhoto.upsert({
        where: { id: photoId },
        update: { photoUrl: p.photos[i]!, visibility: p.visibility },
        create: { id: photoId, logId, userId, photoUrl: p.photos[i]!, visibility: p.visibility },
      });
    }

    results.push({ ...p, logId, created, skippedOrganic: false });
  }

  return results;
}

/**
 * Replays XP for the pg logs just written, respecting the user's REAL prior
 * history for the isNewVenue/isNewArtist/firstOfMonth bonuses. Fully
 * idempotent: if this user already has any "pg-xp-" entries, all XP work is
 * skipped (so re-runs never double-award).
 */
async function replayXp(userId: string, results: LogPlanResult[]): Promise<{ skipped: boolean; gained: number; entries: number }> {
  const usable = results.filter((r) => !r.skippedOrganic);
  if (usable.length === 0) return { skipped: false, gained: 0, entries: 0 };

  const existingPgXp = await prisma.xpEntry.count({ where: { userId, id: { startsWith: 'pg-xp-' } } });
  if (existingPgXp > 0) return { skipped: true, gained: 0, entries: 0 };

  const allLogs = await prisma.userLog.findMany({
    where: { userId },
    include: { event: { select: { artistId: true, venueId: true, date: true } } },
  });
  const priorLogs = allLogs.filter((l) => !l.id.startsWith('pg-'));

  const seenVenues = new Set(priorLogs.map((l) => l.event.venueId));
  const seenArtists = new Set(priorLogs.map((l) => l.event.artistId));
  const seenMonths = new Set(priorLogs.map((l) => monthKey(l.event.date)));

  const sorted = usable.slice().sort((a, b) => a.event.date.getTime() - b.event.date.getTime());

  let gained = 0;
  let entries = 0;
  for (const r of sorted) {
    const isNewVenue = !seenVenues.has(r.event.venueId);
    const isNewArtist = !seenArtists.has(r.event.artistId);
    const firstOfMonth = !seenMonths.has(monthKey(r.event.date));
    const hasReview = Boolean(r.note && r.note.trim());
    const hasPhoto = r.photos.length > 0;

    seenVenues.add(r.event.venueId);
    seenArtists.add(r.event.artistId);
    seenMonths.add(monthKey(r.event.date));

    const inputs: XpBonusInputs = { isNewVenue, isNewArtist, hasReview, hasPhoto, firstOfMonth };
    const amount = computeLogXp(inputs);
    gained += amount;
    entries++;

    await prisma.xpEntry.upsert({
      where: { id: `pg-xp-${r.logId}` },
      update: { amount, reason: buildXpReason(inputs) },
      create: { id: `pg-xp-${r.logId}`, userId, logId: r.logId, amount, reason: buildXpReason(inputs), createdAt: r.createdAt },
    });
  }

  if (gained > 0) {
    await prisma.user.update({ where: { id: userId }, data: { xpTotal: { increment: gained } } });
  }

  return { skipped: false, gained, entries };
}

// ---------------------------------------------------------------------------
// Log plan builders
// ---------------------------------------------------------------------------

function buildTargetLogPlans(userId: string, past: CatEvent[]): LogPlanInput[] {
  const events = pickSpread(past, 14);
  const scores = assignScores(userId, events.map((e) => e.id), 5.8, 9.7);

  const sharedOrder = events.slice().sort((a, b) => stableHash(`shared:${a.id}`) - stableHash(`shared:${b.id}`));
  const sharedIds = new Set(sharedOrder.slice(0, 8).map((e) => e.id));

  const seatOrder = events.slice().sort((a, b) => stableHash(`seat:${a.id}`) - stableHash(`seat:${b.id}`));
  const seatIds = new Set(seatOrder.slice(0, 6).map((e) => e.id));

  return events.map((event) => {
    const isShared = sharedIds.has(event.id);
    const hasSeat = seatIds.has(event.id);
    const s = scores.get(event.id)!;
    const dayOffset = 1 + (stableHash(`offset:${event.id}`) % 4);
    const createdAt = new Date(event.date.getTime() + dayOffset * 86_400_000);
    const photoCount = isShared ? 1 + (stableHash(`photos:${event.id}`) % 4) : 0;
    const visibility: 'PUBLIC' | 'FRIENDS' = isShared && stableHash(`vis:${event.id}`) % 4 === 0 ? 'FRIENDS' : 'PUBLIC';
    const seatInfo = hasSeat ? pickSeatInfo(`seat:${event.id}`) : null;

    return {
      idHint: `target-${event.id}`,
      event,
      note: isShared ? pickCaption(`cap:${event.id}`) : null,
      photos: isShared ? Array.from({ length: photoCount }, (_, i) => photoImage(`target-${event.id}-${i + 1}`)) : [],
      visibility,
      sharedAt: isShared ? createdAt : null,
      section: seatInfo?.section ?? null,
      row: seatInfo?.row ?? null,
      seat: seatInfo?.seat ?? null,
      score: s.score,
      scoreRank: s.scoreRank,
      createdAt,
    };
  });
}

const CREW_LOG_COUNTS = [5, 6, 7, 8, 6];

function buildCrewLogPlans(crew: CrewDef, past: CatEvent[], crewIdx: number): LogPlanInput[] {
  const count = CREW_LOG_COUNTS[crewIdx] ?? 6;
  const windowStart = crewIdx * 23;
  const window = past.slice(windowStart, windowStart + 60);
  const pool = window.length >= count ? window : past;
  const events = pickSpread(pool, count);
  const scores = assignScores(crew.id, events.map((e) => e.id), 6.0, 9.6);

  return events.map((event) => {
    const s = scores.get(event.id)!;
    const dayOffset = 1 + (stableHash(`offset:${crew.id}:${event.id}`) % 3);
    const createdAt = new Date(event.date.getTime() + dayOffset * 86_400_000);
    const photoCount = 1 + (stableHash(`photos:${crew.id}:${event.id}`) % 3);

    return {
      idHint: `${crew.id}-${event.id}`,
      event,
      note: pickCaption(`cap:${crew.id}:${event.id}`),
      photos: Array.from({ length: photoCount }, (_, i) => photoImage(`${crew.id}-${event.id}-${i + 1}`)),
      visibility: 'PUBLIC' as const,
      sharedAt: createdAt,
      section: null,
      row: null,
      seat: null,
      score: s.score,
      scoreRank: s.scoreRank,
      createdAt,
    };
  });
}

function buildSecondHopLogPlans(userId: string, past: CatEvent[]): LogPlanInput[] {
  const window = past.slice(140, 200);
  const pool = window.length >= 2 ? window : past;
  const events = pickSpread(pool, 2);
  const scores = assignScores(userId, events.map((e) => e.id), 6.5, 9.0);

  return events.map((event) => {
    const s = scores.get(event.id)!;
    const createdAt = new Date(event.date.getTime() + 2 * 86_400_000);
    return {
      idHint: `secondhop-${event.id}`,
      event,
      note: pickCaption(`cap:secondhop:${event.id}`),
      photos: [photoImage(`secondhop-${event.id}-1`)],
      visibility: 'PUBLIC' as const,
      sharedAt: createdAt,
      section: null,
      row: null,
      seat: null,
      score: s.score,
      scoreRank: s.scoreRank,
      createdAt,
    };
  });
}

// ---------------------------------------------------------------------------
// Engagement (likes, threaded comments, was-there) on the target's own posts
// ---------------------------------------------------------------------------

function pickCrewSubset(crew: CrewDef[], n: number, seed: string): CrewDef[] {
  const ordered = crew.slice().sort((a, b) => stableHash(`${seed}:${a.id}`) - stableHash(`${seed}:${b.id}`));
  return ordered.slice(0, Math.min(Math.max(n, 0), crew.length));
}

async function seedEngagement(sharedLogs: LogPlanResult[], crew: CrewDef[]): Promise<{ likeCount: number; commentCount: number }> {
  let likeCount = 0;
  let commentCount = 0;

  for (const log of sharedLogs) {
    const likerCount = 3 + (stableHash(`like:${log.logId}`) % 6); // 3-8
    const likers = pickCrewSubset(crew, likerCount, `like:${log.logId}`);
    for (const u of likers) {
      await prisma.logLike.upsert({
        where: { userId_logId: { userId: u.id, logId: log.logId } },
        update: {},
        create: { id: `pg-like-${u.id}-${log.logId}`, userId: u.id, logId: log.logId },
      });
      likeCount++;
    }

    const commenterCount = 1 + (stableHash(`cmt:${log.logId}`) % 3); // 1-3
    const commenters = pickCrewSubset(crew, commenterCount, `cmt:${log.logId}`);
    let rootId: string | null = null;
    for (let i = 0; i < commenters.length; i++) {
      const u = commenters[i]!;
      const id = `pg-comment-${log.logId}-${i + 1}`;
      const text =
        i === 0
          ? COMMENT_POOL[stableHash(`c0:${log.logId}`) % COMMENT_POOL.length]!
          : REPLY_POOL[stableHash(`c${i}:${log.logId}`) % REPLY_POOL.length]!;
      const parentId = i === 0 ? null : rootId;

      await prisma.comment.upsert({
        where: { id },
        update: { text, parentId },
        create: { id, logId: log.logId, userId: u.id, text, parentId },
      });
      if (i === 0) rootId = id;
      commentCount++;
    }
  }

  return { likeCount, commentCount };
}

async function ensureBareAttendanceLog(userId: string, event: CatEvent): Promise<string> {
  const existing = await prisma.userLog.findUnique({
    where: { userId_eventId: { userId, eventId: event.id } },
    select: { id: true },
  });
  if (existing) return existing.id;

  const id = `pg-log-attend-${userId}-${event.id}`;
  const createdAt = new Date(event.date.getTime() + 2 * 86_400_000);
  await prisma.userLog.create({
    data: { id, userId, eventId: event.id, visibility: 'FRIENDS', createdAt, updatedAt: createdAt },
  });
  return id;
}

async function seedWasThere(popularLogs: LogPlanResult[], crew: CrewDef[]): Promise<number> {
  let count = 0;
  for (const log of popularLogs) {
    const n = 1 + (stableHash(`wt:${log.logId}`) % 2); // 1-2
    const attendees = pickCrewSubset(crew, n, `wt:${log.logId}`);
    for (const c of attendees) {
      await ensureBareAttendanceLog(c.id, log.event);
      await prisma.wasThere.upsert({
        where: { userId_logId: { userId: c.id, logId: log.logId } },
        update: {},
        create: { id: `pg-wasthere-${c.id}-${log.logId}`, userId: c.id, logId: log.logId },
      });
      count++;
    }
  }
  return count;
}

// ---------------------------------------------------------------------------
// Upcoming (tickets / interested / tracking)
// ---------------------------------------------------------------------------

async function seedUpcoming(
  target: TargetUser,
  crew: CrewDef[],
  future: CatEvent[]
): Promise<{ eventA: CatEvent; eventB: CatEvent; eventC: CatEvent; overlapA: number; overlapB: number; overlapC: number } | null> {
  const picks = pickSpread(future, 3);
  const [eventA, eventB, eventC] = picks;
  if (!eventA || !eventB || !eventC) return null;

  const seatInfo = pickSeatInfo('pg-ticket-target-1');
  await prisma.userTicket.upsert({
    where: { userId_eventId_barcode: { userId: target.id, eventId: eventA.id, barcode: 'PG-TICKET-0001' } },
    update: { section: seatInfo.section, row: seatInfo.row, seat: seatInfo.seat, status: 'KEEPING' },
    create: {
      id: 'pg-ticket-target-1',
      userId: target.id,
      eventId: eventA.id,
      section: seatInfo.section,
      row: seatInfo.row,
      seat: seatInfo.seat,
      status: 'KEEPING',
      source: 'MANUAL',
      barcode: 'PG-TICKET-0001',
    },
  });

  await prisma.userInterested.upsert({
    where: { userId_eventId: { userId: target.id, eventId: eventB.id } },
    update: {},
    create: { id: 'pg-interested-target-1', userId: target.id, eventId: eventB.id },
  });

  await prisma.userEventTracking.upsert({
    where: { userId_eventId: { userId: target.id, eventId: eventC.id } },
    update: { status: 'watching-secondary' },
    create: { id: 'pg-tracking-target-1', userId: target.id, eventId: eventC.id, status: 'watching-secondary', maxPrice: 350 },
  });

  const overlapA = pickCrewSubset(crew, 3, 'overlapA');
  for (const c of overlapA) {
    await prisma.userInterested.upsert({
      where: { userId_eventId: { userId: c.id, eventId: eventA.id } },
      update: {},
      create: { id: `pg-interested-${c.id}-a`, userId: c.id, eventId: eventA.id },
    });
  }

  const overlapB = pickCrewSubset(crew, 2, 'overlapB');
  for (const c of overlapB) {
    await prisma.userInterested.upsert({
      where: { userId_eventId: { userId: c.id, eventId: eventB.id } },
      update: {},
      create: { id: `pg-interested-${c.id}-b`, userId: c.id, eventId: eventB.id },
    });
  }

  const overlapC = pickCrewSubset(crew, 2, 'overlapC');
  for (const c of overlapC) {
    await prisma.userEventTracking.upsert({
      where: { userId_eventId: { userId: c.id, eventId: eventC.id } },
      update: {},
      create: { id: `pg-tracking-${c.id}-c`, userId: c.id, eventId: eventC.id, status: 'interested' },
    });
  }

  return { eventA, eventB, eventC, overlapA: overlapA.length, overlapB: overlapB.length, overlapC: overlapC.length };
}

// ---------------------------------------------------------------------------
// Artist graph
// ---------------------------------------------------------------------------

// Biased toward artists whose catalog tour dates actually span "now", so the
// artist-follow list (and downstream presales) reliably includes upcoming
// shows rather than only-just-wrapped tours.
const ARTIST_EXTRA_POOL = [
  'cat-artist-the-weeknd',
  'cat-artist-billie-eilish',
  'cat-artist-bad-bunny',
  'cat-artist-fred-again',
  'cat-artist-chris-stapleton',
  'cat-artist-arctic-monkeys',
];

async function seedArtistGraph(target: TargetUser, targetLogResults: LogPlanResult[]): Promise<{ artistIds: string[]; count: number }> {
  const loggedArtistIds: string[] = [];
  for (const r of targetLogResults) {
    if (!loggedArtistIds.includes(r.event.artistId)) loggedArtistIds.push(r.event.artistId);
  }

  const base = loggedArtistIds.slice(0, 6);
  const extras: string[] = [];
  for (const id of ARTIST_EXTRA_POOL) {
    if (extras.length >= 2) break;
    if (!base.includes(id)) extras.push(id);
  }
  const artistIds = [...base, ...extras].slice(0, 8);

  let count = 0;
  for (let i = 0; i < artistIds.length; i++) {
    const artistId = artistIds[i]!;
    const tier = i < 2 ? 'top-tier' : 'following';
    await prisma.userArtistFollow.upsert({
      where: { userId_artistId: { userId: target.id, artistId } },
      update: { tier },
      create: { id: `pg-artistfollow-${target.id}-${artistId}`, userId: target.id, artistId, tier },
    });
    count++;
  }

  return { artistIds, count };
}

// ---------------------------------------------------------------------------
// Venues (ratings, tips + upvotes, seat views)
// ---------------------------------------------------------------------------

const VENUE_TIPS = [
  { category: 'parking', text: 'Get there 90 minutes early — the closest garage fills up fast on show nights.' },
  { category: 'sound', text: 'Sound is noticeably better from the lower bowl than up top.' },
  { category: 'food', text: 'Skip the concession lines and eat before you go, they move slow.' },
  { category: 'access', text: 'Accessible entrance is on the east side, much shorter line than the main gate.' },
];

async function seedVenues(
  crew: CrewDef[],
  targetLogResults: LogPlanResult[],
  pastAll: CatEvent[]
): Promise<{ venueIds: string[]; ratingCount: number; tipCount: number; upvoteCount: number; seatViewCount: number }> {
  const venueIds: string[] = [];
  for (const r of targetLogResults) {
    if (!venueIds.includes(r.event.venueId)) venueIds.push(r.event.venueId);
  }
  if (venueIds.length < 4) {
    for (const e of pastAll) {
      if (venueIds.length >= 4) break;
      if (!venueIds.includes(e.venueId)) venueIds.push(e.venueId);
    }
  }
  const chosen = venueIds.slice(0, 4);

  let ratingCount = 0;
  for (const venueId of chosen) {
    const raters = pickCrewSubset(crew, 3, `rate:${venueId}`);
    for (const u of raters) {
      const h = stableHash(`rating:${u.id}:${venueId}`);
      await prisma.venueRating.upsert({
        where: { userId_venueId: { userId: u.id, venueId } },
        update: {},
        create: {
          id: `pg-venuerating-${u.id}-${venueId}`,
          userId: u.id,
          venueId,
          sound: 3 + (h % 3),
          sightlines: 3 + (Math.floor(h / 4) % 3),
          drinks: 2 + (Math.floor(h / 16) % 4),
          staff: 3 + (Math.floor(h / 64) % 3),
          access: 3 + (Math.floor(h / 256) % 3),
        },
      });
      ratingCount++;
    }
  }

  let tipCount = 0;
  let upvoteCount = 0;
  for (let i = 0; i < Math.min(4, chosen.length); i++) {
    const venueId = chosen[i]!;
    const tipDef = VENUE_TIPS[i]!;
    const author = pickCrewSubset(crew, 1, `tipauthor:${venueId}`)[0]!;
    const tipId = `pg-tip-${venueId}`;

    await prisma.venueTip.upsert({
      where: { id: tipId },
      update: { text: tipDef.text, category: tipDef.category },
      create: { id: tipId, venueId, userId: author.id, text: tipDef.text, category: tipDef.category },
    });
    tipCount++;

    const upvoters = pickCrewSubset(
      crew.filter((c) => c.id !== author.id),
      3,
      `tipupvote:${venueId}`
    );
    for (const u of upvoters) {
      await prisma.tipUpvote.upsert({
        where: { userId_tipId: { userId: u.id, tipId } },
        update: {},
        create: { id: `pg-tipupvote-${u.id}-${tipId}`, userId: u.id, tipId },
      });
      upvoteCount++;
    }
  }

  let seatViewCount = 0;
  for (let i = 0; i < 5; i++) {
    const venueId = chosen[i % chosen.length]!;
    const author = pickCrewSubset(crew, 1, `seatview:${i}`)[0]!;
    const id = `pg-seatview-${i + 1}`;
    const seatInfo = pickSeatInfo(`${id}:${venueId}`);
    const h = stableHash(`svrating:${id}`);

    await prisma.seatView.upsert({
      where: { id },
      update: { section: seatInfo.section, row: seatInfo.row, rating: 1 + (h % 5), photoUrl: seatViewImage(id) },
      create: {
        id,
        venueId,
        userId: author.id,
        section: seatInfo.section,
        row: seatInfo.row,
        rating: 1 + (h % 5),
        photoUrl: seatViewImage(id),
        thumbnailUrl: seatViewImage(id),
      },
    });
    seatViewCount++;
  }

  return { venueIds: chosen, ratingCount, tipCount, upvoteCount, seatViewCount };
}

// ---------------------------------------------------------------------------
// Presales
// ---------------------------------------------------------------------------

const PRESALE_TYPES = ['Verified Fan', 'Fan Club', 'Artist Presale', 'Citi Card'];

async function seedPresales(followedArtistIds: string[], future: CatEvent[]): Promise<number> {
  const picks: CatEvent[] = [];

  // Prefer artists the target actually follows...
  for (const artistId of followedArtistIds) {
    if (picks.length >= 4) break;
    const ev = future.find((e) => e.artistId === artistId && !picks.includes(e));
    if (ev) picks.push(ev);
  }
  // ...but not every followed artist still has a future catalog date (some
  // tours already wrapped), so top up from any future catalog event to
  // reliably land on 4 presales.
  if (picks.length < 4) {
    for (const e of future) {
      if (picks.length >= 4) break;
      if (!picks.some((p) => p.artistId === e.artistId)) picks.push(e);
    }
  }

  const now = new Date();
  let count = 0;
  for (let i = 0; i < picks.length; i++) {
    const event = picks[i]!;
    const presaleType = PRESALE_TYPES[i % PRESALE_TYPES.length]!;
    const thirtyDaysBefore = new Date(event.date.getTime() - 30 * 86_400_000);
    const minFuture = new Date(now.getTime() + 3 * 86_400_000);
    const presaleStart = thirtyDaysBefore > minFuture ? thirtyDaysBefore : minFuture;
    const code = `PG${event.artistId.replace('cat-artist-', '').toUpperCase().replace(/-/g, '').slice(0, 8)}`;

    await prisma.presale.upsert({
      where: {
        artistName_venueName_eventDate_presaleType: {
          artistName: event.artistName,
          venueName: event.venueName,
          eventDate: event.date,
          presaleType,
        },
      },
      update: { presaleStart, code, source: 'Playground' },
      create: {
        id: `pg-presale-${i + 1}`,
        artistName: event.artistName,
        venueName: event.venueName,
        venueCity: event.venueCity,
        eventDate: event.date,
        presaleType,
        presaleStart,
        code,
        source: 'Playground',
      },
    });
    count++;
  }

  return count;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('Seeding Sticket PLAYGROUND data...');

  await verifyCatalog();
  await maybeLocalBootstrap();

  const target = await resolveTargetUser();
  console.log(`  target: ${target.email} (${target.id})`);

  const filledDefaults = await fillTargetDefaults(target);
  console.log(`  target defaults filled: ${filledDefaults.length ? filledDefaults.join(', ') : '(none needed)'}`);

  for (const c of CREW) await upsertDemoUser(c);
  await upsertDemoUser(SECOND_HOP);
  console.log(`  demo users: ${CREW.length} crew + 1 second-hop`);

  await seedSocialGraph(target.id);

  const { past, future } = await loadCatalogEvents();
  console.log(`  catalog events available: ${past.length} past, ${future.length} future`);

  // --- target's timeline ---
  const targetPlans = buildTargetLogPlans(target.id, past);
  const targetResults = await upsertPlannedLogs(target.id, targetPlans);
  const targetXp = await replayXp(target.id, targetResults);
  const targetCreated = targetResults.filter((r) => r.created).length;
  const targetUpdated = targetResults.filter((r) => !r.created && !r.skippedOrganic).length;
  const targetSkipped = targetResults.filter((r) => r.skippedOrganic).length;

  // --- crew's own logs + XP (mark a handful FRIENDS across the whole crew) ---
  const crewPlans = CREW.flatMap((c, idx) => buildCrewLogPlans(c, past, idx).map((plan) => ({ ownerId: c.id, plan })));
  const friendsOrder = crewPlans.slice().sort((a, b) => stableHash(`crewvis:${a.plan.idHint}`) - stableHash(`crewvis:${b.plan.idHint}`));
  const friendsIdHints = new Set(friendsOrder.slice(0, 4).map((x) => x.plan.idHint));
  for (const { plan } of crewPlans) {
    if (friendsIdHints.has(plan.idHint)) plan.visibility = 'FRIENDS';
  }

  let crewLogsCreated = 0;
  let crewLogsUpdated = 0;
  let crewLogsSkipped = 0;
  let crewXpGained = 0;
  let crewXpSkippedUsers = 0;

  for (const c of CREW) {
    const plans = crewPlans.filter((x) => x.ownerId === c.id).map((x) => x.plan);
    const results = await upsertPlannedLogs(c.id, plans);
    crewLogsCreated += results.filter((r) => r.created).length;
    crewLogsUpdated += results.filter((r) => !r.created && !r.skippedOrganic).length;
    crewLogsSkipped += results.filter((r) => r.skippedOrganic).length;
    const xp = await replayXp(c.id, results);
    crewXpGained += xp.gained;
    if (xp.skipped) crewXpSkippedUsers++;
  }

  // --- second-hop user's own logs ---
  const secondHopPlans = buildSecondHopLogPlans(SECOND_HOP.id, past);
  const secondHopResults = await upsertPlannedLogs(SECOND_HOP.id, secondHopPlans);
  await replayXp(SECOND_HOP.id, secondHopResults);

  // --- engagement on target's shared posts ---
  const sharedTargetLogs = targetResults.filter((r) => r.sharedAt !== null && !r.skippedOrganic);
  const engagement = await seedEngagement(sharedTargetLogs, CREW);
  const wasThereCount = await seedWasThere(sharedTargetLogs.slice(0, 3), CREW);

  // --- upcoming ---
  const upcoming = await seedUpcoming(target, CREW, future);

  // --- artist graph ---
  const artistGraph = await seedArtistGraph(
    target,
    targetResults.filter((r) => !r.skippedOrganic)
  );

  // --- venues ---
  const venues = await seedVenues(
    CREW,
    targetResults.filter((r) => !r.skippedOrganic),
    past
  );

  // --- presales ---
  const presaleCount = await seedPresales(artistGraph.artistIds, future);

  // --- badges ---
  await ensureBadgeCatalog();
  const badgeResult = await checkBadges(target.id, { award: true });

  console.log('\n=== PLAYGROUND SEED SUMMARY ===');
  console.table({
    'target logs': `${targetCreated} created, ${targetUpdated} updated, ${targetSkipped} skipped (organic)`,
    'target XP': targetXp.skipped ? 'skipped (pg XP already seeded)' : `${targetXp.entries} entries, +${targetXp.gained} xp`,
    'crew logs': `${crewLogsCreated} created, ${crewLogsUpdated} updated, ${crewLogsSkipped} skipped (organic)`,
    'crew XP': `+${crewXpGained} xp total (${crewXpSkippedUsers}/${CREW.length} users already seeded)`,
    'second-hop logs': `${secondHopResults.filter((r) => r.created).length} created, ${secondHopResults.filter((r) => !r.created && !r.skippedOrganic).length} updated`,
    follows: `target<->crew mutual (${CREW.length * 2}), crew mesh (${CREW.length * (CREW.length - 1)}), 1 second-hop edge pair`,
    likes: engagement.likeCount,
    comments: engagement.commentCount,
    'was-there': wasThereCount,
    upcoming: upcoming
      ? `ticket+interested+tracking on 3 future events (crew overlap: ${upcoming.overlapA}/${upcoming.overlapB}/${upcoming.overlapC})`
      : 'skipped (not enough future catalog events)',
    'artist follows': `${artistGraph.count} (2 top-tier)`,
    'venue ratings': venues.ratingCount,
    'venue tips': venues.tipCount,
    'tip upvotes': venues.upvoteCount,
    'seat views': venues.seatViewCount,
    presales: presaleCount,
    'new badges (target)': badgeResult.newBadges.length,
  });

  console.log('\nPlayground seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
