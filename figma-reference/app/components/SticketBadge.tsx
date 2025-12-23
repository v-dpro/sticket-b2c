import React from 'react';

interface SticketBadgeProps {
  children: React.ReactNode;
  variant?: 'gradient' | 'cyan' | 'purple' | 'pink' | 'outlined';
  className?: string;
}

export function SticketBadge({ 
  children, 
  variant = 'cyan',
  className = ''
}: SticketBadgeProps) {
  const variantStyles = {
    gradient: "bg-gradient-to-r from-[#00D4FF] via-[#8B5CF6] to-[#E879F9] text-white",
    cyan: "bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/30",
    purple: "bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/30",
    pink: "bg-[#E879F9]/10 text-[#E879F9] border border-[#E879F9]/30",
    outlined: "border border-[#2A2B4D] text-[#A1A1C7]"
  };
  
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[12px] font-semibold ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
}
