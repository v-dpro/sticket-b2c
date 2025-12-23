import React from 'react';
import { X, Search, Clock, ChevronRight } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

// Mock data
const recentSearches = [
  'The Weeknd',
  'Billie Eilish',
  'Arctic Monkeys',
  'SZA'
];

const suggestedShows = [
  {
    id: 1,
    artist: 'The Weeknd',
    show: 'Dec 15 at SoFi Stadium',
    image: 'https://images.unsplash.com/photo-1575426220089-9e2ef7b0c9f4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25jZXJ0JTIwcGVyZm9ybWVyJTIwc3RhZ2V8ZW58MXx8fHwxNzY2MTY0MjMxfDA&ixlib=rb-4.1.0&q=80&w=200'
  },
  {
    id: 2,
    artist: 'Travis Scott',
    show: 'Nov 28 at Madison Square Garden',
    image: 'https://images.unsplash.com/flagged/photo-1563205764-79ea509b3e95?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyYXBwZXIlMjBjb25jZXJ0JTIwcGVyZm9ybWFuY2V8ZW58MXx8fHwxNzY2MDg5MDk0fDA&ixlib=rb-4.1.0&q=80&w=200'
  },
  {
    id: 3,
    artist: 'Tame Impala',
    show: 'Oct 15 at Brooklyn Mirage',
    image: 'https://images.unsplash.com/photo-1692176548571-86138128e36c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbGVjdHJvbmljJTIwbXVzaWMlMjBkanxlbnwxfHx8fDE3NjYxMTIzMjF8MA&ixlib=rb-4.1.0&q=80&w=200'
  }
];

const artistDatabase = [
  {
    id: 101,
    name: 'The Weeknd',
    genre: 'R&B, Pop',
    image: 'https://images.unsplash.com/photo-1575426220089-9e2ef7b0c9f4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25jZXJ0JTIwcGVyZm9ybWVyJTIwc3RhZ2V8ZW58MXx8fHwxNzY2MTY0MjMxfDA&ixlib=rb-4.1.0&q=80&w=200'
  },
  {
    id: 102,
    name: 'Billie Eilish',
    genre: 'Alternative, Pop',
    image: 'https://images.unsplash.com/photo-1693835777292-cf103dcd2324?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtdXNpYyUyMGFydGlzdCUyMHBvcnRyYWl0fGVufDF8fHx8MTc2NjE0OTg2NHww&ixlib=rb-4.1.0&q=80&w=200'
  },
  {
    id: 103,
    name: 'Arctic Monkeys',
    genre: 'Rock, Indie',
    image: 'https://images.unsplash.com/photo-1723902738750-9d9734aabe46?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyb2NrJTIwZ3VpdGFyaXN0JTIwY29uY2VydHxlbnwxfHx8fDE3NjYxNjg4NjJ8MA&ixlib=rb-4.1.0&q=80&w=200'
  },
  {
    id: 104,
    name: 'SZA',
    genre: 'R&B, Soul',
    image: 'https://images.unsplash.com/photo-1743503142096-c4ae4db2f13b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3AlMjBzaW5nZXIlMjBzdGFnZXxlbnwxfHx8fDE3NjYxNjg4NjJ8MA&ixlib=rb-4.1.0&q=80&w=200'
  },
  {
    id: 105,
    name: 'Travis Scott',
    genre: 'Hip Hop, Rap',
    image: 'https://images.unsplash.com/flagged/photo-1563205764-79ea509b3e95?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyYXBwZXIlMjBjb25jZXJ0JTIwcGVyZm9ybWFuY2V8ZW58MXx8fHwxNzY2MDg5MDk0fDA&ixlib=rb-4.1.0&q=80&w=200'
  },
  {
    id: 106,
    name: 'Calvin Harris',
    genre: 'Electronic, Dance',
    image: 'https://images.unsplash.com/photo-1692176548571-86138128e36c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbGVjdHJvbmljJTIwbXVzaWMlMjBkanxlbnwxfHx8fDE3NjYxMTIzMjF8MA&ixlib=rb-4.1.0&q=80&w=200'
  },
  {
    id: 107,
    name: 'Tame Impala',
    genre: 'Psychedelic, Rock',
    image: 'https://images.unsplash.com/photo-1759899520572-5cc5159c13e3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmRpZSUyMG11c2ljaWFuJTIwZ3VpdGFyfGVufDF8fHx8MTc2NjE0MjAzN3ww&ixlib=rb-4.1.0&q=80&w=200'
  }
];

interface LogShowScreenProps {
  onClose?: () => void;
}

export function LogShowScreen({ onClose }: LogShowScreenProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isFocused, setIsFocused] = React.useState(false);

  // Filter artists based on search query
  const searchResults = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return artistDatabase.filter((artist) =>
      artist.name.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Function to highlight matching text
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <span key={i} className="text-[#00D4FF]">
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  return (
    <div className="w-[390px] h-[844px] bg-[#0A0B1E] overflow-hidden flex flex-col">
      {/* Header */}
      <header className="px-6 pt-12 pb-4 flex items-center justify-between">
        <button
          onClick={onClose}
          className="text-white w-6 h-6 flex items-center justify-center"
        >
          <X className="w-6 h-6" />
        </button>
        <h1 className="text-white text-[18px] font-semibold absolute left-1/2 -translate-x-1/2">
          Log a Show
        </h1>
        <div className="w-6" /> {/* Spacer for centering */}
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6">
        {/* Search Bar */}
        <div className="mb-6">
          <div
            className={`relative h-[52px] bg-[#12132D] rounded-xl border transition-all ${
              isFocused
                ? 'border-[#00D4FF] shadow-[0_0_12px_rgba(0,212,255,0.3)]'
                : 'border-[#2A2B4D]'
            }`}
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B6B8D]" />
            <input
              type="text"
              placeholder="Search artist..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="w-full h-full pl-12 pr-4 bg-transparent text-white placeholder:text-[#6B6B8D] outline-none"
            />
          </div>
        </div>

        {/* Search Results (shown when typing) */}
        {searchQuery.trim() && searchResults.length > 0 && (
          <div className="mb-6">
            <div className="space-y-2">
              {searchResults.map((artist) => (
                <button
                  key={artist.id}
                  className="w-full bg-[#12132D] rounded-xl p-3 flex items-center gap-3 hover:bg-[#1A1B3D] transition-colors"
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                    <ImageWithFallback
                      src={artist.image}
                      alt={artist.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-white font-semibold text-[15px] mb-0.5">
                      {highlightMatch(artist.name, searchQuery)}
                    </div>
                    <div className="text-[#6B6B8D] text-[13px]">
                      {artist.genre}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* No Results */}
        {searchQuery.trim() && searchResults.length === 0 && (
          <div className="mb-6 text-center py-8">
            <p className="text-[#6B6B8D] text-[14px]">No artists found</p>
          </div>
        )}

        {/* Recent Searches (shown when not searching) */}
        {!searchQuery.trim() && (
          <>
            <section className="mb-6">
              <h2 className="text-[#A1A1C7] text-[14px] mb-3">Recent Searches</h2>
              <div className="space-y-2">
                {recentSearches.map((artist, index) => (
                  <button
                    key={index}
                    onClick={() => setSearchQuery(artist)}
                    className="w-full bg-[#12132D] rounded-xl px-4 py-3 flex items-center gap-3 hover:bg-[#1A1B3D] transition-colors"
                  >
                    <Clock className="w-4 h-4 text-[#6B6B8D] flex-shrink-0" />
                    <span className="text-white text-[15px] flex-1 text-left">
                      {artist}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* Suggested Shows */}
            <section className="mb-6">
              <h2 className="text-[#A1A1C7] text-[14px] mb-1">
                Were you at any of these?
              </h2>
              <p className="text-[#6B6B8D] text-[12px] mb-3">Based on Spotify data</p>
              <div className="space-y-3">
                {suggestedShows.map((show) => (
                  <button
                    key={show.id}
                    className="w-full bg-[#12132D] rounded-xl p-3 flex items-center gap-3 hover:bg-[#1A1B3D] transition-colors"
                  >
                    <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
                      <ImageWithFallback
                        src={show.image}
                        alt={show.artist}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="text-white font-semibold text-[15px] mb-0.5 truncate">
                        {show.artist}
                      </div>
                      <div className="text-[#A1A1C7] text-[13px] truncate">
                        {show.show}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#6B6B8D] flex-shrink-0" />
                  </button>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
