"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const setlistfm = __importStar(require("../services/setlistfm"));
const router = (0, express_1.Router)();
// GET /events/search?q=
router.get('/search', async (req, res, next) => {
    try {
        const { q, limit = '10', upcoming } = req.query;
        if (!q || typeof q !== 'string') {
            return res.json([]);
        }
        const events = await prisma_1.default.event.findMany({
            where: {
                ...(upcoming === 'true' ? { date: { gte: new Date() } } : {}),
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
// GET /events/:id/setlist
router.get('/:id/setlist', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const event = await prisma_1.default.event.findUnique({
            where: { id },
            include: {
                artist: true,
                venue: true,
                setlist: { orderBy: { position: 'asc' } },
            },
        });
        if (!event)
            throw new errorHandler_1.AppError('Event not found', 404);
        // If we already cached songs, return immediately (best-effort URL lookup).
        if (event.setlist.length > 0) {
            let url = null;
            if (event.setlistfmId) {
                const full = await setlistfm.getSetlist(event.setlistfmId);
                url = full?.url ?? null;
            }
            return res.json({
                songs: event.setlist.map((s) => ({
                    position: s.position,
                    songName: s.songName,
                    isEncore: s.isEncore,
                    info: s.info,
                })),
                url,
            });
        }
        const setlist = await setlistfm.getSetlistForEvent(event.artist.name, event.venue.name, event.date);
        if (!setlist) {
            return res.json({ songs: [], url: null });
        }
        const songs = setlistfm.extractSongs(setlist);
        await prisma_1.default.$transaction(async (tx) => {
            await tx.event.update({
                where: { id: event.id },
                data: { setlistfmId: setlist.id },
            });
            await tx.setlistSong.deleteMany({ where: { eventId: event.id } });
            if (songs.length > 0) {
                await tx.setlistSong.createMany({
                    data: songs.map((song, idx) => ({
                        eventId: event.id,
                        position: idx + 1,
                        songName: song.name,
                        isEncore: song.isEncore,
                        info: song.info ?? null,
                    })),
                });
            }
        });
        res.json({
            songs: songs.map((s, idx) => ({
                position: idx + 1,
                songName: s.name,
                isEncore: s.isEncore,
                info: s.info,
            })),
            url: setlist.url ?? null,
        });
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