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
// POST /logs
router.post('/', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { eventId, rating, note, section, row, seat, visibility } = req.body;
        const log = await prisma_1.default.userLog.create({
            data: {
                userId,
                eventId,
                rating,
                note,
                section,
                row,
                seat,
                visibility,
            },
            include: {
                event: {
                    include: { artist: true, venue: true },
                },
            },
        });
        res.status(201).json(log);
    }
    catch (error) {
        next(error);
    }
});
// GET /logs/:id
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const log = await prisma_1.default.userLog.findUnique({
            where: { id },
            include: {
                user: { select: { id: true, username: true, avatarUrl: true } },
                event: { include: { artist: true, venue: true } },
                photos: true,
                comments: {
                    include: {
                        user: { select: { id: true, username: true, avatarUrl: true } },
                    },
                    orderBy: { createdAt: 'asc' },
                },
            },
        });
        res.json(log);
    }
    catch (error) {
        next(error);
    }
});
// PATCH /logs/:id
router.patch('/:id', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { rating, note, section, row, seat, visibility } = req.body;
        const existing = await prisma_1.default.userLog.findUnique({ where: { id } });
        if (!existing || existing.userId !== userId) {
            throw new errorHandler_1.AppError('Not authorized', 403);
        }
        const log = await prisma_1.default.userLog.update({
            where: { id },
            data: { rating, note, section, row, seat, visibility },
        });
        res.json(log);
    }
    catch (error) {
        next(error);
    }
});
// DELETE /logs/:id
router.delete('/:id', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const existing = await prisma_1.default.userLog.findUnique({ where: { id } });
        if (!existing || existing.userId !== userId) {
            throw new errorHandler_1.AppError('Not authorized', 403);
        }
        await prisma_1.default.userLog.delete({ where: { id } });
        res.json({ success: true });
    }
    catch (error) {
        next(error);
    }
});
// POST /logs/:id/comments
router.post('/:id/comments', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { text } = req.body;
        const comment = await prisma_1.default.comment.create({
            data: { logId: id, userId, text: text ?? '' },
            include: {
                user: { select: { id: true, username: true, avatarUrl: true } },
            },
        });
        res.status(201).json(comment);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=logs.js.map