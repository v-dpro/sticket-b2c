import React from 'react';
import { Music, Sparkles, TrendingUp, Check } from 'lucide-react';

interface ConnectSpotifyScreenProps {
  onConnect?: () => void;
  onSkip?: () => void;
}

const benefits = [
  {
    icon: Music,
    title: 'Personalized Recommendations',
    description: 'Get show alerts for artists you actually listen to',
  },
  {
    icon: Sparkles,
    title: 'Auto-Sync Concerts',
    description: 'We\'ll suggest shows from your top artists',
  },
  {
    icon: TrendingUp,
    title: 'Better Discovery',
    description: 'Find concerts based on your music taste',
  },
];

export function ConnectSpotifyScreen({
  onConnect,
  onSkip,
}: ConnectSpotifyScreenProps) {
  return (
    <div className="w-[390px] h-[844px] bg-[#0A0B1E] overflow-hidden flex flex-col">
      {/* Content */}
      <div className="flex-1 px-6 pt-16 pb-8 overflow-y-auto">
        {/* Spotify Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-24 h-24 rounded-full bg-[#1DB954] flex items-center justify-center">
            <svg
              className="w-14 h-14 text-white"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
            </svg>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-white text-[32px] font-bold mb-3">
            Connect your music
          </h1>
          <p className="text-[#A1A1C7] text-[16px]">
            Get personalized show recommendations
          </p>
        </div>

        {/* Benefits List */}
        <div className="space-y-6 mb-8">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div key={index} className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-[#00D4FF]/20 via-[#8B5CF6]/20 to-[#E879F9]/20 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-[#8B5CF6]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold text-[16px] mb-1">
                    {benefit.title}
                  </h3>
                  <p className="text-[#A1A1C7] text-[14px]">
                    {benefit.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Privacy Note */}
        <div className="bg-[#12132D] border border-[#2A2B4D] rounded-xl p-4">
          <p className="text-[#6B6B8D] text-[13px] text-center">
            We only read your top artists and listening history. We never post
            or modify anything.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 pb-8 space-y-3">
        <button
          onClick={onConnect}
          className="w-full py-4 rounded-xl bg-[#1DB954] text-white font-semibold text-[15px] shadow-lg flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
          </svg>
          Connect Spotify
        </button>
        <button
          onClick={onSkip}
          className="w-full py-4 text-[#A1A1C7] font-medium text-[15px]"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}