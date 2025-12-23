import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, optionalAuth, type AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import * as setlistfm from '../services/setlistfm';

const router = Router();

// GET /events/search?q=
router.get('/search', async (req, res, next) => {
  try {
    const { q, limit = '10', upcoming } = req.query as { q?: string; limit?: string; upcoming?: string };

    if (!q || typeof q !== 'string') {
      return res.json([]);
    }

    const events = await prisma.event.findMany({
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
  } catch (error) {
    next(error as Error);
  }
});

// GET /events/:id/setlist
router.get('/:id/setlist', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        artist: true,
        venue: true,
        setlist: { orderBy: { position: 'asc' } },
      },
    });

    if (!event) throw new AppError('Event not found', 404);

    // If we already cached songs, return immediately (best-effort URL lookup).
    if (event.setlist.length > 0) {
      let url: string | null = null;
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

    await prisma.$transaction(async (tx) => {
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
  } catch (error) {
    next(error as Error);
  }
});

// GET /events/:id
router.get('/:id', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        artist: true,
        venue: true,
        _count: { select: { logs: true, interested: true } },
        setlist: { orderBy: { position: 'asc' } },
      },
    });

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    let userLog: unknown = null;
    let isInterested = false;

    if (userId) {
      const [log, interested] = await Promise.all([
        prisma.userLog.findUnique({
          where: { userId_eventId: { userId, eventId: id } },
        }),
        prisma.userInterested
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
  } catch (error) {
    next(error as Error);
  }
});

// POST /events/:id/interested
router.post('/:id/interested', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    await prisma.userInterested.upsert({
      where: { userId_eventId: { userId, eventId: id } },
      update: {},
      create: { userId, eventId: id },
    });

    res.json({ success: true });
  } catch (error) {
    next(error as Error);
  }
});

// DELETE /events/:id/interested
router.delete('/:id/interested', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    await prisma.userInterested.delete({
      where: { userId_eventId: { userId, eventId: id } },
    });

    res.json({ success: true });
  } catch (error) {
    next(error as Error);
  }
});

// GET /events/:id/logs
router.get('/:id/logs', async (req, res, next) => {
  try {
    const { id } = req.params;

    const logs = await prisma.userLog.findMany({
      where: { eventId: id },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
        photos: { take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(logs);
  } catch (error) {
    next(error as Error);
  }
});

export default router;



