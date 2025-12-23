import React from 'react';

interface SticketProgressProps {
  value: number; // 0-100
  showLabel?: boolean;
  className?: string;
  gradient?: boolean;
}

export function SticketProgress({ 
  value, 
  showLabel = false,
  className = '',
  gradient = true
}: SticketProgressProps) {
  const percentage = Math.min(100, Math.max(0, value));
  
  return (
    <div className={`w-full ${className}`}>
      <div className="w-full h-2 bg-[#12132D] rounded-full overflow-hidden border border-[#2A2B4D]">
        <div 
          className={`h-full transition-all duration-300 ${gradient ? 'bg-gradient-to-r from-[#00D4FF] via-[#8B5CF6] to-[#E879F9]' : 'bg-[#8B5CF6]'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="mt-2 text-right text-[#A1A1C7] text-[14px]">
          {percentage}%
        </div>
      )}
    </div>
  );
}
