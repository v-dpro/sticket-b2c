import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, type AuthRequest } from '../middleware/auth';

const router = Router();

// GET /venues/search?q=
router.get('/search', async (req, res, next) => {
  try {
    const { q, city, limit = '10' } = req.query as { q?: string; city?: string; limit?: string };

    if (!q || typeof q !== 'string') {
      return res.json([]);
    }

    const venues = await prisma.venue.findMany({
      where: {
        name: { contains: q, mode: 'insensitive' },
        ...(city && { city: { contains: city, mode: 'insensitive' } }),
      },
      take: parseInt(limit, 10),
    });

    res.json(venues);
  } catch (error) {
    next(error as Error);
  }
});

// GET /venues/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const venue = await prisma.venue.findUnique({
      where: { id },
      include: {
        _count: { select: { events: true, ratings: true } },
      },
    });

    res.json(venue);
  } catch (error) {
    next(error as Error);
  }
});

// GET /venues/:id/events
router.get('/:id/events', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { upcoming = 'true', limit = '20' } = req.query as { upcoming?: string; limit?: string };

    const events = await prisma.event.findMany({
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
  } catch (error) {
    next(error as Error);
  }
});

// POST /venues/:id/ratings
router.post('/:id/ratings', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { sound, sightlines, drinks, staff, access } = req.body as {
      sound?: number;
      sightlines?: number;
      drinks?: number;
      staff?: number;
      access?: number;
    };

    const rating = await prisma.venueRating.upsert({
      where: { userId_venueId: { userId, venueId: id } },
      update: { sound, sightlines, drinks, staff, access },
      create: { userId, venueId: id, sound, sightlines, drinks, staff, access },
    });

    res.json(rating);
  } catch (error) {
    next(error as Error);
  }
});

// GET /venues/:id/tips
router.get('/:id/tips', async (req, res, next) => {
  try {
    const { id } = req.params;

    const tips = await prisma.venueTip.findMany({
      where: { venueId: id },
      orderBy: { upvotes: 'desc' },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
      },
    });

    res.json(tips);
  } catch (error) {
    next(error as Error);
  }
});

// POST /venues/:id/tips
router.post('/:id/tips', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { text } = req.body as { text?: string };

    const tip = await prisma.venueTip.create({
      data: { userId, venueId: id, text: text ?? '' },
    });

    res.json(tip);
  } catch (error) {
    next(error as Error);
  }
});

export default router;



