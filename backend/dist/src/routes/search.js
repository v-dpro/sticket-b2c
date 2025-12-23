"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const router = (0, express_1.Router)();
// GET /search?q=&type=
router.get('/', async (req, res, next) => {
    try {
        const { q, type, limit = '10' } = req.query;
        if (!q || typeof q !== 'string') {
            return res.json({ artists: [], venues: [], events: [], users: [] });
        }
        const searchLimit = parseInt(limit, 10);
        const results = {};
        if (!type || type === 'artists') {
            results.artists = await prisma_1.default.artist.findMany({
                where: { name: { contains: q, mode: 'insensitive' } },
                take: searchLimit,
            });
        }
        if (!type || type === 'venues') {
            results.venues = await prisma_1.default.venue.findMany({
                where: { name: { contains: q, mode: 'insensitive' } },
                take: searchLimit,
            });
        }
        if (!type || type === 'events') {
            results.events = await prisma_1.default.event.findMany({
                where: {
                    OR: [{ name: { contains: q, mode: 'insensitive' } }, { artist: { name: { contains: q, mode: 'insensitive' } } }],
                },
                take: searchLimit,
                include: { artist: true, venue: true },
            });
        }
        if (!type || type === 'users') {
            results.users = await prisma_1.default.user.findMany({
                where: {
                    OR: [{ username: { contains: q, mode: 'insensitive' } }, { displayName: { contains: q, mode: 'insensitive' } }],
                },
                take: searchLimit,
                select: { id: true, username: true, displayName: true, avatarUrl: true },
            });
        }
        res.json(results);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=search.js.map