export type SearchResultType = 'artist' | 'venue' | 'event' | 'user';

export type SearchTab = 'all' | 'artists' | 'venues' | 'events' | 'users';

export interface SearchResult {
  type: SearchResultType;
  id: string;
  // Common fields
  name: string;
  imageUrl?: string;
  // Type-specific fields included in data
  data: ArtistResult | VenueResult | EventResult | UserResult;
}

export interface ArtistResult {
  id: string;
  name: string;
  imageUrl?: string;
  genres?: string[];
  followerCount?: number;
  upcomingEventCount?: number;
}

export interface VenueResult {
  id: string;
  name: string;
  city: string;
  state?: string;
  imageUrl?: string;
  upcomingEventCount?: number;
}

export interface EventResult {
  id: string;
  name: string;
  date: string;
  imageUrl?: string;
  artist: {
    id: string;
    name: string;
  };
  venue: {
    id: string;
    name: string;
    city: string;
  };
  isUpcoming: boolean;
}

export interface UserResult {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  showCount: number;
  isFollowing: boolean;
}

export interface SearchResults {
  artists: ArtistResult[];
  venues: VenueResult[];
  events: EventResult[];
  users: UserResult[];
  totalCount: number;
}

export interface RecentSearch {
  query: string;
  timestamp: number;
  resultType?: SearchResultType; // If they tapped a specific result
  resultId?: string;
  resultName?: string;
}

export interface TrendingData {
  artists: ArtistResult[];
  searches: string[];
}



