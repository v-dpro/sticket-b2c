import React from 'react';
import { ArrowLeft, Share2, Calendar, MapPin, MoreVertical, Download } from 'lucide-react';

interface TicketDetailScreenProps {
  ticket?: {
    artist: string;
    venue: string;
    city: string;
    date: string;
    time: string;
    section: string;
    row: string;
    seat: string;
    barcode: string;
    isGA?: boolean;
  };
  onBack?: () => void;
  onShare?: () => void;
  onAddToCalendar?: () => void;
  onDelete?: () => void;
}

const defaultTicket = {
  artist: 'The Weeknd',
  venue: 'SoFi Stadium',
  city: 'Inglewood, CA',
  date: 'February 10, 2025',
  time: '8:00 PM',
  section: '102',
  row: 'A',
  seat: '5',
  barcode: '847293847102',
};

export function TicketDetailScreen({
  ticket = defaultTicket,
  onBack,
  onShare,
  onAddToCalendar,
  onDelete,
}: TicketDetailScreenProps) {
  const [brightness, setBrightness] = React.useState(100);
  const [showMenu, setShowMenu] = React.useState(false);

  return (
    <div className="w-[390px] h-[844px] bg-[#0A0B1E] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-6 pt-12 pb-4 flex items-center justify-between">
        <button onClick={onBack} className="text-white">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-3">
          <button onClick={onShare} className="text-white">
            <Share2 className="w-5 h-5" />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="text-white"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-8 w-48 bg-[#12132D] border border-[#2A2B4D] rounded-lg shadow-xl overflow-hidden z-10">
                <button
                  onClick={onAddToCalendar}
                  className="w-full px-4 py-3 text-left text-white text-[14px] hover:bg-[#1A1B3D] flex items-center gap-3"
                >
                  <Calendar className="w-4 h-4" />
                  Add to Calendar
                </button>
                <button
                  onClick={() => {}}
                  className="w-full px-4 py-3 text-left text-white text-[14px] hover:bg-[#1A1B3D] flex items-center gap-3"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                <button
                  onClick={onDelete}
                  className="w-full px-4 py-3 text-left text-[#EF4444] text-[14px] hover:bg-[#1A1B3D]"
                >
                  Delete Ticket
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 pb-6 flex flex-col items-center justify-center">
        {/* Event Info */}
        <div className="w-full mb-8 text-center">
          <h1 className="text-white text-[28px] font-bold mb-2">
            {ticket.artist}
          </h1>
          <div className="flex items-center justify-center gap-2 text-[#A1A1C7] text-[16px] mb-1">
            <MapPin className="w-5 h-5" />
            <span>{ticket.venue}</span>
          </div>
          <p className="text-[#6B6B8D] text-[14px]">{ticket.city}</p>
        </div>

        {/* Barcode Display */}
        <div
          className="w-full max-w-sm mb-8 p-8 bg-white rounded-2xl"
          style={{ opacity: brightness / 100 }}
        >
          <div className="text-center mb-6">
            <p className="text-black font-bold text-[18px] mb-1">
              {ticket.date}
            </p>
            <p className="text-gray-600 text-[14px]">{ticket.time}</p>
          </div>

          {/* Barcode */}
          <div className="mb-6 flex justify-center gap-0.5">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="w-1.5 bg-black"
                style={{
                  height: `${60 + Math.random() * 20}px`,
                }}
              />
            ))}
          </div>
          <p className="text-black text-center font-mono text-[12px] mb-6">
            {ticket.barcode}
          </p>

          {/* Seat Info */}
          <div className="border-t border-gray-200 pt-4">
            {ticket.isGA ? (
              <p className="text-black text-center font-semibold text-[16px]">
                General Admission
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-gray-600 text-[10px] mb-1">SECTION</p>
                  <p className="text-black font-bold text-[16px]">
                    {ticket.section}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-[10px] mb-1">ROW</p>
                  <p className="text-black font-bold text-[16px]">
                    {ticket.row}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-[10px] mb-1">SEAT</p>
                  <p className="text-black font-bold text-[16px]">
                    {ticket.seat}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Brightness Slider */}
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#A1A1C7] text-[13px]">Brightness</span>
            <span className="text-white text-[13px] font-medium">
              {brightness}%
            </span>
          </div>
          <input
            type="range"
            min="30"
            max="100"
            value={brightness}
            onChange={(e) => setBrightness(parseInt(e.target.value))}
            className="w-full h-2 rounded-full bg-[#2A2B4D] appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #8B5CF6 0%, #8B5CF6 ${brightness}%, #2A2B4D ${brightness}%, #2A2B4D 100%)`,
            }}
          />
        </div>

        {/* Instructions */}
        <div className="w-full max-w-sm mt-8 p-4 bg-[#12132D] border border-[#2A2B4D] rounded-xl">
          <p className="text-[#6B6B8D] text-[13px] text-center">
            Show this code at the venue entrance. Tap to adjust brightness for
            easier scanning.
          </p>
        </div>
      </div>
    </div>
  );
}
