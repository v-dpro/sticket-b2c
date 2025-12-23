import React from 'react';
import { Star } from 'lucide-react';

interface TierBadgeProps {
  className?: string;
}

export function TierBadge({ className = '' }: TierBadgeProps) {
  return (
    <div
      className={`w-6 h-6 rounded-full bg-[#FFD700]/20 flex items-center justify-center ${className}`}
    >
      <Star className="w-3 h-3 text-[#FFD700] fill-[#FFD700]" />
    </div>
  );
}
