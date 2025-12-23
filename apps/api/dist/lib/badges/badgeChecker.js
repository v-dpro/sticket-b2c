import { prisma } from '../prisma.js';
import { BADGES } from './badgeDefinitions.js';
export async function ensureBadgeCatalog() {
    // Keep DB catalog in-sync with code definitions (idempotent).
    await prisma.$transaction(BADGES.map((b) => prisma.badge.upsert({
        where: { key: b.id },
        create: {
            key: b.id,
            name: b.name,
            description: b.description,
            category: b.category,
            rarity: b.rarity,
            icon: b.icon,
            points: b.points,
            criteria: b.criteria,
        },
        update: {
            name: b.name,
            description: b.description,
            category: b.category,
            rarity: b.rarity,
            icon: b.icon,
            points: b.points,
            criteria: b.criteria,
        },
        select: { id: true },
    })));
}
export async function checkBadges(userId, opts) {
    const award = opts?.award ?? true;
    const eventId = opts?.eventId;
    await ensureBadgeCatalog();
    // Existing earned badge keys.
    const earnedRows = await prisma.userBadge.findMany({
        where: { userId },
        select: { badge: { select: { key: true } } },
    });
    const earnedKeys = new Set(earnedRows.map((r) => r.badge.key));
    // Map key -> DB badge id
    const catalogRows = await prisma.badge.findMany({ select: { id: true, key: true } });
    const idByKey = new Map(catalogRows.map((r) => [r.key, r.id]));
    const stats = await getUserStats(userId);
    const newBadges = [];
    const progress = [];
    for (const badge of BADGES) {
        if (earnedKeys.has(badge.id))
            continue;
        const { earned, current, target } = evaluateCriteria(badge.criteria, stats);
        if (earned && award) {
            const dbBadgeId = idByKey.get(badge.id);
            if (dbBadgeId) {
                try {
                    await prisma.userBadge.create({
                        data: {
                            userId,
                            badgeId: dbBadgeId,
                            eventId: eventId ?? null,
                        },
                    });
                    newBadges.push(badge);
                    earnedKeys.add(badge.id);
                }
                catch (err) {
                    // Ignore uniqueness race.
                    if (err?.code !== 'P2002')
                        throw err;
                }
            }
        }
        else {
            progress.push({
                badge,
                current,
                target,
                percentage: target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0,
                isEarned: false,
            });
        }
    }
    return { newBadges, progress };
}
export async function getEarnedBadges(userId) {
    await ensureBadgeCatalog();
    const rows = await prisma.userBadge.findMany({
        where: { userId },
        include: { badge: true },
        orderBy: { earnedAt: 'desc' },
    });
    const defByKey = new Map(BADGES.map((b) => [b.id, b]));
    return rows
        .map((r) => {
        const def = defByKey.get(r.badge.key);
        if (!def)
            return null;
        return {
            id: r.id,
            badge: def,
            earnedAt: r.earnedAt.toISOString(),
            eventId: r.eventId ?? undefined,
        };
    })
        .filter(Boolean);
}
export async function getBadgeProgress(userId) {
    const result = await checkBadges(userId, { award: false });
    return result.progress;
}
async function getUserStats(userId) {
    const logs = await prisma.userLog.findMany({
        where: { userId },
        include: {
            event: {
                include: {
                    venue: true,
                    artist: true,
                },
            },
        },
        orderBy: { event: { date: 'asc' } },
    });
    const showCount = logs.length;
    const uniqueVenues = new Set(logs.map((l) => l.event.venueId)).size;
    const uniqueCities = new Set(logs.map((l) => l.event.venue.city)).size;
    const uniqueStates = new Set(logs.map((l) => l.event.venue.state).filter(Boolean)).size;
    const uniqueCountries = new Set(logs.map((l) => l.event.venue.country || 'US')).size;
    const artistCounts = new Map();
    for (const log of logs) {
        const prev = artistCounts.get(log.event.artistId) || 0;
        artistCounts.set(log.event.artistId, prev + 1);
    }
    const maxArtistCount = Math.max(...artistCounts.values(), 0);
    const venueCounts = new Map();
    for (const log of logs) {
        const prev = venueCounts.get(log.event.venueId) || 0;
        venueCounts.set(log.event.venueId, prev + 1);
    }
    const maxVenueCount = Math.max(...venueCounts.values(), 0);
    const monthCounts = new Map();
    for (const log of logs) {
        const month = log.event.date.toISOString().slice(0, 7); // YYYY-MM
        const prev = monthCounts.get(month) || 0;
        monthCounts.set(month, prev + 1);
    }
    const maxMonthCount = Math.max(...monthCounts.values(), 0);
    const months = [...monthCounts.keys()].sort();
    let maxConsecutive = 0;
    let currentConsecutive = 0;
    for (let i = 0; i < months.length; i++) {
        if (i === 0) {
            currentConsecutive = 1;
        }
        else {
            const prev = new Date(months[i - 1] + '-01');
            const curr = new Date(months[i] + '-01');
            prev.setMonth(prev.getMonth() + 1);
            if (prev.getTime() === curr.getTime())
                currentConsecutive++;
            else
                currentConsecutive = 1;
        }
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
    }
    const genreCounts = new Map();
    for (const log of logs) {
        const genres = log.event.artist.genres || [];
        for (const g of genres) {
            const normalized = normalizeGenre(g);
            const prev = genreCounts.get(normalized) || 0;
            genreCounts.set(normalized, prev + 1);
        }
    }
    return {
        showCount,
        uniqueVenues,
        uniqueCities,
        uniqueStates,
        uniqueCountries,
        maxArtistCount,
        maxVenueCount,
        maxMonthCount,
        maxConsecutive,
        genreCounts,
    };
}
function normalizeGenre(genre) {
    const lower = genre.toLowerCase();
    if (lower.includes('rock'))
        return 'rock';
    if (lower.includes('pop'))
        return 'pop';
    if (lower.includes('hip') || lower.includes('rap'))
        return 'hip-hop';
    if (lower.includes('electro') || lower.includes('edm') || lower.includes('house') || lower.includes('techno'))
        return 'electronic';
    if (lower.includes('country'))
        return 'country';
    if (lower.includes('r&b') || lower.includes('soul'))
        return 'r&b';
    if (lower.includes('jazz'))
        return 'jazz';
    if (lower.includes('classical'))
        return 'classical';
    if (lower.includes('metal'))
        return 'metal';
    if (lower.includes('punk'))
        return 'punk';
    return lower;
}
function evaluateCriteria(criteria, stats) {
    switch (criteria.type) {
        case 'first_show':
            return { earned: stats.showCount >= 1, current: stats.showCount, target: 1 };
        case 'show_count':
            return { earned: stats.showCount >= criteria.count, current: stats.showCount, target: criteria.count };
        case 'shows_in_month':
            return { earned: stats.maxMonthCount >= criteria.count, current: stats.maxMonthCount, target: criteria.count };
        case 'consecutive_months':
            return { earned: stats.maxConsecutive >= criteria.count, current: stats.maxConsecutive, target: criteria.count };
        case 'same_artist':
            return { earned: stats.maxArtistCount >= criteria.count, current: stats.maxArtistCount, target: criteria.count };
        case 'unique_venues':
            return { earned: stats.uniqueVenues >= criteria.count, current: stats.uniqueVenues, target: criteria.count };
        case 'unique_cities':
            return { earned: stats.uniqueCities >= criteria.count, current: stats.uniqueCities, target: criteria.count };
        case 'unique_states':
            return { earned: stats.uniqueStates >= criteria.count, current: stats.uniqueStates, target: criteria.count };
        case 'unique_countries':
            return { earned: stats.uniqueCountries >= criteria.count, current: stats.uniqueCountries, target: criteria.count };
        case 'genre_shows': {
            const genreCount = stats.genreCounts.get(criteria.genre) || 0;
            return { earned: genreCount >= criteria.count, current: genreCount, target: criteria.count };
        }
        case 'same_venue':
            return { earned: stats.maxVenueCount >= criteria.count, current: stats.maxVenueCount, target: criteria.count };
        case 'festival':
            // TODO: requires an "isFestival" flag on events/logs.
            return { earned: false, current: 0, target: 1 };
        case 'distance_traveled':
            // TODO: requires user home location + venue geo distance.
            return { earned: false, current: 0, target: criteria.miles };
        default:
            return { earned: false, current: 0, target: 1 };
    }
}
