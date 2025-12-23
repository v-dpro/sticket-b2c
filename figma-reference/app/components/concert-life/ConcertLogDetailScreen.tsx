import React from 'react';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Star,
  Heart,
  MessageCircle,
  Share2,
  ChevronRight,
  Music,
  Users,
} from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface ConcertLogDetailScreenProps {
  onBack?: () => void;
  onCommentClick?: () => void;
}

export function ConcertLogDetailScreen({
  onBack,
  onCommentClick,
}: ConcertLogDetailScreenProps) {
  const [isLiked, setIsLiked] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<'photos' | 'setlist' | 'friends'>(
    'photos'
  );

  const log = {
    artist: 'Taylor Swift',
    tour: 'The Eras Tour',
    venue: 'SoFi Stadium',
    city: 'Los Angeles, CA',
    date: 'Dec 15, 2024',
    rating: 5,
    note: 'Cried during All Too Well. Worth it. This was the most incredible concert experience of my life!',
    likes: 47,
    comments: 12,
    photos: [
      'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800',
      'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800',
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
      'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=800',
    ],
    attendees: [
      { name: 'Sarah Mitchell', avatar: 'https://i.pravatar.cc/150?img=1' },
      { name: 'Mike Johnson', avatar: 'https://i.pravatar.cc/150?img=2' },
      { name: 'Emma Davis', avatar: 'https://i.pravatar.cc/150?img=3' },
    ],
    setlist: [
      'Miss Americana & the Heartbreak Prince',
      'Cruel Summer',
      'The Man',
      'You Need to Calm Down',
      'Lover',
      'Fearless',
      'You Belong With Me',
      'Love Story',
      'All Too Well (10 Minute Version)',
      'Shake It Off',
      'Wildest Dreams',
      'Anti-Hero',
    ],
  };

  const recentComments = [
    {
      id: 1,
      user: 'Alex Thompson',
      avatar: 'https://i.pravatar.cc/150?img=5',
      comment: 'This looks amazing! So jealous!',
      time: '2h ago',
    },
    {
      id: 2,
      user: 'Jordan Lee',
      avatar: 'https://i.pravatar.cc/150?img=6',
      comment: 'All Too Well 10 min version live?? 😭',
      time: '5h ago',
    },
    {
      id: 3,
      user: 'Casey Morgan',
      avatar: 'https://i.pravatar.cc/150?img=7',
      comment: 'Best show of the year hands down',
      time: '1d ago',
    },
  ];

  return (
    <div className="w-[390px] h-[844px] bg-[#0A0B1E] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 px-6 pt-12 pb-4 bg-gradient-to-b from-black/80 to-transparent">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Hero Photo */}
        <div className="relative h-[400px]">
          <ImageWithFallback
            src={log.photos[0]}
            alt={log.artist}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0B1E] via-transparent to-transparent" />
        </div>

        {/* Content Section */}
        <div className="px-6 -mt-20 relative z-10">
          {/* Artist & Tour */}
          <h1 className="text-white text-[28px] font-black mb-2">{log.artist}</h1>
          {log.tour && (
            <p className="text-[#A0A0B8] text-[17px] font-bold mb-4">
              {log.tour}
            </p>
          )}

          {/* Venue & Date */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-[#A0A0B8]">
              <MapPin className="w-4 h-4" />
              <span className="text-[15px]">
                {log.venue}, {log.city}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[#A0A0B8]">
              <Calendar className="w-4 h-4" />
              <span className="text-[15px]">{log.date}</span>
            </div>
          </div>

          {/* You Attended Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 mb-4">
            <div className="w-2 h-2 rounded-full bg-[#8B5CF6]" />
            <span className="text-[#8B5CF6] text-[13px] font-bold">
              You attended this show
            </span>
          </div>

          {/* Rating */}
          <div className="flex gap-1 mb-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`w-6 h-6 ${
                  i < log.rating
                    ? 'text-[#FFD700] fill-[#FFD700]'
                    : 'text-[#3D3D5C]'
                }`}
              />
            ))}
          </div>

          {/* Note */}
          <p className="text-white text-[15px] leading-relaxed mb-4">
            {log.note}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-6 py-4 border-y border-[#2D2D4A] mb-6">
            <button
              onClick={() => setIsLiked(!isLiked)}
              className="flex items-center gap-2"
            >
              <Heart
                className={`w-6 h-6 ${
                  isLiked
                    ? 'text-[#EC4899] fill-[#EC4899]'
                    : 'text-[#6B6B8D]'
                }`}
              />
              <span
                className={`text-[15px] font-semibold ${
                  isLiked ? 'text-[#EC4899]' : 'text-[#6B6B8D]'
                }`}
              >
                {log.likes}
              </span>
            </button>

            <button onClick={onCommentClick} className="flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-[#6B6B8D]" />
              <span className="text-[#6B6B8D] text-[15px] font-semibold">
                {log.comments}
              </span>
            </button>

            <button className="flex items-center gap-2 ml-auto">
              <Share2 className="w-6 h-6 text-[#6B6B8D]" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab('photos')}
              className={`flex-1 py-2 rounded-lg font-bold text-[14px] transition-colors ${
                activeTab === 'photos'
                  ? 'bg-[#8B5CF6] text-white'
                  : 'bg-[#1A1A2E] text-[#6B6B8D]'
              }`}
            >
              Photos ({log.photos.length})
            </button>
            <button
              onClick={() => setActiveTab('setlist')}
              className={`flex-1 py-2 rounded-lg font-bold text-[14px] transition-colors ${
                activeTab === 'setlist'
                  ? 'bg-[#8B5CF6] text-white'
                  : 'bg-[#1A1A2E] text-[#6B6B8D]'
              }`}
            >
              Setlist
            </button>
            <button
              onClick={() => setActiveTab('friends')}
              className={`flex-1 py-2 rounded-lg font-bold text-[14px] transition-colors ${
                activeTab === 'friends'
                  ? 'bg-[#8B5CF6] text-white'
                  : 'bg-[#1A1A2E] text-[#6B6B8D]'
              }`}
            >
              Friends
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'photos' && (
            <div className="grid grid-cols-2 gap-3 mb-6">
              {log.photos.map((photo, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-xl overflow-hidden"
                >
                  <ImageWithFallback
                    src={photo}
                    alt={`Photo ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}

          {activeTab === 'setlist' && (
            <div className="space-y-2 mb-6">
              {log.setlist.map((song, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-xl bg-[#1A1A2E] border border-[#2D2D4A]"
                >
                  <div className="w-8 h-8 rounded-full bg-[#8B5CF6]/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-[#8B5CF6] text-[12px] font-bold">
                      {i + 1}
                    </span>
                  </div>
                  <span className="text-white text-[14px] flex-1">{song}</span>
                  <Music className="w-4 h-4 text-[#6B6B8D]" />
                </div>
              ))}
            </div>
          )}

          {activeTab === 'friends' && (
            <div className="space-y-3 mb-6">
              {log.attendees.map((attendee, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-xl bg-[#1A1A2E] border border-[#2D2D4D]"
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden">
                    <ImageWithFallback
                      src={attendee.avatar}
                      alt={attendee.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-white text-[15px] font-semibold flex-1">
                    {attendee.name}
                  </span>
                  <ChevronRight className="w-5 h-5 text-[#6B6B8D]" />
                </div>
              ))}
            </div>
          )}

          {/* Comments Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white text-[17px] font-bold">Comments</h3>
              <button
                onClick={onCommentClick}
                className="text-[#00D4FF] text-[13px] font-semibold"
              >
                View all {log.comments}
              </button>
            </div>
            <div className="space-y-3">
              {recentComments.slice(0, 2).map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                    <ImageWithFallback
                      src={comment.avatar}
                      alt={comment.user}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-[14px]">
                      <span className="font-semibold">{comment.user}</span>{' '}
                      {comment.comment}
                    </p>
                    <span className="text-[#6B6B8D] text-[12px]">
                      {comment.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation Spacer */}
      <div className="h-20" />
    </div>
  );
}
