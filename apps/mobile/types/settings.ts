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

// ── Discovery dials (additive) ───────────────────────────────────
// Backed by GET /auth/me (hydration) + PATCH /users/me/discovery (writes).

export type DiscoveryRadius = 'OFF' | 'FRIENDS' | 'FOF' | 'EVERYONE';

export interface DiscoverySettings {
  /** Who can see you were logged into the same show. */
  sameShowRadius: DiscoveryRadius;
  /** Who your taste-based suggestions reach. */
  tasteRadius: DiscoveryRadius;
  /** Whether your public memories show up in event galleries. */
  showInGalleries: boolean;
}



