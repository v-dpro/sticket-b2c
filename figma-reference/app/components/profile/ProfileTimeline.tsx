import React from 'react';
import { Settings } from 'lucide-react';
import { ViewMode } from './types';
import { TimelineView } from './TimelineView';
import { GridView } from './GridView';
import { MapView } from './MapView';
import { StatsView } from './StatsView';
import { mockYearData } from './mockData';

interface ProfileTimelineProps {
  onSettings?: () => void;
  onEditProfile?: () => void;
}

export function ProfileTimeline({
  onSettings,
  onEditProfile,
}: ProfileTimelineProps) {
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
