import React from 'react';
import { Plus, Bell, Check } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { StatusPill } from '../shared/StatusPill';
import { CodeDisplay } from '../shared/CodeDisplay';
import { SignupWarning } from '../shared/SignupWarning';
import { Calendar, MapPin } from 'lucide-react';

interface MyArtistsScreenProps {
  onAddArtist?: () => void;
  onNotificationClick?: () => void;
}

interface Artist {
  id: number;
  name: string;
  image: string;
  seenCount: number;
  tier: 'top' | 'following' | 'casual';
  genre: string;
  presale?: {
    type: string;
    date: string;
    venue: string;
    code?: string;
    deadline?: string;
  };
}

export function MyArtistsScreen({
  onAddArtist,
  onNotificationClick,
}: MyArtistsScreenProps) {
  const [activeFilter, setActiveFilter] = React.useState<'seen' | 'unseen' | 'presale'>('seen');

  const artists: Artist[] = [
    {
      id: 1,
      name: 'Taylor Swift',
      image: 'https://i.pravatar.cc/150?img=10',
      seenCount: 12,
      tier: 'top',
      genre: 'Pop',
      presale: {
        type: 'Verified Fan',
        date: 'Jan 15 at 10:00 AM',
        venue: 'SoFi Stadium',
        code: 'SWIFTIE2025',
        deadline: 'Jan 10',
      },
    },
    {
      id: 2,
      name: 'The Weeknd',
      image: 'https://i.pravatar.cc/150?img=11',
      seenCount: 8,
      tier: 'top',
      genre: 'R&B',
    },
    {
      id: 3,
      name: 'Billie Eilish',
      image: 'https://i.pravatar.cc/150?img=12',
      seenCount: 3,
      tier: 'following',
      genre: 'Alternative',
      presale: {
        type: 'Presale',
        date: 'Feb 1 at 12:00 PM',
        venue: 'Madison Square Garden',
      },
    },
    {
      id: 4,
      name: 'Arctic Monkeys',
      image: 'https://i.pravatar.cc/150?img=13',
      seenCount: 2,
      tier: 'following',
      genre: 'Rock',
    },
    {
      id: 5,
      name: 'SZA',
      image: 'https://i.pravatar.cc/150?img=14',
      seenCount: 1,
      tier: 'following',
      genre: 'R&B',
    },
    {
      id: 6,
      name: 'Bad Bunny',
      image: 'https://i.pravatar.cc/150?img=15',
      seenCount: 1,
      tier: 'casual',
      genre: 'Reggaeton',
    },
    {
      id: 7,
      name: 'Beyoncé',
      image: 'https://i.pravatar.cc/150?img=16',
      seenCount: 0,
      tier: 'casual',
      genre: 'Pop',
    },
    {
      id: 8,
      name: 'Drake',
      image: 'https://i.pravatar.cc/150?img=17',
      seenCount: 0,
      tier: 'casual',
      genre: 'Hip Hop',
    },
    {
      id: 9,
      name: 'Harry Styles',
      image: 'https://i.pravatar.cc/150?img=18',
      seenCount: 5,
      tier: 'following',
      genre: 'Pop',
    },
    {
      id: 10,
      name: 'Olivia Rodrigo',
      image: 'https://i.pravatar.cc/150?img=19',
      seenCount: 4,
      tier: 'following',
      genre: 'Pop',
    },
    {
      id: 11,
      name: 'Post Malone',
      image: 'https://i.pravatar.cc/150?img=20',
      seenCount: 0,
      tier: 'casual',
      genre: 'Hip Hop',
    },
    {
      id: 12,
      name: 'Dua Lipa',
      image: 'https://i.pravatar.cc/150?img=21',
      seenCount: 2,
      tier: 'following',
      genre: 'Pop',
    },
  ];

  const filteredArtists = artists.filter((artist) => {
    if (activeFilter === 'seen') return artist.seenCount > 0;
    if (activeFilter === 'unseen') return artist.seenCount === 0;
    if (activeFilter === 'presale') return artist.presale !== undefined;
    return true;
  });

  return (
    <div className="w-[390px] h-[844px] bg-[#0A0B1E] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-6 pt-12 pb-4 flex items-center justify-between">
        <h1 className="text-white text-[24px] font-black">My Artists</h1>
        <div className="flex gap-3">
          <button
            onClick={onAddArtist}
            className="w-10 h-10 rounded-full bg-[#1A1A2E] flex items-center justify-center"
          >
            <Plus className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={onNotificationClick}
            className="w-10 h-10 rounded-full bg-[#1A1A2E] flex items-center justify-center"
          >
            <Bell className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mx-6 mb-4 p-4 bg-[#1A1A2E] border border-[#2D2D4A] rounded-2xl">
        <div className="grid grid-cols-3 divide-x divide-[#2D2D4A]">
          <div className="text-center">
            <p className="text-white text-[24px] font-black mb-1">{artists.length}</p>
            <p className="text-[#A0A0B8] text-[12px] font-bold">Following</p>
          </div>
          <div className="text-center">
            <p className="text-white text-[24px] font-black mb-1">
              {artists.filter((a) => a.seenCount > 0).length}
            </p>
            <p className="text-[#A0A0B8] text-[12px] font-bold">Seen</p>
          </div>
          <div className="text-center">
            <p className="text-white text-[24px] font-black mb-1">
              {artists.filter((a) => a.presale).length}
            </p>
            <p className="text-[#A0A0B8] text-[12px] font-bold">Presales</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mx-6 mb-4">
        <div className="grid grid-cols-3 gap-2 p-1 bg-[#1A1A2E] rounded-xl">
          <button
            onClick={() => setActiveFilter('seen')}
            className={`py-2 rounded-lg text-[13px] font-bold transition-colors ${
              activeFilter === 'seen'
                ? 'bg-[#252542] text-white'
                : 'text-[#6B6B8D]'
            }`}
          >
            Seen
          </button>
          <button
            onClick={() => setActiveFilter('unseen')}
            className={`py-2 rounded-lg text-[13px] font-bold transition-colors ${
              activeFilter === 'unseen'
                ? 'bg-[#252542] text-white'
                : 'text-[#6B6B8D]'
            }`}
          >
            Bucket List
          </button>
          <button
            onClick={() => setActiveFilter('presale')}
            className={`py-2 rounded-lg text-[13px] font-bold transition-colors ${
              activeFilter === 'presale'
                ? 'bg-[#252542] text-white'
                : 'text-[#6B6B8D]'
            }`}
          >
            Presale
          </button>
        </div>
      </div>

      {/* Artist Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {activeFilter === 'presale' ? (
          <div className="space-y-4">
            {filteredArtists.map((artist) => (
              <PresaleArtistCard key={artist.id} artist={artist} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {filteredArtists.map((artist) => (
              <ArtistCircleCard key={artist.id} artist={artist} />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation Spacer */}
      <div className="h-20" />
    </div>
  );
}

function ArtistCircleCard({ artist }: { artist: Artist }) {
  return (
    <button className="flex flex-col items-center group">
      {/* Artist Image */}
      <div className="relative mb-2">
        <div
          className={`w-24 h-24 rounded-full overflow-hidden border-2 transition-all ${
            artist.tier === 'top'
              ? 'border-[#FFD700]'
              : artist.seenCount > 0
              ? 'border-[#8B5CF6]'
              : 'border-[#2D2D4A]'
          } group-hover:scale-105`}
        >
          <ImageWithFallback
            src={artist.image}
            alt={artist.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Top Tier Badge */}
        {artist.tier === 'top' && (
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#FFD700] border-2 border-[#0A0B1E] flex items-center justify-center">
            <span className="text-[12px]">⭐</span>
          </div>
        )}

        {/* Seen Badge */}
        {artist.seenCount > 0 && artist.tier !== 'top' && (
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#8B5CF6] border-2 border-[#0A0B1E] flex items-center justify-center">
            <Check className="w-3.5 h-3.5 text-white" />
          </div>
        )}
      </div>

      {/* Artist Name */}
      <span className="text-white text-[12px] font-semibold text-center line-clamp-2 leading-tight mb-1 px-1">
        {artist.name}
      </span>

      {/* Seen Count */}
      {artist.seenCount > 0 ? (
        <span className="text-[#00D4FF] text-[11px] font-bold">
          Seen {artist.seenCount}x
        </span>
      ) : (
        <span className="text-[#6B6B8D] text-[11px]">Not seen</span>
      )}
    </button>
  );
}

function PresaleArtistCard({ artist }: { artist: Artist }) {
  if (!artist.presale) return null;

  return (
    <div className="bg-[#1A1A2E] border border-[#2D2D4A] rounded-2xl p-4">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="relative flex-shrink-0">
          <div
            className={`w-16 h-16 rounded-full overflow-hidden border-2 ${
              artist.tier === 'top'
                ? 'border-[#FFD700]'
                : artist.seenCount > 0
                ? 'border-[#8B5CF6]'
                : 'border-[#2D2D4A]'
            }`}
          >
            <ImageWithFallback
              src={artist.image}
              alt={artist.name}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Top Tier Badge */}
          {artist.tier === 'top' && (
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#FFD700] border-2 border-[#0A0B1E] flex items-center justify-center">
              <span className="text-[10px]">⭐</span>
            </div>
          )}

          {/* Seen Badge */}
          {artist.seenCount > 0 && artist.tier !== 'top' && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#8B5CF6] border-2 border-[#0A0B1E] flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
          )}
        </div>

        <div className="flex-1">
          <h3 className="text-white text-[16px] font-bold mb-1">
            {artist.name}
          </h3>
          <div className="inline-block px-2 py-0.5 rounded-full bg-[#8B5CF6]/20">
            <span className="text-[#8B5CF6] text-[11px] font-bold">
              {artist.genre}
            </span>
          </div>
          {artist.seenCount > 0 && (
            <p className="text-[#6B6B8D] text-[11px] mt-1">
              Seen {artist.seenCount}x
            </p>
          )}
        </div>
      </div>

      {/* Presale Info */}
      <div className="space-y-3">
        <StatusPill type="presale" label={artist.presale.type} />
        
        <div className="flex items-center gap-2 text-[#A0A0B8] text-[13px]">
          <Calendar className="w-3.5 h-3.5" />
          <span>{artist.presale.date}</span>
        </div>
        
        <div className="flex items-center gap-2 text-[#A0A0B8] text-[13px]">
          <MapPin className="w-3.5 h-3.5" />
          <span>{artist.presale.venue}</span>
        </div>

        {artist.presale.code && (
          <div className="pt-3 border-t border-[#2D2D4A]">
            <CodeDisplay code={artist.presale.code} />
          </div>
        )}

        {artist.presale.deadline && (
          <SignupWarning deadline={artist.presale.deadline} />
        )}
      </div>
    </div>
  );
}