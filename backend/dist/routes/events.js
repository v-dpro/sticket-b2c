"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
// GET /events/search?q=
router.get('/search', async (req, res, next) => {
    try {
        const { q, limit = '10' } = req.query;
        if (!q || typeof q !== 'string') {
            return res.json([]);
        }
        const events = await prisma_1.default.event.findMany({
            where: {
                OR: [
                    { name: { contains: q, mode: 'insensitive' } },
                    { artist: { name: { contains: q, mode: 'insensitive' } } },
                    { venue: { name: { contains: q, mode: 'insensitive' } } },
                ],
            },
            take: parseInt(limit, 10),
            include: {
                artist: true,
                venue: true,
            },
        });
        res.json(events);
    }
    catch (error) {
        next(error);
    }
});
// GET /events/:id
router.get('/:id', auth_1.optionalAuth, async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const event = await prisma_1.default.event.findUnique({
            where: { id },
            include: {
                artist: true,
                venue: true,
                _count: { select: { logs: true, interested: true } },
                setlist: { orderBy: { position: 'asc' } },
            },
        });
        if (!event) {
            throw new errorHandler_1.AppError('Event not found', 404);
        }
        let userLog = null;
        let isInterested = false;
        if (userId) {
            const [log, interested] = await Promise.all([
                prisma_1.default.userLog.findUnique({
                    where: { userId_eventId: { userId, eventId: id } },
                }),
                prisma_1.default.userInterested
                    .findUnique({
                    where: { userId_eventId: { userId, eventId: id } },
                })
                    .then(Boolean),
            ]);
            userLog = log;
            isInterested = interested;
        }
        res.json({
            ...event,
            userLog,
            isInterested,
        });
    }
    catch (error) {
        next(error);
    }
});
// POST /events/:id/interested
router.post('/:id/interested', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        await prisma_1.default.userInterested.upsert({
            where: { userId_eventId: { userId, eventId: id } },
            update: {},
            create: { userId, eventId: id },
        });
        res.json({ success: true });
    }
    catch (error) {
        next(error);
    }
});
// DELETE /events/:id/interested
router.delete('/:id/interested', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        await prisma_1.default.userInterested.delete({
            where: { userId_eventId: { userId, eventId: id } },
        });
        res.json({ success: true });
    }
    catch (error) {
        next(error);
    }
});
// GET /events/:id/logs
router.get('/:id/logs', async (req, res, next) => {
    try {
        const { id } = req.params;
        const logs = await prisma_1.default.userLog.findMany({
            where: { eventId: id },
            include: {
                user: { select: { id: true, username: true, avatarUrl: true } },
                photos: { take: 1 },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(logs);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=events.js.map