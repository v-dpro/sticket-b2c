import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8">
      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#00D4FF]/10 via-[#8B5CF6]/10 to-[#E879F9]/10 flex items-center justify-center mb-6">
        <Icon className="w-16 h-16 text-[#6B6B8D]" />
      </div>
      <h2 className="text-white text-[20px] font-bold mb-2 text-center">
        {title}
      </h2>
      <p className="text-[#A1A1C7] text-[14px] mb-8 text-center">
        {subtitle}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-8 py-4 rounded-xl bg-gradient-to-r from-[#00D4FF] via-[#8B5CF6] to-[#E879F9] text-white font-semibold text-[15px] shadow-lg shadow-[#8B5CF6]/30"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
