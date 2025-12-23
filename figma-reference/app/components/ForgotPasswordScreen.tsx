import React from 'react';
import { ArrowLeft, Mail } from 'lucide-react';

interface ForgotPasswordScreenProps {
  onSendReset?: (email: string) => void;
  onBack?: () => void;
}

export function ForgotPasswordScreen({
  onSendReset,
  onBack,
}: ForgotPasswordScreenProps) {
  const [email, setEmail] = React.useState('');
  const [sent, setSent] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSendReset?.(email);
    setSent(true);
  };

  return (
    <div className="w-[390px] h-[844px] bg-[#0A0B1E] overflow-hidden flex flex-col">
      <div className="flex-1 px-6 pt-16 pb-8">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="mb-8 flex items-center gap-2 text-[#A1A1C7] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-[14px] font-medium">Back to Login</span>
        </button>

        {!sent ? (
          <>
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-white text-[32px] font-bold mb-3">
                Reset password
              </h1>
              <p className="text-[#A1A1C7] text-[16px]">
                Enter your email and we'll send you a link to reset your
                password
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
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

              <button
                type="submit"
                className="w-full py-4 rounded-xl bg-gradient-to-r from-[#00D4FF] via-[#8B5CF6] to-[#E879F9] text-white font-semibold text-[15px] shadow-lg shadow-[#8B5CF6]/30"
              >
                Send Reset Link
              </button>
            </form>
          </>
        ) : (
          <>
            {/* Success State */}
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#00D4FF]/20 via-[#8B5CF6]/20 to-[#E879F9]/20 flex items-center justify-center">
                <Mail className="w-12 h-12 text-[#8B5CF6]" />
              </div>
              <h2 className="text-white text-[24px] font-bold mb-3">
                Check your email
              </h2>
              <p className="text-[#A1A1C7] text-[16px] mb-2">
                We sent a password reset link to
              </p>
              <p className="text-white font-semibold text-[16px] mb-8">
                {email}
              </p>
              <p className="text-[#6B6B8D] text-[14px] mb-8">
                Didn't receive the email? Check your spam folder or try again
              </p>
              <button
                onClick={() => setSent(false)}
                className="text-[#00D4FF] font-semibold text-[15px]"
              >
                Send again
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
