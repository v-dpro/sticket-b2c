import React from 'react';
import { Search, Bell, ChevronRight, Plus, House, Ticket, User, Activity } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

// Mock data
const comingUpShows = [
  {
    id: 1,
    artist: 'The Weeknd',
    venue: 'Madison Square Garden',
    date: 'Dec 28',
    image: 'https://images.unsplash.com/photo-1575426220089-9e2ef7b0c9f4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25jZXJ0JTIwcGVyZm9ybWVyJTIwc3RhZ2V8ZW58MXx8fHwxNzY2MTY0MjMxfDA&ixlib=rb-4.1.0&q=80&w=400'
  },
  {
    id: 2,
    artist: 'Billie Eilish',
    venue: 'Barclays Center Brooklyn',
    date: 'Dec 30',
    image: 'https://images.unsplash.com/photo-1693835777292-cf103dcd2324?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtdXNpYyUyMGFydGlzdCUyMHBvcnRyYWl0fGVufDF8fHx8MTc2NjE0OTg2NHww&ixlib=rb-4.1.0&q=80&w=400'
  },
  {
    id: 3,
    artist: 'Calvin Harris',
    venue: 'Brooklyn Mirage',
    date: 'Jan 2',
    image: 'https://images.unsplash.com/photo-1692176548571-86138128e36c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaiUyMGVsZWN0cm9uaWMlMjBtdXNpY3xlbnwxfHx8fDE3NjYxNjIwNjN8MA&ixlib=rb-4.1.0&q=80&w=400'
  }
];

const friendsGoingShows = [
  {
    id: 4,
    artist: 'Arctic Monkeys',
    venue: 'Forest Hills Stadium',
    date: 'Jan 5',
    image: 'https://images.unsplash.com/photo-1710951403275-37bf930936bc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyb2NrJTIwYmFuZCUyMHBlcmZvcm1hbmNlfGVufDF8fHx8MTc2NjE2MjA2M3ww&ixlib=rb-4.1.0&q=80&w=400',
    friendsGoing: 3,
    friendAvatars: [
      'https://i.pravatar.cc/150?img=1',
      'https://i.pravatar.cc/150?img=2',
      'https://i.pravatar.cc/150?img=3'
    ]
  },
  {
    id: 5,
    artist: 'Tame Impala',
    venue: 'Terminal 5',
    date: 'Jan 8',
    image: 'https://images.unsplash.com/photo-1759899520572-5cc5159c13e3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmRpZSUyMG11c2ljaWFuJTIwZ3VpdGFyfGVufDF8fHx8MTc2NjE0MjAzN3ww&ixlib=rb-4.1.0&q=80&w=400',
    friendsGoing: 5,
    friendAvatars: [
      'https://i.pravatar.cc/150?img=4',
      'https://i.pravatar.cc/150?img=5',
      'https://i.pravatar.cc/150?img=6'
    ]
  }
];

const popularShows = [
  {
    id: 6,
    artist: 'Travis Scott',
    venue: 'Citi Field',
    date: 'Jan 12 • 8:00 PM',
    image: 'https://images.unsplash.com/photo-1647220419119-316822d9d053?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoaXAlMjBob3AlMjBhcnRpc3R8ZW58MXx8fHwxNzY2MTI4MzAxfDA&ixlib=rb-4.1.0&q=80&w=200'
  },
  {
    id: 7,
    artist: 'SZA',
    venue: 'Radio City Music Hall',
    date: 'Jan 15 • 9:00 PM',
    image: 'https://images.unsplash.com/photo-1693835777292-cf103dcd2324?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtdXNpYyUyMGFydGlzdCUyMHBvcnRyYWl0fGVufDF8fHx8MTc2NjE0OTg2NHww&ixlib=rb-4.1.0&q=80&w=200'
  },
  {
    id: 8,
    artist: 'Bad Bunny',
    venue: 'MetLife Stadium',
    date: 'Jan 20 • 7:30 PM',
    image: 'https://images.unsplash.com/photo-1575426220089-9e2ef7b0c9f4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25jZXJ0JTIwcGVyZm9ybWVyJTIwc3RhZ2V8ZW58MXx8fHwxNzY2MTY0MjMxfDA&ixlib=rb-4.1.0&q=80&w=200'
  }
];

export function DiscoveryScreen() {
  const [activeTab, setActiveTab] = React.useState('home');

  return (
    <div className="w-[390px] h-[844px] bg-[#0A0B1E] overflow-hidden flex flex-col relative">
      {/* Header */}
      <header className="px-6 pt-12 pb-4 flex items-center justify-between">
        <h1 className="text-white text-[28px] font-bold">Discover</h1>
        <div className="flex items-center gap-4">
          <button className="text-white w-6 h-6 flex items-center justify-center">
            <Search className="w-6 h-6" />
          </button>
          <button className="text-white w-6 h-6 flex items-center justify-center relative">
            <Bell className="w-6 h-6" />
            {/* Notification badge */}
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#E879F9] rounded-full" />
          </button>
        </div>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-32">
        {/* Section 1: Coming Up */}
        <section className="px-6 mb-8">
          <h2 className="text-white text-[18px] font-semibold mb-4">Coming Up</h2>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide -mr-6 pr-6">
            {comingUpShows.map((show) => (
              <div
                key={show.id}
                className="flex-shrink-0 w-[156px] bg-[#12132D] rounded-xl overflow-hidden"
              >
                <div className="aspect-square relative overflow-hidden">
                  <ImageWithFallback
                    src={show.image}
                    alt={show.artist}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-3">
                  <h3 className="text-white text-[14px] font-bold mb-0.5 truncate">
                    {show.artist}
                  </h3>
                  <p className="text-[#A1A1C7] text-[13px] mb-2 truncate">
                    {show.venue}
                  </p>
                  <span className="inline-block px-2.5 py-1 rounded-full text-white text-[12px] font-medium bg-gradient-to-r from-[#8B5CF6] to-[#E879F9]">
                    {show.date}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Friends Going */}
        <section className="px-6 mb-8">
          <h2 className="text-white text-[18px] font-semibold mb-4">Friends Going</h2>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide -mr-6 pr-6">
            {friendsGoingShows.map((show) => (
              <div
                key={show.id}
                className="flex-shrink-0 w-[156px] bg-[#12132D] rounded-xl overflow-hidden"
              >
                <div className="aspect-square relative overflow-hidden">
                  <ImageWithFallback
                    src={show.image}
                    alt={show.artist}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-3">
                  <h3 className="text-white text-[14px] font-bold mb-0.5 truncate">
                    {show.artist}
                  </h3>
                  <p className="text-[#A1A1C7] text-[13px] mb-2 truncate">
                    {show.venue}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="inline-block px-2.5 py-1 rounded-full text-white text-[12px] font-medium bg-gradient-to-r from-[#8B5CF6] to-[#E879F9]">
                      {show.date}
                    </span>
                    <div className="flex items-center">
                      <div className="flex -space-x-2">
                        {show.friendAvatars.slice(0, 3).map((avatar, idx) => (
                          <div
                            key={idx}
                            className="w-5 h-5 rounded-full border-2 border-[#12132D] overflow-hidden"
                          >
                            <ImageWithFallback
                              src={avatar}
                              alt="Friend"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                      <span className="ml-1.5 text-[#00D4FF] text-[11px] font-medium">
                        {show.friendsGoing}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: Popular in NYC */}
        <section className="px-6 mb-8">
          <h2 className="text-white text-[18px] font-semibold mb-4">Popular in NYC</h2>
          <div className="space-y-3">
            {popularShows.map((show) => (
              <div
                key={show.id}
                className="bg-[#12132D] rounded-xl p-3 flex items-center gap-3"
              >
                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                  <ImageWithFallback
                    src={show.image}
                    alt={show.artist}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white text-[14px] font-bold mb-0.5 truncate">
                    {show.artist}
                  </h3>
                  <p className="text-[#A1A1C7] text-[13px] truncate">
                    {show.venue} • {show.date}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-[#6B6B8D] flex-shrink-0" />
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Floating Action Button */}
      <button className="absolute bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full bg-gradient-to-r from-[#00D4FF] via-[#8B5CF6] to-[#E879F9] text-white font-semibold flex items-center gap-2 shadow-lg shadow-[#8B5CF6]/30">
        <Plus className="w-5 h-5" />
        Log a Show
      </button>

      {/* Bottom Navigation */}
      <nav className="absolute bottom-0 left-0 right-0 bg-[#12132D]/95 backdrop-blur-lg border-t border-[#2A2B4D]">
        <div className="flex items-center justify-around h-20 px-6">
          <button
            onClick={() => setActiveTab('home')}
            className="flex flex-col items-center gap-1 relative"
          >
            <House
              className={`w-6 h-6 ${
                activeTab === 'home'
                  ? 'text-[#00D4FF] drop-shadow-[0_0_8px_rgba(0,212,255,0.5)]'
                  : 'text-[#6B6B8D]'
              }`}
            />
            {activeTab === 'home' && (
              <div className="w-1 h-1 rounded-full bg-[#00D4FF]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('search')}
            className="flex flex-col items-center gap-1 relative"
          >
            <Search
              className={`w-6 h-6 ${
                activeTab === 'search'
                  ? 'text-[#00D4FF] drop-shadow-[0_0_8px_rgba(0,212,255,0.5)]'
                  : 'text-[#6B6B8D]'
              }`}
            />
            {activeTab === 'search' && (
              <div className="w-1 h-1 rounded-full bg-[#00D4FF]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('wallet')}
            className="flex flex-col items-center gap-1 relative"
          >
            <Ticket
              className={`w-6 h-6 ${
                activeTab === 'wallet'
                  ? 'text-[#00D4FF] drop-shadow-[0_0_8px_rgba(0,212,255,0.5)]'
                  : 'text-[#6B6B8D]'
              }`}
            />
            {activeTab === 'wallet' && (
              <div className="w-1 h-1 rounded-full bg-[#00D4FF]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('feed')}
            className="flex flex-col items-center gap-1 relative"
          >
            <Activity
              className={`w-6 h-6 ${
                activeTab === 'feed'
                  ? 'text-[#00D4FF] drop-shadow-[0_0_8px_rgba(0,212,255,0.5)]'
                  : 'text-[#6B6B8D]'
              }`}
            />
            {activeTab === 'feed' && (
              <div className="w-1 h-1 rounded-full bg-[#00D4FF]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className="flex flex-col items-center gap-1 relative"
          >
            <User
              className={`w-6 h-6 ${
                activeTab === 'profile'
                  ? 'text-[#00D4FF] drop-shadow-[0_0_8px_rgba(0,212,255,0.5)]'
                  : 'text-[#6B6B8D]'
              }`}
            />
            {activeTab === 'profile' && (
              <div className="w-1 h-1 rounded-full bg-[#00D4FF]" />
            )}
          </button>
        </div>
      </nav>

      {/* Hide scrollbar globally */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
