export interface Artist {
  id: string;
  name: string;
  spotifyId?: string;
  imageUrl?: string;
  genres?: string[];
}

export interface Venue {
  id: string;
  name: string;
  city: string;
  state?: string;
  country: string;
  lat?: number;
  lng?: number;
}

export interface FriendPreview {
  id: string;
  username: string;
  avatarUrl?: string;
}

export interface Event {
  id: string;
  name: string;
  date: string; // ISO date
  imageUrl?: string;
  artist: Artist;
  venue: Venue;
  // Computed/joined fields
  isInterested?: boolean;
  friendsGoing?: FriendPreview[];
  friendsGoingCount?: number;
  totalInterested?: number;
}

export interface DiscoveryData {
  comingUp: Event[];
  friendsGoing: Event[];
  popular: Event[];
}

// -----------------------------
// Event detail (Event Page)
// -----------------------------

export interface EventDetails {
  id: string;
  name: string;
  date: string;
  imageUrl?: string;
  ticketUrl?: string;

  artist: {
    id: string;
    name: string;
    imageUrl?: string;
    genres?: string[];
  };

  venue: {
    id: string;
    name: string;
    city: string;
    state?: string;
    country: string;
    lat?: number;
    lng?: number;
  };

  // Stats
  logCount: number;
  avgRating?: number;
  interestedCount: number;

  // User state
  userLog?: UserEventLog | null;
  isInterested: boolean;

  // Friends
  friendsWhoWent: FriendAttendee[];
  friendsInterested: FriendAttendee[];

  // Content
  setlist?: SetlistSong[];
  moments?: EventMoment[];
}

export interface UserEventLog {
  id: string;
  rating?: number;
  note?: string;
  section?: string;
  row?: string;
  seat?: string;
  photos: {
    id: string;
    photoUrl: string;
    thumbnailUrl?: string;
  }[];
}

export interface FriendAttendee {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  rating?: number;
}

export interface SetlistSong {
  id: string;
  position: number;
  songName: string;
  isEncore: boolean;
  info?: string;
  spotifyUrl?: string;
}

export interface EventMoment {
  id: string;
  type: 'proposal' | 'guest' | 'debut' | 'cover' | 'acoustic' | 'custom';
  label: string;
  count: number;
}

export interface EventPhoto {
  id: string;
  photoUrl: string;
  thumbnailUrl?: string;
  user: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  section?: string;
  createdAt: string;
}

export interface EventComment {
  id: string;
  text: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
  };
}




