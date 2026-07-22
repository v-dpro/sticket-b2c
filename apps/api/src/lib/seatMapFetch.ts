// On-demand Ticketmaster seat-map fetch.
//
// TM's public maps API returns the interactive seat geometry for ANY event
// keyed by its Discovery event id — the same `externalId` we already store on
// every ticketmaster Event. No host id, no systemId, no proxy needed. We fetch
// on first request, parse into our section format, and the caller caches it on
// Venue.seatMapData so subsequent requests are instant. This replaces the
// limited ERP-cache replication and covers ~every seated TM venue.

const TM_MAPS = 'https://mapsapi.tmol.io/maps/geometry/3/event';

export type SeatMapSection = {
  id: string;
  name: string;
  level: string;
  path: string;
  labelX: number;
  labelY: number;
};
export type SeatMap = { width: number; height: number; sections: SeatMapSection[] };

// Group a section by name into a coarse tier, for the client's level tinting.
function inferLevel(name: string): string {
  const u = name.toUpperCase();
  if (u.includes('ORCH') || u.includes('FLOOR') || u.includes('PIT') || u.includes('GA')) return 'Orchestra/Floor';
  if (u.includes('MZ') || u.includes('MEZZ')) {
    if (u.includes('1ST') || u.includes('1 ')) return '1st Mezzanine';
    if (u.includes('2ND') || u.includes('2 ')) return '2nd Mezzanine';
    if (u.includes('3RD') || u.includes('3 ')) return '3rd Mezzanine';
    return 'Mezzanine';
  }
  const m = name.match(/^(\d+)/);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= 50) return 'Floor';
    if (n >= 100 && n < 200) return '100 Level';
    if (n >= 200 && n < 300) return '200 Level';
    if (n >= 300 && n < 400) return '300 Level';
    if (n >= 400 && n < 500) return '400 Level';
    if (n >= 500) return '500+ Level';
  }
  if (u.includes('CLUB') || u.includes('SUITE') || u.includes('VIP') || u.includes('BOX')) return 'Premium';
  return 'General';
}

// Walk the TM segment tree; every COMPOSITE segment with a shape path is a
// tappable section. (Mirrors the ERP's venueMapService parseMapResponse.)
function parseTmMap(data: any): SeatMap {
  const page = data?.pages?.[0];
  if (!page) return { width: 10240, height: 7680, sections: [] };
  const sections: SeatMapSection[] = [];
  const walk = (seg: any) => {
    const shape = seg?.shapes?.[0];
    if (seg?.segmentCategory === 'COMPOSITE' && shape?.path) {
      const label = shape.labels?.[0];
      sections.push({
        id: String(seg.id),
        name: String(seg.name ?? ''),
        level: inferLevel(String(seg.name ?? '')),
        path: String(shape.path),
        labelX: Number(label?.x ?? 0),
        labelY: Number(label?.y ?? 0),
      });
    }
    if (Array.isArray(seg?.segments)) seg.segments.forEach(walk);
  };
  (page.segments ?? []).forEach(walk);
  return { width: Number(page.width) || 10240, height: Number(page.height) || 7680, sections };
}

/**
 * Fetch + parse a venue seat map from TM for a given Discovery event id.
 * Returns null on any failure or a too-sparse map (GA-only venues), so callers
 * can fall back to manual section entry.
 */
export async function fetchTmSeatMap(discoveryEventId: string): Promise<SeatMap | null> {
  try {
    const res = await fetch(
      `${TM_MAPS}/${encodeURIComponent(discoveryEventId)}?app=CCP&sectionLevel=true`,
      {
        headers: { Origin: 'https://www.ticketmaster.com', 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(12_000),
      },
    );
    if (!res.ok) return null;
    const map = parseTmMap(await res.json());
    return map.sections.length >= 4 ? map : null;
  } catch {
    return null;
  }
}
