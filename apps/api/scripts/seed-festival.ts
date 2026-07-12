// One-off: seed a festival-shaped weekend (multi-set, one venue, 3 days)
// into the catalog so festival mode (C12) has real data to render.
// Run from apps/api (uses the .env DATABASE_URL):  npx tsx scripts/seed-festival.ts

import { prisma } from '../src/lib/prisma';

async function main() {
  const artistIds = [
    'cat-artist-billie-eilish',
    'cat-artist-olivia-rodrigo',
    'cat-artist-sabrina-carpenter',
  ];
  const artists = await prisma.artist.findMany({
    where: { id: { in: artistIds } },
    select: { id: true },
  });
  const venue = await prisma.venue.findFirst({
    where: { id: { startsWith: 'cat-venue-' } },
    select: { id: true },
  });
  if (artists.length < 3 || !venue) {
    console.log('catalog rows missing — run seed-catalog first');
    return;
  }

  await prisma.tour.upsert({
    where: { id: 'fest-edc-nyc-26' },
    create: {
      id: 'fest-edc-nyc-26',
      name: 'Electric Weekend NYC ’26',
      year: 2026,
      startDate: new Date('2026-07-17'),
      endDate: new Date('2026-07-19'),
      artistId: 'cat-artist-billie-eilish',
    },
    update: {},
  });

  const sets = [
    { id: 'fest-set-2', name: 'Electric Weekend — Olivia Rodrigo', date: '2026-07-17T19:00:00', artistId: 'cat-artist-olivia-rodrigo' },
    { id: 'fest-set-1', name: 'Electric Weekend — Billie Eilish', date: '2026-07-17T21:30:00', artistId: 'cat-artist-billie-eilish' },
    { id: 'fest-set-3', name: 'Electric Weekend — Sabrina Carpenter', date: '2026-07-18T20:00:00', artistId: 'cat-artist-sabrina-carpenter' },
    { id: 'fest-set-4', name: 'Electric Weekend — Billie Eilish b2b Olivia', date: '2026-07-19T22:00:00', artistId: 'cat-artist-billie-eilish' },
  ];
  for (const s of sets) {
    await prisma.event.upsert({
      where: { id: s.id },
      create: {
        id: s.id,
        name: s.name,
        date: new Date(s.date),
        artistId: s.artistId,
        venueId: venue.id,
        tourId: 'fest-edc-nyc-26',
      },
      update: {},
    });
  }
  console.log('festival weekend seeded at venue:', venue.id);
}

main().finally(() => void prisma.$disconnect());
