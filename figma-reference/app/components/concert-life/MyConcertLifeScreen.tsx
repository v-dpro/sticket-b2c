import React from 'react';
import { Ticket, Bell, MapPin, Star, Heart, MessageCircle, Share2 } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface MyConcertLifeScreenProps {
  onTicketClick?: () => void;
  onNotificationClick?: () => void;
  onCardClick?: (eventId: number) => void;
}

interface TimelineEvent {
  id: number;
  type: 'past' | 'upcoming';
  artist: string;
  tour?: string;
  venue: string;
  city: string;
  date: string;
  dateObj: Date;
  photo?: string;
  rating?: number;
  note?: string;
  attendees?: { name: string; avatar: string }[];
  likes: number;
  comments: number;
  isLiked?: boolean;
}

export function MyConcertLifeScreen({
  onTicketClick,
  onNotificationClick,
  onCardClick,
}: MyConcertLifeScreenProps) {
  const [events, setEvents] = React.useState<TimelineEvent[]>([
    {
      id: 1,
      type: 'upcoming',
      artist: 'Billie Eilish',
      tour: 'Hit Me Hard and Soft Tour',
      venue: 'Madison Square Garden',
      city: 'New York, NY',
      date: 'Feb 14, 2025',
      dateObj: new Date('2025-02-14'),
      photo: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
      likes: 0,
      comments: 0,
    },
    {
      id: 2,
      type: 'upcoming',
      artist: 'The Weeknd',
      venue: 'SoFi Stadium',
      city: 'Los Angeles, CA',
      date: 'Jan 20, 2025',
      dateObj: new Date('2025-01-20'),
      photo: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800',
      likes: 0,
      comments: 0,
    },
    {
      id: 3,
      type: 'past',
      artist: 'Taylor Swift',
      tour: 'The Eras Tour',
      venue: 'SoFi Stadium',
      city: 'Los Angeles, CA',
      date: 'Dec 15, 2024',
      dateObj: new Date('2024-12-15'),
      photo: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800',
      rating: 5,
      note: 'Cried during All Too Well. Worth it.',
      attendees: [
        { name: 'Sarah', avatar: 'https://i.pravatar.cc/150?img=1' },
        { name: 'Mike', avatar: 'https://i.pravatar.cc/150?img=2' },
        { name: 'Emma', avatar: 'https://i.pravatar.cc/150?img=3' },
      ],
      likes: 47,
      comments: 12,
      isLiked: true,
    },
    {
      id: 4,
      type: 'past',
      artist: 'Arctic Monkeys',
      venue: 'Madison Square Garden',
      city: 'New York, NY',
      date: 'Nov 28, 2024',
      dateObj: new Date('2024-11-28'),
      photo: 'https://images.unsplash.com/photo-1511735111819-9a3f7709049c?w=400',
      rating: 4,
      likes: 23,
      comments: 5,
      isLiked: false,
    },
    {
      id: 5,
      type: 'past',
      artist: 'Bad Bunny',
      tour: 'Most Wanted Tour',
      venue: 'Barclays Center',
      city: 'Brooklyn, NY',
      date: 'Oct 15, 2024',
      dateObj: new Date('2024-10-15'),
      photo: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=800',
      rating: 5,
      note: 'Absolutely incredible energy!',
      likes: 34,
      comments: 8,
      isLiked: true,
    },
  ]);

  const handleLike = (eventId: number) => {
    setEvents((prev) =>
      prev.map((event) =>
        event.id === eventId
          ? {
              ...event,
              isLiked: !event.isLiked,
              likes: event.isLiked ? event.likes - 1 : event.likes + 1,
            }
          : event
      )
    );
  };

  // Group events by month
  const groupedEvents = events.reduce((acc, event) => {
    const monthYear = event.dateObj.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
    if (!acc[monthYear]) {
      acc[monthYear] = [];
    }
    acc[monthYear].push(event);
    return acc;
  }, {} as Record<string, TimelineEvent[]>);

  return (
    <div className="w-[390px] h-[844px] bg-[#0A0B1E] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-6 pt-12 pb-4 flex items-center justify-between">
        <h1 className="text-white text-[24px] font-black">My Concert Life</h1>
        <div className="flex gap-3">
          <button
            onClick={onTicketClick}
            className="w-10 h-10 rounded-full bg-[#1A1A2E] flex items-center justify-center"
          >
            <Ticket className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={onNotificationClick}
            className="w-10 h-10 rounded-full bg-[#1A1A2E] flex items-center justify-center"
          >
            <Bell className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="mx-6 mb-4 p-4 bg-[#1A1A2E] border border-[#2D2D4A] rounded-2xl">
        <div className="grid grid-cols-3 divide-x divide-[#2D2D4A]">
          <div className="text-center">
            <p className="text-white text-[24px] font-black mb-1">47</p>
            <p className="text-[#A0A0B8] text-[12px] font-bold">Shows</p>
          </div>
          <div className="text-center">
            <p className="text-white text-[24px] font-black mb-1">3</p>
            <p className="text-[#A0A0B8] text-[12px] font-bold">Upcoming</p>
          </div>
          <div className="text-center">
            <p className="text-white text-[24px] font-black mb-1">18</p>
            <p className="text-[#A0A0B8] text-[12px] font-bold">Artists</p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#00D4FF] via-[#8B5CF6] to-[#E879F9]" />

          {/* Events */}
          <div className="space-y-6">
            {Object.entries(groupedEvents).map(([monthYear, monthEvents]) => (
              <div key={monthYear} className="space-y-6">
                {/* Month Header */}
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#8B5CF6] border-2 border-[#0A0B1E] relative z-10" />
                  <div className="flex-1 h-px bg-[#2D2D4A]" />
                  <span className="text-[#00D4FF] text-[13px] font-bold">
                    {monthYear}
                  </span>
                  <div className="flex-1 h-px bg-[#2D2D4A]" />
                </div>

                {/* Events in this month */}
                {monthEvents.map((event, index) => (
                  <div key={event.id} className="flex gap-4">
                    {/* Timeline Dot */}
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div
                        className={`w-3 h-3 rounded-full border-2 border-[#0A0B1E] relative z-10 ${
                          event.type === 'upcoming'
                            ? 'bg-[#00D4FF]'
                            : 'bg-[#8B5CF6]'
                        }`}
                      />
                    </div>

                    {/* Event Card */}
                    <div className="flex-1 pb-4">
                      <TimelineCard
                        event={event}
                        onLike={() => handleLike(event.id)}
                        onClick={() => onCardClick && onCardClick(event.id)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Navigation Spacer */}
      <div className="h-20" />
    </div>
  );
}

interface TimelineCardProps {
  event: TimelineEvent;
  onLike: () => void;
  onClick: () => void;
}

function TimelineCard({ event, onLike, onClick }: TimelineCardProps) {
  return (
    <div className="rounded-2xl overflow-hidden bg-[#1A1A2E] border border-[#2D2D4A]">
      {/* Photo */}
      {event.photo && (
        <button onClick={onClick} className="w-full">
          <div className="relative h-64">
            <ImageWithFallback
              src={event.photo}
              alt={event.artist}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            
            {/* Artist Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h3 className="text-white text-[20px] font-bold mb-1">
                {event.artist}
              </h3>
              {event.tour && (
                <p className="text-white/80 text-[14px] mb-2">{event.tour}</p>
              )}
              <div className="flex items-center gap-2 text-white/70 text-[13px]">
                <MapPin className="w-3.5 h-3.5" />
                <span>{event.venue}, {event.city}</span>
              </div>
            </div>

            {/* Date Badge */}
            <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20">
              <span className="text-white text-[12px] font-bold">
                {event.dateObj.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>

            {/* Upcoming Badge */}
            {event.type === 'upcoming' && (
              <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-[#00D4FF]/90 backdrop-blur-md">
                <span className="text-white text-[11px] font-bold">UPCOMING</span>
              </div>
            )}
          </div>
        </button>
      )}

      {/* Card Footer */}
      <div className="p-4">
        {/* Rating */}
        {event.rating && (
          <div className="flex gap-1 mb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${
                  i < event.rating!
                    ? 'text-[#FFD700] fill-[#FFD700]'
                    : 'text-[#3D3D5C]'
                }`}
              />
            ))}
          </div>
        )}

        {/* Note */}
        {event.note && (
          <p className="text-white text-[14px] mb-3 italic">"{event.note}"</p>
        )}

        {/* Attendees */}
        {event.attendees && event.attendees.length > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <div className="flex -space-x-2">
              {event.attendees.slice(0, 3).map((attendee, i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-full border-2 border-[#1A1A2E] overflow-hidden"
                >
                  <ImageWithFallback
                    src={attendee.avatar}
                    alt={attendee.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
            <span className="text-[#6B6B8D] text-[12px]">
              {event.attendees.length === 1
                ? `with ${event.attendees[0].name}`
                : event.attendees.length === 2
                ? `with ${event.attendees[0].name} and ${event.attendees[1].name}`
                : `with ${event.attendees[0].name} and ${event.attendees.length - 1} others`}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 pt-3 border-t border-[#2D2D4A]">
          {/* Like */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLike();
            }}
            className="flex items-center gap-2 group"
          >
            <Heart
              className={`w-5 h-5 transition-colors ${
                event.isLiked
                  ? 'text-[#EC4899] fill-[#EC4899]'
                  : 'text-[#6B6B8D] group-hover:text-[#EC4899]'
              }`}
            />
            <span
              className={`text-[13px] font-semibold ${
                event.isLiked ? 'text-[#EC4899]' : 'text-[#6B6B8D]'
              }`}
            >
              {event.likes > 0 ? event.likes : ''}
            </span>
          </button>

          {/* Comment */}
          <button
            onClick={onClick}
            className="flex items-center gap-2 group"
          >
            <MessageCircle className="w-5 h-5 text-[#6B6B8D] group-hover:text-[#00D4FF]" />
            <span className="text-[#6B6B8D] text-[13px] font-semibold">
              {event.comments > 0 ? event.comments : ''}
            </span>
          </button>

          {/* Share */}
          <button className="flex items-center gap-2 ml-auto group">
            <Share2 className="w-5 h-5 text-[#6B6B8D] group-hover:text-[#8B5CF6]" />
          </button>
        </div>
      </div>
    </div>
  );
}