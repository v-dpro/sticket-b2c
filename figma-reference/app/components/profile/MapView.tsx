import React from 'react';
import { MapPin } from 'lucide-react';

export function MapView() {
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
