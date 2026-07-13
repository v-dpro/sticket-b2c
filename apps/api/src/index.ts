import 'dotenv/config';

import { createWriteStream } from 'node:fs';
import { mkdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { randomUUID } from 'node:crypto';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import type { Prisma, TicketStatus } from '@prisma/client';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

import { prisma } from './lib/prisma.js';
import { getEventsForMultipleArtists } from './lib/bandsintown.js';
import { searchEvents as tmSearchEvents, searchEventsByArtists as tmSearchByArtists, searchAttractions as tmSearchAttractions } from './lib/ticketmaster.js';
import { getUserIdFromRequest } from './lib/auth.js';
import { AppError } from './lib/errors.js';
import { BADGES } from './lib/badges/badgeDefinitions.js';
import { checkBadges, getBadgeProgress, getEarnedBadges } from './lib/badges/badgeChecker.js';
import { computeLogXp, buildXpReason, levelFor, monthRange, monthKey, XP_PHOTO } from './lib/xp.js';
import {
  generateTokens,
  verifyToken,
  hashPassword,
  verifyPassword,
  generateResetToken,
  handleAppleSignIn,
  handleGoogleSignIn,
  handleSpotifyConnect,
  getUserWithFreshSpotifyToken,
  getSpotifyTopArtists,
  syncSpotifyEnrichment,
} from './services/auth.js';
import { startERPSyncJob } from './services/erpSync.js';
import { notify, notifyMany, startNotificationJobs } from './notificationEngine.js';

// Consumer-visible presale sources. ERP/SOS rows (source:'ERP', synced from
// showsonsale.com) are ERP-internal only and MUST NOT be surfaced to consumers
// for ToS compliance — every consumer presale query filters to this allowlist.
// Ticketmaster Discovery presales (source:'ticketmaster') are compliant and
// carry no fabricated codes (TM does not expose presale codes).
const PRESALE_SOURCES = ['ticketmaster', 'Manual', 'Community'];

// Mobile app defaults to 3001 (see apps/mobile/lib/api/client.ts)
const preferredPort = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? '0.0.0.0';

const app = Fastify({
  logger: true,
});

await app.register(cors, { origin: true });

// File upload + serving (dev-friendly)
await app.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

const uploadsRoot = path.resolve(process.cwd(), 'uploads');
await mkdir(uploadsRoot, { recursive: true });
await app.register(fastifyStatic, {
  root: uploadsRoot,
  prefix: '/uploads/',
});

app.setErrorHandler((error, req, reply) => {
  if (error instanceof AppError) {
    reply.status(error.statusCode);
    return reply.send({ error: error.message });
  }

  req.log.error({ error }, 'Unhandled error');
  reply.status(500);
  return reply.send({ error: 'Internal server error' });
});

app.get('/health', async () => ({ ok: true }));

// ==================== BADGE ROUTES ====================

// GET /badges - Badge catalog (definitions)
app.get('/badges', async (req) => {
  requireAccessUserId(req as any);
  return BADGES;
});

// GET /badges/mine - Current user's earned badges (with full definition)
app.get('/badges/mine', async (req) => {
  const userId = requireAccessUserId(req as any);
  return await getEarnedBadges(userId);
});

// GET /badges/progress - Progress toward unearned badges
app.get('/badges/progress', async (req) => {
  const userId = requireAccessUserId(req as any);
  return await getBadgeProgress(userId);
});

// POST /badges/check - Check and award new badges (idempotent)
app.post('/badges/check', async (req) => {
  const userId = requireAccessUserId(req as any);
  const body = (req.body ?? {}) as { eventId?: string };
  const result = await checkBadges(userId, { award: true, eventId: body.eventId });
  return { newBadges: result.newBadges };
});

function requireAccessUserId(req: { headers: { authorization?: string } }): string {
  const auth = req.headers.authorization;
  if (!auth) throw new AppError('Authentication required', 401);
  const [scheme, token] = auth.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) throw new AppError('Authentication required', 401);

  let payload: { userId: string; type: string };
  try {
    payload = verifyToken(token) as any;
  } catch {
    throw new AppError('Authentication required', 401);
  }

  if (payload.type !== 'access') throw new AppError('Authentication required', 401);
  return payload.userId;
}

function getPublicBaseUrl(req: { headers: Record<string, unknown> }) {
  const env = process.env.PUBLIC_BASE_URL?.trim();
  if (env) return env.replace(/\/+$/, '');

  const host = typeof req.headers.host === 'string' ? req.headers.host : 'localhost:3000';
  const protoHeader = req.headers['x-forwarded-proto'];
  const proto = typeof protoHeader === 'string' ? protoHeader.split(',')[0]!.trim() : 'http';
  return `${proto}://${host}`;
}

async function getFollowStatus(viewerId: string | null, targetUserId: string): Promise<boolean> {
  if (!viewerId) return false;
  if (viewerId === targetUserId) return false;
  const row = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: viewerId, followingId: targetUserId } },
    select: { id: true },
  });
  return Boolean(row);
}

/** Batched per-user log counts (one groupBy for a whole page of user rows). */
async function getShowCounts(userIds: string[]): Promise<Map<string, number>> {
  if (!userIds.length) return new Map();
  const rows = await prisma.userLog.groupBy({
    by: ['userId'],
    where: { userId: { in: userIds } },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.userId, r._count._all]));
}

async function computeProfileStats(targetUserId: string) {
  const [shows, followers, following, followingArtists] = await Promise.all([
    prisma.userLog.count({ where: { userId: targetUserId } }),
    prisma.follow.count({ where: { followingId: targetUserId } }),
    prisma.follow.count({ where: { followerId: targetUserId } }),
    prisma.userArtistFollow.count({ where: { userId: targetUserId } }),
  ]);

  // Distinct artist + venue ids from logs.
  const rows = await prisma.userLog.findMany({
    where: { userId: targetUserId },
    select: { event: { select: { artistId: true, venueId: true } } },
  });

  const artists = new Set<string>();
  const venues = new Set<string>();
  for (const r of rows) {
    artists.add(r.event.artistId);
    venues.add(r.event.venueId);
  }

  // `following` counts user follows (the degree-1 "friends" list);
  // `followingArtists` counts UserArtistFollow rows (the FOLLOWING sheet).
  return { shows, artists: artists.size, venues: venues.size, followers, following, followingArtists };
}

async function getBadgesForUser(targetUserId: string) {
  const rows = await prisma.userBadge.findMany({
    where: { userId: targetUserId },
    include: { badge: true },
    orderBy: { earnedAt: 'desc' },
  });

  return rows.map((r) => ({
    id: r.id,
    name: r.badge.name,
    description: r.badge.description,
    iconUrl: r.badge.iconUrl ?? undefined,
    earnedAt: r.earnedAt.toISOString(),
  }));
}

async function buildUserProfilePayload(viewerId: string | null, targetUserId: string) {
  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      username: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
      city: true,
      privacySetting: true,
      profileVisibility: true,
      createdAt: true,
    },
  });
  if (!user) throw new AppError('User not found', 404);

  const isSelf = Boolean(viewerId && viewerId === targetUserId);
  const isFollowing = await getFollowStatus(viewerId, targetUserId);

  // Privacy: PRIVATE profiles — and FRIENDS profiles when the viewer isn't
  // degree-1 (doesn't follow the target) — return a minimal card: enough to
  // render an avatar + follow button, nothing else. Self always gets full.
  if (!isSelf && (user.profileVisibility === 'PRIVATE' || (user.profileVisibility === 'FRIENDS' && !isFollowing))) {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName ?? undefined,
      avatarUrl: user.avatarUrl ?? undefined,
      privacySetting: user.privacySetting,
      profileVisibility: user.profileVisibility,
      isFollowing: isFollowing || undefined,
      restricted: true,
    };
  }

  const [stats, badges] = await Promise.all([
    computeProfileStats(targetUserId),
    getBadgesForUser(targetUserId),
  ]);

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName ?? undefined,
    bio: user.bio ?? undefined,
    avatarUrl: user.avatarUrl ?? undefined,
    city: user.city ?? undefined,
    privacySetting: user.privacySetting,
    profileVisibility: user.profileVisibility,
    createdAt: user.createdAt.toISOString(),
    stats,
    badges,
    isFollowing: isFollowing || undefined,
  };
}

function buildLogVisibilityWhere(
  viewerId: string | null,
  targetUserId: string,
  targetPrivacy: 'PUBLIC' | 'FRIENDS' | 'PRIVATE',
  viewerFollowsTarget: boolean
): Prisma.UserLogWhereInput {
  // If you are viewing your own profile, you can see all logs.
  if (viewerId && viewerId === targetUserId) return {};

  // If account is private, only followers can see anything (and still respect per-log visibility below).
  if (targetPrivacy === 'PRIVATE' && !viewerFollowsTarget) {
    return { id: '__none__' };
  }

  // Public profile:
  // - If viewer follows, allow FRIENDS + PUBLIC logs.
  // - Otherwise only PUBLIC.
  if (!viewerFollowsTarget) return { visibility: 'PUBLIC' as const };
  return { visibility: { in: ['PUBLIC', 'FRIENDS'] } };
}

// ==================== FEED ITEM SERIALIZATION ====================
// Shared shape for GET /feed and GET /events/:id/feed (event-scoped public
// shared memories). Keeping this in one place means both routes stay in
// lockstep with the client's feed-item contract.

const FEED_LOG_INCLUDE = {
  user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
  event: {
    include: {
      artist: { select: { id: true, name: true, imageUrl: true } },
      venue: { select: { id: true, name: true, city: true } },
    },
  },
  photos: {
    where: { visibility: 'PUBLIC', isFlagged: false },
    take: 4,
    orderBy: { createdAt: 'desc' },
    select: { id: true, photoUrl: true, mediaKind: true, duration: true, thumbUrl: true, userId: true },
  },
  coAuthors: {
    where: { status: 'ACCEPTED' },
    orderBy: { invitedAt: 'asc' },
    include: { user: { select: { id: true, username: true, avatarUrl: true } } },
  },
  comments: {
    take: 3,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
  },
  likes: {
    take: 2,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
  },
  // WasThere has no createdAt column (schema is intentionally left untouched
  // here), so `id desc` is used as a creation-order proxy — cuids are
  // time-ordered at generation.
  wasThere: {
    take: 3,
    orderBy: { id: 'desc' },
    include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
  },
  _count: { select: { comments: true, wasThere: true, likes: true } },
} satisfies Prisma.UserLogInclude;

type FeedLogRow = Prisma.UserLogGetPayload<{ include: typeof FEED_LOG_INCLUDE }>;

// ==================== VIEWER DEGREES (LinkedIn-style) ====================
// For the authenticated viewer: degree 1 = the viewer follows that user;
// degree 2 = someone a degree-1 user follows (excluding degree-1 users and
// the viewer). Computed once per request with two indexed Follow queries and
// passed down to whatever serializer needs it.

type FaceUser = { id: string; username: string; displayName: string | null; avatarUrl: string | null };

type FacePerson = {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  degree: 1 | 2;
};

type DegreeOf = (userId: string) => 1 | 2 | undefined;

type ViewerDegrees = {
  firstDegree: Set<string>;
  secondDegree: Set<string>;
  degreeOf: DegreeOf;
};

async function getViewerDegrees(viewerId: string | null): Promise<ViewerDegrees> {
  const firstDegree = new Set<string>();
  const secondDegree = new Set<string>();

  if (viewerId) {
    const following = await prisma.follow.findMany({
      where: { followerId: viewerId },
      select: { followingId: true },
    });
    for (const f of following) firstDegree.add(f.followingId);

    if (firstDegree.size) {
      const secondHop = await prisma.follow.findMany({
        where: { followerId: { in: [...firstDegree] } },
        select: { followingId: true },
        take: 5000,
      });
      for (const f of secondHop) {
        if (f.followingId !== viewerId && !firstDegree.has(f.followingId)) secondDegree.add(f.followingId);
      }
    }
  }

  const degreeOf: DegreeOf = (userId) => (firstDegree.has(userId) ? 1 : secondDegree.has(userId) ? 2 : undefined);
  return { firstDegree, secondDegree, degreeOf };
}

function toFacePerson(user: FaceUser, degree: 1 | 2): FacePerson {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName ?? undefined,
    avatarUrl: user.avatarUrl ?? undefined,
    degree,
  };
}

// FacePerson with the degree optional — for authors in threads/chat, where
// the author may be the viewer themself or outside the viewer's 2-degree
// graph (degree is omitted rather than forced).
const FACE_SELECT = { id: true, username: true, displayName: true, avatarUrl: true } as const;

type MaybeDegreeFacePerson = Omit<FacePerson, 'degree'> & { degree?: 1 | 2 };

function toMaybeDegreeFace(user: FaceUser, degreeOf: DegreeOf): MaybeDegreeFacePerson {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName ?? undefined,
    avatarUrl: user.avatarUrl ?? undefined,
    degree: degreeOf(user.id),
  };
}

// ==================== MENTIONS (@username) ====================
// Parse @username tokens out of user-authored text and resolve them to real
// users. POST responses include the resolved `mentions` so the client can
// render them; notification fan-out happens at the `// NOTIFY: mention`
// markers at each call site via notifyMentions below.

const MENTION_RE = /@([a-zA-Z0-9_.]{2,30})/g;

async function resolveMentions(text: string, degreeOf: DegreeOf): Promise<MaybeDegreeFacePerson[]> {
  const usernames = [...new Set(Array.from(text.matchAll(MENTION_RE), (m) => m[1]!.toLowerCase()))].slice(0, 10);
  if (!usernames.length) return [];

  const users = await prisma.user.findMany({
    where: { username: { in: usernames, mode: 'insensitive' } },
    select: FACE_SELECT,
  });
  return users.map((u) => toMaybeDegreeFace(u, degreeOf));
}

// Fire-and-forget mention notifications for the resolved mentions of one
// piece of user-authored text. Skips the author and anyone in `exclude`
// (users already notified about the same content, e.g. a log owner who got
// the "commented on your log" notification).
function notifyMentions(
  mentioned: Array<{ id: string }>,
  actor: { id: string; username: string },
  context: string,
  data: Record<string, unknown>,
  exclude: string[] = []
): void {
  const skip = new Set([actor.id, ...exclude]);
  const targets = mentioned.map((m) => m.id).filter((id) => !skip.has(id));
  if (!targets.length) return;
  // Privacy: honor each target's allowMentions before fanning out. The
  // mention itself stays in the text — only the notification is suppressed.
  // "FRIENDS" = the actor follows the target (same degree-1 rule as
  // buildLogVisibilityWhere / profile gating).
  void (async () => {
    const users = await prisma.user.findMany({
      where: { id: { in: targets } },
      select: { id: true, allowMentions: true },
    });
    const friendGated = users.filter((u) => u.allowMentions === 'FRIENDS').map((u) => u.id);
    const follows = friendGated.length
      ? await prisma.follow.findMany({
          where: { followerId: actor.id, followingId: { in: friendGated } },
          select: { followingId: true },
        })
      : [];
    const actorFollows = new Set(follows.map((f) => f.followingId));
    const allowed = users
      .filter((u) => u.allowMentions === 'EVERYONE' || (u.allowMentions === 'FRIENDS' && actorFollows.has(u.id)))
      .map((u) => u.id);
    if (!allowed.length) return;
    await notifyMany(allowed, {
      type: 'mention',
      title: 'You were mentioned',
      body: `@${actor.username} mentioned you in ${context}`,
      data,
      actorId: actor.id,
    });
  })().catch(() => {});
}

// The standard "who can the viewer discover" audience, mirroring GET /feed's
// fof rules: degree-1 users' logs may be PUBLIC or FRIENDS (the viewer
// follows them), degree-2 users' logs must be PUBLIC.
function degreeAudienceWhere(degrees: ViewerDegrees): Prisma.UserLogWhereInput[] {
  const audience: Prisma.UserLogWhereInput[] = [];
  if (degrees.firstDegree.size) {
    audience.push({ userId: { in: [...degrees.firstDegree] }, visibility: { in: ['PUBLIC', 'FRIENDS'] } });
  }
  if (degrees.secondDegree.size) {
    audience.push({ userId: { in: [...degrees.secondDegree] }, visibility: 'PUBLIC' });
  }
  return audience;
}

// Batched co-author score lookup for a page of feed rows: one query covering
// every (co-author, event) pair, keyed `${userId}:${eventId}`. A co-author's
// score is their OWN UserLog score for the same event (null if unscored).
async function getCoAuthorScores(
  logs: Array<{ eventId: string; coAuthors: Array<{ user: { id: string } }> }>
): Promise<Map<string, number | null>> {
  const userIds = new Set<string>();
  const eventIds = new Set<string>();
  for (const log of logs) {
    for (const ca of log.coAuthors) {
      userIds.add(ca.user.id);
      eventIds.add(log.eventId);
    }
  }
  if (!userIds.size) return new Map();

  const rows = await prisma.userLog.findMany({
    where: { userId: { in: [...userIds] }, eventId: { in: [...eventIds] } },
    select: { userId: true, eventId: true, score: true },
  });
  return new Map(rows.map((r) => [`${r.userId}:${r.eventId}`, r.score]));
}

function serializeFeedLog(
  log: FeedLogRow,
  wasThereSet: Set<string>,
  likedSet: Set<string>,
  degreeOf: DegreeOf,
  coAuthorScores: Map<string, number | null>,
  trendingTags: Map<string, string>,
  // eventId -> discoverable same-event loggers (degree-1 first, ≤5) — the
  // "friends who attended" circles. Manual WasThere taps union in below.
  sameEventAttendees: Map<string, { id: string; username: string; displayName?: string; avatarUrl?: string; degree?: 1 | 2 }[]> = new Map()
) {
  return {
    id: log.id,
    type: 'log' as const,
    createdAt: log.createdAt.toISOString(),
    // C23 TRENDS: the log's first caption hashtag that is currently trending
    // on its event (>= TREND_THRESHOLD public shared logs carry it there).
    trendingTag: trendingTags.get(log.id),
    user: {
      id: log.user.id,
      username: log.user.username,
      displayName: log.user.displayName ?? undefined,
      avatarUrl: log.user.avatarUrl ?? undefined,
    },
    log: {
      id: log.id,
      rating: typeof log.rating === 'number' ? log.rating : undefined,
      note: log.note ?? undefined,
      visibility: log.visibility,
      photos: (log.photos ?? []).map((p) => ({
        id: p.id,
        photoUrl: p.photoUrl,
        thumbnailUrl: p.thumbUrl ?? p.photoUrl,
        mediaKind: p.mediaKind,
        duration: p.duration ?? undefined,
        thumbUrl: p.thumbUrl ?? undefined,
        userId: p.userId,
      })),
    },
    coAuthors: (log.coAuthors ?? []).map((ca) => ({
      id: ca.user.id,
      username: ca.user.username,
      avatarUrl: ca.user.avatarUrl ?? undefined,
      score: coAuthorScores.get(`${ca.user.id}:${log.eventId}`) ?? null,
    })),
    event: {
      id: log.event.id,
      name: log.event.name,
      date: log.event.date.toISOString(),
      artist: {
        id: log.event.artist.id,
        name: log.event.artist.name,
        imageUrl: log.event.artist.imageUrl ?? undefined,
      },
      venue: {
        id: log.event.venue.id,
        name: log.event.venue.name,
        city: log.event.venue.city,
      },
    },
    commentCount: log._count.comments,
    comments: (log.comments ?? [])
      .slice()
      .reverse()
      .map((c) => ({
        id: c.id,
        text: c.text,
        createdAt: c.createdAt.toISOString(),
        user: {
          id: c.user.id,
          username: c.user.username,
          displayName: c.user.displayName ?? undefined,
          avatarUrl: c.user.avatarUrl ?? undefined,
        },
      })),
    userWasThere: wasThereSet.has(log.id),
    // Circles = manual "was there" taps UNION everyone the viewer can see
    // who logged the same show (excluding the author), degree-1 first.
    ...(() => {
      const manual = (log.wasThere ?? []).map((w) => ({
        id: w.user.id,
        username: w.user.username,
        displayName: w.user.displayName ?? undefined,
        avatarUrl: w.user.avatarUrl ?? undefined,
        degree: degreeOf(w.user.id),
      }));
      const attendees = (sameEventAttendees.get(log.eventId) ?? []).filter(
        (a) => a.id !== log.userId
      );
      const seen = new Set<string>();
      const merged = [...manual, ...attendees]
        .filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)))
        .sort((a, b) => (a.degree ?? 3) - (b.degree ?? 3))
        .slice(0, 5);
      return {
        wasThereUsers: merged,
        wasThereCount: Math.max(log._count.wasThere, merged.length),
      };
    })(),
    likeCount: log._count.likes,
    likedByMe: likedSet.has(log.id),
    recentLikers: (log.likes ?? []).map((l) => ({
      id: l.user.id,
      username: l.user.username,
      displayName: l.user.displayName ?? undefined,
      avatarUrl: l.user.avatarUrl ?? undefined,
    })),
  };
}

// ==================== TRENDS (C23 fan hashtags) ====================
//
// Trends are earned, not editorial: anyone can drop a #tag in their log
// caption (UserLog.note — hashtags are parsed from text, no schema column),
// and a tag that crosses TREND_THRESHOLD public shared posts on one
// event/tour promotes to that page's HIGHLIGHTS rail. The count is the flex.
//
// Board target is ~50 posts at production scale; 3 keeps local/demo data
// demonstrable. Override with TREND_THRESHOLD.
const TREND_THRESHOLD = Number(process.env.TREND_THRESHOLD ?? 3);
const TRENDS_PER_PAGE = 5;
const TREND_PHOTOS_PER_TAG = 6;

const HASHTAG_RE = /#[a-z0-9_]+/gi;

// Lowercased, '#'-stripped, deduped per log; preserves first-occurrence order.
function extractHashtags(text: string | null | undefined): string[] {
  if (!text) return [];
  const seen = new Set<string>();
  for (const match of text.match(HASHTAG_RE) ?? []) seen.add(match.slice(1).toLowerCase());
  return [...seen];
}

// The standard trend audience: PUBLIC shared logs from gallery-discoverable
// users, mirroring GET /events/:id/feed and GET /tours/:id/photos.
function trendAudienceWhere(scope: Prisma.UserLogWhereInput): Prisma.UserLogWhereInput {
  return {
    ...scope,
    visibility: 'PUBLIC',
    sharedAt: { not: null },
    note: { contains: '#' },
    user: { showInGalleries: true },
  };
}

type TrendEntry = { tag: string; count: number; photos: { url: string; logId: string }[] };

// One findMany pulls every tagged log in scope, then everything aggregates
// in-process — no per-tag queries.
async function computeTrends(scope: Prisma.UserLogWhereInput): Promise<TrendEntry[]> {
  const logs = await prisma.userLog.findMany({
    where: trendAudienceWhere(scope),
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      note: true,
      photos: {
        where: { visibility: 'PUBLIC', isFlagged: false },
        orderBy: { createdAt: 'desc' },
        take: TREND_PHOTOS_PER_TAG,
        select: { photoUrl: true },
      },
    },
  });

  const byTag = new Map<string, TrendEntry>();
  // Logs arrive newest-first, so each tag's photo strip fills latest-first.
  for (const log of logs) {
    for (const tag of extractHashtags(log.note)) {
      const entry = byTag.get(tag) ?? { tag, count: 0, photos: [] };
      entry.count++;
      for (const p of log.photos) {
        if (entry.photos.length >= TREND_PHOTOS_PER_TAG) break;
        entry.photos.push({ url: p.photoUrl, logId: log.id });
      }
      byTag.set(tag, entry);
    }
  }

  return [...byTag.values()]
    .filter((e) => e.count >= TREND_THRESHOLD)
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, TRENDS_PER_PAGE);
}

// Batched trendingTag lookup for a page of feed rows: one grouped pass over
// the page's eventIds counts every (event, tag) pair among public shared
// logs, then each row gets its first caption hashtag that meets
// TREND_THRESHOLD on its own event. One query for the whole batch.
/**
 * Same-event attendees for a feed page — the "friends who attended"
 * circles. For every eventId on the page, the viewer's degree-1 (PUBLIC or
 * FRIENDS logs) and degree-2 (PUBLIC only) users who logged that event.
 * One batched query; degree-1 first, ≤5 per event.
 */
async function getSameEventAttendees(
  logs: Array<{ eventId: string; userId: string }>,
  viewerId: string,
  degrees: Awaited<ReturnType<typeof getViewerDegrees>>
): Promise<Map<string, { id: string; username: string; displayName?: string; avatarUrl?: string; degree?: 1 | 2 }[]>> {
  const eventIds = [...new Set(logs.map((l) => l.eventId))];
  const out = new Map<string, { id: string; username: string; displayName?: string; avatarUrl?: string; degree?: 1 | 2 }[]>();
  if (eventIds.length === 0) return out;
  const d1 = [...degrees.firstDegree];
  const d2 = [...degrees.secondDegree];
  if (d1.length === 0 && d2.length === 0) return out;
  const rows = await prisma.userLog.findMany({
    where: {
      eventId: { in: eventIds },
      userId: { not: viewerId },
      OR: [
        ...(d1.length ? [{ userId: { in: d1 }, visibility: { in: ['PUBLIC', 'FRIENDS'] as any } }] : []),
        ...(d2.length ? [{ userId: { in: d2 }, visibility: 'PUBLIC' as any }] : []),
      ],
    },
    select: {
      eventId: true,
      user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });
  for (const row of rows) {
    const arr = out.get(row.eventId) ?? [];
    if (arr.some((p) => p.id === row.user.id)) continue;
    arr.push({
      id: row.user.id,
      username: row.user.username,
      displayName: row.user.displayName ?? undefined,
      avatarUrl: row.user.avatarUrl ?? undefined,
      degree: degrees.degreeOf(row.user.id),
    });
    out.set(row.eventId, arr);
  }
  for (const [k, arr] of out) {
    out.set(
      k,
      arr.sort((a, b) => (a.degree ?? 3) - (b.degree ?? 3)).slice(0, 5)
    );
  }
  return out;
}

async function getTrendingTags(
  logs: Array<{ id: string; eventId: string; note: string | null }>
): Promise<Map<string, string>> {
  const tagged = logs
    .map((l) => ({ id: l.id, eventId: l.eventId, tags: extractHashtags(l.note) }))
    .filter((l) => l.tags.length > 0);
  if (!tagged.length) return new Map();

  const eventIds = [...new Set(tagged.map((l) => l.eventId))];
  const rows = await prisma.userLog.findMany({
    where: trendAudienceWhere({ eventId: { in: eventIds } }),
    select: { eventId: true, note: true },
  });

  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const tag of extractHashtags(row.note)) {
      const key = `${row.eventId}:${tag}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  const out = new Map<string, string>();
  for (const l of tagged) {
    const hit = l.tags.find((tag) => (counts.get(`${l.eventId}:${tag}`) ?? 0) >= TREND_THRESHOLD);
    if (hit) out.set(l.id, hit);
  }
  return out;
}

// ==================== SCORING (compare-to-rank) HELPERS ====================
//
// A new log is placed into a user's score-ranked list via a Beli-style
// binary search over their already-scored logs (highest score first). Each
// POST /logs/:id/compare answer narrows the [lo, hi) insertion-index window
// for the log being placed; GET /logs/:id/next-opponent replays that window
// from the LogComparison audit trail and hands back its midpoint candidate.

async function getScoredCandidates(userId: string, excludeLogId: string) {
  return prisma.userLog.findMany({
    where: { userId, score: { not: null }, id: { not: excludeLogId } },
    orderBy: [{ score: 'desc' }, { scoreRank: 'desc' }],
    select: {
      id: true,
      score: true,
      scoreRank: true,
      event: { select: { id: true, name: true, date: true } },
      photos: {
        where: { visibility: 'PUBLIC', isFlagged: false },
        take: 1,
        orderBy: { createdAt: 'desc' },
        select: { photoUrl: true },
      },
    },
  });
}

type ScoreCandidate = Awaited<ReturnType<typeof getScoredCandidates>>[number];

type Placement = {
  candidates: ScoreCandidate[];
  resolved: boolean;
  lo: number;
  hi: number;
  tieIndex: number | null;
};

/**
 * Replays this log's LogComparison rows (in the order they were answered)
 * against the user's current scored-logs list to determine the insertion
 * window [lo, hi). WIN narrows the ceiling, LOSS narrows the floor, TIE
 * resolves placement immediately, adjacent to the tied opponent.
 */
async function computePlacement(userId: string, logId: string): Promise<Placement> {
  const candidates = await getScoredCandidates(userId, logId);

  if (candidates.length === 0) {
    return { candidates, resolved: true, lo: 0, hi: 0, tieIndex: null };
  }

  const comparisons = await prisma.logComparison.findMany({
    where: { logId },
    orderBy: { round: 'asc' },
    select: { opponentLogId: true, result: true },
  });

  let lo = 0;
  let hi = candidates.length;
  let tieIndex: number | null = null;

  for (const c of comparisons) {
    const idx = candidates.findIndex((cand) => cand.id === c.opponentLogId);
    if (idx === -1) continue; // opponent fell out of the candidate pool (e.g. deleted) — ignore stale answer
    if (c.result === 'TIE') {
      tieIndex = idx;
      break;
    } else if (c.result === 'WIN') {
      // This log beat the opponent -> it ranks above it, so the insertion index is <= idx.
      hi = Math.min(hi, idx);
    } else {
      // LOSS -> this log ranks below the opponent, so the insertion index is > idx.
      lo = Math.max(lo, idx + 1);
    }
  }

  const resolved = tieIndex !== null || lo >= hi;
  return { candidates, resolved, lo, hi, tieIndex };
}

/** The server-picked next opponent: the midpoint of the still-ambiguous [lo, hi) window. */
function pickMidpointCandidate(placement: Placement): ScoreCandidate | null {
  if (placement.resolved || placement.candidates.length === 0) return null;
  const midIdx = Math.floor((placement.lo + placement.hi) / 2);
  return placement.candidates[midIdx] ?? null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** score = round(((scoreAbove + scoreBelow) / 2) * 10) / 10, with top/bottom clamped edge cases. */
function computeInsertionScore(pos: number, candidates: ScoreCandidate[]): number {
  if (pos <= 0) {
    const top = candidates[0]!.score as number;
    return round1(Math.min(10, top + 0.3));
  }
  if (pos >= candidates.length) {
    const bottom = candidates[candidates.length - 1]!.score as number;
    return round1(Math.max(0.1, bottom - 0.3));
  }
  const scoreAbove = candidates[pos - 1]!.score as number;
  const scoreBelow = candidates[pos]!.score as number;
  return round1((scoreAbove + scoreBelow) / 2);
}

/** scoreRank midpoint for stable ordering: top = maxRank+1000, bottom = minRank-1000, else the midpoint. */
function computeInsertionRank(pos: number, candidates: ScoreCandidate[]): number {
  if (candidates.length === 0) return 0;
  if (pos <= 0) return (candidates[0]!.scoreRank as number) + 1000;
  if (pos >= candidates.length) return (candidates[candidates.length - 1]!.scoreRank as number) - 1000;
  return ((candidates[pos - 1]!.scoreRank as number) + (candidates[pos]!.scoreRank as number)) / 2;
}

// ==================== AUTH ROUTES ====================

app.post('/auth/signup', async (req, reply) => {
  const body = (req.body ?? {}) as { email?: string; password?: string; username?: string };
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? '';
  const username = body.username?.trim().toLowerCase();

  if (!email || !password || !username) throw new AppError('Email, password, and username are required', 400);
  if (password.length < 8) throw new AppError('Password must be at least 8 characters', 400);
  if (username.length < 3 || username.length > 20) throw new AppError('Username must be 3-20 characters', 400);
  if (!/^[a-zA-Z0-9_]+$/.test(username)) throw new AppError('Username can only contain letters, numbers, and underscores', 400);

  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existingUser) {
    throw new AppError(existingUser.email === email ? 'Email already in use' : 'Username already taken', 400);
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, passwordHash, username, displayName: username },
  });

  const tokens = generateTokens(user.id, user.email);

  reply.code(201);
  return {
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      city: user.city,
    },
    ...tokens,
  };
});

app.post('/auth/login', async (req) => {
  const body = (req.body ?? {}) as { email?: string; password?: string };
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? '';

  if (!email || !password) throw new AppError('Email and password are required', 400);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) throw new AppError('Invalid email or password', 401);

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw new AppError('Invalid email or password', 401);

  const tokens = generateTokens(user.id, user.email);

  return {
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      city: user.city,
      spotifyId: user.spotifyId,
    },
    ...tokens,
  };
});

app.post('/auth/refresh', async (req) => {
  const body = (req.body ?? {}) as { refreshToken?: string };
  const refreshToken = body.refreshToken;
  if (!refreshToken) throw new AppError('Refresh token required', 400);

  const payload = verifyToken(refreshToken);
  if (payload.type !== 'refresh') throw new AppError('Invalid token type', 401);

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) throw new AppError('User not found', 401);

  return generateTokens(user.id, user.email);
});

// Apple Sign In callback
app.post('/auth/apple/callback', async (req, reply) => {
  try {
    const body = req.body as {
      identityToken?: string;
      authorizationCode?: string;
      fullName?: { givenName?: string; familyName?: string } | null;
      email?: string | null;
    };

    if (!body.identityToken) {
      throw new AppError('Identity token required', 400);
    }

    // Decode the identity token (Apple JWT)
    const decoded = jwt.decode(body.identityToken, { complete: true }) as {
      header: { kid: string; alg: string };
      payload: {
        iss: string;
        sub: string; // Apple user ID
        aud: string;
        email?: string;
        email_verified?: string;
      };
    } | null;

    if (!decoded) {
      throw new AppError('Invalid identity token', 400);
    }

    // Verify issuer
    if (decoded.payload.iss !== 'https://appleid.apple.com') {
      throw new AppError('Invalid token issuer', 400);
    }

    // Verify audience matches our client ID
    const expectedAudience = process.env.APPLE_CLIENT_ID || 'com.sticket.app';
    if (decoded.payload.aud !== expectedAudience) {
      throw new AppError('Invalid token audience', 400);
    }

    const appleUserId = decoded.payload.sub;
    const appleEmail = decoded.payload.email || body.email;

    // Check if user exists with this Apple ID
    let user = await prisma.user.findFirst({
      where: { appleId: appleUserId },
    });

    if (!user && appleEmail) {
      // Check if user exists with this email
      user = await prisma.user.findUnique({
        where: { email: appleEmail.toLowerCase() },
      });

      if (user) {
        // Link Apple ID to existing account
        user = await prisma.user.update({
          where: { id: user.id },
          data: { appleId: appleUserId },
        });
      }
    }

    if (!user) {
      // Create new user
      const displayName = body.fullName
        ? [body.fullName.givenName, body.fullName.familyName].filter(Boolean).join(' ')
        : undefined;

      // Generate unique username
      const baseUsername = appleEmail
        ? appleEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
        : `user${Date.now()}`;
      
      let username = baseUsername;
      let counter = 1;
      while (await prisma.user.findUnique({ where: { username } })) {
        username = `${baseUsername}${counter}`;
        counter++;
      }

      user = await prisma.user.create({
        data: {
          email: appleEmail?.toLowerCase() || `${appleUserId}@privaterelay.appleid.com`,
          username,
          displayName: displayName || username,
          appleId: appleUserId,
          emailVerified: true, // Apple verifies email
          passwordHash: '', // No password for social auth
        },
      });
    }

    // Generate tokens using the existing token generation function
    const tokens = generateTokens(user.id, user.email);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    req.log.error({ error }, 'Apple Sign In error');
    throw new AppError('Apple Sign In failed', 500);
  }
});

// Keep old endpoint for backward compatibility
app.post('/auth/apple', async (req) => {
  const body = (req.body ?? {}) as { identityToken?: string; fullName?: { givenName?: string; familyName?: string } };
  if (!body.identityToken) throw new AppError('Identity token required', 400);
  const result = await handleAppleSignIn(body.identityToken, body.fullName);
  return { user: result.user, ...result.tokens };
});

// Google Sign In callback
app.post('/auth/google/callback', async (req, reply) => {
  try {
    const body = req.body as { idToken?: string };

    if (!body.idToken) {
      throw new AppError('ID token required', 400);
    }

    // Verify the token with Google
    const { OAuth2Client } = await import('google-auth-library');
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      throw new AppError('Google Sign In is not configured', 500);
    }
    const googleClient = new OAuth2Client(googleClientId);

    const ticket = await googleClient.verifyIdToken({
      idToken: body.idToken,
      audience: [
        process.env.GOOGLE_CLIENT_ID!,
        process.env.GOOGLE_IOS_CLIENT_ID!,
      ].filter(Boolean),
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new AppError('Invalid token payload', 400);
    }

    const googleId = payload.sub;
    const email = payload.email;
    const emailVerified = payload.email_verified;
    const name = payload.name;
    const picture = payload.picture;

    if (!email) {
      throw new AppError('Email not provided by Google', 400);
    }

    // Check if user exists with this Google ID
    let user = await prisma.user.findFirst({
      where: { googleId },
    });

    if (!user) {
      // Check if user exists with this email
      user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (user) {
        // Link Google ID to existing account
        user = await prisma.user.update({
          where: { id: user.id },
          data: { 
            googleId,
            avatarUrl: user.avatarUrl || picture,
          },
        });
      }
    }

    if (!user) {
      // Create new user
      const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      
      let username = baseUsername;
      let counter = 1;
      while (await prisma.user.findUnique({ where: { username } })) {
        username = `${baseUsername}${counter}`;
        counter++;
      }

      user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          username,
          displayName: name || username,
          avatarUrl: picture,
          googleId,
          emailVerified: emailVerified || false,
          passwordHash: '', // No password for social auth
        },
      });
    }

    // Generate tokens using the existing token generation function
    const tokens = generateTokens(user.id, user.email);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    req.log.error({ error }, 'Google Sign In error');
    throw new AppError('Google Sign In failed', 500);
  }
});

// Keep old endpoint for backward compatibility
app.post('/auth/google', async (req) => {
  const body = (req.body ?? {}) as { idToken?: string };
  if (!body.idToken) throw new AppError('ID token required', 400);
  const result = await handleGoogleSignIn(body.idToken);
  return { user: result.user, ...result.tokens };
});

app.get('/auth/spotify/url', async (req) => {
  const userId = requireAccessUserId(req as any);
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_REDIRECT_URI) {
    throw new AppError('Spotify connect is not configured on this server', 501);
  }
  const scopes = ['user-read-email', 'user-read-private', 'user-top-read', 'user-library-read'].join(' ');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.SPOTIFY_CLIENT_ID,
    scope: scopes,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
    state: userId,
  });

  return { url: `https://accounts.spotify.com/authorize?${params.toString()}` };
});

app.post('/auth/spotify/callback', async (req) => {
  const userId = requireAccessUserId(req as any);
  const body = (req.body ?? {}) as { code?: string };
  if (!body.code) throw new AppError('Authorization code required', 400);
  return await handleSpotifyConnect(userId, body.code);
});

app.post('/auth/spotify/disconnect', async (req) => {
  const userId = requireAccessUserId(req as any);
  await prisma.user.update({
    where: { id: userId },
    data: { spotifyId: null, spotifyUsername: null, spotifyToken: null, spotifyRefresh: null, spotifyTokenExpiry: null },
  });
  return { success: true };
});

app.get('/auth/spotify/top-artists', async (req) => {
  const userId = requireAccessUserId(req as any);
  const { user, spotifyToken } = await getUserWithFreshSpotifyToken(userId);
  if (!spotifyToken) throw new AppError('Spotify not connected', 400);

  const q = (req.query ?? {}) as { limit?: string; time_range?: string };
  const limit = q.limit ? Number.parseInt(q.limit, 10) : 50;
  const timeRange = (q.time_range ?? 'medium_term') as 'short_term' | 'medium_term' | 'long_term';
  const artists = await getSpotifyTopArtists(spotifyToken, Number.isFinite(limit) ? limit : 50, timeRange);
  return artists;
});

// GET /users/me/spotify/insights — the viewer's derived Spotify taste profile
// (top artists, genre affinity, top tracks) for You/onboarding surfaces. Reads
// the stored enrichment; lazily backfills via a live fetch for users who
// connected before enrichment existed.
app.get('/users/me/spotify/insights', async (req) => {
  const userId = requireAccessUserId(req as any);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      spotifyId: true,
      spotifyUsername: true,
      spotifyGenres: true,
      spotifyTopArtists: true,
      spotifyTopTracks: true,
      spotifyEnrichedAt: true,
    },
  });
  if (!user?.spotifyId) throw new AppError('Spotify not connected', 400);

  let topArtists = user.spotifyTopArtists ?? [];
  let topGenres = user.spotifyGenres ?? [];
  let topTracks = (user.spotifyTopTracks as Array<{ name: string; artist: string | null; id: string | null }> | null) ?? [];
  let enrichedAt = user.spotifyEnrichedAt;

  // Backfill legacy connections (connected before enrichment shipped).
  if (!enrichedAt) {
    const fresh = await syncSpotifyEnrichment(userId).catch(() => null);
    if (fresh) {
      topArtists = fresh.topArtists;
      topGenres = fresh.topGenres;
      topTracks = fresh.topTracks;
      enrichedAt = new Date();
    }
  }

  return {
    connected: true,
    spotifyUsername: user.spotifyUsername ?? null,
    topArtists,
    topGenres,
    topTracks,
    enrichedAt: enrichedAt ? enrichedAt.toISOString() : null,
  };
});

app.post('/auth/forgot-password', async (req) => {
  const body = (req.body ?? {}) as { email?: string };
  const email = body.email?.trim().toLowerCase();
  if (!email) throw new AppError('Email required', 400);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { success: true, message: 'If email exists, reset link sent' };

  const resetToken = generateResetToken();
  const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.user.update({ where: { id: user.id }, data: { resetToken, resetTokenExpiry } });

  // TODO: integrate email provider (Resend/SendGrid)
  req.log.info({ email, resetToken }, 'Password reset token generated');

  return { success: true, message: 'If email exists, reset link sent' };
});

app.post('/auth/reset-password', async (req) => {
  const body = (req.body ?? {}) as { token?: string; password?: string };
  const token = body.token;
  const password = body.password ?? '';
  if (!token || !password) throw new AppError('Token and password required', 400);
  if (password.length < 8) throw new AppError('Password must be at least 8 characters', 400);

  const user = await prisma.user.findFirst({
    where: { resetToken: token, resetTokenExpiry: { gt: new Date() } },
  });
  if (!user) throw new AppError('Invalid or expired reset token', 400);

  const passwordHash = await hashPassword(password);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetToken: null, resetTokenExpiry: null },
  });

  return { success: true, message: 'Password reset successful' };
});

app.get('/auth/me', async (req) => {
  const userId = requireAccessUserId(req as any);

  const [profilePayload, authUser] = await Promise.all([
    buildUserProfilePayload(userId, userId),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        spotifyId: true,
        googleId: true,
        appleId: true,
        emailVerified: true,
        sameShowRadius: true,
        tasteRadius: true,
        showInGalleries: true,
      },
    }),
  ]);
  if (!authUser) throw new AppError('User not found', 404);

  return {
    ...profilePayload,
    email: authUser.email,
    emailVerified: authUser.emailVerified,
    hasSpotify: !!authUser.spotifyId,
    hasGoogle: !!authUser.googleId,
    hasApple: !!authUser.appleId,
    sameShowRadius: authUser.sameShowRadius,
    tasteRadius: authUser.tasteRadius,
    showInGalleries: authUser.showInGalleries,
  };
});

app.post('/auth/logout', async () => ({ success: true }));

app.post('/auth/change-password', async (req) => {
  const userId = requireAccessUserId(req as any);
  const body = (req.body ?? {}) as { currentPassword?: string; newPassword?: string };
  const currentPassword = body.currentPassword ?? '';
  const newPassword = body.newPassword ?? '';

  if (!currentPassword || !newPassword) throw new AppError('Current password and new password are required', 400);
  if (newPassword.length < 8) throw new AppError('New password must be at least 8 characters', 400);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.passwordHash) throw new AppError('Cannot change password for this account', 400);

  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) throw new AppError('Current password is incorrect', 400);

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  return { success: true };
});

app.post('/auth/change-email', async (req) => {
  const userId = requireAccessUserId(req as any);
  const body = (req.body ?? {}) as { newEmail?: string; password?: string };
  const newEmail = body.newEmail?.trim().toLowerCase();
  const password = body.password ?? '';

  if (!newEmail || !password) throw new AppError('New email and password are required', 400);
  if (!newEmail.includes('@')) throw new AppError('Invalid email', 400);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found', 404);
  if (!user.passwordHash) throw new AppError('Cannot change email for this account', 400);

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw new AppError('Incorrect password', 400);

  const existing = await prisma.user.findUnique({ where: { email: newEmail } });
  if (existing && existing.id !== userId) throw new AppError('Email is already in use', 400);

  await prisma.user.update({ where: { id: userId }, data: { email: newEmail, emailVerified: false } });
  return { success: true, message: 'Email updated successfully' };
});

app.delete('/auth/account', async (req) => {
  const userId = requireAccessUserId(req as any);
  const body = (req.body ?? {}) as { password?: string; reason?: string };
  const password = body.password ?? '';
  const reason = body.reason?.trim();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found', 404);

  if (user.passwordHash) {
    if (!password) throw new AppError('Password required', 400);
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) throw new AppError('Incorrect password', 400);
  }

  if (reason) {
    req.log.info({ userId, reason }, 'Account deletion requested');
  }

  await prisma.$transaction(async (tx) => {
    // Child tables / relations first (include rows on the user's logs too).
    await tx.tipUpvote.deleteMany({ where: { userId } });
    await tx.venueTip.deleteMany({ where: { userId } });
    await tx.venueRating.deleteMany({ where: { userId } });
    await tx.userBadge.deleteMany({ where: { userId } });
    await tx.userArtistFollow.deleteMany({ where: { userId } });
    await tx.userInterested.deleteMany({ where: { userId } });
    await tx.userTicket.deleteMany({ where: { userId } });

    await tx.follow.deleteMany({ where: { OR: [{ followerId: userId }, { followingId: userId }] } });

    await tx.logTag.deleteMany({ where: { OR: [{ userId }, { taggedUserId: userId }, { log: { userId } }] } });
    await tx.comment.deleteMany({ where: { OR: [{ userId }, { log: { userId } }] } });
    await tx.logPhoto.deleteMany({ where: { OR: [{ userId }, { log: { userId } }] } });
    await tx.wasThere.deleteMany({ where: { OR: [{ userId }, { log: { userId } }] } });

    await tx.seatView.deleteMany({ where: { userId } });

    await tx.userLog.deleteMany({ where: { userId } });

    await tx.user.delete({ where: { id: userId } });
  });

  return { success: true };
});

function visibilityEnumToOption(v: 'PUBLIC' | 'FRIENDS' | 'PRIVATE'): 'public' | 'friends' | 'private' {
  if (v === 'FRIENDS') return 'friends';
  if (v === 'PRIVATE') return 'private';
  return 'public';
}

function parseVisibilityOption(v: unknown): 'PUBLIC' | 'FRIENDS' | 'PRIVATE' | null {
  if (typeof v !== 'string') return null;
  const raw = v.trim().toLowerCase();
  if (raw === 'public') return 'PUBLIC';
  if (raw === 'friends') return 'FRIENDS';
  if (raw === 'private') return 'PRIVATE';
  return null;
}

async function buildSettingsPayload(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      privacySetting: true,
      activityVisibility: true,
      showInSuggestions: true,
      allowTagging: true,
      homeCity: true,
      distanceUnit: true,
      spotifyId: true,
      spotifyUsername: true,
      appleMusicId: true,
    },
  });
  if (!user) throw new AppError('User not found', 404);

  return {
    profileVisibility: visibilityEnumToOption(user.privacySetting as any),
    activityVisibility: visibilityEnumToOption(user.activityVisibility as any),
    showInSuggestions: user.showInSuggestions,
    allowTagging: user.allowTagging,
    homeCity: user.homeCity ?? undefined,
    distanceUnit: (user.distanceUnit === 'km' ? 'km' : 'miles') as 'miles' | 'km',
    spotifyConnected: Boolean(user.spotifyId),
    spotifyUsername: user.spotifyUsername ?? (user.spotifyId ?? undefined),
    appleMusicConnected: Boolean(user.appleMusicId),
  };
}

app.get('/settings', async (req) => {
  const userId = requireAccessUserId(req as any);
  return await buildSettingsPayload(userId);
});

app.patch('/settings', async (req) => {
  const userId = requireAccessUserId(req as any);
  const body = (req.body ?? {}) as Record<string, unknown>;

  const updates: Record<string, unknown> = {};

  const profileVisibility = parseVisibilityOption(body.profileVisibility);
  if (profileVisibility) {
    // Keep legacy field in sync (used elsewhere in the app).
    updates.privacySetting = profileVisibility;
  }

  const activityVisibility = parseVisibilityOption(body.activityVisibility);
  if (activityVisibility) updates.activityVisibility = activityVisibility;

  if (typeof body.showInSuggestions === 'boolean') updates.showInSuggestions = body.showInSuggestions;
  if (typeof body.allowTagging === 'boolean') updates.allowTagging = body.allowTagging;

  if (body.homeCity === null) updates.homeCity = null;
  else if (typeof body.homeCity === 'string') updates.homeCity = body.homeCity.trim() || null;

  if (typeof body.distanceUnit === 'string' && (body.distanceUnit === 'miles' || body.distanceUnit === 'km')) {
    updates.distanceUnit = body.distanceUnit;
  }

  await prisma.user.update({ where: { id: userId }, data: updates as any });
  return await buildSettingsPayload(userId);
});

app.get('/settings/privacy', async (req) => {
  const userId = requireAccessUserId(req as any);
  const data = await buildSettingsPayload(userId);
  return {
    profileVisibility: data.profileVisibility,
    activityVisibility: data.activityVisibility,
    showInSuggestions: data.showInSuggestions,
    allowTagging: data.allowTagging,
  };
});

app.patch('/settings/privacy', async (req) => {
  const userId = requireAccessUserId(req as any);
  const body = (req.body ?? {}) as Record<string, unknown>;

  const updates: Record<string, unknown> = {};

  const profileVisibility = parseVisibilityOption(body.profileVisibility);
  if (profileVisibility) updates.privacySetting = profileVisibility;

  const activityVisibility = parseVisibilityOption(body.activityVisibility);
  if (activityVisibility) updates.activityVisibility = activityVisibility;

  if (typeof body.showInSuggestions === 'boolean') updates.showInSuggestions = body.showInSuggestions;
  if (typeof body.allowTagging === 'boolean') updates.allowTagging = body.allowTagging;

  await prisma.user.update({ where: { id: userId }, data: updates as any });

  const data = await buildSettingsPayload(userId);
  return {
    profileVisibility: data.profileVisibility,
    activityVisibility: data.activityVisibility,
    showInSuggestions: data.showInSuggestions,
    allowTagging: data.allowTagging,
  };
});

app.post('/settings/export-data', async (req) => {
  // In production: queue a job to generate export + email a link.
  const userId = requireAccessUserId(req as any);
  req.log.info({ userId }, 'Data export requested');
  return { message: 'Data export request received. You will receive an email with your data.', downloadUrl: null };
});

// ==================== NOTIFICATIONS ROUTES ====================
//
// In-app notifications are Notification rows written by src/notificationEngine.ts;
// device push tokens land in PushToken. Preferences are still a non-persisted
// stub (all-on defaults) — the engine sends every notification type until a
// prefs model exists.

const defaultNotificationPrefs = {
  // Social
  follows: true,
  comments: true,
  tags: true,
  wasThere: true,
  friendLogged: true,

  // Shows
  artistAnnouncements: true,
  ticketsOnSale: true,
  showReminders: true,
  postShowPrompts: true,

  // Delivery
  pushEnabled: true,
  emailDigest: 'none' as const,
};

app.get('/notifications', async (req) => {
  // Allow local-only/dev sessions (no auth header) to render cleanly.
  const userId = getUserIdFromRequest(req);
  if (!userId) return { notifications: [], nextCursor: null, unreadCount: 0 };

  const q = (req.query ?? {}) as { limit?: string; before?: string };
  const limit = Math.max(1, Math.min(50, Number(q.limit ?? 30) || 30));
  const before = q.before ? new Date(q.before) : null;

  const [rows, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: {
        userId,
        ...(before && !Number.isNaN(before.getTime()) ? { createdAt: { lt: before } } : {}),
      },
      include: { actor: { select: FACE_SELECT } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.notification.count({ where: { userId, read: false } }),
  ]);

  return {
    notifications: rows.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
      actor: n.actor
        ? { id: n.actor.id, username: n.actor.username, avatarUrl: n.actor.avatarUrl ?? undefined }
        : undefined,
      data: n.data ?? {},
    })),
    nextCursor: rows.length === limit ? rows[rows.length - 1]!.createdAt.toISOString() : null,
    unreadCount,
  };
});

app.get('/notifications/unread-count', async (req) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return { count: 0 };
  return { count: await prisma.notification.count({ where: { userId, read: false } }) };
});

app.patch('/notifications/:id/read', async (req) => {
  // Mutations require auth.
  const userId = requireAccessUserId(req as any);
  const { id } = req.params as { id: string };
  await prisma.notification.updateMany({ where: { id, userId }, data: { read: true } });
  return { success: true };
});

app.post('/notifications/read-all', async (req) => {
  const userId = requireAccessUserId(req as any);
  await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
  return { success: true };
});

app.get('/notifications/preferences', async (req) => {
  void getUserIdFromRequest(req);
  return defaultNotificationPrefs;
});

app.patch('/notifications/preferences', async (req) => {
  void requireAccessUserId(req as any);
  const body = (req.body ?? {}) as Partial<typeof defaultNotificationPrefs>;
  // Stub: return merged prefs (not persisted yet).
  return { ...defaultNotificationPrefs, ...body };
});

app.post('/notifications/push-token', async (req) => {
  const userId = requireAccessUserId(req as any);
  const body = (req.body ?? {}) as { token?: unknown };
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  if (!token) throw new AppError('token is required', 400);

  // A device token belongs to whoever logged in last on that device.
  await prisma.pushToken.upsert({
    where: { token },
    update: { userId },
    create: { token, userId },
  });
  return { success: true };
});

app.delete('/notifications/push-token', async (req) => {
  const userId = requireAccessUserId(req as any);
  const body = (req.body ?? {}) as { token?: unknown };
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  if (token) await prisma.pushToken.deleteMany({ where: { token, userId } });
  return { success: true };
});

// ==================== USER / PROFILE ROUTES ====================

// GET /users/search - Search users by username/displayName
app.get('/users/search', async (req) => {
  const userId = requireAccessUserId(req as any);
  const q = (req.query ?? {}) as { q?: string; limit?: string };

  const raw = typeof q.q === 'string' ? q.q : '';
  const searchQuery = raw.trim();
  if (!searchQuery) return [];

  const limitRaw = Number(q.limit ?? 20);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(50, limitRaw)) : 20;

  const users = await prisma.user.findMany({
    where: {
      id: { not: userId },
      OR: [{ username: { contains: searchQuery, mode: 'insensitive' } }, { displayName: { contains: searchQuery, mode: 'insensitive' } }],
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      _count: { select: { logs: true } },
    },
    take: limit,
  });

  const userIds = users.map((u) => u.id);
  if (userIds.length === 0) return [];

  const [followingRows, followerRows, myFollowingRows] = await Promise.all([
    prisma.follow.findMany({
      where: { followerId: userId, followingId: { in: userIds } },
      select: { followingId: true },
    }),
    prisma.follow.findMany({
      where: { followingId: userId, followerId: { in: userIds } },
      select: { followerId: true },
    }),
    prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    }),
  ]);

  const followingSet = new Set(followingRows.map((f) => f.followingId));
  const followersSet = new Set(followerRows.map((f) => f.followerId));
  const myFollowingIds = myFollowingRows.map((f) => f.followingId);

  const mutualRows =
    myFollowingIds.length === 0
      ? []
      : await prisma.follow.findMany({
          where: { followerId: { in: userIds }, followingId: { in: myFollowingIds } },
          select: { followerId: true },
        });

  const mutualCountByUserId = new Map<string, number>();
  for (const r of mutualRows) mutualCountByUserId.set(r.followerId, (mutualCountByUserId.get(r.followerId) ?? 0) + 1);

  return users.map((u) => ({
    id: u.id,
    username: u.username,
    displayName: u.displayName ?? undefined,
    avatarUrl: u.avatarUrl ?? undefined,
    isFollowing: followingSet.has(u.id),
    isFollowingYou: followersSet.has(u.id),
    mutualFriends: mutualCountByUserId.get(u.id) ?? 0,
    showCount: u._count.logs,
  }));
});

// POST /users/contacts-sync - Match contacts with registered users (email-based, phone optional)
app.post('/users/contacts-sync', async (req) => {
  const userId = requireAccessUserId(req as any);
  const body = (req.body ?? {}) as { contacts?: { name?: string; phoneNumber?: string; email?: string }[] };
  const contacts = Array.isArray(body.contacts) ? body.contacts : [];
  if (contacts.length === 0) return [];

  const normalized = contacts
    .map((c) => {
      const name = (c.name ?? '').trim() || 'Unknown';
      const email = typeof c.email === 'string' ? c.email.trim().toLowerCase() : null;
      const rawPhone = typeof c.phoneNumber === 'string' ? c.phoneNumber.trim() : null;

      let phoneNumber: string | null = null;
      if (rawPhone) {
        try {
          const parsed =
            // Try without region first, then fall back to US.
            parsePhoneNumberFromString(rawPhone) ?? parsePhoneNumberFromString(rawPhone, 'US');
          if (parsed?.isValid()) phoneNumber = parsed.number; // E.164
        } catch {
          phoneNumber = null;
        }
      }

      if (!email && !phoneNumber) return null;
      return { name, email, phoneNumber };
    })
    .filter(Boolean) as { name: string; email: string | null; phoneNumber: string | null }[];

  const emails = Array.from(new Set(normalized.map((c) => c.email).filter(Boolean))) as string[];
  const phoneNumbers = Array.from(new Set(normalized.map((c) => c.phoneNumber).filter(Boolean))) as string[];
  if (emails.length === 0 && phoneNumbers.length === 0) return [];

  const or: Prisma.UserWhereInput[] = [];
  if (emails.length) or.push({ email: { in: emails } });
  if (phoneNumbers.length) or.push({ phoneNumber: { in: phoneNumbers } });

  const matchedUsers = await prisma.user.findMany({
    where: { id: { not: userId }, OR: or },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      email: true,
      phoneNumber: true,
      _count: { select: { logs: true } },
    },
  });

  const following = await prisma.follow.findMany({
    where: { followerId: userId, followingId: { in: matchedUsers.map((u) => u.id) } },
    select: { followingId: true },
  });
  const followingSet = new Set(following.map((f) => f.followingId));

  const emailToName = new Map<string, string>();
  const phoneToName = new Map<string, string>();
  for (const c of normalized) {
    if (c.email && !emailToName.has(c.email)) emailToName.set(c.email, c.name);
    if (c.phoneNumber && !phoneToName.has(c.phoneNumber)) phoneToName.set(c.phoneNumber, c.name);
  }

  return matchedUsers.map((u) => ({
    id: u.id,
    username: u.username,
    displayName: u.displayName ?? undefined,
    avatarUrl: u.avatarUrl ?? undefined,
    isFollowing: followingSet.has(u.id),
    contactName: (u.phoneNumber && phoneToName.get(u.phoneNumber)) || emailToName.get(u.email) || 'Unknown',
    showCount: u._count.logs,
  }));
});

// GET /users/suggestions - People you might know
app.get('/users/suggestions', async (req) => {
  const userId = requireAccessUserId(req as any);
  const q = (req.query ?? {}) as { limit?: string };
  const limitRaw = Number(q.limit ?? 20);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(50, limitRaw)) : 20;

  const following = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  const followingIds = following.map((f) => f.followingId);
  const excludeIds = new Set<string>([userId, ...followingIds]);

  const suggestions: any[] = [];
  const seen = new Set<string>();

  // 1) Friends of friends
  if (followingIds.length > 0) {
    const friendsOfFriends = await prisma.follow.findMany({
      where: {
        followerId: { in: followingIds },
        followingId: { notIn: Array.from(excludeIds) },
      },
      include: {
        following: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        follower: { select: { username: true, displayName: true } },
      },
    });

    const fofMap = new Map<string, { user: any; mutuals: string[] }>();
    for (const f of friendsOfFriends) {
      const mutualName = f.follower.displayName || f.follower.username;
      const existing = fofMap.get(f.followingId);
      if (existing) existing.mutuals.push(mutualName);
      else fofMap.set(f.followingId, { user: f.following, mutuals: [mutualName] });
    }

    for (const [id, entry] of fofMap) {
      if (seen.has(id)) continue;
      seen.add(id);
      suggestions.push({
        ...entry.user,
        isFollowing: false,
        reason: { type: 'mutual_friends', count: entry.mutuals.length, names: entry.mutuals.slice(0, 3) },
      });
    }
  }

  // 2) People at same shows
  const myLogs = await prisma.userLog.findMany({
    where: { userId },
    select: { eventId: true },
  });
  const myEventIds = myLogs.map((l) => l.eventId);

  if (myEventIds.length > 0) {
    const sameShowUsers = await prisma.userLog.findMany({
      where: { eventId: { in: myEventIds }, userId: { notIn: Array.from(excludeIds) } },
      include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } }, event: { select: { name: true, date: true } } },
      distinct: ['userId'],
      take: 10,
    });

    for (const row of sameShowUsers) {
      const id = row.user.id;
      if (seen.has(id)) continue;
      seen.add(id);
      suggestions.push({
        ...row.user,
        isFollowing: false,
        reason: { type: 'same_show', eventName: row.event.name, date: row.event.date.toISOString() },
      });
    }
  }

  // 3) Popular users
  const popularUsers = await prisma.user.findMany({
    where: { id: { notIn: Array.from(excludeIds) } },
    select: { id: true, username: true, displayName: true, avatarUrl: true, _count: { select: { followers: true } } },
    orderBy: { followers: { _count: 'desc' } },
    take: 8,
  });

  for (const u of popularUsers) {
    if (seen.has(u.id)) continue;
    seen.add(u.id);
    suggestions.push({
      id: u.id,
      username: u.username,
      displayName: u.displayName ?? undefined,
      avatarUrl: u.avatarUrl ?? undefined,
      isFollowing: false,
      reason: { type: 'popular', followerCount: u._count.followers },
    });
  }

  return suggestions.slice(0, limit);
});

// GET /users/username/:username - Resolve user by username for QR / deep links
// GET /users/taste-match?ids=a,b,c — Jaccard similarity over followed
// artists between the viewer and each requested user (≤10), batched into two
// UserArtistFollow queries total.
app.get('/users/taste-match', async (req) => {
  const viewerId = requireAccessUserId(req as any);
  const q = (req.query ?? {}) as { ids?: string };

  const ids = [...new Set((q.ids ?? '').split(',').map((s) => s.trim()).filter(Boolean))];
  if (!ids.length) throw new AppError('ids is required', 400);
  if (ids.length > 10) throw new AppError('Too many ids (max 10)', 400);

  // Privacy: users who opted out of taste match are silently dropped from
  // `matches` (the viewer always keeps their own side of the comparison).
  // Spotify taste fields are pulled alongside so the score can blend Spotify
  // top-artist / genre overlap when BOTH sides have connected Spotify.
  const [optedIn, viewer, viewerRows, targetRows] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: ids }, appearInTasteMatch: true },
      select: { id: true, spotifyTopArtists: true, spotifyGenres: true },
    }),
    prisma.user.findUnique({
      where: { id: viewerId },
      select: { spotifyTopArtists: true, spotifyGenres: true },
    }),
    prisma.userArtistFollow.findMany({ where: { userId: viewerId }, select: { artistId: true } }),
    prisma.userArtistFollow.findMany({ where: { userId: { in: ids } }, select: { userId: true, artistId: true } }),
  ]);
  const allowedIds = optedIn.map((u) => u.id);
  const targetById = new Map(optedIn.map((u) => [u.id, u]));

  const viewerSet = new Set(viewerRows.map((r) => r.artistId));
  const byUser = new Map<string, Set<string>>();
  for (const row of targetRows) {
    const set = byUser.get(row.userId) ?? new Set<string>();
    set.add(row.artistId);
    byUser.set(row.userId, set);
  }

  // Jaccard similarity (%) between two string sets.
  const jaccardPct = (a: Set<string>, b: Set<string>): number => {
    let shared = 0;
    for (const x of b) if (a.has(x)) shared++;
    const union = a.size + b.size - shared;
    return union === 0 ? 0 : Math.round((100 * shared) / union);
  };
  const lowerSet = (xs: string[] | null | undefined) =>
    new Set((xs ?? []).map((s) => s.trim().toLowerCase()).filter(Boolean));

  const viewerSpotifyArtists = lowerSet(viewer?.spotifyTopArtists);
  const viewerSpotifyGenres = lowerSet(viewer?.spotifyGenres);
  const viewerHasSpotify = viewerSpotifyArtists.size > 0 || viewerSpotifyGenres.size > 0;

  const matches = allowedIds.map((userId) => {
    const theirs = byUser.get(userId) ?? new Set<string>();
    const followsPct = jaccardPct(viewerSet, theirs);

    // Blend in Spotify overlap only when BOTH sides have Spotify enrichment;
    // otherwise fall back to the follow-graph score (unchanged behavior).
    const target = targetById.get(userId);
    const theirSpotifyArtists = lowerSet(target?.spotifyTopArtists);
    const theirSpotifyGenres = lowerSet(target?.spotifyGenres);
    const theyHaveSpotify = theirSpotifyArtists.size > 0 || theirSpotifyGenres.size > 0;

    let pct = followsPct;
    if (viewerHasSpotify && theyHaveSpotify) {
      const artistPct = jaccardPct(viewerSpotifyArtists, theirSpotifyArtists);
      const genrePct = jaccardPct(viewerSpotifyGenres, theirSpotifyGenres);
      pct = Math.round(0.5 * followsPct + 0.3 * artistPct + 0.2 * genrePct);
    }

    return { userId, pct };
  });

  return { matches };
});

app.get('/users/username/:username', async (req) => {
  const viewerId = requireAccessUserId(req as any);
  const { username } = req.params as { username: string };
  const uname = (username ?? '').trim().toLowerCase();
  if (!uname) throw new AppError('Username required', 400);

  const user = await prisma.user.findUnique({
    where: { username: uname },
    select: { id: true, username: true, displayName: true, avatarUrl: true, _count: { select: { logs: true } } },
  });
  if (!user) throw new AppError('User not found', 404);

  const [isFollowing, isFollowingYou] = await Promise.all([
    prisma.follow.findUnique({ where: { followerId_followingId: { followerId: viewerId, followingId: user.id } }, select: { id: true } }),
    prisma.follow.findUnique({ where: { followerId_followingId: { followerId: user.id, followingId: viewerId } }, select: { id: true } }),
  ]);

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName ?? undefined,
    avatarUrl: user.avatarUrl ?? undefined,
    isFollowing: Boolean(isFollowing),
    isFollowingYou: Boolean(isFollowingYou),
    mutualFriends: 0,
    showCount: user._count.logs,
  };
});

app.get('/users/:id', async (req) => {
  const viewerId = getUserIdFromRequest(req);
  const { id } = req.params as { id: string };
  return await buildUserProfilePayload(viewerId, id);
});

app.get('/users/:id/stats', async (req) => {
  const { id } = req.params as { id: string };
  return await computeProfileStats(id);
});

app.get('/users/:id/badges', async (req) => {
  const { id } = req.params as { id: string };
  return await getBadgesForUser(id);
});

// GET /users/:id/shared-history — "YOU × THEM" overlap between the
// authenticated viewer and :id. Returns the events BOTH have logged (the
// target's side is only counted when their log is visible to the viewer per
// the standard visibility/follow rules — a private log excludes the event
// entirely), newest show first, capped at 50 rows. `artistOverlap` is the
// number of artists both users follow; `topSharedArtist` is one of those
// artists' names (for "You both follow X" copy on the client).
app.get('/users/:id/shared-history', async (req) => {
  const viewerId = requireAccessUserId(req as any);
  const { id: targetUserId } = req.params as { id: string };

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, privacySetting: true },
  });
  if (!target) throw new AppError('User not found', 404);

  // Comparing yourself against yourself is degenerate — the client renders
  // nothing for an empty overlap, so return the empty shape.
  if (viewerId === targetUserId) return { sharedCount: 0, artistOverlap: 0, topSharedArtist: null, entries: [] };

  const viewerFollowsTarget = await getFollowStatus(viewerId, targetUserId);

  // A private account you don't follow exposes nothing — not even artist
  // overlap (mirrors the profile lock screen).
  if (target.privacySetting === 'PRIVATE' && !viewerFollowsTarget) {
    return { sharedCount: 0, artistOverlap: 0, topSharedArtist: null, entries: [] };
  }

  const visibilityWhere = buildLogVisibilityWhere(viewerId, targetUserId, target.privacySetting, viewerFollowsTarget);

  const [viewerLogs, theirLogs, viewerArtistRows, theirArtistRows] = await Promise.all([
    prisma.userLog.findMany({
      where: { userId: viewerId },
      select: { eventId: true, score: true },
    }),
    prisma.userLog.findMany({
      where: { userId: targetUserId, ...visibilityWhere },
      select: {
        eventId: true,
        score: true,
        event: {
          select: {
            id: true,
            name: true,
            date: true,
            venue: { select: { name: true } },
          },
        },
      },
      orderBy: { event: { date: 'desc' } },
    }),
    prisma.userArtistFollow.findMany({ where: { userId: viewerId }, select: { artistId: true } }),
    prisma.userArtistFollow.findMany({
      where: { userId: targetUserId },
      select: { artistId: true, artist: { select: { name: true } } },
    }),
  ]);

  const viewerLogByEvent = new Map(viewerLogs.map((l) => [l.eventId, l]));
  const shared = theirLogs.filter((l) => viewerLogByEvent.has(l.eventId));

  const entries = shared.slice(0, 50).map((l) => ({
    eventId: l.event.id,
    eventName: l.event.name,
    date: l.event.date.toISOString(),
    venueName: l.event.venue.name,
    yourScore: viewerLogByEvent.get(l.eventId)!.score ?? null,
    theirScore: l.score ?? null,
  }));

  const viewerArtistIds = new Set(viewerArtistRows.map((a) => a.artistId));
  const sharedArtists = theirArtistRows.filter((a) => viewerArtistIds.has(a.artistId));

  return {
    sharedCount: shared.length,
    artistOverlap: sharedArtists.length,
    topSharedArtist: sharedArtists[0]?.artist.name ?? null,
    entries,
  };
});

app.get('/users/:id/followers', async (req) => {
  const { id } = req.params as { id: string };
  const q = (req.query ?? {}) as { limit?: string; offset?: string };
  const limit = Math.max(1, Math.min(100, Number(q.limit ?? 50)));
  const offset = Math.max(0, Number(q.offset ?? 0));

  const rows = await prisma.follow.findMany({
    where: { followingId: id },
    orderBy: { createdAt: 'desc' },
    skip: offset,
    take: limit,
    include: { follower: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
  });

  const showCountByUser = await getShowCounts(rows.map((r) => r.follower.id));

  return rows.map((r) => ({
    id: r.follower.id,
    username: r.follower.username,
    displayName: r.follower.displayName ?? undefined,
    avatarUrl: r.follower.avatarUrl ?? undefined,
    showCount: showCountByUser.get(r.follower.id) ?? 0,
  }));
});

app.get('/users/:id/following', async (req) => {
  const { id } = req.params as { id: string };
  const q = (req.query ?? {}) as { limit?: string; offset?: string };
  const limit = Math.max(1, Math.min(100, Number(q.limit ?? 50)));
  const offset = Math.max(0, Number(q.offset ?? 0));

  const rows = await prisma.follow.findMany({
    where: { followerId: id },
    orderBy: { createdAt: 'desc' },
    skip: offset,
    take: limit,
    include: { following: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
  });

  const showCountByUser = await getShowCounts(rows.map((r) => r.following.id));

  return rows.map((r) => ({
    id: r.following.id,
    username: r.following.username,
    displayName: r.following.displayName ?? undefined,
    avatarUrl: r.following.avatarUrl ?? undefined,
    showCount: showCountByUser.get(r.following.id) ?? 0,
  }));
});

// Shared gate for the profile's friends / followed-artists lists: mirrors the
// buildUserProfilePayload restriction (profileVisibility) and the
// /users/:id/logs convention of returning empty rather than 403 when hidden.
// "Friend" = degree-1 = someone the user follows (one-way, per getViewerDegrees).
async function isProfileListRestricted(viewerId: string | null, targetUserId: string): Promise<boolean> {
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { profileVisibility: true },
  });
  if (!target) throw new AppError('User not found', 404);

  if (viewerId && viewerId === targetUserId) return false;
  if (target.profileVisibility === 'PRIVATE') return true;
  if (target.profileVisibility === 'FRIENDS') {
    const viewerFollowsTarget = await getFollowStatus(viewerId, targetUserId);
    return !viewerFollowsTarget;
  }
  return false;
}

// GET /users/:id/friends — the target's degree-1 people (users they follow),
// same row shape as /users/:id/following. Empty when the profile is restricted
// for this viewer.
app.get('/users/:id/friends', async (req) => {
  const viewerId = getUserIdFromRequest(req);
  const { id } = req.params as { id: string };
  const q = (req.query ?? {}) as { limit?: string; offset?: string };
  const limit = Math.max(1, Math.min(100, Number(q.limit ?? 50)));
  const offset = Math.max(0, Number(q.offset ?? 0));

  if (await isProfileListRestricted(viewerId, id)) return [];

  const rows = await prisma.follow.findMany({
    where: { followerId: id },
    orderBy: { createdAt: 'desc' },
    skip: offset,
    take: limit,
    include: { following: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
  });

  const showCountByUser = await getShowCounts(rows.map((r) => r.following.id));

  return rows.map((r) => ({
    id: r.following.id,
    username: r.following.username,
    displayName: r.following.displayName ?? undefined,
    avatarUrl: r.following.avatarUrl ?? undefined,
    showCount: showCountByUser.get(r.following.id) ?? 0,
  }));
});

// GET /users/:id/following-artists — artists the target follows
// (UserArtistFollow, i.e. taste — distinct from /users/:id/artists which is
// derived from logged shows). Venues are not followable (no venue-follow
// model), so the profile FOLLOWING sheet is artists-only. Empty when the
// profile is restricted for this viewer.
app.get('/users/:id/following-artists', async (req) => {
  const viewerId = getUserIdFromRequest(req);
  const { id } = req.params as { id: string };
  const q = (req.query ?? {}) as { limit?: string; offset?: string };
  const limit = Math.max(1, Math.min(200, Number(q.limit ?? 100)));
  const offset = Math.max(0, Number(q.offset ?? 0));

  if (await isProfileListRestricted(viewerId, id)) return [];

  const rows = await prisma.userArtistFollow.findMany({
    where: { userId: id },
    orderBy: { createdAt: 'desc' },
    skip: offset,
    take: limit,
    include: { artist: { select: { id: true, name: true, imageUrl: true } } },
  });

  return rows.map((r) => ({
    id: r.artist.id,
    name: r.artist.name,
    imageUrl: r.artist.imageUrl ?? undefined,
  }));
});

app.post('/users/:id/follow', async (req) => {
  const followerId = requireAccessUserId(req as any);
  const { id: followingId } = req.params as { id: string };

  if (followerId === followingId) throw new AppError('Cannot follow yourself', 400);

  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId, followingId } },
    update: {},
    create: { followerId, followingId },
  });

  return { success: true };
});

app.delete('/users/:id/follow', async (req) => {
  const followerId = requireAccessUserId(req as any);
  const { id: followingId } = req.params as { id: string };

  if (followerId === followingId) throw new AppError('Cannot unfollow yourself', 400);

  await prisma.follow.deleteMany({
    where: { followerId, followingId },
  });

  return { success: true };
});

app.patch('/users/me', async (req) => {
  const userId = requireAccessUserId(req as any);
  const body = (req.body ?? {}) as {
    displayName?: string;
    username?: string;
    bio?: string;
    city?: string;
    avatarUrl?: string;
  };

  const username = body.username?.trim().toLowerCase();
  const displayName = body.displayName?.trim();
  const bio = body.bio?.trim();
  const city = body.city?.trim();
  const avatarUrl = body.avatarUrl?.trim();

  if (username !== undefined) {
    if (username.length < 3 || username.length > 20) throw new AppError('Username must be 3-20 characters', 400);
    if (!/^[a-zA-Z0-9_]+$/.test(username)) throw new AppError('Username can only contain letters, numbers, and underscores', 400);

    const existing = await prisma.user.findFirst({
      where: { username, NOT: { id: userId } },
      select: { id: true },
    });
    if (existing) throw new AppError('Username already taken', 400);
  }

  if (displayName !== undefined && displayName.length > 50) throw new AppError('Display name too long', 400);
  if (bio !== undefined && bio.length > 160) throw new AppError('Bio too long', 400);

  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(displayName !== undefined && { displayName: displayName || null }),
      ...(username !== undefined && { username }),
      ...(bio !== undefined && { bio: bio || null }),
      ...(city !== undefined && { city: city || null }),
      ...(avatarUrl !== undefined && { avatarUrl: avatarUrl || null }),
    },
  });

  return await buildUserProfilePayload(userId, userId);
});

app.post('/users/me/avatar', async (req) => {
  const userId = requireAccessUserId(req as any);

  const file = await (req as any).file();
  if (!file) throw new AppError('Avatar file is required', 400);

  const extFromName = typeof file.filename === 'string' && file.filename.includes('.') ? file.filename.split('.').pop() : null;
  const extFromMime =
    typeof file.mimetype === 'string'
      ? file.mimetype === 'image/png'
        ? 'png'
        : file.mimetype === 'image/webp'
          ? 'webp'
          : file.mimetype === 'image/jpeg'
            ? 'jpg'
            : null
      : null;

  const ext = extFromMime || extFromName || 'jpg';
  const avatarsDir = path.join(uploadsRoot, 'avatars');
  await mkdir(avatarsDir, { recursive: true });

  const filename = `${userId}_${Date.now()}_${randomUUID()}.${ext}`;
  const dest = path.join(avatarsDir, filename);
  await pipeline(file.file, createWriteStream(dest));

  const avatarUrl = `${getPublicBaseUrl(req as any)}/uploads/avatars/${filename}`;

  await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl },
  });

  return { avatarUrl };
});

// ============================================
// MY ARTISTS + FANCLUBS + CONCERT LIFE (v2)
// ============================================

// Compact display formatting for latestDrop text ("JUL 24", "10:00 AM").
const MONTH_ABBR = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const fmtMonthDay = (d: Date) => `${MONTH_ABBR[d.getMonth()]} ${d.getDate()}`;
const fmtTime = (d: Date) => {
  const h = d.getHours() % 12 || 12;
  return `${h}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() >= 12 ? 'PM' : 'AM'}`;
};

// GET /users/me/artists - Get user's followed artists with stats
app.get('/users/me/artists', async (req) => {
  const userId = requireAccessUserId(req as any);
  const now = new Date();

  const follows = await prisma.userArtistFollow.findMany({
    where: { userId },
    include: { artist: true },
    orderBy: [{ createdAt: 'desc' }],
  });

  const tierOrder: Record<string, number> = { 'top-tier': 0, following: 1, casual: 2 };
  follows.sort((a, b) => (tierOrder[a.tier] ?? 99) - (tierOrder[b.tier] ?? 99) || b.createdAt.getTime() - a.createdAt.getTime());

  const artistIds = follows.map((f) => f.artistId);
  const artistNames = follows.map((f) => f.artist.name);
  const artistNamesLower = new Set(artistNames.map((n) => n.toLowerCase()));
  const presaleArtistFilters = artistNames
    .map((n) => n.trim())
    .filter(Boolean)
    .slice(0, 200)
    .map((n) => ({ artistName: { equals: n, mode: 'insensitive' as const } }));

  const degrees = await getViewerDegrees(userId);
  const friendIds = [...degrees.firstDegree];

  const [logs, presales, upcomingEvents, tickets, interestedRows, friendFollows, friendLogRows] = await Promise.all([
    artistIds.length
      ? prisma.userLog.findMany({
          where: { userId, event: { artistId: { in: artistIds } } },
          include: { event: { include: { venue: true } } },
          orderBy: { event: { date: 'desc' } },
        })
      : [],
    presaleArtistFilters.length
      ? prisma.presale.findMany({
          where: { presaleStart: { gte: now }, source: { in: PRESALE_SOURCES }, OR: presaleArtistFilters },
          orderBy: { presaleStart: 'asc' },
          take: 200, // capped for UI
        })
      : [],
    artistIds.length
      ? prisma.event.findMany({
          where: { artistId: { in: artistIds }, date: { gte: now } },
          include: { venue: true, artist: true, tour: { select: { startDate: true } } },
          orderBy: { date: 'asc' },
          take: 200,
        })
      : [],
    artistIds.length
      ? prisma.userTicket.findMany({
          where: { userId, event: { artistId: { in: artistIds }, date: { gte: now } } },
          include: { event: { include: { venue: true } } },
          orderBy: { event: { date: 'asc' } },
        })
      : [],
    // Viewer's upcoming event interests, for latestDrop.planned.
    artistIds.length
      ? prisma.userInterested.findMany({
          where: { userId, event: { artistId: { in: artistIds }, date: { gte: now } } },
          select: { eventId: true },
        })
      : [],
    // Degree-1 friends who also follow these artists (one batched query).
    friendIds.length && artistIds.length
      ? prisma.userArtistFollow.findMany({
          where: { userId: { in: friendIds }, artistId: { in: artistIds } },
          select: { artistId: true, user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
        })
      : [],
    // Degree-1 friends' logs across these artists, for seen-count comparisons.
    friendIds.length && artistIds.length
      ? prisma.userLog.findMany({
          where: { userId: { in: friendIds }, event: { artistId: { in: artistIds } } },
          select: { userId: true, event: { select: { artistId: true } } },
        })
      : [],
  ]);

  const logsByArtist = new Map<string, typeof logs>();
  for (const l of logs) {
    const aid = l.event.artistId;
    const arr = logsByArtist.get(aid) ?? [];
    arr.push(l);
    logsByArtist.set(aid, arr);
  }

  const upcomingByArtist = new Map<string, typeof upcomingEvents>();
  for (const e of upcomingEvents) {
    const arr = upcomingByArtist.get(e.artistId) ?? [];
    arr.push(e);
    upcomingByArtist.set(e.artistId, arr);
  }

  const ticketsByArtist = new Map<string, typeof tickets>();
  for (const t of tickets) {
    const aid = t.event.artistId;
    const arr = ticketsByArtist.get(aid) ?? [];
    arr.push(t);
    ticketsByArtist.set(aid, arr);
  }

  const presalesByArtistNameLower = new Map<string, typeof presales>();
  for (const p of presales) {
    const k = p.artistName.toLowerCase();
    if (!artistNamesLower.has(k)) continue;
    const arr = presalesByArtistNameLower.get(k) ?? [];
    arr.push(p);
    presalesByArtistNameLower.set(k, arr);
  }

  const interestedEventIds = new Set(interestedRows.map((i) => i.eventId));
  const friendsTrackingByArtist = groupFacepiles(friendFollows, (r) => r.artistId, (r) => r.user, degrees.degreeOf, 4);

  // Per-artist seen counts for each degree-1 friend (friendsSeenMore).
  const friendSeenByArtist = new Map<string, Map<string, number>>();
  for (const row of friendLogRows) {
    const counts = friendSeenByArtist.get(row.event.artistId) ?? new Map<string, number>();
    counts.set(row.userId, (counts.get(row.userId) ?? 0) + 1);
    friendSeenByArtist.set(row.event.artistId, counts);
  }

  const artistsWithStats = follows.map((follow) => {
    const userLogs = logsByArtist.get(follow.artistId) ?? [];
    const last = userLogs[0];
    const first = userLogs[userLogs.length - 1];

    const artistPresales = presalesByArtistNameLower.get(follow.artist.name.toLowerCase()) ?? [];
    const artistUpcoming = upcomingByArtist.get(follow.artistId) ?? [];
    const userTickets = ticketsByArtist.get(follow.artistId) ?? [];

    // latestDrop: the artist's most-timely upcoming thing, derived from the
    // rows already fetched above. A presale beats the soonest show when it
    // starts sooner; a show on a not-yet-started tour reads as a tour start.
    const ticketEventIds = new Set(userTickets.map((t) => t.eventId));
    const nextShow = artistUpcoming[0];
    const nextPresale = artistPresales[0];
    let latestDrop: {
      kind: 'show' | 'presale' | 'tour';
      text: string;
      date: string;
      eventId?: string;
      presaleId?: string;
      planned: boolean;
    } | null = null;
    if (nextPresale && (!nextShow || nextPresale.presaleStart.getTime() < nextShow.date.getTime())) {
      latestDrop = {
        kind: 'presale',
        text: `PRESALE ${fmtMonthDay(nextPresale.presaleStart)} · ${fmtTime(nextPresale.presaleStart)}`,
        date: nextPresale.presaleStart.toISOString(),
        presaleId: nextPresale.id,
        // Presale rows are denormalized (no Event FK), so ticket/interest
        // state can't be resolved for them.
        planned: false,
      };
    } else if (nextShow) {
      const isTourStart = nextShow.tour?.startDate != null && nextShow.tour.startDate.getTime() >= now.getTime();
      latestDrop = {
        kind: isTourStart ? 'tour' : 'show',
        text: `${isTourStart ? 'TOUR STARTS' : 'NEW SHOW'} · ${nextShow.venue.name.toUpperCase()} ${fmtMonthDay(nextShow.date)}`,
        date: nextShow.date.toISOString(),
        eventId: nextShow.id,
        planned: ticketEventIds.has(nextShow.id) || interestedEventIds.has(nextShow.id),
      };
    }

    // How many degree-1 friends have seen this artist at least as many times
    // as the viewer (friends with zero logs never count).
    const friendCounts = friendSeenByArtist.get(follow.artistId);
    let friendsSeenMoreCount = 0;
    if (friendCounts) {
      for (const c of friendCounts.values()) if (c >= userLogs.length) friendsSeenMoreCount += 1;
    }

    return {
      id: follow.id,
      tier: follow.tier,
      notify: follow.notify,
      createdAt: follow.createdAt.toISOString(),
      artist: {
        id: follow.artist.id,
        name: follow.artist.name,
        imageUrl: follow.artist.imageUrl ?? undefined,
        genres: follow.artist.genres ?? [],
        spotifyId: follow.artist.spotifyId ?? undefined,
      },
      stats: {
        timesSeen: userLogs.length,
        lastSeen: last?.event.date.toISOString() ?? null,
        lastVenue: last ? `${last.event.venue.name}, ${last.event.venue.city}` : null,
        firstSeen: first?.event.date.toISOString() ?? null,
      },
      upcomingPresales: artistPresales.slice(0, 3).map((p) => ({
        id: p.id,
        eventId: p.eventId ?? undefined,
        presaleType: p.presaleType,
        presaleStart: p.presaleStart.toISOString(),
        venueName: p.venueName,
        venueCity: p.venueCity,
        code: p.code ?? undefined,
        signupDeadline: p.signupDeadline?.toISOString() ?? undefined,
      })),
      upcomingShows: artistUpcoming.slice(0, 3).map((e) => ({
        id: e.id,
        date: e.date.toISOString(),
        venueName: e.venue.name,
        venueCity: e.venue.city,
      })),
      nextTicket: userTickets[0]
        ? {
            eventId: userTickets[0].eventId,
            date: userTickets[0].event.date.toISOString(),
            venueName: userTickets[0].event.venue.name,
          }
        : null,
      latestDrop,
      friendsTracking: friendsTrackingByArtist.get(follow.artistId) ?? [],
      friendsSeenMore: { count: friendsSeenMoreCount },
    };
  });

  const topTier = artistsWithStats.filter((a) => a.tier === 'top-tier');
  const following = artistsWithStats.filter((a) => a.tier === 'following');
  const casual = artistsWithStats.filter((a) => a.tier === 'casual');
  const bucketList = artistsWithStats.filter((a) => a.stats.timesSeen === 0);
  const withPresales = artistsWithStats.filter((a) => a.upcomingPresales.length > 0);

  return {
    topTier,
    following,
    casual,
    bucketList,
    withPresales,
    totalArtists: artistsWithStats.length,
    totalSeen: artistsWithStats.filter((a) => a.stats.timesSeen > 0).length,
  };
});

// PATCH /users/me/artists/:artistId/tier - Update artist tier
app.patch('/users/me/artists/:artistId/tier', async (req) => {
  const userId = requireAccessUserId(req as any);
  const { artistId } = req.params as { artistId: string };
  const body = (req.body ?? {}) as { tier?: 'top-tier' | 'following' | 'casual' };

  const tier = body.tier;
  if (!tier || !['top-tier', 'following', 'casual'].includes(tier)) throw new AppError('Invalid tier', 400);

  const result = await prisma.userArtistFollow.updateMany({
    where: { userId, artistId },
    data: { tier },
  });

  if (result.count === 0) throw new AppError('Artist not followed', 404);
  return { success: true, tier };
});

// POST /users/me/artists/bulk-follow - Follow multiple artists at once (for onboarding)
app.post('/users/me/artists/bulk-follow', async (req) => {
  const userId = requireAccessUserId(req as any);
  const body = (req.body ?? {}) as {
    artists?: Array<{
      spotifyId?: string;
      name: string;
      imageUrl?: string;
      genres?: string[];
      tier?: 'top-tier' | 'following' | 'casual';
    }>;
  };

  const artists = body.artists;
  if (!artists || !Array.isArray(artists) || artists.length === 0) throw new AppError('Artists array required', 400);

  const results = await Promise.all(
    artists.map(async (artistInput) => {
      const name = artistInput.name?.trim();
      if (!name) throw new AppError('Artist name required', 400);

      const spotifyId = artistInput.spotifyId?.trim();
      const tier = artistInput.tier ?? 'following';

      let artist =
        spotifyId
          ? await prisma.artist.findUnique({ where: { spotifyId } })
          : await prisma.artist.findFirst({
              where: { name: { equals: name, mode: 'insensitive' } },
            });

      if (!artist) {
        artist = await prisma.artist.create({
          data: {
            name,
            spotifyId: spotifyId || null,
            imageUrl: artistInput.imageUrl?.trim() || null,
            genres: artistInput.genres ?? [],
          },
        });
      }

      await prisma.userArtistFollow.upsert({
        where: { userId_artistId: { userId, artistId: artist.id } },
        create: { userId, artistId: artist.id, tier, notify: true },
        update: { tier },
      });

      return { artistId: artist.id, name: artist.name };
    })
  );

  return { followed: results.length, artists: results };
});

// ============================================
// FANCLUB ENDPOINTS
// ============================================

// GET /users/me/fanclubs - Get user's fanclub memberships
app.get('/users/me/fanclubs', async (req) => {
  const userId = requireAccessUserId(req as any);

  const fanclubs = await prisma.userFanclub.findMany({
    where: { userId },
    orderBy: { renewalDate: 'asc' },
  });

  const now = new Date();
  const thirtyDaysFromNow = new Date(now);
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const renewalsSoon = fanclubs.filter((f) => f.renewalDate && f.renewalDate >= now && f.renewalDate <= thirtyDaysFromNow);

  return {
    fanclubs: fanclubs.map((f) => ({
      ...f,
      memberSince: f.memberSince?.toISOString() ?? null,
      renewalDate: f.renewalDate?.toISOString() ?? null,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    })),
    renewalsSoon: renewalsSoon.map((f) => ({
      ...f,
      memberSince: f.memberSince?.toISOString() ?? null,
      renewalDate: f.renewalDate?.toISOString() ?? null,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    })),
    totalCost: fanclubs.reduce((sum, f) => sum + (f.cost || 0), 0),
  };
});

// POST /users/me/fanclubs - Add/update fanclub membership
app.post('/users/me/fanclubs', async (req) => {
  const userId = requireAccessUserId(req as any);
  const body = (req.body ?? {}) as {
    artistId?: string;
    artistName?: string;
    fanclubName?: string;
    isMember?: boolean;
    memberSince?: string;
    renewalDate?: string;
    cost?: number;
    signupUrl?: string;
    notes?: string;
  };

  if (!body.artistId || !body.artistName || !body.fanclubName) throw new AppError('artistId, artistName, and fanclubName are required', 400);
  if (typeof body.isMember !== 'boolean') throw new AppError('isMember is required', 400);

  return await prisma.userFanclub.upsert({
    where: { userId_artistId: { userId, artistId: body.artistId } },
    create: {
      userId,
      artistId: body.artistId,
      artistName: body.artistName,
      fanclubName: body.fanclubName,
      isMember: body.isMember,
      memberSince: body.memberSince ? new Date(body.memberSince) : null,
      renewalDate: body.renewalDate ? new Date(body.renewalDate) : null,
      cost: typeof body.cost === 'number' ? body.cost : null,
      signupUrl: body.signupUrl?.trim() || null,
      notes: body.notes?.trim() || null,
    },
    update: {
      artistName: body.artistName,
      fanclubName: body.fanclubName,
      isMember: body.isMember,
      memberSince: body.memberSince ? new Date(body.memberSince) : undefined,
      renewalDate: body.renewalDate ? new Date(body.renewalDate) : undefined,
      cost: typeof body.cost === 'number' ? body.cost : undefined,
      signupUrl: body.signupUrl?.trim() || undefined,
      notes: body.notes?.trim() || undefined,
    },
  });
});

// DELETE /users/me/fanclubs/:artistId - Remove fanclub tracking
app.delete('/users/me/fanclubs/:artistId', async (req) => {
  const userId = requireAccessUserId(req as any);
  const { artistId } = req.params as { artistId: string };
  await prisma.userFanclub.deleteMany({ where: { userId, artistId } });
  return { success: true };
});

// ============================================
// MY CONCERT LIFE (TIMELINE) ENDPOINTS
// ============================================

// GET /users/me/concert-life - Combined timeline (logs + tickets + tracking)
app.get('/users/me/concert-life', async (req) => {
  const userId = requireAccessUserId(req as any);
  const q = (req.query ?? {}) as { year?: string };
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const year = q.year ? Number(q.year) : undefined;

  const logsWhere: Prisma.UserLogWhereInput = { userId };
  if (typeof year === 'number' && Number.isFinite(year)) {
    logsWhere.event = { date: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } };
  }

  const [logs, tickets, tracking] = await Promise.all([
    prisma.userLog.findMany({
      where: logsWhere,
      include: {
        event: { include: { artist: true, venue: true } },
        photos: { take: 4, orderBy: { createdAt: 'desc' } },
        _count: { select: { comments: true, wasThere: true } },
      },
      orderBy: { event: { date: 'desc' } },
    }),
    prisma.userTicket.findMany({
      // Include "today" tickets even if the show time is earlier than now.
      where: { userId, event: { date: { gte: startOfToday } } },
      include: { event: { include: { artist: true, venue: true } } },
      orderBy: { event: { date: 'asc' } },
    }),
    prisma.userEventTracking.findMany({
      // Include "today" tracked events even if the event time is earlier than now.
      where: { userId, event: { date: { gte: startOfToday } } },
      include: { event: { include: { artist: true, venue: true } } },
      orderBy: { event: { date: 'asc' } },
    }),
  ]);

  const follows = await prisma.userArtistFollow.findMany({
    where: { userId },
    select: { artist: { select: { name: true } } },
  });
  const artistNames = follows.map((f) => f.artist.name);

  const presaleAlerts = artistNames.length
    ? await prisma.presale.findMany({
        where: {
          artistName: { in: artistNames, mode: 'insensitive' },
          presaleStart: { gte: now },
          source: { in: PRESALE_SOURCES },
        },
        include: {
          alerts: { where: { userId } },
        },
        orderBy: { presaleStart: 'asc' },
        take: 20,
      })
    : [];

  const allDates = [...logs.map((l) => l.event.date), ...tickets.map((t) => t.event.date)];
  const years = [...new Set(allDates.map((d) => d.getFullYear()))].sort((a, b) => b - a);

  return {
    // If a user logs a show whose event date is in the future, we still want it to appear in the
    // "Upcoming" section of the timeline (profile may show it already).
    upcomingLogs: logs
      .filter((l) => l.event.date >= startOfToday)
      .map((l) => ({
        type: 'log' as const,
        id: l.id,
        date: l.event.date.toISOString(),
        event: {
          id: l.event.id,
          name: l.event.name,
          date: l.event.date.toISOString(),
          artist: l.event.artist,
          venue: l.event.venue,
        },
        rating: typeof l.rating === 'number' ? l.rating : null,
        note: l.note ?? null,
        photos: l.photos.map((p) => p.photoUrl),
        commentCount: l._count.comments,
        wasThereCount: l._count.wasThere,
      })),
    pastLogs: logs
      .filter((l) => l.event.date < startOfToday)
      .map((l) => ({
        type: 'log' as const,
        id: l.id,
        date: l.event.date.toISOString(),
        event: {
          id: l.event.id,
          name: l.event.name,
          date: l.event.date.toISOString(),
          artist: l.event.artist,
          venue: l.event.venue,
        },
        rating: typeof l.rating === 'number' ? l.rating : null,
        note: l.note ?? null,
        photos: l.photos.map((p) => p.photoUrl),
        commentCount: l._count.comments,
        wasThereCount: l._count.wasThere,
      })),
    upcomingTickets: tickets.map((t) => ({
      type: 'ticket' as const,
      id: t.id,
      date: t.event.date.toISOString(),
      event: {
        id: t.event.id,
        name: t.event.name,
        date: t.event.date.toISOString(),
        artist: t.event.artist,
        venue: t.event.venue,
      },
      section: t.section ?? null,
      row: t.row ?? null,
      seat: t.seat ?? null,
      status: t.status,
    })),
    tracking: tracking.map((tr) => ({
      type: 'tracking' as const,
      id: tr.id,
      date: tr.event.date.toISOString(),
      status: tr.status,
      maxPrice: tr.maxPrice ?? null,
      event: {
        id: tr.event.id,
        name: tr.event.name,
        date: tr.event.date.toISOString(),
        artist: tr.event.artist,
        venue: tr.event.venue,
      },
    })),
    presaleAlerts: presaleAlerts.map((p) => ({
      type: 'presale' as const,
      id: p.id,
      eventId: p.eventId ?? null,
      date: p.presaleStart.toISOString(),
      artistName: p.artistName,
      tourName: p.tourName ?? null,
      venueName: p.venueName,
      venueCity: p.venueCity,
      presaleType: p.presaleType,
      code: p.code ?? null,
      hasAlert: (p.alerts ?? []).length > 0,
    })),
    years,
    stats: {
      totalShows: logs.length,
      upcomingCount: tickets.length,
      trackingCount: tracking.length,
    },
  };
});

// GET /users/me/collection - the viewer's logged history rolled up by artist,
// venue, and city (counts DESC). One query; grouping happens in memory.
app.get('/users/me/collection', async (req) => {
  const userId = requireAccessUserId(req as any);

  const logs = await prisma.userLog.findMany({
    where: { userId },
    select: {
      event: {
        select: {
          date: true,
          artist: { select: { id: true, name: true, imageUrl: true } },
          venue: { select: { id: true, name: true, city: true, lat: true, lng: true } },
        },
      },
    },
  });

  const artistMap = new Map<string, { artist: { id: string; name: string; imageUrl?: string }; count: number; lastSeen: Date }>();
  const venueMap = new Map<string, { venue: { id: string; name: string; city: string; lat?: number; lng?: number }; count: number }>();
  const cityMap = new Map<string, number>();

  for (const l of logs) {
    const { artist, venue, date } = l.event;

    const a = artistMap.get(artist.id);
    if (a) {
      a.count += 1;
      if (date > a.lastSeen) a.lastSeen = date;
    } else {
      artistMap.set(artist.id, {
        artist: { id: artist.id, name: artist.name, imageUrl: artist.imageUrl ?? undefined },
        count: 1,
        lastSeen: date,
      });
    }

    const v = venueMap.get(venue.id);
    if (v) v.count += 1;
    else {
      venueMap.set(venue.id, {
        venue: { id: venue.id, name: venue.name, city: venue.city, lat: venue.lat ?? undefined, lng: venue.lng ?? undefined },
        count: 1,
      });
    }

    cityMap.set(venue.city, (cityMap.get(venue.city) ?? 0) + 1);
  }

  // Degree-1 friend overlays: who else follows each artist (facepile) and the
  // highest friend seen-count per artist.
  const degrees = await getViewerDegrees(userId);
  const friendIds = [...degrees.firstDegree];
  const artistIds = [...artistMap.keys()];
  const [friendFollows, friendLogRows] = await Promise.all([
    friendIds.length && artistIds.length
      ? prisma.userArtistFollow.findMany({
          where: { userId: { in: friendIds }, artistId: { in: artistIds } },
          select: { artistId: true, user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
        })
      : [],
    friendIds.length && artistIds.length
      ? prisma.userLog.findMany({
          where: { userId: { in: friendIds }, event: { artistId: { in: artistIds } } },
          select: {
            userId: true,
            user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
            event: { select: { artistId: true } },
          },
        })
      : [],
  ]);

  const friendsTrackingByArtist = groupFacepiles(friendFollows, (r) => r.artistId, (r) => r.user, degrees.degreeOf, 4);
  const friendSeenByArtist = new Map<string, Map<string, number>>();
  const friendFaceById = new Map<string, FaceUser>();
  for (const row of friendLogRows) {
    const counts = friendSeenByArtist.get(row.event.artistId) ?? new Map<string, number>();
    counts.set(row.userId, (counts.get(row.userId) ?? 0) + 1);
    friendSeenByArtist.set(row.event.artistId, counts);
    if (!friendFaceById.has(row.userId)) friendFaceById.set(row.userId, row.user);
  }

  // ---- Trophies: all derived from the logs already in memory ----

  // First show = earliest event date across the user's logs.
  let firstLog: (typeof logs)[number] | null = null;
  for (const l of logs) {
    if (!firstLog || l.event.date < firstLog.event.date) firstLog = l;
  }

  // Streak: consecutive calendar months with >=1 logged show, counting
  // backwards from the current month (or, if the current month is empty,
  // from the latest logged month). Months are compared as year*12+month.
  const monthIdxSet = new Set<number>();
  for (const l of logs) monthIdxSet.add(l.event.date.getFullYear() * 12 + l.event.date.getMonth());
  let streakMonths = 0;
  if (monthIdxSet.size) {
    const now = new Date();
    const nowIdx = now.getFullYear() * 12 + now.getMonth();
    let idx = monthIdxSet.has(nowIdx) ? nowIdx : Math.max(...monthIdxSet);
    while (monthIdxSet.has(idx)) {
      streakMonths += 1;
      idx -= 1;
    }
  }

  const yearCounts = new Map<number, number>();
  for (const l of logs) {
    const y = l.event.date.getFullYear();
    yearCounts.set(y, (yearCounts.get(y) ?? 0) + 1);
  }

  // Viewer's top artists with the best degree-1 friend count beside each.
  const mostSeenLeaderboard = [...artistMap.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((a) => {
      const friendCounts = friendSeenByArtist.get(a.artist.id);
      let topFriend: { person: FacePerson; count: number } | null = null;
      if (friendCounts) {
        let bestId: string | null = null;
        let best = 0;
        for (const [uid, count] of friendCounts) {
          if (count > best) {
            best = count;
            bestId = uid;
          }
        }
        const face = bestId ? friendFaceById.get(bestId) : undefined;
        if (face) topFriend = { person: toFacePerson(face, 1), count: best };
      }
      return { artist: a.artist, you: a.count, topFriend };
    });

  const trophies = {
    firsts: {
      firstShow: firstLog
        ? {
            artistName: firstLog.event.artist.name,
            venueName: firstLog.event.venue.name,
            date: firstLog.event.date.toISOString(),
          }
        : null,
      // No festival concept in the schema yet — reserved for later.
      firstFestival: null,
      venuesCount: venueMap.size,
      citiesCount: cityMap.size,
    },
    streak: { months: streakMonths },
    years: [...yearCounts.entries()]
      .map(([year, shows]) => ({ year, shows }))
      .sort((a, b) => b.year - a.year),
    mostSeenLeaderboard,
  };

  return {
    trophies,
    artists: [...artistMap.values()]
      .sort((a, b) => b.count - a.count)
      .map((a) => {
        const friendCounts = friendSeenByArtist.get(a.artist.id);
        return {
          artist: a.artist,
          count: a.count,
          lastSeen: a.lastSeen.toISOString(),
          friendsTracking: friendsTrackingByArtist.get(a.artist.id) ?? [],
          topFriendCount: friendCounts ? Math.max(...friendCounts.values()) : null,
        };
      }),
    venues: [...venueMap.values()].sort((a, b) => b.count - a.count),
    cities: [...cityMap.entries()]
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count),
  };
});

app.get('/users/:id/logs', async (req) => {
  const viewerId = getUserIdFromRequest(req);
  const { id: targetUserId } = req.params as { id: string };
  const q = (req.query ?? {}) as { limit?: string; offset?: string; year?: string };
  const limit = Math.max(1, Math.min(50, Number(q.limit ?? 20)));
  const offset = Math.max(0, Number(q.offset ?? 0));
  const year = q.year ? Number(q.year) : undefined;

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { privacySetting: true, showCollection: true },
  });
  if (!target) throw new AppError('User not found', 404);

  // Privacy: showCollection hides the logged-shows list from everyone but the owner.
  if (!(viewerId && viewerId === targetUserId) && !target.showCollection) return [];

  const viewerFollowsTarget = await getFollowStatus(viewerId, targetUserId);
  const visibilityWhere = buildLogVisibilityWhere(viewerId, targetUserId, target.privacySetting, viewerFollowsTarget);

  const dateWhere: Prisma.UserLogWhereInput =
    typeof year === 'number' && Number.isFinite(year)
      ? {
          event: {
            date: {
              gte: new Date(year, 0, 1),
              lt: new Date(year + 1, 0, 1),
            },
          },
        }
      : {};

  const where: Prisma.UserLogWhereInput = {
    userId: targetUserId,
    ...visibilityWhere,
    ...dateWhere,
  };

  const logs = await prisma.userLog.findMany({
    where,
    include: {
      event: { include: { artist: true, venue: true } },
      photos: true,
      _count: { select: { comments: true } },
    },
    orderBy: { event: { date: 'desc' } },
    skip: offset,
    take: limit,
  });

  return logs.map((log) => ({
    id: log.id,
    rating: log.rating ?? undefined,
    note: log.note ?? undefined,
    section: log.section ?? undefined,
    row: log.row ?? undefined,
    seat: log.seat ?? undefined,
    visibility: log.visibility,
    createdAt: log.createdAt.toISOString(),
    event: {
      id: log.event.id,
      name: log.event.name,
      date: log.event.date.toISOString(),
      artist: {
        id: log.event.artist.id,
        name: log.event.artist.name,
        imageUrl: log.event.artist.imageUrl ?? undefined,
      },
      venue: {
        id: log.event.venue.id,
        name: log.event.venue.name,
        city: log.event.venue.city,
        state: log.event.venue.state ?? undefined,
        lat: log.event.venue.lat ?? undefined,
        lng: log.event.venue.lng ?? undefined,
      },
    },
    photos: log.photos.map((p) => ({
      id: p.id,
      photoUrl: p.photoUrl,
      thumbnailUrl: p.photoUrl,
    })),
    _count: log._count ? { comments: log._count.comments } : undefined,
  }));
});

// GET /users/:id/artists — distinct artists from the target's logged shows
// with seen counts, seenCount desc (profile ARTISTS tab). Gated by
// showCollection exactly like /users/:id/logs, and per-log visibility
// still applies so hidden logs never leak an artist.
app.get('/users/:id/artists', async (req) => {
  const viewerId = getUserIdFromRequest(req);
  const { id: targetUserId } = req.params as { id: string };

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { privacySetting: true, showCollection: true },
  });
  if (!target) throw new AppError('User not found', 404);

  // Privacy: showCollection hides the collection from everyone but the owner.
  if (!(viewerId && viewerId === targetUserId) && !target.showCollection) return [];

  const viewerFollowsTarget = await getFollowStatus(viewerId, targetUserId);
  const visibilityWhere = buildLogVisibilityWhere(viewerId, targetUserId, target.privacySetting, viewerFollowsTarget);

  const logs = await prisma.userLog.findMany({
    where: { userId: targetUserId, ...visibilityWhere },
    select: { event: { select: { artist: { select: { id: true, name: true, imageUrl: true } } } } },
  });

  const byArtist = new Map<string, { id: string; name: string; imageUrl?: string; seenCount: number }>();
  for (const log of logs) {
    const artist = log.event.artist;
    const row = byArtist.get(artist.id) ?? {
      id: artist.id,
      name: artist.name,
      imageUrl: artist.imageUrl ?? undefined,
      seenCount: 0,
    };
    row.seenCount += 1;
    byArtist.set(artist.id, row);
  }

  return [...byArtist.values()].sort(
    (a, b) => b.seenCount - a.seenCount || a.name.localeCompare(b.name)
  );
});

// GET /users/:id/timeline - aggregated timeline: upcoming (tickets +
// interested/tracked events, owner-only since that's private intent data)
// plus month-bucketed past/logged shows, cursor-paginated on event date.
app.get('/users/:id/timeline', async (req) => {
  const viewerId = getUserIdFromRequest(req);
  const { id: targetUserId } = req.params as { id: string };
  const q = (req.query ?? {}) as { cursor?: string; limit?: string };
  const limit = Math.max(1, Math.min(50, Number(q.limit ?? 30)));
  const cursor = typeof q.cursor === 'string' ? q.cursor : undefined;

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, privacySetting: true, showTimeline: true },
  });
  if (!target) throw new AppError('User not found', 404);

  const isOwner = Boolean(viewerId && viewerId === targetUserId);

  // Privacy: showTimeline hides the timeline from everyone but the owner.
  if (!isOwner && !target.showTimeline) return { upcoming: [], months: [], nextCursor: null };
  // Mirrors /feed + buildLogVisibilityWhere: "friends" = viewer follows the
  // owner (one-directional), not mutual follows.
  const viewerFollowsTarget = await getFollowStatus(viewerId, targetUserId);
  const visibilityWhere = buildLogVisibilityWhere(viewerId, targetUserId, target.privacySetting, viewerFollowsTarget);

  const cursorWhere: Prisma.UserLogWhereInput = {};
  if (cursor) {
    const d = new Date(cursor);
    if (!Number.isNaN(d.getTime())) cursorWhere.event = { date: { lt: d } };
  }

  // The timeline is "shows this user was part of": their own logs plus any
  // log they've ACCEPTED co-authorship on (joint memories land here too).
  // Per-log visibility still applies to the log's own `visibility` column.
  const where: Prisma.UserLogWhereInput = {
    AND: [
      {
        OR: [
          { userId: targetUserId },
          { coAuthors: { some: { userId: targetUserId, status: 'ACCEPTED' } } },
        ],
      },
      visibilityWhere,
      cursorWhere,
    ],
  };

  const logs = await prisma.userLog.findMany({
    where,
    include: {
      user: { select: { id: true, username: true } },
      event: {
        include: {
          artist: { select: { id: true, name: true, imageUrl: true } },
          venue: { select: { id: true, name: true, city: true } },
          // Tours usually carry the ad photo — used in the fallback image chain.
          tour: { select: { imageUrl: true } },
        },
      },
      photos: {
        where: { visibility: 'PUBLIC', isFlagged: false },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, photoUrl: true, thumbUrl: true, mediaKind: true, duration: true },
      },
      _count: { select: { likes: true, comments: true } },
    },
    orderBy: { event: { date: 'desc' } },
    take: limit + 1,
  });

  const hasMore = logs.length > limit;
  const slice = logs.slice(0, limit);

  const logIds = slice.map((l) => l.id);
  const coAuthorRows = logIds.length
    ? await prisma.logCoAuthor.findMany({
        where: { logId: { in: logIds }, status: 'ACCEPTED' },
        include: { user: { select: { id: true, username: true, avatarUrl: true } } },
      })
    : [];
  const coAuthorsByLog = new Map<string, { id: string; username: string; avatarUrl?: string }[]>();
  for (const c of coAuthorRows) {
    const list = coAuthorsByLog.get(c.logId) ?? [];
    list.push({ id: c.user.id, username: c.user.username, avatarUrl: c.user.avatarUrl ?? undefined });
    coAuthorsByLog.set(c.logId, list);
  }

  const monthsMap = new Map<
    string,
    Array<{
      logId: string;
      score: number | null;
      sharedAt: string | null;
      visibility: 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
      note?: string;
      // Best available cover art when the entry has no photos of its own:
      // event image, else the tour's ad photo, else the artist image.
      fallbackImageUrl: string | null;
      event: { id: string; name: string; date: string };
      artist: { id: string; name: string; imageUrl?: string };
      venue: { id: string; name: string; city: string };
      photos: { id: string; photoUrl: string; thumbnailUrl: string; mediaKind: string; duration?: number; thumbUrl?: string }[];
      coAuthors: { id: string; username: string; avatarUrl?: string }[];
      // Set only when this entry is a co-authored log owned by someone else —
      // identifies the original author so the client can badge it "with @owner".
      coAuthorOf?: { id: string; username: string };
      likeCount: number;
      commentCount: number;
    }>
  >();

  for (const log of slice) {
    // Unshared (log-only) entries are visible to non-owners as compact
    // markers only — no photos/caption — as long as visibility permits;
    // the owner always sees everything.
    const canSeeFull = isOwner || log.sharedAt !== null;
    const key = monthKey(log.event.date);
    // A co-authored entry surfaced on this timeline is authored by someone else.
    const isOwnLog = log.userId === targetUserId;

    const entry = {
      logId: log.id,
      score: log.score ?? null,
      sharedAt: log.sharedAt ? log.sharedAt.toISOString() : null,
      visibility: log.visibility,
      note: canSeeFull ? (log.note ?? undefined) : undefined,
      fallbackImageUrl: log.event.imageUrl ?? log.event.tour?.imageUrl ?? log.event.artist.imageUrl ?? null,
      event: {
        id: log.event.id,
        name: log.event.name,
        date: log.event.date.toISOString(),
      },
      artist: {
        id: log.event.artist.id,
        name: log.event.artist.name,
        imageUrl: log.event.artist.imageUrl ?? undefined,
      },
      venue: {
        id: log.event.venue.id,
        name: log.event.venue.name,
        city: log.event.venue.city,
      },
      photos: canSeeFull
        ? log.photos.map((p) => ({
            id: p.id,
            photoUrl: p.photoUrl,
            thumbnailUrl: p.thumbUrl ?? p.photoUrl,
            mediaKind: p.mediaKind,
            duration: p.duration ?? undefined,
            thumbUrl: p.thumbUrl ?? undefined,
          }))
        : [],
      coAuthors: coAuthorsByLog.get(log.id) ?? [],
      coAuthorOf: isOwnLog ? undefined : { id: log.user.id, username: log.user.username },
      likeCount: log._count.likes,
      commentCount: log._count.comments,
    };

    if (!monthsMap.has(key)) monthsMap.set(key, []);
    monthsMap.get(key)!.push(entry);
  }

  const months = Array.from(monthsMap.entries()).map(([key, entries]) => ({ key, entries }));

  // Upcoming section: tickets/interested/tracked events are private-intent
  // data — only the owner sees those. Parties the owner HOSTS are the
  // exception: they surface for other viewers too (PUBLIC always; INVITE only
  // when the viewer is a member, mirroring GET /events/:id/parties) so plans
  // are joinable from a friend's timeline.
  let upcoming: Array<Record<string, unknown>> = [];
  {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const eventSelect = {
      include: {
        artist: { select: { id: true, name: true, imageUrl: true } },
        venue: { select: { id: true, name: true, city: true } },
        tour: { select: { imageUrl: true } },
      },
    } as const;

    const toEventSummary = (e: {
      id: string;
      name: string;
      date: Date;
      imageUrl: string | null;
      tour: { imageUrl: string | null } | null;
      artist: any;
      venue: any;
    }) => ({
      id: e.id,
      name: e.name,
      date: e.date.toISOString(),
      // Fallback-resolved cover art: event image, else tour ad photo, else artist image.
      imageUrl: e.imageUrl ?? e.tour?.imageUrl ?? e.artist.imageUrl ?? undefined,
      artist: { id: e.artist.id, name: e.artist.name, imageUrl: e.artist.imageUrl ?? undefined },
      venue: { id: e.venue.id, name: e.venue.name, city: e.venue.city },
    });

    const hostedParties = await prisma.party.findMany({
      where: {
        hostId: targetUserId,
        // Cancelled parties don't power plan chips.
        status: 'ACTIVE',
        event: { date: { gte: startOfToday } },
        ...(isOwner
          ? {}
          : {
              OR: [
                { visibility: 'PUBLIC' as const },
                ...(viewerId ? [{ members: { some: { userId: viewerId } } }] : []),
              ],
            }),
      },
      include: { event: eventSelect },
      orderBy: [{ startsAt: { sort: 'asc' as const, nulls: 'last' as const } }, { createdAt: 'desc' as const }],
    });

    const hostedPartyIds = hostedParties.map((p) => p.id);
    const [partyCounts, viewerPartyMemberships] = await Promise.all([
      getPartyCounts(hostedPartyIds),
      viewerId && !isOwner && hostedPartyIds.length
        ? prisma.partyMember.findMany({
            where: { userId: viewerId, partyId: { in: hostedPartyIds } },
            select: { partyId: true, status: true },
          })
        : ([] as { partyId: string; status: string }[]),
    ]);
    const viewerStatusByParty = new Map(viewerPartyMemberships.map((m) => [m.partyId, m.status]));

    const toPartyChip = (p: (typeof hostedParties)[number]) => {
      const raw = isOwner ? 'HOST' : (viewerStatusByParty.get(p.id) ?? null);
      // DECLINED intentionally maps to null (re-requestable via /join);
      // COHOST reads as HOST on the chip (both mean "you're running it").
      const myStatus =
        raw === 'HOST' || raw === 'COHOST'
          ? ('HOST' as const)
          : raw === 'GOING' || raw === 'REQUESTED' || raw === 'INVITED'
            ? raw
            : null;
      return {
        id: p.id,
        title: p.title,
        visibility: p.visibility,
        goingCount: partyCounts.get(p.id)!.going,
        myStatus,
      };
    };

    // One party chip per event (soonest startsAt wins when the owner hosts
    // several on the same event).
    const partyByEvent = new Map<string, (typeof hostedParties)[number]>();
    for (const p of hostedParties) if (!partyByEvent.has(p.eventId)) partyByEvent.set(p.eventId, p);

    if (isOwner) {
      const [tickets, interested, tracking] = await Promise.all([
        prisma.userTicket.findMany({
          where: { userId: targetUserId, event: { date: { gte: startOfToday } } },
          include: { event: eventSelect },
          orderBy: { event: { date: 'asc' } },
        }),
        prisma.userInterested.findMany({
          where: { userId: targetUserId, event: { date: { gte: startOfToday } } },
          include: { event: eventSelect },
          orderBy: { event: { date: 'asc' } },
        }),
        prisma.userEventTracking.findMany({
          where: { userId: targetUserId, event: { date: { gte: startOfToday } } },
          include: { event: eventSelect },
          orderBy: { event: { date: 'asc' } },
        }),
      ]);

      const chipFor = (eventId: string) => {
        const p = partyByEvent.get(eventId);
        return p ? toPartyChip(p) : undefined;
      };

      // Hosted parties on events with no ticket/interest/tracking row are
      // still plans — they get standalone 'party' entries below.
      const coveredEventIds = new Set<string>([
        ...tickets.map((t) => t.eventId),
        ...interested.map((i) => i.eventId),
        ...tracking.map((tr) => tr.eventId),
      ]);
      const standaloneParties = [...partyByEvent.values()].filter((p) => !coveredEventIds.has(p.eventId));

      upcoming = [
        ...tickets.map((t) => ({
          type: 'ticket' as const,
          id: t.id,
          date: t.event.date.toISOString(),
          event: toEventSummary(t.event),
          section: t.section ?? undefined,
          row: t.row ?? undefined,
          seat: t.seat ?? undefined,
          status: t.status,
          party: chipFor(t.eventId),
        })),
        ...interested.map((i) => ({
          type: 'interested' as const,
          id: i.id,
          date: i.event.date.toISOString(),
          event: toEventSummary(i.event),
          notifyOnSale: i.notifyOnSale,
          party: chipFor(i.eventId),
        })),
        ...tracking.map((tr) => ({
          type: 'tracking' as const,
          id: tr.id,
          date: tr.event.date.toISOString(),
          event: toEventSummary(tr.event),
          status: tr.status,
          maxPrice: tr.maxPrice ?? undefined,
          party: chipFor(tr.eventId),
        })),
        ...standaloneParties.map((p) => ({
          type: 'party' as const,
          id: p.id,
          date: p.event.date.toISOString(),
          event: toEventSummary(p.event),
          party: toPartyChip(p),
        })),
      ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } else {
      upcoming = [...partyByEvent.values()]
        .map((p) => ({
          type: 'party' as const,
          id: p.id,
          date: p.event.date.toISOString(),
          event: toEventSummary(p.event),
          party: toPartyChip(p),
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
  }

  const nextCursor = hasMore && slice.length ? slice[slice.length - 1]!.event.date.toISOString() : null;

  return { upcoming, months, nextCursor };
});

app.get('/users/:id/venues', async (req) => {
  const viewerId = getUserIdFromRequest(req);
  const { id: targetUserId } = req.params as { id: string };

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { privacySetting: true, showMapCities: true, showTimeline: true },
  });
  if (!target) throw new AppError('User not found', 404);

  // Privacy: the map is derived from the same shows as the timeline — so it's
  // visible whenever EITHER the map dial or the timeline is public. (A public
  // timeline with a "private" map read as inconsistent.)
  const isOwner = !!viewerId && viewerId === targetUserId;
  if (!isOwner && !target.showMapCities && !target.showTimeline) return [];

  const viewerFollowsTarget = await getFollowStatus(viewerId, targetUserId);
  const visibilityWhere = buildLogVisibilityWhere(viewerId, targetUserId, target.privacySetting, viewerFollowsTarget);

  const where: Prisma.UserLogWhereInput = {
    userId: targetUserId,
    ...visibilityWhere,
    event: { venue: { lat: { not: null }, lng: { not: null } } },
  };

  const logs = await prisma.userLog.findMany({
    where,
    include: {
      event: { include: { venue: true, artist: true } },
    },
    orderBy: { event: { date: 'desc' } },
  });

  // Group by venue
  const venueMap = new Map<string, any>();

  for (const log of logs) {
    const venue = log.event.venue;
    if (venue.lat == null || venue.lng == null) continue;

    if (!venueMap.has(venue.id)) {
      venueMap.set(venue.id, {
        id: venue.id,
        name: venue.name,
        city: venue.city,
        lat: venue.lat,
        lng: venue.lng,
        showCount: 0,
        lastShow: null,
      });
    }

    const existing = venueMap.get(venue.id);
    existing.showCount += 1;

    if (!existing.lastShow) {
      existing.lastShow = {
        artistName: log.event.artist.name,
        date: log.event.date.toISOString(),
      };
    }
  }

  return Array.from(venueMap.values());
});

type FriendPreview = { id: string; username: string; avatarUrl?: string | null };

function eventToPayload(event: {
  id: string;
  name: string;
  date: Date;
  imageUrl: string | null;
  ticketUrl?: string | null;
  artist: { id: string; name: string; spotifyId: string | null; imageUrl: string | null; genres: string[] };
  venue: { id: string; name: string; city: string; state: string | null; country: string; lat: number | null; lng: number | null };
}) {
  return {
    id: event.id,
    name: event.name,
    date: event.date.toISOString(),
    imageUrl: event.imageUrl ?? undefined,
    ticketUrl: event.ticketUrl ?? undefined,
    artist: {
      id: event.artist.id,
      name: event.artist.name,
      spotifyId: event.artist.spotifyId ?? undefined,
      imageUrl: event.artist.imageUrl ?? undefined,
      genres: event.artist.genres?.length ? event.artist.genres : undefined,
    },
    venue: {
      id: event.venue.id,
      name: event.venue.name,
      city: event.venue.city,
      state: event.venue.state ?? undefined,
      country: event.venue.country,
      lat: event.venue.lat ?? undefined,
      lng: event.venue.lng ?? undefined,
    },
  };
}

type ApiEventPayload = Omit<ReturnType<typeof eventToPayload>, 'ticketUrl'> & {
  // Mock/discovery payloads may omit ticketUrl; real events carry it.
  ticketUrl?: string;
  isInterested?: boolean;
  friendsGoing?: FriendPreview[];
  friendsGoingCount?: number;
  totalInterested?: number;
};

function isDbUnavailable(error: unknown): boolean {
  const e = error as {
    code?: string;
    name?: string;
    message?: string;
    meta?: {
      driverAdapterError?: {
        cause?: { originalCode?: string; originalMessage?: string };
      };
    };
    cause?: { originalCode?: string; originalMessage?: string };
  };

  // Non-DB errors shouldn't trigger mock fallbacks.
  const isPrisma = typeof e?.name === 'string' && e.name.startsWith('Prisma');

  // Network / connection refused can come from either Prisma or lower-level clients.
  if (e?.code === 'ECONNREFUSED') return true;

  // In production we prefer surfacing DB misconfiguration as a hard failure.
  const isDev = process.env.NODE_ENV !== 'production';
  if (!isDev) return false;

  // Prisma error codes that indicate "can't reach DB / can't auth / DB not ready".
  // Docs: https://www.prisma.io/docs/orm/reference/error-reference
  const prismaUnavailableCodes = new Set([
    'P1000', // authentication failed
    'P1001', // can't reach database server
    'P1002', // database server timeout
    'P1003', // database does not exist
    'P1008', // operations timed out
    'P1010', // access denied / role missing
    'P1011', // TLS connection error
    'P1017', // server has closed the connection
  ]);

  if (isPrisma && typeof e?.code === 'string' && prismaUnavailableCodes.has(e.code)) return true;

  // Some Prisma adapters wrap the underlying Postgres error code/message in meta/cause.
  const originalCode =
    e?.meta?.driverAdapterError?.cause?.originalCode ?? e?.cause?.originalCode ?? undefined;
  const originalMessage =
    e?.meta?.driverAdapterError?.cause?.originalMessage ?? e?.cause?.originalMessage ?? e?.message ?? undefined;

  if (typeof originalCode === 'string') {
    // Postgres error classes: 28xxx = invalid auth, 08xxx = connection exception, 3D000 = invalid catalog name (db missing)
    if (originalCode.startsWith('28') || originalCode.startsWith('08') || originalCode === '3D000') return true;
  }

  if (typeof originalMessage === 'string') {
    if (
      /role\s+".*"\s+does\s+not\s+exist/i.test(originalMessage) ||
      /password\s+authentication\s+failed/i.test(originalMessage) ||
      /database\s+".*"\s+does\s+not\s+exist/i.test(originalMessage)
    ) {
      return true;
    }
  }

  return false;
}

function mockDiscovery(city: string): { comingUp: ApiEventPayload[]; friendsGoing: ApiEventPayload[]; popular: ApiEventPayload[] } {
  const mk = (n: number, overrides: Partial<ApiEventPayload>): ApiEventPayload => {
    const base: ApiEventPayload = {
      id: `mock-${n}`,
      name: `Mock Event ${n}`,
      date: new Date(Date.now() + n * 86400000).toISOString(),
      imageUrl: undefined,
      artist: {
        id: `mock-artist-${n}`,
        name: `Artist ${n}`,
        spotifyId: undefined,
        imageUrl: `https://images.unsplash.com/photo-1575426220089-9e2ef7b0c9f4?auto=format&fit=crop&w=800&q=80`,
        genres: ['pop'],
      },
      venue: {
        id: `mock-venue-${n}`,
        name: `Venue ${n}`,
        city,
        state: undefined,
        country: 'US',
        lat: undefined,
        lng: undefined,
      },
    };
    return { ...base, ...overrides };
  };

  const comingUp: ApiEventPayload[] = [
    mk(1, {
      name: 'The Weeknd at Madison Square Garden',
      artist: { id: 'a-1', name: 'The Weeknd', spotifyId: undefined, imageUrl: 'https://images.unsplash.com/photo-1575426220089-9e2ef7b0c9f4?auto=format&fit=crop&w=800&q=80', genres: undefined },
      venue: { id: 'v-1', name: 'Madison Square Garden', city, state: undefined, country: 'US', lat: undefined, lng: undefined },
      date: new Date(Date.now() + 9 * 86400000).toISOString(),
    }),
    mk(2, {
      name: 'Billie Eilish at Barclays Center',
      artist: { id: 'a-2', name: 'Billie Eilish', spotifyId: undefined, imageUrl: 'https://images.unsplash.com/photo-1693835777292-cf103dcd2324?auto=format&fit=crop&w=800&q=80', genres: undefined },
      venue: { id: 'v-2', name: 'Barclays Center', city, state: undefined, country: 'US', lat: undefined, lng: undefined },
      date: new Date(Date.now() + 11 * 86400000).toISOString(),
    }),
    mk(3, {
      name: 'Calvin Harris at Brooklyn Mirage',
      artist: { id: 'a-3', name: 'Calvin Harris', spotifyId: undefined, imageUrl: 'https://images.unsplash.com/photo-1692176548571-86138128e36c?auto=format&fit=crop&w=800&q=80', genres: undefined },
      venue: { id: 'v-3', name: 'Brooklyn Mirage', city, state: undefined, country: 'US', lat: undefined, lng: undefined },
      date: new Date(Date.now() + 14 * 86400000).toISOString(),
    }),
  ];

  const friendsGoing: ApiEventPayload[] = [
    mk(4, {
      name: 'Arctic Monkeys at Forest Hills Stadium',
      artist: { id: 'a-4', name: 'Arctic Monkeys', spotifyId: undefined, imageUrl: 'https://images.unsplash.com/photo-1710951403275-37bf930936bc?auto=format&fit=crop&w=800&q=80', genres: undefined },
      venue: { id: 'v-4', name: 'Forest Hills Stadium', city, state: undefined, country: 'US', lat: undefined, lng: undefined },
      date: new Date(Date.now() + 17 * 86400000).toISOString(),
      friendsGoing: [
        { id: 'u-1', username: 'mia', avatarUrl: 'https://i.pravatar.cc/150?img=1' },
        { id: 'u-2', username: 'alex', avatarUrl: 'https://i.pravatar.cc/150?img=2' },
        { id: 'u-3', username: 'sam', avatarUrl: 'https://i.pravatar.cc/150?img=3' },
      ],
      friendsGoingCount: 3,
    }),
    mk(5, {
      name: 'Tame Impala at Terminal 5',
      artist: { id: 'a-5', name: 'Tame Impala', spotifyId: undefined, imageUrl: 'https://images.unsplash.com/photo-1759899520572-5cc5159c13e3?auto=format&fit=crop&w=800&q=80', genres: undefined },
      venue: { id: 'v-5', name: 'Terminal 5', city, state: undefined, country: 'US', lat: undefined, lng: undefined },
      date: new Date(Date.now() + 20 * 86400000).toISOString(),
      friendsGoing: [
        { id: 'u-4', username: 'chris', avatarUrl: 'https://i.pravatar.cc/150?img=4' },
        { id: 'u-5', username: 'jules', avatarUrl: 'https://i.pravatar.cc/150?img=5' },
      ],
      friendsGoingCount: 2,
    }),
  ];

  const popular: ApiEventPayload[] = [
    mk(6, {
      name: 'Travis Scott at Citi Field',
      artist: { id: 'a-6', name: 'Travis Scott', spotifyId: undefined, imageUrl: 'https://images.unsplash.com/photo-1647220419119-316822d9d053?auto=format&fit=crop&w=400&q=80', genres: undefined },
      venue: { id: 'v-6', name: 'Citi Field', city, state: undefined, country: 'US', lat: undefined, lng: undefined },
      date: new Date(Date.now() + 24 * 86400000).toISOString(),
      totalInterested: 128,
    }),
    mk(7, {
      name: 'SZA at Radio City Music Hall',
      artist: { id: 'a-7', name: 'SZA', spotifyId: undefined, imageUrl: 'https://images.unsplash.com/photo-1693835777292-cf103dcd2324?auto=format&fit=crop&w=400&q=80', genres: undefined },
      venue: { id: 'v-7', name: 'Radio City Music Hall', city, state: undefined, country: 'US', lat: undefined, lng: undefined },
      date: new Date(Date.now() + 27 * 86400000).toISOString(),
      totalInterested: 94,
    }),
    mk(8, {
      name: 'Bad Bunny at MetLife Stadium',
      artist: { id: 'a-8', name: 'Bad Bunny', spotifyId: undefined, imageUrl: 'https://images.unsplash.com/photo-1575426220089-9e2ef7b0c9f4?auto=format&fit=crop&w=400&q=80', genres: undefined },
      venue: { id: 'v-8', name: 'MetLife Stadium', city, state: undefined, country: 'US', lat: undefined, lng: undefined },
      date: new Date(Date.now() + 31 * 86400000).toISOString(),
      totalInterested: 203,
    }),
  ];

  return { comingUp, friendsGoing, popular };
}

function mockEventById(city: string, id: string): ApiEventPayload | null {
  const mock = mockDiscovery(city);
  return [...mock.comingUp, ...mock.friendsGoing, ...mock.popular].find((e) => e.id === id) ?? null;
}

// Persist the presale/on-sale windows a Ticketmaster event carries as compliant
// source:'ticketmaster' Presale rows, linked directly to the event. TM does not
// expose presale codes, so `code` is always null (never fabricated). Best-effort:
// a failed presale write never breaks the discover/browse path it runs inside.
async function upsertTmPresales(opts: {
  eventId: string;
  artistName: string;
  venueName: string;
  venueCity: string;
  venueState: string | null;
  eventDate: Date;
  eventUrl: string | null;
  sales?: {
    publicOnsale: string | null;
    presales: Array<{ name: string; start: string | null; end: string | null; url: string | null }>;
  };
}): Promise<void> {
  const windows = opts.sales?.presales ?? [];
  if (windows.length === 0) return;

  const onsaleRaw = opts.sales?.publicOnsale ? new Date(opts.sales.publicOnsale) : null;
  const onsaleStart = onsaleRaw && !Number.isNaN(onsaleRaw.getTime()) ? onsaleRaw : null;

  for (const w of windows) {
    const start = w.start ? new Date(w.start) : null;
    if (!start || Number.isNaN(start.getTime())) continue; // presaleStart is required
    const endRaw = w.end ? new Date(w.end) : null;
    const presaleEnd = endRaw && !Number.isNaN(endRaw.getTime()) ? endRaw : null;
    const presaleType = (w.name || 'Presale').slice(0, 180);
    const ticketUrl = w.url || opts.eventUrl || null;

    try {
      await prisma.presale.upsert({
        where: {
          artistName_venueName_eventDate_presaleType: {
            artistName: opts.artistName,
            venueName: opts.venueName,
            eventDate: opts.eventDate,
            presaleType,
          },
        },
        create: {
          artistName: opts.artistName,
          tourName: null,
          venueName: opts.venueName,
          venueCity: opts.venueCity,
          venueState: opts.venueState,
          eventDate: opts.eventDate,
          presaleType,
          presaleStart: start,
          presaleEnd,
          onsaleStart,
          code: null, // TM never provides presale codes
          signupUrl: null,
          signupDeadline: null,
          ticketUrl,
          source: 'ticketmaster',
          eventId: opts.eventId,
        },
        update: {
          presaleStart: start,
          presaleEnd,
          onsaleStart,
          ticketUrl,
          source: 'ticketmaster',
          eventId: opts.eventId,
        },
      });
    } catch (err) {
      console.warn('[upsertTmPresales] failed for', opts.artistName, presaleType, err);
    }
  }
}

async function buildDiscoverData(userId: string | null, city: string) {
  const now = new Date();

  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        include: {
          artistFollows: { include: { artist: true } },
          following: { select: { followingId: true } },
        },
      })
    : null;

  let artistNames = user?.artistFollows.map((f) => f.artist.name) ?? [];

  // COLD START: If user has no followed artists, use popular defaults
  if (artistNames.length === 0) {
    artistNames = [
      'Taylor Swift',
      'Drake', 
      'Bad Bunny',
      'The Weeknd',
      'Morgan Wallen',
      'Billie Eilish',
      'Travis Scott',
      'Beyoncé',
      'Ed Sheeran',
      'Dua Lipa',
    ];
    console.log('[buildDiscoverData] Cold start: using default artists');
  }

  // Try Ticketmaster first, then Bandsintown as fallback
  let tmEvents = await tmSearchByArtists(artistNames, 30);
  if (tmEvents.length === 0 && city) {
    tmEvents = await tmSearchEvents({ city, size: 30 });
  }

  let upsertedEvents: any[] = [];

  if (tmEvents.length > 0) {
    console.log(`[buildDiscoverData] Ticketmaster returned ${tmEvents.length} events`);
    upsertedEvents = await Promise.all(
      tmEvents.map(async (te) => {
        const artist =
          (await prisma.artist.findFirst({ where: { name: te.artist.name } })) ??
          (await prisma.artist.create({
            data: {
              name: te.artist.name,
              imageUrl: te.artist.imageUrl,
              genres: te.artist.genres,
            },
          }));

        if (te.artist.imageUrl && !artist.imageUrl) {
          await prisma.artist.update({ where: { id: artist.id }, data: { imageUrl: te.artist.imageUrl } });
        }

        const venue =
          (await prisma.venue.findFirst({
            where: { name: te.venue.name, city: te.venue.city },
          })) ??
          (await prisma.venue.create({
            data: {
              name: te.venue.name,
              city: te.venue.city,
              state: te.venue.region || null,
              country: te.venue.country,
              lat: Number.isFinite(Number(te.venue.latitude)) ? Number(te.venue.latitude) : null,
              lng: Number.isFinite(Number(te.venue.longitude)) ? Number(te.venue.longitude) : null,
            },
          }));

        const date = new Date(te.datetime);

        const ev = await prisma.event.upsert({
          where: {
            artistId_venueId_date: {
              artistId: artist.id,
              venueId: venue.id,
              date,
            },
          },
          update: {
            name: te.name,
            source: 'ticketmaster',
            externalId: te.externalId,
            imageUrl: te.imageUrl,
            ticketUrl: te.url ?? null,
          },
          create: {
            name: te.name,
            date,
            artistId: artist.id,
            venueId: venue.id,
            source: 'ticketmaster',
            externalId: te.externalId,
            imageUrl: te.imageUrl,
            ticketUrl: te.url ?? null,
          },
          include: { artist: true, venue: true },
        });

        await upsertTmPresales({
          eventId: ev.id,
          artistName: te.artist.name,
          venueName: te.venue.name,
          venueCity: te.venue.city,
          venueState: te.venue.region || null,
          eventDate: date,
          eventUrl: te.url ?? null,
          sales: te.sales,
        });

        return ev;
      })
    );
  } else {
    // Fallback to Bandsintown
    const bandsintownEvents = artistNames.length ? await getEventsForMultipleArtists(artistNames, 30) : [];
    if (bandsintownEvents.length > 0) {
      console.log(`[buildDiscoverData] Bandsintown returned ${bandsintownEvents.length} events`);
      upsertedEvents = await Promise.all(
        bandsintownEvents.map(async (be) => {
          const headliner = be.lineup?.[0] || be.title || 'Unknown Artist';

          const artist =
            (await prisma.artist.findFirst({ where: { name: headliner } })) ??
            (await prisma.artist.create({
              data: { name: headliner, genres: [] },
            }));

          const venue =
            (await prisma.venue.findFirst({
              where: { name: be.venue.name, city: be.venue.city },
            })) ??
            (await prisma.venue.create({
              data: {
                name: be.venue.name,
                city: be.venue.city,
                state: be.venue.region || null,
                country: be.venue.country,
                lat: Number.isFinite(Number(be.venue.latitude)) ? Number(be.venue.latitude) : null,
                lng: Number.isFinite(Number(be.venue.longitude)) ? Number(be.venue.longitude) : null,
              },
            }));

          const date = new Date(be.datetime);

          return await prisma.event.upsert({
            where: {
              artistId_venueId_date: {
                artistId: artist.id,
                venueId: venue.id,
                date,
              },
            },
            update: {
              name: be.title || `${artist.name} at ${venue.name}`,
              source: 'bandsintown',
              externalId: be.id,
              ticketUrl: be.url ?? null,
            },
            create: {
              name: be.title || `${artist.name} at ${venue.name}`,
              date,
              artistId: artist.id,
              venueId: venue.id,
              source: 'bandsintown',
              externalId: be.id,
              ticketUrl: be.url ?? null,
            },
            include: { artist: true, venue: true },
          });
        })
      );
    } else {
      console.warn('[buildDiscoverData] Both Ticketmaster and Bandsintown returned 0 events');
    }
  }

  let events = upsertedEvents
    .filter((e) => e.date > now)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  // Fallback: if Bandsintown returned nothing, check DB for any upcoming events
  if (events.length === 0) {
    const dbEvents = await prisma.event.findMany({
      where: { date: { gte: now } },
      include: { artist: true, venue: true },
      orderBy: { date: 'asc' },
      take: 30,
    });
    if (dbEvents.length > 0) {
      console.log(`[buildDiscoverData] Using ${dbEvents.length} events from DB fallback`);
      events = dbEvents;
    }
  }

  // If still empty (fresh DB + Bandsintown blocked), return mock data directly
  if (events.length === 0) {
    console.log('[buildDiscoverData] No events found — returning mock data');
    return mockDiscovery(city);
  }

  const interestedIds = new Set<string>();
  if (userId && events.length) {
    const interested = await prisma.userInterested.findMany({
      where: { userId, eventId: { in: events.map((e) => e.id) } },
      select: { eventId: true },
    });
    for (const row of interested) interestedIds.add(row.eventId);
  }

  const friendsByEvent: Record<string, FriendPreview[]> = {};
  if (user && events.length) {
    const friendIds = user.following.map((f) => f.followingId);
    if (friendIds.length) {
      const friendsInterested = await prisma.userInterested.findMany({
        where: { userId: { in: friendIds }, eventId: { in: events.map((e) => e.id) } },
        include: { user: { select: { id: true, username: true, avatarUrl: true } } },
      });
      for (const fi of friendsInterested) {
        const arr = (friendsByEvent[fi.eventId] ??= []);
        arr.push({ id: fi.user.id, username: fi.user.username, avatarUrl: fi.user.avatarUrl });
      }
    }
  }

  const comingUp = events.slice(0, 20).map((e) => ({
    ...eventToPayload(e),
    isInterested: interestedIds.has(e.id) || undefined,
    friendsGoing: friendsByEvent[e.id]?.length ? friendsByEvent[e.id] : undefined,
    friendsGoingCount: friendsByEvent[e.id]?.length || undefined,
  }));

  const friendsGoing = events
    .filter((e) => (friendsByEvent[e.id]?.length || 0) > 0)
    .sort((a, b) => (friendsByEvent[b.id]?.length || 0) - (friendsByEvent[a.id]?.length || 0))
    .slice(0, 20)
    .map((e) => ({
      ...eventToPayload(e),
      isInterested: interestedIds.has(e.id) || undefined,
      friendsGoing: friendsByEvent[e.id] ?? undefined,
      friendsGoingCount: friendsByEvent[e.id]?.length || undefined,
    }));

  const popularBase = await prisma.event.findMany({
    where: { venue: { city }, date: { gte: now } },
    include: { artist: true, venue: true, _count: { select: { interested: true } } },
    orderBy: { interested: { _count: 'desc' } },
    take: 10,
  });

  const popularInterestedIds = new Set<string>();
  if (userId && popularBase.length) {
    const rows = await prisma.userInterested.findMany({
      where: { userId, eventId: { in: popularBase.map((e) => e.id) } },
      select: { eventId: true },
    });
    for (const row of rows) popularInterestedIds.add(row.eventId);
  }

  const popular = popularBase.map((e) => ({
    ...eventToPayload(e),
    isInterested: popularInterestedIds.has(e.id) || undefined,
    totalInterested: e._count.interested,
  }));

  return { comingUp, friendsGoing, popular };
}

app.get('/discover', async (req, reply) => {
  try {
    const query = (req.query ?? {}) as { city?: string };
    const city = query.city || 'New York';
    const userId = getUserIdFromRequest(req);

    const data = await buildDiscoverData(userId, city);
    return data;
  } catch (error) {
    if (isDbUnavailable(error)) {
      req.log.warn({ error }, 'DB unavailable; returning mock discovery feed');
      return mockDiscovery(((req.query ?? {}) as { city?: string }).city || 'New York');
    }
    req.log.error({ error }, 'Discovery error');
    reply.status(500);
    return { error: 'Failed to load discovery feed' };
  }
});

app.get('/discover/coming-up', async (req, reply) => {
  try {
    const query = (req.query ?? {}) as { limit?: string };
    const limit = Math.max(1, Math.min(50, Number(query.limit ?? 20)));
    const userId = getUserIdFromRequest(req);

    if (!userId) return [];

    const city = ((req.query ?? {}) as { city?: string }).city || 'New York';
    const data = await buildDiscoverData(userId, city);
    return data.comingUp.slice(0, limit);
  } catch (error) {
    if (isDbUnavailable(error)) {
      const city = ((req.query ?? {}) as { city?: string }).city || 'New York';
      req.log.warn({ error }, 'DB unavailable; returning mock coming-up feed');
      return mockDiscovery(city).comingUp.slice(0, Math.max(1, Math.min(50, Number(((req.query ?? {}) as { limit?: string }).limit ?? 20))));
    }
    req.log.error({ error }, 'Coming up error');
    reply.status(500);
    return { error: 'Failed to load coming up shows' };
  }
});

app.get('/discover/friends-going', async (req, reply) => {
  try {
    const query = (req.query ?? {}) as { limit?: string };
    const limit = Math.max(1, Math.min(50, Number(query.limit ?? 20)));
    const userId = getUserIdFromRequest(req);

    if (!userId) return [];

    const city = ((req.query ?? {}) as { city?: string }).city || 'New York';
    const data = await buildDiscoverData(userId, city);
    return data.friendsGoing.slice(0, limit);
  } catch (error) {
    if (isDbUnavailable(error)) {
      const city = ((req.query ?? {}) as { city?: string }).city || 'New York';
      req.log.warn({ error }, 'DB unavailable; returning mock friends-going feed');
      return mockDiscovery(city).friendsGoing.slice(0, Math.max(1, Math.min(50, Number(((req.query ?? {}) as { limit?: string }).limit ?? 20))));
    }
    req.log.error({ error }, 'Friends going error');
    reply.status(500);
    return { error: 'Failed to load friends going shows' };
  }
});

app.get('/discover/popular', async (req, reply) => {
  try {
    const query = (req.query ?? {}) as { city?: string; limit?: string };
    const city = query.city || 'New York';
    const limit = Math.max(1, Math.min(50, Number(query.limit ?? 10)));
    const userId = getUserIdFromRequest(req);

    const data = await buildDiscoverData(userId, city);
    return data.popular.slice(0, limit);
  } catch (error) {
    if (isDbUnavailable(error)) {
      const q = (req.query ?? {}) as { city?: string; limit?: string };
      const city = q.city || 'New York';
      const limit = Math.max(1, Math.min(50, Number(q.limit ?? 10)));
      req.log.warn({ error }, 'DB unavailable; returning mock popular feed');
      return mockDiscovery(city).popular.slice(0, limit);
    }
    req.log.error({ error }, 'Popular error');
    reply.status(500);
    return { error: 'Failed to load popular shows' };
  }
});

// ==================== EXPLORE ====================
// GET /explore - one aggregated payload for the Explore tab. Every section is
// computed with batched queries (no per-row loops); FacePerson entries carry
// the viewer's degree (1 = you follow them, 2 = friend-of-friend).

const DAY_MS = 24 * 60 * 60 * 1000;

/** Distinct users per key from audience-scoped log rows, degree 1 first, capped. */
function groupFacepiles<T>(
  rows: T[],
  keyOf: (row: T) => string | null | undefined,
  userOf: (row: T) => FaceUser,
  degreeOf: DegreeOf,
  cap: number
): Map<string, FacePerson[]> {
  const usersByKey = new Map<string, Map<string, FaceUser>>();
  for (const row of rows) {
    const key = keyOf(row);
    if (!key) continue;
    const user = userOf(row);
    let users = usersByKey.get(key);
    if (!users) {
      users = new Map();
      usersByKey.set(key, users);
    }
    if (!users.has(user.id)) users.set(user.id, user);
  }

  const facesByKey = new Map<string, FacePerson[]>();
  for (const [key, users] of usersByKey) {
    const faces = [...users.values()]
      // Rows come from a degree-scoped audience filter, so degreeOf is defined.
      .map((u) => toFacePerson(u, degreeOf(u.id)!))
      .sort((a, b) => a.degree - b.degree)
      .slice(0, cap);
    facesByKey.set(key, faces);
  }
  return facesByKey;
}

app.get('/explore', async (req) => {
  const userId = requireAccessUserId(req as any);
  const now = new Date();

  const degrees = await getViewerDegrees(userId);
  const audience = degreeAudienceWhere(degrees);
  const faceUserSelect = { select: { id: true, username: true, displayName: true, avatarUrl: true } } as const;

  // ---- Phase 1: independent base queries ----
  const [presaleRows, candidateEvents, logAgg, crowdLogs, publicPartyRows] = await Promise.all([
    // Presales starting in the next 14 days, soonest first.
    prisma.presale.findMany({
      where: { presaleStart: { gte: now, lte: new Date(now.getTime() + 14 * DAY_MS) }, source: { in: PRESALE_SOURCES } },
      orderBy: { presaleStart: 'asc' },
      take: 6,
    }),
    // Trending candidates: upcoming or recent-past (last 60 days) events.
    prisma.event.findMany({
      where: { date: { gte: new Date(now.getTime() - 60 * DAY_MS) } },
      include: {
        artist: { select: { id: true, name: true, imageUrl: true } },
        venue: { select: { id: true, name: true, city: true } },
        _count: { select: { logs: true, interested: true } },
      },
      orderBy: { date: 'asc' },
      take: 300,
    }),
    // One per-event log aggregation shared by the rising-artists, spotlight-
    // tours, and venues sections (joined back through event metadata below).
    prisma.userLog.groupBy({
      by: ['eventId'],
      _count: { _all: true, score: true },
      _avg: { score: true },
    }),
    // Crowd posts: recent PUBLIC shared logs with photos, not the viewer's own.
    prisma.userLog.findMany({
      where: {
        visibility: 'PUBLIC',
        sharedAt: { not: null },
        userId: { not: userId },
        user: { showInGalleries: true },
        photos: { some: { visibility: 'PUBLIC', isFlagged: false } },
      },
      orderBy: { sharedAt: 'desc' },
      take: 12,
      include: {
        user: faceUserSelect,
        event: { select: { id: true, artist: { select: { name: true } }, venue: { select: { name: true } } } },
        photos: {
          where: { visibility: 'PUBLIC', isFlagged: false },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { photoUrl: true },
        },
      },
    }),
    // PUBLIC parties on future events, soonest first (Plan tab's open-party rail).
    prisma.party.findMany({
      where: { visibility: 'PUBLIC', status: 'ACTIVE', event: { date: { gte: now } } },
      include: {
        host: faceUserSelect,
        event: { select: { id: true, name: true, date: true, venue: { select: { name: true, city: true } } } },
      },
      orderBy: [{ event: { date: 'asc' } }, { startsAt: { sort: 'asc', nulls: 'last' } }],
      take: 6,
    }),
  ]);

  // ---- Trending: logCount + interestedCount + a small recency boost ----
  const trending = candidateEvents
    .map((event) => {
      const daysOut = Math.abs(event.date.getTime() - now.getTime()) / DAY_MS;
      const recencyBoost = Math.max(0, 14 - daysOut) / 14;
      return { event, rank: event._count.logs + event._count.interested + recencyBoost };
    })
    .filter((c) => c.rank > 0)
    .sort((a, b) => b.rank - a.rank)
    .slice(0, 10);
  const trendingIds = trending.map((c) => c.event.id);

  // ---- Join the log aggregation back through event metadata ----
  const loggedEvents = logAgg.length
    ? await prisma.event.findMany({
        where: { id: { in: logAgg.map((a) => a.eventId) } },
        select: { id: true, artistId: true, tourId: true, venueId: true },
      })
    : [];
  const eventMetaById = new Map(loggedEvents.map((e) => [e.id, e]));

  const logCountByArtist = new Map<string, number>();
  const logCountByVenue = new Map<string, number>();
  const tourAgg = new Map<string, { logCount: number; scoreSum: number; scoreCount: number }>();
  for (const agg of logAgg) {
    const meta = eventMetaById.get(agg.eventId);
    if (!meta) continue;
    logCountByArtist.set(meta.artistId, (logCountByArtist.get(meta.artistId) ?? 0) + agg._count._all);
    logCountByVenue.set(meta.venueId, (logCountByVenue.get(meta.venueId) ?? 0) + agg._count._all);
    if (meta.tourId) {
      const t = tourAgg.get(meta.tourId) ?? { logCount: 0, scoreSum: 0, scoreCount: 0 };
      t.logCount += agg._count._all;
      if (agg._avg.score != null && agg._count.score > 0) {
        t.scoreSum += agg._avg.score * agg._count.score;
        t.scoreCount += agg._count.score;
      }
      tourAgg.set(meta.tourId, t);
    }
  }

  const topTourIds = [...tourAgg.entries()]
    .sort((a, b) => b[1].logCount - a[1].logCount)
    .slice(0, 6)
    .map(([id]) => id);
  const topVenueIds = [...logCountByVenue.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([id]) => id);

  // ---- Phase 2: metadata + facepile source rows for the picked ids ----
  const [artistRows, tourRows, venueRows, presaleArtists, trendingFriendLogs, tourFriendLogs, crowdPhotoRows, publicPartyCounts] =
    await Promise.all([
      // Rising-artist candidates ranked below by followerCount + logCount.
      prisma.artist.findMany({
        select: { id: true, name: true, imageUrl: true, _count: { select: { followers: true } } },
        orderBy: { followers: { _count: 'desc' } },
        take: 300,
      }),
      topTourIds.length
        ? prisma.tour.findMany({
            where: { id: { in: topTourIds } },
            include: { artist: { select: { id: true, name: true } }, _count: { select: { events: true } } },
          })
        : [],
      topVenueIds.length
        ? prisma.venue.findMany({
            where: { id: { in: topVenueIds } },
            select: { id: true, name: true, city: true, imageUrl: true, _count: { select: { events: true } } },
          })
        : [],
      // Presale rows only carry a denormalized artistName; resolve to Artist ids.
      presaleRows.length
        ? prisma.artist.findMany({
            where: { name: { in: [...new Set(presaleRows.map((p) => p.artistName))], mode: 'insensitive' } },
            select: { id: true, name: true },
          })
        : [],
      trendingIds.length && audience.length
        ? prisma.userLog.findMany({
            where: { eventId: { in: trendingIds }, OR: audience },
            select: { eventId: true, user: faceUserSelect },
          })
        : [],
      topTourIds.length && audience.length
        ? prisma.userLog.findMany({
            where: { event: { tourId: { in: topTourIds } }, OR: audience },
            select: { event: { select: { tourId: true } }, user: faceUserSelect },
          })
        : [],
      trendingIds.length
        ? prisma.logPhoto.findMany({
            where: {
              log: { eventId: { in: trendingIds }, visibility: 'PUBLIC', sharedAt: { not: null } },
              visibility: 'PUBLIC',
              isFlagged: false,
              user: { showInGalleries: true },
            },
            orderBy: { createdAt: 'desc' },
            take: 60,
            select: { photoUrl: true, log: { select: { eventId: true } } },
          })
        : [],
      getPartyCounts(publicPartyRows.map((p) => p.id)),
    ]);

  // ---- Rising artists: simple totals of follows + logs ----
  const rising = artistRows
    .map((artist) => ({
      artist,
      followerCount: artist._count.followers,
      logCount: logCountByArtist.get(artist.id) ?? 0,
    }))
    .map((r) => ({ ...r, rank: r.followerCount + r.logCount }))
    .filter((r) => r.rank > 0)
    .sort((a, b) => b.rank - a.rank)
    .slice(0, 8);
  const risingIds = rising.map((r) => r.artist.id);

  // ---- Phase 3: rising-artist facepiles (depends on the ranking above) ----
  const artistFriendLogs =
    risingIds.length && audience.length
      ? await prisma.userLog.findMany({
          where: { event: { artistId: { in: risingIds } }, OR: audience },
          select: { event: { select: { artistId: true } }, user: faceUserSelect },
        })
      : [];

  const trendingFaces = groupFacepiles(trendingFriendLogs, (r) => r.eventId, (r) => r.user, degrees.degreeOf, 5);
  const artistFaces = groupFacepiles(artistFriendLogs, (r) => r.event.artistId, (r) => r.user, degrees.degreeOf, 4);
  const tourFaces = groupFacepiles(tourFriendLogs, (r) => r.event.tourId, (r) => r.user, degrees.degreeOf, 4);

  const crowdPhotosByEvent = new Map<string, string[]>();
  for (const p of crowdPhotoRows) {
    const urls = crowdPhotosByEvent.get(p.log.eventId) ?? [];
    if (urls.length < 3) {
      urls.push(p.photoUrl);
      crowdPhotosByEvent.set(p.log.eventId, urls);
    }
  }

  const artistIdByName = new Map(presaleArtists.map((a) => [a.name.toLowerCase(), a.id]));
  const tourById = new Map(tourRows.map((t) => [t.id, t]));
  const venueById = new Map(venueRows.map((v) => [v.id, v]));

  return {
    presales: presaleRows.map((p) => ({
      id: p.id,
      eventId: p.eventId ?? null,
      artistId: artistIdByName.get(p.artistName.toLowerCase()) ?? null,
      artistName: p.artistName,
      presaleType: p.presaleType,
      presaleStart: p.presaleStart.toISOString(),
      ticketUrl: p.ticketUrl ?? undefined,
      code: p.code ?? undefined,
    })),
    trendingEvents: trending.map(({ event: e }) => ({
      id: e.id,
      name: e.name,
      date: e.date.toISOString(),
      imageUrl: e.imageUrl ?? undefined,
      artist: { id: e.artist.id, name: e.artist.name, imageUrl: e.artist.imageUrl ?? undefined },
      venue: { id: e.venue.id, name: e.venue.name, city: e.venue.city },
      logCount: e._count.logs,
      interestedCount: e._count.interested,
      friendsWent: trendingFaces.get(e.id) ?? [],
      crowdPhotos: crowdPhotosByEvent.get(e.id) ?? [],
    })),
    risingArtists: rising.map((r) => ({
      id: r.artist.id,
      name: r.artist.name,
      imageUrl: r.artist.imageUrl ?? undefined,
      followerCount: r.followerCount,
      logCount: r.logCount,
      friendsWent: artistFaces.get(r.artist.id) ?? [],
    })),
    spotlightTours: topTourIds
      .map((id) => tourById.get(id))
      .filter((t): t is NonNullable<typeof t> => Boolean(t))
      .map((t) => {
        const agg = tourAgg.get(t.id)!;
        return {
          id: t.id,
          name: t.name,
          artistId: t.artist.id,
          artistName: t.artist.name,
          imageUrl: t.imageUrl ?? undefined,
          eventCount: t._count.events,
          avgScore: agg.scoreCount > 0 ? round1(agg.scoreSum / agg.scoreCount) : undefined,
          friendsWent: tourFaces.get(t.id) ?? [],
        };
      }),
    venues: topVenueIds
      .map((id) => venueById.get(id))
      .filter((v): v is NonNullable<typeof v> => Boolean(v))
      .map((v) => ({
        id: v.id,
        name: v.name,
        city: v.city,
        imageUrl: v.imageUrl ?? undefined,
        eventCount: v._count.events,
      })),
    publicParties: publicPartyRows.map((p) => ({
      id: p.id,
      title: p.title,
      startsAt: p.startsAt ? p.startsAt.toISOString() : undefined,
      event: {
        id: p.event.id,
        name: p.event.name,
        date: p.event.date.toISOString(),
        venue: { name: p.event.venue.name, city: p.event.venue.city },
      },
      host: {
        id: p.host.id,
        username: p.host.username,
        displayName: p.host.displayName ?? undefined,
        avatarUrl: p.host.avatarUrl ?? undefined,
        // PUBLIC parties reach beyond the viewer's graph; degree only
        // annotates hosts within 2 hops.
        degree: degrees.degreeOf(p.host.id),
      },
      goingCount: publicPartyCounts.get(p.id)!.going,
    })),
    crowdPosts: crowdLogs
      .filter((l) => l.photos.length > 0)
      .map((l) => ({
        logId: l.id,
        eventId: l.event.id,
        photoUrl: l.photos[0]!.photoUrl,
        artistName: l.event.artist.name,
        venueName: l.event.venue.name ?? undefined,
        score: l.score ?? undefined,
        user: {
          id: l.user.id,
          username: l.user.username,
          displayName: l.user.displayName ?? undefined,
          avatarUrl: l.user.avatarUrl ?? undefined,
          // Crowd posts intentionally include people beyond the viewer's
          // network; degree is omitted when they're not within 2 hops.
          degree: degrees.degreeOf(l.user.id),
        },
      })),
  };
});

// ==================== VENUE ROUTES ====================

app.get('/venues/:id', async (req, reply) => {
  try {
    const { id } = req.params as { id: string };
    const userId = getUserIdFromRequest(req);

    const venue = await prisma.venue.findUnique({
      where: { id },
      include: { _count: { select: { events: true } } },
    });
    if (!venue) {
      reply.status(404);
      return { error: 'Venue not found' };
    }

    const [totalLogs, ratingsAgg] = await Promise.all([
      prisma.userLog.count({ where: { event: { venueId: id } } }),
      prisma.venueRating.aggregate({
        where: { venueId: id },
        _avg: { sound: true, sightlines: true, drinks: true, staff: true, access: true },
        _count: { _all: true },
      }),
    ]);

    let userShowCount = 0;
    let userFirstShow: { eventId: string; date: string; artistName: string } | undefined;
    let userLastShow: { eventId: string; date: string; artistName: string } | undefined;
    let userRatings:
      | { sound?: number | null; sightlines?: number | null; drinks?: number | null; staff?: number | null; access?: number | null }
      | undefined;
    let friendsWhoVisited: Array<{
      id: string;
      username: string;
      displayName?: string | null;
      avatarUrl?: string | null;
      showCount: number;
    }> = [];

    if (userId) {
      const userLogs = await prisma.userLog.findMany({
        where: { userId, event: { venueId: id } },
        include: { event: { include: { artist: true } } },
        orderBy: { event: { date: 'asc' } },
      });

      userShowCount = userLogs.length;
      if (userLogs.length) {
        const first = userLogs[0]!;
        const last = userLogs[userLogs.length - 1]!;
        userFirstShow = {
          eventId: first.eventId,
          date: first.event.date.toISOString(),
          artistName: first.event.artist.name,
        };
        userLastShow = {
          eventId: last.eventId,
          date: last.event.date.toISOString(),
          artistName: last.event.artist.name,
        };
      }

      const rating = await prisma.venueRating.findUnique({
        where: { userId_venueId: { userId, venueId: id } },
        select: { sound: true, sightlines: true, drinks: true, staff: true, access: true },
      });
      userRatings = rating
        ? {
            sound: rating.sound ?? undefined,
            sightlines: rating.sightlines ?? undefined,
            drinks: rating.drinks ?? undefined,
            staff: rating.staff ?? undefined,
            access: rating.access ?? undefined,
          }
        : undefined;

      const following = await prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      });
      const friendIds = following.map((f) => f.followingId);

      if (friendIds.length) {
        const friendLogs = await prisma.userLog.findMany({
          where: { userId: { in: friendIds }, event: { venueId: id } },
          select: { userId: true },
        });

        const counts = new Map<string, number>();
        for (const l of friendLogs) counts.set(l.userId, (counts.get(l.userId) ?? 0) + 1);

        const friendUsers = await prisma.user.findMany({
          where: { id: { in: Array.from(counts.keys()) } },
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        });

        friendsWhoVisited = friendUsers.map((u) => ({
          id: u.id,
          username: u.username,
          displayName: u.displayName ?? undefined,
          avatarUrl: u.avatarUrl ?? undefined,
          showCount: counts.get(u.id) ?? 0,
        }));
      }
    }

    return {
      id: venue.id,
      name: venue.name,
      imageUrl: venue.imageUrl ?? undefined,
      address: venue.address ?? undefined,
      city: venue.city,
      state: venue.state ?? undefined,
      country: venue.country,
      lat: venue.lat ?? undefined,
      lng: venue.lng ?? undefined,
      capacity: venue.capacity ?? undefined,
      totalShows: venue._count.events,
      totalLogs,
      userShowCount,
      userFirstShow,
      userLastShow,
      userRatings,
      friendsWhoVisited,
      ratings: {
        sound: ratingsAgg._avg.sound ?? null,
        sightlines: ratingsAgg._avg.sightlines ?? null,
        drinks: ratingsAgg._avg.drinks ?? null,
        staff: ratingsAgg._avg.staff ?? null,
        access: ratingsAgg._avg.access ?? null,
        totalRatings: ratingsAgg._count._all,
      },
    };
  } catch (error) {
    req.log.error({ error }, 'Get venue error');
    reply.status(500);
    return { error: 'Failed to load venue' };
  }
});

// GET /venues/:id/events - events at this venue, cursor-paginated, with
// batched (groupBy) logCount/avgScore per event rather than per-event queries.
app.get('/venues/:id/events', async (req) => {
  requireAccessUserId(req as any);
  const { id } = req.params as { id: string };
  const q = (req.query ?? {}) as { cursor?: string; limit?: string; scope?: string };
  const limit = Math.max(1, Math.min(50, Number(q.limit ?? 20)));
  const scope = q.scope === 'upcoming' || q.scope === 'past' ? q.scope : 'all';
  const cursor = typeof q.cursor === 'string' ? q.cursor : undefined;
  const sortAsc = scope === 'upcoming';

  const now = new Date();
  const conditions: Prisma.EventWhereInput[] = [{ venueId: id }];
  if (scope === 'upcoming') conditions.push({ date: { gte: now } });
  else if (scope === 'past') conditions.push({ date: { lt: now } });

  if (cursor) {
    const d = new Date(cursor);
    if (!Number.isNaN(d.getTime())) conditions.push({ date: sortAsc ? { gt: d } : { lt: d } });
  }

  const events = await prisma.event.findMany({
    where: { AND: conditions },
    include: { artist: { select: { id: true, name: true } } },
    orderBy: { date: sortAsc ? 'asc' : 'desc' },
    take: limit + 1,
  });

  const hasMore = events.length > limit;
  const slice = events.slice(0, limit);

  const eventIds = slice.map((e) => e.id);
  const logAgg = eventIds.length
    ? await prisma.userLog.groupBy({
        by: ['eventId'],
        where: { eventId: { in: eventIds } },
        _count: { _all: true },
        _avg: { score: true },
      })
    : [];
  const aggByEvent = new Map(logAgg.map((a) => [a.eventId, a]));

  const items = slice.map((e) => {
    const agg = aggByEvent.get(e.id);
    return {
      id: e.id,
      name: e.name,
      date: e.date.toISOString(),
      artist: { id: e.artist.id, name: e.artist.name },
      logCount: agg?._count._all ?? 0,
      avgScore: agg?._avg.score ?? undefined,
    };
  });

  const nextCursor = hasMore && slice.length ? slice[slice.length - 1]!.date.toISOString() : null;
  return { items, nextCursor };
});

app.post('/venues/:id/ratings', async (req, reply) => {
  try {
    const userId = requireAccessUserId(req as any);
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as { sound?: number; sightlines?: number; drinks?: number; staff?: number; access?: number };

    await prisma.venueRating.upsert({
      where: { userId_venueId: { userId, venueId: id } },
      update: {
        sound: body.sound ?? null,
        sightlines: body.sightlines ?? null,
        drinks: body.drinks ?? null,
        staff: body.staff ?? null,
        access: body.access ?? null,
      },
      create: {
        userId,
        venueId: id,
        sound: body.sound ?? null,
        sightlines: body.sightlines ?? null,
        drinks: body.drinks ?? null,
        staff: body.staff ?? null,
        access: body.access ?? null,
      },
    });

    return { success: true };
  } catch (error) {
    req.log.error({ error }, 'Submit venue ratings error');
    reply.status(500);
    return { error: 'Failed to submit venue ratings' };
  }
});

app.get('/venues/:id/tips', async (req, reply) => {
  try {
    const { id } = req.params as { id: string };
    const userId = getUserIdFromRequest(req);
    const q = (req.query ?? {}) as { limit?: string; offset?: string };
    const limit = Math.max(1, Math.min(50, Number(q.limit ?? 20)));
    const offset = Math.max(0, Number(q.offset ?? 0));

    const tips = await prisma.venueTip.findMany({
      where: { venueId: id },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
        _count: { select: { upvotes: true } },
      },
      orderBy: [{ upvotes: { _count: 'desc' } }, { createdAt: 'desc' }],
      take: limit,
      skip: offset,
    });

    const upvoted = new Set<string>();
    if (userId && tips.length) {
      const rows = await prisma.tipUpvote.findMany({
        where: { userId, tipId: { in: tips.map((t) => t.id) } },
        select: { tipId: true },
      });
      for (const r of rows) upvoted.add(r.tipId);
    }

    return tips.map((t) => ({
      id: t.id,
      text: t.text,
      category: t.category,
      upvotes: t._count.upvotes,
      userUpvoted: upvoted.has(t.id),
      user: {
        id: t.user.id,
        username: t.user.username,
        avatarUrl: t.user.avatarUrl ?? undefined,
      },
      createdAt: t.createdAt.toISOString(),
    }));
  } catch (error) {
    req.log.error({ error }, 'Get venue tips error');
    reply.status(500);
    return { error: 'Failed to load venue tips' };
  }
});

app.post('/venues/:id/tips', async (req, reply) => {
  try {
    const userId = requireAccessUserId(req as any);
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as { text?: unknown; category?: unknown };
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    const category = typeof body.category === 'string' ? body.category.trim().toLowerCase() : 'general';

    if (!text) {
      reply.status(400);
      return { error: 'Text is required' };
    }

    const tip = await prisma.venueTip.create({
      data: { venueId: id, userId, text, category: category || 'general' },
      include: { user: { select: { id: true, username: true, avatarUrl: true } }, _count: { select: { upvotes: true } } },
    });

    reply.status(201);
    return {
      id: tip.id,
      text: tip.text,
      category: tip.category,
      upvotes: 0,
      userUpvoted: false,
      user: { id: tip.user.id, username: tip.user.username, avatarUrl: tip.user.avatarUrl ?? undefined },
      createdAt: tip.createdAt.toISOString(),
    };
  } catch (error) {
    req.log.error({ error }, 'Create venue tip error');
    reply.status(500);
    return { error: 'Failed to create tip' };
  }
});

app.post('/venues/:id/tips/:tipId/upvote', async (req, reply) => {
  try {
    const userId = requireAccessUserId(req as any);
    const { tipId } = req.params as { id: string; tipId: string };

    await prisma.tipUpvote.upsert({
      where: { userId_tipId: { userId, tipId } },
      update: {},
      create: { userId, tipId },
    });

    return { success: true };
  } catch (error) {
    req.log.error({ error }, 'Upvote tip error');
    reply.status(500);
    return { error: 'Failed to upvote tip' };
  }
});

app.delete('/venues/:id/tips/:tipId/upvote', async (req, reply) => {
  try {
    const userId = requireAccessUserId(req as any);
    const { tipId } = req.params as { id: string; tipId: string };

    await prisma.tipUpvote.deleteMany({ where: { userId, tipId } });
    return { success: true };
  } catch (error) {
    req.log.error({ error }, 'Remove tip upvote error');
    reply.status(500);
    return { error: 'Failed to remove upvote' };
  }
});

app.get('/venues/:id/seat-views', async (req, reply) => {
  try {
    const { id } = req.params as { id: string };
    const q = (req.query ?? {}) as { section?: string; limit?: string };
    const section = typeof q.section === 'string' ? q.section.trim() : undefined;
    const limit = Math.max(1, Math.min(50, Number(q.limit ?? 50)));

    const views = await prisma.seatView.findMany({
      where: { venueId: id, ...(section ? { section } : {}) },
      include: { user: { select: { id: true, username: true } }, event: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return views.map((v) => ({
      id: v.id,
      section: v.section,
      row: v.row ?? undefined,
      photoUrl: v.photoUrl,
      thumbnailUrl: v.thumbnailUrl ?? undefined,
      user: { id: v.user.id, username: v.user.username },
      eventName: v.event?.name ?? undefined,
      createdAt: v.createdAt.toISOString(),
    }));
  } catch (error) {
    req.log.error({ error }, 'Get seat views error');
    reply.status(500);
    return { error: 'Failed to load seat views' };
  }
});

// POST /venues/:id/seat-ratings — photo-less seat rating (JSON). A seat view
// photo can be attached later via /venues/:id/seat-views; both write SeatView.
app.post('/venues/:id/seat-ratings', async (req, reply) => {
  const userId = requireAccessUserId(req as any);
  const { id: venueId } = req.params as { id: string };
  const body = (req.body ?? {}) as { section?: string; row?: string; rating?: number; eventId?: string };

  const section = typeof body.section === 'string' ? body.section.trim() : '';
  if (!section) throw new AppError('section is required', 400);
  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new AppError('rating must be an integer 1-5', 400);
  }

  const venue = await prisma.venue.findUnique({ where: { id: venueId }, select: { id: true } });
  if (!venue) throw new AppError('Venue not found', 404);

  const created = await prisma.seatView.create({
    data: {
      venueId,
      userId,
      section,
      row: typeof body.row === 'string' && body.row.trim() ? body.row.trim() : null,
      rating,
      eventId: typeof body.eventId === 'string' && body.eventId ? body.eventId : null,
    },
  });

  reply.status(201);
  return { id: created.id, section: created.section, row: created.row ?? undefined, rating: created.rating };
});

app.post('/venues/:id/seat-views', async (req, reply) => {
  try {
    const userId = requireAccessUserId(req as any);
    const { id } = req.params as { id: string };

    const file = await (req as any).file();
    if (!file) {
      reply.status(400);
      return { error: 'Photo is required' };
    }

    const fields = (file.fields ?? {}) as Record<string, { value?: unknown }>;
    const section = typeof fields.section?.value === 'string' ? fields.section.value.trim() : '';
    const row = typeof fields.row?.value === 'string' ? fields.row.value.trim() : '';
    // Optional 1-5 rating carried alongside the photo, so a starred seat view
    // and its sightline photo land on one SeatView row. Multipart values arrive
    // as strings; anything outside 1-5 is dropped (photo still saves).
    const ratingRaw = fields.rating?.value;
    const ratingNum = typeof ratingRaw === 'string' ? Number(ratingRaw) : typeof ratingRaw === 'number' ? ratingRaw : NaN;
    const rating = Number.isInteger(ratingNum) && ratingNum >= 1 && ratingNum <= 5 ? ratingNum : null;

    if (!section) {
      reply.status(400);
      return { error: 'Section is required' };
    }

    const extFromName =
      typeof file.filename === 'string' && file.filename.includes('.') ? file.filename.split('.').pop() : null;
    const extFromMime =
      typeof file.mimetype === 'string'
        ? file.mimetype === 'image/png'
          ? 'png'
          : file.mimetype === 'image/webp'
            ? 'webp'
            : file.mimetype === 'image/jpeg'
              ? 'jpg'
              : null
        : null;
    const ext = extFromMime || extFromName || 'jpg';

    const seatViewsDir = path.join(uploadsRoot, 'seat-views');
    await mkdir(seatViewsDir, { recursive: true });

    const filename = `${id}_${userId}_${Date.now()}_${randomUUID()}.${ext}`;
    const dest = path.join(seatViewsDir, filename);
    await pipeline(file.file, createWriteStream(dest));

    const baseUrl = getPublicBaseUrl(req as any);
    const photoUrl = `${baseUrl}/uploads/seat-views/${filename}`;

    const created = await prisma.seatView.create({
      data: {
        venueId: id,
        userId,
        section,
        row: row || null,
        rating,
        photoUrl,
        thumbnailUrl: photoUrl,
      },
      include: { user: { select: { id: true, username: true } }, event: { select: { name: true } } },
    });

    reply.status(201);
    return {
      id: created.id,
      section: created.section,
      row: created.row ?? undefined,
      rating: created.rating ?? undefined,
      photoUrl: created.photoUrl,
      thumbnailUrl: created.thumbnailUrl ?? undefined,
      user: { id: created.user.id, username: created.user.username },
      eventName: created.event?.name ?? undefined,
      createdAt: created.createdAt.toISOString(),
    };
  } catch (error) {
    req.log.error({ error }, 'Create seat view error');
    reply.status(500);
    return { error: 'Failed to create seat view' };
  }
});

// GET /events/search - Search events for ticket entry, logging, etc.
// NOTE: Must be defined BEFORE `/events/:id` so it doesn't get treated as an event id.
app.get('/events/browse', async (req, reply) => {
  try {
    const query = (req.query ?? {}) as { city?: string; limit?: string; keyword?: string };
    const city = query.city?.trim() || null;
    const keyword = query.keyword?.trim() || null;
    const limit = Math.max(1, Math.min(50, Number(query.limit ?? 20)));
    const now = new Date();

    // Try DB first
    const where: any = { date: { gte: now } };
    if (city) {
      where.venue = { city: { contains: city, mode: 'insensitive' } };
    }

    let rows = await prisma.event.findMany({
      where,
      include: { artist: true, venue: true },
      orderBy: { date: 'asc' },
      take: limit,
    });

    // If DB is sparse, supplement with Ticketmaster
    if (rows.length < 5) {
      const tmEvents = await tmSearchEvents({ city: city ?? undefined, keyword: keyword ?? undefined, size: limit });
      for (const te of tmEvents) {
        const artist =
          (await prisma.artist.findFirst({ where: { name: te.artist.name } })) ??
          (await prisma.artist.create({ data: { name: te.artist.name, imageUrl: te.artist.imageUrl, genres: te.artist.genres } }));

        const venue =
          (await prisma.venue.findFirst({ where: { name: te.venue.name, city: te.venue.city } })) ??
          (await prisma.venue.create({
            data: {
              name: te.venue.name, city: te.venue.city, state: te.venue.region || null, country: te.venue.country,
              lat: Number.isFinite(Number(te.venue.latitude)) ? Number(te.venue.latitude) : null,
              lng: Number.isFinite(Number(te.venue.longitude)) ? Number(te.venue.longitude) : null,
            },
          }));

        const date = new Date(te.datetime);
        const ev = await prisma.event.upsert({
          where: { artistId_venueId_date: { artistId: artist.id, venueId: venue.id, date } },
          update: { name: te.name, source: 'ticketmaster', externalId: te.externalId, imageUrl: te.imageUrl, ticketUrl: te.url ?? null },
          create: { name: te.name, date, artistId: artist.id, venueId: venue.id, source: 'ticketmaster', externalId: te.externalId, imageUrl: te.imageUrl, ticketUrl: te.url ?? null },
        });
        await upsertTmPresales({
          eventId: ev.id,
          artistName: te.artist.name,
          venueName: te.venue.name,
          venueCity: te.venue.city,
          venueState: te.venue.region || null,
          eventDate: date,
          eventUrl: te.url ?? null,
          sales: te.sales,
        });
      }

      // Re-query with the new data
      rows = await prisma.event.findMany({ where, include: { artist: true, venue: true }, orderBy: { date: 'asc' }, take: limit });
    }

    if (rows.length === 0) {
      return mockDiscovery(city || 'New York').comingUp.slice(0, limit);
    }

    return rows.map((e) => eventToPayload(e));
  } catch (error) {
    if (isDbUnavailable(error)) {
      return mockDiscovery(((req.query ?? {}) as { city?: string }).city || 'New York').comingUp;
    }
    req.log.error({ error }, 'Events browse error');
    reply.status(500);
    return { error: 'Failed to browse events' };
  }
});

app.get('/events/search', async (req, reply) => {
  try {
    // Wallet search is behind auth in the app, so require auth here.
    void requireAccessUserId(req as any);

    const q = ((req.query ?? {}) as { q?: string }).q?.trim();
    const upcomingRaw = ((req.query ?? {}) as { upcoming?: string }).upcoming;
    const limitRaw = ((req.query ?? {}) as { limit?: string }).limit;

    if (!q) return [];

    const upcoming = upcomingRaw === 'true' || upcomingRaw === '1';
    const limit = Math.max(1, Math.min(25, Number(limitRaw ?? 10)));

    const where = {
      ...(upcoming ? { date: { gte: new Date() } } : {}),
      OR: [
        { name: { contains: q, mode: 'insensitive' as const } },
        { artist: { name: { contains: q, mode: 'insensitive' as const } } },
        { venue: { name: { contains: q, mode: 'insensitive' as const } } },
      ],
    };

    const rows = await prisma.event.findMany({
      where,
      include: {
        artist: { select: { id: true, name: true } },
        venue: { select: { id: true, name: true, city: true } },
      },
      orderBy: { date: 'asc' },
      take: limit,
    });

    return rows.map((e) => ({
      id: e.id,
      name: e.name,
      date: e.date.toISOString(),
      artist: { id: e.artist.id, name: e.artist.name },
      venue: { id: e.venue.id, name: e.venue.name, city: e.venue.city },
    }));
  } catch (error) {
    if (isDbUnavailable(error)) {
      // When DB is down, return empty results (client handles empty state).
      return [];
    }
    req.log.error({ error }, 'Event search error');
    reply.status(500);
    return { error: 'Failed to search events' };
  }
});

app.get('/events/:id', async (req, reply) => {
  try {
    const { id } = req.params as { id: string };
    const userId = getUserIdFromRequest(req);

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        artist: true,
        venue: true,
        _count: { select: { interested: true, logs: true } },
      },
    });
    if (!event) {
      reply.status(404);
      return { error: 'Event not found' };
    }

    // Average rating across all logs for this event
    const ratingAgg = await prisma.userLog.aggregate({
      where: { eventId: id, rating: { not: null } },
      _avg: { rating: true },
    });

    // User state
    let isInterested = false;
    let userLog: {
      id: string;
      rating?: number;
      note?: string;
      section?: string;
      row?: string;
      seat?: string;
      photos: { id: string; photoUrl: string; thumbnailUrl?: string }[];
    } | null = null;

    // Friends (people the viewer follows = degree 1 by construction)
    let friendsWhoWent: Array<{
      id: string;
      username: string;
      displayName?: string | null;
      avatarUrl?: string | null;
      rating?: number | null;
      degree: 1;
    }> = [];
    let friendsInterested: Array<{
      id: string;
      username: string;
      displayName?: string | null;
      avatarUrl?: string | null;
      degree: 1;
    }> = [];

    if (userId) {
      const [interestedRow, logRow, following] = await Promise.all([
        prisma.userInterested.findUnique({
          where: { userId_eventId: { userId, eventId: event.id } },
          select: { id: true },
        }),
        prisma.userLog.findUnique({
          where: { userId_eventId: { userId, eventId: event.id } },
          include: { photos: true },
        }),
        prisma.follow.findMany({
          where: { followerId: userId },
          select: { followingId: true },
        }),
      ]);

      isInterested = Boolean(interestedRow);
      if (logRow) {
        userLog = {
          id: logRow.id,
          rating: typeof logRow.rating === 'number' ? logRow.rating : undefined,
          note: logRow.note ?? undefined,
          section: logRow.section ?? undefined,
          row: logRow.row ?? undefined,
          seat: logRow.seat ?? undefined,
          photos: (logRow.photos ?? []).map((p) => ({
            id: p.id,
            photoUrl: p.photoUrl,
            // thumbnailUrl not yet stored in DB
            thumbnailUrl: undefined,
          })),
        };
      }

      const friendIds = following.map((f) => f.followingId);
      if (friendIds.length) {
        const [friendLogs, friendInterested] = await Promise.all([
          prisma.userLog.findMany({
            where: { eventId: id, userId: { in: friendIds } },
            include: {
              user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
            },
          }),
          prisma.userInterested.findMany({
            where: { eventId: id, userId: { in: friendIds } },
            include: {
              user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
            },
          }),
        ]);

        friendsWhoWent = friendLogs.map((l) => ({
          ...l.user,
          rating: l.rating,
          degree: 1 as const,
        }));

        friendsInterested = friendInterested.map((i) => ({ ...i.user, degree: 1 as const }));
      }
    }

    const interestedCount = event._count.interested;

    return {
      ...eventToPayload(event),
      ticketUrl: event.ticketUrl ?? undefined,
      // Stats
      logCount: event._count.logs,
      avgRating: ratingAgg._avg.rating ?? undefined,
      interestedCount,
      // User state
      userLog,
      isInterested,
      // Friends
      friendsWhoWent,
      friendsInterested,
      // Content (not implemented yet)
      setlist: [],
      moments: [],
      // Keep legacy field used elsewhere in the app
      totalInterested: interestedCount,
    };
  } catch (error) {
    if (isDbUnavailable(error)) {
      const { id } = req.params as { id: string };
      const mock = mockEventById('New York', id);
      if (!mock) {
        reply.status(404);
        return { error: 'Event not found' };
      }
      return {
        ...mock,
        // EventDetails fields (for the Event Page)
        ticketUrl: (mock as { ticketUrl?: string }).ticketUrl ?? undefined,
        logCount: 0,
        avgRating: undefined,
        interestedCount: mock.totalInterested ?? 0,
        userLog: null,
        isInterested: false,
        friendsWhoWent: [],
        friendsInterested: [],
        setlist: [],
        moments: [],
      };
    }
    req.log.error({ error }, 'Get event error');
    reply.status(500);
    return { error: 'Failed to load event' };
  }
});

app.post('/events/:id/interested', async (req, reply) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      reply.status(401);
      return { error: 'Unauthorized' };
    }

    const { id } = req.params as { id: string };
    await prisma.userInterested.upsert({
      where: { userId_eventId: { userId, eventId: id } },
      update: {},
      create: { userId, eventId: id, notifyOnSale: true },
    });

    return { success: true };
  } catch (error) {
    if (isDbUnavailable(error)) {
      req.log.warn({ error }, 'DB unavailable; interested is mocked');
      return { success: true, mocked: true };
    }
    req.log.error({ error }, 'Mark interested error');
    reply.status(500);
    return { error: 'Failed to mark interested' };
  }
});

app.delete('/events/:id/interested', async (req, reply) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      reply.status(401);
      return { error: 'Unauthorized' };
    }

    const { id } = req.params as { id: string };
    await prisma.userInterested.delete({
      where: { userId_eventId: { userId, eventId: id } },
    });

    return { success: true };
  } catch (error) {
    if (isDbUnavailable(error)) {
      req.log.warn({ error }, 'DB unavailable; interested is mocked');
      return { success: true, mocked: true };
    }
    req.log.error({ error }, 'Remove interested error');
    reply.status(500);
    return { error: 'Failed to remove interested' };
  }
});

// GET /events/:id/photos
app.get('/events/:id/photos', async (req, reply) => {
  try {
    const { id } = req.params as { id: string };
    const { limit = '20', offset = '0' } = (req.query ?? {}) as { limit?: string; offset?: string };

    const photos = await prisma.logPhoto.findMany({
      // `user: { showInGalleries: true }` = discovery dial opt-out (photos
      // from users who turned galleries off never show in event galleries).
      where: { log: { eventId: id }, visibility: 'PUBLIC', isFlagged: false, user: { showInGalleries: true } },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
        log: { select: { section: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.max(1, Math.min(50, Number.parseInt(String(limit), 10) || 20)),
      skip: Math.max(0, Number.parseInt(String(offset), 10) || 0),
    });

    return photos.map((p) => ({
      id: p.id,
      photoUrl: p.photoUrl,
      thumbnailUrl: undefined,
      user: p.user,
      section: p.log.section ?? undefined,
      createdAt: p.createdAt.toISOString(),
    }));
  } catch (error) {
    if (isDbUnavailable(error)) {
      req.log.warn({ error }, 'DB unavailable; returning empty photos');
      return [];
    }
    req.log.error({ error }, 'Get event photos error');
    reply.status(500);
    return { error: 'Failed to load event photos' };
  }
});

// GET /events/:id/comments
app.get('/events/:id/comments', async (req, reply) => {
  try {
    const { id } = req.params as { id: string };
    const { limit = '50', offset = '0' } = (req.query ?? {}) as { limit?: string; offset?: string };

    const comments = await prisma.comment.findMany({
      where: { log: { eventId: id } },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: Math.max(1, Math.min(200, Number.parseInt(String(limit), 10) || 50)),
      skip: Math.max(0, Number.parseInt(String(offset), 10) || 0),
    });

    return comments.map((c) => ({
      id: c.id,
      text: c.text,
      createdAt: c.createdAt.toISOString(),
      user: c.user,
    }));
  } catch (error) {
    if (isDbUnavailable(error)) {
      req.log.warn({ error }, 'DB unavailable; returning empty comments');
      return [];
    }
    req.log.error({ error }, 'Get event comments error');
    reply.status(500);
    return { error: 'Failed to load event comments' };
  }
});

// POST /events/:id/comments
app.post('/events/:id/comments', async (req, reply) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      reply.status(401);
      return { error: 'Unauthorized' };
    }

    const { id } = req.params as { id: string };
    const { text } = (req.body ?? {}) as { text?: unknown };
    const clean = typeof text === 'string' ? text.trim() : '';
    if (!clean) {
      reply.status(400);
      return { error: 'Text is required' };
    }

    // Ensure event exists
    const exists = await prisma.event.findUnique({ where: { id }, select: { id: true } });
    if (!exists) {
      reply.status(404);
      return { error: 'Event not found' };
    }

    // Attach comments to the user's log for this event (create if needed)
    const log = await prisma.userLog.upsert({
      where: { userId_eventId: { userId, eventId: id } },
      update: {},
      create: { userId, eventId: id },
      select: { id: true },
    });

    const comment = await prisma.comment.create({
      data: { logId: log.id, userId, text: clean },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });

    reply.status(201);
    return {
      id: comment.id,
      text: comment.text,
      createdAt: comment.createdAt.toISOString(),
      user: comment.user,
    };
  } catch (error) {
    if (isDbUnavailable(error)) {
      req.log.warn({ error }, 'DB unavailable; comment is mocked');
      reply.status(201);
      return {
        id: `mock-comment-${Date.now()}`,
        text: (req.body as any)?.text ?? '',
        createdAt: new Date().toISOString(),
        user: { id: 'mock-user', username: 'you', displayName: 'You', avatarUrl: null },
        mocked: true,
      };
    }
    req.log.error({ error }, 'Post event comment error');
    reply.status(500);
    return { error: 'Failed to post comment' };
  }
});

// DELETE /events/:id/comments/:commentId
app.delete('/events/:id/comments/:commentId', async (req, reply) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      reply.status(401);
      return { error: 'Unauthorized' };
    }

    const { id, commentId } = req.params as { id: string; commentId: string };

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: { log: { select: { eventId: true } } },
    });

    if (!comment || comment.log.eventId !== id) {
      reply.status(404);
      return { error: 'Comment not found' };
    }

    if (comment.userId !== userId) {
      reply.status(403);
      return { error: 'Forbidden' };
    }

    await prisma.comment.delete({ where: { id: commentId } });
    reply.status(204);
    return null;
  } catch (error) {
    if (isDbUnavailable(error)) {
      req.log.warn({ error }, 'DB unavailable; delete comment is mocked');
      reply.status(204);
      return null;
    }
    req.log.error({ error }, 'Delete event comment error');
    reply.status(500);
    return { error: 'Failed to delete comment' };
  }
});

// ==================== CROWD-SOURCED SETLIST ROUTES ====================
// Loggers submit the songs they remember (POST /events/:id/setlist); other
// attendees confirm or dispute individual entries. `confirmCount` is the net
// crowd confidence for an entry: +1 per YES vote, -1 per NO vote, seeded at 1
// by the submitter (who also gets a YES SetlistConfirm row so they can't
// double-count themselves later).

// GET /events/:id/setlist — the crowd-sourced setlist, ordered by position.
// (Replaces the old `{ songs: [] }` stub.)
app.get('/events/:id/setlist', async (req) => {
  const userId = requireAccessUserId(req as any);
  const { id: eventId } = req.params as { id: string };

  const entries = await prisma.setlistEntry.findMany({
    where: { eventId },
    orderBy: [{ position: 'asc' }, { confirmCount: 'desc' }, { createdAt: 'asc' }],
    select: { id: true, position: true, songTitle: true, confirmCount: true },
  });

  const yourVotes = entries.length
    ? await prisma.setlistConfirm.findMany({
        where: { userId, entryId: { in: entries.map((e) => e.id) } },
        select: { entryId: true, vote: true },
      })
    : [];
  const voteByEntry = new Map(yourVotes.map((v) => [v.entryId, v.vote]));

  return {
    entries: entries.map((e) => ({
      id: e.id,
      position: e.position,
      songTitle: e.songTitle,
      confirmCount: e.confirmCount,
      yourVote: voteByEntry.get(e.id) ?? null,
    })),
  };
});

// POST /events/:id/setlist { songs: [title, ...] } — bulk add from a logger.
// Array order defines positions 1..n. Upserts by (eventId, position, title):
// a new entry starts at confirmCount 1; an existing entry gets +1 (recorded
// as the submitter's YES vote, so resubmitting is idempotent per user).
app.post('/events/:id/setlist', async (req, reply) => {
  const userId = requireAccessUserId(req as any);
  const { id: eventId } = req.params as { id: string };
  const body = (req.body ?? {}) as { songs?: unknown };

  if (!Array.isArray(body.songs) || body.songs.length === 0) {
    throw new AppError('songs must be a non-empty array of titles', 400);
  }
  if (body.songs.length > 60) throw new AppError('Too many songs (max 60)', 400);

  const songs = body.songs.map((s) => (typeof s === 'string' ? s.trim() : '')).filter(Boolean);
  if (songs.length === 0) throw new AppError('songs must be a non-empty array of titles', 400);

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
  if (!event) throw new AppError('Event not found', 404);

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < songs.length; i++) {
      const position = i + 1;
      const songTitle = songs[i]!;

      const existing = await tx.setlistEntry.findUnique({
        where: { eventId_position_songTitle: { eventId, position, songTitle } },
        select: { id: true },
      });

      if (!existing) {
        await tx.setlistEntry.create({
          data: {
            eventId,
            position,
            songTitle,
            confirmCount: 1,
            confirms: { create: { userId, vote: 'YES' } },
          },
        });
        continue;
      }

      // Entry already crowd-sourced: this submission counts as the user's
      // YES vote (no vote yet -> +1, previous NO -> +2, previous YES -> no-op).
      const prior = await tx.setlistConfirm.findUnique({
        where: { entryId_userId: { entryId: existing.id, userId } },
        select: { id: true, vote: true },
      });
      if (prior?.vote === 'YES') continue;

      await tx.setlistConfirm.upsert({
        where: { entryId_userId: { entryId: existing.id, userId } },
        update: { vote: 'YES' },
        create: { entryId: existing.id, userId, vote: 'YES' },
      });
      await tx.setlistEntry.update({
        where: { id: existing.id },
        data: { confirmCount: { increment: prior ? 2 : 1 } },
      });
    }
  });

  const entries = await prisma.setlistEntry.findMany({
    where: { eventId },
    orderBy: [{ position: 'asc' }, { confirmCount: 'desc' }, { createdAt: 'asc' }],
    select: { id: true, position: true, songTitle: true, confirmCount: true },
  });

  reply.status(201);
  return {
    entries: entries.map((e) => ({
      id: e.id,
      position: e.position,
      songTitle: e.songTitle,
      confirmCount: e.confirmCount,
    })),
  };
});

// POST /setlist-entries/:id/confirm { vote: 'yes' | 'no' } — one vote per
// user per entry. YES = +1, NO = -1; switching your vote moves the count by
// 2, repeating the same vote is a no-op.
app.post('/setlist-entries/:id/confirm', async (req) => {
  const userId = requireAccessUserId(req as any);
  const { id: entryId } = req.params as { id: string };
  const body = (req.body ?? {}) as { vote?: unknown };

  const raw = typeof body.vote === 'string' ? body.vote.trim().toUpperCase() : '';
  if (raw !== 'YES' && raw !== 'NO') throw new AppError("vote must be 'yes' or 'no'", 400);
  const vote = raw as 'YES' | 'NO';

  const entry = await prisma.setlistEntry.findUnique({ where: { id: entryId }, select: { id: true } });
  if (!entry) throw new AppError('Setlist entry not found', 404);

  const updated = await prisma.$transaction(async (tx) => {
    const prior = await tx.setlistConfirm.findUnique({
      where: { entryId_userId: { entryId, userId } },
      select: { vote: true },
    });

    // no prior vote: +-1; switched vote: +-2; same vote: 0.
    const delta = prior ? (prior.vote === vote ? 0 : vote === 'YES' ? 2 : -2) : vote === 'YES' ? 1 : -1;

    await tx.setlistConfirm.upsert({
      where: { entryId_userId: { entryId, userId } },
      update: { vote },
      create: { entryId, userId, vote },
    });

    if (delta === 0) {
      return tx.setlistEntry.findUniqueOrThrow({
        where: { id: entryId },
        select: { id: true, position: true, songTitle: true, confirmCount: true },
      });
    }
    return tx.setlistEntry.update({
      where: { id: entryId },
      data: { confirmCount: { increment: delta } },
      select: { id: true, position: true, songTitle: true, confirmCount: true },
    });
  });

  return { ...updated, yourVote: vote };
});

// POST /events/:id/moments (stub)
app.post('/events/:id/moments', async (req, reply) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      reply.status(401);
      return { error: 'Unauthorized' };
    }
    return { success: true };
  } catch (error) {
    if (isDbUnavailable(error)) {
      req.log.warn({ error }, 'DB unavailable; moments are mocked');
      return { success: true, mocked: true };
    }
    req.log.error({ error }, 'Report moment error');
    reply.status(500);
    return { error: 'Failed to report moment' };
  }
});

// ==================== TICKET WALLET ROUTES ====================

function ticketToPayload(t: any) {
  return {
    id: t.id,
    userId: t.userId,
    event: {
      id: t.event.id,
      name: t.event.name,
      date: t.event.date instanceof Date ? t.event.date.toISOString() : t.event.date,
      artist: {
        id: t.event.artist.id,
        name: t.event.artist.name,
        imageUrl: t.event.artist.imageUrl ?? undefined,
      },
      venue: {
        id: t.event.venue.id,
        name: t.event.venue.name,
        city: t.event.venue.city,
        state: t.event.venue.state ?? undefined,
      },
    },
    section: t.section ?? undefined,
    row: t.row ?? undefined,
    seat: t.seat ?? undefined,
    isGeneralAdmission: Boolean(t.isGeneralAdmission),
    barcode: t.barcode ?? undefined,
    barcodeFormat: (t.barcodeFormat ?? 'UNKNOWN') as string,
    barcodeImageUrl: t.barcodeImageUrl ?? undefined,
    status: t.status,
    source: t.source,
    purchasePrice: typeof t.purchasePrice === 'number' ? t.purchasePrice : undefined,
    purchaseDate: t.purchaseDate ? (t.purchaseDate instanceof Date ? t.purchaseDate.toISOString() : t.purchaseDate) : undefined,
    confirmationNumber: t.confirmationNumber ?? undefined,
    notes: t.notes ?? undefined,
    sourceEmail: t.sourceEmail ?? undefined,
    rawEmailId: t.rawEmailId ?? undefined,
    createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt,
    updatedAt: t.updatedAt instanceof Date ? t.updatedAt.toISOString() : t.updatedAt,
  };
}

const ticketStatusSet = new Set<TicketStatus>(['KEEPING', 'SELLING', 'SOLD', 'TRANSFERRED']);
function parseTicketStatus(raw: unknown): TicketStatus | undefined {
  if (typeof raw !== 'string') return undefined;
  const v = raw.trim() as TicketStatus;
  return ticketStatusSet.has(v) ? v : undefined;
}

// GET /tickets - List tickets for wallet (upcoming/past)
app.get('/tickets', async (req, reply) => {
  try {
    const userId = requireAccessUserId(req as any);
    const q = (req.query ?? {}) as { upcoming?: string; past?: string; status?: string };

    const upcoming = q.upcoming === 'true' || q.upcoming === '1';
    const past = q.past === 'true' || q.past === '1';
    const statusRaw = typeof q.status === 'string' ? q.status : undefined;
    const status = parseTicketStatus(statusRaw);
    if (statusRaw && !status) {
      reply.status(400);
      return { error: 'Invalid ticket status' };
    }

    const now = new Date();
    const eventDateWhere =
      upcoming && !past ? { gte: now } : past && !upcoming ? { lt: now } : undefined;

    const rows = await prisma.userTicket.findMany({
      where: {
        userId,
        ...(status ? { status } : {}),
        ...(eventDateWhere ? { event: { date: eventDateWhere } } : {}),
      },
      include: {
        event: { include: { artist: true, venue: true } },
      },
      orderBy: { event: { date: upcoming && !past ? 'asc' : 'desc' } },
    });

    return rows.map(ticketToPayload);
  } catch (error) {
    if (error instanceof AppError) {
      reply.status(error.statusCode);
      return { error: error.message };
    }
    if (isDbUnavailable(error)) {
      req.log.warn({ error }, 'DB unavailable; returning empty tickets list');
      return [];
    }
    req.log.error({ error }, 'Get tickets error');
    reply.status(500);
    return { error: 'Failed to load tickets' };
  }
});

// GET /tickets/:id - Ticket detail
app.get('/tickets/:id', async (req, reply) => {
  try {
    const userId = requireAccessUserId(req as any);
    const { id } = req.params as { id: string };

    const ticket = await prisma.userTicket.findFirst({
      where: { id, userId },
      include: { event: { include: { artist: true, venue: true } } },
    });
    if (!ticket) {
      reply.status(404);
      return { error: 'Ticket not found' };
    }

    return ticketToPayload(ticket);
  } catch (error) {
    if (error instanceof AppError) {
      reply.status(error.statusCode);
      return { error: error.message };
    }
    if (isDbUnavailable(error)) {
      reply.status(503);
      return { error: 'Service unavailable' };
    }
    req.log.error({ error }, 'Get ticket error');
    reply.status(500);
    return { error: 'Failed to load ticket' };
  }
});

// POST /tickets - Add a ticket (eventId or manual event info)
app.post('/tickets', async (req, reply) => {
  try {
    const userId = requireAccessUserId(req as any);
    const body = (req.body ?? {}) as {
      eventId?: string;
      artistName?: string;
      venueName?: string;
      eventDate?: string;
      section?: string;
      row?: string;
      seat?: string;
      isGeneralAdmission?: boolean;
      barcode?: string;
      barcodeFormat?: string;
      purchasePrice?: number;
      confirmationNumber?: string;
      notes?: string;
    };

    const eventIdRaw = typeof body.eventId === 'string' ? body.eventId.trim() : '';
    let eventId = eventIdRaw || null;

    // Manual event creation (minimal): create artist/venue/event if no eventId.
    if (!eventId) {
      const artistName = typeof body.artistName === 'string' ? body.artistName.trim() : '';
      const venueName = typeof body.venueName === 'string' ? body.venueName.trim() : '';
      const eventDateIso = typeof body.eventDate === 'string' ? body.eventDate.trim() : '';
      const d = new Date(eventDateIso);
      if (!artistName || !venueName || !eventDateIso || !Number.isFinite(d.getTime())) {
        reply.status(400);
        return { error: 'eventId or (artistName, venueName, eventDate) is required' };
      }

      const artist = await prisma.artist.create({
        data: { name: artistName, genres: [] },
      });

      const venue = await prisma.venue.create({
        data: { name: venueName, city: 'Unknown', country: 'US' },
      });

      const event = await prisma.event.create({
        data: {
          name: `${artistName} at ${venueName}`,
          date: d,
          artistId: artist.id,
          venueId: venue.id,
        },
      });
      eventId = event.id;
    }

    const existingEvent = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });
    if (!existingEvent) {
      reply.status(404);
      return { error: 'Event not found' };
    }

    const isGeneralAdmission = Boolean(body.isGeneralAdmission);
    const barcode = typeof body.barcode === 'string' ? body.barcode.trim() : null;
    const barcodeFormat = typeof body.barcodeFormat === 'string' ? body.barcodeFormat.trim() : 'UNKNOWN';

    const created = await prisma.userTicket.create({
      data: {
        userId,
        eventId,
        section: isGeneralAdmission ? null : typeof body.section === 'string' ? body.section.trim() || null : null,
        row: isGeneralAdmission ? null : typeof body.row === 'string' ? body.row.trim() || null : null,
        seat: isGeneralAdmission ? null : typeof body.seat === 'string' ? body.seat.trim() || null : null,
        isGeneralAdmission,
        barcode,
        barcodeFormat,
        status: 'KEEPING',
        source: 'MANUAL',
        purchasePrice: typeof body.purchasePrice === 'number' ? body.purchasePrice : null,
        confirmationNumber: typeof body.confirmationNumber === 'string' ? body.confirmationNumber.trim() || null : null,
        notes: typeof body.notes === 'string' ? body.notes.trim() || null : null,
      },
      include: { event: { include: { artist: true, venue: true } } },
    });

    reply.status(201);
    return ticketToPayload(created);
  } catch (error: any) {
    if (isDbUnavailable(error)) {
      reply.status(503);
      return { error: 'Service unavailable' };
    }
    // Unique constraint (duplicate ticket) -> 409
    if (error?.code === 'P2002') {
      reply.status(409);
      return { error: 'Ticket already exists' };
    }
    req.log.error({ error }, 'Create ticket error');
    reply.status(500);
    return { error: 'Failed to create ticket' };
  }
});

// PATCH /tickets/:id - Update ticket
app.patch('/tickets/:id', async (req, reply) => {
  try {
    const userId = requireAccessUserId(req as any);
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as Record<string, unknown>;

    const existing = await prisma.userTicket.findFirst({ where: { id, userId }, select: { id: true } });
    if (!existing) {
      reply.status(404);
      return { error: 'Ticket not found' };
    }

    const isGeneralAdmission = typeof body.isGeneralAdmission === 'boolean' ? body.isGeneralAdmission : undefined;

    const updated = await prisma.userTicket.update({
      where: { id },
      data: {
        ...(typeof body.section === 'string' && { section: body.section.trim() || null }),
        ...(typeof body.row === 'string' && { row: body.row.trim() || null }),
        ...(typeof body.seat === 'string' && { seat: body.seat.trim() || null }),
        ...(isGeneralAdmission !== undefined && { isGeneralAdmission }),
        ...(typeof body.barcode === 'string' && { barcode: body.barcode.trim() || null }),
        ...(typeof body.barcodeFormat === 'string' && { barcodeFormat: body.barcodeFormat.trim() || 'UNKNOWN' }),
        ...(() => {
          if (body.status === undefined) return {};
          const parsed = parseTicketStatus(body.status);
          if (!parsed) {
            throw new AppError('Invalid ticket status', 400);
          }
          return { status: parsed };
        })(),
        ...(typeof body.purchasePrice === 'number' && { purchasePrice: body.purchasePrice }),
        ...(typeof body.confirmationNumber === 'string' && { confirmationNumber: body.confirmationNumber.trim() || null }),
        ...(typeof body.notes === 'string' && { notes: body.notes.trim() || null }),
      },
      include: { event: { include: { artist: true, venue: true } } },
    });

    // If GA was turned on, clear seat fields.
    if (isGeneralAdmission === true) {
      const cleared = await prisma.userTicket.update({
        where: { id },
        data: { section: null, row: null, seat: null },
        include: { event: { include: { artist: true, venue: true } } },
      });
      return ticketToPayload(cleared);
    }

    return ticketToPayload(updated);
  } catch (error) {
    if (isDbUnavailable(error)) {
      reply.status(503);
      return { error: 'Service unavailable' };
    }
    req.log.error({ error }, 'Update ticket error');
    reply.status(500);
    return { error: 'Failed to update ticket' };
  }
});

// DELETE /tickets/:id - Delete ticket
app.delete('/tickets/:id', async (req, reply) => {
  try {
    const userId = requireAccessUserId(req as any);
    const { id } = req.params as { id: string };

    const existing = await prisma.userTicket.findFirst({ where: { id, userId }, select: { id: true } });
    if (!existing) {
      reply.status(404);
      return { error: 'Ticket not found' };
    }

    await prisma.userTicket.delete({ where: { id } });
    return { success: true };
  } catch (error) {
    if (isDbUnavailable(error)) {
      reply.status(503);
      return { error: 'Service unavailable' };
    }
    req.log.error({ error }, 'Delete ticket error');
    reply.status(500);
    return { error: 'Failed to delete ticket' };
  }
});

// POST /tickets/:id/sell - Mark for sale (Phase 2 prep)
app.post('/tickets/:id/sell', async (req, reply) => {
  try {
    const userId = requireAccessUserId(req as any);
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as { askingPrice?: number };
    const askingPrice = typeof body.askingPrice === 'number' ? body.askingPrice : NaN;
    if (!Number.isFinite(askingPrice) || askingPrice <= 0) {
      reply.status(400);
      return { error: 'askingPrice must be a positive number' };
    }

    const ticket = await prisma.userTicket.findFirst({
      where: { id, userId },
      include: { event: { include: { artist: true, venue: true } } },
    });
    if (!ticket) {
      reply.status(404);
      return { error: 'Ticket not found' };
    }

    const updated = await prisma.userTicket.update({
      where: { id },
      data: { status: 'SELLING', askingPrice },
      include: { event: { include: { artist: true, venue: true } } },
    });

    return ticketToPayload(updated);
  } catch (error) {
    if (isDbUnavailable(error)) {
      reply.status(503);
      return { error: 'Service unavailable' };
    }
    req.log.error({ error }, 'Mark for sale error');
    reply.status(500);
    return { error: 'Failed to update ticket' };
  }
});

// DELETE /tickets/:id/sell - Cancel sale listing
app.delete('/tickets/:id/sell', async (req, reply) => {
  try {
    const userId = requireAccessUserId(req as any);
    const { id } = req.params as { id: string };

    const ticket = await prisma.userTicket.findFirst({
      where: { id, userId },
      include: { event: { include: { artist: true, venue: true } } },
    });
    if (!ticket) {
      reply.status(404);
      return { error: 'Ticket not found' };
    }

    const updated = await prisma.userTicket.update({
      where: { id },
      data: { status: 'KEEPING', askingPrice: null },
      include: { event: { include: { artist: true, venue: true } } },
    });

    return ticketToPayload(updated);
  } catch (error) {
    if (isDbUnavailable(error)) {
      reply.status(503);
      return { error: 'Service unavailable' };
    }
    req.log.error({ error }, 'Cancel sale error');
    reply.status(500);
    return { error: 'Failed to update ticket' };
  }
});

// ==================== UNIFIED SEARCH ROUTES ====================

// GET /search?q=&type=all|artists|venues|events|users&limit=
app.get('/search', async (req, reply) => {
  try {
    const userId = requireAccessUserId(req as any);
    const q = (req.query ?? {}) as { q?: string; type?: string; limit?: string };

    const raw = typeof q.q === 'string' ? q.q : '';
    const query = raw.trim();
    if (!query) {
      return { artists: [], venues: [], events: [], users: [], totalCount: 0 };
    }

    const type = typeof q.type === 'string' ? q.type : undefined;
    const limitRaw = Number(q.limit ?? 20);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(50, limitRaw)) : 20;
    const now = new Date();

    const results: {
      artists: Array<{ id: string; name: string; imageUrl?: string; genres?: string[]; upcomingEventCount?: number }>;
      venues: Array<{ id: string; name: string; city: string; state?: string; imageUrl?: string; upcomingEventCount?: number }>;
      events: Array<{
        id: string;
        name: string;
        date: string;
        imageUrl?: string;
        artist: { id: string; name: string };
        venue: { id: string; name: string; city: string };
        isUpcoming: boolean;
      }>;
      users: Array<{ id: string; username: string; displayName?: string; avatarUrl?: string; showCount: number; isFollowing: boolean }>;
      totalCount: number;
    } = { artists: [], venues: [], events: [], users: [], totalCount: 0 };

    // Artists
    if (!type || type === 'all' || type === 'artists') {
      const artists = await prisma.artist.findMany({
        where: { name: { contains: query, mode: 'insensitive' } },
        select: { id: true, name: true, imageUrl: true, genres: true },
        orderBy: { name: 'asc' },
        take: limit,
      });

      const artistIds = artists.map((a) => a.id);
      const upcomingCounts =
        artistIds.length === 0
          ? []
          : await prisma.event.groupBy({
              by: ['artistId'],
              where: { artistId: { in: artistIds }, date: { gte: now } },
              _count: { _all: true },
            });
      const upcomingCountByArtistId = new Map(upcomingCounts.map((r) => [r.artistId, r._count._all]));

      results.artists = artists.map((a) => ({
        id: a.id,
        name: a.name,
        imageUrl: a.imageUrl ?? undefined,
        genres: a.genres?.length ? a.genres : [],
        upcomingEventCount: upcomingCountByArtistId.get(a.id) ?? 0,
      }));
    }

    // Venues
    if (!type || type === 'all' || type === 'venues') {
      const venues = await prisma.venue.findMany({
        where: {
          OR: [{ name: { contains: query, mode: 'insensitive' } }, { city: { contains: query, mode: 'insensitive' } }],
        },
        select: { id: true, name: true, city: true, state: true, imageUrl: true },
        orderBy: { name: 'asc' },
        take: limit,
      });

      const venueIds = venues.map((v) => v.id);
      const upcomingCounts =
        venueIds.length === 0
          ? []
          : await prisma.event.groupBy({
              by: ['venueId'],
              where: { venueId: { in: venueIds }, date: { gte: now } },
              _count: { _all: true },
            });
      const upcomingCountByVenueId = new Map(upcomingCounts.map((r) => [r.venueId, r._count._all]));

      results.venues = venues.map((v) => ({
        id: v.id,
        name: v.name,
        city: v.city,
        state: v.state ?? undefined,
        imageUrl: v.imageUrl ?? undefined,
        upcomingEventCount: upcomingCountByVenueId.get(v.id) ?? 0,
      }));
    }

    // Events (upcoming + past)
    if (!type || type === 'all' || type === 'events') {
      const events = await prisma.event.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { artist: { name: { contains: query, mode: 'insensitive' } } },
            { venue: { name: { contains: query, mode: 'insensitive' } } },
            { venue: { city: { contains: query, mode: 'insensitive' } } },
          ],
        },
        select: {
          id: true,
          name: true,
          date: true,
          imageUrl: true,
          artist: { select: { id: true, name: true } },
          venue: { select: { id: true, name: true, city: true } },
        },
        orderBy: { date: 'desc' },
        take: limit,
      });

      results.events = events.map((e) => ({
        id: e.id,
        name: e.name,
        date: e.date.toISOString(),
        imageUrl: e.imageUrl ?? undefined,
        artist: e.artist,
        venue: e.venue,
        isUpcoming: e.date > now,
      }));
    }

    // Users
    if (!type || type === 'all' || type === 'users') {
      const users = await prisma.user.findMany({
        where: {
          id: { not: userId },
          OR: [{ username: { contains: query, mode: 'insensitive' } }, { displayName: { contains: query, mode: 'insensitive' } }],
        },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          _count: { select: { logs: true } },
        },
        take: limit,
      });

      const userIds = users.map((u) => u.id);
      const following =
        userIds.length === 0
          ? []
          : await prisma.follow.findMany({
              where: { followerId: userId, followingId: { in: userIds } },
              select: { followingId: true },
            });
      const followingSet = new Set(following.map((f) => f.followingId));

      results.users = users.map((u) => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName ?? undefined,
        avatarUrl: u.avatarUrl ?? undefined,
        showCount: u._count.logs,
        isFollowing: followingSet.has(u.id),
      }));
    }

    results.totalCount = results.artists.length + results.venues.length + results.events.length + results.users.length;
    return results;
  } catch (error) {
    if (isDbUnavailable(error)) return { artists: [], venues: [], events: [], users: [], totalCount: 0 };
    req.log.error({ error }, 'Unified search error');
    reply.status(200);
    return { artists: [], venues: [], events: [], users: [], totalCount: 0 };
  }
});

// GET /search/trending
app.get('/search/trending', async (req, reply) => {
  try {
    // Allow local-only/dev sessions (no auth header) to render cleanly.
    void getUserIdFromRequest(req);

    const popularArtists = await prisma.artist.findMany({
      select: { id: true, name: true, imageUrl: true, genres: true },
      orderBy: { events: { _count: 'desc' } },
      take: 10,
    });

    const trendingSearches = ['Taylor Swift', 'Bad Bunny', 'Drake', 'The Weeknd', 'Morgan Wallen', 'Beyoncé', 'Ed Sheeran', 'Harry Styles'];

    return {
      artists: popularArtists.map((a) => ({
        id: a.id,
        name: a.name,
        imageUrl: a.imageUrl ?? undefined,
        genres: a.genres?.length ? a.genres : [],
      })),
      searches: trendingSearches,
    };
  } catch (error) {
    if (isDbUnavailable(error)) return { artists: [], searches: [] };
    req.log.error({ error }, 'Trending search error');
    reply.status(200);
    return { artists: [], searches: [] };
  }
});

// POST /search/log (analytics stub)
app.post('/search/log', async (req, reply) => {
  try {
    // Optional auth (we don't strictly need it for a stub).
    void getUserIdFromRequest(req);

    const body = (req.body ?? {}) as { query?: unknown };
    const query = typeof body.query === 'string' ? body.query.trim() : '';
    if (!query) {
      reply.status(400);
      return { error: 'query is required' };
    }

    // In production: persist to SearchLog / analytics pipeline.
    req.log.info({ query }, 'Search logged');
    return { success: true };
  } catch (error) {
    req.log.error({ error }, 'Search log error');
    reply.status(200);
    return { success: true };
  }
});

// ==================== ARTIST ROUTES ====================

app.get('/artists/search', async (req, reply) => {
  try {
    const q = ((req.query ?? {}) as { q?: string }).q?.trim();
    const limitRaw = ((req.query ?? {}) as { limit?: string }).limit;
    const limit = Math.max(1, Math.min(50, Number(limitRaw ?? 20)));

    if (!q) return [];

    const rows = await prisma.artist.findMany({
      where: { name: { contains: q, mode: 'insensitive' } },
      orderBy: { name: 'asc' },
      take: limit,
    });

    // If DB has few results, supplement with Ticketmaster attractions
    if (rows.length < 3) {
      const tmAttractions = await tmSearchAttractions(q, limit - rows.length);
      const existingNames = new Set(rows.map((r) => r.name.toLowerCase()));
      for (const ta of tmAttractions) {
        if (existingNames.has(ta.name.toLowerCase())) continue;
        let artist = await prisma.artist.findFirst({ where: { name: ta.name } });
        if (!artist) {
          artist = await prisma.artist.create({ data: { name: ta.name, imageUrl: ta.imageUrl, genres: ta.genres } });
        }
        rows.push(artist);
        existingNames.add(ta.name.toLowerCase());
      }
    }

    return rows.map((a) => ({
      id: a.id,
      name: a.name,
      imageUrl: a.imageUrl ?? undefined,
      genres: a.genres?.length ? a.genres : [],
      spotifyId: a.spotifyId ?? undefined,
    }));
  } catch (error) {
    if (isDbUnavailable(error)) return [];
    req.log.error({ error }, 'Artist search error');
    reply.status(500);
    return { error: 'Failed to search artists' };
  }
});

// GET /artists/search/spotify - Search Spotify for artists
app.get('/artists/search/spotify', async (req, reply) => {
  try {
    const q = ((req.query ?? {}) as { q?: string }).q?.trim();
    const limitRaw = ((req.query ?? {}) as { limit?: string }).limit;
    const limit = Math.max(1, Math.min(20, Number(limitRaw ?? 10)));

    if (!q || q.length < 2) return [];

    // Get a client credentials token for Spotify API
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      req.log.warn('Spotify credentials not configured');
      // Fall back to database search
      const dbResults = await prisma.artist.findMany({
        where: { name: { contains: q, mode: 'insensitive' } },
        orderBy: { name: 'asc' },
        take: limit,
      });
      return dbResults.map((a) => ({
        id: a.id,
        name: a.name,
        imageUrl: a.imageUrl ?? null,
        genres: a.genres ?? [],
        spotifyId: a.spotifyId ?? null,
        source: 'database',
      }));
    }

    // Get client credentials token
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!tokenRes.ok) {
      req.log.error({ status: tokenRes.status }, 'Failed to get Spotify client token');
      return [];
    }

    const { access_token } = (await tokenRes.json()) as { access_token: string };

    // Search Spotify
    const searchUrl = new URL('https://api.spotify.com/v1/search');
    searchUrl.searchParams.set('q', q);
    searchUrl.searchParams.set('type', 'artist');
    searchUrl.searchParams.set('limit', String(limit));

    const searchRes = await fetch(searchUrl.toString(), {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!searchRes.ok) {
      req.log.error({ status: searchRes.status }, 'Spotify search failed');
      return [];
    }

    const data = (await searchRes.json()) as {
      artists?: {
        items?: Array<{
          id: string;
          name: string;
          images?: Array<{ url: string; width: number }>;
          genres?: string[];
          popularity?: number;
        }>;
      };
    };

    const items = data.artists?.items ?? [];

    // Map to our format and upsert to database for caching
    const results = await Promise.all(
      items.map(async (item) => {
        const imageUrl = item.images?.[0]?.url ?? null;
        const genres = item.genres ?? [];

        // Upsert to database for future reference
        const artist = await prisma.artist.upsert({
          where: { spotifyId: item.id },
          create: {
            name: item.name,
            spotifyId: item.id,
            imageUrl,
            genres,
          },
          update: {
            name: item.name,
            imageUrl: imageUrl || undefined,
            genres: genres.length > 0 ? genres : undefined,
          },
        });

        return {
          id: artist.id,
          name: artist.name,
          imageUrl: artist.imageUrl ?? null,
          genres: artist.genres ?? [],
          spotifyId: artist.spotifyId ?? null,
          source: 'spotify',
        };
      })
    );

    return results;
  } catch (error) {
    req.log.error({ error }, 'Spotify artist search error');
    // Keep response stable for the mobile UI.
    reply.status(200);
    return [];
  }
});

app.get('/artists/:id', async (req, reply) => {
  try {
    const { id } = req.params as { id: string };
    const viewerId = getUserIdFromRequest(req);

    const artist = await prisma.artist.findUnique({
      where: { id },
    });
    if (!artist) {
      reply.status(404);
      return { error: 'Artist not found' };
    }

    const [followerCount, totalLogs, avgAgg] = await Promise.all([
      prisma.userArtistFollow.count({ where: { artistId: id } }),
      prisma.userLog.count({ where: { event: { artistId: id } } }),
      prisma.userLog.aggregate({
        where: { event: { artistId: id }, rating: { not: null } },
        _avg: { rating: true },
      }),
    ]);

    let isFollowing = false;
    let userShowCount = 0;
    let userFirstShow: { eventId: string; date: string; venueName: string; venueCity: string } | undefined;
    let userLastShow: { eventId: string; date: string; venueName: string; venueCity: string } | undefined;
    let friendsWhoSaw: Array<{
      id: string;
      username: string;
      displayName?: string | null;
      avatarUrl?: string | null;
      showCount: number;
      lastShow?: { date: string; venueName: string };
    }> = [];

    if (viewerId) {
      const [followRow, userLogs, following] = await Promise.all([
        prisma.userArtistFollow.findUnique({
          where: { userId_artistId: { userId: viewerId, artistId: id } },
          select: { id: true },
        }),
        prisma.userLog.findMany({
          where: { userId: viewerId, event: { artistId: id } },
          include: { event: { include: { venue: true } } },
          orderBy: { event: { date: 'asc' } },
        }),
        prisma.follow.findMany({
          where: { followerId: viewerId },
          select: { followingId: true },
        }),
      ]);

      isFollowing = Boolean(followRow);
      userShowCount = userLogs.length;
      if (userLogs.length) {
        const first = userLogs[0]!;
        const last = userLogs[userLogs.length - 1]!;
        userFirstShow = {
          eventId: first.eventId,
          date: first.event.date.toISOString(),
          venueName: first.event.venue.name,
          venueCity: first.event.venue.city,
        };
        userLastShow = {
          eventId: last.eventId,
          date: last.event.date.toISOString(),
          venueName: last.event.venue.name,
          venueCity: last.event.venue.city,
        };
      }

      const friendIds = following.map((f) => f.followingId);
      if (friendIds.length) {
        const friendLogs = await prisma.userLog.findMany({
          where: { userId: { in: friendIds }, event: { artistId: id } },
          include: { event: { select: { date: true, venue: { select: { name: true } } } } },
        });

        const counts = new Map<string, number>();
        const lastByUser = new Map<string, { date: string; venueName: string }>();

        for (const l of friendLogs) {
          counts.set(l.userId, (counts.get(l.userId) ?? 0) + 1);
          const prev = lastByUser.get(l.userId);
          const dateIso = l.event.date.toISOString();
          if (!prev || new Date(dateIso) > new Date(prev.date)) {
            lastByUser.set(l.userId, { date: dateIso, venueName: l.event.venue.name });
          }
        }

        const friendUsers = await prisma.user.findMany({
          where: { id: { in: Array.from(counts.keys()) } },
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        });

        friendsWhoSaw = friendUsers
          .map((u) => ({
            id: u.id,
            username: u.username,
            displayName: u.displayName ?? undefined,
            avatarUrl: u.avatarUrl ?? undefined,
            showCount: counts.get(u.id) ?? 0,
            lastShow: lastByUser.get(u.id),
          }))
          .sort((a, b) => b.showCount - a.showCount);
      }
    }

    return {
      id: artist.id,
      name: artist.name,
      imageUrl: artist.imageUrl ?? undefined,
      bannerUrl: undefined,
      genres: artist.genres ?? [],
      bio: artist.bio ?? undefined,
      spotifyId: artist.spotifyId ?? undefined,
      spotifyUrl: artist.spotifyId ? `https://open.spotify.com/artist/${artist.spotifyId}` : undefined,
      appleMusicUrl: undefined,
      followerCount,
      totalLogs,
      avgRating: avgAgg._avg.rating ?? undefined,
      isFollowing,
      userShowCount,
      userFirstShow,
      userLastShow,
      friendsWhoSaw,
    };
  } catch (error) {
    if (isDbUnavailable(error)) {
      reply.status(503);
      return { error: 'Database unavailable' };
    }
    req.log.error({ error }, 'Get artist error');
    reply.status(500);
    return { error: 'Failed to load artist' };
  }
});

app.get('/artists/:id/events', async (req, reply) => {
  try {
    const { id } = req.params as { id: string };
    const q = (req.query ?? {}) as { upcoming?: string; limit?: string; offset?: string };
    const upcoming = q.upcoming !== 'false';
    const limit = Math.max(1, Math.min(50, Number(q.limit ?? 20)));
    const offset = Math.max(0, Number(q.offset ?? 0));
    const userId = getUserIdFromRequest(req);

    const now = new Date();
    const events = await prisma.event.findMany({
      where: { artistId: id, ...(upcoming ? { date: { gte: now } } : { date: { lt: now } }) },
      include: { venue: true, _count: { select: { logs: true } } },
      orderBy: { date: upcoming ? 'asc' : 'desc' },
      take: limit,
      skip: offset,
    });

    const interestedIds = new Set<string>();
    const loggedIds = new Set<string>();
    if (userId && events.length) {
      const [interestedRows, loggedRows] = await Promise.all([
        prisma.userInterested.findMany({
          where: { userId, eventId: { in: events.map((e) => e.id) } },
          select: { eventId: true },
        }),
        prisma.userLog.findMany({
          where: { userId, eventId: { in: events.map((e) => e.id) } },
          select: { eventId: true },
        }),
      ]);
      for (const r of interestedRows) interestedIds.add(r.eventId);
      for (const r of loggedRows) loggedIds.add(r.eventId);
    }

    // Friends going = count of people you follow who marked interested.
    const friendsGoingCountByEvent: Record<string, number> = {};
    if (userId && events.length) {
      const following = await prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      });
      const friendIds = following.map((f) => f.followingId);
      if (friendIds.length) {
        const friendInterested = await prisma.userInterested.findMany({
          where: { userId: { in: friendIds }, eventId: { in: events.map((e) => e.id) } },
          select: { eventId: true },
        });
        for (const fi of friendInterested) {
          friendsGoingCountByEvent[fi.eventId] = (friendsGoingCountByEvent[fi.eventId] ?? 0) + 1;
        }
      }
    }

    return events.map((e) => ({
      id: e.id,
      name: e.name,
      date: e.date.toISOString(),
      venue: {
        id: e.venue.id,
        name: e.venue.name,
        city: e.venue.city,
        state: e.venue.state ?? undefined,
      },
      ticketUrl: e.ticketUrl ?? undefined,
      isInterested: interestedIds.has(e.id),
      userLogged: loggedIds.has(e.id),
      logCount: e._count.logs,
      friendsGoing: friendsGoingCountByEvent[e.id] ?? 0,
    }));
  } catch (error) {
    if (isDbUnavailable(error)) return [];
    req.log.error({ error }, 'Get artist events error');
    reply.status(500);
    return { error: 'Failed to load artist events' };
  }
});

// GET /artists/:id/tours - tours with event counts + computed avg score
// (avg of UserLog.score over the tour's events), newest tour first.
app.get('/artists/:id/tours', async (req, reply) => {
  try {
    const { id } = req.params as { id: string };

    const tours = await prisma.tour.findMany({
      where: { artistId: id },
      include: { _count: { select: { events: true } } },
      orderBy: [{ year: 'desc' }, { startDate: 'desc' }],
    });

    const scoreAggs = await Promise.all(
      tours.map((t) =>
        prisma.userLog.aggregate({
          where: { event: { tourId: t.id }, score: { not: null } },
          _avg: { score: true },
          _count: { score: true },
        })
      )
    );

    return tours.map((t, i) => ({
      id: t.id,
      name: t.name,
      year: t.year ?? undefined,
      startDate: t.startDate ? t.startDate.toISOString() : undefined,
      endDate: t.endDate ? t.endDate.toISOString() : undefined,
      imageUrl: t.imageUrl ?? undefined,
      eventCount: t._count.events,
      avgScore: scoreAggs[i]!._avg.score ?? undefined,
      scoredLogCount: scoreAggs[i]!._count.score,
    }));
  } catch (error) {
    if (isDbUnavailable(error)) return [];
    req.log.error({ error }, 'Get artist tours error');
    reply.status(500);
    return { error: 'Failed to load artist tours' };
  }
});

// ==================== WHO-SAW FACEPILES ====================
// People the viewer can discover who logged a show matching `eventWhere`.
// There is no same-show-radius enforcement helper yet (see the discovery
// settings note near PATCH /users/me/discovery), so discovery here is
// degree <= 2 only, with per-log visibility respected via degreeAudienceWhere.

type WhoSawAttendedEvent = { eventId: string; name: string; venueName: string; city: string; date: string };

type WhoSawPerson = FacePerson & { attendedEvents?: WhoSawAttendedEvent[] };

async function buildWhoSawPayload(
  viewerId: string,
  eventWhere: Prisma.EventWhereInput,
  opts: { includeEvents?: boolean } = {}
) {
  const degrees = await getViewerDegrees(viewerId);
  const audience = degreeAudienceWhere(degrees);
  if (!audience.length) return { people: [] as WhoSawPerson[], totalCount: 0 };

  const rows = await prisma.userLog.findMany({
    where: { event: eventWhere, OR: audience },
    distinct: ['userId'],
    select: { userId: true, user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
  });

  // Everyone here matched the degree-scoped audience, so degreeOf is defined.
  const people: WhoSawPerson[] = rows
    .map((r) => toFacePerson(r.user, degrees.degreeOf(r.user.id)!))
    .sort((a, b) => a.degree - b.degree)
    .slice(0, 12);

  // Tour context: attach which matching shows each surfaced person attended,
  // under the same viewer-relative audience filter as membership — logs the
  // viewer can't see don't surface here either.
  if (opts.includeEvents && people.length) {
    const logRows = await prisma.userLog.findMany({
      where: { userId: { in: people.map((p) => p.id) }, event: eventWhere, OR: audience },
      select: {
        userId: true,
        event: { select: { id: true, name: true, date: true, venue: { select: { name: true, city: true } } } },
      },
      orderBy: { event: { date: 'asc' } },
    });
    const eventsByUser = new Map<string, WhoSawAttendedEvent[]>();
    for (const r of logRows) {
      const list = eventsByUser.get(r.userId) ?? [];
      list.push({
        eventId: r.event.id,
        name: r.event.name,
        venueName: r.event.venue.name,
        city: r.event.venue.city,
        date: r.event.date.toISOString(),
      });
      eventsByUser.set(r.userId, list);
    }
    for (const p of people) p.attendedEvents = eventsByUser.get(p.id) ?? [];
  }

  return { people, totalCount: rows.length };
}

// GET /artists/:id/who-saw - discoverable people who logged this artist.
app.get('/artists/:id/who-saw', async (req) => {
  const viewerId = requireAccessUserId(req as any);
  const { id } = req.params as { id: string };
  return await buildWhoSawPayload(viewerId, { artistId: id });
});

// GET /tours/:id - tour detail + its events (with per-event logCount/avgScore,
// batched via groupBy rather than one query per event).
app.get('/tours/:id', async (req) => {
  requireAccessUserId(req as any);
  const { id } = req.params as { id: string };

  const tour = await prisma.tour.findUnique({
    where: { id },
    include: { artist: { select: { id: true, name: true } } },
  });
  if (!tour) throw new AppError('Tour not found', 404);

  const events = await prisma.event.findMany({
    where: { tourId: id },
    include: { venue: { select: { id: true, name: true, city: true } } },
    orderBy: { date: 'asc' },
  });

  const eventIds = events.map((e) => e.id);
  const logAgg = eventIds.length
    ? await prisma.userLog.groupBy({
        by: ['eventId'],
        where: { eventId: { in: eventIds } },
        _count: { _all: true },
        _avg: { score: true },
      })
    : [];
  const aggByEvent = new Map(logAgg.map((a) => [a.eventId, a]));

  return {
    tour: {
      id: tour.id,
      name: tour.name,
      year: tour.year ?? undefined,
      artist: { id: tour.artist.id, name: tour.artist.name },
    },
    events: events.map((e) => {
      const agg = aggByEvent.get(e.id);
      return {
        id: e.id,
        name: e.name,
        date: e.date.toISOString(),
        venue: { id: e.venue.id, name: e.venue.name, city: e.venue.city },
        logCount: agg?._count._all ?? 0,
        avgScore: agg?._avg.score ?? undefined,
      };
    }),
  };
});

// GET /tours/:id/photos - PUBLIC shared log photos across all of the tour's
// events, newest first.
app.get('/tours/:id/photos', async (req) => {
  requireAccessUserId(req as any);
  const { id } = req.params as { id: string };
  const q = (req.query ?? {}) as { cursor?: string; limit?: string };
  const limit = Math.max(1, Math.min(40, Number(q.limit ?? 24)));
  const cursor = typeof q.cursor === 'string' ? q.cursor : undefined;

  const where: Prisma.LogPhotoWhereInput = {
    log: { event: { tourId: id }, visibility: 'PUBLIC', sharedAt: { not: null } },
    visibility: 'PUBLIC',
    isFlagged: false,
    // Discovery dial: exclude photos from users who opted out of galleries.
    user: { showInGalleries: true },
  };
  if (cursor) {
    const d = new Date(cursor);
    if (!Number.isNaN(d.getTime())) where.createdAt = { lt: d };
  }

  const photos = await prisma.logPhoto.findMany({
    where,
    include: { log: { select: { id: true, eventId: true, event: { select: { name: true } } } } },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
  });

  const hasMore = photos.length > limit;
  const slice = photos.slice(0, limit);

  const items = slice.map((p) => ({
    id: p.id,
    photoUrl: p.photoUrl,
    thumbnailUrl: p.thumbUrl ?? p.photoUrl,
    eventId: p.log.eventId,
    eventName: p.log.event.name,
    logId: p.log.id,
  }));

  const nextCursor = hasMore && slice.length ? slice[slice.length - 1]!.createdAt.toISOString() : null;
  return { items, nextCursor };
});

// GET /tours/:id/trends - earned hashtag HIGHLIGHTS across all of the tour's
// events: caption tags carried by >= TREND_THRESHOLD public shared logs on
// any show of the tour, count DESC. `tag` is lowercase without the leading '#'.
app.get('/tours/:id/trends', async (req) => {
  requireAccessUserId(req as any);
  const { id } = req.params as { id: string };
  return { trends: await computeTrends({ event: { tourId: id } }) };
});

// GET /tours/:id/who-saw - discoverable people who logged a show on this tour,
// each with the tour shows they attended (visibility-filtered like membership).
app.get('/tours/:id/who-saw', async (req) => {
  const viewerId = requireAccessUserId(req as any);
  const { id } = req.params as { id: string };
  return await buildWhoSawPayload(viewerId, { tourId: id }, { includeEvents: true });
});

// ==================== TOUR THREADS (Reddit-lite discussion) ====================
// Flat discussion threads on a tour: a thread is the post, its messages are
// one flat reply list (no nesting). TourThread.updatedAt doubles as the
// "last activity" clock — every new message bumps it, so the tour's thread
// list orders by it.

async function getThreadOr404(threadId: string) {
  const thread = await prisma.tourThread.findUnique({
    where: { id: threadId },
    include: { author: { select: FACE_SELECT } },
  });
  if (!thread) throw new AppError('Thread not found', 404);
  return thread;
}

function serializeThreadMessage(
  m: { id: string; text: string; createdAt: Date; author: FaceUser },
  degreeOf: DegreeOf
) {
  return {
    id: m.id,
    text: m.text,
    createdAt: m.createdAt.toISOString(),
    author: toMaybeDegreeFace(m.author, degreeOf),
  };
}

// GET /tours/:id/threads - the tour's threads, newest activity first.
app.get('/tours/:id/threads', async (req) => {
  const viewerId = requireAccessUserId(req as any);
  const { id: tourId } = req.params as { id: string };

  const tour = await prisma.tour.findUnique({ where: { id: tourId }, select: { id: true } });
  if (!tour) throw new AppError('Tour not found', 404);

  const [degrees, threads] = await Promise.all([
    getViewerDegrees(viewerId),
    prisma.tourThread.findMany({
      where: { tourId },
      include: {
        author: { select: FACE_SELECT },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 30,
    }),
  ]);

  return {
    threads: threads.map((t) => ({
      id: t.id,
      title: t.title,
      author: toMaybeDegreeFace(t.author, degrees.degreeOf),
      messageCount: t._count.messages,
      lastActivityAt: t.updatedAt.toISOString(),
      createdAt: t.createdAt.toISOString(),
    })),
  };
});

// POST /tours/:id/threads { title, text? } - start a thread (text becomes
// the first message when given).
app.post('/tours/:id/threads', async (req, reply) => {
  const userId = requireAccessUserId(req as any);
  const { id: tourId } = req.params as { id: string };
  const body = (req.body ?? {}) as { title?: unknown; text?: unknown };

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) throw new AppError('Title is required', 400);
  if (title.length > 120) throw new AppError('Title too long (max 120)', 400);

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (text.length > 1000) throw new AppError('Text too long (max 1000)', 400);

  const tour = await prisma.tour.findUnique({ where: { id: tourId }, select: { id: true } });
  if (!tour) throw new AppError('Tour not found', 404);

  const thread = await prisma.tourThread.create({
    data: {
      tourId,
      authorId: userId,
      title,
      ...(text ? { messages: { create: { authorId: userId, text } } } : {}),
    },
    include: {
      author: { select: FACE_SELECT },
      messages: { include: { author: { select: FACE_SELECT } }, orderBy: { createdAt: 'asc' } },
    },
  });

  const degrees = await getViewerDegrees(userId);
  // NOTIFY: mention
  const mentions = await resolveMentions(`${title} ${text}`, degrees.degreeOf);
  notifyMentions(mentions, { id: userId, username: thread.author.username }, `"${thread.title}"`, {
    threadId: thread.id,
    tourId,
  });

  reply.status(201);
  return {
    id: thread.id,
    title: thread.title,
    tourId: thread.tourId,
    author: toMaybeDegreeFace(thread.author, degrees.degreeOf),
    messages: thread.messages.map((m) => serializeThreadMessage(m, degrees.degreeOf)),
    createdAt: thread.createdAt.toISOString(),
    mentions,
  };
});

// GET /threads/:id - thread detail with its flat message list (oldest first).
app.get('/threads/:id', async (req) => {
  const viewerId = requireAccessUserId(req as any);
  const { id: threadId } = req.params as { id: string };

  const thread = await getThreadOr404(threadId);
  const [degrees, messages] = await Promise.all([
    getViewerDegrees(viewerId),
    prisma.threadMessage.findMany({
      where: { threadId },
      include: { author: { select: FACE_SELECT } },
      orderBy: { createdAt: 'asc' },
      take: 200,
    }),
  ]);

  return {
    id: thread.id,
    title: thread.title,
    tourId: thread.tourId,
    author: toMaybeDegreeFace(thread.author, degrees.degreeOf),
    messages: messages.map((m) => serializeThreadMessage(m, degrees.degreeOf)),
    createdAt: thread.createdAt.toISOString(),
  };
});

// POST /threads/:id/messages { text } - flat reply on a thread.
app.post('/threads/:id/messages', async (req, reply) => {
  const userId = requireAccessUserId(req as any);
  const { id: threadId } = req.params as { id: string };
  const body = (req.body ?? {}) as { text?: unknown };

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) throw new AppError('Message text is required', 400);
  if (text.length > 1000) throw new AppError('Text too long (max 1000)', 400);

  const thread = await getThreadOr404(threadId);

  const [message] = await Promise.all([
    prisma.threadMessage.create({
      data: { threadId, authorId: userId, text },
      include: { author: { select: FACE_SELECT } },
    }),
    // Bump the thread's last-activity clock (updatedAt) for list ordering.
    prisma.tourThread.update({ where: { id: threadId }, data: { updatedAt: new Date() } }),
  ]);

  const degrees = await getViewerDegrees(userId);
  // NOTIFY: mention
  const mentions = await resolveMentions(text, degrees.degreeOf);
  notifyMentions(mentions, { id: userId, username: message.author.username }, `"${thread.title}"`, {
    threadId,
    tourId: thread.tourId,
  });

  reply.status(201);
  return { ...serializeThreadMessage(message, degrees.degreeOf), mentions };
});

// POST /threads/:id/report { messageId?, reason? } - report the thread (or
// one of its messages) for moderation. Always 204; reports are write-only
// from the client's perspective.
app.post('/threads/:id/report', async (req, reply) => {
  const userId = requireAccessUserId(req as any);
  const { id: threadId } = req.params as { id: string };
  const body = (req.body ?? {}) as { messageId?: unknown; reason?: unknown };

  await getThreadOr404(threadId);

  const messageId = typeof body.messageId === 'string' && body.messageId.trim() ? body.messageId.trim() : null;
  if (messageId) {
    const message = await prisma.threadMessage.findUnique({ where: { id: messageId }, select: { threadId: true } });
    if (!message || message.threadId !== threadId) throw new AppError('Message not found in this thread', 404);
  }

  const reason = typeof body.reason === 'string' && body.reason.trim() ? body.reason.trim().slice(0, 500) : null;

  await prisma.threadReport.create({
    data: { threadId, messageId, reporterId: userId, reason },
  });

  return reply.status(204).send();
});

function toSafeIdPart(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
}

// GET /artists/:id/events/bandsintown - Get events from Bandsintown
app.get('/artists/:id/events/bandsintown', async (req, reply) => {
  try {
    const { id } = req.params as { id: string };
    const { includePast } = req.query as { includePast?: string };
    const showPast = includePast === 'true';

    // Get artist from database
    const artist = await prisma.artist.findUnique({
      where: { id },
      select: { id: true, name: true, spotifyId: true, imageUrl: true },
    });

    if (!artist) {
      reply.status(404);
      return { error: 'Artist not found' };
    }

    // Fetch from Bandsintown
    const appId = process.env.BANDSINTOWN_APP_ID || 'sticket';
    const encodedName = encodeURIComponent(artist.name);

    // Bandsintown has separate endpoints for upcoming and past events
    const url = showPast
      ? `https://rest.bandsintown.com/artists/${encodedName}/events?app_id=${appId}&date=past`
      : `https://rest.bandsintown.com/artists/${encodedName}/events?app_id=${appId}`;

    const res = await fetch(url);

    if (!res.ok) {
      req.log.warn({ status: res.status, url }, 'Bandsintown events fetch failed');
      return [];
    }

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    const events = await Promise.all(
      data.map(async (e: any) => {
        const eventId = `bit_${e.id}`;
        const externalId = String(e.id);
        const dateIso: string = typeof e.datetime === 'string' ? e.datetime : '';
        const date = new Date(dateIso);
        if (!dateIso || Number.isNaN(date.getTime())) return null;

        const venueName = String(e.venue?.name || 'Unknown Venue');
        const venueCity = String(e.venue?.city || 'Unknown');
        const venueState = e.venue?.region ? String(e.venue.region) : null;
        const venueCountry = String(e.venue?.country || 'USA');

        const venueId = `venue_${toSafeIdPart(`${venueName}_${venueCity}_${venueState ?? ''}_${venueCountry}`) || 'unknown'}`;

        // Cache venue + event in DB so /logs can reference the returned id immediately.
        await prisma.venue.upsert({
          where: { id: venueId },
          create: {
            id: venueId,
            name: venueName,
            city: venueCity,
            state: venueState,
            country: venueCountry,
          },
          update: {
            name: venueName,
            city: venueCity,
            state: venueState ?? undefined,
            country: venueCountry,
          },
        });

        const event = await prisma.event.upsert({
          where: { id: eventId },
          create: {
            id: eventId,
            name: e.title ? String(e.title) : artist.name,
            date,
            source: 'BANDSINTOWN',
            externalId,
            artistId: artist.id,
            venueId,
            ticketUrl: e.url ? String(e.url) : null,
          },
          update: {
            name: e.title ? String(e.title) : artist.name,
            date,
            source: 'BANDSINTOWN',
            externalId,
            venueId,
            ticketUrl: e.url ? String(e.url) : null,
          },
        });

        return {
          id: event.id,
          externalId,
          source: 'BANDSINTOWN',
          name: e.title || artist.name,
          date: date.toISOString(),
          artist: {
            id: artist.id,
            name: artist.name,
            imageUrl: artist.imageUrl,
            spotifyId: artist.spotifyId,
          },
          venue: {
            id: venueId,
            name: venueName,
            city: venueCity,
            state: venueState,
            country: venueCountry,
          },
          ticketUrl: e.url || null,
          lineup: Array.isArray(e.lineup) ? e.lineup : [artist.name],
        };
      })
    );

    const compact = events.filter(Boolean) as any[];

    // Sort: upcoming first (ascending), then past (descending)
    if (showPast) {
      compact.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else {
      compact.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    return compact.slice(0, 50);
  } catch (error) {
    req.log.error({ error }, 'Bandsintown events fetch error');
    reply.status(200);
    return [];
  }
});

// GET /events/search/bandsintown - Search events by artist name directly
app.get('/events/search/bandsintown', async (req, reply) => {
  try {
    const { artist, includePast } = req.query as { artist?: string; includePast?: string };

    if (!artist || artist.trim().length < 2) {
      return [];
    }

    const artistName = artist.trim();
    const showPast = includePast === 'true';
    const appId = process.env.BANDSINTOWN_APP_ID || 'sticket';
    const encodedName = encodeURIComponent(artistName);

    const url = showPast
      ? `https://rest.bandsintown.com/artists/${encodedName}/events?app_id=${appId}&date=past`
      : `https://rest.bandsintown.com/artists/${encodedName}/events?app_id=${appId}`;

    const res = await fetch(url);

    if (!res.ok) {
      req.log.warn({ status: res.status, url }, 'Bandsintown event search failed');
      return [];
    }

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    // Also fetch artist info for image
    let artistImage: string | null = null;
    try {
      const artistRes = await fetch(`https://rest.bandsintown.com/artists/${encodedName}?app_id=${appId}`);
      if (artistRes.ok) {
        const artistData = await artistRes.json();
        artistImage = artistData.image_url || artistData.thumb_url || null;
      }
    } catch {
      // Ignore
    }

    // Ensure artist exists so returned event IDs can be logged.
    const dbArtist =
      (await prisma.artist.findFirst({
        where: { name: { equals: artistName, mode: 'insensitive' } },
        select: { id: true, name: true, spotifyId: true, imageUrl: true },
      })) ??
      (await prisma.artist.create({
        data: { name: artistName, imageUrl: artistImage ?? undefined, genres: [] },
        select: { id: true, name: true, spotifyId: true, imageUrl: true },
      }));

    const events = await Promise.all(
      data.map(async (e: any) => {
        const eventId = `bit_${e.id}`;
        const externalId = String(e.id);
        const dateIso: string = typeof e.datetime === 'string' ? e.datetime : '';
        const date = new Date(dateIso);
        if (!dateIso || Number.isNaN(date.getTime())) return null;

        const venueName = String(e.venue?.name || 'Unknown Venue');
        const venueCity = String(e.venue?.city || 'Unknown');
        const venueState = e.venue?.region ? String(e.venue.region) : null;
        const venueCountry = String(e.venue?.country || 'USA');

        const venueId = `venue_${toSafeIdPart(`${venueName}_${venueCity}_${venueState ?? ''}_${venueCountry}`) || 'unknown'}`;

        await prisma.venue.upsert({
          where: { id: venueId },
          create: {
            id: venueId,
            name: venueName,
            city: venueCity,
            state: venueState,
            country: venueCountry,
          },
          update: {
            name: venueName,
            city: venueCity,
            state: venueState ?? undefined,
            country: venueCountry,
          },
        });

        const event = await prisma.event.upsert({
          where: { id: eventId },
          create: {
            id: eventId,
            name: e.title ? String(e.title) : artistName,
            date,
            source: 'BANDSINTOWN',
            externalId,
            artistId: dbArtist.id,
            venueId,
            ticketUrl: e.url ? String(e.url) : null,
          },
          update: {
            name: e.title ? String(e.title) : artistName,
            date,
            source: 'BANDSINTOWN',
            externalId,
            venueId,
            artistId: dbArtist.id,
            ticketUrl: e.url ? String(e.url) : null,
          },
        });

        return {
          id: event.id,
          externalId,
          source: 'BANDSINTOWN',
          name: e.title || artistName,
          date: date.toISOString(),
          artist: {
            id: dbArtist.id,
            name: dbArtist.name,
            imageUrl: dbArtist.imageUrl ?? artistImage,
            spotifyId: dbArtist.spotifyId ?? null,
          },
          venue: {
            id: venueId,
            name: venueName,
            city: venueCity,
            state: venueState,
            country: venueCountry,
          },
          ticketUrl: e.url || null,
          lineup: Array.isArray(e.lineup) ? e.lineup : [artistName],
        };
      })
    );

    const compact = events.filter(Boolean) as any[];

    if (showPast) {
      compact.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else {
      compact.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    return compact.slice(0, 50);
  } catch (error) {
    req.log.error({ error }, 'Bandsintown event search error');
    reply.status(200);
    return [];
  }
});

app.post('/artists/:id/follow', async (req) => {
  const userId = requireAccessUserId(req as any);
  const { id: artistId } = req.params as { id: string };

  await prisma.userArtistFollow.upsert({
    where: { userId_artistId: { userId, artistId } },
    update: {},
    create: { userId, artistId },
  });

  return { success: true };
});

app.delete('/artists/:id/follow', async (req) => {
  const userId = requireAccessUserId(req as any);
  const { id: artistId } = req.params as { id: string };

  await prisma.userArtistFollow.deleteMany({ where: { userId, artistId } });
  return { success: true };
});

app.get('/artists/:id/my-history', async (req) => {
  const userId = requireAccessUserId(req as any);
  const { id: artistId } = req.params as { id: string };

  const rows = await prisma.userLog.findMany({
    where: { userId, event: { artistId } },
    include: { event: { include: { venue: true } }, photos: true },
    orderBy: { event: { date: 'desc' } },
  });

  return rows.map((log) => ({
    id: log.id,
    rating: log.rating ?? undefined,
    note: log.note ?? undefined,
    section: log.section ?? undefined,
    row: log.row ?? undefined,
    seat: log.seat ?? undefined,
    visibility: log.visibility,
    createdAt: log.createdAt.toISOString(),
    event: {
      id: log.event.id,
      name: log.event.name,
      date: log.event.date.toISOString(),
      venue: {
        id: log.event.venue.id,
        name: log.event.venue.name,
        city: log.event.venue.city,
        state: log.event.venue.state ?? undefined,
      },
    },
    photos: log.photos.map((p) => ({ id: p.id, photoUrl: p.photoUrl })),
  }));
});

// ==================== SOCIAL FEED ROUTES ====================

// GET /feed/public - Public/Discover feed (public logs, optionally filtered by followed artists)
app.get('/feed/public', async (req) => {
  const viewerId = getUserIdFromRequest(req);
  const q = (req.query ?? {}) as { city?: string; limit?: string; offset?: string };

  const limit = Math.max(1, Math.min(50, Number(q.limit ?? 20)));
  const offset = Math.max(0, Number(q.offset ?? 0));
  const city = typeof q.city === 'string' && q.city.trim() ? q.city.trim() : undefined;

  let followedArtistIds: string[] = [];
  if (viewerId) {
    const follows = await prisma.userArtistFollow.findMany({
      where: { userId: viewerId },
      select: { artistId: true },
    });
    followedArtistIds = follows.map((f) => f.artistId);
  }

  const where: Prisma.UserLogWhereInput = {
    visibility: 'PUBLIC',
  };

  if (followedArtistIds.length || city) {
    where.event = {
      ...(followedArtistIds.length ? { artistId: { in: followedArtistIds } } : {}),
      ...(city ? { venue: { city: { equals: city, mode: 'insensitive' } } } : {}),
    };
  }

  const logs = await prisma.userLog.findMany({
    where,
    include: {
      user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      event: {
        include: {
          artist: { select: { id: true, name: true, imageUrl: true } },
          venue: { select: { id: true, name: true, city: true } },
        },
      },
      photos: {
        where: { visibility: 'PUBLIC', isFlagged: false },
        take: 4,
        orderBy: { createdAt: 'desc' },
        select: { id: true, photoUrl: true, mediaKind: true, duration: true, thumbUrl: true },
      },
      comments: {
        take: 3,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
      },
      likes: {
        take: 2,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
      },
      _count: { select: { comments: true, wasThere: true, likes: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });

  const logIds = logs.map((l) => l.id);
  const [wasThereRows, likedRows] = await Promise.all([
    viewerId && logIds.length
      ? prisma.wasThere.findMany({ where: { userId: viewerId, logId: { in: logIds } }, select: { logId: true } })
      : Promise.resolve([] as { logId: string }[]),
    viewerId && logIds.length
      ? prisma.logLike.findMany({ where: { userId: viewerId, logId: { in: logIds } }, select: { logId: true } })
      : Promise.resolve([] as { logId: string }[]),
  ]);
  const wasThereSet = new Set(wasThereRows.map((w) => w.logId));
  const likedSet = new Set(likedRows.map((l) => l.logId));

  return logs.map((log) => ({
    id: `public-${log.id}`,
    type: 'log' as const,
    createdAt: log.createdAt.toISOString(),
    user: {
      id: log.user.id,
      username: log.user.username,
      displayName: log.user.displayName ?? undefined,
      avatarUrl: log.user.avatarUrl ?? undefined,
    },
    log: {
      id: log.id,
      rating: typeof log.rating === 'number' ? log.rating : undefined,
      note: log.note ?? undefined,
      visibility: log.visibility,
      photos: (log.photos ?? []).map((p) => ({
        id: p.id,
        photoUrl: p.photoUrl,
        thumbnailUrl: p.thumbUrl ?? p.photoUrl,
        mediaKind: p.mediaKind,
        duration: p.duration ?? undefined,
        thumbUrl: p.thumbUrl ?? undefined,
      })),
    },
    event: {
      id: log.event.id,
      name: log.event.name,
      date: log.event.date.toISOString(),
      artist: {
        id: log.event.artist.id,
        name: log.event.artist.name,
        imageUrl: log.event.artist.imageUrl ?? undefined,
      },
      venue: {
        id: log.event.venue.id,
        name: log.event.venue.name,
        city: log.event.venue.city,
      },
    },
    commentCount: log._count.comments,
    comments: (log.comments ?? [])
      .slice()
      .reverse()
      .map((c) => ({
        id: c.id,
        text: c.text,
        createdAt: c.createdAt.toISOString(),
        user: {
          id: c.user.id,
          username: c.user.username,
          displayName: c.user.displayName ?? undefined,
          avatarUrl: c.user.avatarUrl ?? undefined,
        },
      })),
    wasThereCount: log._count.wasThere,
    userWasThere: viewerId ? wasThereSet.has(log.id) : false,
    likeCount: log._count.likes,
    likedByMe: viewerId ? likedSet.has(log.id) : false,
    recentLikers: (log.likes ?? []).map((l) => ({
      id: l.user.id,
      username: l.user.username,
      displayName: l.user.displayName ?? undefined,
      avatarUrl: l.user.avatarUrl ?? undefined,
    })),
  }));
});

// GET /feed - Social feed (friends' logs)
app.get('/feed', async (req) => {
  const userId = requireAccessUserId(req as any);
  const q = (req.query ?? {}) as { limit?: string; before?: string; scope?: string };

  const limit = Math.max(1, Math.min(50, Number(q.limit ?? 20)));
  const before = typeof q.before === 'string' ? q.before : undefined;
  // Feed audience: 'friends' (default) = you + people you follow;
  // 'fof' additionally pulls friends-of-friends' PUBLIC posts; 'public' is
  // the open room — everyone's PUBLIC posts.
  const scope = q.scope === 'fof' ? 'fof' : q.scope === 'public' ? 'public' : 'friends';

  // Also powers the wasThereUsers degree field in the serialized items.
  const degrees = await getViewerDegrees(userId);
  const friendIds = [...degrees.firstDegree];

  // Instagram model: your own posts appear in your feed too.
  const innerCircle = [userId, ...friendIds];
  const audience: Prisma.UserLogWhereInput[] = [
    { userId: { in: innerCircle }, visibility: { in: ['PUBLIC', 'FRIENDS'] } },
  ];

  if (scope === 'fof' && degrees.secondDegree.size) {
    audience.push({ userId: { in: [...degrees.secondDegree] }, visibility: 'PUBLIC' });
  }
  if (scope === 'public') {
    // The open room — anyone's PUBLIC post, not just your graph.
    audience.push({ visibility: 'PUBLIC' });
  }

  const where: Prisma.UserLogWhereInput = { OR: audience };

  if (before) {
    const d = new Date(before);
    if (!Number.isNaN(d.getTime())) where.createdAt = { lt: d };
  }

  const logs = await prisma.userLog.findMany({
    where,
    include: FEED_LOG_INCLUDE,
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
  });

  const hasMore = logs.length > limit;
  const slice = logs.slice(0, limit);

  const logIds = slice.map((l) => l.id);
  const [wasThereRows, likedRows] = await Promise.all([
    logIds.length
      ? prisma.wasThere.findMany({
          where: { userId, logId: { in: logIds } },
          select: { logId: true },
        })
      : Promise.resolve([] as { logId: string }[]),
    logIds.length
      ? prisma.logLike.findMany({
          where: { userId, logId: { in: logIds } },
          select: { logId: true },
        })
      : Promise.resolve([] as { logId: string }[]),
  ]);
  const wasThereSet = new Set(wasThereRows.map((w) => w.logId));
  const likedSet = new Set(likedRows.map((l) => l.logId));

  const [coAuthorScores, trendingTags, sameEventAttendees] = await Promise.all([
    getCoAuthorScores(slice),
    getTrendingTags(slice),
    getSameEventAttendees(slice, userId, degrees),
  ]);
  const items = slice.map((log) =>
    serializeFeedLog(log, wasThereSet, likedSet, degrees.degreeOf, coAuthorScores, trendingTags, sameEventAttendees)
  );

  const nextCursor = hasMore && slice.length ? slice[slice.length - 1]!.createdAt.toISOString() : null;

  return { items, nextCursor, hasNoFriends: friendIds.length === 0 };
});

// GET /events/:id/feed - Public shared memory posts for this event, from ALL
// users (not just people the viewer follows). Same item shape as GET /feed.
app.get('/events/:id/feed', async (req) => {
  const viewerId = requireAccessUserId(req as any);
  const { id: eventId } = req.params as { id: string };
  const q = (req.query ?? {}) as { cursor?: string; limit?: string };
  const limit = Math.max(1, Math.min(30, Number(q.limit ?? 15)));
  const cursor = typeof q.cursor === 'string' ? q.cursor : undefined;

  const where: Prisma.UserLogWhereInput = {
    eventId,
    visibility: 'PUBLIC',
    sharedAt: { not: null },
    // Discovery dial: users who opted out of galleries are excluded from
    // event-scoped feeds/galleries entirely.
    user: { showInGalleries: true },
  };
  if (cursor) {
    const d = new Date(cursor);
    if (!Number.isNaN(d.getTime())) where.createdAt = { lt: d };
  }

  const logs = await prisma.userLog.findMany({
    where,
    include: FEED_LOG_INCLUDE,
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
  });

  const hasMore = logs.length > limit;
  const slice = logs.slice(0, limit);

  const logIds = slice.map((l) => l.id);
  const [wasThereRows, likedRows, degrees, coAuthorScores, trendingTags] = await Promise.all([
    logIds.length
      ? prisma.wasThere.findMany({ where: { userId: viewerId, logId: { in: logIds } }, select: { logId: true } })
      : Promise.resolve([] as { logId: string }[]),
    logIds.length
      ? prisma.logLike.findMany({ where: { userId: viewerId, logId: { in: logIds } }, select: { logId: true } })
      : Promise.resolve([] as { logId: string }[]),
    getViewerDegrees(viewerId),
    getCoAuthorScores(slice),
    getTrendingTags(slice),
  ]);
  const sameEventAttendees = await getSameEventAttendees(slice, viewerId, degrees);
  const wasThereSet = new Set(wasThereRows.map((w) => w.logId));
  const likedSet = new Set(likedRows.map((l) => l.logId));

  const items = slice.map((log) =>
    serializeFeedLog(log, wasThereSet, likedSet, degrees.degreeOf, coAuthorScores, trendingTags, sameEventAttendees)
  );
  const nextCursor = hasMore && slice.length ? slice[slice.length - 1]!.createdAt.toISOString() : null;

  return { items, nextCursor };
});

// GET /events/:id/trends - earned hashtag HIGHLIGHTS for this event: caption
// tags carried by >= TREND_THRESHOLD public shared logs here, count DESC.
// `tag` is lowercase without the leading '#'.
app.get('/events/:id/trends', async (req) => {
  requireAccessUserId(req as any);
  const { id: eventId } = req.params as { id: string };
  return { trends: await computeTrends({ eventId }) };
});

// GET /events/:id/seat-sections - photos + ratings grouped by seat section
// for this event, combining SeatView entries (photo-rating combo posts) with
// section-tagged photos pulled from publicly shared logs.
app.get('/events/:id/seat-sections', async (req) => {
  requireAccessUserId(req as any);
  const { id: eventId } = req.params as { id: string };

  const [seatViews, logPhotos] = await Promise.all([
    prisma.seatView.findMany({
      // Respect the showInGalleries discovery dial for both sources below.
      where: { eventId, user: { showInGalleries: true } },
      select: { id: true, section: true, row: true, photoUrl: true, thumbnailUrl: true, rating: true, createdAt: true },
    }),
    prisma.logPhoto.findMany({
      where: {
        log: { eventId, section: { not: null }, visibility: 'PUBLIC', sharedAt: { not: null } },
        user: { showInGalleries: true },
      },
      select: {
        id: true,
        photoUrl: true,
        thumbUrl: true,
        createdAt: true,
        log: { select: { section: true, row: true } },
      },
    }),
  ]);

  type PhotoEntry = { id: string; photoUrl: string; thumbnailUrl?: string; source: 'seatview' | 'log'; createdAt: Date };
  type SectionGroup = { display: string; rows: Set<string>; ratings: number[]; photos: PhotoEntry[] };
  const groups = new Map<string, SectionGroup>();

  function getGroup(rawSection: string): SectionGroup {
    const display = rawSection.trim();
    const key = display.toUpperCase();
    let g = groups.get(key);
    if (!g) {
      g = { display, rows: new Set(), ratings: [], photos: [] };
      groups.set(key, g);
    }
    return g;
  }

  for (const v of seatViews) {
    if (!v.section?.trim()) continue;
    const g = getGroup(v.section);
    if (v.row?.trim()) g.rows.add(v.row.trim());
    if (typeof v.rating === 'number') g.ratings.push(v.rating);
    if (v.photoUrl) {
      g.photos.push({
        id: v.id,
        photoUrl: v.photoUrl,
        thumbnailUrl: v.thumbnailUrl ?? undefined,
        source: 'seatview',
        createdAt: v.createdAt,
      });
    }
  }

  for (const p of logPhotos) {
    const section = p.log.section;
    if (!section?.trim()) continue;
    const g = getGroup(section);
    if (p.log.row?.trim()) g.rows.add(p.log.row.trim());
    g.photos.push({
      id: p.id,
      photoUrl: p.photoUrl,
      thumbnailUrl: p.thumbUrl ?? undefined,
      source: 'log',
      createdAt: p.createdAt,
    });
  }

  const sections = Array.from(groups.values())
    .map((g) => {
      const sortedPhotos = g.photos.slice().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      const avgRating = g.ratings.length ? g.ratings.reduce((s, r) => s + r, 0) / g.ratings.length : undefined;
      return {
        section: g.display,
        row: g.rows.size === 1 ? Array.from(g.rows)[0] : undefined,
        photoCount: g.photos.length,
        avgRating,
        photos: sortedPhotos.slice(0, 6).map((p) => ({
          id: p.id,
          photoUrl: p.photoUrl,
          thumbnailUrl: p.thumbnailUrl ?? p.photoUrl,
          source: p.source,
        })),
      };
    })
    .sort(
      (a, b) =>
        b.photoCount - a.photoCount || (b.avgRating ?? -1) - (a.avgRating ?? -1) || a.section.localeCompare(b.section)
    );

  return { sections };
});

// ==================== LOG ROUTES ====================

app.get('/logs/check', async (req) => {
  const userId = requireAccessUserId(req as any);
  const eventId = ((req.query ?? {}) as { eventId?: string }).eventId;
  if (!eventId) throw new AppError('eventId is required', 400);

  const existing = await prisma.userLog.findUnique({
    where: { userId_eventId: { userId, eventId } },
    select: { id: true },
  });

  return { logged: Boolean(existing), logId: existing?.id };
});

app.post('/logs', async (req, reply) => {
  try {
    const userId = requireAccessUserId(req as any);
    const body = (req.body ?? {}) as {
      eventId?: string;
      rating?: number;
      note?: string;
      section?: string;
      row?: string;
      seat?: string;
      visibility?: 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
    };

    const eventId = body.eventId;
    if (!eventId) throw new AppError('eventId is required', 400);

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, artistId: true, venueId: true, date: true },
    });
    if (!event) throw new AppError('Event not found', 404);

    const note = typeof body.note === 'string' ? body.note : null;
    const hasReview = Boolean(note && note.trim().length > 0);
    const { start: monthStart, end: monthEnd } = monthRange(event.date);

    // Server-authoritative XP inputs, derived from the user's real history
    // *before* this log exists — so "new venue / new artist / first log of
    // the month" bonuses reflect prior state only.
    const [venueLogCount, artistLogCount, monthLogCount, scoredLogCount, me] = await Promise.all([
      prisma.userLog.count({ where: { userId, event: { venueId: event.venueId } } }),
      prisma.userLog.count({ where: { userId, event: { artistId: event.artistId } } }),
      prisma.userLog.count({ where: { userId, event: { date: { gte: monthStart, lt: monthEnd } } } }),
      // Whether the user already has any scored logs — tells the client
      // whether the post-create flow should start the compare loop
      // (GET next-opponent -> POST compare -> POST score) or go straight to
      // the first-ever "vibe" score via POST /logs/:id/score.
      prisma.userLog.count({ where: { userId, score: { not: null } } }),
      // Privacy: when the client omits visibility, fall back to the user's
      // defaultLogVisibility preference rather than a hardcoded PUBLIC.
      prisma.user.findUnique({ where: { id: userId }, select: { defaultLogVisibility: true } }),
    ]);

    const xpInputs = {
      isNewVenue: venueLogCount === 0,
      isNewArtist: artistLogCount === 0,
      hasReview,
      // Photos are attached via a follow-up POST /logs/:id/photos call once
      // the client has this log's id, so a freshly created log never has any
      // yet. Left here (rather than hardcoded at the call site) so this
      // stays correct if log creation ever accepts inline photos.
      hasPhoto: false,
      firstOfMonth: monthLogCount === 0,
    };
    const xpGain = computeLogXp(xpInputs);
    const xpReason = buildXpReason(xpInputs);

    const { created, xpAfter } = await prisma.$transaction(async (tx) => {
      const created = await tx.userLog.create({
        data: {
          userId,
          eventId,
          rating: typeof body.rating === 'number' ? body.rating : null,
          note,
          section: typeof body.section === 'string' ? body.section : null,
          row: typeof body.row === 'string' ? body.row : null,
          seat: typeof body.seat === 'string' ? body.seat : null,
          visibility: body.visibility ?? me?.defaultLogVisibility ?? 'PUBLIC',
        },
      });

      await tx.xpEntry.create({
        data: { userId, logId: created.id, amount: xpGain, reason: xpReason },
      });

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { xpTotal: { increment: xpGain } },
        select: { xpTotal: true },
      });

      return { created, xpAfter: updatedUser.xpTotal };
    });

    const xpBefore = xpAfter - xpGain;
    const leveledUp = levelFor(xpAfter).index > levelFor(xpBefore).index;

    const badgeResult = await checkBadges(userId, { award: true, eventId });

    reply.status(201);
    return {
      id: created.id,
      newBadges: badgeResult.newBadges,
      xpGain,
      xpBefore,
      xpAfter,
      leveledUp,
      hasScoredHistory: scoredLogCount > 0,
    };
  } catch (error) {
    // Handle "already logged" nicely
    const e = error as { code?: string };
    if (e?.code === 'P2002') throw new AppError('Already logged', 409);
    throw error;
  }
});

app.patch('/logs/:id', async (req) => {
  const userId = requireAccessUserId(req as any);
  const { id } = req.params as { id: string };
  const body = (req.body ?? {}) as {
    rating?: number | null;
    note?: string | null;
    section?: string | null;
    row?: string | null;
    seat?: string | null;
    visibility?: 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
    // Posting a "log only" entry as a shared memory. `share: true` stamps
    // sharedAt = now(); `sharedAt` also accepts an explicit ISO string or
    // null (to un-share / revert to a log-only entry).
    share?: boolean;
    sharedAt?: string | null;
  };

  const existing = await prisma.userLog.findUnique({ where: { id }, select: { userId: true } });
  if (!existing) throw new AppError('Log not found', 404);
  if (existing.userId !== userId) throw new AppError('Forbidden', 403);

  let sharedAtUpdate: Date | null | undefined;
  if (body.share === true) {
    sharedAtUpdate = new Date();
  } else if (body.sharedAt !== undefined) {
    if (body.sharedAt === null) {
      sharedAtUpdate = null;
    } else {
      const d = new Date(body.sharedAt);
      if (Number.isNaN(d.getTime())) throw new AppError('sharedAt must be a valid ISO date', 400);
      sharedAtUpdate = d;
    }
  }

  const updated = await prisma.userLog.update({
    where: { id },
    data: {
      ...(body.rating !== undefined && { rating: typeof body.rating === 'number' ? body.rating : null }),
      ...(body.note !== undefined && { note: typeof body.note === 'string' ? body.note : null }),
      ...(body.section !== undefined && { section: typeof body.section === 'string' ? body.section : null }),
      ...(body.row !== undefined && { row: typeof body.row === 'string' ? body.row : null }),
      ...(body.seat !== undefined && { seat: typeof body.seat === 'string' ? body.seat : null }),
      ...(body.visibility !== undefined && { visibility: body.visibility }),
      ...(sharedAtUpdate !== undefined && { sharedAt: sharedAtUpdate }),
    },
  });

  return { id: updated.id };
});

// ==================== LOG SCORING (compare-to-rank) ROUTES ====================

// GET /logs/:id/next-opponent - the server-picked binary-search midpoint
// candidate to compare this (unscored) log against, or null once placement
// is fully resolved (either exact by binary search convergence, or by a TIE).
app.get('/logs/:id/next-opponent', async (req) => {
  const userId = requireAccessUserId(req as any);
  const { id } = req.params as { id: string };

  const log = await prisma.userLog.findUnique({ where: { id }, select: { id: true, userId: true, score: true } });
  if (!log) throw new AppError('Log not found', 404);
  if (log.userId !== userId) throw new AppError('Forbidden', 403);
  if (typeof log.score === 'number') return { opponent: null }; // already placed — nothing left to resolve

  const placement = await computePlacement(userId, id);
  const candidate = pickMidpointCandidate(placement);

  if (!candidate) return { opponent: null };

  return {
    opponent: {
      id: candidate.id,
      score: candidate.score,
      event: {
        id: candidate.event.id,
        name: candidate.event.name,
        date: candidate.event.date.toISOString(),
      },
      photo: candidate.photos[0]?.photoUrl,
    },
  };
});

// POST /logs/:id/compare - body { opponentLogId, result: 'win'|'loss'|'tie' }
// Records an audit-trail LogComparison row. Owner-only; the opponent must be
// one of the same user's own logs and must already have a score.
app.post('/logs/:id/compare', async (req) => {
  const userId = requireAccessUserId(req as any);
  const { id } = req.params as { id: string };
  const body = (req.body ?? {}) as { opponentLogId?: string; result?: 'win' | 'loss' | 'tie' };

  const opponentLogId = body.opponentLogId;
  if (!opponentLogId) throw new AppError('opponentLogId is required', 400);
  if (opponentLogId === id) throw new AppError('opponentLogId must differ from the log being scored', 400);

  const resultMap = { win: 'WIN', loss: 'LOSS', tie: 'TIE' } as const;
  const result = body.result ? resultMap[body.result] : undefined;
  if (!result) throw new AppError("result must be 'win', 'loss', or 'tie'", 400);

  const [log, opponent] = await Promise.all([
    prisma.userLog.findUnique({ where: { id }, select: { id: true, userId: true, score: true } }),
    prisma.userLog.findUnique({ where: { id: opponentLogId }, select: { id: true, userId: true, score: true } }),
  ]);

  if (!log) throw new AppError('Log not found', 404);
  if (log.userId !== userId) throw new AppError('Forbidden', 403);
  if (typeof log.score === 'number') throw new AppError('Log is already scored', 409);

  if (!opponent) throw new AppError('Opponent log not found', 404);
  if (opponent.userId !== userId) throw new AppError('Opponent log must be one of your own logs', 403);
  if (typeof opponent.score !== 'number') throw new AppError('Opponent log must already have a score', 400);

  const priorCount = await prisma.logComparison.count({ where: { logId: id } });
  const round = priorCount + 1;

  const created = await prisma.logComparison.create({
    data: { userId, logId: id, opponentLogId, result, round },
  });

  const placementAfter = await computePlacement(userId, id);

  return {
    id: created.id,
    round: created.round,
    result: body.result,
    resolved: placementAfter.resolved,
  };
});

// POST /logs/:id/score - finalizes the score by insertion.
// First-ever scored log: body { vibe: 'bad'|'fine'|'great' } -> 3.0 | 6.5 | 8.5.
// Otherwise: placement is derived from this log's LogComparison rows (see
// computePlacement above) and must already be resolved.
app.post('/logs/:id/score', async (req) => {
  const userId = requireAccessUserId(req as any);
  const { id } = req.params as { id: string };
  const body = (req.body ?? {}) as { vibe?: 'bad' | 'fine' | 'great' };

  const log = await prisma.userLog.findUnique({ where: { id }, select: { id: true, userId: true, score: true } });
  if (!log) throw new AppError('Log not found', 404);
  if (log.userId !== userId) throw new AppError('Forbidden', 403);
  if (typeof log.score === 'number') throw new AppError('Log is already scored', 409);

  const placement = await computePlacement(userId, id);

  if (placement.candidates.length === 0) {
    const VIBE_SCORES: Record<'bad' | 'fine' | 'great', number> = { bad: 3.0, fine: 6.5, great: 8.5 };
    const vibe = body.vibe;
    if (!vibe || !(vibe in VIBE_SCORES)) {
      throw new AppError("vibe is required ('bad' | 'fine' | 'great') for your first scored log", 400);
    }

    const updated = await prisma.userLog.update({
      where: { id },
      data: { score: VIBE_SCORES[vibe], scoreRank: 0 },
      select: { id: true, score: true, scoreRank: true },
    });

    return { id: updated.id, score: updated.score, scoreRank: updated.scoreRank, rank: 1, totalScored: 1 };
  }

  if (!placement.resolved) {
    throw new AppError(
      'Placement is not resolved yet — call GET /logs/:id/next-opponent and POST /logs/:id/compare until it returns null',
      409
    );
  }

  let pos: number;
  let score: number;
  if (placement.tieIndex !== null) {
    const opponent = placement.candidates[placement.tieIndex]!;
    score = opponent.score as number;
    pos = placement.tieIndex + 1; // adjacent to (just below) the tied opponent
  } else {
    pos = placement.lo; // === placement.hi once resolved
    score = computeInsertionScore(pos, placement.candidates);
  }

  const scoreRank = computeInsertionRank(pos, placement.candidates);

  const updated = await prisma.userLog.update({
    where: { id },
    data: { score, scoreRank },
    select: { id: true, score: true, scoreRank: true },
  });

  return {
    id: updated.id,
    score: updated.score,
    scoreRank: updated.scoreRank,
    rank: pos + 1,
    totalScored: placement.candidates.length + 1,
  };
});

// GET /logs/:id - log detail (for social feed)
app.get('/logs/:id', async (req, reply) => {
  try {
    const viewerId = requireAccessUserId(req as any);
    const { id } = req.params as { id: string };

    const log = await prisma.userLog.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        event: {
          include: {
            artist: { select: { id: true, name: true, imageUrl: true } },
            venue: { select: { id: true, name: true, city: true } },
          },
        },
        photos: {
          where: { visibility: 'PUBLIC', isFlagged: false },
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: { id: true, photoUrl: true, userId: true },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
        },
        tags: {
          include: { taggedUser: { select: { id: true, username: true, avatarUrl: true } } },
          orderBy: { createdAt: 'asc' },
        },
        coAuthors: {
          where: { status: 'ACCEPTED' },
          orderBy: { invitedAt: 'asc' },
          include: { user: { select: { id: true, username: true, avatarUrl: true } } },
        },
        _count: { select: { comments: true, wasThere: true } },
      },
    });

    if (!log) {
      reply.status(404);
      return { error: 'Log not found' };
    }

    // Visibility check
    if (log.userId !== viewerId) {
      if (log.visibility === 'PRIVATE') {
        reply.status(403);
        return { error: 'Forbidden' };
      }
      if (log.visibility === 'FRIENDS') {
        const follows = await getFollowStatus(viewerId, log.userId);
        if (!follows) {
          reply.status(403);
          return { error: 'Forbidden' };
        }
      }
    }

    const coAuthorIds = (log.coAuthors ?? []).map((ca) => ca.user.id);
    const [userWasThereRow, others, degrees, coAuthorScoreRows] = await Promise.all([
      prisma.wasThere.findUnique({
        where: { userId_logId: { userId: viewerId, logId: log.id } },
        select: { id: true },
      }),
      prisma.userLog.findMany({
        where: { eventId: log.eventId, NOT: { id: log.id }, visibility: 'PUBLIC' },
        include: { user: { select: { id: true, username: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
        take: 12,
      }),
      getViewerDegrees(viewerId),
      coAuthorIds.length
        ? prisma.userLog.findMany({
            where: { eventId: log.eventId, userId: { in: coAuthorIds } },
            select: { userId: true, score: true },
          })
        : Promise.resolve([] as { userId: string; score: number | null }[]),
    ]);
    const coAuthorScoreByUser = new Map(coAuthorScoreRows.map((r) => [r.userId, r.score]));

    const allComments = (log.comments ?? []).map((c) => ({
      id: c.id,
      text: c.text,
      createdAt: c.createdAt.toISOString(),
      user: {
        id: c.user.id,
        username: c.user.username,
        displayName: c.user.displayName ?? undefined,
        avatarUrl: c.user.avatarUrl ?? undefined,
      },
    }));

    const previewComments = allComments.slice(-2);

    return {
      id: log.id,
      type: 'log' as const,
      createdAt: log.createdAt.toISOString(),
      user: {
        id: log.user.id,
        username: log.user.username,
        displayName: log.user.displayName ?? undefined,
        avatarUrl: log.user.avatarUrl ?? undefined,
      },
      log: {
        id: log.id,
        rating: typeof log.rating === 'number' ? log.rating : undefined,
        score: typeof log.score === 'number' ? log.score : undefined,
        note: log.note ?? undefined,
        visibility: log.visibility,
        photos: (log.photos ?? []).map((p) => ({ id: p.id, photoUrl: p.photoUrl, thumbnailUrl: p.photoUrl, userId: p.userId })),
        section: log.section ?? undefined,
        row: log.row ?? undefined,
        seat: log.seat ?? undefined,
        taggedFriends: (log.tags ?? []).map((t) => ({
          id: t.taggedUser.id,
          username: t.taggedUser.username,
          avatarUrl: t.taggedUser.avatarUrl ?? undefined,
        })),
      },
      coAuthors: (log.coAuthors ?? []).map((ca) => ({
        id: ca.user.id,
        username: ca.user.username,
        avatarUrl: ca.user.avatarUrl ?? undefined,
        score: coAuthorScoreByUser.get(ca.user.id) ?? null,
      })),
      event: {
        id: log.event.id,
        name: log.event.name,
        date: log.event.date.toISOString(),
        artist: {
          id: log.event.artist.id,
          name: log.event.artist.name,
          imageUrl: log.event.artist.imageUrl ?? undefined,
        },
        venue: {
          id: log.event.venue.id,
          name: log.event.venue.name,
          city: log.event.venue.city,
        },
      },
      commentCount: log._count.comments,
      comments: previewComments,
      wasThereCount: log._count.wasThere,
      userWasThere: Boolean(userWasThereRow),
      allComments,
      othersWhoWent: others.map((l) => ({
        id: l.user.id,
        username: l.user.username,
        avatarUrl: l.user.avatarUrl ?? undefined,
        rating: typeof l.rating === 'number' ? l.rating : undefined,
        degree: degrees.degreeOf(l.user.id),
      })),
    };
  } catch (error) {
    req.log.error({ error }, 'Get log detail error');
    reply.status(500);
    return { error: 'Failed to load log' };
  }
});

// GET /logs/:id/comments
app.get('/logs/:id/comments', async (req, reply) => {
  try {
    const viewerId = requireAccessUserId(req as any);
    const { id: logId } = req.params as { id: string };
    const q = (req.query ?? {}) as { limit?: string; offset?: string };
    const limit = Math.max(1, Math.min(200, Number(q.limit ?? 50)));
    const offset = Math.max(0, Number(q.offset ?? 0));

    const log = await prisma.userLog.findUnique({ where: { id: logId }, select: { userId: true, visibility: true } });
    if (!log) {
      reply.status(404);
      return { error: 'Log not found' };
    }

    if (log.userId !== viewerId) {
      if (log.visibility === 'PRIVATE') {
        reply.status(403);
        return { error: 'Forbidden' };
      }
      if (log.visibility === 'FRIENDS') {
        const follows = await getFollowStatus(viewerId, log.userId);
        if (!follows) {
          reply.status(403);
          return { error: 'Forbidden' };
        }
      }
    }

    // Top-level comments paginate; each carries its full one-level reply
    // list (replies can't have replies — enforced on POST).
    const comments = await prisma.comment.findMany({
      where: { logId, parentId: null },
      include: {
        user: { select: FACE_SELECT },
        replies: {
          include: { user: { select: FACE_SELECT } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
      skip: offset,
    });

    const serializeComment = (c: { id: string; text: string; createdAt: Date; parentId: string | null; user: FaceUser }) => ({
      id: c.id,
      text: c.text,
      createdAt: c.createdAt.toISOString(),
      parentId: c.parentId,
      user: {
        id: c.user.id,
        username: c.user.username,
        displayName: c.user.displayName ?? undefined,
        avatarUrl: c.user.avatarUrl ?? undefined,
      },
    });

    return comments.map((c) => ({
      ...serializeComment(c),
      replies: c.replies.map(serializeComment),
    }));
  } catch (error) {
    req.log.error({ error }, 'Get log comments error');
    reply.status(500);
    return { error: 'Failed to load comments' };
  }
});

// POST /logs/:id/comments
app.post('/logs/:id/comments', async (req, reply) => {
  try {
    const userId = requireAccessUserId(req as any);
    const { id: logId } = req.params as { id: string };
    const body = (req.body ?? {}) as { text?: unknown; parentId?: unknown };
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (!text) {
      reply.status(400);
      return { error: 'Comment text is required' };
    }

    const log = await prisma.userLog.findUnique({
      where: { id: logId },
      select: { id: true, userId: true, eventId: true },
    });
    if (!log) {
      reply.status(404);
      return { error: 'Log not found' };
    }

    // One-level replies: the parent must be a top-level comment on the same
    // log (no grandchildren).
    const parentId = typeof body.parentId === 'string' && body.parentId.trim() ? body.parentId.trim() : null;
    if (parentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { logId: true, parentId: true },
      });
      if (!parent || parent.logId !== logId) {
        reply.status(404);
        return { error: 'Parent comment not found' };
      }
      if (parent.parentId) {
        reply.status(400);
        return { error: 'Replies to replies are not allowed' };
      }
    }

    const comment = await prisma.comment.create({
      data: { logId, userId, text, parentId },
      include: { user: { select: FACE_SELECT } },
    });

    // NOTIFY: comment on your log (skip self-comments)
    if (log.userId !== userId) {
      void notify(log.userId, {
        type: 'comment',
        title: `@${comment.user.username} commented on your log`,
        body: text.slice(0, 140),
        data: { logId, eventId: log.eventId },
        actorId: userId,
      });
    }

    const degrees = await getViewerDegrees(userId);
    // NOTIFY: mention (the owner is excluded — they already got the comment notification)
    const mentions = await resolveMentions(text, degrees.degreeOf);
    notifyMentions(mentions, { id: userId, username: comment.user.username }, 'a comment', {
      logId,
      eventId: log.eventId,
    }, [log.userId]);

    reply.status(201);
    return {
      id: comment.id,
      text: comment.text,
      createdAt: comment.createdAt.toISOString(),
      parentId: comment.parentId,
      user: {
        id: comment.user.id,
        username: comment.user.username,
        displayName: comment.user.displayName ?? undefined,
        avatarUrl: comment.user.avatarUrl ?? undefined,
      },
      mentions,
    };
  } catch (error) {
    req.log.error({ error }, 'Post log comment error');
    reply.status(500);
    return { error: 'Failed to add comment' };
  }
});

// DELETE /logs/:id/comments/:commentId
app.delete('/logs/:id/comments/:commentId', async (req, reply) => {
  try {
    const userId = requireAccessUserId(req as any);
    const { id: logId, commentId } = req.params as { id: string; commentId: string };

    const comment = await prisma.comment.findUnique({ where: { id: commentId }, select: { id: true, logId: true, userId: true } });
    if (!comment || comment.logId !== logId) {
      reply.status(404);
      return { error: 'Comment not found' };
    }
    if (comment.userId !== userId) {
      reply.status(403);
      return { error: 'Forbidden' };
    }

    await prisma.comment.delete({ where: { id: commentId } });
    return { success: true };
  } catch (error) {
    req.log.error({ error }, 'Delete log comment error');
    reply.status(500);
    return { error: 'Failed to delete comment' };
  }
});

// POST /logs/:id/was-there
app.post('/logs/:id/was-there', async (req, reply) => {
  try {
    const userId = requireAccessUserId(req as any);
    const { id: logId } = req.params as { id: string };

    const log = await prisma.userLog.findUnique({ where: { id: logId }, select: { eventId: true, userId: true } });
    if (!log) {
      reply.status(404);
      return { error: 'Log not found' };
    }

    if (log.userId === userId) {
      reply.status(400);
      return { error: 'Cannot mark was there on your own log' };
    }

    await prisma.$transaction([
      prisma.userLog.upsert({
        where: { userId_eventId: { userId, eventId: log.eventId } },
        update: {},
        create: { userId, eventId: log.eventId, visibility: 'FRIENDS' },
      }),
      prisma.wasThere.upsert({
        where: { userId_logId: { userId, logId } },
        update: {},
        create: { userId, logId },
      }),
    ]);

    return { success: true };
  } catch (error) {
    req.log.error({ error }, 'Mark was there error');
    reply.status(500);
    return { error: 'Failed to mark was there' };
  }
});

// DELETE /logs/:id/was-there
app.delete('/logs/:id/was-there', async (req, reply) => {
  try {
    const userId = requireAccessUserId(req as any);
    const { id: logId } = req.params as { id: string };

    await prisma.wasThere.deleteMany({ where: { userId, logId } });
    return { success: true };
  } catch (error) {
    req.log.error({ error }, 'Remove was there error');
    reply.status(500);
    return { error: 'Failed to remove was there' };
  }
});

// ==================== PRESALE INTEL ====================

// ============================================
// ONBOARDING PRESALE PREVIEW
// ============================================

// POST /onboarding/presale-preview - Get presales for selected artists (during onboarding)
app.post('/onboarding/presale-preview', async (req) => {
  const body = (req.body ?? {}) as { artistNames?: string[] };
  const names = Array.isArray(body.artistNames) ? body.artistNames.map((n) => String(n).trim()).filter(Boolean) : [];

  if (!names.length) return { presales: [], hasPresales: false };

  const now = new Date();
  const filters = names.slice(0, 50).map((n) => ({ artistName: { equals: n, mode: 'insensitive' as const } }));

  const presales = await prisma.presale.findMany({
    where: {
      presaleStart: { gte: now },
      source: { in: PRESALE_SOURCES },
      OR: filters,
    },
    orderBy: { presaleStart: 'asc' },
    take: 10,
  });

  return {
    presales: presales.map((p) => ({
      id: p.id,
      eventId: p.eventId ?? undefined,
      artistName: p.artistName,
      tourName: p.tourName ?? undefined,
      venueName: p.venueName,
      venueCity: p.venueCity,
      presaleType: p.presaleType,
      presaleStart: p.presaleStart.toISOString(),
      code: p.code ?? undefined,
      ticketUrl: p.ticketUrl ?? undefined,
      signupUrl: p.signupUrl ?? undefined,
      signupDeadline: p.signupDeadline?.toISOString() ?? undefined,
    })),
    hasPresales: presales.length > 0,
  };
});

// GET /presales - Upcoming presales
app.get('/presales', async (req, reply) => {
  try {
    const userId = getUserIdFromRequest(req);
    const q = (req.query ?? {}) as { artistId?: string; limit?: string };
    const limit = Math.max(1, Math.min(200, Number(q.limit ?? 50)));

    const where: any = {
      presaleStart: { gte: new Date() },
      source: { in: PRESALE_SOURCES },
    };

    if (q.artistId) {
      try {
        const artist = await prisma.artist.findUnique({
          where: { id: q.artistId },
          select: { name: true },
        });
        if (artist) where.artistName = artist.name;
      } catch (err) {
        // If artist lookup fails, continue without filtering
        req.log.warn({ error: err, artistId: q.artistId }, 'Failed to lookup artist for presale filter');
      }
    }

    let presales;
    try {
      presales = await prisma.presale.findMany({
        where,
        orderBy: { presaleStart: 'asc' },
        take: limit,
      });
    } catch (dbError: any) {
      // If the Presale table doesn't exist or there's a DB error, return empty array
      if (isDbUnavailable(dbError)) {
        req.log.warn({ error: dbError }, 'Database unavailable for presales query, returning empty array');
        return [];
      }
      // Re-throw if it's not a DB availability issue
      throw dbError;
    }

    // Handle empty presales array
    if (presales.length === 0) {
      return [];
    }

    const base = presales.map((p) => ({
      id: p.id,
      eventId: p.eventId ?? null,
      artistName: p.artistName,
      tourName: p.tourName ?? null,
      venueName: p.venueName,
      venueCity: p.venueCity,
      venueState: p.venueState ?? null,
      eventDate: p.eventDate.toISOString(),
      presaleType: p.presaleType,
      presaleStart: p.presaleStart.toISOString(),
      presaleEnd: p.presaleEnd ? p.presaleEnd.toISOString() : null,
      onsaleStart: p.onsaleStart ? p.onsaleStart.toISOString() : null,
      code: p.code ?? null,
      signupUrl: p.signupUrl ?? null,
      signupDeadline: p.signupDeadline ? p.signupDeadline.toISOString() : null,
      ticketUrl: p.ticketUrl ?? null,
      source: p.source,
      notes: p.notes ?? null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));

    if (!userId) return base;

    // Fetch user's followed artists, alerts, and viewer degrees (for the
    // degree-1 friends-tracking overlay below)
    const [follows, alerts, degrees] = await Promise.all([
      prisma.userArtistFollow.findMany({
        where: { userId },
        select: { artist: { select: { name: true } } },
      }).catch(() => []),
      presales.length > 0
        ? prisma.presaleAlert.findMany({
            where: { userId, presaleId: { in: presales.map((p) => p.id) } },
            select: { presaleId: true },
          }).catch(() => [])
        : Promise.resolve([]),
      getViewerDegrees(userId),
    ]);

    const followedNames = new Set(follows.map((f) => f.artist.name));
    const alertedIds = new Set(alerts.map((a) => a.presaleId));

    // Degree-1 friends with a PresaleAlert row on the same presale — one
    // batched query. (userId, presaleId) is unique, so row count = distinct
    // friends; the facepile caps at 4 while the count stays exact.
    const friendIds = [...degrees.firstDegree];
    const friendAlertRows = friendIds.length
      ? await prisma.presaleAlert.findMany({
          where: { userId: { in: friendIds }, presaleId: { in: presales.map((p) => p.id) } },
          select: {
            presaleId: true,
            user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          },
        }).catch(() => [])
      : [];
    const friendsTrackingByPresale = groupFacepiles(friendAlertRows, (r) => r.presaleId, (r) => r.user, degrees.degreeOf, 4);
    const friendsTrackingCounts = new Map<string, number>();
    for (const row of friendAlertRows) {
      friendsTrackingCounts.set(row.presaleId, (friendsTrackingCounts.get(row.presaleId) ?? 0) + 1);
    }

    const enriched = base.map((p) => ({
      ...p,
      hasAlert: alertedIds.has(p.id),
      isFollowed: followedNames.has(p.artistName),
      friendsTracking: friendsTrackingByPresale.get(p.id) ?? [],
      friendsTrackingCount: friendsTrackingCounts.get(p.id) ?? 0,
    }));

    enriched.sort((a, b) => {
      const followedDelta = Number(b.isFollowed) - Number(a.isFollowed);
      if (followedDelta !== 0) return followedDelta;
      return new Date(a.presaleStart).getTime() - new Date(b.presaleStart).getTime();
    });

    return enriched;
  } catch (error: any) {
    // Log detailed error information for debugging
    req.log.error({ 
      error: error?.message,
      stack: error?.stack,
      name: error?.name,
      code: error?.code,
      meta: error?.meta,
    }, 'Get presales error');
    
    // If database is unavailable or table doesn't exist, return empty array instead of error
    if (isDbUnavailable(error) || error?.code === 'P2021' || error?.code === '42P01') {
      req.log.warn({ error }, 'Presales table unavailable, returning empty array');
      return [];
    }
    
    // For other errors, still return empty array to prevent app crashes
    // Presales are optional functionality
    req.log.warn({ error }, 'Presales endpoint error, returning empty array as fallback');
    return [];
  }
});

// GET /presales/my-artists - Presales for artists user follows
app.get('/presales/my-artists', async (req) => {
  const userId = getUserIdFromRequest(req);
  if (!userId) return [];

  const follows = await prisma.userArtistFollow.findMany({
    where: { userId },
    select: { artist: { select: { name: true } } },
  });

  if (follows.length === 0) return [];

  const artistNames = follows.map((f) => f.artist.name);

  const presales = await prisma.presale.findMany({
    where: {
      presaleStart: { gte: new Date() },
      source: { in: PRESALE_SOURCES },
      OR: artistNames.map((name) => ({
        artistName: { contains: name, mode: 'insensitive' as const },
      })),
    },
    orderBy: { presaleStart: 'asc' },
    take: 100,
  });

  const alerts = await prisma.presaleAlert.findMany({
    where: { userId, presaleId: { in: presales.map((p) => p.id) } },
    select: { presaleId: true },
  });
  const alertedIds = new Set(alerts.map((a) => a.presaleId));

  return presales.map((p) => ({
    id: p.id,
    eventId: p.eventId ?? null,
    artistName: p.artistName,
    tourName: p.tourName ?? null,
    venueName: p.venueName,
    venueCity: p.venueCity,
    venueState: p.venueState ?? null,
    eventDate: p.eventDate.toISOString(),
    presaleType: p.presaleType,
    presaleStart: p.presaleStart.toISOString(),
    presaleEnd: p.presaleEnd ? p.presaleEnd.toISOString() : null,
    onsaleStart: p.onsaleStart ? p.onsaleStart.toISOString() : null,
    code: p.code ?? null,
    signupUrl: p.signupUrl ?? null,
    signupDeadline: p.signupDeadline ? p.signupDeadline.toISOString() : null,
    ticketUrl: p.ticketUrl ?? null,
    source: p.source,
    notes: p.notes ?? null,
    hasAlert: alertedIds.has(p.id),
    isFollowed: true,
  }));
});

// GET /presales/my-alerts - User's presale alerts
app.get('/presales/my-alerts', async (req) => {
  const userId = requireAccessUserId(req as any);

  const alerts = await prisma.presaleAlert.findMany({
    where: { userId, presale: { source: { in: PRESALE_SOURCES } } },
    include: { presale: true },
    orderBy: { presale: { presaleStart: 'asc' } },
    take: 200,
  });

  return alerts.map((a) => ({
    id: a.presale.id,
    eventId: a.presale.eventId ?? null,
    artistName: a.presale.artistName,
    tourName: a.presale.tourName ?? null,
    venueName: a.presale.venueName,
    venueCity: a.presale.venueCity,
    venueState: a.presale.venueState ?? null,
    eventDate: a.presale.eventDate.toISOString(),
    presaleType: a.presale.presaleType,
    presaleStart: a.presale.presaleStart.toISOString(),
    presaleEnd: a.presale.presaleEnd ? a.presale.presaleEnd.toISOString() : null,
    onsaleStart: a.presale.onsaleStart ? a.presale.onsaleStart.toISOString() : null,
    code: a.presale.code ?? null,
    signupUrl: a.presale.signupUrl ?? null,
    signupDeadline: a.presale.signupDeadline ? a.presale.signupDeadline.toISOString() : null,
    ticketUrl: a.presale.ticketUrl ?? null,
    source: a.presale.source,
    notes: a.presale.notes ?? null,
    createdAt: a.presale.createdAt.toISOString(),
    updatedAt: a.presale.updatedAt.toISOString(),
    hasAlert: true,
  }));
});

// GET /presales/search - Search presales
app.get('/presales/search', async (req) => {
  const userId = getUserIdFromRequest(req);
  const { q, limit = '50' } = req.query as Record<string, string>;

  if (!q || q.length < 2) return [];

  const presales = await prisma.presale.findMany({
    where: {
      presaleStart: { gte: new Date() },
      source: { in: PRESALE_SOURCES },
      OR: [
        { artistName: { contains: q, mode: 'insensitive' } },
        { tourName: { contains: q, mode: 'insensitive' } },
        { venueName: { contains: q, mode: 'insensitive' } },
        { venueCity: { contains: q, mode: 'insensitive' } },
      ],
    },
    orderBy: { presaleStart: 'asc' },
    take: Math.min(parseInt(limit) || 50, 100),
  });

  let alertedIds = new Set<string>();
  let followedNames = new Set<string>();

  if (userId) {
    const [alerts, follows] = await Promise.all([
      prisma.presaleAlert.findMany({
        where: { userId, presaleId: { in: presales.map((p) => p.id) } },
        select: { presaleId: true },
      }),
      prisma.userArtistFollow.findMany({
        where: { userId },
        select: { artist: { select: { name: true } } },
      }),
    ]);
    alertedIds = new Set(alerts.map((a) => a.presaleId));
    followedNames = new Set(follows.map((f) => f.artist.name));
  }

  return presales.map((p) => ({
    id: p.id,
    eventId: p.eventId ?? null,
    artistName: p.artistName,
    tourName: p.tourName ?? null,
    venueName: p.venueName,
    venueCity: p.venueCity,
    venueState: p.venueState ?? null,
    eventDate: p.eventDate.toISOString(),
    presaleType: p.presaleType,
    presaleStart: p.presaleStart.toISOString(),
    presaleEnd: p.presaleEnd ? p.presaleEnd.toISOString() : null,
    onsaleStart: p.onsaleStart ? p.onsaleStart.toISOString() : null,
    code: p.code ?? null,
    signupUrl: p.signupUrl ?? null,
    signupDeadline: p.signupDeadline ? p.signupDeadline.toISOString() : null,
    ticketUrl: p.ticketUrl ?? null,
    source: p.source,
    notes: p.notes ?? null,
    hasAlert: alertedIds.has(p.id),
    isFollowed: followedNames.has(p.artistName),
  }));
});

// GET /presales/:id - Single presale detail
app.get('/presales/:id', async (req) => {
  const userId = getUserIdFromRequest(req);
  const { id } = req.params as { id: string };

  const presale = await prisma.presale.findUnique({ where: { id } });
  // ERP/SOS presales are ERP-internal only and never exposed to consumers.
  if (!presale || !PRESALE_SOURCES.includes(presale.source)) {
    return { error: 'Presale not found' };
  }

  let hasAlert = false;
  let isFollowed = false;

  if (userId) {
    const [alert, follow] = await Promise.all([
      prisma.presaleAlert.findUnique({ where: { userId_presaleId: { userId, presaleId: id } } }),
      prisma.userArtistFollow.findFirst({
        where: { userId, artist: { name: { contains: presale.artistName, mode: 'insensitive' } } },
      }),
    ]);
    hasAlert = !!alert;
    isFollowed = !!follow;
  }

  return {
    id: presale.id,
    eventId: presale.eventId ?? null,
    artistName: presale.artistName,
    tourName: presale.tourName ?? null,
    venueName: presale.venueName,
    venueCity: presale.venueCity,
    venueState: presale.venueState ?? null,
    eventDate: presale.eventDate.toISOString(),
    presaleType: presale.presaleType,
    presaleStart: presale.presaleStart.toISOString(),
    presaleEnd: presale.presaleEnd ? presale.presaleEnd.toISOString() : null,
    onsaleStart: presale.onsaleStart ? presale.onsaleStart.toISOString() : null,
    code: presale.code ?? null,
    signupUrl: presale.signupUrl ?? null,
    signupDeadline: presale.signupDeadline ? presale.signupDeadline.toISOString() : null,
    ticketUrl: presale.ticketUrl ?? null,
    source: presale.source,
    notes: presale.notes ?? null,
    hasAlert,
    isFollowed,
  };
});

// POST /presales/:id/alert - Set alert for presale
app.post('/presales/:id/alert', async (req) => {
  const userId = requireAccessUserId(req as any);
  const presaleId = (req.params as { id: string }).id;

  const alert = await prisma.presaleAlert.upsert({
    where: { userId_presaleId: { userId, presaleId } },
    create: { userId, presaleId },
    update: {},
  });

  return alert;
});

// DELETE /presales/:id/alert - Remove alert
app.delete('/presales/:id/alert', async (req) => {
  const userId = requireAccessUserId(req as any);
  const presaleId = (req.params as { id: string }).id;

  await prisma.presaleAlert.delete({
    where: { userId_presaleId: { userId, presaleId } },
  });

  return { success: true };
});

// ==================== SHOW MODE MEDIA ====================

// POST /show-media/upload (multipart)
app.post('/show-media/upload', async (req, reply) => {
  const userId = requireAccessUserId(req as any);

  const file = await (req as any).file();
  if (!file) throw new AppError('File is required', 400);

  const fields = (file as any).fields ?? {};
  const eventId = typeof fields.eventId?.value === 'string' ? String(fields.eventId.value).trim() : '';
  const typeRaw = typeof fields.type?.value === 'string' ? String(fields.type.value).trim() : 'photo';
  const type = typeRaw === 'video' ? 'video' : 'photo';

  if (!eventId) throw new AppError('eventId is required', 400);

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
  if (!event) throw new AppError('Event not found', 404);

  const extFromName = typeof file.filename === 'string' && file.filename.includes('.') ? file.filename.split('.').pop() : null;
  const extFromMime =
    typeof file.mimetype === 'string'
      ? file.mimetype === 'image/png'
        ? 'png'
        : file.mimetype === 'image/webp'
          ? 'webp'
          : file.mimetype === 'image/jpeg'
            ? 'jpg'
            : file.mimetype === 'video/mp4'
              ? 'mp4'
              : null
      : null;
  const ext = extFromMime || extFromName || (type === 'video' ? 'mp4' : 'jpg');

  const showMediaDir = path.join(uploadsRoot, 'show-media');
  await mkdir(showMediaDir, { recursive: true });
  const filename = `${eventId}_${Date.now()}_${randomUUID()}.${ext}`;
  const dest = path.join(showMediaDir, filename);
  await pipeline(file.file, createWriteStream(dest));

  const uri = `${getPublicBaseUrl(req as any)}/uploads/show-media/${filename}`;

  const created = await prisma.showMedia.create({
    data: {
      userId,
      eventId,
      uri,
      type,
      storagePath: `show-media/${filename}`,
    },
  });

  reply.status(201);
  return { id: created.id, uri: created.uri, type: created.type, uploadedAt: created.uploadedAt.toISOString() };
});

// GET /show-media/:eventId
app.get('/show-media/:eventId', async (req) => {
  const userId = requireAccessUserId(req as any);
  const { eventId } = req.params as { eventId: string };

  const items = await prisma.showMedia.findMany({
    where: { userId, eventId },
    orderBy: { uploadedAt: 'desc' },
    take: 200,
  });

  return items.map((m) => ({ id: m.id, uri: m.uri, type: m.type, uploadedAt: m.uploadedAt.toISOString() }));
});

// DELETE /show-media/:id
app.delete('/show-media/:id', async (req) => {
  const userId = requireAccessUserId(req as any);
  const { id } = req.params as { id: string };

  const media = await prisma.showMedia.findUnique({ where: { id } });
  if (!media) throw new AppError('Not found', 404);
  if (media.userId !== userId) throw new AppError('Forbidden', 403);

  await prisma.showMedia.delete({ where: { id } });

  if (media.storagePath) {
    const filePath = path.join(uploadsRoot, media.storagePath);
    await unlink(filePath).catch(() => undefined);
  }

  return { success: true };
});

// DELETE /logs/:id — delete a log and reverse the XP it granted.
app.delete('/logs/:id', async (req) => {
  const userId = requireAccessUserId(req as any);
  const { id: logId } = req.params as { id: string };

  const log = await prisma.userLog.findUnique({ where: { id: logId }, select: { userId: true } });
  if (!log) throw new AppError('Log not found', 404);
  if (log.userId !== userId) throw new AppError('Forbidden', 403);

  const grantedXp = await prisma.xpEntry.aggregate({
    where: { logId },
    _sum: { amount: true },
  });
  const xpToReverse = grantedXp._sum.amount ?? 0;

  await prisma.$transaction(async (tx) => {
    // These relations don't cascade in the schema; clear them explicitly.
    await tx.comment.deleteMany({ where: { logId } });
    await tx.logPhoto.deleteMany({ where: { logId } });
    // Tags, was-there, and likes cascade; xpEntries detach via SetNull.
    await tx.userLog.delete({ where: { id: logId } });

    if (xpToReverse !== 0) {
      await tx.xpEntry.create({
        data: { userId, amount: -xpToReverse, reason: 'log_deleted' },
      });
      await tx.user.update({
        where: { id: userId },
        data: { xpTotal: { decrement: xpToReverse } },
      });
    }
  });

  return { success: true, xpReversed: xpToReverse };
});

app.post('/logs/:id/photos', async (req, reply) => {
  const userId = requireAccessUserId(req as any);
  const { id: logId } = req.params as { id: string };

  const log = await prisma.userLog.findUnique({ where: { id: logId }, select: { userId: true } });
  if (!log) throw new AppError('Log not found', 404);
  if (log.userId !== userId) throw new AppError('Forbidden', 403);

  const file = await (req as any).file();
  if (!file) throw new AppError('Photo file is required', 400);

  const extFromName = typeof file.filename === 'string' && file.filename.includes('.') ? file.filename.split('.').pop() : null;
  const extFromMime =
    typeof file.mimetype === 'string'
      ? file.mimetype === 'image/png'
        ? 'png'
        : file.mimetype === 'image/webp'
          ? 'webp'
          : file.mimetype === 'image/jpeg'
            ? 'jpg'
            : null
      : null;
  const ext = extFromMime || extFromName || 'jpg';

  const photosDir = path.join(uploadsRoot, 'log-photos');
  await mkdir(photosDir, { recursive: true });
  const filename = `${logId}_${Date.now()}_${randomUUID()}.${ext}`;
  const dest = path.join(photosDir, filename);
  await pipeline(file.file, createWriteStream(dest));

  const photoUrl = `${getPublicBaseUrl(req as any)}/uploads/log-photos/${filename}`;
  const created = await prisma.logPhoto.create({
    data: { logId, userId, photoUrl, visibility: 'PUBLIC' },
  });

  // Photos arrive after log creation, so the photo XP bonus can't be granted
  // by POST /logs. Award it exactly once: on the log's first photo, provided
  // no XP entry for this log already covered a photo.
  let xpGain = 0;
  let xpAfter: number | null = null;
  const [photoCount, photoXpCount] = await Promise.all([
    prisma.logPhoto.count({ where: { logId } }),
    prisma.xpEntry.count({ where: { logId, reason: { contains: 'photo' } } }),
  ]);
  if (photoCount === 1 && photoXpCount === 0) {
    const updatedUser = await prisma.$transaction(async (tx) => {
      await tx.xpEntry.create({
        data: { userId, logId, amount: XP_PHOTO, reason: 'photo_bonus' },
      });
      return tx.user.update({
        where: { id: userId },
        data: { xpTotal: { increment: XP_PHOTO } },
        select: { xpTotal: true },
      });
    });
    xpGain = XP_PHOTO;
    xpAfter = updatedUser.xpTotal;
  }

  reply.status(201);
  return { id: created.id, photoUrl: created.photoUrl, xpGain, xpAfter };
});

// Not in MVP schema yet (friend tagging)
app.post('/logs/:id/tags', async (req, reply) => {
  const userId = requireAccessUserId(req as any);
  const { id: logId } = req.params as { id: string };

  const body = (req.body ?? {}) as { userIds?: unknown; taggedUserIds?: unknown };
  const raw = (Array.isArray(body.taggedUserIds) ? body.taggedUserIds : Array.isArray(body.userIds) ? body.userIds : []) as unknown[];
  const taggedUserIds = Array.from(new Set(raw.filter((x) => typeof x === 'string').map((x) => x.trim()).filter(Boolean)));

  if (!taggedUserIds.length) throw new AppError('userIds is required', 400);
  if (taggedUserIds.length > 20) throw new AppError('Too many tagged users', 400);

  const log = await prisma.userLog.findUnique({ where: { id: logId }, select: { id: true, userId: true } });
  if (!log) throw new AppError('Log not found', 404);
  if (log.userId !== userId) throw new AppError('Forbidden', 403);

  const existingUsers = await prisma.user.findMany({
    where: { id: { in: taggedUserIds } },
    select: { id: true },
  });
  const existingIds = new Set(existingUsers.map((u) => u.id));
  const validIds = taggedUserIds.filter((id) => existingIds.has(id) && id !== userId);

  await Promise.all(
    validIds.map((taggedUserId) =>
      prisma.logTag.upsert({
        where: { logId_taggedUserId: { logId, taggedUserId } },
        update: {},
        create: { logId, userId, taggedUserId },
      })
    )
  );

  reply.status(201);
  return { success: true, taggedUserIds: validIds };
});

// ==================== CO-AUTHORED MEMORIES ====================
// A log owner invites friends who were there to co-sign the memory. On accept,
// the shared log also surfaces on the co-author's timeline (see /users/:id/
// timeline). Mirrors the /logs/:id/tags ownership + validation style.

// POST /logs/:id/coauthors — owner invites users (creates INVITED rows).
app.post('/logs/:id/coauthors', async (req, reply) => {
  const userId = requireAccessUserId(req as any);
  const { id: logId } = req.params as { id: string };

  const body = (req.body ?? {}) as { userIds?: unknown };
  const raw = (Array.isArray(body.userIds) ? body.userIds : []) as unknown[];
  const userIds = Array.from(
    new Set(raw.filter((x) => typeof x === 'string').map((x) => (x as string).trim()).filter(Boolean))
  );

  if (!userIds.length) throw new AppError('userIds is required', 400);
  if (userIds.length > 20) throw new AppError('Too many co-authors', 400);

  const log = await prisma.userLog.findUnique({
    where: { id: logId },
    select: {
      id: true,
      userId: true,
      user: { select: { username: true } },
      event: { select: { name: true } },
    },
  });
  if (!log) throw new AppError('Log not found', 404);
  if (log.userId !== userId) throw new AppError('Forbidden', 403);

  const existingUsers = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true } });
  const existingIds = new Set(existingUsers.map((u) => u.id));
  // Skip self and any id that isn't a real user; dupes are collapsed by the set
  // above and the unique(logId,userId) upsert.
  const validIds = userIds.filter((id) => existingIds.has(id) && id !== userId);

  // Snapshot who already had an invite row so re-invites don't re-notify.
  const priorRows = validIds.length
    ? await prisma.logCoAuthor.findMany({
        where: { logId, userId: { in: validIds } },
        select: { userId: true },
      })
    : [];
  const priorIds = new Set(priorRows.map((r) => r.userId));

  await Promise.all(
    validIds.map((coAuthorUserId) =>
      prisma.logCoAuthor.upsert({
        where: { logId_userId: { logId, userId: coAuthorUserId } },
        update: {},
        create: { logId, userId: coAuthorUserId },
      })
    )
  );

  // NOTIFY: co-author invite -> each newly invited user
  const newInvitees = validIds.filter((id) => !priorIds.has(id));
  if (newInvitees.length) {
    void notifyMany(newInvitees, {
      type: 'coauthor_invite',
      title: 'Co-author invite',
      body: `@${log.user.username} added you as a co-author on ${log.event.name}`,
      data: { logId },
      actorId: userId,
    });
  }

  reply.status(201);
  return { invited: validIds };
});

// GET /logs/:id/coauthors — owner or an invitee sees the full co-author list.
app.get('/logs/:id/coauthors', async (req) => {
  const userId = requireAccessUserId(req as any);
  const { id: logId } = req.params as { id: string };

  const log = await prisma.userLog.findUnique({ where: { id: logId }, select: { id: true, userId: true } });
  if (!log) throw new AppError('Log not found', 404);

  const rows = await prisma.logCoAuthor.findMany({
    where: { logId },
    include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    orderBy: { invitedAt: 'asc' },
  });

  const isOwner = log.userId === userId;
  const isInvitee = rows.some((r) => r.user.id === userId);
  if (!isOwner && !isInvitee) throw new AppError('Forbidden', 403);

  return rows.map((r) => ({
    user: {
      id: r.user.id,
      username: r.user.username,
      displayName: r.user.displayName ?? undefined,
      avatarUrl: r.user.avatarUrl ?? undefined,
    },
    status: r.status,
  }));
});

// POST /logs/:id/coauthors/respond — the invited user accepts or declines.
app.post('/logs/:id/coauthors/respond', async (req) => {
  const userId = requireAccessUserId(req as any);
  const { id: logId } = req.params as { id: string };
  const body = (req.body ?? {}) as { accept?: unknown };
  if (typeof body.accept !== 'boolean') throw new AppError('accept (boolean) is required', 400);

  const row = await prisma.logCoAuthor.findUnique({
    where: { logId_userId: { logId, userId } },
    select: { id: true },
  });
  if (!row) throw new AppError('No co-author invite for this log', 404);

  const updated = await prisma.logCoAuthor.update({
    where: { id: row.id },
    data: { status: body.accept ? 'ACCEPTED' : 'DECLINED', respondedAt: new Date() },
    select: { logId: true, status: true },
  });

  return { logId: updated.logId, status: updated.status };
});

// GET /users/me/coauthor-invites — the viewer's pending (INVITED) invites.
app.get('/users/me/coauthor-invites', async (req) => {
  const userId = requireAccessUserId(req as any);

  const rows = await prisma.logCoAuthor.findMany({
    where: { userId, status: 'INVITED' },
    orderBy: { invitedAt: 'desc' },
    include: {
      log: {
        select: {
          id: true,
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          event: { select: { name: true } },
        },
      },
    },
  });

  return rows.map((r) => ({
    logId: r.log.id,
    eventName: r.log.event.name,
    owner: {
      id: r.log.user.id,
      username: r.log.user.username,
      displayName: r.log.user.displayName ?? undefined,
      avatarUrl: r.log.user.avatarUrl ?? undefined,
    },
    invitedAt: r.invitedAt.toISOString(),
  }));
});

// ==================== EVENT IMPORT (BANDSINTOWN) ====================

app.post('/events/import', async (req, reply) => {
  const userId = requireAccessUserId(req as any);
  void userId; // reserved for future audit/logging

  const body = (req.body ?? {}) as {
    artistName?: string;
    venueName?: string;
    venueCity?: string;
    venueCountry?: string;
    date?: string;
    title?: string;
  };

  const artistName = typeof body.artistName === 'string' ? body.artistName.trim() : '';
  const venueName = typeof body.venueName === 'string' ? body.venueName.trim() : '';
  const venueCity = typeof body.venueCity === 'string' ? body.venueCity.trim() : 'New York';
  const venueCountry = typeof body.venueCountry === 'string' ? body.venueCountry.trim() : 'US';
  const dateStr = typeof body.date === 'string' ? body.date.trim() : '';

  if (!artistName || !venueName || !dateStr) throw new AppError('artistName, venueName, and date are required', 400);
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) throw new AppError('Invalid date', 400);

  const artist =
    (await prisma.artist.findFirst({ where: { name: artistName } })) ??
    (await prisma.artist.create({ data: { name: artistName, genres: [] } }));

  const venue =
    (await prisma.venue.findFirst({ where: { name: venueName, city: venueCity } })) ??
    (await prisma.venue.create({ data: { name: venueName, city: venueCity, country: venueCountry } }));

  const event = await prisma.event.upsert({
    where: { artistId_venueId_date: { artistId: artist.id, venueId: venue.id, date } },
    update: { name: body.title || `${artist.name} at ${venue.name}` },
    create: { name: body.title || `${artist.name} at ${venue.name}`, date, artistId: artist.id, venueId: venue.id },
    include: { artist: true, venue: true },
  });

  reply.status(201);
  return { id: event.id };
});

// ==================== COMPAT ROUTES (MOBILE CHECKLIST) ====================

// Alias for checklist path: GET /users/me/spotify/top-artists
app.get('/users/me/spotify/top-artists', async (req) => {
  const userId = requireAccessUserId(req as any);
  const { spotifyToken } = await getUserWithFreshSpotifyToken(userId);
  if (!spotifyToken) throw new AppError('Spotify not connected', 400);

  const q = (req.query ?? {}) as { limit?: string; time_range?: string };
  const limit = q.limit ? Number.parseInt(q.limit, 10) : 50;
  const timeRange = (q.time_range ?? 'medium_term') as 'short_term' | 'medium_term' | 'long_term';
  return await getSpotifyTopArtists(spotifyToken, Number.isFinite(limit) ? limit : 50, timeRange);
});

// ==================== LOG LIKES ====================

// POST /logs/:id/like — Like a log
app.post('/logs/:id/like', async (req, reply) => {
  try {
    const userId = requireAccessUserId(req as any);
    const { id: logId } = req.params as { id: string };

    // Check for a live like row before the idempotent upsert: repeat POSTs
    // while liked stay silent (unlike + re-like will notify again since the
    // row was deleted).
    const [log, existingLike] = await Promise.all([
      prisma.userLog.findUnique({ where: { id: logId }, select: { userId: true, eventId: true } }),
      prisma.logLike.findUnique({ where: { userId_logId: { userId, logId } }, select: { id: true } }),
    ]);

    const like = await prisma.logLike.upsert({
      where: { userId_logId: { userId, logId } },
      create: { userId, logId },
      update: {},
    });

    // NOTIFY: first like per liker on someone else's log
    if (!existingLike && log && log.userId !== userId) {
      const liker = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } });
      if (liker) {
        void notify(log.userId, {
          type: 'like',
          title: 'New like',
          body: `@${liker.username} liked your log`,
          data: { logId, eventId: log.eventId },
          actorId: userId,
        });
      }
    }

    return { like };
  } catch (error) {
    if (isDbUnavailable(error)) {
      req.log.warn({ error }, 'DB unavailable for log like');
      reply.status(503);
      return { error: 'Service temporarily unavailable' };
    }
    throw error;
  }
});

// DELETE /logs/:id/like — Unlike a log
app.delete('/logs/:id/like', async (req, reply) => {
  try {
    const userId = requireAccessUserId(req as any);
    const { id: logId } = req.params as { id: string };

    await prisma.logLike.deleteMany({
      where: { userId, logId },
    });

    return { success: true };
  } catch (error) {
    if (isDbUnavailable(error)) {
      req.log.warn({ error }, 'DB unavailable for log unlike');
      reply.status(503);
      return { error: 'Service temporarily unavailable' };
    }
    throw error;
  }
});

// GET /logs/:id/likes — Get likes for a log
app.get('/logs/:id/likes', async (req, reply) => {
  try {
    requireAccessUserId(req as any);
    const { id: logId } = req.params as { id: string };
    const query = (req.query ?? {}) as { limit?: string; cursor?: string };
    const limit = Math.min(50, Math.max(1, Number(query.limit ?? 20)));

    const likes = await prisma.logLike.findMany({
      where: { logId },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });

    const hasMore = likes.length > limit;
    const items = hasMore ? likes.slice(0, limit) : likes;

    const showCountByUser = await getShowCounts(items.map((l) => l.userId));

    return {
      likes: items.map((l) => ({
        ...l,
        displayName: l.user.displayName ?? undefined,
        showCount: showCountByUser.get(l.userId) ?? 0,
        user: {
          ...l.user,
          displayName: l.user.displayName ?? undefined,
          showCount: showCountByUser.get(l.userId) ?? 0,
        },
      })),
      nextCursor: hasMore ? items[items.length - 1]?.id : null,
    };
  } catch (error) {
    if (isDbUnavailable(error)) {
      req.log.warn({ error }, 'DB unavailable for log likes');
      reply.status(503);
      return { error: 'Service temporarily unavailable' };
    }
    throw error;
  }
});

// ==================== EVENT CHECK-INS ====================

// POST /events/:id/checkin — Check in to an event
app.post('/events/:id/checkin', async (req, reply) => {
  try {
    const userId = requireAccessUserId(req as any);
    const { id: eventId } = req.params as { id: string };

    const checkin = await prisma.userCheckin.upsert({
      where: { userId_eventId: { userId, eventId } },
      create: { userId, eventId },
      update: {},
    });

    return { checkin };
  } catch (error) {
    if (isDbUnavailable(error)) {
      req.log.warn({ error }, 'DB unavailable for event checkin');
      reply.status(503);
      return { error: 'Service temporarily unavailable' };
    }
    throw error;
  }
});

// GET /events/:id/checkins — Get check-ins for an event
app.get('/events/:id/checkins', async (req, reply) => {
  try {
    requireAccessUserId(req as any);
    const { id: eventId } = req.params as { id: string };
    const query = (req.query ?? {}) as { limit?: string; cursor?: string };
    const limit = Math.min(50, Math.max(1, Number(query.limit ?? 20)));

    const checkins = await prisma.userCheckin.findMany({
      where: { eventId },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });

    const hasMore = checkins.length > limit;
    const items = hasMore ? checkins.slice(0, limit) : checkins;

    return {
      checkins: items,
      total: await prisma.userCheckin.count({ where: { eventId } }),
      nextCursor: hasMore ? items[items.length - 1]?.id : null,
    };
  } catch (error) {
    if (isDbUnavailable(error)) {
      req.log.warn({ error }, 'DB unavailable for event checkins');
      reply.status(503);
      return { error: 'Service temporarily unavailable' };
    }
    throw error;
  }
});

// ==================== HANG THREADS ====================

// GET /events/:id/hang — Get hang thread for an event
app.get('/events/:id/hang', async (req, reply) => {
  try {
    requireAccessUserId(req as any);
    const { id: eventId } = req.params as { id: string };
    const query = (req.query ?? {}) as { limit?: string; cursor?: string };
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 50)));

    let thread = await prisma.hangThread.findUnique({
      where: { eventId },
    });

    if (!thread) {
      return { thread: null, messages: [], nextCursor: null };
    }

    const messages = await prisma.hangMessage.findMany({
      where: { threadId: thread.id },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, limit) : messages;

    return {
      thread,
      messages: items,
      nextCursor: hasMore ? items[items.length - 1]?.id : null,
    };
  } catch (error) {
    if (isDbUnavailable(error)) {
      req.log.warn({ error }, 'DB unavailable for hang thread');
      reply.status(503);
      return { error: 'Service temporarily unavailable' };
    }
    throw error;
  }
});

// POST /events/:id/hang/messages — Post a message to hang thread
app.post('/events/:id/hang/messages', async (req, reply) => {
  try {
    const userId = requireAccessUserId(req as any);
    const { id: eventId } = req.params as { id: string };
    const body = req.body as { text?: string };

    if (!body.text?.trim()) {
      reply.status(400);
      return { error: 'Message text is required' };
    }

    // Upsert the thread (create if it doesn't exist)
    const thread = await prisma.hangThread.upsert({
      where: { eventId },
      create: { eventId },
      update: {},
    });

    const message = await prisma.hangMessage.create({
      data: {
        threadId: thread.id,
        userId,
        text: body.text.trim(),
      },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });

    return { message };
  } catch (error) {
    if (isDbUnavailable(error)) {
      req.log.warn({ error }, 'DB unavailable for hang message');
      reply.status(503);
      return { error: 'Service temporarily unavailable' };
    }
    throw error;
  }
});

// ==================== PARTY ROUTES (event meetups) ====================
// A Party is a host-run pre/post-show meetup attached to an Event. Membership
// states: HOST (creator), COHOST (promoted GOING member with host powers —
// approve/deny, invite, edit, announce; not cancel/promote), INVITED (host
// invited, hasn't answered), REQUESTED (user asked to join a PUBLIC party),
// GOING (approved / accepted), DECLINED. Cancel is soft (Party.status
// CANCELLED) so members still see the party struck through.

const PARTY_USER_SELECT = { id: true, username: true, displayName: true, avatarUrl: true } as const;

function serializePartyUser(u: { id: string; username: string; displayName: string | null; avatarUrl: string | null }) {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName ?? undefined,
    avatarUrl: u.avatarUrl ?? undefined,
  };
}

type PartyCore = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: Date | null;
  visibility: 'PUBLIC' | 'INVITE';
  status: 'ACTIVE' | 'CANCELLED';
  createdAt: Date;
  eventId: string;
  hostId: string;
  host: { id: string; username: string; displayName: string | null; avatarUrl: string | null };
};

function serializeParty(
  party: PartyCore,
  counts: { going: number; requested: number; invited: number },
  yourStatus: string | null,
  // COHOST members' users — hosts[] is [original host, ...cohosts].
  cohosts: { id: string; username: string; displayName: string | null; avatarUrl: string | null }[] = []
) {
  return {
    id: party.id,
    eventId: party.eventId,
    title: party.title,
    description: party.description ?? undefined,
    location: party.location ?? undefined,
    startsAt: party.startsAt ? party.startsAt.toISOString() : undefined,
    visibility: party.visibility,
    status: party.status,
    createdAt: party.createdAt.toISOString(),
    host: serializePartyUser(party.host),
    hosts: [party.host, ...cohosts].map(serializePartyUser),
    // counts.going includes the host.
    counts,
    yourStatus,
    // Alias of yourStatus under the role reading (HOST/COHOST/GOING/...).
    myRole: yourStatus,
  };
}

// Lightweight party row for list surfaces (/users/me/parties): host + event
// summary, no member rows.
const PARTY_LITE_INCLUDE = {
  host: { select: PARTY_USER_SELECT },
  event: {
    select: {
      id: true,
      name: true,
      date: true,
      artist: { select: { name: true } },
      venue: { select: { name: true, city: true } },
    },
  },
} satisfies Prisma.PartyInclude;
type PartyLiteRow = Prisma.PartyGetPayload<{ include: typeof PARTY_LITE_INCLUDE }>;

/** Per-party member tallies: going (HOST + GOING), requested, invited. */
async function getPartyCounts(partyIds: string[]) {
  const zero = () => ({ going: 0, requested: 0, invited: 0 });
  const map = new Map<string, ReturnType<typeof zero>>();
  for (const id of partyIds) map.set(id, zero());
  if (!partyIds.length) return map;

  const rows = await prisma.partyMember.groupBy({
    by: ['partyId', 'status'],
    where: { partyId: { in: partyIds } },
    _count: { _all: true },
  });
  for (const r of rows) {
    const c = map.get(r.partyId)!;
    if (r.status === 'HOST' || r.status === 'COHOST' || r.status === 'GOING') c.going += r._count._all;
    else if (r.status === 'REQUESTED') c.requested += r._count._all;
    else if (r.status === 'INVITED') c.invited += r._count._all;
  }
  return map;
}

/** COHOST members per party, promotion order — for hosts[] serialization. */
async function getPartyCohosts(partyIds: string[]) {
  const map = new Map<string, { id: string; username: string; displayName: string | null; avatarUrl: string | null }[]>();
  for (const id of partyIds) map.set(id, []);
  if (!partyIds.length) return map;

  const rows = await prisma.partyMember.findMany({
    where: { partyId: { in: partyIds }, status: 'COHOST' },
    include: { user: { select: PARTY_USER_SELECT } },
    orderBy: { respondedAt: 'asc' },
  });
  for (const r of rows) map.get(r.partyId)!.push(r.user);
  return map;
}

async function getPartyOr404(partyId: string) {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    include: { host: { select: PARTY_USER_SELECT } },
  });
  if (!party) throw new AppError('Party not found', 404);
  return party;
}

// Host powers (approve/deny, invite, edit, announcements): the original
// host (Party.hostId) or a COHOST member. Cancel stays hostId-only.
async function requirePartyManager(partyId: string, userId: string) {
  const party = await getPartyOr404(partyId);
  if (party.hostId === userId) return { party, role: 'HOST' as const };

  const member = await prisma.partyMember.findUnique({
    where: { partyId_userId: { partyId, userId } },
    select: { status: true },
  });
  if (member?.status !== 'COHOST') throw new AppError('Only the hosts can do that', 403);
  return { party, role: 'COHOST' as const };
}

// Recipients for party lifecycle notifications (edit / cancel / co-host
// changes): hosts + going + invited members, minus the acting user.
async function getPartyNotifyAudience(party: { id: string; hostId: string }, actorId: string) {
  const members = await prisma.partyMember.findMany({
    where: { partyId: party.id, status: { in: ['HOST', 'COHOST', 'GOING', 'INVITED'] } },
    select: { userId: true },
  });
  return [...new Set([party.hostId, ...members.map((m) => m.userId)])].filter((id) => id !== actorId);
}

// POST /events/:id/parties — create a party for an event; the creator becomes
// its HOST member.
app.post('/events/:id/parties', async (req, reply) => {
  const userId = requireAccessUserId(req as any);
  const { id: eventId } = req.params as { id: string };
  const body = (req.body ?? {}) as {
    title?: unknown;
    description?: unknown;
    location?: unknown;
    startsAt?: unknown;
    visibility?: unknown;
  };

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) throw new AppError('Title is required', 400);
  if (title.length > 80) throw new AppError('Title too long (max 80)', 400);

  const description = typeof body.description === 'string' && body.description.trim() ? body.description.trim() : null;
  const location = typeof body.location === 'string' && body.location.trim() ? body.location.trim() : null;

  let startsAt: Date | null = null;
  if (body.startsAt !== undefined && body.startsAt !== null) {
    const d = new Date(String(body.startsAt));
    if (Number.isNaN(d.getTime())) throw new AppError('startsAt must be a valid ISO date', 400);
    startsAt = d;
  }

  let visibility: 'PUBLIC' | 'INVITE' = 'PUBLIC';
  if (body.visibility !== undefined) {
    const v = typeof body.visibility === 'string' ? body.visibility.trim().toUpperCase() : '';
    if (v !== 'PUBLIC' && v !== 'INVITE') throw new AppError('visibility must be PUBLIC or INVITE', 400);
    visibility = v;
  }

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
  if (!event) throw new AppError('Event not found', 404);

  const party = await prisma.party.create({
    data: {
      eventId,
      hostId: userId,
      title,
      description,
      location,
      startsAt,
      visibility,
      members: { create: { userId, status: 'HOST', respondedAt: new Date() } },
    },
    include: { host: { select: PARTY_USER_SELECT } },
  });

  reply.status(201);
  return serializeParty(party, { going: 1, requested: 0, invited: 0 }, 'HOST');
});

// GET /events/:id/parties — public parties for the event, plus any INVITE
// parties you're a member of (any status).
app.get('/events/:id/parties', async (req) => {
  const userId = requireAccessUserId(req as any);
  const { id: eventId } = req.params as { id: string };
  const q = (req.query ?? {}) as { limit?: string; offset?: string };
  const limit = Math.max(1, Math.min(50, Number(q.limit ?? 25)));
  const offset = Math.max(0, Number(q.offset ?? 0));

  const parties = await prisma.party.findMany({
    where: {
      eventId,
      // Cancelled parties drop off the event page; members still see them
      // (struck through) in their own party lists.
      status: 'ACTIVE',
      OR: [{ visibility: 'PUBLIC' }, { members: { some: { userId } } }],
    },
    include: { host: { select: PARTY_USER_SELECT } },
    orderBy: [{ startsAt: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }],
    take: limit,
    skip: offset,
  });

  const partyIds = parties.map((p) => p.id);
  const [countsByParty, cohostsByParty, myMemberships] = await Promise.all([
    getPartyCounts(partyIds),
    getPartyCohosts(partyIds),
    partyIds.length
      ? prisma.partyMember.findMany({
          where: { userId, partyId: { in: partyIds } },
          select: { partyId: true, status: true },
        })
      : Promise.resolve([] as { partyId: string; status: string }[]),
  ]);
  const myStatusByParty = new Map(myMemberships.map((m) => [m.partyId, m.status]));

  return {
    parties: parties.map((p) =>
      serializeParty(p, countsByParty.get(p.id)!, myStatusByParty.get(p.id) ?? null, cohostsByParty.get(p.id)!)
    ),
  };
});

// GET /users/me/parties — the viewer's party dashboard for the Plan tab:
// parties they host, are going to, and are invited to, plus pending join
// requests on parties they host (answered via POST /parties/:id/respond).
app.get('/users/me/parties', async (req) => {
  const userId = requireAccessUserId(req as any);

  const [degrees, hostedParties, cohostRows, memberships, requestRows] = await Promise.all([
    getViewerDegrees(userId),
    // Hosting keys off Party.hostId (the authoritative host signal — the same
    // one every host-permission check uses), not a HOST member row.
    prisma.party.findMany({
      where: { hostId: userId },
      include: PARTY_LITE_INCLUDE,
    }),
    // Co-hosted parties land in the hosting bucket too (myStatus COHOST).
    prisma.partyMember.findMany({
      where: { userId, status: 'COHOST' },
      include: { party: { include: PARTY_LITE_INCLUDE } },
    }),
    prisma.partyMember.findMany({
      where: { userId, status: { in: ['GOING', 'INVITED'] }, party: { hostId: { not: userId } } },
      include: { party: { include: PARTY_LITE_INCLUDE } },
    }),
    // Pending requests on every party the viewer can manage (host or co-host).
    prisma.partyMember.findMany({
      where: {
        status: 'REQUESTED',
        party: {
          OR: [{ hostId: userId }, { members: { some: { userId, status: 'COHOST' } } }],
        },
      },
      include: { user: { select: PARTY_USER_SELECT }, party: { include: PARTY_LITE_INCLUDE } },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const partyIds = [
    ...new Set([
      ...hostedParties.map((p) => p.id),
      ...cohostRows.map((m) => m.partyId),
      ...memberships.map((m) => m.partyId),
      ...requestRows.map((r) => r.partyId),
    ]),
  ];
  const countsByParty = await getPartyCounts(partyIds);

  const toPartyLite = (party: PartyLiteRow, myStatus: string | null) => ({
    id: party.id,
    title: party.title,
    startsAt: party.startsAt ? party.startsAt.toISOString() : undefined,
    location: party.location ?? undefined,
    visibility: party.visibility,
    status: party.status,
    event: {
      id: party.event.id,
      name: party.event.name,
      date: party.event.date.toISOString(),
      artist: { name: party.event.artist.name },
      venue: { name: party.event.venue.name, city: party.event.venue.city },
    },
    hostId: party.hostId,
    host: {
      id: party.host.id,
      username: party.host.username,
      avatarUrl: party.host.avatarUrl ?? undefined,
    },
    goingCount: countsByParty.get(party.id)!.going,
    myStatus,
  });

  const byEventDate = (a: { event: { date: string } }, b: { event: { date: string } }) =>
    new Date(a.event.date).getTime() - new Date(b.event.date).getTime();

  const bucket = (status: 'GOING' | 'INVITED') =>
    memberships
      .filter((m) => m.status === status)
      .map((m) => toPartyLite(m.party, m.status))
      .sort(byEventDate);

  return {
    hosting: [
      ...hostedParties.map((p) => toPartyLite(p, 'HOST')),
      ...cohostRows.map((m) => toPartyLite(m.party, 'COHOST')),
    ].sort(byEventDate),
    going: bucket('GOING'),
    invited: bucket('INVITED'),
    requests: requestRows.map((r) => ({
      party: toPartyLite(r.party, 'HOST'),
      requester: {
        id: r.user.id,
        username: r.user.username,
        displayName: r.user.displayName ?? undefined,
        avatarUrl: r.user.avatarUrl ?? undefined,
        // Requesters can come from beyond the viewer's network; degree is
        // omitted when they're not within 2 hops.
        degree: degrees.degreeOf(r.user.id),
      },
    })),
  };
});

// GET /parties/:id — detail with a members preview + announcements. INVITE
// parties are only visible to their members (the host has a HOST member row).
app.get('/parties/:id', async (req) => {
  const userId = requireAccessUserId(req as any);
  const { id: partyId } = req.params as { id: string };

  const party = await getPartyOr404(partyId);

  const membership = await prisma.partyMember.findUnique({
    where: { partyId_userId: { partyId, userId } },
    select: { status: true },
  });

  if (party.visibility === 'INVITE' && !membership) {
    throw new AppError('This party is invite-only', 403);
  }

  const canManage = party.hostId === userId || membership?.status === 'COHOST';

  const [countsByParty, memberRows, announcements] = await Promise.all([
    getPartyCounts([partyId]),
    prisma.partyMember.findMany({
      // Everyone sees the attendee list (hosts + going); hosts/co-hosts also
      // see pending requests and outstanding invites so they can manage them.
      where: canManage ? { partyId } : { partyId, status: { in: ['HOST', 'COHOST', 'GOING'] } },
      include: { user: { select: PARTY_USER_SELECT } },
      orderBy: { createdAt: 'asc' },
      take: 100,
    }),
    prisma.partyAnnouncement.findMany({
      where: { partyId },
      include: { author: { select: PARTY_USER_SELECT } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ]);

  const cohosts = memberRows.filter((m) => m.status === 'COHOST').map((m) => m.user);
  // The creator may predate their HOST member row (older parties) — the
  // authoritative hostId still reads as HOST.
  const myStatus = membership?.status ?? (party.hostId === userId ? 'HOST' : null);

  return {
    ...serializeParty(party, countsByParty.get(partyId)!, myStatus, cohosts),
    members: memberRows.map((m) => ({
      user: serializePartyUser(m.user),
      status: m.status,
      respondedAt: m.respondedAt ? m.respondedAt.toISOString() : undefined,
    })),
    announcements: announcements.map((a) => ({
      id: a.id,
      text: a.text,
      createdAt: a.createdAt.toISOString(),
      author: serializePartyUser(a.author),
    })),
  };
});

// POST /parties/:id/join — request to join a PUBLIC party (-> REQUESTED,
// pending host approval) or accept your invite (INVITED -> GOING). The host
// is automatically going.
app.post('/parties/:id/join', async (req) => {
  const userId = requireAccessUserId(req as any);
  const { id: partyId } = req.params as { id: string };

  const party = await getPartyOr404(partyId);
  if (party.status === 'CANCELLED') throw new AppError('This party was cancelled', 409);

  const existing = await prisma.partyMember.findUnique({
    where: { partyId_userId: { partyId, userId } },
    select: { id: true, status: true },
  });

  // Already in (or running) the party — idempotent no-op.
  if (
    existing?.status === 'HOST' ||
    existing?.status === 'COHOST' ||
    existing?.status === 'GOING' ||
    existing?.status === 'REQUESTED'
  ) {
    return { status: existing.status };
  }

  // Accepting an invitation.
  if (existing?.status === 'INVITED') {
    const updated = await prisma.partyMember.update({
      where: { id: existing.id },
      data: { status: 'GOING', respondedAt: new Date() },
      select: { status: true },
    });
    return { status: updated.status };
  }

  if (party.visibility !== 'PUBLIC') throw new AppError('This party is invite-only', 403);

  // New request (or re-request after a decline) on a public party.
  const row = existing
    ? await prisma.partyMember.update({
        where: { id: existing.id },
        data: { status: 'REQUESTED', respondedAt: null },
        select: { status: true },
      })
    : await prisma.partyMember.create({
        data: { partyId, userId, status: 'REQUESTED' },
        select: { status: true },
      });

  // NOTIFY: join request -> host + co-hosts (any of them can approve)
  const [requester, cohostRows] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { username: true } }),
    prisma.partyMember.findMany({ where: { partyId, status: 'COHOST' }, select: { userId: true } }),
  ]);
  if (requester) {
    void notifyMany([party.hostId, ...cohostRows.map((m) => m.userId)], {
      type: 'party_request',
      title: 'New join request',
      body: `@${requester.username} wants in: ${party.title}`,
      data: { partyId },
      actorId: userId,
    });
  }

  return { status: row.status };
});

// POST /parties/:id/respond { userId, accept } — a host or co-host approves
// or declines a pending join request.
app.post('/parties/:id/respond', async (req) => {
  const hostId = requireAccessUserId(req as any);
  const { id: partyId } = req.params as { id: string };
  const body = (req.body ?? {}) as { userId?: unknown; accept?: unknown };

  const targetUserId = typeof body.userId === 'string' ? body.userId.trim() : '';
  if (!targetUserId) throw new AppError('userId is required', 400);
  if (typeof body.accept !== 'boolean') throw new AppError('accept must be a boolean', 400);

  const { party } = await requirePartyManager(partyId, hostId);

  const member = await prisma.partyMember.findUnique({
    where: { partyId_userId: { partyId, userId: targetUserId } },
    select: { id: true, status: true },
  });
  if (!member || member.status !== 'REQUESTED') throw new AppError('No pending request from this user', 404);

  const updated = await prisma.partyMember.update({
    where: { id: member.id },
    data: { status: body.accept ? 'GOING' : 'DECLINED', respondedAt: new Date() },
    select: { userId: true, status: true },
  });

  // NOTIFY: request approved -> requester (declines stay silent)
  if (body.accept) {
    void notify(targetUserId, {
      type: 'party_approved',
      title: "You're in",
      body: `Your request to join ${party.title} was approved`,
      data: { partyId },
      actorId: hostId,
    });
  }

  return { userId: updated.userId, status: updated.status };
});

// POST /parties/:id/invite { userIds } — a host or co-host invites users.
// Users who already have a membership row (any status) are left untouched.
app.post('/parties/:id/invite', async (req) => {
  const hostId = requireAccessUserId(req as any);
  const { id: partyId } = req.params as { id: string };
  const body = (req.body ?? {}) as { userIds?: unknown };

  if (!Array.isArray(body.userIds) || body.userIds.length === 0) {
    throw new AppError('userIds must be a non-empty array', 400);
  }
  if (body.userIds.length > 50) throw new AppError('Too many invites at once (max 50)', 400);

  const { party } = await requirePartyManager(partyId, hostId);
  if (party.status === 'CANCELLED') throw new AppError('This party was cancelled', 409);

  const requestedIds = Array.from(
    new Set(body.userIds.filter((u): u is string => typeof u === 'string' && u.trim().length > 0).map((u) => u.trim()))
  ).filter((id) => id !== hostId);
  if (requestedIds.length === 0) throw new AppError('No valid userIds to invite', 400);

  const users = await prisma.user.findMany({
    where: { id: { in: requestedIds } },
    select: { id: true, allowPartyInvites: true },
  });

  // Privacy: honor each invitee's allowPartyInvites. "FRIENDS" = the inviter
  // follows the invitee (same degree-1 rule as buildLogVisibilityWhere).
  const friendGated = users.filter((u) => u.allowPartyInvites === 'FRIENDS').map((u) => u.id);
  const inviterFollows = friendGated.length
    ? await prisma.follow.findMany({
        where: { followerId: hostId, followingId: { in: friendGated } },
        select: { followingId: true },
      })
    : [];
  const followedSet = new Set(inviterFollows.map((f) => f.followingId));
  const blocked = users
    .filter((u) => u.allowPartyInvites === 'NOBODY' || (u.allowPartyInvites === 'FRIENDS' && !followedSet.has(u.id)))
    .map((u) => u.id);
  const blockedSet = new Set(blocked);

  const foundIds = new Set(users.map((u) => u.id));
  const validIds = users.map((u) => u.id).filter((id) => !blockedSet.has(id));

  // Snapshot pre-existing memberships so only genuinely new invites get
  // notified (createMany + skipDuplicates doesn't report which rows landed).
  const preexisting = validIds.length
    ? await prisma.partyMember.findMany({
        where: { partyId, userId: { in: validIds } },
        select: { userId: true },
      })
    : [];
  const preexistingIds = new Set(preexisting.map((m) => m.userId));

  const result = validIds.length
    ? await prisma.partyMember.createMany({
        data: validIds.map((uid) => ({ partyId, userId: uid, status: 'INVITED' as const })),
        skipDuplicates: true,
      })
    : { count: 0 };

  // NOTIFY: party invite -> each newly invited user (named after the actual
  // inviter, who may be a co-host rather than the original host)
  const newlyInvited = validIds.filter((id) => !preexistingIds.has(id));
  if (newlyInvited.length) {
    const inviter = await prisma.user.findUnique({ where: { id: hostId }, select: { username: true } });
    void notifyMany(newlyInvited, {
      type: 'party_invite',
      title: "You're invited",
      body: `@${inviter?.username ?? party.host.username} invited you: ${party.title}`,
      data: { partyId },
      actorId: hostId,
    });
  }

  return { invited: result.count, notFound: requestedIds.filter((id) => !foundIds.has(id)), blocked };
});

// PATCH /parties/:id — a host or co-host edits the party's fields. Members
// (hosts + going + invited) get a party_update notification.
app.patch('/parties/:id', async (req) => {
  const userId = requireAccessUserId(req as any);
  const { id: partyId } = req.params as { id: string };
  const body = (req.body ?? {}) as {
    title?: unknown;
    description?: unknown;
    location?: unknown;
    startsAt?: unknown;
    visibility?: unknown;
  };

  const { party } = await requirePartyManager(partyId, userId);
  if (party.status === 'CANCELLED') throw new AppError('This party was cancelled', 409);

  const data: Prisma.PartyUpdateInput = {};
  if (body.title !== undefined) {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) throw new AppError('Title is required', 400);
    if (title.length > 80) throw new AppError('Title too long (max 80)', 400);
    data.title = title;
  }
  // description/location: string sets, empty string or null clears.
  if (body.description !== undefined) {
    if (body.description !== null && typeof body.description !== 'string') {
      throw new AppError('description must be a string', 400);
    }
    data.description = typeof body.description === 'string' && body.description.trim() ? body.description.trim() : null;
  }
  if (body.location !== undefined) {
    if (body.location !== null && typeof body.location !== 'string') {
      throw new AppError('location must be a string', 400);
    }
    data.location = typeof body.location === 'string' && body.location.trim() ? body.location.trim() : null;
  }
  if (body.startsAt !== undefined) {
    if (body.startsAt === null) {
      data.startsAt = null;
    } else {
      const d = new Date(String(body.startsAt));
      if (Number.isNaN(d.getTime())) throw new AppError('startsAt must be a valid ISO date', 400);
      data.startsAt = d;
    }
  }
  if (body.visibility !== undefined) {
    const v = typeof body.visibility === 'string' ? body.visibility.trim().toUpperCase() : '';
    if (v !== 'PUBLIC' && v !== 'INVITE') throw new AppError('visibility must be PUBLIC or INVITE', 400);
    data.visibility = v;
  }

  if (Object.keys(data).length === 0) {
    throw new AppError('Provide at least one of title, description, location, startsAt, visibility', 400);
  }

  const updated = await prisma.party.update({
    where: { id: partyId },
    data,
    include: { host: { select: PARTY_USER_SELECT } },
  });

  const [countsByParty, cohostsByParty, membership] = await Promise.all([
    getPartyCounts([partyId]),
    getPartyCohosts([partyId]),
    prisma.partyMember.findUnique({
      where: { partyId_userId: { partyId, userId } },
      select: { status: true },
    }),
  ]);

  // NOTIFY: party details changed -> members (minus the editor)
  const audience = await getPartyNotifyAudience(party, userId);
  if (audience.length) {
    void notifyMany(audience, {
      type: 'party_update',
      title: 'Party updated',
      body: `${updated.title} — details changed, check the plan`,
      data: { partyId },
      actorId: userId,
    });
  }

  return serializeParty(
    updated,
    countsByParty.get(partyId)!,
    membership?.status ?? (party.hostId === userId ? 'HOST' : null),
    cohostsByParty.get(partyId)!
  );
});

// POST /parties/:id/cancel — the original host (only — co-hosts can't) soft-
// cancels the party. It stays readable for members with status CANCELLED so
// clients can strike it through; join/invite/edit lock down.
app.post('/parties/:id/cancel', async (req) => {
  const userId = requireAccessUserId(req as any);
  const { id: partyId } = req.params as { id: string };

  const party = await getPartyOr404(partyId);
  if (party.hostId !== userId) throw new AppError('Only the host can cancel the party', 403);
  if (party.status === 'CANCELLED') return { id: partyId, status: 'CANCELLED' as const };

  await prisma.party.update({ where: { id: partyId }, data: { status: 'CANCELLED' } });

  // NOTIFY: party cancelled -> members (minus the host)
  const audience = await getPartyNotifyAudience(party, userId);
  if (audience.length) {
    void notifyMany(audience, {
      type: 'party_cancelled',
      title: 'Party cancelled',
      body: `${party.title} was called off`,
      data: { partyId },
      actorId: userId,
    });
  }

  return { id: partyId, status: 'CANCELLED' as const };
});

// POST /parties/:id/cohosts { userId } — the original host promotes a GOING
// member to COHOST (joint hosting). Co-hosts can approve/deny requests,
// invite, edit, and announce — only the original host can cancel or promote.
app.post('/parties/:id/cohosts', async (req) => {
  const hostId = requireAccessUserId(req as any);
  const { id: partyId } = req.params as { id: string };
  const body = (req.body ?? {}) as { userId?: unknown };

  const targetUserId = typeof body.userId === 'string' ? body.userId.trim() : '';
  if (!targetUserId) throw new AppError('userId is required', 400);

  const party = await getPartyOr404(partyId);
  if (party.hostId !== hostId) throw new AppError('Only the host can add co-hosts', 403);
  if (party.status === 'CANCELLED') throw new AppError('This party was cancelled', 409);

  const member = await prisma.partyMember.findUnique({
    where: { partyId_userId: { partyId, userId: targetUserId } },
    select: { id: true, status: true },
  });
  if (member?.status === 'COHOST') return { userId: targetUserId, status: 'COHOST' as const };
  if (!member || member.status !== 'GOING') {
    throw new AppError('Co-hosts are promoted from members who are going', 400);
  }

  const updated = await prisma.partyMember.update({
    where: { id: member.id },
    data: { status: 'COHOST', respondedAt: new Date() },
    select: { userId: true, status: true },
  });

  // NOTIFY: promoted -> the new co-host
  void notify(targetUserId, {
    type: 'party_cohost',
    title: "You're co-hosting",
    body: `@${party.host.username} made you a co-host of ${party.title}`,
    data: { partyId },
    actorId: hostId,
  });

  return { userId: updated.userId, status: updated.status };
});

// POST /parties/:id/announcements { text } — a host or co-host posts an
// announcement.
app.post('/parties/:id/announcements', async (req, reply) => {
  const userId = requireAccessUserId(req as any);
  const { id: partyId } = req.params as { id: string };
  const body = (req.body ?? {}) as { text?: unknown };

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) throw new AppError('Text is required', 400);
  if (text.length > 500) throw new AppError('Text too long (max 500)', 400);

  await requirePartyManager(partyId, userId);

  const announcement = await prisma.partyAnnouncement.create({
    data: { partyId, authorId: userId, text },
    include: { author: { select: PARTY_USER_SELECT } },
  });

  reply.status(201);
  return {
    id: announcement.id,
    text: announcement.text,
    createdAt: announcement.createdAt.toISOString(),
    author: serializePartyUser(announcement.author),
  };
});

// ---- Party chat (two-way, members only) — distinct from the host-only
// one-way announcements above. "Member" = host, or a PartyMember row in
// HOST/GOING/INVITED (the host may have no member row — see /parties/:id).

async function requirePartyMember(partyId: string, userId: string) {
  const party = await getPartyOr404(partyId);
  if (party.hostId === userId) return party;

  const member = await prisma.partyMember.findUnique({
    where: { partyId_userId: { partyId, userId } },
    select: { status: true },
  });
  if (!member || !['HOST', 'COHOST', 'GOING', 'INVITED'].includes(member.status)) {
    throw new AppError('Party members only', 403);
  }
  return party;
}

// GET /parties/:id/messages — the party group chat, oldest first.
app.get('/parties/:id/messages', async (req) => {
  const userId = requireAccessUserId(req as any);
  const { id: partyId } = req.params as { id: string };

  await requirePartyMember(partyId, userId);

  const messages = await prisma.partyMessage.findMany({
    where: { partyId },
    include: { author: { select: PARTY_USER_SELECT } },
    orderBy: { createdAt: 'asc' },
    take: 200,
  });

  return {
    messages: messages.map((m) => ({
      id: m.id,
      text: m.text,
      createdAt: m.createdAt.toISOString(),
      author: serializePartyUser(m.author),
    })),
  };
});

// POST /parties/:id/messages { text } — any member posts to the group chat.
app.post('/parties/:id/messages', async (req, reply) => {
  const userId = requireAccessUserId(req as any);
  const { id: partyId } = req.params as { id: string };
  const body = (req.body ?? {}) as { text?: unknown };

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) throw new AppError('Message text is required', 400);
  if (text.length > 1000) throw new AppError('Text too long (max 1000)', 400);

  const party = await requirePartyMember(partyId, userId);

  const message = await prisma.partyMessage.create({
    data: { partyId, authorId: userId, text },
    include: { author: { select: PARTY_USER_SELECT } },
  });

  const degrees = await getViewerDegrees(userId);
  // NOTIFY: mention
  const mentions = await resolveMentions(text, degrees.degreeOf);
  notifyMentions(mentions, { id: userId, username: message.author.username }, `"${party.title}"`, {
    partyId,
  });

  reply.status(201);
  return {
    id: message.id,
    text: message.text,
    createdAt: message.createdAt.toISOString(),
    author: serializePartyUser(message.author),
    mentions,
  };
});

// DELETE /parties/:id — host deletes the party (members + announcements
// cascade at the DB level).
app.delete('/parties/:id', async (req) => {
  const userId = requireAccessUserId(req as any);
  const { id: partyId } = req.params as { id: string };

  const party = await getPartyOr404(partyId);
  if (party.hostId !== userId) throw new AppError('Only the host can delete the party', 403);

  await prisma.party.delete({ where: { id: partyId } });
  return { success: true };
});

// ==================== VENUE Q&A ROUTES ====================
// Crowd-sourced venue questions ("where's the merch line?") with answers and
// answer upvotes. `VenueAnswer.upvotes` is a denormalized counter kept in
// sync with the VenueAnswerUpvote join table by the toggle endpoint.

// GET /venues/:id/questions — questions with answers (best-upvoted first)
// and, when authenticated, whether you upvoted each answer.
app.get('/venues/:id/questions', async (req) => {
  const { id: venueId } = req.params as { id: string };
  const userId = getUserIdFromRequest(req);
  const q = (req.query ?? {}) as { limit?: string; offset?: string };
  const limit = Math.max(1, Math.min(50, Number(q.limit ?? 20)));
  const offset = Math.max(0, Number(q.offset ?? 0));

  const questions = await prisma.venueQuestion.findMany({
    where: { venueId },
    include: {
      author: { select: PARTY_USER_SELECT },
      answers: {
        include: { author: { select: PARTY_USER_SELECT } },
        orderBy: [{ upvotes: 'desc' }, { createdAt: 'asc' }],
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });

  const answerIds = questions.flatMap((question) => question.answers.map((a) => a.id));
  const upvoted = new Set<string>();
  if (userId && answerIds.length) {
    const rows = await prisma.venueAnswerUpvote.findMany({
      where: { userId, answerId: { in: answerIds } },
      select: { answerId: true },
    });
    for (const r of rows) upvoted.add(r.answerId);
  }

  return {
    questions: questions.map((question) => ({
      id: question.id,
      text: question.text,
      createdAt: question.createdAt.toISOString(),
      author: serializePartyUser(question.author),
      answerCount: question.answers.length,
      answers: question.answers.map((a) => ({
        id: a.id,
        text: a.text,
        upvotes: a.upvotes,
        yourUpvote: upvoted.has(a.id),
        createdAt: a.createdAt.toISOString(),
        author: serializePartyUser(a.author),
      })),
    })),
  };
});

// POST /venues/:id/questions { text }
app.post('/venues/:id/questions', async (req, reply) => {
  const userId = requireAccessUserId(req as any);
  const { id: venueId } = req.params as { id: string };
  const body = (req.body ?? {}) as { text?: unknown };

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) throw new AppError('Text is required', 400);
  if (text.length > 500) throw new AppError('Text too long (max 500)', 400);

  const venue = await prisma.venue.findUnique({ where: { id: venueId }, select: { id: true } });
  if (!venue) throw new AppError('Venue not found', 404);

  const question = await prisma.venueQuestion.create({
    data: { venueId, authorId: userId, text },
    include: { author: { select: PARTY_USER_SELECT } },
  });

  reply.status(201);
  return {
    id: question.id,
    text: question.text,
    createdAt: question.createdAt.toISOString(),
    author: serializePartyUser(question.author),
    answerCount: 0,
    answers: [],
  };
});

// POST /questions/:id/answers { text }
app.post('/questions/:id/answers', async (req, reply) => {
  const userId = requireAccessUserId(req as any);
  const { id: questionId } = req.params as { id: string };
  const body = (req.body ?? {}) as { text?: unknown };

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) throw new AppError('Text is required', 400);
  if (text.length > 1000) throw new AppError('Text too long (max 1000)', 400);

  const question = await prisma.venueQuestion.findUnique({ where: { id: questionId }, select: { id: true } });
  if (!question) throw new AppError('Question not found', 404);

  const answer = await prisma.venueAnswer.create({
    data: { questionId, authorId: userId, text },
    include: { author: { select: PARTY_USER_SELECT } },
  });

  reply.status(201);
  return {
    id: answer.id,
    questionId: answer.questionId,
    text: answer.text,
    upvotes: answer.upvotes,
    yourUpvote: false,
    createdAt: answer.createdAt.toISOString(),
    author: serializePartyUser(answer.author),
  };
});

// POST /answers/:id/upvote — toggle your upvote on an answer.
app.post('/answers/:id/upvote', async (req) => {
  const userId = requireAccessUserId(req as any);
  const { id: answerId } = req.params as { id: string };

  const answer = await prisma.venueAnswer.findUnique({ where: { id: answerId }, select: { id: true } });
  if (!answer) throw new AppError('Answer not found', 404);

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.venueAnswerUpvote.findUnique({
      where: { answerId_userId: { answerId, userId } },
      select: { id: true },
    });

    if (existing) {
      await tx.venueAnswerUpvote.delete({ where: { id: existing.id } });
      const updated = await tx.venueAnswer.update({
        where: { id: answerId },
        data: { upvotes: { decrement: 1 } },
        select: { upvotes: true },
      });
      return { upvoted: false, upvotes: updated.upvotes };
    }

    await tx.venueAnswerUpvote.create({ data: { answerId, userId } });
    const updated = await tx.venueAnswer.update({
      where: { id: answerId },
      data: { upvotes: { increment: 1 } },
      select: { upvotes: true },
    });
    return { upvoted: true, upvotes: updated.upvotes };
  });

  return result;
});

// ==================== DISCOVERY DIALS ====================
// Per-user discovery settings. `showInGalleries: false` is enforced in the
// gallery/feed queries (event feed, event photos, seat-sections, tour
// photos). NOTE: sameShowRadius / tasteRadius are stored (and surfaced via
// GET /auth/me) but not yet enforced in /users/suggestions or discover
// ranking — that lands with the suggestions-graph work.

const DISCOVERY_RADII = new Set(['OFF', 'FRIENDS', 'FOF', 'EVERYONE']);

function parseDiscoveryRadius(value: unknown, field: string): 'OFF' | 'FRIENDS' | 'FOF' | 'EVERYONE' {
  const v = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (!DISCOVERY_RADII.has(v)) throw new AppError(`${field} must be one of OFF, FRIENDS, FOF, EVERYONE`, 400);
  return v as 'OFF' | 'FRIENDS' | 'FOF' | 'EVERYONE';
}

// PATCH /users/me/discovery { sameShowRadius?, tasteRadius?, showInGalleries? }
app.patch('/users/me/discovery', async (req) => {
  const userId = requireAccessUserId(req as any);
  const body = (req.body ?? {}) as {
    sameShowRadius?: unknown;
    tasteRadius?: unknown;
    showInGalleries?: unknown;
  };

  const data: Prisma.UserUpdateInput = {};
  if (body.sameShowRadius !== undefined) data.sameShowRadius = parseDiscoveryRadius(body.sameShowRadius, 'sameShowRadius');
  if (body.tasteRadius !== undefined) data.tasteRadius = parseDiscoveryRadius(body.tasteRadius, 'tasteRadius');
  if (body.showInGalleries !== undefined) {
    if (typeof body.showInGalleries !== 'boolean') throw new AppError('showInGalleries must be a boolean', 400);
    data.showInGalleries = body.showInGalleries;
  }

  if (Object.keys(data).length === 0) {
    throw new AppError('Provide at least one of sameShowRadius, tasteRadius, showInGalleries', 400);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: { sameShowRadius: true, tasteRadius: true, showInGalleries: true },
  });

  return updated;
});

// ==================== PRIVACY CONTROLS ====================
// Per-user privacy settings (User.profileVisibility & co). Enforcement lives
// at the read/write paths: buildUserProfilePayload (profileVisibility),
// /users/:id/timeline (showTimeline), /users/:id/logs (showCollection),
// /users/:id/venues (showMapCities), /parties/:id/invite (allowPartyInvites),
// notifyMentions (allowMentions), /users/taste-match (appearInTasteMatch),
// and POST /logs (defaultLogVisibility fallback).

const PRIVACY_SELECT = {
  profileVisibility: true,
  defaultLogVisibility: true,
  showTimeline: true,
  showCollection: true,
  showMapCities: true,
  allowPartyInvites: true,
  allowMentions: true,
  appearInTasteMatch: true,
} as const;

const AUDIENCE_SETTINGS = new Set(['EVERYONE', 'FRIENDS', 'NOBODY']);

function parseAudienceSetting(value: unknown, field: string): 'EVERYONE' | 'FRIENDS' | 'NOBODY' {
  const v = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (!AUDIENCE_SETTINGS.has(v)) throw new AppError(`${field} must be one of EVERYONE, FRIENDS, NOBODY`, 400);
  return v as 'EVERYONE' | 'FRIENDS' | 'NOBODY';
}

function parsePrivacyBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') throw new AppError(`${field} must be a boolean`, 400);
  return value;
}

// GET /users/me/privacy — the viewer's privacy settings.
app.get('/users/me/privacy', async (req) => {
  const userId = requireAccessUserId(req as any);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: PRIVACY_SELECT });
  if (!user) throw new AppError('User not found', 404);
  return user;
});

// PATCH /users/me/privacy — partial update; unknown fields are ignored,
// provided fields are validated strictly.
app.patch('/users/me/privacy', async (req) => {
  const userId = requireAccessUserId(req as any);
  const body = (req.body ?? {}) as Record<string, unknown>;

  const data: Prisma.UserUpdateInput = {};

  if (body.profileVisibility !== undefined) {
    const v = typeof body.profileVisibility === 'string' ? body.profileVisibility.trim().toUpperCase() : '';
    if (v !== 'PUBLIC' && v !== 'FRIENDS' && v !== 'PRIVATE') {
      throw new AppError('profileVisibility must be one of PUBLIC, FRIENDS, PRIVATE', 400);
    }
    data.profileVisibility = v;
    // Keep the legacy settings alias in sync — privacySetting still drives
    // the log-listing gate (buildLogVisibilityWhere) and GET/PATCH /settings.
    data.privacySetting = v;
  }

  if (body.defaultLogVisibility !== undefined) {
    const v = typeof body.defaultLogVisibility === 'string' ? body.defaultLogVisibility.trim().toUpperCase() : '';
    if (v !== 'PUBLIC' && v !== 'FRIENDS') throw new AppError('defaultLogVisibility must be PUBLIC or FRIENDS', 400);
    data.defaultLogVisibility = v;
  }

  if (body.showTimeline !== undefined) data.showTimeline = parsePrivacyBoolean(body.showTimeline, 'showTimeline');
  if (body.showCollection !== undefined) data.showCollection = parsePrivacyBoolean(body.showCollection, 'showCollection');
  if (body.showMapCities !== undefined) data.showMapCities = parsePrivacyBoolean(body.showMapCities, 'showMapCities');
  if (body.appearInTasteMatch !== undefined) {
    data.appearInTasteMatch = parsePrivacyBoolean(body.appearInTasteMatch, 'appearInTasteMatch');
  }

  if (body.allowPartyInvites !== undefined) {
    data.allowPartyInvites = parseAudienceSetting(body.allowPartyInvites, 'allowPartyInvites');
  }
  if (body.allowMentions !== undefined) data.allowMentions = parseAudienceSetting(body.allowMentions, 'allowMentions');

  if (Object.keys(data).length === 0) throw new AppError('Provide at least one privacy field', 400);

  const updated = await prisma.user.update({ where: { id: userId }, data, select: PRIVACY_SELECT });
  return updated;
});

// ==================== SHOW-DAY REMINDERS ====================
// The Plan tab's "REMIND ME" toggle on a ticketed show. One ShowReminder row
// per user+event (upsert on POST, delete on DELETE); the notification engine
// sweeps these on the morning of the show day. GET returns the reminded
// eventIds so the YOUR SHOWS toggles hydrate on load.
app.get('/users/me/reminders', async (req) => {
  const userId = requireAccessUserId(req as any);
  const rows = await prisma.showReminder.findMany({
    where: { userId },
    select: { eventId: true },
  });
  return rows.map((r) => r.eventId);
});

app.post('/users/me/reminders', async (req) => {
  const userId = requireAccessUserId(req as any);
  const body = (req.body ?? {}) as { eventId?: unknown };
  const eventId = typeof body.eventId === 'string' ? body.eventId.trim() : '';
  if (!eventId) throw new AppError('eventId is required', 400);

  // Guard the FK so a bad id is a clean 404, not a Prisma constraint crash.
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
  if (!event) throw new AppError('Event not found', 404);

  await prisma.showReminder.upsert({
    where: { userId_eventId: { userId, eventId } },
    create: { userId, eventId },
    update: {},
  });
  return { eventId, reminded: true };
});

app.delete('/users/me/reminders/:eventId', async (req) => {
  const userId = requireAccessUserId(req as any);
  const { eventId } = req.params as { eventId: string };
  await prisma.showReminder.deleteMany({ where: { userId, eventId } });
  return { eventId, reminded: false };
});

async function listenWithFallback() {
  const allowPortFallback = process.env.ALLOW_PORT_FALLBACK === 'true';

  // Default: be strict about the port so mobile's EXPO_PUBLIC_API_URL stays correct.
  if (!allowPortFallback) {
    await app.listen({ port: preferredPort, host });
    app.log.info({ port: preferredPort, host }, 'API listening');
    return;
  }

  // Optional: retry a few ports to avoid EADDRINUSE when another dev server is already up.
  for (let offset = 0; offset <= 10; offset++) {
    const port = preferredPort + offset;
    try {
      await app.listen({ port, host });
      app.log.info({ port, host }, 'API listening');
      return;
    } catch (err) {
      const e = err as { code?: string; message?: string };
      if (e?.code === 'EADDRINUSE') continue;
      throw err;
    }
  }

  throw new Error(`No free port found starting from ${preferredPort}`);
}

await listenWithFallback();

// Background jobs (best effort)
startERPSyncJob();
startNotificationJobs();



