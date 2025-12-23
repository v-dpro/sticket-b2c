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

export interface Badge {
  id: string;
  name: string;
  description: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  icon: string;
  criteria: BadgeCriteria;
  points: number;
}

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

export interface UserBadge {
  id: string;
  badge: Badge;
  earnedAt: string;
  eventId?: string;
}

export interface BadgeProgress {
  badge: Badge;
  current: number;
  target: number;
  percentage: number;
  isEarned: boolean;
}

export interface BadgeCheckResult {
  newBadges: Badge[];
  progress: BadgeProgress[];
}



