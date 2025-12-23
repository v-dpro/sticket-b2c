export interface UserSearchResult {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  isFollowing: boolean;
  isFollowingYou: boolean;
  mutualFriends: number;
  showCount: number;
}

export interface ContactMatch {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  isFollowing: boolean;
  contactName: string; // Name from phone contacts
  showCount: number;
}

export interface FriendSuggestion {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  isFollowing: boolean;
  reason: SuggestionReason;
  mutualFriends?: number;
  mutualShows?: number;
  mutualArtists?: string[];
}

export type SuggestionReason =
  | { type: 'mutual_friends'; count: number; names: string[] }
  | { type: 'same_show'; eventName: string; date: string }
  | { type: 'same_artist'; artistName: string; count: number }
  | { type: 'popular'; followerCount: number };

export interface QRCodeData {
  type: 'sticket_user';
  userId: string;
  username: string;
}




