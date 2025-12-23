import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, type AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// POST /logs
router.post('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { eventId, rating, note, section, row, seat, visibility } = req.body as {
      eventId: string;
      rating?: number;
      note?: string;
      section?: string;
      row?: string;
      seat?: string;
      visibility?: 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
    };

    const log = await prisma.userLog.create({
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
  } catch (error) {
    next(error as Error);
  }
});

// GET /logs/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const log = await prisma.userLog.findUnique({
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
  } catch (error) {
    next(error as Error);
  }
});

// PATCH /logs/:id
router.patch('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { rating, note, section, row, seat, visibility } = req.body as {
      rating?: number;
      note?: string;
      section?: string;
      row?: string;
      seat?: string;
      visibility?: 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
    };

    const existing = await prisma.userLog.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      throw new AppError('Not authorized', 403);
    }

    const log = await prisma.userLog.update({
      where: { id },
      data: { rating, note, section, row, seat, visibility },
    });

    res.json(log);
  } catch (error) {
    next(error as Error);
  }
});

// DELETE /logs/:id
router.delete('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const existing = await prisma.userLog.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      throw new AppError('Not authorized', 403);
    }

    await prisma.userLog.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    next(error as Error);
  }
});

// POST /logs/:id/comments
router.post('/:id/comments', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { text } = req.body as { text?: string };

    const comment = await prisma.comment.create({
      data: { logId: id, userId, text: text ?? '' },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
      },
    });

    res.status(201).json(comment);
  } catch (error) {
    next(error as Error);
  }
});

export default router;



