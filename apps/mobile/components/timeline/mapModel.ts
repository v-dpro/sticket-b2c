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

export type MapCell =
  | {
      kind: 'photo';
      key: string;
      index: number; // global cell order — drives the entrance stagger
      thumbnailUrl: string;
      score: number | null;
      label: string;
    }
  | {
      kind: 'entry';
      key: string;
      index: number;
      initial: string;
      score: number | null;
      label: string;
    }
  | {
      kind: 'plan';
      key: string;
      index: number;
      countdown: string; // "21D" / "TODAY"
      label: string;
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

export function buildMapGrid(
  upcoming: TimelineUpcomingItem[],
  months: TimelineMonth[],
  granularity: MapGranularity = 'month',
): MapRow[] {
  const rows: MapRow[] = [];
  let index = 0;

  const planCells: MapCell[] = upcoming.map((item) => ({
    kind: 'plan',
    key: planRowKey(item),
    index: index++,
    countdown: countdownCellLabel(item.date),
    label: `Planned: ${item.event.artist.name} at ${item.event.venue.name}, ${formatShortDate(item.date)}`,
  }));
  if (planCells.length > 0) {
    rows.push({ type: 'header', key: 'header-upcoming', label: 'UPCOMING' });
    rows.push(...chunkRows('upcoming', planCells));
  }

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
      const shared = entry.sharedAt !== null && entry.photos.length > 0;
      if (shared) {
        const photo = entry.photos[0]!;
        group.cells.push({
          kind: 'photo',
          key: entryRowKey(entry),
          index: index++,
          thumbnailUrl: photo.thumbnailUrl || photo.photoUrl,
          score: entry.score,
          label: cellLabel,
        });
      } else {
        group.cells.push({
          kind: 'entry',
          key: entryRowKey(entry),
          index: index++,
          initial: (entry.artist.name.trim()[0] ?? '?').toUpperCase(),
          score: entry.score,
          label: cellLabel,
        });
      }
    }
  }

  for (const group of groups) {
    if (group.cells.length === 0) continue;
    rows.push({ type: 'header', key: `header-${group.key}`, label: group.label });
    rows.push(...chunkRows(group.key, group.cells));
  }

  return rows;
}
