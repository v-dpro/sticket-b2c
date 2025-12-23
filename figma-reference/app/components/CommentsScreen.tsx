import React from 'react';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface Comment {
  id: number;
  author: {
    name: string;
    username: string;
    avatar: string;
  };
  text: string;
  timestamp: string;
  isOwn?: boolean;
}

interface CommentsScreenProps {
  logInfo?: {
    artist: string;
    venue: string;
    date: string;
  };
  comments?: Comment[];
  onClose?: () => void;
  onComment?: (text: string) => void;
  onDeleteComment?: (id: number) => void;
}

const defaultComments: Comment[] = [
  {
    id: 1,
    author: {
      name: 'Sarah Chen',
      username: '@sarahc',
      avatar: 'https://i.pravatar.cc/150?img=1',
    },
    text: 'So jealous! I wanted to go to this show so bad 😭',
    timestamp: '2h ago',
  },
  {
    id: 2,
    author: {
      name: 'Mike Torres',
      username: '@miket',
      avatar: 'https://i.pravatar.cc/150?img=2',
    },
    text: 'Amazing photos! That stage setup was insane',
    timestamp: '1h ago',
  },
  {
    id: 3,
    author: {
      name: 'You',
      username: '@you',
      avatar: 'https://i.pravatar.cc/150?img=5',
    },
    text: 'Thanks! It was such an incredible night',
    timestamp: '30m ago',
    isOwn: true,
  },
];

export function CommentsScreen({
  logInfo = { artist: 'The Weeknd', venue: 'SoFi Stadium', date: 'Dec 15, 2024' },
  comments = defaultComments,
  onClose,
  onComment,
  onDeleteComment,
}: CommentsScreenProps) {
  const [commentText, setCommentText] = React.useState('');

  const handleSubmit = () => {
    if (commentText.trim()) {
      onComment?.(commentText);
      setCommentText('');
    }
  };

  return (
    <div className="w-[390px] h-[844px] bg-[#0A0B1E] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-6 pt-12 pb-4 border-b border-[#2A2B4D]">
        <button
          onClick={onClose}
          className="mb-4 flex items-center gap-2 text-[#A1A1C7] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-[14px] font-medium">Back</span>
        </button>
        <div className="flex items-center gap-2 mb-2">
          <MessageCircle className="w-5 h-5 text-[#A1A1C7]" />
          <h1 className="text-white text-[20px] font-bold">
            Comments ({comments.length})
          </h1>
        </div>
        <p className="text-[#6B6B8D] text-[13px]">
          {logInfo.artist} • {logInfo.venue} • {logInfo.date}
        </p>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {comments.length > 0 ? (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                  <ImageWithFallback
                    src={comment.author.avatar}
                    alt={comment.author.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-semibold text-[14px]">
                      {comment.author.name}
                    </span>
                    <span className="text-[#6B6B8D] text-[12px]">
                      {comment.timestamp}
                    </span>
                    {comment.isOwn && (
                      <button
                        onClick={() => onDeleteComment?.(comment.id)}
                        className="text-[#EF4444] text-[12px] ml-auto"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  <p className="text-[#A1A1C7] text-[14px] leading-relaxed">
                    {comment.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center pt-20">
            <MessageCircle className="w-16 h-16 text-[#6B6B8D] mb-4" />
            <h3 className="text-white text-[18px] font-semibold mb-2">
              No comments yet
            </h3>
            <p className="text-[#6B6B8D] text-[14px]">
              Be the first to comment
            </p>
          </div>
        )}
      </div>

      {/* Comment Input */}
      <div className="bg-[#12132D] border-t border-[#2A2B4D] p-4">
        <div className="flex items-end gap-3">
          <div className="w-10 h-10 rounded-full bg-[#8B5CF6] flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-[14px]">Y</span>
          </div>
          <div className="flex-1">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              rows={1}
              className="w-full px-4 py-3 bg-[#1A1B3D] border border-[#2A2B4D] rounded-xl text-white placeholder:text-[#6B6B8D] focus:outline-none focus:border-[#8B5CF6] transition-colors resize-none"
              style={{
                minHeight: '48px',
                maxHeight: '120px',
              }}
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={!commentText.trim()}
            className="px-6 py-3 rounded-full bg-gradient-to-r from-[#00D4FF] via-[#8B5CF6] to-[#E879F9] text-white font-semibold text-[14px] disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
