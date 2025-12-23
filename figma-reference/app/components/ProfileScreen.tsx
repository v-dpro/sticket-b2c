import React from 'react';
import { Settings, Music, MapPin, Calendar, Star, Sparkles, Trophy, Users } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface ProfileScreenProps {
  onSettings?: () => void;
  onEditProfile?: () => void;
  onBadgeClick?: () => void;
}

type ViewMode = 'timeline' | 'grid' | 'map' | 'stats';

interface YearData {
  year: number;
  showCount: number;
  artistCount: number;
  venueCount: number;
  isTopYear?: boolean;
  logs: LogEntry[];
  milestones?: Milestone[];
}

interface LogEntry {
  id: number;
  artist: string;
  tour?: string;
  venue: string;
  city: string;
  date: string;
  dateObj: Date;
  rating: number;
  note?: string;
  photos?: string[];
  badges?: Badge[];
  friends?: Friend[];
  isFeatured?: boolean;
}

interface Milestone {
  id: number;
  type: 'shows' | 'distance' | 'loyalty' | 'streak';
  icon: string;
  message: string;
  insertAfterLogId?: number;
}

interface Badge {
  id: number;
  name: string;
  icon: string;
}

interface Friend {
  id: number;
  name: string;
  avatar: string;
}

const mockYearData: YearData[] = [
  {
    year: 2024,
    showCount: 12,
    artistCount: 8,
    venueCount: 6,
    isTopYear: true,
    logs: [
      {
        id: 1,
        artist: 'Taylor Swift',
        tour: 'The Eras Tour',
        venue: 'SoFi Stadium',
        city: 'Los Angeles, CA',
        date: 'Dec 15, 2024',
        dateObj: new Date('2024-12-15'),
        rating: 5,
        note: 'Cried during All Too Well. Worth it.',
        photos: ['https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800'],
        badges: [
          { id: 1, name: '500 Mile', icon: '🏆' },
          { id: 2, name: '1st TN', icon: '🎭' },
        ],
        friends: [
          { id: 1, name: 'Sarah', avatar: 'https://i.pravatar.cc/150?img=1' },
          { id: 2, name: 'Mike', avatar: 'https://i.pravatar.cc/150?img=2' },
          { id: 3, name: 'Emma', avatar: 'https://i.pravatar.cc/150?img=3' },
        ],
        isFeatured: true,
      },
      {
        id: 2,
        artist: 'Arctic Monkeys',
        venue: 'Madison Square Garden',
        city: 'New York, NY',
        date: 'Nov 28, 2024',
        dateObj: new Date('2024-11-28'),
        rating: 4,
        photos: ['https://images.unsplash.com/photo-1511735111819-9a3f7709049c?w=400'],
      },
      {
        id: 3,
        artist: 'The Weeknd',
        venue: 'Barclays Center',
        city: 'Brooklyn, NY',
        date: 'Nov 15, 2024',
        dateObj: new Date('2024-11-15'),
        rating: 5,
        photos: ['https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400'],
      },
      {
        id: 4,
        artist: 'Billie Eilish',
        venue: 'The Forum',
        city: 'Inglewood, CA',
        date: 'Oct 20, 2024',
        dateObj: new Date('2024-10-20'),
        rating: 5,
        note: 'Her voice is even better live!',
        photos: ['https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800'],
        isFeatured: true,
      },
    ],
    milestones: [
      {
        id: 1,
        type: 'shows',
        icon: '🎉',
        message: '10 shows in 2024',
        insertAfterLogId: 3,
      },
    ],
  },
  {
    year: 2023,
    showCount: 8,
    artistCount: 6,
    venueCount: 5,
    logs: [
      {
        id: 5,
        artist: 'Bad Bunny',
        venue: 'SoFi Stadium',
        city: 'Los Angeles, CA',
        date: 'Aug 12, 2023',
        dateObj: new Date('2023-08-12'),
        rating: 5,
        photos: ['https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=400'],
      },
    ],
  },
];

export function ProfileScreen({
  onSettings,
  onEditProfile,
  onBadgeClick,
}: ProfileScreenProps) {
  const [viewMode, setViewMode] = React.useState<ViewMode>('timeline');

  return (
    <div className="w-[390px] h-[844px] bg-[#0A0B1E] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-6 pt-12 pb-4 flex items-center justify-between">
        <h1 className="text-white text-[28px] font-bold">Profile</h1>
        <button
          onClick={onSettings}
          className="w-10 h-10 rounded-full bg-[#12132D] flex items-center justify-center text-white"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Profile Header */}
        <div className="px-6 pb-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#00D4FF] via-[#8B5CF6] to-[#E879F9] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[28px] font-bold">JD</span>
            </div>
            <div className="flex-1">
              <h2 className="text-white text-[20px] font-bold mb-1">
                Jordan Davis
              </h2>
              <p className="text-[#6B6B8D] text-[14px] mb-3">@jordand</p>
              <p className="text-[#A1A1C7] text-[14px]">
                Concert lover 🎵 | Collector of memories
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <p className="text-white text-[24px] font-bold mb-1">24</p>
              <p className="text-[#6B6B8D] text-[12px]">Shows</p>
            </div>
            <div className="text-center">
              <p className="text-white text-[24px] font-bold mb-1">18</p>
              <p className="text-[#6B6B8D] text-[12px]">Artists</p>
            </div>
            <div className="text-center">
              <p className="text-white text-[24px] font-bold mb-1">12</p>
              <p className="text-[#6B6B8D] text-[12px]">Venues</p>
            </div>
          </div>

          {/* Edit Profile Button */}
          <button
            onClick={onEditProfile}
            className="w-full py-3 rounded-xl bg-[#12132D] border border-[#2A2B4D] text-white font-semibold text-[14px]"
          >
            Edit Profile
          </button>
        </div>

        {/* View Toggle */}
        <div className="px-6 mb-4">
          <div className="flex gap-2 p-1 bg-[#12132D] rounded-xl overflow-x-auto">
            {(['timeline', 'grid', 'map', 'stats'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`flex-1 min-w-[80px] py-2 rounded-lg font-medium text-[13px] transition-colors ${
                  viewMode === mode
                    ? 'bg-gradient-to-r from-[#00D4FF] via-[#8B5CF6] to-[#E879F9] text-white'
                    : 'text-[#A1A1C7]'
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline View */}
        {viewMode === 'timeline' && <TimelineView data={mockYearData} />}
        
        {/* Grid View */}
        {viewMode === 'grid' && <GridView data={mockYearData} />}
        
        {/* Map View */}
        {viewMode === 'map' && <MapView />}
        
        {/* Stats View */}
        {viewMode === 'stats' && <StatsView />}
      </div>

      {/* Bottom Navigation Spacer */}
      <div className="h-20" />
    </div>
  );
}

// Timeline View Component
function TimelineView({ data }: { data: YearData[] }) {
  return (
    <div className="px-6 pb-6 space-y-8">
      {data.map((yearData) => (
        <div key={yearData.year}>
          {/* Year Header Card */}
          <div className="mb-4 p-4 rounded-2xl bg-gradient-to-br from-[#12132D] to-[#1A1B3D] border border-[#2A2B4D]">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-white text-[32px] font-black">
                {yearData.year}
              </h2>
              {yearData.isTopYear && (
                <Sparkles className="w-6 h-6 text-[#F59E0B]" />
              )}
            </div>
            <div className="flex items-center gap-3 text-[#A1A1C7] text-[13px] font-semibold">
              <span>
                <span className="text-[#00D4FF]">{yearData.showCount}</span> shows
              </span>
              <span>·</span>
              <span>
                <span className="text-[#00D4FF]">{yearData.artistCount}</span> artists
              </span>
              <span>·</span>
              <span>
                <span className="text-[#00D4FF]">{yearData.venueCount}</span> venues
              </span>
            </div>
            {yearData.isTopYear && (
              <div className="mt-3">
                <div className="h-2 bg-[#2A2B4D] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#00D4FF] via-[#8B5CF6] to-[#E879F9]"
                    style={{ width: '75%' }}
                  />
                </div>
                <p className="text-[#6B6B8D] text-[11px] mt-1">
                  Your biggest year!
                </p>
              </div>
            )}
          </div>

          {/* Logs */}
          <div className="space-y-4">
            {yearData.logs.map((log, index) => {
              // Check for milestone after this log
              const milestone = yearData.milestones?.find(
                (m) => m.insertAfterLogId === log.id
              );

              return (
                <React.Fragment key={log.id}>
                  {/* Featured or Compact Card */}
                  {log.isFeatured ? (
                    <FeaturedLogCard log={log} />
                  ) : index % 2 === 0 && yearData.logs[index + 1] && !yearData.logs[index + 1].isFeatured ? (
                    <div className="grid grid-cols-2 gap-3">
                      <CompactLogCard log={log} />
                      {yearData.logs[index + 1] && (
                        <CompactLogCard log={yearData.logs[index + 1]} />
                      )}
                    </div>
                  ) : !log.isFeatured && (index === 0 || yearData.logs[index - 1].isFeatured || (index - 1) % 2 !== 0) ? (
                    <CompactLogCard log={log} />
                  ) : null}

                  {/* Milestone Card */}
                  {milestone && <MilestoneCard milestone={milestone} />}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// Featured Log Card
function FeaturedLogCard({ log }: { log: LogEntry }) {
  return (
    <div className="rounded-2xl overflow-hidden bg-[#12132D] shadow-lg shadow-[#8B5CF6]/20">
      {/* Photo */}
      {log.photos && log.photos[0] && (
        <div className="relative h-64">
          <ImageWithFallback
            src={log.photos[0]}
            alt={log.artist}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <h3 className="text-white text-[24px] font-bold mb-1">
              {log.artist}
            </h3>
            {log.tour && (
              <p className="text-white/90 text-[16px]">{log.tour}</p>
            )}
          </div>
          {log.photos.length > 1 && (
            <div className="absolute bottom-4 right-4 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-[12px]">
              1 / {log.photos.length}
            </div>
          )}
        </div>
      )}

      <div className="p-4">
        {/* Venue & Date */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1A1B3D] border border-[#2A2B4D] mb-3">
          <MapPin className="w-3.5 h-3.5 text-[#6B6B8D]" />
          <span className="text-[#A1A1C7] text-[13px]">
            {log.venue} · {log.date}
          </span>
        </div>

        {/* Rating */}
        <div className="flex gap-1 mb-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`w-5 h-5 ${
                i < log.rating
                  ? 'text-[#FFD700] fill-[#FFD700]'
                  : 'text-[#3D3D5C]'
              }`}
            />
          ))}
        </div>

        {/* Note */}
        {log.note && (
          <p className="text-white text-[14px] italic mb-3">"{log.note}"</p>
        )}

        {/* Badges & Friends */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {log.badges?.map((badge) => (
              <div
                key={badge.id}
                className="px-3 py-1 rounded-full bg-[#1A1B3D] border border-[#8B5CF6]/30 text-[11px] font-medium text-[#8B5CF6] flex items-center gap-1"
              >
                <span>{badge.icon}</span>
                <span>{badge.name}</span>
              </div>
            ))}
          </div>
          {log.friends && log.friends.length > 0 && (
            <div className="flex items-center">
              <div className="flex -space-x-2">
                {log.friends.slice(0, 3).map((friend) => (
                  <div
                    key={friend.id}
                    className="w-6 h-6 rounded-full border-2 border-[#12132D] overflow-hidden"
                  >
                    <ImageWithFallback
                      src={friend.avatar}
                      alt={friend.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
              {log.friends.length > 3 && (
                <span className="ml-2 text-[#6B6B8D] text-[12px]">
                  +{log.friends.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Compact Log Card
function CompactLogCard({ log }: { log: LogEntry }) {
  return (
    <div className="rounded-xl overflow-hidden bg-[#12132D]">
      {log.photos && log.photos[0] ? (
        <div className="relative h-32">
          <ImageWithFallback
            src={log.photos[0]}
            alt={log.artist}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        </div>
      ) : (
        <div className="h-32 bg-gradient-to-br from-[#1A1B3D] to-[#12132D] flex items-center justify-center">
          <Music className="w-12 h-12 text-[#6B6B8D]" />
        </div>
      )}
      <div className="p-3">
        <h4 className="text-white font-bold text-[14px] mb-1 truncate">
          {log.artist}
        </h4>
        <p className="text-[#6B6B8D] text-[12px] mb-2 truncate">
          {log.venue} · {log.date.split(',')[0]}
        </p>
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`w-3.5 h-3.5 ${
                i < log.rating
                  ? 'text-[#FFD700] fill-[#FFD700]'
                  : 'text-[#3D3D5C]'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Milestone Card
function MilestoneCard({ milestone }: { milestone: Milestone }) {
  return (
    <div className="my-6 mx-auto max-w-[280px]">
      <div className="p-6 rounded-2xl bg-gradient-to-br from-[#8B5CF6] via-[#00D4FF] to-[#8B5CF6] text-center relative overflow-hidden">
        {/* Decoration */}
        <div className="absolute top-2 left-2 text-[24px] opacity-50">✨</div>
        <div className="absolute top-2 right-2 text-[24px] opacity-50">✨</div>
        <div className="absolute bottom-2 left-4 text-[20px] opacity-30">🎵</div>
        <div className="absolute bottom-2 right-4 text-[20px] opacity-30">🎵</div>

        <div className="relative z-10">
          <div className="text-[40px] mb-2">{milestone.icon}</div>
          <h3 className="text-white text-[18px] font-bold mb-1">
            {milestone.message}
          </h3>
          <p className="text-white/80 text-[13px]">Milestone reached!</p>
        </div>
      </div>
    </div>
  );
}

// Grid View Component
function GridView({ data }: { data: YearData[] }) {
  const allLogs = data.flatMap((year) => year.logs);
  
  return (
    <div className="px-6 pb-6">
      <div className="grid grid-cols-2 gap-3">
        {allLogs.map((log) => (
          <CompactLogCard key={log.id} log={log} />
        ))}
      </div>
    </div>
  );
}

// Map View Component
function MapView() {
  return (
    <div className="px-6 pb-6">
      <div className="h-[400px] rounded-2xl bg-[#12132D] border border-[#2A2B4D] flex items-center justify-center">
        <div className="text-center">
          <MapPin className="w-16 h-16 text-[#8B5CF6] mx-auto mb-4" />
          <h3 className="text-white text-[18px] font-bold mb-2">
            Map View
          </h3>
          <p className="text-[#6B6B8D] text-[14px]">
            Your concert journey across the world
          </p>
        </div>
      </div>
    </div>
  );
}

// Stats View Component  
function StatsView() {
  return (
    <div className="px-6 pb-6 space-y-4">
      <div className="p-6 rounded-2xl bg-[#12132D]">
        <h3 className="text-white text-[18px] font-bold mb-4">
          Your Concert Stats
        </h3>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#A1A1C7] text-[14px]">Most Seen Artist</span>
              <span className="text-white font-bold text-[14px]">Taylor Swift</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#A1A1C7] text-[14px]">Favorite Venue</span>
              <span className="text-white font-bold text-[14px]">SoFi Stadium</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#A1A1C7] text-[14px]">Total Distance</span>
              <span className="text-white font-bold text-[14px]">1,247 miles</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#A1A1C7] text-[14px]">Avg Rating</span>
              <span className="text-white font-bold text-[14px]">4.7 ⭐</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}