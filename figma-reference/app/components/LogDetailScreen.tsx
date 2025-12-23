import React from 'react';
import { ArrowLeft, Share2, MoreHorizontal, Star, MapPin, Calendar, MessageCircle } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface LogData {
  id: number;
  artist: string;
  venue: string;
  city: string;
  date: string;
  rating: number;
  photos: string[];
  notes: string;
  section?: string;
  row?: string;
  seat?: string;
  taggedFriends: Array<{
    id: number;
    name: string;
    avatar: string;
  }>;
  comments: Array<{
    id: number;
    author: string;
    avatar: string;
    text: string;
    timestamp: string;
  }>;
}

interface LogDetailScreenProps {
  log?: LogData;
  onBack?: () => void;
  onShare?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onComment?: (text: string) => void;
}

const defaultLog: LogData = {
  id: 1,
  artist: 'The Weeknd',
  venue: 'SoFi Stadium',
  city: 'Los Angeles, CA',
  date: 'December 15, 2024',
  rating: 5,
  photos: [
    'https://images.unsplash.com/photo-1648260029310-5f1da359af9d?w=800',
    'https://images.unsplash.com/photo-1727096857692-e9dadf2bc92e?w=800',
  ],
  notes:
    'Absolutely incredible show! The production was next level - the stage design was massive. He played all my favorites and the crowd energy was amazing. Best concert of the year!',
  section: '102',
  row: 'A',
  seat: '5',
  taggedFriends: [
    { id: 1, name: 'Sarah', avatar: 'https://i.pravatar.cc/150?img=1' },
    { id: 2, name: 'Mike', avatar: 'https://i.pravatar.cc/150?img=2' },
  ],
  comments: [
    {
      id: 1,
      author: 'Sarah Chen',
      avatar: 'https://i.pravatar.cc/150?img=1',
      text: 'So jealous! I wanted to go to this show so bad 😭',
      timestamp: '2h ago',
    },
    {
      id: 2,
      author: 'Mike Torres',
      avatar: 'https://i.pravatar.cc/150?img=2',
      text: 'Amazing photos! That stage setup was insane',
      timestamp: '1h ago',
    },
  ],
};

export function LogDetailScreen({
  log = defaultLog,
  onBack,
  onShare,
  onEdit,
  onDelete,
  onComment,
}: LogDetailScreenProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = React.useState(0);
  const [commentText, setCommentText] = React.useState('');
  const [showMenu, setShowMenu] = React.useState(false);

  const handleSubmitComment = () => {
    if (commentText.trim()) {
      onComment?.(commentText);
      setCommentText('');
    }
  };

  return (
    <div className="w-[390px] h-[844px] bg-[#0A0B1E] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-6 pt-12 pb-4 flex items-center justify-between">
        <button onClick={onBack} className="text-white">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-3">
          <button onClick={onShare} className="text-white">
            <Share2 className="w-5 h-5" />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="text-white"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-8 w-40 bg-[#12132D] border border-[#2A2B4D] rounded-lg shadow-xl overflow-hidden z-10">
                <button
                  onClick={onEdit}
                  className="w-full px-4 py-3 text-left text-white text-[14px] hover:bg-[#1A1B3D]"
                >
                  Edit log
                </button>
                <button
                  onClick={onDelete}
                  className="w-full px-4 py-3 text-left text-[#EF4444] text-[14px] hover:bg-[#1A1B3D]"
                >
                  Delete log
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-24">
        {/* Event Info */}
        <div className="mb-6">
          <h1 className="text-white text-[24px] font-bold mb-2">
            {log.artist}
          </h1>
          <div className="flex items-center gap-2 text-[#A1A1C7] text-[15px] mb-1">
            <MapPin className="w-4 h-4" />
            <span>{log.venue}, {log.city}</span>
          </div>
          <div className="flex items-center gap-2 text-[#6B6B8D] text-[14px]">
            <Calendar className="w-4 h-4" />
            <span>{log.date}</span>
          </div>
        </div>

        {/* Rating */}
        <div className="mb-6 flex items-center gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`w-6 h-6 ${
                i < log.rating
                  ? 'text-[#F59E0B] fill-[#F59E0B]'
                  : 'text-[#2A2B4D]'
              }`}
            />
          ))}
        </div>

        {/* Photos */}
        {log.photos.length > 0 && (
          <div className="mb-6">
            <div className="relative rounded-xl overflow-hidden mb-3">
              <ImageWithFallback
                src={log.photos[currentPhotoIndex]}
                alt={`Concert photo ${currentPhotoIndex + 1}`}
                className="w-full h-80 object-cover"
              />
              {log.photos.length > 1 && (
                <div className="absolute bottom-4 right-4 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-[12px]">
                  {currentPhotoIndex + 1} / {log.photos.length}
                </div>
              )}
            </div>
            {log.photos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {log.photos.map((photo, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentPhotoIndex(index)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden ${
                      index === currentPhotoIndex
                        ? 'ring-2 ring-[#8B5CF6]'
                        : 'opacity-60'
                    }`}
                  >
                    <ImageWithFallback
                      src={photo}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {log.notes && (
          <div className="mb-6">
            <h3 className="text-white font-semibold text-[16px] mb-2">
              Notes
            </h3>
            <p className="text-[#A1A1C7] text-[15px] leading-relaxed">
              {log.notes}
            </p>
          </div>
        )}

        {/* Seat Info */}
        {log.section && (
          <div className="mb-6 p-4 bg-[#12132D] rounded-xl">
            <p className="text-[#6B6B8D] text-[12px] mb-1">Seat</p>
            <p className="text-white font-semibold text-[15px]">
              Section {log.section} • Row {log.row} • Seat {log.seat}
            </p>
          </div>
        )}

        {/* Tagged Friends */}
        {log.taggedFriends.length > 0 && (
          <div className="mb-6">
            <h3 className="text-white font-semibold text-[16px] mb-3">
              With
            </h3>
            <div className="flex gap-3">
              {log.taggedFriends.map((friend) => (
                <div key={friend.id} className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full overflow-hidden mb-1">
                    <ImageWithFallback
                      src={friend.avatar}
                      alt={friend.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-[#A1A1C7] text-[12px]">
                    {friend.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comments */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="w-5 h-5 text-[#A1A1C7]" />
            <h3 className="text-white font-semibold text-[16px]">
              Comments ({log.comments.length})
            </h3>
          </div>
          <div className="space-y-4">
            {log.comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                  <ImageWithFallback
                    src={comment.avatar}
                    alt={comment.author}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-semibold text-[14px]">
                      {comment.author}
                    </span>
                    <span className="text-[#6B6B8D] text-[12px]">
                      {comment.timestamp}
                    </span>
                  </div>
                  <p className="text-[#A1A1C7] text-[14px]">{comment.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Comment Input */}
      <div className="absolute bottom-0 left-0 right-0 bg-[#12132D] border-t border-[#2A2B4D] p-4">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 px-4 py-3 bg-[#1A1B3D] border border-[#2A2B4D] rounded-full text-white placeholder:text-[#6B6B8D] focus:outline-none focus:border-[#8B5CF6] transition-colors"
          />
          <button
            onClick={handleSubmitComment}
            disabled={!commentText.trim()}
            className="px-6 py-3 rounded-full bg-gradient-to-r from-[#00D4FF] via-[#8B5CF6] to-[#E879F9] text-white font-semibold text-[14px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
