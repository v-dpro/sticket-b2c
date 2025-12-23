import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, optionalAuth, type AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { syncUpcomingEventsForArtistName } from '../services/events';

const router = Router();

// GET /artists/search?q=
router.get('/search', async (req, res, next) => {
  try {
    const { q, limit = '10' } = req.query as { q?: string; limit?: string };

    if (!q || typeof q !== 'string') {
      return res.json([]);
    }

    const artists = await prisma.artist.findMany({
      where: {
        name: { contains: q, mode: 'insensitive' },
      },
      take: parseInt(limit, 10),
    });

    res.json(artists);
  } catch (error) {
    next(error as Error);
  }
});

// GET /artists/:id/my-history - current user's logs for this artist
router.get('/:id/my-history', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const logs = await prisma.userLog.findMany({
      where: { userId, event: { artistId: id } },
      include: {
        event: { include: { venue: true, artist: true } },
        photos: { take: 1 },
      },
      orderBy: { event: { date: 'desc' } },
    });

    res.json(logs);
  } catch (error) {
    next(error as Error);
  }
});

// GET /artists/:id
router.get('/:id', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const artist = await prisma.artist.findUnique({
      where: { id },
      include: {
        _count: { select: { events: true, followers: true } },
      },
    });

    if (!artist) {
      throw new AppError('Artist not found', 404);
    }

    const [totalLogs, ratingAgg] = await Promise.all([
      prisma.userLog.count({
        where: { event: { artistId: id } },
      }),
      prisma.userLog.aggregate({
        where: { event: { artistId: id }, rating: { not: null } },
        _avg: { rating: true },
      }),
    ]);

    let isFollowing = false;
    let userShowCount = 0;
    let userFirstShow: any = null;
    let userLastShow: any = null;
    let friendsWhoSaw: any[] = [];

    if (userId) {
      isFollowing = await prisma.userArtistFollow
        .findUnique({
          where: { userId_artistId: { userId, artistId: id } },
        })
        .then(Boolean);

      const userLogs = await prisma.userLog.findMany({
        where: { userId, event: { artistId: id } },
        include: {
          event: { include: { venue: true } },
        },
        orderBy: { event: { date: 'asc' } },
      });

      userShowCount = userLogs.length;

      if (userLogs.length > 0) {
        userFirstShow = {
          eventId: userLogs[0].eventId,
          date: userLogs[0].event.date,
          venueName: userLogs[0].event.venue.name,
          venueCity: userLogs[0].event.venue.city,
        };

        const last = userLogs[userLogs.length - 1];
        userLastShow = {
          eventId: last.eventId,
          date: last.event.date,
          venueName: last.event.venue.name,
          venueCity: last.event.venue.city,
        };
      }

      // Friends who've seen this artist (people the user follows)
      const following = await prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      });
      const friendIds = following.map((f) => f.followingId);

      if (friendIds.length > 0) {
        const friendLogs = await prisma.userLog.groupBy({
          by: ['userId'],
          where: { userId: { in: friendIds }, event: { artistId: id } },
          _count: { _all: true },
        });

        const friendUsers = await prisma.user.findMany({
          where: { id: { in: friendLogs.map((f) => f.userId) } },
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        });

        friendsWhoSaw = friendUsers.map((user) => ({
          ...user,
          showCount: friendLogs.find((f) => f.userId === user.id)?._count._all || 0,
        }));
      }
    }

    res.json({
      id: artist.id,
      name: artist.name,
      imageUrl: artist.imageUrl,
      bannerUrl: null,
      genres: artist.genres ?? [],
      bio: artist.bio,

      spotifyId: artist.spotifyId,
      spotifyUrl: artist.spotifyId ? `https://open.spotify.com/artist/${artist.spotifyId}` : null,
      appleMusicUrl: null,

      followerCount: artist._count.followers,
      totalLogs,
      avgRating: ratingAgg._avg.rating,

      isFollowing,
      userShowCount,
      userFirstShow,
      userLastShow,
      friendsWhoSaw,
    });
  } catch (error) {
    next(error as Error);
  }
});

// GET /artists/:id/events
router.get('/:id/events', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { upcoming = 'true', limit = '20', offset = '0' } = req.query as {
      upcoming?: string;
      limit?: string;
      offset?: string;
    };

    const isUpcoming = upcoming === 'true';
    const now = new Date();

    let events = await prisma.event.findMany({
      where: {
        artistId: id,
        date: isUpcoming ? { gte: now } : { lt: now },
      },
      orderBy: { date: isUpcoming ? 'asc' : 'desc' },
      take: parseInt(limit, 10),
      skip: parseInt(offset, 10),
      include: {
        venue: true,
        _count: { select: { logs: true, interested: true } },
      },
    });

    // If we have no upcoming events yet, try a best-effort Bandsintown sync.
    if (isUpcoming && events.length === 0 && process.env.BANDSINTOWN_APP_ID) {
      const artist = await prisma.artist.findUnique({ where: { id }, select: { name: true } });
      if (artist?.name) {
        try {
          await syncUpcomingEventsForArtistName(artist.name, 50);
          events = await prisma.event.findMany({
            where: {
              artistId: id,
              date: { gte: now },
            },
            orderBy: { date: 'asc' },
            take: parseInt(limit, 10),
            skip: parseInt(offset, 10),
            include: {
              venue: true,
              _count: { select: { logs: true, interested: true } },
            },
          });
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('Artist events sync failed:', e);
        }
      }
    }

    let loggedSet = new Set<string>();
    let interestedSet = new Set<string>();
    let friendCounts: Record<string, number> = {};

    if (userId && events.length > 0) {
      const eventIds = events.map((e) => e.id);

      const [logs, interested, friendInterested] = await Promise.all([
        prisma.userLog.findMany({
          where: { userId, eventId: { in: eventIds } },
          select: { eventId: true },
        }),
        prisma.userInterested.findMany({
          where: { userId, eventId: { in: eventIds } },
          select: { eventId: true },
        }),
        (async () => {
          const following = await prisma.follow.findMany({
            where: { followerId: userId },
            select: { followingId: true },
          });
          const friendIds = following.map((f) => f.followingId);
          if (friendIds.length === 0) return {} as Record<string, number>;

          const counts = await prisma.userInterested.groupBy({
            by: ['eventId'],
            where: { userId: { in: friendIds }, eventId: { in: eventIds } },
            _count: { _all: true },
          });

          return counts.reduce((acc, c) => {
            acc[c.eventId] = c._count._all;
            return acc;
          }, {} as Record<string, number>);
        })(),
      ]);

      loggedSet = new Set(logs.map((l) => l.eventId));
      interestedSet = new Set(interested.map((i) => i.eventId));
      friendCounts = friendInterested;
    }

    const result = events.map((event) => ({
      id: event.id,
      name: event.name,
      date: event.date,
      venue: {
        id: event.venue.id,
        name: event.venue.name,
        city: event.venue.city,
        state: event.venue.state ?? undefined,
      },
      ticketUrl: event.ticketUrl ?? undefined,
      logCount: event._count.logs,
      isInterested: interestedSet.has(event.id),
      userLogged: loggedSet.has(event.id),
      friendsGoing: friendCounts[event.id] || 0,
    }));

    res.json(result);
  } catch (error) {
    next(error as Error);
  }
});

// POST /artists/:id/follow
router.post('/:id/follow', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    await prisma.userArtistFollow.upsert({
      where: { userId_artistId: { userId, artistId: id } },
      update: {},
      create: { userId, artistId: id },
    });

    res.json({ success: true });
  } catch (error) {
    next(error as Error);
  }
});

// DELETE /artists/:id/follow
router.delete('/:id/follow', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    await prisma.userArtistFollow.deleteMany({ where: { userId, artistId: id } });

    res.json({ success: true });
  } catch (error) {
    next(error as Error);
  }
});

export default router;



