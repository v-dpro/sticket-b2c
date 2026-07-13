// Gamification — the collection as a game you level up. Pure, tokenless
// logic shared by the You tabs: a collector RANK from how many distinct
// venues you've unlocked, a per-city TIER from how hard you've hit a city,
// and an artist SUPERFAN tier from how many times you've seen them. The
// design is ink-only, so tiers carry a `filled` flag (higher tiers invert
// to a solid stamp) instead of a color.

export type CollectorRank = {
  /** e.g. "ROADIE" — your standing from distinct venues collected. */
  name: string;
  /** Venues collected so far. */
  venues: number;
  /** Venues needed to reach the next rank (null at the top). */
  nextAt: number | null;
  /** Threshold this rank started at. */
  from: number;
  /** 0..1 progress across the current rank band (1 at the top rank). */
  progress: number;
};

const RANKS: { at: number; name: string }[] = [
  { at: 0, name: 'NEW HERE' },
  { at: 1, name: 'SCOUT' },
  { at: 5, name: 'REGULAR' },
  { at: 10, name: 'ROADIE' },
  { at: 20, name: 'TOURHEAD' },
  { at: 40, name: 'ROAD DOG' },
  { at: 80, name: 'LEGEND' },
];

export function collectorRank(venues: number): CollectorRank {
  let i = 0;
  for (let k = 0; k < RANKS.length; k++) if (venues >= RANKS[k]!.at) i = k;
  const cur = RANKS[i]!;
  const next = RANKS[i + 1] ?? null;
  const progress = next ? Math.min(1, (venues - cur.at) / (next.at - cur.at)) : 1;
  return { name: cur.name, venues, nextAt: next ? next.at : null, from: cur.at, progress };
}

export type Tier = { label: string; filled: boolean } | null;

/** City tier by shows logged in that city. */
export function cityTier(shows: number): Tier {
  if (shows >= 10) return { label: 'PLATINUM', filled: true };
  if (shows >= 6) return { label: 'GOLD', filled: true };
  if (shows >= 3) return { label: 'SILVER', filled: false };
  if (shows >= 1) return { label: 'BRONZE', filled: false };
  return null;
}

/** Artist superfan tier by times seen. Below 3 shows earns no badge. */
export function artistTier(shows: number): Tier {
  if (shows >= 10) return { label: 'DEVOTEE', filled: true };
  if (shows >= 5) return { label: 'SUPERFAN', filled: true };
  if (shows >= 3) return { label: 'FAN', filled: false };
  return null;
}

/** How many entries in a count list have reached a filled (elite) tier. */
export function eliteCount(counts: number[], tierFn: (n: number) => Tier): number {
  return counts.reduce((n, c) => (tierFn(c)?.filled ? n + 1 : n), 0);
}
