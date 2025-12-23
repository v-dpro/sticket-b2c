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
const ticketInclude = {
    event: { include: { artist: { select: { id: true, name: true, imageUrl: true } }, venue: { select: { id: true, name: true, city: true, state: true } } } },
};
function toBoolean(value) {
    if (value === 'true' || value === true)
        return true;
    if (value === 'false' || value === false)
        return false;
    return null;
}
// GET /tickets
// - Legacy: no params -> { upcoming, past }
// - Wallet API: ?upcoming=true or ?past=true -> Ticket[]
router.get('/', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const upcoming = toBoolean(req.query.upcoming);
        const past = toBoolean(req.query.past);
        const status = typeof req.query.status === 'string' ? req.query.status : undefined;
        const now = new Date();
        const where = { userId };
        if (upcoming === true) {
            where.event = { date: { gte: now } };
        }
        else if (past === true) {
            where.event = { date: { lt: now } };
        }
        if (status) {
            where.status = status;
        }
        // New contract: return flat list when filtering by upcoming/past/status.
        if (upcoming !== null || past !== null || status) {
            const tickets = await prisma_1.default.userTicket.findMany({
                where,
                include: ticketInclude,
                orderBy: { event: { date: upcoming === true ? 'asc' : 'desc' } },
            });
            res.json(tickets);
            return;
        }
        // Legacy response used by older clients.
        const tickets = await prisma_1.default.userTicket.findMany({
            where: { userId },
            include: ticketInclude,
            orderBy: { event: { date: 'asc' } },
        });
        const upcomingTickets = tickets.filter((t) => t.event.date >= now);
        const pastTickets = tickets.filter((t) => t.event.date < now);
        res.json({ upcoming: upcomingTickets, past: pastTickets });
    }
    catch (error) {
        next(error);
    }
});
// GET /tickets/:id
router.get('/:id', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const ticket = await prisma_1.default.userTicket.findFirst({
            where: { id, userId },
            include: ticketInclude,
        });
        if (!ticket) {
            throw new errorHandler_1.AppError('Ticket not found', 404);
        }
        res.json(ticket);
    }
    catch (error) {
        next(error);
    }
});
// POST /tickets
router.post('/', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { eventId, artistName, venueName, eventDate, section, row, seat, isGeneralAdmission, barcode, barcodeFormat, confirmationNumber, purchasePrice, notes, } = req.body;
        let finalEventId = eventId;
        // If no eventId, create event from manual entry
        if (!finalEventId && artistName && venueName && eventDate) {
            let artist = await prisma_1.default.artist.findFirst({
                where: { name: { equals: artistName, mode: 'insensitive' } },
            });
            if (!artist) {
                artist = await prisma_1.default.artist.create({ data: { name: artistName } });
            }
            let venue = await prisma_1.default.venue.findFirst({
                where: { name: { equals: venueName, mode: 'insensitive' } },
            });
            if (!venue) {
                venue = await prisma_1.default.venue.create({ data: { name: venueName, city: 'Unknown', country: 'US' } });
            }
            const date = new Date(eventDate);
            const existingEvent = await prisma_1.default.event.findFirst({
                where: { artistId: artist.id, venueId: venue.id, date },
            });
            const event = existingEvent ??
                (await prisma_1.default.event.create({
                    data: {
                        artistId: artist.id,
                        venueId: venue.id,
                        date,
                        name: `${artistName} at ${venueName}`,
                    },
                }));
            finalEventId = event.id;
        }
        if (!finalEventId) {
            throw new errorHandler_1.AppError('Event information required', 400);
        }
        const ticket = await prisma_1.default.userTicket.create({
            data: {
                userId,
                eventId: finalEventId,
                section,
                row,
                seat,
                isGeneralAdmission: Boolean(isGeneralAdmission),
                barcode: barcode || null,
                barcodeFormat: typeof barcodeFormat === 'string' ? barcodeFormat : 'UNKNOWN',
                confirmationNumber: confirmationNumber || null,
                purchasePrice: typeof purchasePrice === 'number' ? purchasePrice : purchasePrice ? Number(purchasePrice) : null,
                notes: notes || null,
                status: 'KEEPING',
                source: barcode ? 'SCAN' : 'MANUAL',
            },
            include: ticketInclude,
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
        const existing = await prisma_1.default.userTicket.findFirst({ where: { id, userId } });
        if (!existing) {
            throw new errorHandler_1.AppError('Ticket not found', 404);
        }
        const ticket = await prisma_1.default.userTicket.update({
            where: { id },
            data: req.body,
            include: ticketInclude,
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
        const existing = await prisma_1.default.userTicket.findFirst({ where: { id, userId } });
        if (!existing) {
            throw new errorHandler_1.AppError('Ticket not found', 404);
        }
        await prisma_1.default.userTicket.delete({ where: { id } });
        res.json({ success: true });
    }
    catch (error) {
        next(error);
    }
});
// POST /tickets/:id/sell (Phase 2 prep)
router.post('/:id/sell', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { askingPrice } = req.body;
        const existing = await prisma_1.default.userTicket.findFirst({ where: { id, userId } });
        if (!existing)
            throw new errorHandler_1.AppError('Ticket not found', 404);
        const ticket = await prisma_1.default.userTicket.update({
            where: { id },
            data: { status: 'SELLING', askingPrice: typeof askingPrice === 'number' ? askingPrice : null },
            include: ticketInclude,
        });
        res.json(ticket);
    }
    catch (error) {
        next(error);
    }
});
// DELETE /tickets/:id/sell (Phase 2 prep)
router.delete('/:id/sell', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const existing = await prisma_1.default.userTicket.findFirst({ where: { id, userId } });
        if (!existing)
            throw new errorHandler_1.AppError('Ticket not found', 404);
        const ticket = await prisma_1.default.userTicket.update({
            where: { id },
            data: { status: 'KEEPING', askingPrice: null },
            include: ticketInclude,
        });
        res.json(ticket);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=tickets.js.map