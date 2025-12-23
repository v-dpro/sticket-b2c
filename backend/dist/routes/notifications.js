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
        const { limit = '20', offset = '0' } = req.query;
        const notifications = await prisma_1.default.notification.findMany({
            where: { recipientId: userId },
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit, 10),
            skip: parseInt(offset, 10),
            include: {
                actor: { select: { id: true, username: true, avatarUrl: true } },
            },
        });
        const unreadCount = await prisma_1.default.notification.count({
            where: { recipientId: userId, isRead: false },
        });
        res.json({ notifications, unreadCount });
    }
    catch (error) {
        next(error);
    }
});
// PATCH /notifications/:id/read
router.patch('/:id/read', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        await prisma_1.default.notification.update({
            where: { id },
            data: { isRead: true },
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
            where: { recipientId: userId, isRead: false },
            data: { isRead: true },
        });
        res.json({ success: true });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=notifications.js.map