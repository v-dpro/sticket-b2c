"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const events_1 = require("../services/events");
const router = (0, express_1.Router)();
// GET /artists/search?q=
router.get('/search', async (req, res, next) => {
    try {
        const { q, limit = '10' } = req.query;
        if (!q || typeof q !== 'string') {
            return res.json([]);
        }
        const artists = await prisma_1.default.artist.findMany({
            where: {
                name: { contains: q, mode: 'insensitive' },
            },
            take: parseInt(limit, 10),
        });
        res.json(artists);
    }
    catch (error) {
        next(error);
    }
});
// GET /artists/:id/my-history - current user's logs for this artist
router.get('/:id/my-history', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const logs = await prisma_1.default.userLog.findMany({
            where: { userId, event: { artistId: id } },
            include: {
                event: { include: { venue: true, artist: true } },
                photos: { take: 1 },
            },
            orderBy: { event: { date: 'desc' } },
        });
        res.json(logs);
    }
    catch (error) {
        next(error);
    }
});
// GET /artists/:id
router.get('/:id', auth_1.optionalAuth, async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const artist = await prisma_1.default.artist.findUnique({
            where: { id },
            include: {
                _count: { select: { events: true, followers: true } },
            },
        });
        if (!artist) {
            throw new errorHandler_1.AppError('Artist not found', 404);
        }
        const [totalLogs, ratingAgg] = await Promise.all([
            prisma_1.default.userLog.count({
                where: { event: { artistId: id } },
            }),
            prisma_1.default.userLog.aggregate({
                where: { event: { artistId: id }, rating: { not: null } },
                _avg: { rating: true },
            }),
        ]);
        let isFollowing = false;
        let userShowCount = 0;
        let userFirstShow = null;
        let userLastShow = null;
        let friendsWhoSaw = [];
        if (userId) {
            isFollowing = await prisma_1.default.userArtistFollow
                .findUnique({
                where: { userId_artistId: { userId, artistId: id } },
            })
                .then(Boolean);
            const userLogs = await prisma_1.default.userLog.findMany({
                where: { userId, event: { artistId: id } },
                include: {
                    event: { include: { venue: true } },
                },
                orderBy: { event: { date: 'asc' } },
            });
            userShowCount = userLogs.length;
            if (userLogs.length > 0) {
                userFirstShow = {
                    eventId: userLogs[0].eventId,
                    date: userLogs[0].event.date,
                    venueName: userLogs[0].event.venue.name,
                    venueCity: userLogs[0].event.venue.city,
                };
                const last = userLogs[userLogs.length - 1];
                userLastShow = {
                    eventId: last.eventId,
                    date: last.event.date,
                    venueName: last.event.venue.name,
                    venueCity: last.event.venue.city,
                };
            }
            // Friends who've seen this artist (people the user follows)
            const following = await prisma_1.default.follow.findMany({
                where: { followerId: userId },
                select: { followingId: true },
            });
            const friendIds = following.map((f) => f.followingId);
            if (friendIds.length > 0) {
                const friendLogs = await prisma_1.default.userLog.groupBy({
                    by: ['userId'],
                    where: { userId: { in: friendIds }, event: { artistId: id } },
                    _count: { _all: true },
                });
                const friendUsers = await prisma_1.default.user.findMany({
                    where: { id: { in: friendLogs.map((f) => f.userId) } },
                    select: { id: true, username: true, displayName: true, avatarUrl: true },
                });
                friendsWhoSaw = friendUsers.map((user) => ({
                    ...user,
                    showCount: friendLogs.find((f) => f.userId === user.id)?._count._all || 0,
                }));
            }
        }
        res.json({
            id: artist.id,
            name: artist.name,
            imageUrl: artist.imageUrl,
            bannerUrl: null,
            genres: artist.genres ?? [],
            bio: artist.bio,
            spotifyId: artist.spotifyId,
            spotifyUrl: artist.spotifyId ? `https://open.spotify.com/artist/${artist.spotifyId}` : null,
            appleMusicUrl: null,
            followerCount: artist._count.followers,
            totalLogs,
            avgRating: ratingAgg._avg.rating,
            isFollowing,
            userShowCount,
            userFirstShow,
            userLastShow,
            friendsWhoSaw,
        });
    }
    catch (error) {
        next(error);
    }
});
// GET /artists/:id/events
router.get('/:id/events', auth_1.optionalAuth, async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const { upcoming = 'true', limit = '20', offset = '0' } = req.query;
        const isUpcoming = upcoming === 'true';
        const now = new Date();
        let events = await prisma_1.default.event.findMany({
            where: {
                artistId: id,
                date: isUpcoming ? { gte: now } : { lt: now },
            },
            orderBy: { date: isUpcoming ? 'asc' : 'desc' },
            take: parseInt(limit, 10),
            skip: parseInt(offset, 10),
            include: {
                venue: true,
                _count: { select: { logs: true, interested: true } },
            },
        });
        // If we have no upcoming events yet, try a best-effort Bandsintown sync.
        if (isUpcoming && events.length === 0 && process.env.BANDSINTOWN_APP_ID) {
            const artist = await prisma_1.default.artist.findUnique({ where: { id }, select: { name: true } });
            if (artist?.name) {
                try {
                    await (0, events_1.syncUpcomingEventsForArtistName)(artist.name, 50);
                    events = await prisma_1.default.event.findMany({
                        where: {
                            artistId: id,
                            date: { gte: now },
                        },
                        orderBy: { date: 'asc' },
                        take: parseInt(limit, 10),
                        skip: parseInt(offset, 10),
                        include: {
                            venue: true,
                            _count: { select: { logs: true, interested: true } },
                        },
                    });
                }
                catch (e) {
                    // eslint-disable-next-line no-console
                    console.error('Artist events sync failed:', e);
                }
            }
        }
        let loggedSet = new Set();
        let interestedSet = new Set();
        let friendCounts = {};
        if (userId && events.length > 0) {
            const eventIds = events.map((e) => e.id);
            const [logs, interested, friendInterested] = await Promise.all([
                prisma_1.default.userLog.findMany({
                    where: { userId, eventId: { in: eventIds } },
                    select: { eventId: true },
                }),
                prisma_1.default.userInterested.findMany({
                    where: { userId, eventId: { in: eventIds } },
                    select: { eventId: true },
                }),
                (async () => {
                    const following = await prisma_1.default.follow.findMany({
                        where: { followerId: userId },
                        select: { followingId: true },
                    });
                    const friendIds = following.map((f) => f.followingId);
                    if (friendIds.length === 0)
                        return {};
                    const counts = await prisma_1.default.userInterested.groupBy({
                        by: ['eventId'],
                        where: { userId: { in: friendIds }, eventId: { in: eventIds } },
                        _count: { _all: true },
                    });
                    return counts.reduce((acc, c) => {
                        acc[c.eventId] = c._count._all;
                        return acc;
                    }, {});
                })(),
            ]);
            loggedSet = new Set(logs.map((l) => l.eventId));
            interestedSet = new Set(interested.map((i) => i.eventId));
            friendCounts = friendInterested;
        }
        const result = events.map((event) => ({
            id: event.id,
            name: event.name,
            date: event.date,
            venue: {
                id: event.venue.id,
                name: event.venue.name,
                city: event.venue.city,
                state: event.venue.state ?? undefined,
            },
            ticketUrl: event.ticketUrl ?? undefined,
            logCount: event._count.logs,
            isInterested: interestedSet.has(event.id),
            userLogged: loggedSet.has(event.id),
            friendsGoing: friendCounts[event.id] || 0,
        }));
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
// POST /artists/:id/follow
router.post('/:id/follow', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        await prisma_1.default.userArtistFollow.upsert({
            where: { userId_artistId: { userId, artistId: id } },
            update: {},
            create: { userId, artistId: id },
        });
        res.json({ success: true });
    }
    catch (error) {
        next(error);
    }
});
// DELETE /artists/:id/follow
router.delete('/:id/follow', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        await prisma_1.default.userArtistFollow.deleteMany({ where: { userId, artistId: id } });
        res.json({ success: true });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=artists.js.map