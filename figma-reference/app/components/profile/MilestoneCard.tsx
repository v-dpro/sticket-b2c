import React from 'react';
import { Milestone } from './types';

interface MilestoneCardProps {
  milestone: Milestone;
}

export function MilestoneCard({ milestone }: MilestoneCardProps) {
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
