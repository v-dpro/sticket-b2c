"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /venues/search?q=
router.get('/search', async (req, res, next) => {
    try {
        const { q, city, limit = '10' } = req.query;
        if (!q || typeof q !== 'string') {
            return res.json([]);
        }
        const venues = await prisma_1.default.venue.findMany({
            where: {
                name: { contains: q, mode: 'insensitive' },
                ...(city && { city: { contains: city, mode: 'insensitive' } }),
            },
            take: parseInt(limit, 10),
        });
        res.json(venues);
    }
    catch (error) {
        next(error);
    }
});
// GET /venues/:id
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const venue = await prisma_1.default.venue.findUnique({
            where: { id },
            include: {
                _count: { select: { events: true, ratings: true } },
            },
        });
        res.json(venue);
    }
    catch (error) {
        next(error);
    }
});
// GET /venues/:id/events
router.get('/:id/events', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { upcoming = 'true', limit = '20' } = req.query;
        const events = await prisma_1.default.event.findMany({
            where: {
                venueId: id,
                ...(upcoming === 'true' && { date: { gte: new Date() } }),
                ...(upcoming === 'false' && { date: { lt: new Date() } }),
            },
            orderBy: { date: upcoming === 'true' ? 'asc' : 'desc' },
            take: parseInt(limit, 10),
            include: { artist: true },
        });
        res.json(events);
    }
    catch (error) {
        next(error);
    }
});
// POST /venues/:id/ratings
router.post('/:id/ratings', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { sound, sightlines, drinks, staff, access } = req.body;
        const rating = await prisma_1.default.venueRating.upsert({
            where: { userId_venueId: { userId, venueId: id } },
            update: { sound, sightlines, drinks, staff, access },
            create: { userId, venueId: id, sound, sightlines, drinks, staff, access },
        });
        res.json(rating);
    }
    catch (error) {
        next(error);
    }
});
// GET /venues/:id/tips
router.get('/:id/tips', async (req, res, next) => {
    try {
        const { id } = req.params;
        const tips = await prisma_1.default.venueTip.findMany({
            where: { venueId: id },
            orderBy: { upvotes: 'desc' },
            include: {
                user: { select: { id: true, username: true, avatarUrl: true } },
            },
        });
        res.json(tips);
    }
    catch (error) {
        next(error);
    }
});
// POST /venues/:id/tips
router.post('/:id/tips', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { text } = req.body;
        const tip = await prisma_1.default.venueTip.create({
            data: { userId, venueId: id, text: text ?? '' },
        });
        res.json(tip);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=venues.js.map