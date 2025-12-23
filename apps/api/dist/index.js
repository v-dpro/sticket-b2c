import 'dotenv/config';
import { createWriteStream } from 'node:fs';
import { mkdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { prisma } from './lib/prisma.js';
import { getEventsForMultipleArtists } from './lib/bandsintown.js';
import { getUserIdFromRequest } from './lib/auth.js';
import { AppError } from './lib/errors.js';
import { BADGES } from './lib/badges/badgeDefinitions.js';
import { checkBadges, getBadgeProgress, getEarnedBadges } from './lib/badges/badgeChecker.js';
import { generateTokens, verifyToken, hashPassword, verifyPassword, generateResetToken, handleAppleSignIn, handleGoogleSignIn, handleSpotifyConnect, getUserWithFreshSpotifyToken, getSpotifyTopArtists, } from './services/auth.js';
import { startERPSyncJob } from './services/erpSync.js';
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
    requireAccessUserId(req);
    return BADGES;
});
// GET /badges/mine - Current user's earned badges (with full definition)
app.get('/badges/mine', async (req) => {
    const userId = requireAccessUserId(req);
    return await getEarnedBadges(userId);
});
// GET /badges/progress - Progress toward unearned badges
app.get('/badges/progress', async (req) => {
    const userId = requireAccessUserId(req);
    return await getBadgeProgress(userId);
});
// POST /badges/check - Check and award new badges (idempotent)
app.post('/badges/check', async (req) => {
    const userId = requireAccessUserId(req);
    const body = (req.body ?? {});
    const result = await checkBadges(userId, { award: true, eventId: body.eventId });
    return { newBadges: result.newBadges };
});
function requireAccessUserId(req) {
    const auth = req.headers.authorization;
    if (!auth)
        throw new AppError('Authentication required', 401);
    const [scheme, token] = auth.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token)
        throw new AppError('Authentication required', 401);
    let payload;
    try {
        payload = verifyToken(token);
    }
    catch {
        throw new AppError('Authentication required', 401);
    }
    if (payload.type !== 'access')
        throw new AppError('Authentication required', 401);
    return payload.userId;
}
function getPublicBaseUrl(req) {
    const env = process.env.PUBLIC_BASE_URL?.trim();
    if (env)
        return env.replace(/\/+$/, '');
    const host = typeof req.headers.host === 'string' ? req.headers.host : 'localhost:3000';
    const protoHeader = req.headers['x-forwarded-proto'];
    const proto = typeof protoHeader === 'string' ? protoHeader.split(',')[0].trim() : 'http';
    return `${proto}://${host}`;
}
async function getFollowStatus(viewerId, targetUserId) {
    if (!viewerId)
        return false;
    if (viewerId === targetUserId)
        return false;
    const row = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: viewerId, followingId: targetUserId } },
        select: { id: true },
    });
    return Boolean(row);
}
async function computeProfileStats(targetUserId) {
    const [shows, followers, following] = await Promise.all([
        prisma.userLog.count({ where: { userId: targetUserId } }),
        prisma.follow.count({ where: { followingId: targetUserId } }),
        prisma.follow.count({ where: { followerId: targetUserId } }),
    ]);
    // Distinct artist + venue ids from logs.
    const rows = await prisma.userLog.findMany({
        where: { userId: targetUserId },
        select: { event: { select: { artistId: true, venueId: true } } },
    });
    const artists = new Set();
    const venues = new Set();
    for (const r of rows) {
        artists.add(r.event.artistId);
        venues.add(r.event.venueId);
    }
    return { shows, artists: artists.size, venues: venues.size, followers, following };
}
async function getBadgesForUser(targetUserId) {
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
async function buildUserProfilePayload(viewerId, targetUserId) {
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
            createdAt: true,
        },
    });
    if (!user)
        throw new AppError('User not found', 404);
    const [stats, badges, isFollowing] = await Promise.all([
        computeProfileStats(targetUserId),
        getBadgesForUser(targetUserId),
        getFollowStatus(viewerId, targetUserId),
    ]);
    return {
        id: user.id,
        username: user.username,
        displayName: user.displayName ?? undefined,
        bio: user.bio ?? undefined,
        avatarUrl: user.avatarUrl ?? undefined,
        city: user.city ?? undefined,
        privacySetting: user.privacySetting,
        createdAt: user.createdAt.toISOString(),
        stats,
        badges,
        isFollowing: isFollowing || undefined,
    };
}
function buildLogVisibilityWhere(viewerId, targetUserId, targetPrivacy, viewerFollowsTarget) {
    // If you are viewing your own profile, you can see all logs.
    if (viewerId && viewerId === targetUserId)
        return {};
    // If account is private, only followers can see anything (and still respect per-log visibility below).
    if (targetPrivacy === 'PRIVATE' && !viewerFollowsTarget) {
        return { id: '__none__' };
    }
    // Public profile:
    // - If viewer follows, allow FRIENDS + PUBLIC logs.
    // - Otherwise only PUBLIC.
    if (!viewerFollowsTarget)
        return { visibility: 'PUBLIC' };
    return { visibility: { in: ['PUBLIC', 'FRIENDS'] } };
}
// ==================== AUTH ROUTES ====================
app.post('/auth/signup', async (req, reply) => {
    const body = (req.body ?? {});
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? '';
    const username = body.username?.trim().toLowerCase();
    if (!email || !password || !username)
        throw new AppError('Email, password, and username are required', 400);
    if (password.length < 8)
        throw new AppError('Password must be at least 8 characters', 400);
    if (username.length < 3 || username.length > 20)
        throw new AppError('Username must be 3-20 characters', 400);
    if (!/^[a-zA-Z0-9_]+$/.test(username))
        throw new AppError('Username can only contain letters, numbers, and underscores', 400);
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
    const body = (req.body ?? {});
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? '';
    if (!email || !password)
        throw new AppError('Email and password are required', 400);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash)
        throw new AppError('Invalid email or password', 401);
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok)
        throw new AppError('Invalid email or password', 401);
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
    const body = (req.body ?? {});
    const refreshToken = body.refreshToken;
    if (!refreshToken)
        throw new AppError('Refresh token required', 400);
    const payload = verifyToken(refreshToken);
    if (payload.type !== 'refresh')
        throw new AppError('Invalid token type', 401);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user)
        throw new AppError('User not found', 401);
    return generateTokens(user.id, user.email);
});
app.post('/auth/apple', async (req) => {
    const body = (req.body ?? {});
    if (!body.identityToken)
        throw new AppError('Identity token required', 400);
    const result = await handleAppleSignIn(body.identityToken, body.fullName);
    return { user: result.user, ...result.tokens };
});
app.post('/auth/google', async (req) => {
    const body = (req.body ?? {});
    if (!body.idToken)
        throw new AppError('ID token required', 400);
    const result = await handleGoogleSignIn(body.idToken);
    return { user: result.user, ...result.tokens };
});
app.get('/auth/spotify/url', async (req) => {
    const userId = requireAccessUserId(req);
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
    const userId = requireAccessUserId(req);
    const body = (req.body ?? {});
    if (!body.code)
        throw new AppError('Authorization code required', 400);
    return await handleSpotifyConnect(userId, body.code);
});
app.post('/auth/spotify/disconnect', async (req) => {
    const userId = requireAccessUserId(req);
    await prisma.user.update({
        where: { id: userId },
        data: { spotifyId: null, spotifyUsername: null, spotifyToken: null, spotifyRefresh: null, spotifyTokenExpiry: null },
    });
    return { success: true };
});
app.get('/auth/spotify/top-artists', async (req) => {
    const userId = requireAccessUserId(req);
    const { user, spotifyToken } = await getUserWithFreshSpotifyToken(userId);
    if (!spotifyToken)
        throw new AppError('Spotify not connected', 400);
    const q = (req.query ?? {});
    const limit = q.limit ? Number.parseInt(q.limit, 10) : 50;
    const timeRange = (q.time_range ?? 'medium_term');
    const artists = await getSpotifyTopArtists(spotifyToken, Number.isFinite(limit) ? limit : 50, timeRange);
    return artists;
});
app.post('/auth/forgot-password', async (req) => {
    const body = (req.body ?? {});
    const email = body.email?.trim().toLowerCase();
    if (!email)
        throw new AppError('Email required', 400);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user)
        return { success: true, message: 'If email exists, reset link sent' };
    const resetToken = generateResetToken();
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
    await prisma.user.update({ where: { id: user.id }, data: { resetToken, resetTokenExpiry } });
    // TODO: integrate email provider (Resend/SendGrid)
    req.log.info({ email, resetToken }, 'Password reset token generated');
    return { success: true, message: 'If email exists, reset link sent' };
});
app.post('/auth/reset-password', async (req) => {
    const body = (req.body ?? {});
    const token = body.token;
    const password = body.password ?? '';
    if (!token || !password)
        throw new AppError('Token and password required', 400);
    if (password.length < 8)
        throw new AppError('Password must be at least 8 characters', 400);
    const user = await prisma.user.findFirst({
        where: { resetToken: token, resetTokenExpiry: { gt: new Date() } },
    });
    if (!user)
        throw new AppError('Invalid or expired reset token', 400);
    const passwordHash = await hashPassword(password);
    await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, resetToken: null, resetTokenExpiry: null },
    });
    return { success: true, message: 'Password reset successful' };
});
app.get('/auth/me', async (req) => {
    const userId = requireAccessUserId(req);
    const [profilePayload, authUser] = await Promise.all([
        buildUserProfilePayload(userId, userId),
        prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, spotifyId: true, googleId: true, appleId: true, emailVerified: true },
        }),
    ]);
    if (!authUser)
        throw new AppError('User not found', 404);
    return {
        ...profilePayload,
        email: authUser.email,
        emailVerified: authUser.emailVerified,
        hasSpotify: !!authUser.spotifyId,
        hasGoogle: !!authUser.googleId,
        hasApple: !!authUser.appleId,
    };
});
app.post('/auth/logout', async () => ({ success: true }));
app.post('/auth/change-password', async (req) => {
    const userId = requireAccessUserId(req);
    const body = (req.body ?? {});
    const currentPassword = body.currentPassword ?? '';
    const newPassword = body.newPassword ?? '';
    if (!currentPassword || !newPassword)
        throw new AppError('Current password and new password are required', 400);
    if (newPassword.length < 8)
        throw new AppError('New password must be at least 8 characters', 400);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash)
        throw new AppError('Cannot change password for this account', 400);
    const ok = await verifyPassword(currentPassword, user.passwordHash);
    if (!ok)
        throw new AppError('Current password is incorrect', 400);
    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return { success: true };
});
app.post('/auth/change-email', async (req) => {
    const userId = requireAccessUserId(req);
    const body = (req.body ?? {});
    const newEmail = body.newEmail?.trim().toLowerCase();
    const password = body.password ?? '';
    if (!newEmail || !password)
        throw new AppError('New email and password are required', 400);
    if (!newEmail.includes('@'))
        throw new AppError('Invalid email', 400);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new AppError('User not found', 404);
    if (!user.passwordHash)
        throw new AppError('Cannot change email for this account', 400);
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok)
        throw new AppError('Incorrect password', 400);
    const existing = await prisma.user.findUnique({ where: { email: newEmail } });
    if (existing && existing.id !== userId)
        throw new AppError('Email is already in use', 400);
    await prisma.user.update({ where: { id: userId }, data: { email: newEmail, emailVerified: false } });
    return { success: true, message: 'Email updated successfully' };
});
app.delete('/auth/account', async (req) => {
    const userId = requireAccessUserId(req);
    const body = (req.body ?? {});
    const password = body.password ?? '';
    const reason = body.reason?.trim();
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new AppError('User not found', 404);
    if (user.passwordHash) {
        if (!password)
            throw new AppError('Password required', 400);
        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok)
            throw new AppError('Incorrect password', 400);
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
function visibilityEnumToOption(v) {
    if (v === 'FRIENDS')
        return 'friends';
    if (v === 'PRIVATE')
        return 'private';
    return 'public';
}
function parseVisibilityOption(v) {
    if (typeof v !== 'string')
        return null;
    const raw = v.trim().toLowerCase();
    if (raw === 'public')
        return 'PUBLIC';
    if (raw === 'friends')
        return 'FRIENDS';
    if (raw === 'private')
        return 'PRIVATE';
    return null;
}
async function buildSettingsPayload(userId) {
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
    if (!user)
        throw new AppError('User not found', 404);
    return {
        profileVisibility: visibilityEnumToOption(user.privacySetting),
        activityVisibility: visibilityEnumToOption(user.activityVisibility),
        showInSuggestions: user.showInSuggestions,
        allowTagging: user.allowTagging,
        homeCity: user.homeCity ?? undefined,
        distanceUnit: (user.distanceUnit === 'km' ? 'km' : 'miles'),
        spotifyConnected: Boolean(user.spotifyId),
        spotifyUsername: user.spotifyUsername ?? (user.spotifyId ?? undefined),
        appleMusicConnected: Boolean(user.appleMusicId),
    };
}
app.get('/settings', async (req) => {
    const userId = requireAccessUserId(req);
    return await buildSettingsPayload(userId);
});
app.patch('/settings', async (req) => {
    const userId = requireAccessUserId(req);
    const body = (req.body ?? {});
    const updates = {};
    const profileVisibility = parseVisibilityOption(body.profileVisibility);
    if (profileVisibility) {
        // Keep legacy field in sync (used elsewhere in the app).
        updates.privacySetting = profileVisibility;
    }
    const activityVisibility = parseVisibilityOption(body.activityVisibility);
    if (activityVisibility)
        updates.activityVisibility = activityVisibility;
    if (typeof body.showInSuggestions === 'boolean')
        updates.showInSuggestions = body.showInSuggestions;
    if (typeof body.allowTagging === 'boolean')
        updates.allowTagging = body.allowTagging;
    if (body.homeCity === null)
        updates.homeCity = null;
    else if (typeof body.homeCity === 'string')
        updates.homeCity = body.homeCity.trim() || null;
    if (typeof body.distanceUnit === 'string' && (body.distanceUnit === 'miles' || body.distanceUnit === 'km')) {
        updates.distanceUnit = body.distanceUnit;
    }
    await prisma.user.update({ where: { id: userId }, data: updates });
    return await buildSettingsPayload(userId);
});
app.get('/settings/privacy', async (req) => {
    const userId = requireAccessUserId(req);
    const data = await buildSettingsPayload(userId);
    return {
        profileVisibility: data.profileVisibility,
        activityVisibility: data.activityVisibility,
        showInSuggestions: data.showInSuggestions,
        allowTagging: data.allowTagging,
    };
});
app.patch('/settings/privacy', async (req) => {
    const userId = requireAccessUserId(req);
    const body = (req.body ?? {});
    const updates = {};
    const profileVisibility = parseVisibilityOption(body.profileVisibility);
    if (profileVisibility)
        updates.privacySetting = profileVisibility;
    const activityVisibility = parseVisibilityOption(body.activityVisibility);
    if (activityVisibility)
        updates.activityVisibility = activityVisibility;
    if (typeof body.showInSuggestions === 'boolean')
        updates.showInSuggestions = body.showInSuggestions;
    if (typeof body.allowTagging === 'boolean')
        updates.allowTagging = body.allowTagging;
    await prisma.user.update({ where: { id: userId }, data: updates });
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
    const userId = requireAccessUserId(req);
    req.log.info({ userId }, 'Data export requested');
    return { message: 'Data export request received. You will receive an email with your data.', downloadUrl: null };
});
// ==================== NOTIFICATIONS ROUTES ====================
//
// NOTE: We don't have a notifications table in the MVP schema yet.
// These endpoints exist to unblock the mobile UI and return empty/stub data until
// notifications are persisted server-side.
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
    emailDigest: 'none',
};
app.get('/notifications', async (req) => {
    // Allow local-only/dev sessions (no auth header) to render cleanly.
    void getUserIdFromRequest(req);
    return { notifications: [], nextCursor: null, unreadCount: 0 };
});
app.get('/notifications/unread-count', async (req) => {
    void getUserIdFromRequest(req);
    return { count: 0 };
});
app.patch('/notifications/:id/read', async (req) => {
    // Mutations require auth.
    void requireAccessUserId(req);
    void req.params.id;
    return { success: true };
});
app.post('/notifications/read-all', async (req) => {
    void requireAccessUserId(req);
    return { success: true };
});
app.get('/notifications/preferences', async (req) => {
    void getUserIdFromRequest(req);
    return defaultNotificationPrefs;
});
app.patch('/notifications/preferences', async (req) => {
    void requireAccessUserId(req);
    const body = (req.body ?? {});
    // Stub: return merged prefs (not persisted yet).
    return { ...defaultNotificationPrefs, ...body };
});
app.post('/notifications/push-token', async (req) => {
    void requireAccessUserId(req);
    // Stub: accept token, but don't persist yet.
    return { success: true };
});
app.delete('/notifications/push-token', async (req) => {
    void requireAccessUserId(req);
    return { success: true };
});
// ==================== USER / PROFILE ROUTES ====================
// GET /users/search - Search users by username/displayName
app.get('/users/search', async (req) => {
    const userId = requireAccessUserId(req);
    const q = (req.query ?? {});
    const raw = typeof q.q === 'string' ? q.q : '';
    const searchQuery = raw.trim();
    if (!searchQuery)
        return [];
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
    if (userIds.length === 0)
        return [];
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
    const mutualRows = myFollowingIds.length === 0
        ? []
        : await prisma.follow.findMany({
            where: { followerId: { in: userIds }, followingId: { in: myFollowingIds } },
            select: { followerId: true },
        });
    const mutualCountByUserId = new Map();
    for (const r of mutualRows)
        mutualCountByUserId.set(r.followerId, (mutualCountByUserId.get(r.followerId) ?? 0) + 1);
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
    const userId = requireAccessUserId(req);
    const body = (req.body ?? {});
    const contacts = Array.isArray(body.contacts) ? body.contacts : [];
    if (contacts.length === 0)
        return [];
    const normalized = contacts
        .map((c) => {
        const name = (c.name ?? '').trim() || 'Unknown';
        const email = typeof c.email === 'string' ? c.email.trim().toLowerCase() : null;
        const rawPhone = typeof c.phoneNumber === 'string' ? c.phoneNumber.trim() : null;
        let phoneNumber = null;
        if (rawPhone) {
            try {
                const parsed = 
                // Try without region first, then fall back to US.
                parsePhoneNumberFromString(rawPhone) ?? parsePhoneNumberFromString(rawPhone, 'US');
                if (parsed?.isValid())
                    phoneNumber = parsed.number; // E.164
            }
            catch {
                phoneNumber = null;
            }
        }
        if (!email && !phoneNumber)
            return null;
        return { name, email, phoneNumber };
    })
        .filter(Boolean);
    const emails = Array.from(new Set(normalized.map((c) => c.email).filter(Boolean)));
    const phoneNumbers = Array.from(new Set(normalized.map((c) => c.phoneNumber).filter(Boolean)));
    if (emails.length === 0 && phoneNumbers.length === 0)
        return [];
    const or = [];
    if (emails.length)
        or.push({ email: { in: emails } });
    if (phoneNumbers.length)
        or.push({ phoneNumber: { in: phoneNumbers } });
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
    const emailToName = new Map();
    const phoneToName = new Map();
    for (const c of normalized) {
        if (c.email && !emailToName.has(c.email))
            emailToName.set(c.email, c.name);
        if (c.phoneNumber && !phoneToName.has(c.phoneNumber))
            phoneToName.set(c.phoneNumber, c.name);
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
    const userId = requireAccessUserId(req);
    const q = (req.query ?? {});
    const limitRaw = Number(q.limit ?? 20);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(50, limitRaw)) : 20;
    const following = await prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
    });
    const followingIds = following.map((f) => f.followingId);
    const excludeIds = new Set([userId, ...followingIds]);
    const suggestions = [];
    const seen = new Set();
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
        const fofMap = new Map();
        for (const f of friendsOfFriends) {
            const mutualName = f.follower.displayName || f.follower.username;
            const existing = fofMap.get(f.followingId);
            if (existing)
                existing.mutuals.push(mutualName);
            else
                fofMap.set(f.followingId, { user: f.following, mutuals: [mutualName] });
        }
        for (const [id, entry] of fofMap) {
            if (seen.has(id))
                continue;
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
            if (seen.has(id))
                continue;
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
        if (seen.has(u.id))
            continue;
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
app.get('/users/username/:username', async (req) => {
    const viewerId = requireAccessUserId(req);
    const { username } = req.params;
    const uname = (username ?? '').trim().toLowerCase();
    if (!uname)
        throw new AppError('Username required', 400);
    const user = await prisma.user.findUnique({
        where: { username: uname },
        select: { id: true, username: true, displayName: true, avatarUrl: true, _count: { select: { logs: true } } },
    });
    if (!user)
        throw new AppError('User not found', 404);
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
    const { id } = req.params;
    return await buildUserProfilePayload(viewerId, id);
});
app.get('/users/:id/stats', async (req) => {
    const { id } = req.params;
    return await computeProfileStats(id);
});
app.get('/users/:id/badges', async (req) => {
    const { id } = req.params;
    return await getBadgesForUser(id);
});
app.get('/users/:id/followers', async (req) => {
    const { id } = req.params;
    const q = (req.query ?? {});
    const limit = Math.max(1, Math.min(100, Number(q.limit ?? 50)));
    const offset = Math.max(0, Number(q.offset ?? 0));
    const rows = await prisma.follow.findMany({
        where: { followingId: id },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: { follower: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    });
    return rows.map((r) => ({
        id: r.follower.id,
        username: r.follower.username,
        displayName: r.follower.displayName ?? undefined,
        avatarUrl: r.follower.avatarUrl ?? undefined,
    }));
});
app.get('/users/:id/following', async (req) => {
    const { id } = req.params;
    const q = (req.query ?? {});
    const limit = Math.max(1, Math.min(100, Number(q.limit ?? 50)));
    const offset = Math.max(0, Number(q.offset ?? 0));
    const rows = await prisma.follow.findMany({
        where: { followerId: id },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: { following: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    });
    return rows.map((r) => ({
        id: r.following.id,
        username: r.following.username,
        displayName: r.following.displayName ?? undefined,
        avatarUrl: r.following.avatarUrl ?? undefined,
    }));
});
app.post('/users/:id/follow', async (req) => {
    const followerId = requireAccessUserId(req);
    const { id: followingId } = req.params;
    if (followerId === followingId)
        throw new AppError('Cannot follow yourself', 400);
    await prisma.follow.upsert({
        where: { followerId_followingId: { followerId, followingId } },
        update: {},
        create: { followerId, followingId },
    });
    return { success: true };
});
app.delete('/users/:id/follow', async (req) => {
    const followerId = requireAccessUserId(req);
    const { id: followingId } = req.params;
    if (followerId === followingId)
        throw new AppError('Cannot unfollow yourself', 400);
    await prisma.follow.deleteMany({
        where: { followerId, followingId },
    });
    return { success: true };
});
app.patch('/users/me', async (req) => {
    const userId = requireAccessUserId(req);
    const body = (req.body ?? {});
    const username = body.username?.trim().toLowerCase();
    const displayName = body.displayName?.trim();
    const bio = body.bio?.trim();
    const city = body.city?.trim();
    const avatarUrl = body.avatarUrl?.trim();
    if (username !== undefined) {
        if (username.length < 3 || username.length > 20)
            throw new AppError('Username must be 3-20 characters', 400);
        if (!/^[a-zA-Z0-9_]+$/.test(username))
            throw new AppError('Username can only contain letters, numbers, and underscores', 400);
        const existing = await prisma.user.findFirst({
            where: { username, NOT: { id: userId } },
            select: { id: true },
        });
        if (existing)
            throw new AppError('Username already taken', 400);
    }
    if (displayName !== undefined && displayName.length > 50)
        throw new AppError('Display name too long', 400);
    if (bio !== undefined && bio.length > 160)
        throw new AppError('Bio too long', 400);
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
    const userId = requireAccessUserId(req);
    const file = await req.file();
    if (!file)
        throw new AppError('Avatar file is required', 400);
    const extFromName = typeof file.filename === 'string' && file.filename.includes('.') ? file.filename.split('.').pop() : null;
    const extFromMime = typeof file.mimetype === 'string'
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
    const avatarUrl = `${getPublicBaseUrl(req)}/uploads/avatars/${filename}`;
    await prisma.user.update({
        where: { id: userId },
        data: { avatarUrl },
    });
    return { avatarUrl };
});
// ============================================
// MY ARTISTS + FANCLUBS + CONCERT LIFE (v2)
// ============================================
// GET /users/me/artists - Get user's followed artists with stats
app.get('/users/me/artists', async (req) => {
    const userId = requireAccessUserId(req);
    const now = new Date();
    const follows = await prisma.userArtistFollow.findMany({
        where: { userId },
        include: { artist: true },
        orderBy: [{ createdAt: 'desc' }],
    });
    const tierOrder = { 'top-tier': 0, following: 1, casual: 2 };
    follows.sort((a, b) => (tierOrder[a.tier] ?? 99) - (tierOrder[b.tier] ?? 99) || b.createdAt.getTime() - a.createdAt.getTime());
    const artistIds = follows.map((f) => f.artistId);
    const artistNames = follows.map((f) => f.artist.name);
    const artistNamesLower = new Set(artistNames.map((n) => n.toLowerCase()));
    const presaleArtistFilters = artistNames
        .map((n) => n.trim())
        .filter(Boolean)
        .slice(0, 200)
        .map((n) => ({ artistName: { equals: n, mode: 'insensitive' } }));
    const [logs, presales, upcomingEvents, tickets] = await Promise.all([
        artistIds.length
            ? prisma.userLog.findMany({
                where: { userId, event: { artistId: { in: artistIds } } },
                include: { event: { include: { venue: true } } },
                orderBy: { event: { date: 'desc' } },
            })
            : [],
        presaleArtistFilters.length
            ? prisma.presale.findMany({
                where: { presaleStart: { gte: now }, OR: presaleArtistFilters },
                orderBy: { presaleStart: 'asc' },
                take: 200, // capped for UI
            })
            : [],
        artistIds.length
            ? prisma.event.findMany({
                where: { artistId: { in: artistIds }, date: { gte: now } },
                include: { venue: true, artist: true },
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
    ]);
    const logsByArtist = new Map();
    for (const l of logs) {
        const aid = l.event.artistId;
        const arr = logsByArtist.get(aid) ?? [];
        arr.push(l);
        logsByArtist.set(aid, arr);
    }
    const upcomingByArtist = new Map();
    for (const e of upcomingEvents) {
        const arr = upcomingByArtist.get(e.artistId) ?? [];
        arr.push(e);
        upcomingByArtist.set(e.artistId, arr);
    }
    const ticketsByArtist = new Map();
    for (const t of tickets) {
        const aid = t.event.artistId;
        const arr = ticketsByArtist.get(aid) ?? [];
        arr.push(t);
        ticketsByArtist.set(aid, arr);
    }
    const presalesByArtistNameLower = new Map();
    for (const p of presales) {
        const k = p.artistName.toLowerCase();
        if (!artistNamesLower.has(k))
            continue;
        const arr = presalesByArtistNameLower.get(k) ?? [];
        arr.push(p);
        presalesByArtistNameLower.set(k, arr);
    }
    const artistsWithStats = follows.map((follow) => {
        const userLogs = logsByArtist.get(follow.artistId) ?? [];
        const last = userLogs[0];
        const first = userLogs[userLogs.length - 1];
        const artistPresales = presalesByArtistNameLower.get(follow.artist.name.toLowerCase()) ?? [];
        const artistUpcoming = upcomingByArtist.get(follow.artistId) ?? [];
        const userTickets = ticketsByArtist.get(follow.artistId) ?? [];
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
    const userId = requireAccessUserId(req);
    const { artistId } = req.params;
    const body = (req.body ?? {});
    const tier = body.tier;
    if (!tier || !['top-tier', 'following', 'casual'].includes(tier))
        throw new AppError('Invalid tier', 400);
    const result = await prisma.userArtistFollow.updateMany({
        where: { userId, artistId },
        data: { tier },
    });
    if (result.count === 0)
        throw new AppError('Artist not followed', 404);
    return { success: true, tier };
});
// POST /users/me/artists/bulk-follow - Follow multiple artists at once (for onboarding)
app.post('/users/me/artists/bulk-follow', async (req) => {
    const userId = requireAccessUserId(req);
    const body = (req.body ?? {});
    const artists = body.artists;
    if (!artists || !Array.isArray(artists) || artists.length === 0)
        throw new AppError('Artists array required', 400);
    const results = await Promise.all(artists.map(async (artistInput) => {
        const name = artistInput.name?.trim();
        if (!name)
            throw new AppError('Artist name required', 400);
        const spotifyId = artistInput.spotifyId?.trim();
        const tier = artistInput.tier ?? 'following';
        let artist = spotifyId
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
    }));
    return { followed: results.length, artists: results };
});
// ============================================
// FANCLUB ENDPOINTS
// ============================================
// GET /users/me/fanclubs - Get user's fanclub memberships
app.get('/users/me/fanclubs', async (req) => {
    const userId = requireAccessUserId(req);
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
    const userId = requireAccessUserId(req);
    const body = (req.body ?? {});
    if (!body.artistId || !body.artistName || !body.fanclubName)
        throw new AppError('artistId, artistName, and fanclubName are required', 400);
    if (typeof body.isMember !== 'boolean')
        throw new AppError('isMember is required', 400);
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
    const userId = requireAccessUserId(req);
    const { artistId } = req.params;
    await prisma.userFanclub.deleteMany({ where: { userId, artistId } });
    return { success: true };
});
// ============================================
// MY CONCERT LIFE (TIMELINE) ENDPOINTS
// ============================================
// GET /users/me/concert-life - Combined timeline (logs + tickets + tracking)
app.get('/users/me/concert-life', async (req) => {
    const userId = requireAccessUserId(req);
    const q = (req.query ?? {});
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const year = q.year ? Number(q.year) : undefined;
    const logsWhere = { userId };
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
            type: 'log',
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
            type: 'log',
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
            type: 'ticket',
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
            type: 'tracking',
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
            type: 'presale',
            id: p.id,
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
app.get('/users/:id/logs', async (req) => {
    const viewerId = getUserIdFromRequest(req);
    const { id: targetUserId } = req.params;
    const q = (req.query ?? {});
    const limit = Math.max(1, Math.min(50, Number(q.limit ?? 20)));
    const offset = Math.max(0, Number(q.offset ?? 0));
    const year = q.year ? Number(q.year) : undefined;
    const target = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { privacySetting: true },
    });
    if (!target)
        throw new AppError('User not found', 404);
    const viewerFollowsTarget = await getFollowStatus(viewerId, targetUserId);
    const visibilityWhere = buildLogVisibilityWhere(viewerId, targetUserId, target.privacySetting, viewerFollowsTarget);
    const dateWhere = typeof year === 'number' && Number.isFinite(year)
        ? {
            event: {
                date: {
                    gte: new Date(year, 0, 1),
                    lt: new Date(year + 1, 0, 1),
                },
            },
        }
        : {};
    const where = {
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
app.get('/users/:id/venues', async (req) => {
    const viewerId = getUserIdFromRequest(req);
    const { id: targetUserId } = req.params;
    const target = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { privacySetting: true },
    });
    if (!target)
        throw new AppError('User not found', 404);
    const viewerFollowsTarget = await getFollowStatus(viewerId, targetUserId);
    const visibilityWhere = buildLogVisibilityWhere(viewerId, targetUserId, target.privacySetting, viewerFollowsTarget);
    const where = {
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
    const venueMap = new Map();
    for (const log of logs) {
        const venue = log.event.venue;
        if (venue.lat == null || venue.lng == null)
            continue;
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
function eventToPayload(event) {
    return {
        id: event.id,
        name: event.name,
        date: event.date.toISOString(),
        imageUrl: event.imageUrl ?? undefined,
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
function isDbUnavailable(error) {
    const e = error;
    // Non-DB errors shouldn't trigger mock fallbacks.
    const isPrisma = typeof e?.name === 'string' && e.name.startsWith('Prisma');
    // Network / connection refused can come from either Prisma or lower-level clients.
    if (e?.code === 'ECONNREFUSED')
        return true;
    // In production we prefer surfacing DB misconfiguration as a hard failure.
    const isDev = process.env.NODE_ENV !== 'production';
    if (!isDev)
        return false;
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
    if (isPrisma && typeof e?.code === 'string' && prismaUnavailableCodes.has(e.code))
        return true;
    // Some Prisma adapters wrap the underlying Postgres error code/message in meta/cause.
    const originalCode = e?.meta?.driverAdapterError?.cause?.originalCode ?? e?.cause?.originalCode ?? undefined;
    const originalMessage = e?.meta?.driverAdapterError?.cause?.originalMessage ?? e?.cause?.originalMessage ?? e?.message ?? undefined;
    if (typeof originalCode === 'string') {
        // Postgres error classes: 28xxx = invalid auth, 08xxx = connection exception, 3D000 = invalid catalog name (db missing)
        if (originalCode.startsWith('28') || originalCode.startsWith('08') || originalCode === '3D000')
            return true;
    }
    if (typeof originalMessage === 'string') {
        if (/role\s+".*"\s+does\s+not\s+exist/i.test(originalMessage) ||
            /password\s+authentication\s+failed/i.test(originalMessage) ||
            /database\s+".*"\s+does\s+not\s+exist/i.test(originalMessage)) {
            return true;
        }
    }
    return false;
}
function mockDiscovery(city) {
    const mk = (n, overrides) => {
        const base = {
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
    const comingUp = [
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
    const friendsGoing = [
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
    const popular = [
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
function mockEventById(city, id) {
    const mock = mockDiscovery(city);
    return [...mock.comingUp, ...mock.friendsGoing, ...mock.popular].find((e) => e.id === id) ?? null;
}
async function buildDiscoverData(userId, city) {
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
    const artistNames = user?.artistFollows.map((f) => f.artist.name) ?? [];
    const bandsintownEvents = artistNames.length ? await getEventsForMultipleArtists(artistNames, 30) : [];
    const upsertedEvents = await Promise.all(bandsintownEvents.map(async (be) => {
        const headliner = be.lineup?.[0] || be.title || 'Unknown Artist';
        const artist = (await prisma.artist.findFirst({ where: { name: headliner } })) ??
            (await prisma.artist.create({
                data: { name: headliner, genres: [] },
            }));
        const venue = (await prisma.venue.findFirst({
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
            },
            create: {
                name: be.title || `${artist.name} at ${venue.name}`,
                date,
                artistId: artist.id,
                venueId: venue.id,
                source: 'bandsintown',
                externalId: be.id,
            },
            include: { artist: true, venue: true },
        });
    }));
    const events = upsertedEvents
        .filter((e) => e.date > now)
        .sort((a, b) => a.date.getTime() - b.date.getTime());
    const interestedIds = new Set();
    if (userId && events.length) {
        const interested = await prisma.userInterested.findMany({
            where: { userId, eventId: { in: events.map((e) => e.id) } },
            select: { eventId: true },
        });
        for (const row of interested)
            interestedIds.add(row.eventId);
    }
    const friendsByEvent = {};
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
    const popularInterestedIds = new Set();
    if (userId && popularBase.length) {
        const rows = await prisma.userInterested.findMany({
            where: { userId, eventId: { in: popularBase.map((e) => e.id) } },
            select: { eventId: true },
        });
        for (const row of rows)
            popularInterestedIds.add(row.eventId);
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
        const query = (req.query ?? {});
        const city = query.city || 'New York';
        const userId = getUserIdFromRequest(req);
        const data = await buildDiscoverData(userId, city);
        return data;
    }
    catch (error) {
        if (isDbUnavailable(error)) {
            req.log.warn({ error }, 'DB unavailable; returning mock discovery feed');
            return mockDiscovery((req.query ?? {}).city || 'New York');
        }
        req.log.error({ error }, 'Discovery error');
        reply.status(500);
        return { error: 'Failed to load discovery feed' };
    }
});
app.get('/discover/coming-up', async (req, reply) => {
    try {
        const query = (req.query ?? {});
        const limit = Math.max(1, Math.min(50, Number(query.limit ?? 20)));
        const userId = getUserIdFromRequest(req);
        if (!userId)
            return [];
        const data = await buildDiscoverData(userId, 'New York');
        return data.comingUp.slice(0, limit);
    }
    catch (error) {
        if (isDbUnavailable(error)) {
            req.log.warn({ error }, 'DB unavailable; returning mock coming-up feed');
            return mockDiscovery('New York').comingUp.slice(0, Math.max(1, Math.min(50, Number((req.query ?? {}).limit ?? 20))));
        }
        req.log.error({ error }, 'Coming up error');
        reply.status(500);
        return { error: 'Failed to load coming up shows' };
    }
});
app.get('/discover/friends-going', async (req, reply) => {
    try {
        const query = (req.query ?? {});
        const limit = Math.max(1, Math.min(50, Number(query.limit ?? 20)));
        const userId = getUserIdFromRequest(req);
        if (!userId)
            return [];
        const data = await buildDiscoverData(userId, 'New York');
        return data.friendsGoing.slice(0, limit);
    }
    catch (error) {
        if (isDbUnavailable(error)) {
            req.log.warn({ error }, 'DB unavailable; returning mock friends-going feed');
            return mockDiscovery('New York').friendsGoing.slice(0, Math.max(1, Math.min(50, Number((req.query ?? {}).limit ?? 20))));
        }
        req.log.error({ error }, 'Friends going error');
        reply.status(500);
        return { error: 'Failed to load friends going shows' };
    }
});
app.get('/discover/popular', async (req, reply) => {
    try {
        const query = (req.query ?? {});
        const city = query.city || 'New York';
        const limit = Math.max(1, Math.min(50, Number(query.limit ?? 10)));
        const userId = getUserIdFromRequest(req);
        const data = await buildDiscoverData(userId, city);
        return data.popular.slice(0, limit);
    }
    catch (error) {
        if (isDbUnavailable(error)) {
            const q = (req.query ?? {});
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
// ==================== VENUE ROUTES ====================
app.get('/venues/:id', async (req, reply) => {
    try {
        const { id } = req.params;
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
        let userFirstShow;
        let userLastShow;
        let userRatings;
        let friendsWhoVisited = [];
        if (userId) {
            const userLogs = await prisma.userLog.findMany({
                where: { userId, event: { venueId: id } },
                include: { event: { include: { artist: true } } },
                orderBy: { event: { date: 'asc' } },
            });
            userShowCount = userLogs.length;
            if (userLogs.length) {
                const first = userLogs[0];
                const last = userLogs[userLogs.length - 1];
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
                const counts = new Map();
                for (const l of friendLogs)
                    counts.set(l.userId, (counts.get(l.userId) ?? 0) + 1);
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
    }
    catch (error) {
        req.log.error({ error }, 'Get venue error');
        reply.status(500);
        return { error: 'Failed to load venue' };
    }
});
app.get('/venues/:id/events', async (req, reply) => {
    try {
        const { id } = req.params;
        const q = (req.query ?? {});
        const upcoming = q.upcoming !== 'false';
        const limit = Math.max(1, Math.min(50, Number(q.limit ?? 20)));
        const offset = Math.max(0, Number(q.offset ?? 0));
        const userId = getUserIdFromRequest(req);
        const now = new Date();
        const events = await prisma.event.findMany({
            where: {
                venueId: id,
                ...(upcoming ? { date: { gte: now } } : { date: { lt: now } }),
            },
            include: { artist: true, _count: { select: { logs: true } } },
            orderBy: { date: upcoming ? 'asc' : 'desc' },
            take: limit,
            skip: offset,
        });
        const loggedIds = new Set();
        if (userId && events.length) {
            const rows = await prisma.userLog.findMany({
                where: { userId, eventId: { in: events.map((e) => e.id) } },
                select: { eventId: true },
            });
            for (const r of rows)
                loggedIds.add(r.eventId);
        }
        return events.map((e) => ({
            id: e.id,
            name: e.name,
            date: e.date.toISOString(),
            artist: { id: e.artist.id, name: e.artist.name, imageUrl: e.artist.imageUrl ?? undefined },
            ticketUrl: undefined,
            logCount: e._count.logs,
            userLogged: loggedIds.has(e.id),
        }));
    }
    catch (error) {
        req.log.error({ error }, 'Get venue events error');
        reply.status(500);
        return { error: 'Failed to load venue events' };
    }
});
app.post('/venues/:id/ratings', async (req, reply) => {
    try {
        const userId = requireAccessUserId(req);
        const { id } = req.params;
        const body = (req.body ?? {});
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
    }
    catch (error) {
        req.log.error({ error }, 'Submit venue ratings error');
        reply.status(500);
        return { error: 'Failed to submit venue ratings' };
    }
});
app.get('/venues/:id/tips', async (req, reply) => {
    try {
        const { id } = req.params;
        const userId = getUserIdFromRequest(req);
        const q = (req.query ?? {});
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
        const upvoted = new Set();
        if (userId && tips.length) {
            const rows = await prisma.tipUpvote.findMany({
                where: { userId, tipId: { in: tips.map((t) => t.id) } },
                select: { tipId: true },
            });
            for (const r of rows)
                upvoted.add(r.tipId);
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
    }
    catch (error) {
        req.log.error({ error }, 'Get venue tips error');
        reply.status(500);
        return { error: 'Failed to load venue tips' };
    }
});
app.post('/venues/:id/tips', async (req, reply) => {
    try {
        const userId = requireAccessUserId(req);
        const { id } = req.params;
        const body = (req.body ?? {});
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
    }
    catch (error) {
        req.log.error({ error }, 'Create venue tip error');
        reply.status(500);
        return { error: 'Failed to create tip' };
    }
});
app.post('/venues/:id/tips/:tipId/upvote', async (req, reply) => {
    try {
        const userId = requireAccessUserId(req);
        const { tipId } = req.params;
        await prisma.tipUpvote.upsert({
            where: { userId_tipId: { userId, tipId } },
            update: {},
            create: { userId, tipId },
        });
        return { success: true };
    }
    catch (error) {
        req.log.error({ error }, 'Upvote tip error');
        reply.status(500);
        return { error: 'Failed to upvote tip' };
    }
});
app.delete('/venues/:id/tips/:tipId/upvote', async (req, reply) => {
    try {
        const userId = requireAccessUserId(req);
        const { tipId } = req.params;
        await prisma.tipUpvote.deleteMany({ where: { userId, tipId } });
        return { success: true };
    }
    catch (error) {
        req.log.error({ error }, 'Remove tip upvote error');
        reply.status(500);
        return { error: 'Failed to remove upvote' };
    }
});
app.get('/venues/:id/seat-views', async (req, reply) => {
    try {
        const { id } = req.params;
        const q = (req.query ?? {});
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
    }
    catch (error) {
        req.log.error({ error }, 'Get seat views error');
        reply.status(500);
        return { error: 'Failed to load seat views' };
    }
});
app.post('/venues/:id/seat-views', async (req, reply) => {
    try {
        const userId = requireAccessUserId(req);
        const { id } = req.params;
        const file = await req.file();
        if (!file) {
            reply.status(400);
            return { error: 'Photo is required' };
        }
        const fields = (file.fields ?? {});
        const section = typeof fields.section?.value === 'string' ? fields.section.value.trim() : '';
        const row = typeof fields.row?.value === 'string' ? fields.row.value.trim() : '';
        if (!section) {
            reply.status(400);
            return { error: 'Section is required' };
        }
        const extFromName = typeof file.filename === 'string' && file.filename.includes('.') ? file.filename.split('.').pop() : null;
        const extFromMime = typeof file.mimetype === 'string'
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
        const baseUrl = getPublicBaseUrl(req);
        const photoUrl = `${baseUrl}/uploads/seat-views/${filename}`;
        const created = await prisma.seatView.create({
            data: {
                venueId: id,
                userId,
                section,
                row: row || null,
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
            photoUrl: created.photoUrl,
            thumbnailUrl: created.thumbnailUrl ?? undefined,
            user: { id: created.user.id, username: created.user.username },
            eventName: created.event?.name ?? undefined,
            createdAt: created.createdAt.toISOString(),
        };
    }
    catch (error) {
        req.log.error({ error }, 'Create seat view error');
        reply.status(500);
        return { error: 'Failed to create seat view' };
    }
});
// GET /events/search - Search events for ticket entry, logging, etc.
// NOTE: Must be defined BEFORE `/events/:id` so it doesn't get treated as an event id.
app.get('/events/search', async (req, reply) => {
    try {
        // Wallet search is behind auth in the app, so require auth here.
        void requireAccessUserId(req);
        const q = (req.query ?? {}).q?.trim();
        const upcomingRaw = (req.query ?? {}).upcoming;
        const limitRaw = (req.query ?? {}).limit;
        if (!q)
            return [];
        const upcoming = upcomingRaw === 'true' || upcomingRaw === '1';
        const limit = Math.max(1, Math.min(25, Number(limitRaw ?? 10)));
        const where = {
            ...(upcoming ? { date: { gte: new Date() } } : {}),
            OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { artist: { name: { contains: q, mode: 'insensitive' } } },
                { venue: { name: { contains: q, mode: 'insensitive' } } },
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
    }
    catch (error) {
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
        const { id } = req.params;
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
        let userLog = null;
        // Friends
        let friendsWhoWent = [];
        let friendsInterested = [];
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
                }));
                friendsInterested = friendInterested.map((i) => i.user);
            }
        }
        const interestedCount = event._count.interested;
        return {
            ...eventToPayload(event),
            ticketUrl: undefined,
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
    }
    catch (error) {
        if (isDbUnavailable(error)) {
            const { id } = req.params;
            const mock = mockEventById('New York', id);
            if (!mock) {
                reply.status(404);
                return { error: 'Event not found' };
            }
            return {
                ...mock,
                // EventDetails fields (for the Event Page)
                ticketUrl: undefined,
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
        const { id } = req.params;
        await prisma.userInterested.upsert({
            where: { userId_eventId: { userId, eventId: id } },
            update: {},
            create: { userId, eventId: id, notifyOnSale: true },
        });
        return { success: true };
    }
    catch (error) {
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
        const { id } = req.params;
        await prisma.userInterested.delete({
            where: { userId_eventId: { userId, eventId: id } },
        });
        return { success: true };
    }
    catch (error) {
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
        const { id } = req.params;
        const { limit = '20', offset = '0' } = (req.query ?? {});
        const photos = await prisma.logPhoto.findMany({
            where: { log: { eventId: id }, visibility: 'PUBLIC', isFlagged: false },
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
    }
    catch (error) {
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
        const { id } = req.params;
        const { limit = '50', offset = '0' } = (req.query ?? {});
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
    }
    catch (error) {
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
        const { id } = req.params;
        const { text } = (req.body ?? {});
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
    }
    catch (error) {
        if (isDbUnavailable(error)) {
            req.log.warn({ error }, 'DB unavailable; comment is mocked');
            reply.status(201);
            return {
                id: `mock-comment-${Date.now()}`,
                text: req.body?.text ?? '',
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
        const { id, commentId } = req.params;
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
    }
    catch (error) {
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
// GET /events/:id/setlist (stub)
app.get('/events/:id/setlist', async (_req, _reply) => {
    return { songs: [] };
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
    }
    catch (error) {
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
function ticketToPayload(t) {
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
        barcodeFormat: (t.barcodeFormat ?? 'UNKNOWN'),
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
const ticketStatusSet = new Set(['KEEPING', 'SELLING', 'SOLD', 'TRANSFERRED']);
function parseTicketStatus(raw) {
    if (typeof raw !== 'string')
        return undefined;
    const v = raw.trim();
    return ticketStatusSet.has(v) ? v : undefined;
}
// GET /tickets - List tickets for wallet (upcoming/past)
app.get('/tickets', async (req, reply) => {
    try {
        const userId = requireAccessUserId(req);
        const q = (req.query ?? {});
        const upcoming = q.upcoming === 'true' || q.upcoming === '1';
        const past = q.past === 'true' || q.past === '1';
        const statusRaw = typeof q.status === 'string' ? q.status : undefined;
        const status = parseTicketStatus(statusRaw);
        if (statusRaw && !status) {
            reply.status(400);
            return { error: 'Invalid ticket status' };
        }
        const now = new Date();
        const eventDateWhere = upcoming && !past ? { gte: now } : past && !upcoming ? { lt: now } : undefined;
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
    }
    catch (error) {
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
        const userId = requireAccessUserId(req);
        const { id } = req.params;
        const ticket = await prisma.userTicket.findFirst({
            where: { id, userId },
            include: { event: { include: { artist: true, venue: true } } },
        });
        if (!ticket) {
            reply.status(404);
            return { error: 'Ticket not found' };
        }
        return ticketToPayload(ticket);
    }
    catch (error) {
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
        const userId = requireAccessUserId(req);
        const body = (req.body ?? {});
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
    }
    catch (error) {
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
        const userId = requireAccessUserId(req);
        const { id } = req.params;
        const body = (req.body ?? {});
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
                    if (body.status === undefined)
                        return {};
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
    }
    catch (error) {
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
        const userId = requireAccessUserId(req);
        const { id } = req.params;
        const existing = await prisma.userTicket.findFirst({ where: { id, userId }, select: { id: true } });
        if (!existing) {
            reply.status(404);
            return { error: 'Ticket not found' };
        }
        await prisma.userTicket.delete({ where: { id } });
        return { success: true };
    }
    catch (error) {
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
        const userId = requireAccessUserId(req);
        const { id } = req.params;
        const body = (req.body ?? {});
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
    }
    catch (error) {
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
        const userId = requireAccessUserId(req);
        const { id } = req.params;
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
    }
    catch (error) {
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
        const userId = requireAccessUserId(req);
        const q = (req.query ?? {});
        const raw = typeof q.q === 'string' ? q.q : '';
        const query = raw.trim();
        if (!query) {
            return { artists: [], venues: [], events: [], users: [], totalCount: 0 };
        }
        const type = typeof q.type === 'string' ? q.type : undefined;
        const limitRaw = Number(q.limit ?? 20);
        const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(50, limitRaw)) : 20;
        const now = new Date();
        const results = { artists: [], venues: [], events: [], users: [], totalCount: 0 };
        // Artists
        if (!type || type === 'all' || type === 'artists') {
            const artists = await prisma.artist.findMany({
                where: { name: { contains: query, mode: 'insensitive' } },
                select: { id: true, name: true, imageUrl: true, genres: true },
                orderBy: { name: 'asc' },
                take: limit,
            });
            const artistIds = artists.map((a) => a.id);
            const upcomingCounts = artistIds.length === 0
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
            const upcomingCounts = venueIds.length === 0
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
            const following = userIds.length === 0
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
    }
    catch (error) {
        if (isDbUnavailable(error))
            return { artists: [], venues: [], events: [], users: [], totalCount: 0 };
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
    }
    catch (error) {
        if (isDbUnavailable(error))
            return { artists: [], searches: [] };
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
        const body = (req.body ?? {});
        const query = typeof body.query === 'string' ? body.query.trim() : '';
        if (!query) {
            reply.status(400);
            return { error: 'query is required' };
        }
        // In production: persist to SearchLog / analytics pipeline.
        req.log.info({ query }, 'Search logged');
        return { success: true };
    }
    catch (error) {
        req.log.error({ error }, 'Search log error');
        reply.status(200);
        return { success: true };
    }
});
// ==================== ARTIST ROUTES ====================
app.get('/artists/search', async (req, reply) => {
    try {
        const q = (req.query ?? {}).q?.trim();
        const limitRaw = (req.query ?? {}).limit;
        const limit = Math.max(1, Math.min(50, Number(limitRaw ?? 20)));
        if (!q)
            return [];
        const rows = await prisma.artist.findMany({
            where: { name: { contains: q, mode: 'insensitive' } },
            orderBy: { name: 'asc' },
            take: limit,
        });
        return rows.map((a) => ({
            id: a.id,
            name: a.name,
            imageUrl: a.imageUrl ?? undefined,
            genres: a.genres?.length ? a.genres : [],
            spotifyId: a.spotifyId ?? undefined,
        }));
    }
    catch (error) {
        if (isDbUnavailable(error))
            return [];
        req.log.error({ error }, 'Artist search error');
        reply.status(500);
        return { error: 'Failed to search artists' };
    }
});
// GET /artists/search/spotify - Search Spotify for artists
app.get('/artists/search/spotify', async (req, reply) => {
    try {
        const q = (req.query ?? {}).q?.trim();
        const limitRaw = (req.query ?? {}).limit;
        const limit = Math.max(1, Math.min(20, Number(limitRaw ?? 10)));
        if (!q || q.length < 2)
            return [];
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
        const { access_token } = (await tokenRes.json());
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
        const data = (await searchRes.json());
        const items = data.artists?.items ?? [];
        // Map to our format and upsert to database for caching
        const results = await Promise.all(items.map(async (item) => {
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
        }));
        return results;
    }
    catch (error) {
        req.log.error({ error }, 'Spotify artist search error');
        // Keep response stable for the mobile UI.
        reply.status(200);
        return [];
    }
});
app.get('/artists/:id', async (req, reply) => {
    try {
        const { id } = req.params;
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
        let userFirstShow;
        let userLastShow;
        let friendsWhoSaw = [];
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
                const first = userLogs[0];
                const last = userLogs[userLogs.length - 1];
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
                const counts = new Map();
                const lastByUser = new Map();
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
    }
    catch (error) {
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
        const { id } = req.params;
        const q = (req.query ?? {});
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
        const interestedIds = new Set();
        const loggedIds = new Set();
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
            for (const r of interestedRows)
                interestedIds.add(r.eventId);
            for (const r of loggedRows)
                loggedIds.add(r.eventId);
        }
        // Friends going = count of people you follow who marked interested.
        const friendsGoingCountByEvent = {};
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
            ticketUrl: undefined,
            isInterested: interestedIds.has(e.id),
            userLogged: loggedIds.has(e.id),
            logCount: e._count.logs,
            friendsGoing: friendsGoingCountByEvent[e.id] ?? 0,
        }));
    }
    catch (error) {
        if (isDbUnavailable(error))
            return [];
        req.log.error({ error }, 'Get artist events error');
        reply.status(500);
        return { error: 'Failed to load artist events' };
    }
});
function toSafeIdPart(input) {
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
        const { id } = req.params;
        const { includePast } = req.query;
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
        if (!Array.isArray(data))
            return [];
        const events = await Promise.all(data.map(async (e) => {
            const eventId = `bit_${e.id}`;
            const externalId = String(e.id);
            const dateIso = typeof e.datetime === 'string' ? e.datetime : '';
            const date = new Date(dateIso);
            if (!dateIso || Number.isNaN(date.getTime()))
                return null;
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
                },
                update: {
                    name: e.title ? String(e.title) : artist.name,
                    date,
                    source: 'BANDSINTOWN',
                    externalId,
                    venueId,
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
        }));
        const compact = events.filter(Boolean);
        // Sort: upcoming first (ascending), then past (descending)
        if (showPast) {
            compact.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }
        else {
            compact.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        }
        return compact.slice(0, 50);
    }
    catch (error) {
        req.log.error({ error }, 'Bandsintown events fetch error');
        reply.status(200);
        return [];
    }
});
// GET /events/search/bandsintown - Search events by artist name directly
app.get('/events/search/bandsintown', async (req, reply) => {
    try {
        const { artist, includePast } = req.query;
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
        if (!Array.isArray(data))
            return [];
        // Also fetch artist info for image
        let artistImage = null;
        try {
            const artistRes = await fetch(`https://rest.bandsintown.com/artists/${encodedName}?app_id=${appId}`);
            if (artistRes.ok) {
                const artistData = await artistRes.json();
                artistImage = artistData.image_url || artistData.thumb_url || null;
            }
        }
        catch {
            // Ignore
        }
        // Ensure artist exists so returned event IDs can be logged.
        const dbArtist = (await prisma.artist.findFirst({
            where: { name: { equals: artistName, mode: 'insensitive' } },
            select: { id: true, name: true, spotifyId: true, imageUrl: true },
        })) ??
            (await prisma.artist.create({
                data: { name: artistName, imageUrl: artistImage ?? undefined, genres: [] },
                select: { id: true, name: true, spotifyId: true, imageUrl: true },
            }));
        const events = await Promise.all(data.map(async (e) => {
            const eventId = `bit_${e.id}`;
            const externalId = String(e.id);
            const dateIso = typeof e.datetime === 'string' ? e.datetime : '';
            const date = new Date(dateIso);
            if (!dateIso || Number.isNaN(date.getTime()))
                return null;
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
                },
                update: {
                    name: e.title ? String(e.title) : artistName,
                    date,
                    source: 'BANDSINTOWN',
                    externalId,
                    venueId,
                    artistId: dbArtist.id,
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
        }));
        const compact = events.filter(Boolean);
        if (showPast) {
            compact.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }
        else {
            compact.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        }
        return compact.slice(0, 50);
    }
    catch (error) {
        req.log.error({ error }, 'Bandsintown event search error');
        reply.status(200);
        return [];
    }
});
app.post('/artists/:id/follow', async (req) => {
    const userId = requireAccessUserId(req);
    const { id: artistId } = req.params;
    await prisma.userArtistFollow.upsert({
        where: { userId_artistId: { userId, artistId } },
        update: {},
        create: { userId, artistId },
    });
    return { success: true };
});
app.delete('/artists/:id/follow', async (req) => {
    const userId = requireAccessUserId(req);
    const { id: artistId } = req.params;
    await prisma.userArtistFollow.deleteMany({ where: { userId, artistId } });
    return { success: true };
});
app.get('/artists/:id/my-history', async (req) => {
    const userId = requireAccessUserId(req);
    const { id: artistId } = req.params;
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
    const q = (req.query ?? {});
    const limit = Math.max(1, Math.min(50, Number(q.limit ?? 20)));
    const offset = Math.max(0, Number(q.offset ?? 0));
    const city = typeof q.city === 'string' && q.city.trim() ? q.city.trim() : undefined;
    let followedArtistIds = [];
    if (viewerId) {
        const follows = await prisma.userArtistFollow.findMany({
            where: { userId: viewerId },
            select: { artistId: true },
        });
        followedArtistIds = follows.map((f) => f.artistId);
    }
    const where = {
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
                select: { id: true, photoUrl: true },
            },
            comments: {
                take: 3,
                orderBy: { createdAt: 'desc' },
                include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
            },
            _count: { select: { comments: true, wasThere: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
    });
    const logIds = logs.map((l) => l.id);
    const wasThereRows = viewerId && logIds.length
        ? await prisma.wasThere.findMany({ where: { userId: viewerId, logId: { in: logIds } }, select: { logId: true } })
        : [];
    const wasThereSet = new Set(wasThereRows.map((w) => w.logId));
    return logs.map((log) => ({
        id: `public-${log.id}`,
        type: 'log',
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
            photos: (log.photos ?? []).map((p) => ({ id: p.id, photoUrl: p.photoUrl, thumbnailUrl: p.photoUrl })),
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
    }));
});
// GET /feed - Social feed (friends' logs)
app.get('/feed', async (req) => {
    const userId = requireAccessUserId(req);
    const q = (req.query ?? {});
    const limit = Math.max(1, Math.min(50, Number(q.limit ?? 20)));
    const before = typeof q.before === 'string' ? q.before : undefined;
    const following = await prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
    });
    const friendIds = following.map((f) => f.followingId);
    if (!friendIds.length) {
        return { items: [], nextCursor: null, hasNoFriends: true };
    }
    const where = {
        userId: { in: friendIds },
        visibility: { in: ['PUBLIC', 'FRIENDS'] },
    };
    if (before) {
        const d = new Date(before);
        if (!Number.isNaN(d.getTime()))
            where.createdAt = { lt: d };
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
                select: { id: true, photoUrl: true },
            },
            comments: {
                take: 3,
                orderBy: { createdAt: 'desc' },
                include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
            },
            _count: { select: { comments: true, wasThere: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
    });
    const hasMore = logs.length > limit;
    const slice = logs.slice(0, limit);
    const logIds = slice.map((l) => l.id);
    const wasThereRows = logIds.length
        ? await prisma.wasThere.findMany({
            where: { userId, logId: { in: logIds } },
            select: { logId: true },
        })
        : [];
    const wasThereSet = new Set(wasThereRows.map((w) => w.logId));
    const items = slice.map((log) => ({
        id: log.id,
        type: 'log',
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
            photos: (log.photos ?? []).map((p) => ({ id: p.id, photoUrl: p.photoUrl, thumbnailUrl: p.photoUrl })),
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
        userWasThere: wasThereSet.has(log.id),
    }));
    const nextCursor = hasMore && slice.length ? slice[slice.length - 1].createdAt.toISOString() : null;
    return { items, nextCursor, hasNoFriends: false };
});
// ==================== LOG ROUTES ====================
app.get('/logs/check', async (req) => {
    const userId = requireAccessUserId(req);
    const eventId = (req.query ?? {}).eventId;
    if (!eventId)
        throw new AppError('eventId is required', 400);
    const existing = await prisma.userLog.findUnique({
        where: { userId_eventId: { userId, eventId } },
        select: { id: true },
    });
    return { logged: Boolean(existing), logId: existing?.id };
});
app.post('/logs', async (req, reply) => {
    try {
        const userId = requireAccessUserId(req);
        const body = (req.body ?? {});
        const eventId = body.eventId;
        if (!eventId)
            throw new AppError('eventId is required', 400);
        const created = await prisma.userLog.create({
            data: {
                userId,
                eventId,
                rating: typeof body.rating === 'number' ? body.rating : null,
                note: typeof body.note === 'string' ? body.note : null,
                section: typeof body.section === 'string' ? body.section : null,
                row: typeof body.row === 'string' ? body.row : null,
                seat: typeof body.seat === 'string' ? body.seat : null,
                visibility: body.visibility ?? 'PUBLIC',
            },
        });
        const badgeResult = await checkBadges(userId, { award: true, eventId });
        reply.status(201);
        return { id: created.id, newBadges: badgeResult.newBadges };
    }
    catch (error) {
        // Handle "already logged" nicely
        const e = error;
        if (e?.code === 'P2002')
            throw new AppError('Already logged', 409);
        throw error;
    }
});
app.patch('/logs/:id', async (req) => {
    const userId = requireAccessUserId(req);
    const { id } = req.params;
    const body = (req.body ?? {});
    const existing = await prisma.userLog.findUnique({ where: { id }, select: { userId: true } });
    if (!existing)
        throw new AppError('Log not found', 404);
    if (existing.userId !== userId)
        throw new AppError('Forbidden', 403);
    const updated = await prisma.userLog.update({
        where: { id },
        data: {
            ...(body.rating !== undefined && { rating: typeof body.rating === 'number' ? body.rating : null }),
            ...(body.note !== undefined && { note: typeof body.note === 'string' ? body.note : null }),
            ...(body.section !== undefined && { section: typeof body.section === 'string' ? body.section : null }),
            ...(body.row !== undefined && { row: typeof body.row === 'string' ? body.row : null }),
            ...(body.seat !== undefined && { seat: typeof body.seat === 'string' ? body.seat : null }),
            ...(body.visibility !== undefined && { visibility: body.visibility }),
        },
    });
    return { id: updated.id };
});
// GET /logs/:id - log detail (for social feed)
app.get('/logs/:id', async (req, reply) => {
    try {
        const viewerId = requireAccessUserId(req);
        const { id } = req.params;
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
                    select: { id: true, photoUrl: true },
                },
                comments: {
                    orderBy: { createdAt: 'asc' },
                    include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
                },
                tags: {
                    include: { taggedUser: { select: { id: true, username: true, avatarUrl: true } } },
                    orderBy: { createdAt: 'asc' },
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
        const userWasThereRow = await prisma.wasThere.findUnique({
            where: { userId_logId: { userId: viewerId, logId: log.id } },
            select: { id: true },
        });
        const others = await prisma.userLog.findMany({
            where: { eventId: log.eventId, NOT: { id: log.id }, visibility: 'PUBLIC' },
            include: { user: { select: { id: true, username: true, avatarUrl: true } } },
            orderBy: { createdAt: 'desc' },
            take: 12,
        });
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
            type: 'log',
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
                photos: (log.photos ?? []).map((p) => ({ id: p.id, photoUrl: p.photoUrl, thumbnailUrl: p.photoUrl })),
                section: log.section ?? undefined,
                row: log.row ?? undefined,
                seat: log.seat ?? undefined,
                taggedFriends: (log.tags ?? []).map((t) => ({
                    id: t.taggedUser.id,
                    username: t.taggedUser.username,
                    avatarUrl: t.taggedUser.avatarUrl ?? undefined,
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
            comments: previewComments,
            wasThereCount: log._count.wasThere,
            userWasThere: Boolean(userWasThereRow),
            allComments,
            othersWhoWent: others.map((l) => ({
                id: l.user.id,
                username: l.user.username,
                avatarUrl: l.user.avatarUrl ?? undefined,
                rating: typeof l.rating === 'number' ? l.rating : undefined,
            })),
        };
    }
    catch (error) {
        req.log.error({ error }, 'Get log detail error');
        reply.status(500);
        return { error: 'Failed to load log' };
    }
});
// GET /logs/:id/comments
app.get('/logs/:id/comments', async (req, reply) => {
    try {
        const viewerId = requireAccessUserId(req);
        const { id: logId } = req.params;
        const q = (req.query ?? {});
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
        const comments = await prisma.comment.findMany({
            where: { logId },
            include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
            orderBy: { createdAt: 'asc' },
            take: limit,
            skip: offset,
        });
        return comments.map((c) => ({
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
    }
    catch (error) {
        req.log.error({ error }, 'Get log comments error');
        reply.status(500);
        return { error: 'Failed to load comments' };
    }
});
// POST /logs/:id/comments
app.post('/logs/:id/comments', async (req, reply) => {
    try {
        const userId = requireAccessUserId(req);
        const { id: logId } = req.params;
        const body = (req.body ?? {});
        const text = typeof body.text === 'string' ? body.text.trim() : '';
        if (!text) {
            reply.status(400);
            return { error: 'Comment text is required' };
        }
        const exists = await prisma.userLog.findUnique({ where: { id: logId }, select: { id: true } });
        if (!exists) {
            reply.status(404);
            return { error: 'Log not found' };
        }
        const comment = await prisma.comment.create({
            data: { logId, userId, text },
            include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
        });
        reply.status(201);
        return {
            id: comment.id,
            text: comment.text,
            createdAt: comment.createdAt.toISOString(),
            user: {
                id: comment.user.id,
                username: comment.user.username,
                displayName: comment.user.displayName ?? undefined,
                avatarUrl: comment.user.avatarUrl ?? undefined,
            },
        };
    }
    catch (error) {
        req.log.error({ error }, 'Post log comment error');
        reply.status(500);
        return { error: 'Failed to add comment' };
    }
});
// DELETE /logs/:id/comments/:commentId
app.delete('/logs/:id/comments/:commentId', async (req, reply) => {
    try {
        const userId = requireAccessUserId(req);
        const { id: logId, commentId } = req.params;
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
    }
    catch (error) {
        req.log.error({ error }, 'Delete log comment error');
        reply.status(500);
        return { error: 'Failed to delete comment' };
    }
});
// POST /logs/:id/was-there
app.post('/logs/:id/was-there', async (req, reply) => {
    try {
        const userId = requireAccessUserId(req);
        const { id: logId } = req.params;
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
    }
    catch (error) {
        req.log.error({ error }, 'Mark was there error');
        reply.status(500);
        return { error: 'Failed to mark was there' };
    }
});
// DELETE /logs/:id/was-there
app.delete('/logs/:id/was-there', async (req, reply) => {
    try {
        const userId = requireAccessUserId(req);
        const { id: logId } = req.params;
        await prisma.wasThere.deleteMany({ where: { userId, logId } });
        return { success: true };
    }
    catch (error) {
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
    const body = (req.body ?? {});
    const names = Array.isArray(body.artistNames) ? body.artistNames.map((n) => String(n).trim()).filter(Boolean) : [];
    if (!names.length)
        return { presales: [], hasPresales: false };
    const now = new Date();
    const filters = names.slice(0, 50).map((n) => ({ artistName: { equals: n, mode: 'insensitive' } }));
    const presales = await prisma.presale.findMany({
        where: {
            presaleStart: { gte: now },
            OR: filters,
        },
        orderBy: { presaleStart: 'asc' },
        take: 10,
    });
    return {
        presales: presales.map((p) => ({
            id: p.id,
            artistName: p.artistName,
            tourName: p.tourName ?? undefined,
            venueName: p.venueName,
            venueCity: p.venueCity,
            presaleType: p.presaleType,
            presaleStart: p.presaleStart.toISOString(),
            code: p.code ?? undefined,
            signupUrl: p.signupUrl ?? undefined,
            signupDeadline: p.signupDeadline?.toISOString() ?? undefined,
        })),
        hasPresales: presales.length > 0,
    };
});
// GET /presales - Upcoming presales
app.get('/presales', async (req) => {
    const userId = getUserIdFromRequest(req);
    const q = (req.query ?? {});
    const limit = Math.max(1, Math.min(200, Number(q.limit ?? 50)));
    const where = {
        presaleStart: { gte: new Date() },
    };
    if (q.artistId) {
        const artist = await prisma.artist.findUnique({
            where: { id: q.artistId },
            select: { name: true },
        });
        if (artist)
            where.artistName = artist.name;
    }
    const presales = await prisma.presale.findMany({
        where,
        orderBy: { presaleStart: 'asc' },
        take: limit,
    });
    const base = presales.map((p) => ({
        id: p.id,
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
    if (!userId)
        return base;
    const follows = await prisma.userArtistFollow.findMany({
        where: { userId },
        select: { artist: { select: { name: true } } },
    });
    const followedNames = new Set(follows.map((f) => f.artist.name));
    const alerts = await prisma.presaleAlert.findMany({
        where: { userId, presaleId: { in: presales.map((p) => p.id) } },
        select: { presaleId: true },
    });
    const alertedIds = new Set(alerts.map((a) => a.presaleId));
    const enriched = base.map((p) => ({
        ...p,
        hasAlert: alertedIds.has(p.id),
        isFollowed: followedNames.has(p.artistName),
    }));
    enriched.sort((a, b) => {
        const followedDelta = Number(b.isFollowed) - Number(a.isFollowed);
        if (followedDelta !== 0)
            return followedDelta;
        return new Date(a.presaleStart).getTime() - new Date(b.presaleStart).getTime();
    });
    return enriched;
});
// GET /presales/my-artists - Presales for artists user follows
app.get('/presales/my-artists', async (req) => {
    const userId = getUserIdFromRequest(req);
    if (!userId)
        return [];
    const follows = await prisma.userArtistFollow.findMany({
        where: { userId },
        select: { artist: { select: { name: true } } },
    });
    if (follows.length === 0)
        return [];
    const artistNames = follows.map((f) => f.artist.name);
    const presales = await prisma.presale.findMany({
        where: {
            presaleStart: { gte: new Date() },
            OR: artistNames.map((name) => ({
                artistName: { contains: name, mode: 'insensitive' },
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
    const userId = requireAccessUserId(req);
    const alerts = await prisma.presaleAlert.findMany({
        where: { userId },
        include: { presale: true },
        orderBy: { presale: { presaleStart: 'asc' } },
        take: 200,
    });
    return alerts.map((a) => ({
        id: a.presale.id,
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
    const { q, limit = '50' } = req.query;
    if (!q || q.length < 2)
        return [];
    const presales = await prisma.presale.findMany({
        where: {
            presaleStart: { gte: new Date() },
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
    let alertedIds = new Set();
    let followedNames = new Set();
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
    const { id } = req.params;
    const presale = await prisma.presale.findUnique({ where: { id } });
    if (!presale) {
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
    const userId = requireAccessUserId(req);
    const presaleId = req.params.id;
    const alert = await prisma.presaleAlert.upsert({
        where: { userId_presaleId: { userId, presaleId } },
        create: { userId, presaleId },
        update: {},
    });
    return alert;
});
// DELETE /presales/:id/alert - Remove alert
app.delete('/presales/:id/alert', async (req) => {
    const userId = requireAccessUserId(req);
    const presaleId = req.params.id;
    await prisma.presaleAlert.delete({
        where: { userId_presaleId: { userId, presaleId } },
    });
    return { success: true };
});
// ==================== SHOW MODE MEDIA ====================
// POST /show-media/upload (multipart)
app.post('/show-media/upload', async (req, reply) => {
    const userId = requireAccessUserId(req);
    const file = await req.file();
    if (!file)
        throw new AppError('File is required', 400);
    const fields = file.fields ?? {};
    const eventId = typeof fields.eventId?.value === 'string' ? String(fields.eventId.value).trim() : '';
    const typeRaw = typeof fields.type?.value === 'string' ? String(fields.type.value).trim() : 'photo';
    const type = typeRaw === 'video' ? 'video' : 'photo';
    if (!eventId)
        throw new AppError('eventId is required', 400);
    const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
    if (!event)
        throw new AppError('Event not found', 404);
    const extFromName = typeof file.filename === 'string' && file.filename.includes('.') ? file.filename.split('.').pop() : null;
    const extFromMime = typeof file.mimetype === 'string'
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
    const uri = `${getPublicBaseUrl(req)}/uploads/show-media/${filename}`;
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
    const userId = requireAccessUserId(req);
    const { eventId } = req.params;
    const items = await prisma.showMedia.findMany({
        where: { userId, eventId },
        orderBy: { uploadedAt: 'desc' },
        take: 200,
    });
    return items.map((m) => ({ id: m.id, uri: m.uri, type: m.type, uploadedAt: m.uploadedAt.toISOString() }));
});
// DELETE /show-media/:id
app.delete('/show-media/:id', async (req) => {
    const userId = requireAccessUserId(req);
    const { id } = req.params;
    const media = await prisma.showMedia.findUnique({ where: { id } });
    if (!media)
        throw new AppError('Not found', 404);
    if (media.userId !== userId)
        throw new AppError('Forbidden', 403);
    await prisma.showMedia.delete({ where: { id } });
    if (media.storagePath) {
        const filePath = path.join(uploadsRoot, media.storagePath);
        await unlink(filePath).catch(() => undefined);
    }
    return { success: true };
});
app.post('/logs/:id/photos', async (req, reply) => {
    const userId = requireAccessUserId(req);
    const { id: logId } = req.params;
    const log = await prisma.userLog.findUnique({ where: { id: logId }, select: { userId: true } });
    if (!log)
        throw new AppError('Log not found', 404);
    if (log.userId !== userId)
        throw new AppError('Forbidden', 403);
    const file = await req.file();
    if (!file)
        throw new AppError('Photo file is required', 400);
    const extFromName = typeof file.filename === 'string' && file.filename.includes('.') ? file.filename.split('.').pop() : null;
    const extFromMime = typeof file.mimetype === 'string'
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
    const photoUrl = `${getPublicBaseUrl(req)}/uploads/log-photos/${filename}`;
    const created = await prisma.logPhoto.create({
        data: { logId, userId, photoUrl, visibility: 'PUBLIC' },
    });
    reply.status(201);
    return { id: created.id, photoUrl: created.photoUrl };
});
// Not in MVP schema yet (friend tagging)
app.post('/logs/:id/tags', async (req, reply) => {
    const userId = requireAccessUserId(req);
    const { id: logId } = req.params;
    const body = (req.body ?? {});
    const raw = (Array.isArray(body.taggedUserIds) ? body.taggedUserIds : Array.isArray(body.userIds) ? body.userIds : []);
    const taggedUserIds = Array.from(new Set(raw.filter((x) => typeof x === 'string').map((x) => x.trim()).filter(Boolean)));
    if (!taggedUserIds.length)
        throw new AppError('userIds is required', 400);
    if (taggedUserIds.length > 20)
        throw new AppError('Too many tagged users', 400);
    const log = await prisma.userLog.findUnique({ where: { id: logId }, select: { id: true, userId: true } });
    if (!log)
        throw new AppError('Log not found', 404);
    if (log.userId !== userId)
        throw new AppError('Forbidden', 403);
    const existingUsers = await prisma.user.findMany({
        where: { id: { in: taggedUserIds } },
        select: { id: true },
    });
    const existingIds = new Set(existingUsers.map((u) => u.id));
    const validIds = taggedUserIds.filter((id) => existingIds.has(id) && id !== userId);
    await Promise.all(validIds.map((taggedUserId) => prisma.logTag.upsert({
        where: { logId_taggedUserId: { logId, taggedUserId } },
        update: {},
        create: { logId, userId, taggedUserId },
    })));
    reply.status(201);
    return { success: true, taggedUserIds: validIds };
});
// ==================== EVENT IMPORT (BANDSINTOWN) ====================
app.post('/events/import', async (req, reply) => {
    const userId = requireAccessUserId(req);
    void userId; // reserved for future audit/logging
    const body = (req.body ?? {});
    const artistName = typeof body.artistName === 'string' ? body.artistName.trim() : '';
    const venueName = typeof body.venueName === 'string' ? body.venueName.trim() : '';
    const venueCity = typeof body.venueCity === 'string' ? body.venueCity.trim() : 'New York';
    const venueCountry = typeof body.venueCountry === 'string' ? body.venueCountry.trim() : 'US';
    const dateStr = typeof body.date === 'string' ? body.date.trim() : '';
    if (!artistName || !venueName || !dateStr)
        throw new AppError('artistName, venueName, and date are required', 400);
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime()))
        throw new AppError('Invalid date', 400);
    const artist = (await prisma.artist.findFirst({ where: { name: artistName } })) ??
        (await prisma.artist.create({ data: { name: artistName, genres: [] } }));
    const venue = (await prisma.venue.findFirst({ where: { name: venueName, city: venueCity } })) ??
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
    const userId = requireAccessUserId(req);
    const { spotifyToken } = await getUserWithFreshSpotifyToken(userId);
    if (!spotifyToken)
        throw new AppError('Spotify not connected', 400);
    const q = (req.query ?? {});
    const limit = q.limit ? Number.parseInt(q.limit, 10) : 50;
    const timeRange = (q.time_range ?? 'medium_term');
    return await getSpotifyTopArtists(spotifyToken, Number.isFinite(limit) ? limit : 50, timeRange);
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
        }
        catch (err) {
            const e = err;
            if (e?.code === 'EADDRINUSE')
                continue;
            throw err;
        }
    }
    throw new Error(`No free port found starting from ${preferredPort}`);
}
await listenWithFallback();
// Background jobs (best effort)
startERPSyncJob();
