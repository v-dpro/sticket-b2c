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
// GET /tickets
router.get('/', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const tickets = await prisma_1.default.userTicket.findMany({
            where: { userId },
            orderBy: { event: { date: 'asc' } },
            include: {
                event: { include: { artist: true, venue: true } },
            },
        });
        const now = new Date();
        const upcoming = tickets.filter((t) => t.event.date >= now);
        const past = tickets.filter((t) => t.event.date < now);
        res.json({ upcoming, past });
    }
    catch (error) {
        next(error);
    }
});
// POST /tickets
router.post('/', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { eventId, section, row, seat, barcode } = req.body;
        const ticket = await prisma_1.default.userTicket.create({
            data: {
                userId,
                eventId,
                section,
                row,
                seat,
                barcode,
            },
            include: {
                event: { include: { artist: true, venue: true } },
            },
        });
        res.status(201).json(ticket);
    }
    catch (error) {
        next(error);
    }
});
// PATCH /tickets/:id
router.patch('/:id', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const existing = await prisma_1.default.userTicket.findUnique({ where: { id } });
        if (!existing || existing.userId !== userId) {
            throw new errorHandler_1.AppError('Not authorized', 403);
        }
        const { status, section, row, seat } = req.body;
        const ticket = await prisma_1.default.userTicket.update({
            where: { id },
            data: { status, section, row, seat },
        });
        res.json(ticket);
    }
    catch (error) {
        next(error);
    }
});
// DELETE /tickets/:id
router.delete('/:id', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const existing = await prisma_1.default.userTicket.findUnique({ where: { id } });
        if (!existing || existing.userId !== userId) {
            throw new errorHandler_1.AppError('Not authorized', 403);
        }
        await prisma_1.default.userTicket.delete({ where: { id } });
        res.json({ success: true });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=tickets.js.map