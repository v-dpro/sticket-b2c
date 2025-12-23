import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, type AuthRequest } from '../middleware/auth';

const router = Router();

// GET /feed
router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { limit = '20', offset = '0' } = req.query as { limit?: string; offset?: string };

    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const friendIds = following.map((f) => f.followingId);

    const logs = friendIds.length
      ? await prisma.userLog.findMany({
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
  } catch (error) {
    next(error as Error);
  }
});

export default router;



