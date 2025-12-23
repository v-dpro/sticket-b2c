import React from 'react';
import {
  CheckCircle,
  Ticket,
  Eye,
  Bell,
  Star,
  ChevronRight,
  MapPin,
} from 'lucide-react';
import { StatusPill } from '../shared/StatusPill';
import { CodeDisplay } from '../shared/CodeDisplay';
import { SignupWarning } from '../shared/SignupWarning';

export type TimelineCardType = 'log' | 'ticket' | 'tracking' | 'presale';

interface TimelineCardProps {
  type: TimelineCardType;
  artist: string;
  venue: string;
  city: string;
  date: string;
  rating?: number;
  note?: string;
  section?: string;
  row?: string;
  seat?: string;
  maxPrice?: string;
  presaleType?: string;
  presaleCode?: string;
  presaleDeadline?: string;
  isToday?: boolean;
  onClick?: () => void;
}

export function TimelineCard({
  type,
  artist,
  venue,
  city,
  date,
  rating,
  note,
  section,
  row,
  seat,
  maxPrice,
  presaleType,
  presaleCode,
  presaleDeadline,
  isToday = false,
  onClick,
}: TimelineCardProps) {
  const getTypeConfig = () => {
    switch (type) {
      case 'log':
        return {
          Icon: CheckCircle,
          color: 'text-[#22C55E]',
          bg: 'bg-[#22C55E]',
          badgeLabel: 'Attended',
          badgeType: 'upcoming' as const,
        };
      case 'ticket':
        return {
          Icon: Ticket,
          color: 'text-[#00D4FF]',
          bg: 'bg-[#00D4FF]',
          badgeLabel: 'Ticket',
          badgeType: 'ticket' as const,
        };
      case 'tracking':
        return {
          Icon: Eye,
          color: 'text-[#F59E0B]',
          bg: 'bg-[#F59E0B]',
          badgeLabel: 'Watching',
          badgeType: 'tracking' as const,
        };
      case 'presale':
        return {
          Icon: Bell,
          color: 'text-[#8B5CF6]',
          bg: 'bg-[#8B5CF6]',
          badgeLabel: presaleType || 'Presale',
          badgeType: 'presale' as const,
        };
    }
  };

  const { Icon, color, bg, badgeLabel, badgeType } = getTypeConfig();

  return (
    <button
      onClick={onClick}
      className="w-full p-4 rounded-2xl bg-[#1A1A2E] border border-[#2D2D4A] text-left hover:bg-[#252542] transition-colors"
    >
      <div className="flex gap-3">
        {/* Type Indicator */}
        <div className={`w-3 h-3 rounded-full ${bg} mt-1 flex-shrink-0`} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-white font-bold text-[16px] flex-1 truncate">
              {artist}
            </h3>
            <StatusPill type={badgeType} label={badgeLabel} />
          </div>

          {/* Venue & City */}
          <p className="text-[#A0A0B8] text-[14px] mb-1 truncate">
            {venue}, {city}
          </p>

          {/* Date */}
          <p className="text-[#A0A0B8] text-[13px] mb-2">
            {date}
            {isToday && (
              <span className="ml-2 text-[#00D4FF] font-bold">Today!</span>
            )}
          </p>

          {/* Type-specific content */}
          {type === 'log' && rating && (
            <div className="flex gap-1 mb-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < rating
                      ? 'text-[#FFD700] fill-[#FFD700]'
                      : 'text-[#3D3D5C]'
                  }`}
                />
              ))}
            </div>
          )}

          {type === 'log' && note && (
            <p className="text-[#A0A0B8] text-[13px] italic line-clamp-2">
              "{note}"
            </p>
          )}

          {type === 'ticket' && section && row && seat && (
            <p className="text-[#00D4FF] text-[13px] font-semibold">
              Sec {section} · Row {row} · Seat {seat}
            </p>
          )}

          {type === 'tracking' && maxPrice && (
            <p className="text-[#A0A0B8] text-[13px]">
              Max price: <span className="text-white font-bold">${maxPrice}</span>
            </p>
          )}

          {type === 'presale' && presaleCode && (
            <div className="mt-3">
              <CodeDisplay code={presaleCode} />
            </div>
          )}

          {type === 'presale' && presaleDeadline && (
            <div className="mt-2">
              <SignupWarning deadline={presaleDeadline} />
            </div>
          )}
        </div>

        {/* Chevron */}
        <ChevronRight className="w-5 h-5 text-[#6B6B8D] flex-shrink-0 mt-1" />
      </div>
    </button>
  );
}
