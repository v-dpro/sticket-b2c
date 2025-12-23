import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, optionalAuth, type AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { getSpotifyTopArtists, getUserWithFreshSpotifyToken } from '../services/spotify';

const router = Router();

// GET /users/me/spotify/top-artists
router.get('/me/spotify/top-artists', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { spotifyToken } = await getUserWithFreshSpotifyToken(req.user!.id);
    if (!spotifyToken) throw new AppError('Spotify not connected', 400);

    const q = req.query as { limit?: string; time_range?: string };
    const limit = q.limit ? Number.parseInt(q.limit, 10) : 50;
    const timeRange = (q.time_range ?? 'medium_term') as 'short_term' | 'medium_term' | 'long_term';

    const artists = await getSpotifyTopArtists(spotifyToken, Number.isFinite(limit) ? limit : 50, timeRange);
    res.json(artists);
  } catch (error) {
    next(error as Error);
  }
});

// POST /users/push-token (alias of /notifications/push-token for older clients)
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

// DELETE /users/push-token (alias of /notifications/push-token)
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

// GET /users/search?q=
router.get('/search', async (req, res, next) => {
  try {
    const { q, limit = '10' } = req.query as { q?: string; limit?: string };

    if (!q || typeof q !== 'string') {
      return res.json([]);
    }

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: q.toLowerCase(), mode: 'insensitive' } },
          { displayName: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: parseInt(limit, 10),
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
      },
    });

    res.json(users);
  } catch (error) {
    next(error as Error);
  }
});

// GET /users/:id
router.get('/:id', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        city: true,
        privacySetting: true,
        createdAt: true,
        _count: {
          select: {
            logs: true,
            followers: true,
            following: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    let isFollowing = false;
    if (currentUserId && currentUserId !== id) {
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: id,
          },
        },
      });
      isFollowing = !!follow;
    }

    res.json({
      ...user,
      isFollowing,
      stats: {
        shows: user._count.logs,
        followers: user._count.followers,
        following: user._count.following,
      },
    });
  } catch (error) {
    next(error as Error);
  }
});

// PATCH /users/:id
router.patch('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    if (req.user!.id !== id) {
      throw new AppError('Not authorized', 403);
    }

    const { displayName, bio, avatarUrl, city, username, privacySetting } = req.body as {
      displayName?: string;
      bio?: string;
      avatarUrl?: string;
      city?: string;
      username?: string;
      privacySetting?: 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
    };

    if (username) {
      const existing = await prisma.user.findFirst({
        where: {
          username: username.toLowerCase(),
          NOT: { id },
        },
      });
      if (existing) {
        throw new AppError('Username already taken', 400);
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(displayName !== undefined && { displayName }),
        ...(bio !== undefined && { bio }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(city !== undefined && { city }),
        ...(username !== undefined && { username: username.toLowerCase() }),
        ...(privacySetting !== undefined && { privacySetting }),
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        city: true,
        privacySetting: true,
      },
    });

    res.json(user);
  } catch (error) {
    next(error as Error);
  }
});

// GET /users/:id/logs
router.get('/:id/logs', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { limit = '20', offset = '0' } = req.query as { limit?: string; offset?: string };

    const logs = await prisma.userLog.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit, 10),
      skip: parseInt(offset, 10),
      include: {
        event: {
          include: {
            artist: true,
            venue: true,
          },
        },
        photos: { take: 1 },
        _count: { select: { comments: true } },
      },
    });

    res.json(logs);
  } catch (error) {
    next(error as Error);
  }
});

// GET /users/:id/stats
router.get('/:id/stats', async (req, res, next) => {
  try {
    const { id } = req.params;

    const [showCount, artistCount, venueCount] = await Promise.all([
      prisma.userLog.count({ where: { userId: id } }),
      prisma.userLog
        .findMany({
          where: { userId: id },
          select: { event: { select: { artistId: true } } },
          distinct: ['eventId'],
        })
        .then((logs) => new Set(logs.map((l) => l.event.artistId)).size),
      prisma.userLog
        .findMany({
          where: { userId: id },
          select: { event: { select: { venueId: true } } },
          distinct: ['eventId'],
        })
        .then((logs) => new Set(logs.map((l) => l.event.venueId)).size),
    ]);

    res.json({
      shows: showCount,
      artists: artistCount,
      venues: venueCount,
    });
  } catch (error) {
    next(error as Error);
  }
});

// POST /users/:id/follow
router.post('/:id/follow', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const followerId = req.user!.id;

    if (followerId === id) {
      throw new AppError('Cannot follow yourself', 400);
    }

    await prisma.follow.create({
      data: {
        followerId,
        followingId: id,
      },
    });

    res.json({ success: true });
  } catch (error) {
    next(error as Error);
  }
});

// DELETE /users/:id/follow
router.delete('/:id/follow', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const followerId = req.user!.id;

    await prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId: id,
        },
      },
    });

    res.json({ success: true });
  } catch (error) {
    next(error as Error);
  }
});

// GET /users/:id/following
router.get('/:id/following', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { limit = '20', offset = '0' } = req.query as { limit?: string; offset?: string };

    const following = await prisma.follow.findMany({
      where: { followerId: id },
      take: parseInt(limit, 10),
      skip: parseInt(offset, 10),
      include: {
        following: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    res.json(following.map((f) => f.following));
  } catch (error) {
    next(error as Error);
  }
});

// GET /users/:id/followers
router.get('/:id/followers', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { limit = '20', offset = '0' } = req.query as { limit?: string; offset?: string };

    const followers = await prisma.follow.findMany({
      where: { followingId: id },
      take: parseInt(limit, 10),
      skip: parseInt(offset, 10),
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    res.json(followers.map((f) => f.follower));
  } catch (error) {
    next(error as Error);
  }
});

export default router;



