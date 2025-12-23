export type BadgeCategory =
  | 'milestone'
  | 'streak'
  | 'loyalty'
  | 'explorer'
  | 'traveler'
  | 'genre'
  | 'venue'
  | 'special';

export type BadgeRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type BadgeCriteria =
  | { type: 'show_count'; count: number }
  | { type: 'shows_in_month'; count: number }
  | { type: 'consecutive_months'; count: number }
  | { type: 'same_artist'; count: number }
  | { type: 'unique_venues'; count: number }
  | { type: 'unique_cities'; count: number }
  | { type: 'unique_states'; count: number }
  | { type: 'unique_countries'; count: number }
  | { type: 'genre_shows'; genre: string; count: number }
  | { type: 'same_venue'; count: number }
  | { type: 'first_show' }
  | { type: 'festival' }
  | { type: 'distance_traveled'; miles: number };

export interface BadgeDefinition {
  id: string; // stable key, e.g. "first_show"
  name: string;
  description: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  icon: string; // Ionicons name (mobile)
  criteria: BadgeCriteria;
  points: number;
}

export const BADGES: BadgeDefinition[] = [
  // === MILESTONES ===
  {
    id: 'first_show',
    name: 'First Timer',
    description: 'Log your first concert',
    category: 'milestone',
    rarity: 'common',
    icon: 'star',
    criteria: { type: 'first_show' },
    points: 10,
  },
  {
    id: 'shows_10',
    name: 'Getting Started',
    description: 'Log 10 concerts',
    category: 'milestone',
    rarity: 'common',
    icon: 'musical-notes',
    criteria: { type: 'show_count', count: 10 },
    points: 25,
  },
  {
    id: 'shows_25',
    name: 'Concert Goer',
    description: 'Log 25 concerts',
    category: 'milestone',
    rarity: 'uncommon',
    icon: 'ticket',
    criteria: { type: 'show_count', count: 25 },
    points: 50,
  },
  {
    id: 'shows_50',
    name: 'Live Music Lover',
    description: 'Log 50 concerts',
    category: 'milestone',
    rarity: 'rare',
    icon: 'heart',
    criteria: { type: 'show_count', count: 50 },
    points: 100,
  },
  {
    id: 'shows_100',
    name: 'Centurion',
    description: 'Log 100 concerts',
    category: 'milestone',
    rarity: 'epic',
    icon: 'trophy',
    criteria: { type: 'show_count', count: 100 },
    points: 250,
  },
  {
    id: 'shows_250',
    name: 'Concert Veteran',
    description: 'Log 250 concerts',
    category: 'milestone',
    rarity: 'epic',
    icon: 'medal',
    criteria: { type: 'show_count', count: 250 },
    points: 500,
  },
  {
    id: 'shows_500',
    name: 'Living Legend',
    description: 'Log 500 concerts',
    category: 'milestone',
    rarity: 'legendary',
    icon: 'diamond',
    criteria: { type: 'show_count', count: 500 },
    points: 1000,
  },

  // === STREAKS ===
  {
    id: 'monthly_5',
    name: 'Busy Month',
    description: '5 shows in a single month',
    category: 'streak',
    rarity: 'uncommon',
    icon: 'calendar',
    criteria: { type: 'shows_in_month', count: 5 },
    points: 50,
  },
  {
    id: 'monthly_10',
    name: 'Concert Marathon',
    description: '10 shows in a single month',
    category: 'streak',
    rarity: 'rare',
    icon: 'flame',
    criteria: { type: 'shows_in_month', count: 10 },
    points: 100,
  },
  {
    id: 'consecutive_3',
    name: 'Consistent',
    description: 'Shows 3 months in a row',
    category: 'streak',
    rarity: 'uncommon',
    icon: 'trending-up',
    criteria: { type: 'consecutive_months', count: 3 },
    points: 50,
  },
  {
    id: 'consecutive_6',
    name: 'Dedicated',
    description: 'Shows 6 months in a row',
    category: 'streak',
    rarity: 'rare',
    icon: 'ribbon',
    criteria: { type: 'consecutive_months', count: 6 },
    points: 100,
  },
  {
    id: 'consecutive_12',
    name: 'Year Round',
    description: 'Shows every month for a year',
    category: 'streak',
    rarity: 'legendary',
    icon: 'infinite',
    criteria: { type: 'consecutive_months', count: 12 },
    points: 500,
  },

  // === LOYALTY ===
  {
    id: 'loyalty_3',
    name: 'Fan',
    description: 'See the same artist 3 times',
    category: 'loyalty',
    rarity: 'common',
    icon: 'heart',
    criteria: { type: 'same_artist', count: 3 },
    points: 25,
  },
  {
    id: 'loyalty_5',
    name: 'Superfan',
    description: 'See the same artist 5 times',
    category: 'loyalty',
    rarity: 'uncommon',
    icon: 'heart-circle',
    criteria: { type: 'same_artist', count: 5 },
    points: 50,
  },
  {
    id: 'loyalty_10',
    name: 'Devoted',
    description: 'See the same artist 10 times',
    category: 'loyalty',
    rarity: 'rare',
    icon: 'sparkles',
    criteria: { type: 'same_artist', count: 10 },
    points: 100,
  },
  {
    id: 'loyalty_25',
    name: 'Groupie',
    description: 'See the same artist 25 times',
    category: 'loyalty',
    rarity: 'legendary',
    icon: 'star',
    criteria: { type: 'same_artist', count: 25 },
    points: 500,
  },

  // === EXPLORER ===
  {
    id: 'venues_10',
    name: 'Venue Hunter',
    description: 'Visit 10 different venues',
    category: 'explorer',
    rarity: 'common',
    icon: 'location',
    criteria: { type: 'unique_venues', count: 10 },
    points: 25,
  },
  {
    id: 'venues_25',
    name: 'Venue Explorer',
    description: 'Visit 25 different venues',
    category: 'explorer',
    rarity: 'uncommon',
    icon: 'map',
    criteria: { type: 'unique_venues', count: 25 },
    points: 50,
  },
  {
    id: 'venues_50',
    name: 'Venue Master',
    description: 'Visit 50 different venues',
    category: 'explorer',
    rarity: 'rare',
    icon: 'compass',
    criteria: { type: 'unique_venues', count: 50 },
    points: 100,
  },
  {
    id: 'venues_100',
    name: 'Venue Collector',
    description: 'Visit 100 different venues',
    category: 'explorer',
    rarity: 'legendary',
    icon: 'globe',
    criteria: { type: 'unique_venues', count: 100 },
    points: 500,
  },

  // === TRAVELER ===
  {
    id: 'cities_5',
    name: 'City Hopper',
    description: 'See shows in 5 different cities',
    category: 'traveler',
    rarity: 'common',
    icon: 'business',
    criteria: { type: 'unique_cities', count: 5 },
    points: 25,
  },
  {
    id: 'cities_10',
    name: 'Road Tripper',
    description: 'See shows in 10 different cities',
    category: 'traveler',
    rarity: 'uncommon',
    icon: 'car',
    criteria: { type: 'unique_cities', count: 10 },
    points: 50,
  },
  {
    id: 'states_5',
    name: 'State Explorer',
    description: 'See shows in 5 different states',
    category: 'traveler',
    rarity: 'uncommon',
    icon: 'flag',
    criteria: { type: 'unique_states', count: 5 },
    points: 50,
  },
  {
    id: 'states_10',
    name: 'Coast to Coast',
    description: 'See shows in 10 different states',
    category: 'traveler',
    rarity: 'rare',
    icon: 'airplane',
    criteria: { type: 'unique_states', count: 10 },
    points: 100,
  },
  {
    id: 'countries_3',
    name: 'International',
    description: 'See shows in 3 different countries',
    category: 'traveler',
    rarity: 'rare',
    icon: 'earth',
    criteria: { type: 'unique_countries', count: 3 },
    points: 100,
  },
  {
    id: 'distance_500',
    name: 'Dedicated Fan',
    description: 'Travel 500+ miles for a show',
    category: 'traveler',
    rarity: 'rare',
    icon: 'navigate',
    criteria: { type: 'distance_traveled', miles: 500 },
    points: 100,
  },

  // === GENRE ===
  {
    id: 'genre_rock',
    name: 'Rock Enthusiast',
    description: 'See 10 rock shows',
    category: 'genre',
    rarity: 'uncommon',
    icon: 'hand-left',
    criteria: { type: 'genre_shows', genre: 'rock', count: 10 },
    points: 50,
  },
  {
    id: 'genre_pop',
    name: 'Pop Fan',
    description: 'See 10 pop shows',
    category: 'genre',
    rarity: 'uncommon',
    icon: 'sparkles',
    criteria: { type: 'genre_shows', genre: 'pop', count: 10 },
    points: 50,
  },
  {
    id: 'genre_hiphop',
    name: 'Hip-Hop Head',
    description: 'See 10 hip-hop shows',
    category: 'genre',
    rarity: 'uncommon',
    icon: 'mic',
    criteria: { type: 'genre_shows', genre: 'hip-hop', count: 10 },
    points: 50,
  },
  {
    id: 'genre_electronic',
    name: 'Raver',
    description: 'See 10 electronic/EDM shows',
    category: 'genre',
    rarity: 'uncommon',
    icon: 'pulse',
    criteria: { type: 'genre_shows', genre: 'electronic', count: 10 },
    points: 50,
  },
  {
    id: 'genre_country',
    name: 'Country Roads',
    description: 'See 10 country shows',
    category: 'genre',
    rarity: 'uncommon',
    icon: 'leaf',
    criteria: { type: 'genre_shows', genre: 'country', count: 10 },
    points: 50,
  },

  // === VENUE REGULAR ===
  {
    id: 'venue_regular_5',
    name: 'Regular',
    description: '5 shows at the same venue',
    category: 'venue',
    rarity: 'uncommon',
    icon: 'home',
    criteria: { type: 'same_venue', count: 5 },
    points: 50,
  },
  {
    id: 'venue_regular_10',
    name: 'Home Base',
    description: '10 shows at the same venue',
    category: 'venue',
    rarity: 'rare',
    icon: 'storefront',
    criteria: { type: 'same_venue', count: 10 },
    points: 100,
  },
  {
    id: 'venue_regular_25',
    name: 'VIP Status',
    description: '25 shows at the same venue',
    category: 'venue',
    rarity: 'epic',
    icon: 'shield',
    criteria: { type: 'same_venue', count: 25 },
    points: 250,
  },

  // === SPECIAL ===
  {
    id: 'festival',
    name: 'Festival Goer',
    description: 'Attend your first festival',
    category: 'special',
    rarity: 'uncommon',
    icon: 'bonfire',
    criteria: { type: 'festival' },
    points: 50,
  },
];

export const BADGE_MAP = new Map(BADGES.map((b) => [b.id, b]));

export function getBadgeById(id: string): BadgeDefinition | undefined {
  return BADGE_MAP.get(id);
}

export function getBadgesByCategory(category: BadgeCategory): BadgeDefinition[] {
  return BADGES.filter((b) => b.category === category);
}



