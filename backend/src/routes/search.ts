import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// GET /search?q=&type=
router.get('/', async (req, res, next) => {
  try {
    const { q, type, limit = '10' } = req.query as { q?: string; type?: string; limit?: string };

    if (!q || typeof q !== 'string') {
      return res.json({ artists: [], venues: [], events: [], users: [] });
    }

    const searchLimit = parseInt(limit, 10);
    const results: Record<string, unknown> = {};

    if (!type || type === 'artists') {
      results.artists = await prisma.artist.findMany({
        where: { name: { contains: q, mode: 'insensitive' } },
        take: searchLimit,
      });
    }

    if (!type || type === 'venues') {
      results.venues = await prisma.venue.findMany({
        where: { name: { contains: q, mode: 'insensitive' } },
        take: searchLimit,
      });
    }

    if (!type || type === 'events') {
      results.events = await prisma.event.findMany({
        where: {
          OR: [{ name: { contains: q, mode: 'insensitive' } }, { artist: { name: { contains: q, mode: 'insensitive' } } }],
        },
        take: searchLimit,
        include: { artist: true, venue: true },
      });
    }

    if (!type || type === 'users') {
      results.users = await prisma.user.findMany({
        where: {
          OR: [{ username: { contains: q, mode: 'insensitive' } }, { displayName: { contains: q, mode: 'insensitive' } }],
        },
        take: searchLimit,
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      });
    }

    res.json(results);
  } catch (error) {
    next(error as Error);
  }
});

export default router;



