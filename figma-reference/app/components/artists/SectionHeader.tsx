import React from 'react';
import { ChevronDown } from 'lucide-react';

interface SectionHeaderProps {
  emoji: string;
  title: string;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
}

export function SectionHeader({
  emoji,
  title,
  count,
  isExpanded,
  onToggle,
}: SectionHeaderProps) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-3 rounded-xl bg-[#1A1A2E] border border-[#2D2D4A] hover:bg-[#252542] transition-colors"
    >
      <div className="flex items-center gap-2">
        <span className="text-[16px]">{emoji}</span>
        <span className="text-white text-[16px] font-bold">{title}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="px-2 py-1 rounded-full bg-[#252542]">
          <span className="text-[#A0A0B8] text-[12px] font-bold">({count})</span>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-[#A0A0B8] transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </div>
    </button>
  );
}
