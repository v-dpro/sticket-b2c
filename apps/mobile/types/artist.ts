export type { Artist } from './event';

export interface ArtistDetails {
  id: string;
  name: string;
  imageUrl?: string;
  bannerUrl?: string;
  genres: string[];
  bio?: string;

  // External IDs
  spotifyId?: string;
  spotifyUrl?: string;
  appleMusicUrl?: string;

  // Stats
  followerCount: number;
  totalLogs: number;
  avgRating?: number;

  // User state
  isFollowing: boolean;
  userShowCount: number;
  userFirstShow?: UserShowSummary;
  userLastShow?: UserShowSummary;

  // Social
  friendsWhoSaw: FriendSaw[];
}

export interface UserShowSummary {
  eventId: string;
  date: string;
  venueName: string;
  venueCity: string;
}

export interface FriendSaw {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  showCount: number;
  lastShow?: {
    date: string;
    venueName: string;
  };
}

export interface ArtistShow {
  id: string;
  name: string;
  date: string;
  venue: {
    id: string;
    name: string;
    city: string;
    state?: string;
  };
  ticketUrl?: string;
  isInterested: boolean;
  userLogged: boolean;
  logCount: number;
  friendsGoing: number;
}




