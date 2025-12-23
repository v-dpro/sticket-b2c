"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /discover
router.get('/', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { city } = req.query;
        const artistFollows = await prisma_1.default.userArtistFollow.findMany({
            where: { userId },
            include: { artist: true },
        });
        const artistIds = artistFollows.map((f) => f.artistId);
        const comingUp = artistIds.length
            ? await prisma_1.default.event.findMany({
                where: {
                    artistId: { in: artistIds },
                    date: { gte: new Date() },
                },
                orderBy: { date: 'asc' },
                take: 20,
                include: {
                    artist: true,
                    venue: true,
                },
            })
            : [];
        const following = await prisma_1.default.follow.findMany({
            where: { followerId: userId },
            select: { followingId: true },
        });
        const friendIds = following.map((f) => f.followingId);
        const friendsInterested = friendIds.length
            ? await prisma_1.default.userInterested.findMany({
                where: {
                    userId: { in: friendIds },
                    event: { date: { gte: new Date() } },
                },
                include: {
                    event: { include: { artist: true, venue: true } },
                    user: { select: { id: true, username: true, avatarUrl: true } },
                },
            })
            : [];
        const friendsGoingMap = new Map();
        for (const fi of friendsInterested) {
            if (!friendsGoingMap.has(fi.eventId)) {
                friendsGoingMap.set(fi.eventId, {
                    ...fi.event,
                    friendsGoing: [],
                });
            }
            friendsGoingMap.get(fi.eventId).friendsGoing.push(fi.user);
        }
        const friendsGoing = Array.from(friendsGoingMap.values())
            .sort((a, b) => b.friendsGoing.length - a.friendsGoing.length)
            .slice(0, 20);
        const popularCity = city || 'New York';
        const popular = await prisma_1.default.event.findMany({
            where: {
                venue: { city: popularCity },
                date: { gte: new Date() },
            },
            orderBy: {
                interested: { _count: 'desc' },
            },
            take: 10,
            include: {
                artist: true,
                venue: true,
                _count: { select: { interested: true } },
            },
        });
        res.json({
            comingUp,
            friendsGoing,
            popular,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=discover.js.map