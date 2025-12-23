export type ShareCardType = 'log' | 'stats' | 'milestone' | 'event' | 'wrapped';

export interface ShareCardData {
  type: ShareCardType;

  // For log cards
  log?: {
    artistName: string;
    artistImage?: string;
    venueName: string;
    venueCity: string;
    date: string;
    rating?: number;
    photo?: string;
  };

  // For stats cards
  stats?: {
    username: string;
    avatar?: string;
    showCount: number;
    artistCount: number;
    venueCount: number;
    topArtist?: string;
  };

  // For milestone cards
  milestone?: {
    badgeName: string;
    badgeIcon: string;
    badgeColor: string;
    description: string;
    username: string;
  };

  // For event cards
  event?: {
    artistName: string;
    artistImage?: string;
    venueName: string;
    venueCity: string;
    date: string;
    friendsGoing?: number;
  };
}

export interface ShareOptions {
  platform?: 'instagram' | 'twitter' | 'facebook' | 'copy' | 'more';
  includeLink?: boolean;
  message?: string;
}

export interface DeepLink {
  type: 'log' | 'event' | 'artist' | 'venue' | 'user';
  id: string;
  url: string;
}



