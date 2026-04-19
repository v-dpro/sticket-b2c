// ---------------------------------------------------------------------------
// Sticket Gamification Engine — pure, deterministic, no side effects
// ---------------------------------------------------------------------------

export type PastShow = {
  venue: string;
  artist: string;
  date: string; // ISO date string (YYYY-MM-DD)
  review?: string;
  photos?: string[];
};

export type ShowStats = {
  totalShows: number;
  venueCounts: Record<string, number>;
  artistCounts: Record<string, number>;
  streak: number;
  uniqueVenues: number;
  uniqueArtists: number;
};

// ---------------------------------------------------------------------------
// XP
// ---------------------------------------------------------------------------

const XP_BASE = 50;
const XP_NEW_VENUE = 15;
const XP_NEW_ARTIST = 20;
const XP_REVIEW = 10;
const XP_PHOTO = 5;
const XP_FIRST_OF_MONTH = 15;

export function xpForShow(opts: {
  isNewVenue: boolean;
  isNewArtist: boolean;
  hasReview: boolean;
  hasPhoto: boolean;
  firstOfMonth: boolean;
}): number {
  let xp = XP_BASE;
  if (opts.isNewVenue) xp += XP_NEW_VENUE;
  if (opts.isNewArtist) xp += XP_NEW_ARTIST;
  if (opts.hasReview) xp += XP_REVIEW;
  if (opts.hasPhoto) xp += XP_PHOTO;
  if (opts.firstOfMonth) xp += XP_FIRST_OF_MONTH;
  return xp; // Max: 50+15+20+10+5+15 = 115
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

export function levelFor(xp: number): {
  name: string;
  color: string;
  index: number;
  next: Level | null;
  nextAt: number;
  progress: number;
} {
  let index = 0;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].min) {
      index = i;
      break;
    }
  }

  const current = LEVELS[index];
  const next = index < LEVELS.length - 1 ? LEVELS[index + 1] : null;
  const nextAt = next ? next.min : current.min;
  const rangeSize = next ? next.min - current.min : 1;
  const progress = next
    ? Math.min((xp - current.min) / rangeSize, 1)
    : 1;

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
// Streak — consecutive months with at least 1 show
// ---------------------------------------------------------------------------

/** Returns a "YYYY-MM" key for a date string. */
function toMonthKey(dateStr: string): string {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = d.getMonth(); // 0-based
  return `${y}-${String(m + 1).padStart(2, '0')}`;
}

/** Decrements a "YYYY-MM" key by one month. */
function prevMonth(key: string): string {
  const [y, m] = key.split('-').map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, '0')}`;
}

export function calculateStreak(logDates: string[]): number {
  if (logDates.length === 0) return 0;

  const months = new Set(logDates.map(toMonthKey));

  // Sort descending to find the most recent month
  const sorted = Array.from(months).sort().reverse();
  let streak = 0;
  let current = sorted[0];

  while (months.has(current)) {
    streak++;
    current = prevMonth(current);
  }

  return streak;
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

export const BADGE_DEFS: Array<{
  id: string;
  label: string;
  emoji: string;
  desc: string;
  check: (stats: ShowStats) => boolean;
}> = [
  // Milestones
  {
    id: 'first_show',
    label: 'First Show',
    emoji: '🎵',
    desc: 'Log your first show',
    check: (s) => s.totalShows >= 1,
  },
  {
    id: 'shows_10',
    label: '10 Shows',
    emoji: '🔥',
    desc: 'Log 10 shows',
    check: (s) => s.totalShows >= 10,
  },
  {
    id: 'shows_25',
    label: '25 Shows',
    emoji: '⚡',
    desc: 'Log 25 shows',
    check: (s) => s.totalShows >= 25,
  },
  {
    id: 'shows_50',
    label: '50 Shows',
    emoji: '💎',
    desc: 'Log 50 shows',
    check: (s) => s.totalShows >= 50,
  },
  {
    id: 'shows_100',
    label: '100 Shows',
    emoji: '👑',
    desc: 'Log 100 shows',
    check: (s) => s.totalShows >= 100,
  },
  // Venue loyalty
  {
    id: 'venue_regular',
    label: 'Venue Regular',
    emoji: '🏠',
    desc: '5 shows at the same venue',
    check: (s) => Object.values(s.venueCounts).some((c) => c >= 5),
  },
  // Artist loyalty
  {
    id: 'superfan',
    label: 'Superfan',
    emoji: '🌟',
    desc: '3 shows by the same artist',
    check: (s) => Object.values(s.artistCounts).some((c) => c >= 3),
  },
  {
    id: 'loyalty_10',
    label: 'Diehard Fan',
    emoji: '💜',
    desc: '10 shows by the same artist',
    check: (s) => Object.values(s.artistCounts).some((c) => c >= 10),
  },
  // Streaks
  {
    id: 'streak3',
    label: '3-Month Streak',
    emoji: '📅',
    desc: 'Shows 3 months in a row',
    check: (s) => s.streak >= 3,
  },
  {
    id: 'streak6',
    label: '6-Month Streak',
    emoji: '🗓️',
    desc: 'Shows 6 months in a row',
    check: (s) => s.streak >= 6,
  },
  {
    id: 'streak12',
    label: 'Year-Round',
    emoji: '🏆',
    desc: 'Shows 12 months in a row',
    check: (s) => s.streak >= 12,
  },
  // Venue exploration
  {
    id: 'venues_10',
    label: '10 Venues',
    emoji: '🗺️',
    desc: 'Visit 10 unique venues',
    check: (s) => s.uniqueVenues >= 10,
  },
  {
    id: 'venues_25',
    label: '25 Venues',
    emoji: '🧭',
    desc: 'Visit 25 unique venues',
    check: (s) => s.uniqueVenues >= 25,
  },
  {
    id: 'venues_50',
    label: '50 Venues',
    emoji: '🌍',
    desc: 'Visit 50 unique venues',
    check: (s) => s.uniqueVenues >= 50,
  },
  // Explorer — note: needs city data, approximated via unique venues
  {
    id: 'explorer',
    label: 'Explorer',
    emoji: '✈️',
    desc: 'Shows in 5+ cities',
    check: (s) => s.uniqueVenues >= 5,
    // The badge spec says "5+ cities". Without explicit city data we
    // approximate: if you've been to 5+ unique venues you likely
    // span multiple cities. When city data is available, replace this.
  },
];

// ---------------------------------------------------------------------------
// Stats builder (internal helper)
// ---------------------------------------------------------------------------

function buildStats(shows: PastShow[], streak: number): ShowStats {
  const venueCounts: Record<string, number> = {};
  const artistCounts: Record<string, number> = {};

  for (const show of shows) {
    const v = show.venue.toLowerCase().trim();
    const a = show.artist.toLowerCase().trim();
    venueCounts[v] = (venueCounts[v] ?? 0) + 1;
    artistCounts[a] = (artistCounts[a] ?? 0) + 1;
  }

  return {
    totalShows: shows.length,
    venueCounts,
    artistCounts,
    streak,
    uniqueVenues: Object.keys(venueCounts).length,
    uniqueArtists: Object.keys(artistCounts).length,
  };
}

// ---------------------------------------------------------------------------
// Preview — compute everything a "save show" action would unlock
// ---------------------------------------------------------------------------

export function previewLogRewards(
  draft: {
    venue: string;
    artist: string;
    date: string;
    review?: string;
    photos?: string[];
  },
  pastShows: PastShow[],
): {
  xpGain: number;
  xpBefore: number;
  xpAfter: number;
  beforeLevel: ReturnType<typeof levelFor>;
  afterLevel: ReturnType<typeof levelFor>;
  leveledUp: boolean;
  newBadges: Array<{ id: string; label: string; emoji: string; desc: string }>;
  reasons: Array<{ label: string; value: string }>;
  streakBefore: number;
  streakAfter: number;
  streakIncreased: boolean;
} {
  const venueKey = draft.venue.toLowerCase().trim();
  const artistKey = draft.artist.toLowerCase().trim();

  const pastVenues = new Set(pastShows.map((s) => s.venue.toLowerCase().trim()));
  const pastArtists = new Set(pastShows.map((s) => s.artist.toLowerCase().trim()));
  const pastDates = pastShows.map((s) => s.date);
  const pastMonths = new Set(pastDates.map(toMonthKey));

  const isNewVenue = !pastVenues.has(venueKey);
  const isNewArtist = !pastArtists.has(artistKey);
  const hasReview = Boolean(draft.review && draft.review.trim().length > 0);
  const hasPhoto = Boolean(draft.photos && draft.photos.length > 0);
  const draftMonth = toMonthKey(draft.date);
  const firstOfMonth = !pastMonths.has(draftMonth);

  // XP
  const xpGain = xpForShow({ isNewVenue, isNewArtist, hasReview, hasPhoto, firstOfMonth });

  // Build reasons list
  const reasons: Array<{ label: string; value: string }> = [];
  reasons.push({ label: 'Base XP', value: `+${XP_BASE}` });
  if (isNewVenue) reasons.push({ label: 'New venue', value: `+${XP_NEW_VENUE}` });
  if (isNewArtist) reasons.push({ label: 'New artist', value: `+${XP_NEW_ARTIST}` });
  if (hasReview) reasons.push({ label: 'Review', value: `+${XP_REVIEW}` });
  if (hasPhoto) reasons.push({ label: 'Photo', value: `+${XP_PHOTO}` });
  if (firstOfMonth) reasons.push({ label: 'First of month', value: `+${XP_FIRST_OF_MONTH}` });

  // Past XP total (recalculate from past shows)
  const xpBefore = pastShows.reduce((acc, show, idx) => {
    const showsBeforeThis = pastShows.slice(0, idx);
    const prevVenues = new Set(showsBeforeThis.map((s) => s.venue.toLowerCase().trim()));
    const prevArtists = new Set(showsBeforeThis.map((s) => s.artist.toLowerCase().trim()));
    const prevMonths = new Set(showsBeforeThis.map((s) => toMonthKey(s.date)));

    return acc + xpForShow({
      isNewVenue: !prevVenues.has(show.venue.toLowerCase().trim()),
      isNewArtist: !prevArtists.has(show.artist.toLowerCase().trim()),
      hasReview: Boolean(show.review && show.review.trim().length > 0),
      hasPhoto: Boolean(show.photos && show.photos.length > 0),
      firstOfMonth: !prevMonths.has(toMonthKey(show.date)),
    });
  }, 0);

  const xpAfter = xpBefore + xpGain;
  const beforeLevel = levelFor(xpBefore);
  const afterLevel = levelFor(xpAfter);
  const leveledUp = afterLevel.index > beforeLevel.index;

  // Streaks
  const streakBefore = calculateStreak(pastDates);
  const allDates = [...pastDates, draft.date];
  const streakAfter = calculateStreak(allDates);
  const streakIncreased = streakAfter > streakBefore;

  // Badges
  const allShows: PastShow[] = [...pastShows, draft];
  const statsBefore = buildStats(pastShows, streakBefore);
  const statsAfter = buildStats(allShows, streakAfter);

  const newBadges = BADGE_DEFS
    .filter((badge) => !badge.check(statsBefore) && badge.check(statsAfter))
    .map(({ id, label, emoji, desc }) => ({ id, label, emoji, desc }));

  return {
    xpGain,
    xpBefore,
    xpAfter,
    beforeLevel,
    afterLevel,
    leveledUp,
    newBadges,
    reasons,
    streakBefore,
    streakAfter,
    streakIncreased,
  };
}
