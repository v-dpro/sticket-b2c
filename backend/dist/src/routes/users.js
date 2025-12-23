"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const spotify_1 = require("../services/spotify");
const router = (0, express_1.Router)();
// GET /users/me/spotify/top-artists
router.get('/me/spotify/top-artists', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { spotifyToken } = await (0, spotify_1.getUserWithFreshSpotifyToken)(req.user.id);
        if (!spotifyToken)
            throw new errorHandler_1.AppError('Spotify not connected', 400);
        const q = req.query;
        const limit = q.limit ? Number.parseInt(q.limit, 10) : 50;
        const timeRange = (q.time_range ?? 'medium_term');
        const artists = await (0, spotify_1.getSpotifyTopArtists)(spotifyToken, Number.isFinite(limit) ? limit : 50, timeRange);
        res.json(artists);
    }
    catch (error) {
        next(error);
    }
});
// POST /users/push-token (alias of /notifications/push-token for older clients)
router.post('/push-token', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { token } = req.body;
        if (!token)
            return res.status(400).json({ error: 'token is required' });
        await prisma_1.default.pushToken.upsert({
            where: { token },
            update: { userId: req.user.id, updatedAt: new Date() },
            create: { userId: req.user.id, token },
        });
        res.json({ success: true });
    }
    catch (error) {
        next(error);
    }
});
// DELETE /users/push-token (alias of /notifications/push-token)
router.delete('/push-token', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { token } = req.body;
        if (!token)
            return res.status(400).json({ error: 'token is required' });
        await prisma_1.default.pushToken.deleteMany({ where: { token } });
        res.json({ success: true });
    }
    catch (error) {
        next(error);
    }
});
// GET /users/search?q=
router.get('/search', async (req, res, next) => {
    try {
        const { q, limit = '10' } = req.query;
        if (!q || typeof q !== 'string') {
            return res.json([]);
        }
        const users = await prisma_1.default.user.findMany({
            where: {
                OR: [
                    { username: { contains: q.toLowerCase(), mode: 'insensitive' } },
                    { displayName: { contains: q, mode: 'insensitive' } },
                ],
            },
            take: parseInt(limit, 10),
            select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
            },
        });
        res.json(users);
    }
    catch (error) {
        next(error);
    }
});
// GET /users/:id
router.get('/:id', auth_1.optionalAuth, async (req, res, next) => {
    try {
        const { id } = req.params;
        const currentUserId = req.user?.id;
        const user = await prisma_1.default.user.findUnique({
            where: { id },
            select: {
                id: true,
                username: true,
                displayName: true,
                bio: true,
                avatarUrl: true,
                city: true,
                privacySetting: true,
                createdAt: true,
                _count: {
                    select: {
                        logs: true,
                        followers: true,
                        following: true,
                    },
                },
            },
        });
        if (!user) {
            throw new errorHandler_1.AppError('User not found', 404);
        }
        let isFollowing = false;
        if (currentUserId && currentUserId !== id) {
            const follow = await prisma_1.default.follow.findUnique({
                where: {
                    followerId_followingId: {
                        followerId: currentUserId,
                        followingId: id,
                    },
                },
            });
            isFollowing = !!follow;
        }
        res.json({
            ...user,
            isFollowing,
            stats: {
                shows: user._count.logs,
                followers: user._count.followers,
                following: user._count.following,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
// PATCH /users/:id
router.patch('/:id', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        if (req.user.id !== id) {
            throw new errorHandler_1.AppError('Not authorized', 403);
        }
        const { displayName, bio, avatarUrl, city, username, privacySetting } = req.body;
        if (username) {
            const existing = await prisma_1.default.user.findFirst({
                where: {
                    username: username.toLowerCase(),
                    NOT: { id },
                },
            });
            if (existing) {
                throw new errorHandler_1.AppError('Username already taken', 400);
            }
        }
        const user = await prisma_1.default.user.update({
            where: { id },
            data: {
                ...(displayName !== undefined && { displayName }),
                ...(bio !== undefined && { bio }),
                ...(avatarUrl !== undefined && { avatarUrl }),
                ...(city !== undefined && { city }),
                ...(username !== undefined && { username: username.toLowerCase() }),
                ...(privacySetting !== undefined && { privacySetting }),
            },
            select: {
                id: true,
                email: true,
                username: true,
                displayName: true,
                bio: true,
                avatarUrl: true,
                city: true,
                privacySetting: true,
            },
        });
        res.json(user);
    }
    catch (error) {
        next(error);
    }
});
// GET /users/:id/logs
router.get('/:id/logs', auth_1.optionalAuth, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { limit = '20', offset = '0' } = req.query;
        const logs = await prisma_1.default.userLog.findMany({
            where: { userId: id },
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit, 10),
            skip: parseInt(offset, 10),
            include: {
                event: {
                    include: {
                        artist: true,
                        venue: true,
                    },
                },
                photos: { take: 1 },
                _count: { select: { comments: true } },
            },
        });
        res.json(logs);
    }
    catch (error) {
        next(error);
    }
});
// GET /users/:id/stats
router.get('/:id/stats', async (req, res, next) => {
    try {
        const { id } = req.params;
        const [showCount, artistCount, venueCount] = await Promise.all([
            prisma_1.default.userLog.count({ where: { userId: id } }),
            prisma_1.default.userLog
                .findMany({
                where: { userId: id },
                select: { event: { select: { artistId: true } } },
                distinct: ['eventId'],
            })
                .then((logs) => new Set(logs.map((l) => l.event.artistId)).size),
            prisma_1.default.userLog
                .findMany({
                where: { userId: id },
                select: { event: { select: { venueId: true } } },
                distinct: ['eventId'],
            })
                .then((logs) => new Set(logs.map((l) => l.event.venueId)).size),
        ]);
        res.json({
            shows: showCount,
            artists: artistCount,
            venues: venueCount,
        });
    }
    catch (error) {
        next(error);
    }
});
// POST /users/:id/follow
router.post('/:id/follow', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const followerId = req.user.id;
        if (followerId === id) {
            throw new errorHandler_1.AppError('Cannot follow yourself', 400);
        }
        await prisma_1.default.follow.create({
            data: {
                followerId,
                followingId: id,
            },
        });
        res.json({ success: true });
    }
    catch (error) {
        next(error);
    }
});
// DELETE /users/:id/follow
router.delete('/:id/follow', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const followerId = req.user.id;
        await prisma_1.default.follow.delete({
            where: {
                followerId_followingId: {
                    followerId,
                    followingId: id,
                },
            },
        });
        res.json({ success: true });
    }
    catch (error) {
        next(error);
    }
});
// GET /users/:id/following
router.get('/:id/following', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { limit = '20', offset = '0' } = req.query;
        const following = await prisma_1.default.follow.findMany({
            where: { followerId: id },
            take: parseInt(limit, 10),
            skip: parseInt(offset, 10),
            include: {
                following: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                    },
                },
            },
        });
        res.json(following.map((f) => f.following));
    }
    catch (error) {
        next(error);
    }
});
// GET /users/:id/followers
router.get('/:id/followers', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { limit = '20', offset = '0' } = req.query;
        const followers = await prisma_1.default.follow.findMany({
            where: { followingId: id },
            take: parseInt(limit, 10),
            skip: parseInt(offset, 10),
            include: {
                follower: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                    },
                },
            },
        });
        res.json(followers.map((f) => f.follower));
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map