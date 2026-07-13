// components/timeline/mapModel.ts — pure derivation of the map view's
// Instagram-grid model from the SAME data the scroll timeline already holds
// (no refetch). Upcoming plans group under one "UPCOMING" header at the top;
// past months each get their own "JUL 2026" header (months arrive newest
// first already — no re-sorting needed). Every group's cells are pre-chunked
// into rows of 3 so the view can render a single flat, virtualized list
// (header rows + cell-triplet rows) without FlatList's numColumns fighting
// mixed-width items. No theme access, no React.

import type {
  TimelineEntry,
  TimelineMonth,
  TimelineUpcomingItem,
} from '../../lib/api/timeline';
import { daysUntil, formatShortDate, monthLabel } from './format';

const COLUMNS = 3;

// `monthTag` is set only on the FIRST cell of a new month/group — a tiny
// "JUL 2026" overlay in the corner. The grid is otherwise one continuous
// Instagram mosaic; the tag is the only thing marking month boundaries.
export type MapCell =
  | {
      kind: 'photo';
      key: string;
      index: number; // global cell order — drives the entrance stagger
      thumbnailUrl: string;
      score: number | null;
      label: string;
      monthTag?: string;
    }
  | {
      kind: 'entry';
      key: string;
      index: number;
      initial: string;
      score: number | null;
      label: string;
      monthTag?: string;
    }
  | {
      kind: 'plan';
      key: string;
      index: number;
      countdown: string; // "21D" / "TODAY"
      label: string;
      monthTag?: string;
      thumbnailUrl?: string; // event/tour art so the plan cell is a photo too
    };

export type MapRow =
  | { type: 'header'; key: string; label: string }
  | { type: 'cells'; key: string; cells: MapCell[] };

/** Row keys matching the scroll view's flattened rows — the map hands these
 *  back so timeline.tsx can scrollToIndex the exact same row. */
export function entryRowKey(entry: Pick<TimelineEntry, 'logId'>): string {
  return `log-${entry.logId}`;
}
export function planRowKey(item: Pick<TimelineUpcomingItem, 'type' | 'id'>): string {
  return `plan-${item.type}-${item.id}`;
}

/** "in 21d" reads fine in a sentence; the grid cell wants a bare tag. */
function countdownCellLabel(dateStr: string): string {
  const days = daysUntil(dateStr);
  return days === 0 ? 'TODAY' : `${days}D`;
}

function chunkRows(groupKey: string, cells: MapCell[]): MapRow[] {
  const rows: MapRow[] = [];
  for (let i = 0; i < cells.length; i += COLUMNS) {
    rows.push({ type: 'cells', key: `${groupKey}-row-${i / COLUMNS}`, cells: cells.slice(i, i + COLUMNS) });
  }
  return rows;
}

/**
 * Build the whole-timeline grid: [UPCOMING header + rows] then, per month
 * newest-first, [month header + rows]. Cell `index` is a global counter
 * across the whole grid — the view stripes tearIn() over the first ~12.
 */
export type MapGranularity = 'week' | 'month' | 'year';

/** ISO-week key + label — "2026-W28" / "WK 28 · JUL 6–12". */
function weekKeyLabel(iso: string): { key: string; label: string } {
  const d = new Date(iso);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  const monday = new Date(d);
  monday.setDate(d.getDate() - day);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  // ISO week number.
  const jan4 = new Date(monday.getFullYear(), 0, 4);
  const week = Math.round(((monday.getTime() - jan4.getTime()) / 86400000 + ((jan4.getDay() + 6) % 7)) / 7) + 1;
  const fmt = (x: Date) =>
    x.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
  return {
    key: `${monday.getFullYear()}-W${String(week).padStart(2, '0')}`,
    label: `WK ${week} · ${fmt(monday)}–${fmt(sunday)}`,
  };
}

function groupKeyLabel(entryDate: string, monthKey: string, granularity: MapGranularity): { key: string; label: string } {
  if (granularity === 'week') return weekKeyLabel(entryDate);
  if (granularity === 'year') {
    const year = monthKey.slice(0, 4);
    return { key: year, label: year };
  }
  return { key: monthKey, label: monthLabel(monthKey) };
}

// Cover pool — verified concert/crowd photos (same source as the seed). A
// grid tile with no memory photo and no tour/artist art still gets a stable
// cover so the grid always reads as a full Instagram photo mosaic. Keyed by
// a hash of the cell so each show keeps the same cover across renders.
const COVER_POOL = [
  'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=400&q=60&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&q=60&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=60&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&q=60&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1471478331149-c72f17e33c73?w=400&q=60&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=400&q=60&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1484755560615-a4c64e778a6c?w=400&q=60&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=400&q=60&auto=format&fit=crop',
];
function coverFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return COVER_POOL[h % COVER_POOL.length]!;
}

export function buildMapGrid(
  upcoming: TimelineUpcomingItem[],
  months: TimelineMonth[],
  granularity: MapGranularity = 'month',
): MapRow[] {
  let index = 0;

  // ONE continuous Instagram mosaic: plans first (tagged UPCOMING), then
  // every logged night contiguous — no per-month rows, no blank cells. The
  // month/year is a tiny corner tag on the first cell of each group.
  const cells: MapCell[] = [];

  upcoming.forEach((item, i) => {
    cells.push({
      kind: 'plan',
      key: planRowKey(item),
      index: index++,
      countdown: countdownCellLabel(item.date),
      label: `Planned: ${item.event.artist.name} at ${item.event.venue.name}, ${formatShortDate(item.date)}`,
      monthTag: i === 0 ? 'UPCOMING' : undefined,
      thumbnailUrl: item.event.imageUrl || coverFor(planRowKey(item)),
    });
  });

  // Re-bucket the month payload into the requested granularity, preserving
  // the newest-first entry order the API already guarantees.
  const groups: { key: string; label: string; cells: MapCell[] }[] = [];
  const byKey = new Map<string, { key: string; label: string; cells: MapCell[] }>();

  for (const month of months) {
    for (const entry of month.entries) {
      const { key, label } = groupKeyLabel(entry.event.date, month.key, granularity);
      let group = byKey.get(key);
      if (!group) {
        group = { key, label, cells: [] };
        byKey.set(key, group);
        groups.push(group);
      }
      const cellLabel = `${entry.artist.name} at ${entry.venue.name}, ${formatShortDate(entry.event.date)}`;
      // Every cell is a PHOTO — memory shot if shared, else the tour/artist
      // fallback image — so the grid reads as a solid Instagram mosaic. Only
      // an entry with no image at all falls back to the initial tile.
      const memoryPhoto =
        entry.sharedAt !== null && entry.photos.length > 0 ? entry.photos[0]! : null;
      const thumb =
        memoryPhoto?.thumbnailUrl ||
        memoryPhoto?.photoUrl ||
        entry.fallbackImageUrl ||
        entry.artist.imageUrl ||
        coverFor(entryRowKey(entry));
      group.cells.push({
        kind: 'photo',
        key: entryRowKey(entry),
        index: index++,
        thumbnailUrl: thumb,
        score: entry.score,
        label: cellLabel,
      });
    }
  }

  for (const group of groups) {
    if (group.cells.length === 0) continue;
    // Tag the first cell of the group; the rest flow on contiguously.
    group.cells[0]!.monthTag = group.label;
    cells.push(...group.cells);
  }

  return chunkRows('grid', cells);
}
