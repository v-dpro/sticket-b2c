import * as Linking from 'expo-linking';

import type { DeepLink } from '../../types/share';

const APP_SCHEME = 'sticket';
const WEB_URL = 'https://sticket.in';

export function createDeepLink(type: string, id: string): DeepLink {
  const path = `/${type}/${id}`;

  return {
    type: type as any,
    id,
    url: `${WEB_URL}${path}`,
  };
}

export function createLogLink(logId: string): string {
  return `${WEB_URL}/log/${logId}`;
}

export function createEventLink(eventId: string): string {
  return `${WEB_URL}/event/${eventId}`;
}

export function createArtistLink(artistId: string): string {
  return `${WEB_URL}/artist/${artistId}`;
}

export function createVenueLink(venueId: string): string {
  return `${WEB_URL}/venue/${venueId}`;
}

export function createUserLink(userIdOrUsername: string): string {
  // Matches the web “@username” convention.
  return `${WEB_URL}/@${userIdOrUsername}`;
}

export function createAppLink(path: string): string {
  const cleaned = path.startsWith('/') ? path.slice(1) : path;
  return `${APP_SCHEME}://${cleaned}`;
}

export function parseDeepLink(url: string): DeepLink | null {
  try {
    const parsed = Linking.parse(url);
    const pathParts = parsed.path?.split('/').filter(Boolean) || [];

    if (pathParts.length >= 2) {
      return {
        type: pathParts[0] as any,
        id: pathParts[1],
        url,
      };
    }

    // Handle @username format
    if (pathParts.length === 1 && pathParts[0].startsWith('@')) {
      return {
        type: 'user',
        id: pathParts[0].slice(1),
        url,
      };
    }

    return null;
  } catch {
    return null;
  }
}

// Handle incoming deep links
export function setupDeepLinkHandler(navigate: (path: string) => void) {
  // Handle links when app is already open
  const subscription = Linking.addEventListener('url', ({ url }) => {
    const link = parseDeepLink(url);
    if (link) {
      navigateToDeepLink(link, navigate);
    }
  });

  // Handle links that opened the app
  // Use a small delay to ensure the app is fully initialized
  Linking.getInitialURL().then((url) => {
    if (url) {
      // Small delay to ensure navigation stack is ready
      setTimeout(() => {
        const link = parseDeepLink(url);
        if (link) {
          navigateToDeepLink(link, navigate);
        }
      }, 100);
    }
  });

  return () => subscription.remove();
}

function navigateToDeepLink(link: DeepLink, navigate: (path: string) => void) {
  switch (link.type) {
    case 'log':
      navigate(`/log/${link.id}`);
      break;
    case 'event':
      navigate(`/event/${link.id}`);
      break;
    case 'artist':
      navigate(`/artist/${link.id}`);
      break;
    case 'venue':
      navigate(`/venue/${link.id}`);
      break;
    case 'user':
      // In the app, profiles are `/profile/[id]`.
      navigate(`/profile/${link.id}`);
      break;
  }
}



