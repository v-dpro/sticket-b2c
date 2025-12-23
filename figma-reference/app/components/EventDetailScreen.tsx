import React from 'react';
import { ArrowLeft, Share2, Users, Star, Check } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface Friend {
  id: number;
  name: string;
  avatar: string;
  isCurrentUser?: boolean;
}

interface EventData {
  id: number;
  artist: string;
  venue: string;
  date: string;
  headerImage: string;
  attendeeCount: number;
  rating: number;
  userAttended?: boolean;
  friends: Friend[];
  photos: string[];
}

interface EventDetailScreenProps {
  event?: EventData;
  onBack?: () => void;
  onShare?: () => void;
  onToggleAttendance?: () => void;
}

const defaultEvent: EventData = {
  id: 1,
  artist: 'The Weeknd',
  venue: 'SoFi Stadium',
  date: 'Friday, December 15, 2024',
  headerImage: 'https://images.unsplash.com/photo-1611939341783-a44f2cbd3bbd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25jZXJ0JTIwc3RhZ2UlMjBsaWdodHMlMjBwdXJwbGV8ZW58MXx8fHwxNzY2MTY5MjA2fDA&ixlib=rb-4.1.0&q=80&w=1080',
  attendeeCount: 847,
  rating: 8.7,
  userAttended: false,
  friends: [
    { id: 1, name: 'Sarah', avatar: 'https://i.pravatar.cc/150?img=1' },
    { id: 2, name: 'Mike', avatar: 'https://i.pravatar.cc/150?img=2' },
    { id: 3, name: 'Emma', avatar: 'https://i.pravatar.cc/150?img=3' },
    { id: 4, name: 'Josh', avatar: 'https://i.pravatar.cc/150?img=4' },
    { id: 5, name: 'Lisa', avatar: 'https://i.pravatar.cc/150?img=5' },
  ],
  photos: [
    'https://images.unsplash.com/photo-1756995100296-0255798b0548?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjcm93ZCUyMGNvbmNlcnQlMjBwaG9uZXN8ZW58MXx8fHwxNzY2MTY5MjA2fDA&ixlib=rb-4.1.0&q=80&w=400',
    'https://images.unsplash.com/photo-1761959159004-1c94b22e3f1b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25jZXJ0JTIwYXVkaWVuY2UlMjBlbmVyZ3l8ZW58MXx8fHwxNzY2MTY5MjA3fDA&ixlib=rb-4.1.0&q=80&w=400',
    'https://images.unsplash.com/photo-1722570014465-9cdf5839778f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmZXN0aXZhbCUyMHN0YWdlJTIwbmlnaHR8ZW58MXx8fHwxNzY2MTUyODQxfDA&ixlib=rb-4.1.0&q=80&w=400',
    'https://images.unsplash.com/photo-1561264819-1ccc1c6e0ae9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsaXZlJTIwbXVzaWMlMjBwZXJmb3JtYW5jZXxlbnwxfHx8fDE3NjYxNTQ4MTZ8MA&ixlib=rb-4.1.0&q=80&w=400',
    'https://images.unsplash.com/photo-1765279129523-28d5b40f1454?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25jZXJ0JTIwbGlnaHRpbmclMjBlZmZlY3RzfGVufDF8fHx8MTc2NjE2OTIwOHww&ixlib=rb-4.1.0&q=80&w=400',
    'https://images.unsplash.com/photo-1611939341783-a44f2cbd3bbd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25jZXJ0JTIwc3RhZ2UlMjBsaWdodHMlMjBwdXJwbGV8ZW58MXx8fHwxNzY2MTY5MjA2fDA&ixlib=rb-4.1.0&q=80&w=400',
  ],
};

export function EventDetailScreen({
  event = defaultEvent,
  onBack,
  onShare,
  onToggleAttendance,
}: EventDetailScreenProps) {
  const [activeTab, setActiveTab] = React.useState<'photos' | 'setlist' | 'moments'>('photos');

  return (
    <div className="w-[390px] h-[844px] bg-[#0A0B1E] overflow-hidden flex flex-col">
      {/* Header Image */}
      <div className="relative h-[240px] flex-shrink-0">
        <ImageWithFallback
          src={event.headerImage}
          alt={event.artist}
          className="w-full h-full object-cover"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0A0B1E]/50 to-[#0A0B1E]" />
        
        {/* Navigation buttons */}
        <button
          onClick={onBack}
          className="absolute top-12 left-4 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white shadow-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button
          onClick={onShare}
          className="absolute top-12 right-4 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white shadow-lg"
        >
          <Share2 className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Event Info Section */}
        <div className="px-6 pb-4">
          <h1 className="text-white text-[26px] font-bold mb-2">
            {event.artist}
          </h1>
          <p className="text-[#A1A1C7] text-[16px] mb-1">
            {event.venue}
          </p>
          <p className="text-[#6B6B8D] text-[14px] mb-4">
            {event.date}
          </p>

          {/* Stats Pills */}
          <div className="flex gap-2 mb-6">
            <div className="px-3 py-2 rounded-full bg-[#12132D] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#A1A1C7]" />
              <span className="text-[#A1A1C7] text-[13px] font-medium">
                {event.attendeeCount} there
              </span>
            </div>
            <div className="px-3 py-2 rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#E879F9] flex items-center gap-1.5">
              <span className="text-white text-[13px] font-medium">
                {event.rating}
              </span>
              <Star className="w-4 h-4 text-white fill-white" />
            </div>
          </div>

          {/* Friends Section */}
          <div className="mb-6">
            <h3 className="text-[#A1A1C7] text-[14px] font-medium mb-3">
              Friends who went
            </h3>
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-6 px-6">
              {event.friends.map((friend) => (
                <div key={friend.id} className="flex flex-col items-center flex-shrink-0">
                  <div className={`mb-2 ${friend.isCurrentUser ? 'p-[2px] bg-gradient-to-br from-[#00D4FF] via-[#8B5CF6] to-[#E879F9] rounded-full' : ''}`}>
                    <div className={`${friend.isCurrentUser ? 'p-[2px] bg-[#0A0B1E] rounded-full' : ''}`}>
                      <div className="w-14 h-14 rounded-full overflow-hidden">
                        <ImageWithFallback
                          src={friend.avatar}
                          alt={friend.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  </div>
                  <span className="text-[#A1A1C7] text-[12px]">
                    {friend.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={onToggleAttendance}
            className={`w-full py-4 rounded-xl font-semibold text-[15px] transition-all ${
              event.userAttended
                ? 'bg-[#12132D] text-white border border-[#2A2B4D]'
                : 'bg-gradient-to-r from-[#00D4FF] via-[#8B5CF6] to-[#E879F9] text-white shadow-lg shadow-[#8B5CF6]/30'
            }`}
          >
            {event.userAttended ? (
              <span className="flex items-center justify-center gap-2">
                <span className="text-[#00D4FF]">You were there</span>
                <Check className="w-5 h-5 text-[#00D4FF]" />
              </span>
            ) : (
              'I was there'
            )}
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 mb-4 border-b border-[#2A2B4D]">
          <div className="flex gap-6">
            {['photos', 'setlist', 'moments'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as typeof activeTab)}
                className={`pb-3 relative ${
                  activeTab === tab
                    ? 'text-[#00D4FF]'
                    : 'text-[#6B6B8D]'
                } font-medium text-[15px] capitalize`}
              >
                {tab}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#00D4FF]" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="px-6 pb-6">
          {activeTab === 'photos' && (
            <div className="grid grid-cols-3 gap-2">
              {event.photos.map((photo, index) => (
                <button
                  key={index}
                  className="aspect-square rounded-lg overflow-hidden bg-[#12132D]"
                >
                  <ImageWithFallback
                    src={photo}
                    alt={`Concert photo ${index + 1}`}
                    className="w-full h-full object-cover hover:scale-110 transition-transform"
                  />
                </button>
              ))}
            </div>
          )}
          
          {activeTab === 'setlist' && (
            <div className="bg-[#12132D] rounded-xl p-4">
              <p className="text-[#A1A1C7] text-[14px] text-center">
                Setlist coming soon
              </p>
            </div>
          )}
          
          {activeTab === 'moments' && (
            <div className="bg-[#12132D] rounded-xl p-4">
              <p className="text-[#A1A1C7] text-[14px] text-center">
                No moments shared yet
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
