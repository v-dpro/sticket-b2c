import React from 'react';

export function StatsView() {
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
