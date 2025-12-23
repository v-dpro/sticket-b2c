import { SticketButton } from './SticketButton';
import sticketLogo from 'figma:asset/a9e9da417b8254271adf4298c07431556a6fc57f.png';

export function WelcomeScreen() {
  return (
    <div className="relative w-[390px] h-[844px] bg-[#0A0B1E] mx-auto flex flex-col items-center justify-between overflow-hidden">
      
      {/* Subtle animated glow effect behind logo */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-gradient-to-br from-[#00D4FF]/20 via-[#8B5CF6]/20 to-[#E879F9]/20 blur-[80px] rounded-full animate-pulse"></div>
      
      {/* Center content */}
      <div className="flex-1 flex flex-col items-center justify-center z-10">
        
        {/* Sticket Logo */}
        <div className="relative mb-8">
          <img 
            src={sticketLogo} 
            alt="Sticket Logo" 
            className="w-[120px] h-[120px] object-contain drop-shadow-[0_0_30px_rgba(139,92,246,0.5)]" 
          />
        </div>
        
        {/* Wordmark */}
        <h1 className="text-white text-[28px] font-bold tracking-[0.08em] mb-3">
          STICKET
        </h1>
        
        {/* Tagline */}
        <p className="text-[#A1A1C7] text-[16px]">
          Never miss a show
        </p>
      </div>
      
      {/* Bottom CTA section */}
      <div className="w-full px-6 pb-12 z-10">
        {/* Get Started Button */}
        <div className="mb-4">
          <SticketButton 
            variant="gradient" 
            className="w-full h-[52px] text-[16px]"
          >
            Get Started
          </SticketButton>
        </div>
        
        {/* Login link */}
        <p className="text-center text-[#A1A1C7] text-[14px]">
          Already have an account?{' '}
          <button className="text-[#00D4FF] font-semibold hover:underline transition-all">
            Log in
          </button>
        </p>
      </div>
    </div>
  );
}