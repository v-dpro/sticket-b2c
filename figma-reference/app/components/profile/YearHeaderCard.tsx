import React from 'react';
import { Sparkles } from 'lucide-react';
import { YearData } from './types';

interface YearHeaderCardProps {
  yearData: YearData;
}

export function YearHeaderCard({ yearData }: YearHeaderCardProps) {
  return (
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
  );
}
