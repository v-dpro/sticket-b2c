import React from 'react';
import { ArrowLeft, Bell, ArrowRight, MapPin } from 'lucide-react';
import { StatusPill } from '../shared/StatusPill';
import { CodeDisplay } from '../shared/CodeDisplay';
import { SignupWarning } from '../shared/SignupWarning';

interface Presale {
  id: number;
  artist: string;
  tour: string;
  venue: string;
  city: string;
  presaleType: string;
  presaleDate: string;
  code?: string;
  deadline?: string;
}

interface PresalePreviewScreenProps {
  onBack?: () => void;
  onContinue?: () => void;
  onSkip?: () => void;
  onNotifyPresales?: () => void;
}

export function PresalePreviewScreen({
  onBack,
  onContinue,
  onSkip,
  onNotifyPresales,
}: PresalePreviewScreenProps) {
  const presales: Presale[] = [
    {
      id: 1,
      artist: 'Taylor Swift',
      tour: 'Eras Tour - The Finale',
      venue: 'SoFi Stadium',
      city: 'Los Angeles',
      presaleType: 'Verified Fan',
      presaleDate: 'Jan 15 at 10:00 AM',
      code: 'ERASTOUR24',
      deadline: 'Jan 10',
    },
    {
      id: 2,
      artist: 'The Weeknd',
      tour: 'After Hours Til Dawn',
      venue: 'Madison Square Garden',
      city: 'New York',
      presaleType: 'Presale',
      presaleDate: 'Jan 12 at 12:00 PM',
    },
  ];

  const hasPresales = presales.length > 0;

  return (
    <div className="w-[390px] h-[844px] bg-[#0A0B1E] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-6 pt-12 pb-4 flex items-center justify-between">
        <button onClick={onBack} className="p-2 -ml-2">
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
        <span className="text-[#6B6B8D] text-[13px] font-semibold">
          Step 4 of 6
        </span>
      </div>

      {/* Title Section */}
      <div className="px-6 pb-6 text-center">
        <div className="text-[48px] mb-4">{hasPresales ? '🎉' : '🎫'}</div>
        <h1 className="text-white text-[28px] font-black mb-2">
          {hasPresales ? 'Good news!' : 'No presales right now'}
        </h1>
        <p className="text-[#A0A0B8] text-[15px]">
          {hasPresales
            ? `We found ${presales.length} upcoming presales for your artists`
            : "We'll notify you when your artists announce presales"}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {hasPresales ? (
          <div className="space-y-4">
            {presales.map((presale) => (
              <div
                key={presale.id}
                className="p-4 rounded-2xl bg-[#1A1A2E] border border-[#2D2D4A]"
              >
                {/* Artist & Tour */}
                <h3 className="text-white text-[18px] font-bold mb-1">
                  {presale.artist}
                </h3>
                <p className="text-[#A0A0B8] text-[15px] mb-3">{presale.tour}</p>

                {/* Venue */}
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-[#6B6B8D]" />
                  <span className="text-[#A0A0B8] text-[14px]">
                    {presale.venue}, {presale.city}
                  </span>
                </div>

                {/* Presale Info */}
                <div className="flex items-center gap-2 mb-3">
                  <StatusPill type="presale" label={presale.presaleType} />
                  <span className="text-[#A0A0B8] text-[13px]">
                    {presale.presaleDate}
                  </span>
                </div>

                {/* Code */}
                {presale.code && (
                  <div className="mb-3">
                    <CodeDisplay code={presale.code} />
                  </div>
                )}

                {/* Deadline Warning */}
                {presale.deadline && (
                  <SignupWarning deadline={presale.deadline} />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-[280px]">
              <p className="text-[#6B6B8D] text-[15px]">
                Check back soon or we'll send you a notification when presales are
                announced
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-6 bg-[#0A0B1E] border-t border-[#2D2D4A]">
        {hasPresales ? (
          <>
            <button
              onClick={onNotifyPresales}
              className="w-full py-4 mb-3 rounded-xl bg-[#8B5CF6] text-white font-bold text-[16px] flex items-center justify-center gap-2"
            >
              <Bell className="w-5 h-5" />
              Notify me for these presales
            </button>
            <button
              onClick={onSkip}
              className="w-full py-2 text-[#A0A0B8] font-semibold text-[14px] flex items-center justify-center gap-2"
            >
              Skip for now
              <ArrowRight className="w-4 h-4" />
            </button>
          </>
        ) : (
          <button
            onClick={onContinue}
            className="w-full py-4 rounded-xl bg-[#8B5CF6] text-white font-bold text-[16px] flex items-center justify-center gap-2"
          >
            Continue
            <ArrowRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
