import React from 'react';
import { UserPlus, Check } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface Friend {
  id: number;
  name: string;
  username: string;
  avatar: string;
  mutualFriends?: number;
}

interface FindFriendsOnboardingScreenProps {
  onDone?: () => void;
  onSkip?: () => void;
  onSyncContacts?: () => void;
}

const suggestedFriends: Friend[] = [
  {
    id: 1,
    name: 'Sarah Chen',
    username: '@sarahc',
    avatar: 'https://i.pravatar.cc/150?img=1',
    mutualFriends: 3,
  },
  {
    id: 2,
    name: 'Mike Torres',
    username: '@miket',
    avatar: 'https://i.pravatar.cc/150?img=2',
    mutualFriends: 5,
  },
  {
    id: 3,
    name: 'Emma Davis',
    username: '@emmad',
    avatar: 'https://i.pravatar.cc/150?img=3',
    mutualFriends: 2,
  },
];

export function FindFriendsOnboardingScreen({
  onDone,
  onSkip,
  onSyncContacts,
}: FindFriendsOnboardingScreenProps) {
  const [followedIds, setFollowedIds] = React.useState<Set<number>>(new Set());
  const [contactsSynced, setContactsSynced] = React.useState(false);

  const handleToggleFollow = (friendId: number) => {
    setFollowedIds((prev) => {
      const next = new Set(prev);
      if (next.has(friendId)) {
        next.delete(friendId);
      } else {
        next.add(friendId);
      }
      return next;
    });
  };

  const handleSyncContacts = () => {
    setContactsSynced(true);
    onSyncContacts?.();
  };

  return (
    <div className="w-[390px] h-[844px] bg-[#0A0B1E] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-6 pt-16 pb-8">
        <h1 className="text-white text-[32px] font-bold mb-3">
          Find your friends
        </h1>
        <p className="text-[#A1A1C7] text-[16px]">
          See what shows they're attending
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 overflow-y-auto pb-6">
        {/* Sync Contacts Button */}
        <button
          onClick={handleSyncContacts}
          disabled={contactsSynced}
          className="w-full mb-6 py-4 rounded-xl bg-gradient-to-r from-[#00D4FF] via-[#8B5CF6] to-[#E879F9] text-white font-semibold text-[15px] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#8B5CF6]/30 flex items-center justify-center gap-2"
        >
          {contactsSynced ? (
            <>
              <Check className="w-5 h-5" />
              Contacts Synced
            </>
          ) : (
            <>
              <UserPlus className="w-5 h-5" />
              Sync Contacts
            </>
          )}
        </button>

        {/* Friends Found */}
        {contactsSynced && (
          <>
            <h2 className="text-white text-[18px] font-bold mb-4">
              Friends Found
            </h2>
            <div className="space-y-3">
              {suggestedFriends.map((friend) => {
                const isFollowed = followedIds.has(friend.id);
                return (
                  <div
                    key={friend.id}
                    className="bg-[#12132D] rounded-xl p-4 flex items-center gap-3"
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                      <ImageWithFallback
                        src={friend.avatar}
                        alt={friend.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold text-[15px] mb-0.5">
                        {friend.name}
                      </h3>
                      <p className="text-[#6B6B8D] text-[13px]">
                        {friend.username}
                        {friend.mutualFriends && (
                          <>
                            {' '}
                            • {friend.mutualFriends} mutual{' '}
                            {friend.mutualFriends === 1 ? 'friend' : 'friends'}
                          </>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggleFollow(friend.id)}
                      className={`px-5 py-2 rounded-lg font-semibold text-[13px] transition-all ${
                        isFollowed
                          ? 'bg-[#1A1B3D] border border-[#2A2B4D] text-white'
                          : 'bg-gradient-to-r from-[#00D4FF] via-[#8B5CF6] to-[#E879F9] text-white shadow-lg shadow-[#8B5CF6]/20'
                      }`}
                    >
                      {isFollowed ? 'Following' : 'Follow'}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Empty State */}
        {!contactsSynced && (
          <div className="text-center py-12">
            <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#00D4FF]/10 via-[#8B5CF6]/10 to-[#E879F9]/10 flex items-center justify-center">
              <UserPlus className="w-16 h-16 text-[#6B6B8D]" />
            </div>
            <p className="text-[#A1A1C7] text-[14px] px-8">
              Sync your contacts to find friends who are already on Sticket
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-6 pb-8 space-y-3">
        <button
          onClick={onDone}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-[#00D4FF] via-[#8B5CF6] to-[#E879F9] text-white font-semibold text-[15px] shadow-lg shadow-[#8B5CF6]/30"
        >
          Done
        </button>
        <button
          onClick={onSkip}
          className="w-full py-4 text-[#A1A1C7] font-medium text-[15px]"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
