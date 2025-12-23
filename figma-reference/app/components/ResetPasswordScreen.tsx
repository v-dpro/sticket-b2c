import React from 'react';
import { Eye, EyeOff, Check } from 'lucide-react';

interface ResetPasswordScreenProps {
  onResetPassword?: (newPassword: string) => void;
}

export function ResetPasswordScreen({
  onResetPassword,
}: ResetPasswordScreenProps) {
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const passwordRequirements = [
    { text: 'At least 8 characters', met: newPassword.length >= 8 },
    { text: 'Contains a number', met: /\d/.test(newPassword) },
    {
      text: 'Contains uppercase & lowercase',
      met: /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword),
    },
  ];

  const passwordsMatch = newPassword && newPassword === confirmPassword;
  const allRequirementsMet = passwordRequirements.every((req) => req.met);
  const canSubmit = allRequirementsMet && passwordsMatch;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) {
      onResetPassword?.(newPassword);
    }
  };

  return (
    <div className="w-[390px] h-[844px] bg-[#0A0B1E] overflow-hidden flex flex-col">
      <div className="flex-1 px-6 pt-16 pb-8 overflow-y-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-white text-[32px] font-bold mb-3">
            New password
          </h1>
          <p className="text-[#A1A1C7] text-[16px]">
            Create a new password for your account
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New Password Input */}
          <div>
            <label className="block text-[#A1A1C7] text-[14px] font-medium mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-4 pr-12 bg-[#12132D] border border-[#2A2B4D] rounded-xl text-white placeholder:text-[#6B6B8D] focus:outline-none focus:border-[#8B5CF6] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B6B8D] hover:text-[#A1A1C7]"
              >
                {showNewPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password Input */}
          <div>
            <label className="block text-[#A1A1C7] text-[14px] font-medium mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full px-4 py-4 pr-12 bg-[#12132D] border rounded-xl text-white placeholder:text-[#6B6B8D] focus:outline-none transition-colors ${
                  confirmPassword && !passwordsMatch
                    ? 'border-[#EF4444] focus:border-[#EF4444]'
                    : 'border-[#2A2B4D] focus:border-[#8B5CF6]'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B6B8D] hover:text-[#A1A1C7]"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {confirmPassword && !passwordsMatch && (
              <p className="mt-2 text-[#EF4444] text-[12px]">
                Passwords don't match
              </p>
            )}
          </div>

          {/* Password Requirements */}
          <div className="bg-[#12132D] border border-[#2A2B4D] rounded-xl p-4">
            <p className="text-[#A1A1C7] text-[13px] font-medium mb-3">
              Password must contain:
            </p>
            <div className="space-y-2">
              {passwordRequirements.map((req, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      req.met ? 'bg-[#22C55E]' : 'bg-[#2A2B4D]'
                    }`}
                  >
                    {req.met && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span
                    className={`text-[12px] ${
                      req.met ? 'text-[#22C55E]' : 'text-[#6B6B8D]'
                    }`}
                  >
                    {req.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Reset Button */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-[#00D4FF] via-[#8B5CF6] to-[#E879F9] text-white font-semibold text-[15px] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#8B5CF6]/30"
          >
            Reset Password
          </button>
        </form>
      </div>
    </div>
  );
}
