"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /notifications
router.get('/', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { limit = '30', before } = req.query;
        const whereClause = { userId };
        if (before) {
            whereClause.createdAt = { lt: new Date(before) };
        }
        const take = Math.min(Math.max(parseInt(limit, 10) || 30, 1), 50);
        const [notifications, unreadCount] = await Promise.all([
            prisma_1.default.notification.findMany({
                where: whereClause,
                include: {
                    actor: {
                        select: { id: true, username: true, avatarUrl: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: take + 1,
            }),
            prisma_1.default.notification.count({
                where: { userId, read: false },
            }),
        ]);
        const hasMore = notifications.length > take;
        const items = notifications.slice(0, take);
        res.json({
            notifications: items.map((n) => ({
                id: n.id,
                type: n.type,
                title: n.title,
                body: n.body,
                read: n.read,
                createdAt: n.createdAt.toISOString(),
                actor: n.actor,
                data: n.data,
            })),
            nextCursor: hasMore ? items[items.length - 1]?.createdAt.toISOString() : null,
            unreadCount,
        });
    }
    catch (error) {
        next(error);
    }
});
// GET /notifications/unread-count
router.get('/unread-count', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const count = await prisma_1.default.notification.count({
            where: { userId: req.user.id, read: false },
        });
        res.json({ count });
    }
    catch (error) {
        next(error);
    }
});
// PATCH /notifications/:id/read
router.patch('/:id/read', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        await prisma_1.default.notification.updateMany({
            where: { id, userId },
            data: { read: true },
        });
        res.json({ success: true });
    }
    catch (error) {
        next(error);
    }
});
// POST /notifications/read-all
router.post('/read-all', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const userId = req.user.id;
        await prisma_1.default.notification.updateMany({
            where: { userId, read: false },
            data: { read: true },
        });
        res.json({ success: true });
    }
    catch (error) {
        next(error);
    }
});
// GET /notifications/preferences
router.get('/preferences', auth_1.authenticateToken, async (req, res, next) => {
    try {
        let prefs = await prisma_1.default.notificationPreferences.findUnique({
            where: { userId: req.user.id },
        });
        if (!prefs) {
            prefs = await prisma_1.default.notificationPreferences.create({
                data: { userId: req.user.id },
            });
        }
        res.json(prefs);
    }
    catch (error) {
        next(error);
    }
});
// PATCH /notifications/preferences
router.patch('/preferences', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const prefs = await prisma_1.default.notificationPreferences.upsert({
            where: { userId: req.user.id },
            update: req.body,
            create: { userId: req.user.id, ...req.body },
        });
        res.json(prefs);
    }
    catch (error) {
        next(error);
    }
});
// POST /notifications/push-token
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
// DELETE /notifications/push-token
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
exports.default = router;
//# sourceMappingURL=notifications.js.map