"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
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
// GET /artists/:id
router.get('/:id', auth_1.optionalAuth, async (req, res, next) => {
    try {
        const { id } = req.params;
        const artist = await prisma_1.default.artist.findUnique({
            where: { id },
            include: {
                _count: { select: { events: true, followers: true } },
            },
        });
        res.json(artist);
    }
    catch (error) {
        next(error);
    }
});
// GET /artists/:id/events
router.get('/:id/events', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { upcoming = 'true', limit = '20' } = req.query;
        const events = await prisma_1.default.event.findMany({
            where: {
                artistId: id,
                ...(upcoming === 'true' && { date: { gte: new Date() } }),
                ...(upcoming === 'false' && { date: { lt: new Date() } }),
            },
            orderBy: { date: upcoming === 'true' ? 'asc' : 'desc' },
            take: parseInt(limit, 10),
            include: { venue: true },
        });
        res.json(events);
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
        await prisma_1.default.userArtistFollow.delete({
            where: { userId_artistId: { userId, artistId: id } },
        });
        res.json({ success: true });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=artists.js.map