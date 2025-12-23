import React from 'react';
import { SlidersHorizontal, MessageCircle, Star, Home, Search, Ticket, User, UserPlus } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface FeedPost {
  id: number;
  user: {
    name: string;
    avatar: string;
  };
  timeAgo: string;
  artist: string;
  venue: string;
  photo?: string;
  rating?: number;
  commentCount: number;
  userWasThereToo?: boolean;
}

interface FeedScreenProps {
  hasPosts?: boolean;
  filter?: 'following' | 'everyone';
  onFilterToggle?: () => void;
  onNavigate?: (screen: 'home' | 'search' | 'wallet' | 'profile') => void;
  onFindFriends?: () => void;
}

const feedPosts: FeedPost[] = [
  {
    id: 1,
    user: {
      name: 'Sarah Chen',
      avatar: 'https://i.pravatar.cc/150?img=1',
    },
    timeAgo: '2h',
    artist: 'The Weeknd',
    venue: 'SoFi Stadium',
    photo: 'https://images.unsplash.com/photo-1648260029310-5f1da359af9d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25jZXJ0JTIwY3Jvd2QlMjBsaWdodHN8ZW58MXx8fHwxNzY2MTY2MzU4fDA&ixlib=rb-4.1.0&q=80&w=1080',
    rating: 9.5,
    commentCount: 12,
    userWasThereToo: true,
  },
  {
    id: 2,
    user: {
      name: 'Mike Torres',
      avatar: 'https://i.pravatar.cc/150?img=2',
    },
    timeAgo: '5h',
    artist: 'Billie Eilish',
    venue: 'Madison Square Garden',
    photo: 'https://images.unsplash.com/photo-1727096857692-e9dadf2bc92e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtdXNpYyUyMGZlc3RpdmFsJTIwc3RhZ2V8ZW58MXx8fHwxNzY2MTE5MDI2fDA&ixlib=rb-4.1.0&q=80&w=1080',
    rating: 10,
    commentCount: 24,
    userWasThereToo: false,
  },
  {
    id: 3,
    user: {
      name: 'Emma Davis',
      avatar: 'https://i.pravatar.cc/150?img=3',
    },
    timeAgo: '1d',
    artist: 'Taylor Swift',
    venue: 'MetLife Stadium',
    commentCount: 8,
    userWasThereToo: false,
  },
  {
    id: 4,
    user: {
      name: 'Josh Kim',
      avatar: 'https://i.pravatar.cc/150?img=4',
    },
    timeAgo: '2d',
    artist: 'Bad Bunny',
    venue: 'Crypto.com Arena',
    photo: 'https://images.unsplash.com/photo-1565035010268-a3816f98589a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25jZXJ0JTIwZmFuJTIwY3Jvd2R8ZW58MXx8fHwxNzY2MTY5NDA2fDA&ixlib=rb-4.1.0&q=80&w=1080',
    rating: 8.5,
    commentCount: 15,
    userWasThereToo: true,
  },
];

export function FeedScreen({
  hasPosts = true,
  filter = 'following',
  onFilterToggle,
  onNavigate,
  onFindFriends,
}: FeedScreenProps) {
  const [refreshing, setRefreshing] = React.useState(false);
  const [startY, setStartY] = React.useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY;
    
    // If scrolled to top and pulling down
    const scrollContainer = e.currentTarget;
    if (scrollContainer.scrollTop === 0 && diff > 0) {
      if (diff > 80 && !refreshing) {
        setRefreshing(true);
        // Simulate refresh
        setTimeout(() => {
          setRefreshing(false);
        }, 1500);
      }
    }
  };

  return (
    <div className="w-[390px] h-[844px] bg-[#0A0B1E] overflow-hidden flex flex-col">
      {/* Header */}
      <header className="px-6 pt-12 pb-6 flex items-center justify-between">
        <h1 className="text-white text-[28px] font-bold">Feed</h1>
        <button
          onClick={onFilterToggle}
          className="w-10 h-10 rounded-full bg-[#12132D] flex items-center justify-center text-white hover:bg-[#1A1B3D] transition-colors"
        >
          <SlidersHorizontal className="w-5 h-5" />
        </button>
      </header>

      {/* Content */}
      <div
        className="flex-1 overflow-y-auto px-6 pb-24"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        {/* Pull to refresh indicator */}
        {refreshing && (
          <div className="flex justify-center py-4">
            <div className="w-8 h-8 rounded-full border-2 border-transparent border-t-[#00D4FF] border-r-[#8B5CF6] animate-spin" />
          </div>
        )}

        {hasPosts ? (
          <div className="space-y-3">
            {feedPosts.map((post) => (
              <article
                key={post.id}
                className="bg-[#12132D] rounded-xl p-4"
              >
                {/* User Header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                    <ImageWithFallback
                      src={post.user.avatar}
                      alt={post.user.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-bold text-[14px]">
                      {post.user.name}
                    </h3>
                  </div>
                  <span className="text-[#6B6B8D] text-[12px]">
                    {post.timeAgo}
                  </span>
                </div>

                {/* Content */}
                <p className="text-[14px] mb-3">
                  <span className="text-[#A1A1C7]">saw </span>
                  <span className="text-white font-semibold">{post.artist}</span>
                  <span className="text-[#A1A1C7]"> at {post.venue}</span>
                </p>

                {/* Photo */}
                {post.photo && (
                  <div className="mb-3 rounded-lg overflow-hidden">
                    <ImageWithFallback
                      src={post.photo}
                      alt={`${post.artist} concert`}
                      className="w-full h-[200px] object-cover"
                    />
                  </div>
                )}

                {/* Rating */}
                {post.rating && (
                  <div className="mb-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#E879F9] text-white text-[12px] font-medium">
                      Rated {post.rating}
                      <Star className="w-3.5 h-3.5 fill-white" />
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-[#2A2B4D]">
                  <button className="flex items-center gap-2 text-[#6B6B8D] text-[13px]">
                    <MessageCircle className="w-4 h-4" />
                    <span>{post.commentCount}</span>
                  </button>
                  {post.userWasThereToo && (
                    <button className="text-[#00D4FF] text-[13px] font-medium">
                      I was there too
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center pt-20">
            {/* Illustration */}
            <div className="mb-8 relative">
              <div className="w-40 h-40 rounded-full bg-gradient-to-br from-[#00D4FF]/10 via-[#8B5CF6]/10 to-[#E879F9]/10 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#00D4FF]/20 via-[#8B5CF6]/20 to-[#E879F9]/20 flex items-center justify-center">
                  <UserPlus className="w-16 h-16 text-[#6B6B8D]" />
                </div>
              </div>
            </div>

            <h2 className="text-white text-[20px] font-bold mb-2">
              Your feed is empty
            </h2>
            <p className="text-[#A1A1C7] text-[14px] mb-8 text-center px-8">
              Follow friends to see their concerts
            </p>
            <button
              onClick={onFindFriends}
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-[#00D4FF] via-[#8B5CF6] to-[#E879F9] text-white font-semibold text-[15px] shadow-lg shadow-[#8B5CF6]/30"
            >
              Find Friends
            </button>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="absolute bottom-0 left-0 right-0 bg-[#12132D] border-t border-[#2A2B4D] px-6 py-4">
        <div className="flex items-center justify-around">
          <button
            onClick={() => onNavigate?.('home')}
            className="flex flex-col items-center gap-1 text-[#00D4FF]"
          >
            <Home className="w-6 h-6" />
            <span className="text-[10px]">Home</span>
          </button>
          <button
            onClick={() => onNavigate?.('search')}
            className="flex flex-col items-center gap-1 text-[#6B6B8D]"
          >
            <Search className="w-6 h-6" />
            <span className="text-[10px]">Search</span>
          </button>
          <button
            onClick={() => onNavigate?.('wallet')}
            className="flex flex-col items-center gap-1 text-[#6B6B8D]"
          >
            <Ticket className="w-6 h-6" />
            <span className="text-[10px]">Wallet</span>
          </button>
          <button
            onClick={() => onNavigate?.('profile')}
            className="flex flex-col items-center gap-1 text-[#6B6B8D]"
          >
            <User className="w-6 h-6" />
            <span className="text-[10px]">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
