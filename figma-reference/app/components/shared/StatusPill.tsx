import React from 'react';
import { Ticket, Bell, Calendar, Eye } from 'lucide-react';

export type StatusType = 'ticket' | 'presale' | 'upcoming' | 'tracking';

interface StatusPillProps {
  type: StatusType;
  label: string;
  className?: string;
}

export function StatusPill({ type, label, className = '' }: StatusPillProps) {
  const config = {
    ticket: {
      bg: 'bg-[#00D4FF]/15',
      text: 'text-[#00D4FF]',
      Icon: Ticket,
    },
    presale: {
      bg: 'bg-[#8B5CF6]/15',
      text: 'text-[#8B5CF6]',
      Icon: Bell,
    },
    upcoming: {
      bg: 'bg-[#252542]',
      text: 'text-[#A0A0B8]',
      Icon: Calendar,
    },
    tracking: {
      bg: 'bg-[#F59E0B]/15',
      text: 'text-[#F59E0B]',
      Icon: Eye,
    },
  };

  const { bg, text, Icon } = config[type];

  return (
    <div
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full ${bg} ${className}`}
    >
      <Icon className={`w-3 h-3 ${text}`} />
      <span className={`text-[11px] font-bold ${text}`}>{label}</span>
    </div>
  );
}
