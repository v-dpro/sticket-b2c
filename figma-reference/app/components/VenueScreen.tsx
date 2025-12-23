import React from 'react';
import { ArrowLeft, Share2, MapPin, Star, Calendar, Users, Plus } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface VenueData {
  name: string;
  city: string;
  state: string;
  capacity: number;
  image: string;
  userVisitCount?: number;
  userRatings?: {
    sound: number;
    sightlines: number;
    drinks: number;
    staff: number;
  };
  upcomingShows: Array<{
    id: number;
    artist: string;
    date: string;
    image: string;
  }>;
  tips: Array<{
    id: number;
    author: string;
    text: string;
    helpful: number;
  }>;
}

interface VenueScreenProps {
  venue?: VenueData;
  onBack?: () => void;
  onShare?: () => void;
}

const defaultVenue: VenueData = {
  name: 'SoFi Stadium',
  city: 'Inglewood',
  state: 'CA',
  capacity: 70000,
  image: 'https://images.unsplash.com/photo-1722570014465-9cdf5839778f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080',
  userVisitCount: 5,
  userRatings: {
    sound: 4,
    sightlines: 5,
    drinks: 3,
    staff: 4,
  },
  upcomingShows: [
    {
      id: 1,
      artist: 'The Weeknd',
      date: 'Feb 10, 2025',
      image: 'https://i.pravatar.cc/150?img=11',
    },
    {
      id: 2,
      artist: 'Taylor Swift',
      date: 'Mar 5, 2025',
      image: 'https://i.pravatar.cc/150?img=12',
    },
  ],
  tips: [
    {
      id: 1,
      author: 'Sarah C.',
      text: 'Arrive early! Security lines can be long. The parking lot opens 3 hours before showtime.',
      helpful: 24,
    },
    {
      id: 2,
      author: 'Mike T.',
      text: 'Section 227 has amazing views of the stage. Totally worth the extra cost.',
      helpful: 18,
    },
  ],
};

export function VenueScreen({
  venue = defaultVenue,
  onBack,
  onShare,
}: VenueScreenProps) {
  const [showAllTips, setShowAllTips] = React.useState(false);

  const renderStars = (count: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < count
            ? 'text-[#F59E0B] fill-[#F59E0B]'
            : 'text-[#2A2B4D] fill-[#2A2B4D]'
        }`}
      />
    ));
  };

  return (
    <div className="w-[390px] h-[844px] bg-[#0A0B1E] overflow-hidden flex flex-col">
      {/* Header Image */}
      <div className="relative h-[220px] flex-shrink-0">
        <ImageWithFallback
          src={venue.image}
          alt={venue.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0A0B1E]/50 to-[#0A0B1E]" />
        
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {/* Venue Info */}
        <div className="mb-6">
          <h1 className="text-white text-[28px] font-bold mb-2">
            {venue.name}
          </h1>
          <div className="flex items-center gap-2 text-[#A1A1C7] text-[16px] mb-1">
            <MapPin className="w-5 h-5" />
            <span>{venue.city}, {venue.state}</span>
          </div>
          <p className="text-[#6B6B8D] text-[14px]">
            Capacity: {venue.capacity.toLocaleString()}
          </p>
        </div>

        {/* Map Widget */}
        <button className="w-full h-32 mb-6 rounded-xl overflow-hidden bg-[#12132D] border border-[#2A2B4D]">
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <MapPin className="w-8 h-8 text-[#8B5CF6] mx-auto mb-2" />
              <p className="text-[#A1A1C7] text-[14px]">Tap to view map</p>
            </div>
          </div>
        </button>

        {/* Your History */}
        {venue.userVisitCount && venue.userVisitCount > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-[#12132D] border-l-4 border-[#8B5CF6]">
            <p className="text-white font-bold text-[18px] mb-4">
              You've been here {venue.userVisitCount}{' '}
              {venue.userVisitCount === 1 ? 'time' : 'times'}
            </p>

            {/* Quick Ratings */}
            {venue.userRatings && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[#A1A1C7] text-[14px]">Sound</span>
                  <div className="flex gap-1">{renderStars(venue.userRatings.sound)}</div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#A1A1C7] text-[14px]">Sightlines</span>
                  <div className="flex gap-1">{renderStars(venue.userRatings.sightlines)}</div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#A1A1C7] text-[14px]">Drinks</span>
                  <div className="flex gap-1">{renderStars(venue.userRatings.drinks)}</div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#A1A1C7] text-[14px]">Staff</span>
                  <div className="flex gap-1">{renderStars(venue.userRatings.staff)}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upcoming Shows */}
        <section className="mb-6">
          <h2 className="text-white text-[18px] font-bold mb-3">
            Upcoming Shows
          </h2>
          <div className="space-y-3">
            {venue.upcomingShows.map((show) => (
              <div
                key={show.id}
                className="bg-[#12132D] rounded-xl p-4 flex items-center gap-3"
              >
                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                  <ImageWithFallback
                    src={show.image}
                    alt={show.artist}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-bold text-[15px] mb-1">
                    {show.artist}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[#6B6B8D] text-[13px]">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{show.date}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Tips */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white text-[18px] font-bold">Tips</h2>
            <button className="text-[#00D4FF] text-[13px] font-medium flex items-center gap-1">
              <Plus className="w-4 h-4" />
              Add Tip
            </button>
          </div>
          <div className="space-y-3">
            {venue.tips.slice(0, showAllTips ? undefined : 2).map((tip) => (
              <div
                key={tip.id}
                className="bg-[#12132D] rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-semibold text-[14px]">
                    {tip.author}
                  </span>
                  <div className="flex items-center gap-1 text-[#6B6B8D] text-[12px]">
                    <Users className="w-3.5 h-3.5" />
                    <span>{tip.helpful} helpful</span>
                  </div>
                </div>
                <p className="text-[#A1A1C7] text-[14px]">{tip.text}</p>
              </div>
            ))}
            {venue.tips.length > 2 && !showAllTips && (
              <button
                onClick={() => setShowAllTips(true)}
                className="text-[#00D4FF] text-[14px] font-medium"
              >
                Show all {venue.tips.length} tips
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
