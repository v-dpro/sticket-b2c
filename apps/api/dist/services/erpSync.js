import { prisma } from '../lib/prisma.js';
const ERP_API_BASE = process.env.ERP_API_URL || 'https://dashboard.sticket.in/api/sos';
function parsePresaleWindows(windows) {
    if (!windows)
        return [];
    let parsed;
    if (typeof windows === 'string') {
        try {
            parsed = JSON.parse(windows);
        }
        catch {
            return [];
        }
    }
    else {
        parsed = windows;
    }
    if (!Array.isArray(parsed))
        return [];
    const results = [];
    for (const window of parsed) {
        const windowDate = window.date ? new Date(window.date) : null;
        if (window.presales && Array.isArray(window.presales)) {
            for (const presale of window.presales) {
                if (presale.type) {
                    results.push({
                        presaleType: presale.type,
                        presaleStart: windowDate,
                        code: presale.password || null,
                    });
                }
            }
        }
    }
    return results;
}
function parseDateTime(dateStr, timeStr) {
    if (!dateStr)
        return null;
    try {
        if (dateStr.includes(' ') || dateStr.includes('T'))
            return new Date(dateStr);
        const combined = timeStr ? `${dateStr} ${timeStr}` : dateStr;
        const parsed = new Date(combined);
        return isNaN(parsed.getTime()) ? null : parsed;
    }
    catch {
        return null;
    }
}
function getBestCode(event) {
    return event.passcode || event.citi_pass || event.amex_pass || event.fan_club_pass || null;
}
function getArtistName(event) {
    if (event.event_details) {
        const parts = event.event_details.split(/\s*[-–]\s*/);
        return parts[0].trim();
    }
    return event.event_name || 'Unknown Artist';
}
function getTourName(event) {
    if (event.event_details) {
        const parts = event.event_details.split(/\s*[-–]\s*/);
        if (parts.length > 1)
            return parts.slice(1).join(' - ').trim();
    }
    return null;
}
async function fetchSOSEvents() {
    const allEvents = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;
    const dateFrom = new Date().toISOString().split('T')[0];
    while (hasMore) {
        try {
            const url = new URL(`${ERP_API_BASE}/events`);
            url.searchParams.set('limit', String(limit));
            url.searchParams.set('offset', String(offset));
            url.searchParams.set('date_from', dateFrom);
            console.log(`[ERP Sync] Fetching: ${url.toString()}`);
            const response = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
            if (!response.ok)
                throw new Error(`SOS API error: ${response.status}`);
            const data = await response.json();
            if (!data.success)
                throw new Error('SOS API returned success: false');
            allEvents.push(...data.data);
            hasMore = data.pagination.hasMore;
            offset += limit;
            if (allEvents.length > 5000) {
                console.warn('[ERP Sync] Hit 5000 event limit');
                break;
            }
        }
        catch (error) {
            console.error('[ERP Sync] Fetch error:', error);
            break;
        }
    }
    console.log(`[ERP Sync] Fetched ${allEvents.length} events`);
    return allEvents;
}
export async function syncPresalesFromERP() {
    const events = await fetchSOSEvents();
    if (events.length === 0)
        return 0;
    let synced = 0;
    let skipped = 0;
    let errors = 0;
    for (const event of events) {
        try {
            const artistName = getArtistName(event);
            const tourName = getTourName(event);
            const venueName = event.venue || 'Unknown Venue';
            const venueCity = event.city || 'Unknown';
            const venueState = event.state || null;
            const eventDate = parseDateTime(event.event_date) || new Date();
            const windowPresales = parsePresaleWindows(event.presale_windows);
            if (windowPresales.length > 0) {
                for (const wp of windowPresales) {
                    const nextPresaleStart = wp.presaleStart || parseDateTime(event.presale_date, event.presale_time);
                    await prisma.presale.upsert({
                        where: {
                            artistName_venueName_eventDate_presaleType: {
                                artistName,
                                venueName,
                                eventDate,
                                presaleType: wp.presaleType,
                            },
                        },
                        create: {
                            artistName,
                            tourName,
                            venueName,
                            venueCity,
                            venueState,
                            eventDate,
                            presaleType: wp.presaleType,
                            presaleStart: wp.presaleStart || parseDateTime(event.presale_date, event.presale_time) || new Date(),
                            presaleEnd: null,
                            onsaleStart: parseDateTime(event.public_sale_date, event.public_sale_time),
                            code: wp.code || getBestCode(event),
                            signupUrl: null,
                            signupDeadline: null,
                            ticketUrl: event.source_url || null,
                            notes: event.presale_info || event.important_info || null,
                            source: 'ERP',
                        },
                        update: {
                            tourName,
                            ...(nextPresaleStart ? { presaleStart: nextPresaleStart } : {}),
                            onsaleStart: parseDateTime(event.public_sale_date, event.public_sale_time),
                            code: wp.code || getBestCode(event),
                            ticketUrl: event.source_url || null,
                            notes: event.presale_info || event.important_info || null,
                        },
                    });
                    synced++;
                }
            }
            else if (event.presale_type || event.presale_date) {
                const presaleType = event.presale_type || 'General Presale';
                const presaleStart = parseDateTime(event.presale_date, event.presale_time);
                if (!presaleStart) {
                    skipped++;
                    continue;
                }
                await prisma.presale.upsert({
                    where: {
                        artistName_venueName_eventDate_presaleType: { artistName, venueName, eventDate, presaleType },
                    },
                    create: {
                        artistName,
                        tourName,
                        venueName,
                        venueCity,
                        venueState,
                        eventDate,
                        presaleType,
                        presaleStart,
                        presaleEnd: null,
                        onsaleStart: parseDateTime(event.public_sale_date, event.public_sale_time),
                        code: getBestCode(event),
                        signupUrl: null,
                        signupDeadline: null,
                        ticketUrl: event.source_url || null,
                        notes: event.presale_info || event.important_info || null,
                        source: 'ERP',
                    },
                    update: {
                        tourName,
                        presaleStart,
                        onsaleStart: parseDateTime(event.public_sale_date, event.public_sale_time),
                        code: getBestCode(event),
                        ticketUrl: event.source_url || null,
                        notes: event.presale_info || event.important_info || null,
                    },
                });
                synced++;
            }
            else {
                skipped++;
            }
        }
        catch (error) {
            errors++;
            if (errors <= 3)
                console.error('[ERP Sync] Error:', event.id, error);
        }
    }
    console.log(`[ERP Sync] Done: ${synced} synced, ${skipped} skipped, ${errors} errors`);
    return synced;
}
export function startERPSyncJob() {
    console.log('[ERP Sync] Starting...');
    // Initial sync after 5s
    setTimeout(() => {
        void syncPresalesFromERP()
            .then((n) => console.log(`[ERP Sync] Initial: ${n} presales`))
            .catch((e) => console.error('[ERP Sync] Initial failed:', e));
    }, 5000);
    // Every 30 min
    setInterval(() => {
        void syncPresalesFromERP()
            .then((n) => console.log(`[ERP Sync] Periodic: ${n} presales`))
            .catch((e) => console.error('[ERP Sync] Periodic failed:', e));
    }, 30 * 60 * 1000);
}
