import React from 'react';

interface SticketButtonProps {
  children: React.ReactNode;
  variant?: 'gradient' | 'purple' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export function SticketButton({ 
  children, 
  variant = 'gradient', 
  size = 'md',
  className = '',
  onClick,
  disabled = false
}: SticketButtonProps) {
  const baseStyles = "rounded-lg transition-all duration-200 flex items-center justify-center gap-2";
  
  const sizeStyles = {
    sm: "px-4 py-2 text-[14px]",
    md: "px-6 py-3 text-[16px]",
    lg: "px-8 py-4 text-[16px]"
  };
  
  const variantStyles = {
    gradient: "bg-gradient-to-br from-[#8B5CF6] to-[#E879F9] text-white font-semibold hover:shadow-lg hover:shadow-purple-500/30 active:scale-95",
    purple: "bg-[#8B5CF6] text-white font-semibold hover:bg-[#7C3AED] active:scale-95",
    outline: "border-2 border-[#2A2B4D] text-[#A1A1C7] hover:border-[#00D4FF] hover:text-[#00D4FF] hover:shadow-lg hover:shadow-cyan-500/20",
    ghost: "text-[#A1A1C7] hover:text-[#00D4FF] hover:bg-[#12132D]"
  };
  
  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
