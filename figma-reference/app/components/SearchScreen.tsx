import React from 'react';
import { Search, X, TrendingUp, MapPin, Calendar, Music, User } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface SearchResult {
  id: number;
  type: 'artist' | 'venue' | 'event' | 'user';
  name: string;
  subtitle?: string;
  image?: string;
  date?: string;
  location?: string;
}

interface SearchScreenProps {
  onClose?: () => void;
  onSelectResult?: (result: SearchResult) => void;
}

const recentSearches: SearchResult[] = [
  { id: 1, type: 'artist', name: 'The Weeknd', image: 'https://i.pravatar.cc/150?img=11' },
  { id: 2, type: 'venue', name: 'SoFi Stadium', location: 'Los Angeles, CA' },
];

const trendingArtists = [
  'Taylor Swift',
  'Bad Bunny',
  'Drake',
  'Billie Eilish',
  'The Weeknd',
  'Travis Scott',
];

const popularVenues: SearchResult[] = [
  { id: 1, type: 'venue', name: 'Madison Square Garden', location: 'New York, NY' },
  { id: 2, type: 'venue', name: 'SoFi Stadium', location: 'Los Angeles, CA' },
  { id: 3, type: 'venue', name: 'United Center', location: 'Chicago, IL' },
];

const mockResults: SearchResult[] = [
  {
    id: 1,
    type: 'artist',
    name: 'The Weeknd',
    subtitle: 'Pop, R&B',
    image: 'https://i.pravatar.cc/150?img=11',
  },
  {
    id: 2,
    type: 'event',
    name: 'The Weeknd',
    subtitle: 'SoFi Stadium',
    date: 'Dec 15, 2024',
    location: 'Los Angeles, CA',
    image: 'https://i.pravatar.cc/150?img=11',
  },
  {
    id: 3,
    type: 'venue',
    name: 'The Forum',
    location: 'Inglewood, CA',
  },
  {
    id: 4,
    type: 'user',
    name: 'Sarah Chen',
    subtitle: '@sarahc • 24 shows',
    image: 'https://i.pravatar.cc/150?img=1',
  },
];

export function SearchScreen({ onClose, onSelectResult }: SearchScreenProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<
    'all' | 'artists' | 'venues' | 'events' | 'people'
  >('all');
  const [localRecents, setLocalRecents] = React.useState(recentSearches);

  const hasQuery = searchQuery.length > 0;
  const results = hasQuery ? mockResults : [];

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'artist':
        return Music;
      case 'venue':
        return MapPin;
      case 'event':
        return Calendar;
      case 'user':
        return User;
      default:
        return Search;
    }
  };

  const clearRecent = (id: number) => {
    setLocalRecents(localRecents.filter((r) => r.id !== id));
  };

  return (
    <div className="w-[390px] h-[844px] bg-[#0A0B1E] overflow-hidden flex flex-col">
      {/* Search Header */}
      <div className="px-6 pt-12 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B6B8D]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search artists, venues, events..."
              autoFocus
              className="w-full pl-12 pr-4 py-3 bg-[#12132D] border border-[#2A2B4D] rounded-xl text-white placeholder:text-[#6B6B8D] focus:outline-none focus:border-[#8B5CF6] transition-colors"
            />
          </div>
          <button
            onClick={onClose}
            className="text-[#A1A1C7] font-medium text-[15px]"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Tabs (when searching) */}
      {hasQuery && (
        <div className="px-6 pb-3">
          <div className="flex gap-2 overflow-x-auto">
            {(['all', 'artists', 'venues', 'events', 'people'] as const).map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-full font-medium text-[13px] whitespace-nowrap transition-colors ${
                    activeTab === tab
                      ? 'bg-[#8B5CF6] text-white'
                      : 'bg-[#12132D] text-[#A1A1C7]'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {tab === 'all' && (
                    <span className="ml-1.5 text-[11px]">
                      {results.length}
                    </span>
                  )}
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!hasQuery ? (
          <div className="px-6">
            {/* Recent Searches */}
            {localRecents.length > 0 && (
              <section className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-white text-[18px] font-bold">Recent</h2>
                  <button
                    onClick={() => setLocalRecents([])}
                    className="text-[#00D4FF] text-[13px] font-medium"
                  >
                    Clear
                  </button>
                </div>
                <div className="space-y-2">
                  {localRecents.map((item) => {
                    const Icon = getResultIcon(item.type);
                    return (
                      <button
                        key={item.id}
                        onClick={() => onSelectResult?.(item)}
                        className="w-full flex items-center gap-3 p-3 bg-[#12132D] rounded-lg hover:bg-[#1A1B3D] transition-colors"
                      >
                        {item.image ? (
                          <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                            <ImageWithFallback
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-[#1A1B3D] flex items-center justify-center flex-shrink-0">
                            <Icon className="w-5 h-5 text-[#6B6B8D]" />
                          </div>
                        )}
                        <div className="flex-1 text-left">
                          <p className="text-white font-semibold text-[14px]">
                            {item.name}
                          </p>
                          {item.location && (
                            <p className="text-[#6B6B8D] text-[12px]">
                              {item.location}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            clearRecent(item.id);
                          }}
                          className="text-[#6B6B8D] hover:text-[#A1A1C7]"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Trending Artists */}
            <section className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-[#8B5CF6]" />
                <h2 className="text-white text-[18px] font-bold">Trending Artists</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {trendingArtists.map((artist) => (
                  <button
                    key={artist}
                    onClick={() => setSearchQuery(artist)}
                    className="px-4 py-2 bg-[#12132D] border border-[#2A2B4D] rounded-full text-[#A1A1C7] text-[14px] font-medium hover:border-[#8B5CF6] hover:text-[#8B5CF6] transition-colors"
                  >
                    {artist}
                  </button>
                ))}
              </div>
            </section>

            {/* Popular Venues */}
            <section>
              <h2 className="text-white text-[18px] font-bold mb-3">
                Popular Venues Nearby
              </h2>
              <div className="space-y-2">
                {popularVenues.map((venue) => (
                  <button
                    key={venue.id}
                    onClick={() => onSelectResult?.(venue)}
                    className="w-full flex items-center gap-3 p-3 bg-[#12132D] rounded-lg hover:bg-[#1A1B3D] transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[#1A1B3D] flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-[#6B6B8D]" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-white font-semibold text-[14px]">
                        {venue.name}
                      </p>
                      <p className="text-[#6B6B8D] text-[12px]">
                        {venue.location}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </div>
        ) : (
          /* Search Results */
          <div className="px-6">
            <p className="text-[#6B6B8D] text-[13px] mb-4">
              {results.length} {results.length === 1 ? 'result' : 'results'}
            </p>
            <div className="space-y-2">
              {results.map((result) => {
                const Icon = getResultIcon(result.type);
                return (
                  <button
                    key={result.id}
                    onClick={() => onSelectResult?.(result)}
                    className="w-full flex items-center gap-3 p-3 bg-[#12132D] rounded-lg hover:bg-[#1A1B3D] transition-colors"
                  >
                    {result.image ? (
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                        <ImageWithFallback
                          src={result.image}
                          alt={result.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-[#1A1B3D] flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-[#6B6B8D]" />
                      </div>
                    )}
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-white font-semibold text-[15px]">
                          {result.name}
                        </p>
                        <span className="px-2 py-0.5 rounded-full bg-[#1A1B3D] text-[#6B6B8D] text-[10px] font-medium uppercase">
                          {result.type}
                        </span>
                      </div>
                      {result.subtitle && (
                        <p className="text-[#6B6B8D] text-[13px]">
                          {result.subtitle}
                        </p>
                      )}
                      {result.date && result.location && (
                        <p className="text-[#6B6B8D] text-[12px]">
                          {result.date} • {result.location}
                        </p>
                      )}
                      {result.location && !result.date && (
                        <p className="text-[#6B6B8D] text-[12px]">
                          {result.location}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
