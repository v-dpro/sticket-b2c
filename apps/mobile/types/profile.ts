export interface UserProfile {
  id: string;
  username: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  city?: string;
  privacySetting: 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
  createdAt: string;
  isFollowing?: boolean;
  isOwnProfile?: boolean;
  stats: ProfileStats;
  badges: UserBadge[];
}

export interface ProfileStats {
  shows: number;
  artists: number;
  venues: number;
  followers: number;
  following: number;
}

export interface UserBadge {
  id: string;
  name: string;
  description: string;
  iconUrl?: string;
  earnedAt: string;
}

export interface LogEntry {
  id: string;
  rating?: number;
  note?: string;
  section?: string;
  row?: string;
  seat?: string;
  visibility: 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
  createdAt: string;
  event: {
    id: string;
    name: string;
    date: string;
    artist: {
      id: string;
      name: string;
      imageUrl?: string;
    };
    venue: {
      id: string;
      name: string;
      city: string;
      state?: string;
      lat?: number;
      lng?: number;
    };
  };
  photos: {
    id: string;
    photoUrl: string;
    thumbnailUrl?: string;
  }[];
  _count?: {
    comments: number;
  };
}

export interface VenueMarker {
  id: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  showCount: number;
  lastShow?: {
    artistName: string;
    date: string;
  };
}




