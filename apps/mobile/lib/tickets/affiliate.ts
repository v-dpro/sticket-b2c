// lib/tickets/affiliate.ts — ticket link builder with an affiliate layer.
//
// Every "Find tickets" / "Buy" link in the app routes through buildTicketLink
// so we can wrap the destination in a platform's affiliate/referral redirect
// and earn on conversions. Until an affiliate ID is configured for a
// platform it returns the plain link — so nothing breaks and behavior is
// identical to today; it silently starts earning once IDs are dropped in.
//
// HOW AFFILIATE WRAPPING WORKS: most ticket programs (Ticketmaster, StubHub,
// SeatGeek, Vivid Seats, TickPick, Gametime, AXS) run through affiliate
// networks — mostly Impact.com, some Partnerize/CJ. Each gives you a tracking
// REDIRECT base that takes the real destination as a query param. So the
// wrapper is a template with a `{target}` placeholder, e.g.
//   https://<network-redirect>?...&subId1={click}&u={target}
// Set these per platform via env (EXPO_PUBLIC_AFF_*). Empty ⇒ plain link.
//
// TODO(vincent): enroll in each program (most are on Impact.com), then set
// the redirect templates in the app's env / EAS secrets. See PLATFORMS below.

export type TicketTier = 'primary' | 'resale';

export type TicketPlatform = {
  id: string;
  name: string;
  tier: TicketTier;
  /** Build a search URL for a "artist + city" style query. */
  search: (query: string) => string;
  /** Affiliate redirect template with a `{target}` placeholder (URL-encoded
   *  destination is substituted in). Read from env; empty ⇒ plain link. */
  affiliateTemplate?: string;
};

const env = (k: string): string | undefined => {
  const v = process.env[k];
  return v && v.trim() ? v.trim() : undefined;
};

// The catalog. Order matters: primary first, then resale.
export const TICKET_PLATFORMS: TicketPlatform[] = [
  {
    id: 'ticketmaster',
    name: 'Ticketmaster',
    tier: 'primary',
    search: (q) => `https://www.ticketmaster.com/search?q=${encodeURIComponent(q)}`,
    affiliateTemplate: env('EXPO_PUBLIC_AFF_TICKETMASTER'),
  },
  {
    id: 'axs',
    name: 'AXS',
    tier: 'primary',
    search: (q) => `https://www.axs.com/search?q=${encodeURIComponent(q)}`,
    affiliateTemplate: env('EXPO_PUBLIC_AFF_AXS'),
  },
  {
    id: 'seatgeek',
    name: 'SeatGeek',
    tier: 'resale',
    search: (q) => `https://seatgeek.com/search?search=${encodeURIComponent(q)}`,
    affiliateTemplate: env('EXPO_PUBLIC_AFF_SEATGEEK'),
  },
  {
    id: 'stubhub',
    name: 'StubHub',
    tier: 'resale',
    search: (q) => `https://www.stubhub.com/secure/search?q=${encodeURIComponent(q)}`,
    affiliateTemplate: env('EXPO_PUBLIC_AFF_STUBHUB'),
  },
  {
    id: 'vividseats',
    name: 'Vivid Seats',
    tier: 'resale',
    search: (q) => `https://www.vividseats.com/search?searchTerm=${encodeURIComponent(q)}`,
    affiliateTemplate: env('EXPO_PUBLIC_AFF_VIVIDSEATS'),
  },
  {
    id: 'tickpick',
    name: 'TickPick',
    tier: 'resale',
    search: (q) => `https://www.tickpick.com/search?q=${encodeURIComponent(q)}`,
    affiliateTemplate: env('EXPO_PUBLIC_AFF_TICKPICK'),
  },
  {
    id: 'gametime',
    name: 'Gametime',
    tier: 'resale',
    search: (q) => `https://gametime.co/search?q=${encodeURIComponent(q)}`,
    affiliateTemplate: env('EXPO_PUBLIC_AFF_GAMETIME'),
  },
];

export function ticketPlatform(id: string): TicketPlatform | undefined {
  return TICKET_PLATFORMS.find((p) => p.id === id);
}

/** True if ANY platform has an affiliate template configured — used to show
 *  the FTC-style "we may earn a commission" disclosure only when relevant. */
export function hasAffiliateConfigured(): boolean {
  return TICKET_PLATFORMS.some((p) => p.affiliateTemplate);
}

type BuildOpts = {
  /** "artist + city" search query. */
  query: string;
  /** A specific event URL (e.g. Ticketmaster's own event page from the API);
   *  preferred over search when present. */
  directUrl?: string | null;
  /** Optional click id passed to the affiliate network for attribution. */
  clickId?: string;
};

/**
 * The one link builder. Returns the affiliate-wrapped URL when the platform
 * has a template configured, otherwise the plain destination.
 */
export function buildTicketLink(platformId: string, opts: BuildOpts): string {
  const platform = ticketPlatform(platformId);
  if (!platform) return opts.directUrl || '';
  const target = opts.directUrl || platform.search(opts.query);
  const tmpl = platform.affiliateTemplate;
  if (!tmpl) return target;
  return tmpl
    .replace('{target}', encodeURIComponent(target))
    .replace('{click}', encodeURIComponent(opts.clickId ?? ''));
}
