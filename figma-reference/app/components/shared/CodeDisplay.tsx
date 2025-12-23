import React from 'react';

interface CodeDisplayProps {
  code: string;
  className?: string;
}

export function CodeDisplay({ code, className = '' }: CodeDisplayProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <p className="text-[#A0A0B8] text-[12px]">Code:</p>
      <div className="inline-block px-4 py-2 rounded-lg bg-[#8B5CF6] border border-[#8B5CF6]/30">
        <span className="text-white text-[14px] font-bold font-mono">
          {code}
        </span>
      </div>
    </div>
  );
}
