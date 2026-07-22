/**
 * Pre-fetch venue seat maps from Ticketmaster and cache them into the consumer
 * DB, so the API serves them instantly and doesn't have to fetch live (TM's
 * maps API blocks datacenter IPs like Render — this must run from a residential
 * IP, e.g. locally). Idempotent: only fills venues that don't have a map yet.
 *
 *   cd apps/api && set -a; . ./.env; set +a && npx tsx prisma/prefetch-seatmaps.ts
 */
import { Client } from 'pg';
import { fetchTmSeatMap } from '../src/lib/seatMapFetch';

const DELAY_MS = 250;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set — source apps/api/.env first.');
  const db = new Client({ connectionString: url });
  await db.connect();

  // Venues with no map yet but at least one ticketmaster event carrying a
  // Discovery externalId. Take the most recent event's id per venue.
  const { rows } = await db.query<{ venue_id: string; venue_name: string; external_id: string }>(`
    SELECT DISTINCT ON (v.id) v.id AS venue_id, v.name AS venue_name, e."externalId" AS external_id
      FROM "Venue" v
      JOIN "Event" e ON e."venueId" = v.id
     WHERE v."seatMapData" IS NULL
       AND e.source = 'ticketmaster'
       AND e."externalId" IS NOT NULL
     ORDER BY v.id, e.date DESC
  `);

  console.log(`candidate venues without a map: ${rows.length}`);
  let mapped = 0;
  let empty = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const { venue_id, venue_name, external_id } = rows[i];
    try {
      const map = await fetchTmSeatMap(external_id);
      if (map) {
        await db.query('UPDATE "Venue" SET "seatMapData"=$1::jsonb, "seatMapFetchedAt"=now() WHERE id=$2', [
          JSON.stringify(map),
          venue_id,
        ]);
        mapped++;
        if (mapped % 20 === 0 || i === rows.length - 1) {
          console.log(`  [${i + 1}/${rows.length}] mapped=${mapped} empty=${empty} failed=${failed} · last: ${venue_name} (${map.sections.length} sec)`);
        }
      } else {
        empty++;
      }
    } catch (e) {
      failed++;
    }
    await sleep(DELAY_MS);
  }

  console.log(`\nDONE — mapped=${mapped}  no-map(GA/blocked)=${empty}  errors=${failed}  of ${rows.length}`);
  await db.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
