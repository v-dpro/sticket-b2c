// components/wrapped/useWrappedData.ts — WRAPPED data assembly.
//
// Client-side only: walks the existing timeline API (full pagination for the
// target year — no new endpoints) and folds the year's logged shows into the
// WrappedStats the cards render.
//
// Pagination walk: months come back newest-first and `nextCursor` is the ISO
// event date of the last returned entry, so the walk stops as soon as the
// cursor crosses below Jan 1 of the target year (everything further back is
// out of scope). A hard page cap bounds the worst case.

import { useCallback, useEffect, useState } from 'react';

import { getUserTimeline, type TimelineEntry } from '../../lib/api/timeline';

export type WrappedStats = {
  year: number;
  totalShows: number;
  uniqueArtists: number;
  topArtist: { name: string; count: number } | null;
  uniqueVenues: number;
  topVenue: { name: string; city: string; count: number } | null;
  bestNight: {
    eventName: string;
    date: string; // ISO
    score: number;
    venueName: string;
    venueCity: string;
    photoUrl: string | null;
  } | null;
  avgScore: number | null;
  totalPhotos: number;
  /** Jan..Dec — logged shows per month, for the mini bar strip. */
  monthCounts: number[];
  monthsActive: number;
  /** Longest run of consecutive months (within the year) with ≥1 show. */
  longestStreak: number;
};

const PAGE_LIMIT = 50;
// Hard cap on the pagination walk (50 entries/page × 24 = 1200 shows/year —
// beyond any human's calendar).
const MAX_PAGES = 24;

/** Walk the timeline until the cursor exits the target year. */
async function collectYearEntries(userId: string, year: number): Promise<TimelineEntry[]> {
  const yearPrefix = `${year}-`;
  const yearFloor = `${year}-01-01`;
  // Dedupe by logId — a month bucket can span page boundaries.
  const byLogId = new Map<string, TimelineEntry>();
  let cursor: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await getUserTimeline(userId, { cursor, limit: PAGE_LIMIT });
    for (const month of res.months ?? []) {
      for (const entry of month.entries) {
        // Guard per-entry (not per-bucket) so a boundary month never leaks
        // an adjacent year's show in.
        if (entry.event.date.startsWith(yearPrefix)) byLogId.set(entry.logId, entry);
      }
    }
    const next = res.nextCursor;
    if (!next) break;
    // ISO date strings compare lexically — once the cursor is below Jan 1
    // of the target year, the rest of history is out of scope.
    if (next < yearFloor) break;
    cursor = next;
  }

  return [...byLogId.values()];
}

export function computeWrapped(entries: TimelineEntry[], year: number): WrappedStats {
  const monthCounts = Array.from({ length: 12 }, () => 0);
  const artistCounts = new Map<string, { name: string; count: number }>();
  const venueCounts = new Map<string, { name: string; city: string; count: number }>();
  let totalPhotos = 0;
  let scoreSum = 0;
  let scoredCount = 0;
  let best: TimelineEntry | null = null;

  for (const entry of entries) {
    const monthIndex = Number(entry.event.date.slice(5, 7)) - 1;
    if (monthIndex >= 0 && monthIndex < 12) monthCounts[monthIndex] += 1;

    const artist = artistCounts.get(entry.artist.id);
    if (artist) artist.count += 1;
    else artistCounts.set(entry.artist.id, { name: entry.artist.name, count: 1 });

    const venue = venueCounts.get(entry.venue.id);
    if (venue) venue.count += 1;
    else venueCounts.set(entry.venue.id, { name: entry.venue.name, city: entry.venue.city, count: 1 });

    totalPhotos += entry.photos.length;

    if (typeof entry.score === 'number') {
      scoreSum += entry.score;
      scoredCount += 1;
      if (!best || (best.score ?? -Infinity) < entry.score) best = entry;
    }
  }

  let topArtist: WrappedStats['topArtist'] = null;
  for (const artist of artistCounts.values()) {
    if (!topArtist || artist.count > topArtist.count) topArtist = { name: artist.name, count: artist.count };
  }

  let topVenue: WrappedStats['topVenue'] = null;
  for (const venue of venueCounts.values()) {
    if (!topVenue || venue.count > topVenue.count) {
      topVenue = { name: venue.name, city: venue.city, count: venue.count };
    }
  }

  let longestStreak = 0;
  let run = 0;
  for (const count of monthCounts) {
    run = count > 0 ? run + 1 : 0;
    if (run > longestStreak) longestStreak = run;
  }

  return {
    year,
    totalShows: entries.length,
    uniqueArtists: artistCounts.size,
    topArtist,
    uniqueVenues: venueCounts.size,
    topVenue,
    bestNight: best
      ? {
          eventName: best.event.name,
          date: best.event.date,
          score: best.score ?? 0,
          venueName: best.venue.name,
          venueCity: best.venue.city,
          photoUrl: best.photos[0]?.photoUrl ?? null,
        }
      : null,
    avgScore: scoredCount > 0 ? scoreSum / scoredCount : null,
    totalPhotos,
    monthCounts,
    monthsActive: monthCounts.filter((c) => c > 0).length,
    longestStreak,
  };
}

export function useWrappedData(userId: string | null, year: number) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [stats, setStats] = useState<WrappedStats | null>(null);

  const load = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;
    try {
      const entries = await collectYearEntries(userId, year);
      setStats(computeWrapped(entries, year));
      return true;
    } catch {
      return false;
    }
  }, [userId, year]);

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    void load().then((ok) => {
      if (alive) setStatus(ok ? 'ready' : 'error');
    });
    return () => {
      alive = false;
    };
  }, [load]);

  const retry = useCallback(() => {
    setStatus('loading');
    void load().then((ok) => setStatus(ok ? 'ready' : 'error'));
  }, [load]);

  return { status, stats, retry };
}
