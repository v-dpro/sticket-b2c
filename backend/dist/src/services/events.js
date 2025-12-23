"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertBandsintownEvent = upsertBandsintownEvent;
exports.syncUpcomingEventsForArtistName = syncUpcomingEventsForArtistName;
exports.syncUpcomingEventsForArtistNames = syncUpcomingEventsForArtistNames;
const prisma_1 = __importDefault(require("../lib/prisma"));
const bandsintown_1 = require("./bandsintown");
function normalizeCountry(country) {
    if (!country)
        return 'US';
    // Bandsintown returns country names sometimes; keep short-circuit for US.
    if (country.toUpperCase() === 'US' || country.toUpperCase() === 'USA')
        return 'US';
    return country;
}
function pickTicketUrl(event) {
    const first = event.offers?.find((o) => o.url)?.url;
    return first ?? null;
}
async function upsertBandsintownEvent(artistName, event) {
    const date = new Date(event.datetime);
    if (Number.isNaN(date.getTime()))
        return null;
    // Upsert artist by name first; attach spotifyId later via Spotify sync.
    let artist = await prisma_1.default.artist.findFirst({
        where: { name: { equals: artistName, mode: 'insensitive' } },
    });
    if (!artist) {
        artist = await prisma_1.default.artist.create({
            data: { name: artistName, bandsintownId: event.artist_id || null },
        });
    }
    else if (!artist.bandsintownId && event.artist_id) {
        artist = await prisma_1.default.artist.update({
            where: { id: artist.id },
            data: { bandsintownId: event.artist_id },
        });
    }
    const venueCountry = normalizeCountry(event.venue?.country);
    const venueLat = event.venue?.latitude ? Number(event.venue.latitude) : null;
    const venueLng = event.venue?.longitude ? Number(event.venue.longitude) : null;
    const venue = await prisma_1.default.venue.upsert({
        where: {
            name_city_country: {
                name: event.venue.name,
                city: event.venue.city,
                country: venueCountry,
            },
        },
        create: {
            name: event.venue.name,
            city: event.venue.city,
            state: event.venue.region || null,
            country: venueCountry,
            lat: Number.isFinite(venueLat) ? venueLat : null,
            lng: Number.isFinite(venueLng) ? venueLng : null,
        },
        update: {
            state: event.venue.region || null,
            ...(Number.isFinite(venueLat) ? { lat: venueLat } : {}),
            ...(Number.isFinite(venueLng) ? { lng: venueLng } : {}),
        },
    });
    const name = event.title || `${artist.name} at ${venue.name}`;
    const dbEvent = await prisma_1.default.event.upsert({
        where: {
            artistId_venueId_date: {
                artistId: artist.id,
                venueId: venue.id,
                date,
            },
        },
        create: {
            artistId: artist.id,
            venueId: venue.id,
            date,
            name,
            ticketUrl: pickTicketUrl(event),
            source: 'bandsintown',
            externalId: event.id,
        },
        update: {
            name,
            ticketUrl: pickTicketUrl(event),
            source: 'bandsintown',
            externalId: event.id,
        },
        include: { artist: true, venue: true },
    });
    return dbEvent;
}
async function syncUpcomingEventsForArtistName(artistName, limitPerArtist = 50) {
    const events = await (0, bandsintown_1.getBandsintownEventsForArtist)(artistName);
    const upcoming = events.filter((e) => new Date(e.datetime).getTime() >= Date.now());
    const inserted = [];
    for (const e of upcoming.slice(0, limitPerArtist)) {
        const saved = await upsertBandsintownEvent(artistName, e);
        if (saved)
            inserted.push(saved);
    }
    return inserted;
}
async function syncUpcomingEventsForArtistNames(artistNames, options) {
    const maxArtists = options?.maxArtists ?? 10;
    const limitPerArtist = options?.limitPerArtist ?? 50;
    const names = Array.from(new Set(artistNames.map((n) => n.trim()).filter(Boolean))).slice(0, maxArtists);
    const all = [];
    // Small batches to avoid rate limiting.
    const batchSize = 5;
    for (let i = 0; i < names.length; i += batchSize) {
        const batch = names.slice(i, i + batchSize);
        const results = await Promise.all(batch.map((name) => syncUpcomingEventsForArtistName(name, limitPerArtist)));
        all.push(...results.flat());
    }
    // Deduplicate by event id.
    const byId = new Map();
    for (const e of all) {
        if (!e)
            continue;
        byId.set(e.id, e);
    }
    return Array.from(byId.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
//# sourceMappingURL=events.js.map