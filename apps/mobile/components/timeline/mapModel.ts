// components/timeline/mapModel.ts — pure derivation of the 2D map view
// model from the SAME data the scroll timeline already holds (no refetch).
// Year sections (newest first) → month tiles (newest first, empty months
// skipped) → markers: photo thumbnail (shared w/ photo), dot (logged,
// no shared photo), dashed plan ring (future). No theme access, no React.

import type {
  TimelineEntry,
  TimelineMonth,
  TimelineUpcomingItem,
} from '../../lib/api/timeline';
import { formatShortDate, monthAbbr } from './format';

export type MapMarker =
  | {
      kind: 'photo';
      key: string;
      logId: string;
      thumbnailUrl: string;
      label: string;
    }
  | {
      kind: 'dot';
      key: string;
      logId: string;
      label: string;
    }
  | {
      kind: 'plan';
      key: string;
      item: TimelineUpcomingItem;
      /** Party plans get a tiny 🎉 — no API field yet, so this is always
       *  false today. The render branch is ready for when the data lands. */
      isParty: boolean;
      label: string;
    };

export type MapMonthTile = {
  key: string; // "2026-07"
  monthAbbr: string; // "JUL"
  markers: MapMarker[];
};

export type MapYearSection = {
  year: string; // "2026"
  loggedCount: number; // logged shows in this year (photos + dots)
  plannedCount: number; // future plans in this year
  months: MapMonthTile[]; // newest first, empty months skipped
};

/** Row keys matching the scroll view's flattened rows — the map hands these
 *  back so you.tsx can scrollToIndex the exact same row. */
export function entryRowKey(entry: Pick<TimelineEntry, 'logId'>): string {
  return `log-${entry.logId}`;
}
export function planRowKey(item: Pick<TimelineUpcomingItem, 'type' | 'id'>): string {
  return `plan-${item.type}-${item.id}`;
}

function entryMarker(entry: TimelineEntry): MapMarker {
  const label = `${entry.artist.name} at ${entry.venue.name}, ${formatShortDate(entry.event.date)}`;
  const shared = entry.sharedAt !== null && entry.photos.length > 0;
  if (shared) {
    const photo = entry.photos[0]!;
    return {
      kind: 'photo',
      key: entryRowKey(entry),
      logId: entry.logId,
      thumbnailUrl: photo.thumbnailUrl || photo.photoUrl,
      label,
    };
  }
  return { kind: 'dot', key: entryRowKey(entry), logId: entry.logId, label };
}

function planMarker(item: TimelineUpcomingItem): MapMarker {
  return {
    kind: 'plan',
    key: planRowKey(item),
    item,
    // No party data in the API yet — branch ready, unreachable today.
    isParty: false,
    label: `Planned: ${item.event.artist.name} at ${item.event.venue.name}, ${formatShortDate(item.date)}`,
  };
}

/**
 * Build the whole-timeline-on-one-page model. `months` is the scroll view's
 * already-fetched month buckets (newest first); `upcoming` the future plans
 * (ascending). Future plans are bucketed into their own month tiles so a
 * year can mix dashed plan rings with logged markers.
 */
export function buildMapModel(
  upcoming: TimelineUpcomingItem[],
  months: TimelineMonth[],
): MapYearSection[] {
  // monthKey → markers. Insert plans first (they render before logged
  // entries inside a shared month tile), soonest plan first.
  const buckets = new Map<string, MapMarker[]>();
  const push = (monthKey: string, marker: MapMarker) => {
    const list = buckets.get(monthKey);
    if (list) list.push(marker);
    else buckets.set(monthKey, [marker]);
  };

  for (const item of upcoming) {
    const monthKey = item.date.slice(0, 7); // ISO → "2026-09"
    if (monthKey.length === 7) push(monthKey, planMarker(item));
  }
  for (const month of months) {
    for (const entry of month.entries) {
      push(month.key, entryMarker(entry));
    }
  }

  // Newest month first across the whole page ("2026-09" sorts lexically).
  const sortedKeys = [...buckets.keys()].sort((a, b) => (a < b ? 1 : -1));

  const sections: MapYearSection[] = [];
  for (const monthKey of sortedKeys) {
    const year = monthKey.slice(0, 4);
    const markers = buckets.get(monthKey)!;
    let section = sections[sections.length - 1];
    if (!section || section.year !== year) {
      section = { year, loggedCount: 0, plannedCount: 0, months: [] };
      sections.push(section);
    }
    section.months.push({ key: monthKey, monthAbbr: monthAbbr(monthKey), markers });
    for (const marker of markers) {
      if (marker.kind === 'plan') section.plannedCount += 1;
      else section.loggedCount += 1;
    }
  }
  return sections;
}
