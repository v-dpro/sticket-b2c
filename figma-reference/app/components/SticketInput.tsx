import React from 'react';

interface SticketInputProps {
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  className?: string;
  icon?: React.ReactNode;
}

export function SticketInput({ 
  placeholder, 
  value, 
  onChange, 
  type = 'text',
  className = '',
  icon
}: SticketInputProps) {
  return (
    <div className={`relative ${className}`}>
      {icon && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B6B8D]">
          {icon}
        </div>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`w-full bg-[#12132D] border border-[#2A2B4D] rounded-lg px-4 py-3 text-white placeholder:text-[#6B6B8D] focus:outline-none focus:border-[#00D4FF] focus:ring-2 focus:ring-[#00D4FF]/20 transition-all ${icon ? 'pl-12' : ''}`}
      />
    </div>
  );
}
