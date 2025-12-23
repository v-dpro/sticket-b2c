import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, type AuthRequest } from '../middleware/auth';

const router = Router();

// GET /notifications
router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { limit = '30', before } = req.query as { limit?: string; before?: string };

    const whereClause: { userId: string; createdAt?: { lt: Date } } = { userId };
    if (before) {
      whereClause.createdAt = { lt: new Date(before) };
    }

    const take = Math.min(Math.max(parseInt(limit, 10) || 30, 1), 50);

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        include: {
          actor: {
            select: { id: true, username: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: take + 1,
      }),
      prisma.notification.count({
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
  } catch (error) {
    next(error as Error);
  }
});

// GET /notifications/unread-count
router.get('/unread-count', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user!.id, read: false },
    });
    res.json({ count });
  } catch (error) {
    next(error as Error);
  }
});

// PATCH /notifications/:id/read
router.patch('/:id/read', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    await prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });

    res.json({ success: true });
  } catch (error) {
    next(error as Error);
  }
});

// POST /notifications/read-all
router.post('/read-all', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;

    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    res.json({ success: true });
  } catch (error) {
    next(error as Error);
  }
});

// GET /notifications/preferences
router.get('/preferences', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    let prefs = await prisma.notificationPreferences.findUnique({
      where: { userId: req.user!.id },
    });

    if (!prefs) {
      prefs = await prisma.notificationPreferences.create({
        data: { userId: req.user!.id },
      });
    }

    res.json(prefs);
  } catch (error) {
    next(error as Error);
  }
});

// PATCH /notifications/preferences
router.patch('/preferences', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const prefs = await prisma.notificationPreferences.upsert({
      where: { userId: req.user!.id },
      update: req.body,
      create: { userId: req.user!.id, ...req.body },
    });
    res.json(prefs);
  } catch (error) {
    next(error as Error);
  }
});

// POST /notifications/push-token
router.post('/push-token', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { token } = req.body as { token?: string };
    if (!token) return res.status(400).json({ error: 'token is required' });

    await prisma.pushToken.upsert({
      where: { token },
      update: { userId: req.user!.id, updatedAt: new Date() },
      create: { userId: req.user!.id, token },
    });

    res.json({ success: true });
  } catch (error) {
    next(error as Error);
  }
});

// DELETE /notifications/push-token
router.delete('/push-token', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { token } = req.body as { token?: string };
    if (!token) return res.status(400).json({ error: 'token is required' });
    await prisma.pushToken.deleteMany({ where: { token } });
    res.json({ success: true });
  } catch (error) {
    next(error as Error);
  }
});

export default router;



