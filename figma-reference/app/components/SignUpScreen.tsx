import React from 'react';
import { Eye, EyeOff, Music, Check } from 'lucide-react';

interface SignUpScreenProps {
  onSignUp?: (email: string, username: string, password: string) => void;
  onLogin?: () => void;
  onSocialSignUp?: (provider: 'apple' | 'google') => void;
}

export function SignUpScreen({
  onSignUp,
  onLogin,
  onSocialSignUp,
}: SignUpScreenProps) {
  const [email, setEmail] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [agreedToTerms, setAgreedToTerms] = React.useState(false);

  const passwordRequirements = [
    { text: 'At least 8 characters', met: password.length >= 8 },
    { text: 'Contains a number', met: /\d/.test(password) },
    {
      text: 'Contains uppercase & lowercase',
      met: /[a-z]/.test(password) && /[A-Z]/.test(password),
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (agreedToTerms) {
      onSignUp?.(email, username, password);
    }
  };

  return (
    <div className="w-[390px] h-[844px] bg-[#0A0B1E] overflow-hidden flex flex-col">
      <div className="flex-1 px-6 pt-16 pb-8 overflow-y-auto">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#00D4FF] via-[#8B5CF6] to-[#E879F9] flex items-center justify-center">
            <Music className="w-10 h-10 text-white" />
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-white text-[32px] font-bold mb-2">
            Create account
          </h1>
          <p className="text-[#A1A1C7] text-[16px]">
            Start tracking your concert journey
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          {/* Email Input */}
          <div>
            <label className="block text-[#A1A1C7] text-[14px] font-medium mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-4 bg-[#12132D] border border-[#2A2B4D] rounded-xl text-white placeholder:text-[#6B6B8D] focus:outline-none focus:border-[#8B5CF6] transition-colors"
            />
          </div>

          {/* Username Input */}
          <div>
            <label className="block text-[#A1A1C7] text-[14px] font-medium mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))
              }
              placeholder="username"
              className="w-full px-4 py-4 bg-[#12132D] border border-[#2A2B4D] rounded-xl text-white placeholder:text-[#6B6B8D] focus:outline-none focus:border-[#8B5CF6] transition-colors"
            />
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-[#A1A1C7] text-[14px] font-medium mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-4 pr-12 bg-[#12132D] border border-[#2A2B4D] rounded-xl text-white placeholder:text-[#6B6B8D] focus:outline-none focus:border-[#8B5CF6] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B6B8D] hover:text-[#A1A1C7]"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Password Requirements */}
            {password && (
              <div className="mt-3 space-y-1">
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
            )}
          </div>

          {/* Terms Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer">
            <div className="flex-shrink-0 mt-0.5">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="sr-only"
              />
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                  agreedToTerms
                    ? 'bg-[#8B5CF6] border-[#8B5CF6]'
                    : 'border-[#2A2B4D]'
                }`}
              >
                {agreedToTerms && <Check className="w-3.5 h-3.5 text-white" />}
              </div>
            </div>
            <span className="text-[#A1A1C7] text-[13px]">
              I agree to the{' '}
              <button type="button" className="text-[#00D4FF] underline">
                Terms of Service
              </button>{' '}
              and{' '}
              <button type="button" className="text-[#00D4FF] underline">
                Privacy Policy
              </button>
            </span>
          </label>

          {/* Sign Up Button */}
          <button
            type="submit"
            disabled={!agreedToTerms}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-[#00D4FF] via-[#8B5CF6] to-[#E879F9] text-white font-semibold text-[15px] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#8B5CF6]/30"
          >
            Create Account
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-[#2A2B4D]" />
          <span className="text-[#6B6B8D] text-[14px]">or continue with</span>
          <div className="flex-1 h-px bg-[#2A2B4D]" />
        </div>

        {/* Social Sign Up */}
        <div className="space-y-3 mb-6">
          <button
            onClick={() => onSocialSignUp?.('apple')}
            className="w-full py-4 rounded-xl bg-[#12132D] border border-[#2A2B4D] text-white font-semibold text-[15px] flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            Continue with Apple
          </button>
          <button
            onClick={() => onSocialSignUp?.('google')}
            className="w-full py-4 rounded-xl bg-[#12132D] border border-[#2A2B4D] text-white font-semibold text-[15px] flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>
        </div>

        {/* Login Link */}
        <div className="text-center">
          <span className="text-[#A1A1C7] text-[14px]">
            Already have an account?{' '}
          </span>
          <button
            onClick={onLogin}
            className="text-[#00D4FF] text-[14px] font-semibold"
          >
            Log In
          </button>
        </div>
      </div>
    </div>
  );
}
