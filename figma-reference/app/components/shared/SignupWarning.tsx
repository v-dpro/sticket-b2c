import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface SignupWarningProps {
  deadline: string;
  className?: string;
}

export function SignupWarning({ deadline, className = '' }: SignupWarningProps) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F59E0B]/10 ${className}`}
    >
      <AlertTriangle className="w-4 h-4 text-[#F59E0B] flex-shrink-0" />
      <span className="text-[#F59E0B] text-[13px] font-semibold">
        Signup required by {deadline}
      </span>
    </div>
  );
}
