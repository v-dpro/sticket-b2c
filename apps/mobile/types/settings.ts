export type VisibilityOption = 'public' | 'friends' | 'private';

export interface UserSettings {
  // Privacy
  profileVisibility: VisibilityOption;
  activityVisibility: VisibilityOption;
  showInSuggestions: boolean;
  allowTagging: boolean;

  // Preferences
  homeCity?: string;
  distanceUnit: 'miles' | 'km';

  // Connected Services
  spotifyConnected: boolean;
  spotifyUsername?: string;
  appleMusicConnected: boolean;
}

export interface PrivacySettings {
  profileVisibility: VisibilityOption;
  activityVisibility: VisibilityOption;
  showInSuggestions: boolean;
  allowTagging: boolean;
}

export interface ConnectedService {
  id: string;
  name: string;
  connected: boolean;
  username?: string;
  connectedAt?: string;
  icon: string;
}



