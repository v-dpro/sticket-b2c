// Auth Events
export const AUTH_EVENTS = {
  SIGN_UP: 'sign_up',
  LOGIN: 'login',
  LOGOUT: 'logout',
  SPOTIFY_CONNECTED: 'spotify_connected',
  SPOTIFY_DISCONNECTED: 'spotify_disconnected',
} as const;

// Log Events
export const LOG_EVENTS = {
  SHOW_LOGGED: 'show_logged',
  SHOW_DELETED: 'show_deleted',
  PHOTO_UPLOADED: 'photo_uploaded',
  RATING_ADDED: 'rating_added',
} as const;

// Social Events
export const SOCIAL_EVENTS = {
  USER_FOLLOWED: 'user_followed',
  USER_UNFOLLOWED: 'user_unfollowed',
  COMMENT_ADDED: 'comment_added',
  FRIEND_FOUND: 'friend_found',
} as const;

// Discovery Events
export const DISCOVERY_EVENTS = {
  EVENT_VIEWED: 'event_viewed',
  ARTIST_VIEWED: 'artist_viewed',
  VENUE_VIEWED: 'venue_viewed',
  ARTIST_FOLLOWED: 'artist_followed',
  INTERESTED_MARKED: 'interested_marked',
} as const;

// Wallet Events
export const WALLET_EVENTS = {
  TICKET_ADDED: 'ticket_added',
  TICKET_DELETED: 'ticket_deleted',
  CALENDAR_ADDED: 'calendar_added',
} as const;

// Share Events
export const SHARE_EVENTS = {
  LOG_SHARED: 'log_shared',
  STATS_SHARED: 'stats_shared',
  LINK_COPIED: 'link_copied',
} as const;

// Badge Events
export const BADGE_EVENTS = {
  BADGE_EARNED: 'badge_earned',
  BADGES_VIEWED: 'badges_viewed',
} as const;



