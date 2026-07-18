/**
 * Replicate real Ticketmaster seat-map geometry from the ERP into the consumer
 * app's Venue rows. One-time / periodic reference-data sync.
 *
 * Data-wall note: seat maps are PUBLIC venue geometry, not broker business data.
 * We COPY them into the consumer DB (keyed by normalized venue name+city); the
 * consumer app never live-queries the broker DB.
 *
 *   Source (read):  ERP  Postgres  -> venue_map_cache + market_intel_events / traderpro_events
 *   Dest   (write): consumer Prisma DB -> Venue.seatMapData / seatMapFetchedAt
 *
 * Run (never prints either connection string):
 *   cd apps/api
 *   set -a; . ./.env; set +a                       # consumer DATABASE_URL
 *   ERP_DATABASE_URL="$(grep -E '^DATABASE_URL=' ~/STICKET/sticket-erp/.env | sed -E 's/^DATABASE_URL=//; s/^"//; s/"$//')" \
 *     npx tsx prisma/import-seatmaps.ts
 */
import { Client } from 'pg';

function norm(s: string | null | undefined): string {
  return (s ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\(.*?\)/g, ' ')
    .replace(/\b(presented|sponsored)\s+by\b.*$/, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\bthe\b/g, ' ')
    .replace(/\bamphitheatre\b/g, 'amphitheater')
    .replace(/\s+/g, ' ')
    .trim();
}
function normCity(s: string | null | undefined): string {
  return norm(s).replace(/\bsaint\b/g, 'st').replace(/\bfort\b/g, 'ft').replace(/\bft\b/g, 'ft');
}
function vkey(name: string | null | undefined, city: string | null | undefined): string {
  return norm(name) + '|' + normCity(city);
}

type Section = { id: string; name: string; level: string; path: string; labelX: number; labelY: number };
type SeatMap = { width: number; height: number; sections: Section[] };

async function main() {
  const erpUrl = process.env.ERP_DATABASE_URL;
  if (!erpUrl) throw new Error('ERP_DATABASE_URL not set — source the ERP env into it (see header).');

  const erp = new Client({ connectionString: erpUrl });
  await erp.connect();

  // Pull every cached map, resolved to a venue name via the ERP's own event tables.
  const { rows } = await erp.query<{ event_id: string; map_data: any; venue_name: string; venue_city: string }>(`
    SELECT vmc.event_id, vmc.map_data, mie.venue_name, mie.venue_city
      FROM venue_map_cache vmc
      JOIN market_intel_events mie ON mie.ticketmaster_event_id = vmc.event_id
     WHERE mie.venue_name IS NOT NULL
    UNION ALL
    SELECT vmc.event_id, vmc.map_data, tpe.venue_name, tpe.venue_city
      FROM venue_map_cache vmc
      JOIN traderpro_events tpe ON tpe.traderpro_event_id = vmc.event_id
     WHERE tpe.venue_name IS NOT NULL
  `);
  await erp.end();

  // Best (most complete) map per venue; trim to render-only fields (drop heavy per-seat `rows`).
  const best = new Map<string, { n: number; name: string; city: string; map: SeatMap }>();
  for (const r of rows) {
    const md = r.map_data;
    const secs: any[] = Array.isArray(md?.sections) ? md.sections : [];
    if (!secs.length) continue;
    const key = vkey(r.venue_name, r.venue_city);
    const prev = best.get(key);
    if (prev && prev.n >= secs.length) continue;
    best.set(key, {
      n: secs.length,
      name: r.venue_name,
      city: r.venue_city,
      map: {
        width: Number(md.width),
        height: Number(md.height),
        sections: secs.map((s) => ({
          id: String(s.id),
          name: String(s.name),
          level: String(s.level ?? ''),
          path: String(s.path),
          labelX: Number(s.labelX),
          labelY: Number(s.labelY),
        })),
      },
    });
  }

  // Index consumer venues by normalized name+city (consumer DB via raw pg —
  // Prisma 7 configures its URL through prisma.config.ts, awkward for a script).
  const appUrl = process.env.DATABASE_URL;
  if (!appUrl) throw new Error('DATABASE_URL not set — source apps/api/.env first.');
  const app = new Client({ connectionString: appUrl });
  await app.connect();

  const venuesRes = await app.query<{ id: string; name: string; city: string }>(
    'SELECT id, name, city FROM "Venue"'
  );
  const byKey = new Map<string, string[]>();
  for (const v of venuesRes.rows) {
    const k = vkey(v.name, v.city);
    (byKey.get(k) ?? byKey.set(k, []).get(k)!).push(v.id);
  }

  let matchedVenues = 0;
  let updated = 0;
  const hits: string[] = [];
  for (const [key, m] of best) {
    const targets = byKey.get(key);
    if (!targets?.length) continue;
    matchedVenues++;
    hits.push(`${m.name} · ${m.city} (${m.map.sections.length} sec)`);
    for (const id of targets) {
      await app.query('UPDATE "Venue" SET "seatMapData"=$1::jsonb, "seatMapFetchedAt"=now() WHERE id=$2', [
        JSON.stringify(m.map),
        id,
      ]);
      updated++;
    }
  }
  await app.end();

  console.log(`ERP maps resolved to venues: ${best.size}`);
  console.log(`consumer venues: ${venuesRes.rows.length}`);
  console.log(`venues matched & mapped: ${matchedVenues} (rows updated: ${updated})`);
  console.log('matched:\n  ' + hits.sort().join('\n  '));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
