// ---------------------------------------------------------------------------
// Sticket Gamification Engine — server-authoritative XP + level curve.
//
// This mirrors, byte-for-byte, the rules in:
//   - design_handoff_sticket_redesign/GAMIFICATION.md
//   - apps/mobile/lib/game.ts (client-side preview, `previewLogRewards`)
//
// The client computes a *preview* of these numbers before the network call
// resolves so the reveal animation feels instant; this module is the source
// of truth actually persisted to the database. Keep all three in sync.
// ---------------------------------------------------------------------------

export const XP_BASE = 50;
export const XP_NEW_VENUE = 15;
export const XP_NEW_ARTIST = 20;
export const XP_REVIEW = 10;
export const XP_PHOTO = 5;
export const XP_FIRST_OF_MONTH = 15;

export type XpBonusInputs = {
  /** First log this user has ever made at this Venue.id. */
  isNewVenue: boolean;
  /** First log this user has ever made for this Artist.id. */
  isNewArtist: boolean;
  /** UserLog.note is non-empty. */
  hasReview: boolean;
  /** At least one LogPhoto exists for this log. */
  hasPhoto: boolean;
  /** First log this user has made in the show's calendar month. */
  firstOfMonth: boolean;
};

/** Computes the XP awarded for a single log. Max: 50+15+20+10+5+15 = 115. */
export function computeLogXp(opts: XpBonusInputs): number {
  let xp = XP_BASE;
  if (opts.isNewVenue) xp += XP_NEW_VENUE;
  if (opts.isNewArtist) xp += XP_NEW_ARTIST;
  if (opts.hasReview) xp += XP_REVIEW;
  if (opts.hasPhoto) xp += XP_PHOTO;
  if (opts.firstOfMonth) xp += XP_FIRST_OF_MONTH;
  return xp;
}

/** Human-readable audit trail stored on XpEntry.reason, e.g. "base+new_venue+review". */
export function buildXpReason(opts: XpBonusInputs): string {
  const reasons = ['base'];
  if (opts.isNewVenue) reasons.push('new_venue');
  if (opts.isNewArtist) reasons.push('new_artist');
  if (opts.hasReview) reasons.push('review');
  if (opts.hasPhoto) reasons.push('photo');
  if (opts.firstOfMonth) reasons.push('first_of_month');
  return reasons.join('+');
}

// ---------------------------------------------------------------------------
// Levels
// ---------------------------------------------------------------------------

export const LEVELS = [
  { name: 'Opener', min: 0, color: '#9AA0AE' },
  { name: 'Regular', min: 250, color: '#60A5FA' },
  { name: 'Headliner', min: 750, color: '#A78BFA' },
  { name: 'Road Dog', min: 1800, color: '#F59E0B' },
  { name: 'Lifer', min: 3500, color: '#EC4899' },
  { name: 'Legend', min: 6000, color: '#EF4444' },
] as const;

export type Level = (typeof LEVELS)[number];

export type LevelInfo = {
  name: string;
  color: string;
  index: number;
  next: Level | null;
  nextAt: number;
  progress: number;
};

export function levelFor(xp: number): LevelInfo {
  let index = 0;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i]!.min) {
      index = i;
      break;
    }
  }

  const current = LEVELS[index]!;
  const next = index < LEVELS.length - 1 ? LEVELS[index + 1]! : null;
  const nextAt = next ? next.min : current.min;
  const rangeSize = next ? next.min - current.min : 1;
  const progress = next ? Math.min((xp - current.min) / rangeSize, 1) : 1;

  return {
    name: current.name,
    color: current.color,
    index,
    next: next ?? null,
    nextAt,
    progress,
  };
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/** Returns the [start, end) UTC month boundaries containing `date`. */
export function monthRange(date: Date): { start: Date; end: Date } {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  return { start, end };
}

/** Returns a "YYYY-MM" key for a date, in UTC. */
export function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}
