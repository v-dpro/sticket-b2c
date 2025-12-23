import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, type AuthRequest } from '../middleware/auth';
import { syncUpcomingEventsForArtistNames } from '../services/events';

const router = Router();

// GET /discover
router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { city, refresh } = req.query as { city?: string; refresh?: string };

    const artistFollows = await prisma.userArtistFollow.findMany({
      where: { userId },
      include: { artist: true },
    });

    const artistIds = artistFollows.map((f) => f.artistId);
    const followedArtistNames = artistFollows.map((f) => f.artist.name);

    let comingUp = artistIds.length
      ? await prisma.event.findMany({
          where: {
            artistId: { in: artistIds },
            date: { gte: new Date() },
          },
          orderBy: { date: 'asc' },
          take: 20,
          include: {
            artist: true,
            venue: true,
          },
        })
      : [];

    const wantsRefresh = refresh === 'true';
    if ((wantsRefresh || comingUp.length < 5) && followedArtistNames.length > 0 && process.env.BANDSINTOWN_APP_ID) {
      // Best-effort external sync. If it fails, we still return existing DB results.
      try {
        await syncUpcomingEventsForArtistNames(followedArtistNames, { maxArtists: 10, limitPerArtist: 50 });
        comingUp = await prisma.event.findMany({
          where: {
            artistId: { in: artistIds },
            date: { gte: new Date() },
          },
          orderBy: { date: 'asc' },
          take: 20,
          include: {
            artist: true,
            venue: true,
          },
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Discover sync failed:', e);
      }
    }

    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const friendIds = following.map((f) => f.followingId);

    const friendsInterested = friendIds.length
      ? await prisma.userInterested.findMany({
          where: {
            userId: { in: friendIds },
            event: { date: { gte: new Date() } },
          },
          include: {
            event: { include: { artist: true, venue: true } },
            user: { select: { id: true, username: true, avatarUrl: true } },
          },
        })
      : [];

    const friendsGoingMap = new Map<
      string,
      {
        id: string;
        name: string;
        date: Date;
        endDate: Date | null;
        imageUrl: string | null;
        ticketUrl: string | null;
        source: string | null;
        externalId: string | null;
        createdAt: Date;
        updatedAt: Date;
        artistId: string;
        venueId: string;
        artist: unknown;
        venue: unknown;
        friendsGoing: Array<{ id: string; username: string; avatarUrl: string | null }>;
      }
    >();

    for (const fi of friendsInterested) {
      if (!friendsGoingMap.has(fi.eventId)) {
        friendsGoingMap.set(fi.eventId, {
          ...(fi.event as any),
          friendsGoing: [],
        });
      }
      friendsGoingMap.get(fi.eventId)!.friendsGoing.push(fi.user);
    }

    const friendsGoing = Array.from(friendsGoingMap.values())
      .sort((a, b) => b.friendsGoing.length - a.friendsGoing.length)
      .slice(0, 20);

    const popularCity = city || 'New York';

    const popular = await prisma.event.findMany({
      where: {
        venue: { city: popularCity },
        date: { gte: new Date() },
      },
      orderBy: {
        interested: { _count: 'desc' },
      },
      take: 10,
      include: {
        artist: true,
        venue: true,
        _count: { select: { interested: true } },
      },
    });

    res.json({
      comingUp,
      friendsGoing,
      popular,
    });
  } catch (error) {
    next(error as Error);
  }
});

export default router;



