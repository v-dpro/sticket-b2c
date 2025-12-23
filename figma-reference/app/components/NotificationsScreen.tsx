import React from 'react';
import { Settings, UserPlus, MessageCircle, Music, Ticket, Bell } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface Notification {
  id: number;
  type: 'follow' | 'comment' | 'show' | 'ticket' | 'reminder';
  user?: {
    name: string;
    username: string;
    avatar: string;
  };
  text: string;
  timestamp: string;
  read: boolean;
}

interface NotificationsScreenProps {
  onSettings?: () => void;
  onNotificationClick?: (notification: Notification) => void;
  onMarkAllRead?: () => void;
}

const mockNotifications: Notification[] = [
  {
    id: 1,
    type: 'follow',
    user: {
      name: 'Sarah Chen',
      username: '@sarahc',
      avatar: 'https://i.pravatar.cc/150?img=1',
    },
    text: 'started following you',
    timestamp: '2m ago',
    read: false,
  },
  {
    id: 2,
    type: 'comment',
    user: {
      name: 'Mike Torres',
      username: '@miket',
      avatar: 'https://i.pravatar.cc/150?img=2',
    },
    text: 'commented on your log: "Amazing photos! 🔥"',
    timestamp: '1h ago',
    read: false,
  },
  {
    id: 3,
    type: 'show',
    text: 'The Weeknd just announced a show in Los Angeles on Feb 10',
    timestamp: '3h ago',
    read: true,
  },
  {
    id: 4,
    type: 'ticket',
    text: 'Tickets go on sale tomorrow for Billie Eilish at Madison Square Garden',
    timestamp: '5h ago',
    read: true,
  },
  {
    id: 5,
    type: 'reminder',
    text: 'Your show is in 3 days! The Weeknd at SoFi Stadium',
    timestamp: '1d ago',
    read: true,
  },
  {
    id: 6,
    type: 'show',
    text: 'How was the show last night? Log your experience',
    timestamp: '2d ago',
    read: true,
  },
];

export function NotificationsScreen({
  onSettings,
  onNotificationClick,
  onMarkAllRead,
}: NotificationsScreenProps) {
  const [notifications, setNotifications] = React.useState(mockNotifications);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'follow':
        return UserPlus;
      case 'comment':
        return MessageCircle;
      case 'show':
        return Music;
      case 'ticket':
        return Ticket;
      case 'reminder':
        return Bell;
      default:
        return Bell;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'follow':
        return 'text-[#8B5CF6]';
      case 'comment':
        return 'text-[#00D4FF]';
      case 'show':
        return 'text-[#E879F9]';
      case 'ticket':
        return 'text-[#F59E0B]';
      case 'reminder':
        return 'text-[#22C55E]';
      default:
        return 'text-[#6B6B8D]';
    }
  };

  const handleMarkAllRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
    onMarkAllRead?.();
  };

  return (
    <div className="w-[390px] h-[844px] bg-[#0A0B1E] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-6 pt-12 pb-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-white text-[28px] font-bold">Notifications</h1>
          <button
            onClick={onSettings}
            className="w-10 h-10 rounded-full bg-[#12132D] flex items-center justify-center text-white"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-[#00D4FF] text-[14px] font-medium"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        {notifications.length > 0 ? (
          <div className="divide-y divide-[#2A2B4D]">
            {notifications.map((notification) => {
              const Icon = getIcon(notification.type);
              const iconColor = getIconColor(notification.type);
              
              return (
                <button
                  key={notification.id}
                  onClick={() => onNotificationClick?.(notification)}
                  className={`w-full px-6 py-4 flex gap-3 hover:bg-[#12132D] transition-colors ${
                    !notification.read ? 'bg-[#12132D]/50' : ''
                  }`}
                >
                  {/* Icon or Avatar */}
                  <div className="flex-shrink-0 relative">
                    {notification.user ? (
                      <div className="w-12 h-12 rounded-full overflow-hidden">
                        <ImageWithFallback
                          src={notification.user.avatar}
                          alt={notification.user.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[#1A1B3D] flex items-center justify-center">
                        <Icon className={`w-6 h-6 ${iconColor}`} />
                      </div>
                    )}
                    {!notification.read && (
                      <div className="absolute top-0 right-0 w-3 h-3 rounded-full bg-[#8B5CF6]" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 text-left">
                    {notification.user && (
                      <p className="text-white font-semibold text-[14px] mb-0.5">
                        {notification.user.name}
                      </p>
                    )}
                    <p className="text-[#A1A1C7] text-[14px] mb-1">
                      {notification.text}
                    </p>
                    <p className="text-[#6B6B8D] text-[12px]">
                      {notification.timestamp}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center pt-32">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#00D4FF]/10 via-[#8B5CF6]/10 to-[#E879F9]/10 flex items-center justify-center mb-6">
              <Bell className="w-16 h-16 text-[#6B6B8D]" />
            </div>
            <h2 className="text-white text-[20px] font-bold mb-2">
              All caught up
            </h2>
            <p className="text-[#A1A1C7] text-[14px]">
              No new notifications
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
