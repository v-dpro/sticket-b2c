import React from 'react';
import { ArrowLeft, Bell, BellOff, Star, MapPin, Calendar, Users } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface Show {
  id: number;
  date: string;
  venue: string;
  location: string;
  loggedCount?: number;
  rating?: number;
}

interface ArtistData {
  name: string;
  image: string;
  genres: string[];
  userSeenCount?: number;
  userShows?: Show[];
  isFollowing?: boolean;
  notificationsEnabled?: boolean;
  upcomingShows: Show[];
  pastShows: Show[];
  fanFavorites: Show[];
}

interface ArtistScreenProps {
  artist?: ArtistData;
  onBack?: () => void;
  onToggleFollow?: () => void;
  onToggleNotifications?: () => void;
  onToggleInterested?: (showId: number) => void;
}

const defaultArtist: ArtistData = {
  name: 'The Weeknd',
  image: 'https://images.unsplash.com/photo-1558258021-971dd2148be5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtdXNpYyUyMGFydGlzdCUyMHBvcnRyYWl0JTIwc3RhZ2V8ZW58MXx8fHwxNzY2MTY5NTA3fDA&ixlib=rb-4.1.0&q=80&w=1080',
  genres: ['Pop', 'R&B'],
  userSeenCount: 3,
  userShows: [
    { id: 1, date: 'Dec 15, 2024', venue: 'SoFi Stadium', location: 'Los Angeles, CA' },
    { id: 2, date: 'Aug 20, 2023', venue: 'MetLife Stadium', location: 'East Rutherford, NJ' },
    { id: 3, date: 'Mar 5, 2023', venue: 'TD Garden', location: 'Boston, MA' },
  ],
  isFollowing: false,
  notificationsEnabled: false,
  upcomingShows: [
    { id: 4, date: 'Feb 10, 2025', venue: 'Madison Square Garden', location: 'New York, NY' },
    { id: 5, date: 'Feb 15, 2025', venue: 'United Center', location: 'Chicago, IL' },
    { id: 6, date: 'Mar 1, 2025', venue: 'Crypto.com Arena', location: 'Los Angeles, CA' },
  ],
  pastShows: [
    { id: 7, date: 'Dec 15, 2024', venue: 'SoFi Stadium', location: 'Los Angeles, CA', loggedCount: 1247 },
    { id: 8, date: 'Aug 20, 2023', venue: 'MetLife Stadium', location: 'East Rutherford, NJ', loggedCount: 892 },
    { id: 9, date: 'Mar 5, 2023', venue: 'TD Garden', location: 'Boston, MA', loggedCount: 634 },
  ],
  fanFavorites: [
    { id: 10, date: 'Aug 20, 2023', venue: 'MetLife Stadium', location: 'East Rutherford, NJ', rating: 9.8 },
    { id: 11, date: 'Mar 5, 2023', venue: 'TD Garden', location: 'Boston, MA', rating: 9.5 },
    { id: 12, date: 'Jul 12, 2022', venue: 'Rose Bowl', location: 'Pasadena, CA', rating: 9.7 },
  ],
};

export function ArtistScreen({
  artist = defaultArtist,
  onBack,
  onToggleFollow,
  onToggleNotifications,
  onToggleInterested,
}: ArtistScreenProps) {
  const [interestedShows, setInterestedShows] = React.useState<Set<number>>(new Set());

  const handleToggleInterested = (showId: number) => {
    setInterestedShows((prev) => {
      const next = new Set(prev);
      if (next.has(showId)) {
        next.delete(showId);
      } else {
        next.add(showId);
      }
      return next;
    });
    onToggleInterested?.(showId);
  };

  return (
    <div className="w-[390px] h-[844px] bg-[#0A0B1E] overflow-hidden flex flex-col">
      {/* Header Image */}
      <div className="relative h-[220px] flex-shrink-0">
        <ImageWithFallback
          src={artist.image}
          alt={artist.name}
          className="w-full h-full object-cover"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0A0B1E]/50 to-[#0A0B1E]" />
        
        {/* Back button */}
        <button
          onClick={onBack}
          className="absolute top-12 left-4 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white shadow-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {/* Artist Info */}
        <div className="mb-6">
          <h1 className="text-white text-[28px] font-bold mb-3">
            {artist.name}
          </h1>
          
          {/* Genre Pills */}
          <div className="flex gap-2 mb-4">
            {artist.genres.map((genre) => (
              <span
                key={genre}
                className="px-3 py-1.5 rounded-full bg-[#12132D] text-[#A1A1C7] text-[13px] font-medium"
              >
                {genre}
              </span>
            ))}
          </div>

          {/* Music Service Icons */}
          <div className="flex gap-3 mb-5">
            <button className="w-10 h-10 rounded-full bg-[#12132D] flex items-center justify-center hover:bg-[#1A1B3D] transition-colors">
              <svg className="w-5 h-5 text-[#1DB954]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
            </button>
            <button className="w-10 h-10 rounded-full bg-[#12132D] flex items-center justify-center hover:bg-[#1A1B3D] transition-colors">
              <svg className="w-5 h-5 text-[#FA243C]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.997 6.124a2.999 2.999 0 0 0-2.997-3H3a3 3 0 0 0-3 3v11.75a3 3 0 0 0 3 3h18a2.999 2.999 0 0 0 2.997-3V6.124ZM6.285 8.997a3.242 3.242 0 0 1 3.239 3.238 3.242 3.242 0 0 1-3.24 3.238 3.242 3.242 0 0 1-3.238-3.238 3.242 3.242 0 0 1 3.239-3.238Zm10.498 7.776a4.444 4.444 0 0 1-4.44-4.44 4.444 4.444 0 0 1 4.44-4.439 4.444 4.444 0 0 1 4.439 4.44 4.444 4.444 0 0 1-4.44 4.44Z"/>
              </svg>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onToggleFollow}
              className={`flex-1 py-3 rounded-xl font-semibold text-[14px] transition-all ${
                artist.isFollowing
                  ? 'bg-[#12132D] text-white border border-[#2A2B4D]'
                  : 'bg-gradient-to-r from-[#00D4FF] via-[#8B5CF6] to-[#E879F9] text-white shadow-lg shadow-[#8B5CF6]/30'
              }`}
            >
              {artist.isFollowing ? 'Following' : 'Follow'}
            </button>
            <button
              onClick={onToggleNotifications}
              className="w-12 h-12 rounded-xl bg-[#12132D] flex items-center justify-center text-white border border-[#2A2B4D]"
            >
              {artist.notificationsEnabled ? (
                <Bell className="w-5 h-5 text-[#00D4FF]" />
              ) : (
                <BellOff className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Your History Card */}
        {artist.userSeenCount && artist.userSeenCount > 0 && (
          <div className="relative mb-6 p-[2px] rounded-xl bg-gradient-to-r from-[#00D4FF] via-[#8B5CF6] to-[#E879F9]">
            <div className="bg-[#12132D] rounded-xl p-4">
              <p className="text-[#A1A1C7] text-[14px] mb-1">
                You've seen {artist.name}
              </p>
              <p className="text-[28px] font-bold bg-gradient-to-r from-[#00D4FF] via-[#8B5CF6] to-[#E879F9] bg-clip-text text-transparent mb-3">
                {artist.userSeenCount} {artist.userSeenCount === 1 ? 'time' : 'times'}
              </p>
              {artist.userShows && artist.userShows.length > 0 && (
                <div className="space-y-2">
                  {artist.userShows.map((show) => (
                    <div key={show.id} className="flex items-center gap-2 text-[12px]">
                      <span className="text-[#6B6B8D]">{show.date}</span>
                      <span className="text-[#6B6B8D]">•</span>
                      <span className="text-[#A1A1C7]">{show.venue}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upcoming Shows */}
        <section className="mb-6">
          <h2 className="text-white text-[18px] font-bold mb-3">Upcoming Shows</h2>
          <div className="space-y-3">
            {artist.upcomingShows.map((show) => {
              const isInterested = interestedShows.has(show.id);
              return (
                <div
                  key={show.id}
                  className="bg-[#12132D] rounded-xl p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-4 h-4 text-[#6B6B8D]" />
                        <span className="text-white text-[14px] font-semibold">
                          {show.date}
                        </span>
                      </div>
                      <h3 className="text-white font-bold text-[15px] mb-1">
                        {show.venue}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[#6B6B8D] text-[13px]">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{show.location}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleInterested(show.id)}
                    className={`w-full py-2.5 rounded-lg font-semibold text-[13px] transition-all ${
                      isInterested
                        ? 'bg-gradient-to-r from-[#00D4FF] via-[#8B5CF6] to-[#E879F9] text-white shadow-lg shadow-[#8B5CF6]/20'
                        : 'border border-[#2A2B4D] text-[#A1A1C7]'
                    }`}
                  >
                    {isInterested ? 'Interested' : 'Interested?'}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Past Shows */}
        <section className="mb-6">
          <h2 className="text-white text-[18px] font-bold mb-3">Past Shows</h2>
          <div className="space-y-2">
            {artist.pastShows.map((show) => (
              <button
                key={show.id}
                className="w-full bg-[#12132D] rounded-lg px-4 py-3 flex items-center justify-between hover:bg-[#1A1B3D] transition-colors"
              >
                <div className="text-left">
                  <p className="text-white text-[14px] font-semibold mb-0.5">
                    {show.venue}
                  </p>
                  <p className="text-[#6B6B8D] text-[12px]">
                    {show.date}
                  </p>
                </div>
                {show.loggedCount && (
                  <div className="flex items-center gap-1.5 text-[#6B6B8D] text-[12px]">
                    <Users className="w-3.5 h-3.5" />
                    <span>{show.loggedCount.toLocaleString()} logged</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Fan Favorites */}
        <section>
          <h2 className="text-white text-[18px] font-bold mb-3">Fan Favorites</h2>
          <div className="space-y-2">
            {artist.fanFavorites.map((show) => (
              <button
                key={show.id}
                className="w-full bg-[#12132D] rounded-lg px-4 py-3 flex items-center justify-between hover:bg-[#1A1B3D] transition-colors"
              >
                <div className="text-left flex-1">
                  <p className="text-white text-[14px] font-semibold mb-0.5">
                    {show.venue}
                  </p>
                  <p className="text-[#6B6B8D] text-[12px]">
                    {show.date} • {show.location}
                  </p>
                </div>
                {show.rating && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#E879F9]">
                    <span className="text-white text-[13px] font-bold">
                      {show.rating}
                    </span>
                    <Star className="w-3.5 h-3.5 text-white fill-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
