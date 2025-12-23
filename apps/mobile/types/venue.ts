export interface VenueDetails {
  id: string;
  name: string;
  imageUrl?: string;
  address?: string;
  city: string;
  state?: string;
  country: string;
  lat?: number;
  lng?: number;
  capacity?: number;

  // Stats
  totalShows: number;
  totalLogs: number;

  // User state
  userShowCount: number;
  userFirstShow?: UserVenueShow;
  userLastShow?: UserVenueShow;

  // Ratings
  ratings: VenueRatingsSummary;
  userRatings?: VenueRatingsSubmission;

  // Friends
  friendsWhoVisited: FriendVisited[];
}

export interface UserVenueShow {
  eventId: string;
  date: string;
  artistName: string;
}

export interface FriendVisited {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  showCount: number;
}

export interface VenueRatingsSummary {
  sound: number | null;
  sightlines: number | null;
  drinks: number | null;
  staff: number | null;
  access: number | null;
  totalRatings: number;
}

export interface VenueRatingsSubmission {
  sound?: number;
  sightlines?: number;
  drinks?: number;
  staff?: number;
  access?: number;
}

export interface VenueTip {
  id: string;
  text: string;
  category: 'parking' | 'food' | 'seating' | 'entry' | 'general';
  upvotes: number;
  userUpvoted: boolean;
  user: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  createdAt: string;
}

export interface SeatView {
  id: string;
  section: string;
  row?: string;
  photoUrl: string;
  thumbnailUrl?: string;
  user: {
    id: string;
    username: string;
  };
  eventName?: string;
  createdAt: string;
}

export interface VenueShow {
  id: string;
  name: string;
  date: string;
  artist: {
    id: string;
    name: string;
    imageUrl?: string;
  };
  ticketUrl?: string;
  logCount: number;
  userLogged: boolean;
}



