"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /feed
router.get('/', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { limit = '20', offset = '0' } = req.query;
        const following = await prisma_1.default.follow.findMany({
            where: { followerId: userId },
            select: { followingId: true },
        });
        const friendIds = following.map((f) => f.followingId);
        const logs = friendIds.length
            ? await prisma_1.default.userLog.findMany({
                where: {
                    userId: { in: friendIds },
                    visibility: { not: 'PRIVATE' },
                },
                orderBy: { createdAt: 'desc' },
                take: parseInt(limit, 10),
                skip: parseInt(offset, 10),
                include: {
                    user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
                    event: { include: { artist: true, venue: true } },
                    photos: { take: 1 },
                    _count: { select: { comments: true } },
                },
            })
            : [];
        res.json(logs);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=feed.js.map