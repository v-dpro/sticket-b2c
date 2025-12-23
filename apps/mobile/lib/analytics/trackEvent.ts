import { track } from './index';

// Auth
export const trackSignUp = (method: 'email' | 'apple' | 'google') => {
  track('sign_up', { method });
};

export const trackLogin = (method: 'email' | 'apple' | 'google') => {
  track('login', { method });
};

export const trackLogout = () => {
  track('logout');
};

// Logs
export const trackShowLogged = (artistId: string, venueId: string, hasPhoto: boolean) => {
  track('show_logged', { artistId, venueId, hasPhoto });
};

// Social
export const trackUserFollowed = (followedUserId: string) => {
  track('user_followed', { followedUserId });
};

// Discovery
export const trackEventViewed = (eventId: string, source: string) => {
  track('event_viewed', { eventId, source });
};

// Wallet
export const trackTicketAdded = (source: 'manual' | 'email' | 'scan') => {
  track('ticket_added', { source });
};

// Share
export const trackShare = (type: 'log' | 'stats' | 'event', platform: string) => {
  track('share', { type, platform });
};

// Badges
export const trackBadgeEarned = (badgeId: string, badgeName: string) => {
  track('badge_earned', { badgeId, badgeName });
};



