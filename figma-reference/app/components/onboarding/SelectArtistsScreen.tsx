import React from 'react';
import { ArrowLeft, Search, RefreshCw, ArrowRight, Check, Star } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface Artist {
  id: number;
  name: string;
  image: string;
}

interface SelectArtistsScreenProps {
  onBack?: () => void;
  onContinue?: (selectedIds: number[], topTierIds: number[]) => void;
}

export function SelectArtistsScreen({
  onBack,
  onContinue,
}: SelectArtistsScreenProps) {
  const [selectedArtists, setSelectedArtists] = React.useState<Set<number>>(
    new Set()
  );
  const [topTierArtists, setTopTierArtists] = React.useState<Set<number>>(
    new Set()
  );
  const [searchQuery, setSearchQuery] = React.useState('');

  const artists: Artist[] = [
    { id: 1, name: 'Taylor Swift', image: 'https://i.pravatar.cc/150?img=1' },
    { id: 2, name: 'The Weeknd', image: 'https://i.pravatar.cc/150?img=2' },
    { id: 3, name: 'SZA', image: 'https://i.pravatar.cc/150?img=3' },
    { id: 4, name: 'Bad Bunny', image: 'https://i.pravatar.cc/150?img=4' },
    { id: 5, name: 'Drake', image: 'https://i.pravatar.cc/150?img=5' },
    { id: 6, name: 'Billie Eilish', image: 'https://i.pravatar.cc/150?img=6' },
    { id: 7, name: 'Harry Styles', image: 'https://i.pravatar.cc/150?img=7' },
    { id: 8, name: 'Olivia Rodrigo', image: 'https://i.pravatar.cc/150?img=8' },
    { id: 9, name: 'Beyoncé', image: 'https://i.pravatar.cc/150?img=9' },
  ];

  const handleArtistTap = (artistId: number) => {
    setSelectedArtists((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(artistId)) {
        newSet.delete(artistId);
        setTopTierArtists((topPrev) => {
          const newTop = new Set(topPrev);
          newTop.delete(artistId);
          return newTop;
        });
      } else {
        newSet.add(artistId);
      }
      return newSet;
    });
  };

  const handleArtistLongPress = (artistId: number) => {
    setSelectedArtists((prev) => new Set(prev).add(artistId));
    setTopTierArtists((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(artistId)) {
        newSet.delete(artistId);
      } else {
        newSet.add(artistId);
      }
      return newSet;
    });
  };

  const selectedCount = selectedArtists.size;
  const topTierCount = topTierArtists.size;
  const canContinue = selectedCount >= 3;

  return (
    <div className="w-[390px] h-[844px] bg-[#0A0B1E] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-6 pt-12 pb-4 flex items-center justify-between">
        <button onClick={onBack} className="p-2 -ml-2">
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
        <span className="text-[#6B6B8D] text-[13px] font-semibold">
          Step 3 of 6
        </span>
      </div>

      {/* Title Section */}
      <div className="px-6 pb-4">
        <h1 className="text-white text-[28px] font-black mb-2">
          Select Your Artists
        </h1>
        <p className="text-[#A0A0B8] text-[15px]">
          We found artists you listen to! Tap to follow, long press for must-sees ⭐
        </p>
      </div>

      {/* Search Bar */}
      <div className="px-6 pb-4">
        <div className="flex items-center gap-3 px-4 py-3 bg-[#1A1A2E] rounded-xl border border-[#2D2D4A]">
          <Search className="w-5 h-5 text-[#6B6B8D]" />
          <input
            type="text"
            placeholder="Search artists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-white text-[15px] outline-none placeholder:text-[#6B6B8D]"
          />
          <button>
            <RefreshCw className="w-5 h-5 text-[#6B6B8D]" />
          </button>
        </div>
      </div>

      {/* Selection Counter */}
      <div className="px-6 pb-4 flex items-center justify-between">
        <span className="text-[#00D4FF] text-[14px] font-semibold">
          {selectedCount} selected {topTierCount > 0 && `(${topTierCount} must-sees)`}
        </span>
        <span className="text-[#6B6B8D] text-[14px]">Minimum 3</span>
      </div>

      {/* Artist Grid */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="grid grid-cols-3 gap-3">
          {artists.map((artist) => {
            const isSelected = selectedArtists.has(artist.id);
            const isTopTier = topTierArtists.has(artist.id);

            return (
              <button
                key={artist.id}
                onClick={() => handleArtistTap(artist.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  handleArtistLongPress(artist.id);
                }}
                onTouchStart={(e) => {
                  const timeout = setTimeout(() => {
                    handleArtistLongPress(artist.id);
                  }, 300);
                  e.currentTarget.dataset.timeout = String(timeout);
                }}
                onTouchEnd={(e) => {
                  const timeout = e.currentTarget.dataset.timeout;
                  if (timeout) {
                    clearTimeout(Number(timeout));
                  }
                }}
                className={`relative aspect-[0.85] rounded-2xl p-3 flex flex-col items-center justify-center transition-all ${
                  isTopTier
                    ? 'bg-[#FFD700]/10 border-2 border-[#FFD700]'
                    : isSelected
                    ? 'bg-[#00D4FF]/10 border-2 border-[#00D4FF]'
                    : 'bg-[#1A1A2E] border border-[#2D2D4A]'
                }`}
              >
                {/* Selection Badge */}
                {(isSelected || isTopTier) && (
                  <div
                    className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center ${
                      isTopTier
                        ? 'bg-[#FFD700]'
                        : 'bg-[#00D4FF]'
                    }`}
                  >
                    {isTopTier ? (
                      <Star className="w-3.5 h-3.5 text-white fill-white" />
                    ) : (
                      <Check className="w-3.5 h-3.5 text-white" />
                    )}
                  </div>
                )}

                {/* Artist Image */}
                <div className="w-16 h-16 rounded-full overflow-hidden mb-2">
                  <ImageWithFallback
                    src={artist.image}
                    alt={artist.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Artist Name */}
                <span
                  className={`text-[12px] font-semibold text-center line-clamp-1 ${
                    isSelected || isTopTier ? 'text-white' : 'text-[#A0A0B8]'
                  }`}
                >
                  {artist.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 bg-[#0A0B1E] border-t border-[#2D2D4A]">
        <button
          onClick={() =>
            onContinue &&
            onContinue(Array.from(selectedArtists), Array.from(topTierArtists))
          }
          disabled={!canContinue}
          className={`w-full py-4 rounded-xl font-bold text-[16px] flex items-center justify-center gap-2 transition-all ${
            canContinue
              ? 'bg-[#8B5CF6] text-white'
              : 'bg-[#252542] text-[#6B6B8D] opacity-50'
          }`}
        >
          Continue with {selectedCount} artists
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
