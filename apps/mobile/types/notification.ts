export type NotificationType =
  | 'follow'
  | 'comment'
  | 'tag'
  | 'was_there'
  | 'artist_show'
  | 'tickets_on_sale'
  | 'show_reminder'
  | 'post_show'
  | 'friend_logged';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;

  // Actor (who triggered it)
  actor?: {
    id: string;
    username: string;
    avatarUrl?: string;
  };

  // Related entities
  data: NotificationData;
}

export type NotificationData =
  | { type: 'follow' }
  | { type: 'comment'; logId: string; eventId: string }
  | { type: 'tag'; logId: string; eventId: string }
  | { type: 'was_there'; logId: string; eventId: string }
  | { type: 'artist_show'; artistId: string; artistName: string; eventId: string }
  | { type: 'tickets_on_sale'; eventId: string; eventName: string }
  | { type: 'show_reminder'; eventId: string; ticketId: string }
  | { type: 'post_show'; eventId: string }
  | { type: 'friend_logged'; logId: string; eventId: string };

export interface NotificationPreferences {
  // Social
  follows: boolean;
  comments: boolean;
  tags: boolean;
  wasThere: boolean;
  friendLogged: boolean;

  // Shows
  artistAnnouncements: boolean;
  ticketsOnSale: boolean;
  showReminders: boolean;
  postShowPrompts: boolean;

  // Delivery
  pushEnabled: boolean;
  emailDigest: 'none' | 'daily' | 'weekly';
}

export interface NotificationGroup {
  date: string; // 'Today', 'Yesterday', 'Dec 15', etc.
  notifications: Notification[];
}



