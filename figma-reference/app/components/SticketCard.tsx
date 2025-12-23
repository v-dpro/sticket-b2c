import React from 'react';

interface SticketCardProps {
  children: React.ReactNode;
  className?: string;
  elevated?: boolean;
  noBorder?: boolean;
  onClick?: () => void;
}

export function SticketCard({ 
  children, 
  className = '',
  elevated = false,
  noBorder = false,
  onClick 
}: SticketCardProps) {
  const bgColor = elevated ? 'bg-[#1A1B3D]' : 'bg-[#12132D]';
  const border = noBorder ? '' : 'border border-[#2A2B4D]';
  const interactive = onClick ? 'cursor-pointer hover:border-[#00D4FF]/30 transition-all duration-200' : '';
  
  return (
    <div 
      className={`rounded-xl ${bgColor} ${border} ${interactive} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
