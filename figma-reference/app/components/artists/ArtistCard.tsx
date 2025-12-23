import React from 'react';
import { ChevronRight } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { StatusPill } from '../shared/StatusPill';
import { TierBadge } from '../shared/TierBadge';
import { CodeDisplay } from '../shared/CodeDisplay';

interface ArtistCardProps {
  name: string;
  image: string;
  seenCount?: number;
  lastSeen?: string;
  isTopTier?: boolean;
  hasTicket?: boolean;
  ticketDate?: string;
  hasPresale?: boolean;
  presaleType?: string;
  presaleCode?: string;
  upcomingDate?: string;
  variant?: 'full' | 'compact';
  onClick?: () => void;
}

export function ArtistCard({
  name,
  image,
  seenCount,
  lastSeen,
  isTopTier = false,
  hasTicket = false,
  ticketDate,
  hasPresale = false,
  presaleType,
  presaleCode,
  upcomingDate,
  variant = 'full',
  onClick,
}: ArtistCardProps) {
  if (variant === 'compact') {
    return (
      <button
        onClick={onClick}
        className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#1A1A2E] border border-[#2D2D4A] hover:bg-[#252542] transition-colors"
      >
        <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0">
          <ImageWithFallback
            src={image}
            alt={name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 text-left min-w-0">
          <h3 className="text-white font-bold text-[14px] mb-1 truncate">
            {name}
          </h3>
          <p className="text-[#6B6B8D] text-[12px] truncate">
            {seenCount ? `Seen ${seenCount}x · Last: ${lastSeen}` : 'Not seen yet'}
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-[#6B6B8D] flex-shrink-0" />
      </button>
    );
  }

  const hasLeftAccent = hasTicket || hasPresale;
  const accentColor = hasTicket ? 'border-l-[#00D4FF]' : 'border-l-[#8B5CF6]';

  return (
    <button
      onClick={onClick}
      className={`w-full p-4 rounded-xl bg-[#1A1A2E] border border-[#2D2D4A] hover:bg-[#252542] transition-colors text-left ${
        hasLeftAccent ? `border-l-2 ${accentColor}` : ''
      }`}
    >
      {/* Header Row */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0">
          <ImageWithFallback
            src={image}
            alt={name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-white font-bold text-[16px] truncate flex-1">
              {name}
            </h3>
            {isTopTier && <TierBadge />}
          </div>
          <p className="text-[#6B6B8D] text-[13px]">
            {seenCount
              ? `Seen ${seenCount}x · Last: ${lastSeen}`
              : 'Not seen yet'}
          </p>
        </div>
      </div>

      {/* Status Badges */}
      {(hasTicket || hasPresale || upcomingDate) && (
        <div className="flex flex-wrap gap-2 mb-3">
          {hasTicket && ticketDate && (
            <StatusPill type="ticket" label={ticketDate} />
          )}
          {hasPresale && presaleType && (
            <StatusPill type="presale" label={presaleType} />
          )}
          {upcomingDate && (
            <StatusPill type="upcoming" label={upcomingDate} />
          )}
        </div>
      )}

      {/* Presale Code */}
      {hasPresale && presaleCode && (
        <div className="pt-3 border-t border-[#2D2D4A]">
          <CodeDisplay code={presaleCode} />
        </div>
      )}
    </button>
  );
}
