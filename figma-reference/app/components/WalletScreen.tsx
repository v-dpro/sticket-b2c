import React from 'react';
import { Plus, ChevronDown, ChevronRight, Calendar, Send, DollarSign, Home, Search, Ticket as TicketIcon, User } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface TicketData {
  id: number;
  artist: string;
  venue: string;
  date: string;
  section: string;
  row: string;
  seat: string;
  status: 'keeping' | 'selling';
  image: string;
  barcode?: string;
}

interface WalletScreenProps {
  hasTickets?: boolean;
  onAddTicket?: () => void;
  onNavigate?: (screen: 'home' | 'search' | 'wallet' | 'profile') => void;
}

const upcomingTickets: TicketData[] = [
  {
    id: 1,
    artist: 'The Weeknd',
    venue: 'SoFi Stadium',
    date: 'Dec 15, 2024',
    section: '102',
    row: 'A',
    seat: '5',
    status: 'keeping',
    image: 'https://images.unsplash.com/photo-1575426220089-9e2ef7b0c9f4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25jZXJ0JTIwcGVyZm9ybWVyJTIwc3RhZ2V8ZW58MXx8fHwxNzY2MTY0MjMxfDA&ixlib=rb-4.1.0&q=80&w=200',
  },
  {
    id: 2,
    artist: 'Billie Eilish',
    venue: 'Barclays Center',
    date: 'Jan 8, 2025',
    section: '204',
    row: 'C',
    seat: '12',
    status: 'selling',
    image: 'https://images.unsplash.com/photo-1693835777292-cf103dcd2324?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtdXNpYyUyMGFydGlzdCUyMHBvcnRyYWl0fGVufDF8fHx8MTc2NjE0OTg2NHww&ixlib=rb-4.1.0&q=80&w=200',
  },
];

export function WalletScreen({
  hasTickets = true,
  onAddTicket,
  onNavigate,
}: WalletScreenProps) {
  const [expandedTicket, setExpandedTicket] = React.useState<number | null>(null);
  const [pastExpanded, setPastExpanded] = React.useState(false);

  const toggleTicket = (ticketId: number) => {
    setExpandedTicket(expandedTicket === ticketId ? null : ticketId);
  };

  return (
    <div className="w-[390px] h-[844px] bg-[#0A0B1E] overflow-hidden flex flex-col">
      {/* Header */}
      <header className="px-6 pt-12 pb-6 flex items-center justify-between">
        <h1 className="text-white text-[28px] font-bold">My Tickets</h1>
        <button
          onClick={onAddTicket}
          className="w-10 h-10 rounded-full bg-[#12132D] flex items-center justify-center text-white hover:bg-[#1A1B3D] transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-24">
        {hasTickets ? (
          <>
            {/* Upcoming Section */}
            <section className="mb-6">
              <h2 className="text-[#A1A1C7] text-[14px] font-medium mb-4">Upcoming</h2>
              <div className="space-y-3">
                {upcomingTickets.map((ticket) => {
                  const isExpanded = expandedTicket === ticket.id;
                  return (
                    <div
                      key={ticket.id}
                      className="relative p-[1px] rounded-2xl bg-gradient-to-br from-[#00D4FF]/20 via-[#8B5CF6]/20 to-[#E879F9]/20"
                    >
                      <div className="bg-[#12132D] rounded-2xl overflow-hidden">
                        {/* Card Header */}
                        <button
                          onClick={() => toggleTicket(ticket.id)}
                          className="w-full p-4 flex items-center gap-3 text-left"
                        >
                          {/* Artist Image */}
                          <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                            <ImageWithFallback
                              src={ticket.image}
                              alt={ticket.artist}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          {/* Ticket Info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-white font-bold text-[15px] mb-1 truncate">
                              {ticket.artist}
                            </h3>
                            <p className="text-[#A1A1C7] text-[13px] mb-0.5 truncate">
                              {ticket.venue} • {ticket.date}
                            </p>
                            <p className="text-[#6B6B8D] text-[11px]">
                              Sec {ticket.section} • Row {ticket.row} • Seat {ticket.seat}
                            </p>
                          </div>

                          {/* Status Badge */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span
                              className={`px-2 py-1 rounded-full text-[11px] font-medium ${
                                ticket.status === 'keeping'
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-orange-500/20 text-orange-400'
                              }`}
                            >
                              {ticket.status === 'keeping' ? 'Keeping' : 'Selling'}
                            </span>
                            <ChevronDown
                              className={`w-5 h-5 text-[#6B6B8D] transition-transform ${
                                isExpanded ? 'rotate-180' : ''
                              }`}
                            />
                          </div>
                        </button>

                        {/* Expanded Content */}
                        {isExpanded && (
                          <div className="px-4 pb-4 border-t border-[#2A2B4D]">
                            {/* Barcode/QR Code */}
                            <div className="my-4 p-6 bg-white rounded-lg flex items-center justify-center">
                              <div className="text-center">
                                <div className="mb-2 flex gap-1 justify-center">
                                  {Array.from({ length: 8 }).map((_, i) => (
                                    <div
                                      key={i}
                                      className="w-1 bg-black"
                                      style={{
                                        height: `${40 + Math.random() * 20}px`,
                                      }}
                                    />
                                  ))}
                                </div>
                                <p className="text-black text-[10px] font-mono">
                                  {ticket.id}847293847{ticket.section}
                                </p>
                              </div>
                            </div>

                            {/* Apple Wallet Button */}
                            <button className="w-full mb-4 py-3 rounded-xl bg-black text-white font-semibold text-[14px] flex items-center justify-center gap-2">
                              <svg
                                className="w-5 h-5"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                              </svg>
                              Add to Apple Wallet
                            </button>

                            {/* Action Buttons */}
                            <div className="flex gap-2">
                              <button className="flex-1 py-3 rounded-xl border border-[#2A2B4D] text-[#A1A1C7] font-medium text-[13px] flex items-center justify-center gap-2">
                                <DollarSign className="w-4 h-4" />
                                Sell
                              </button>
                              <button className="flex-1 py-3 rounded-xl border border-[#2A2B4D] text-[#A1A1C7] font-medium text-[13px] flex items-center justify-center gap-2">
                                <Send className="w-4 h-4" />
                                Transfer
                              </button>
                              <button className="flex-1 py-3 rounded-xl border border-[#2A2B4D] text-[#A1A1C7] font-medium text-[13px] flex items-center justify-center gap-2">
                                <Calendar className="w-4 h-4" />
                                Calendar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Past Section */}
            <section>
              <button
                onClick={() => setPastExpanded(!pastExpanded)}
                className="w-full flex items-center justify-between mb-4"
              >
                <h2 className="text-[#A1A1C7] text-[14px] font-medium">Past</h2>
                <div className="flex items-center gap-2">
                  <span className="text-[#6B6B8D] text-[13px]">4 past tickets</span>
                  <ChevronRight
                    className={`w-4 h-4 text-[#6B6B8D] transition-transform ${
                      pastExpanded ? 'rotate-90' : ''
                    }`}
                  />
                </div>
              </button>
              {pastExpanded && (
                <div className="bg-[#12132D] rounded-xl p-4">
                  <p className="text-[#6B6B8D] text-[14px] text-center">
                    Past tickets will appear here
                  </p>
                </div>
              )}
            </section>
          </>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center pt-20">
            {/* Ticket Illustration */}
            <div className="mb-8 relative">
              <div className="w-32 h-40 rounded-2xl bg-gradient-to-br from-[#00D4FF]/20 via-[#8B5CF6]/20 to-[#E879F9]/20 p-[2px]">
                <div className="w-full h-full rounded-2xl bg-[#12132D] flex items-center justify-center">
                  <TicketIcon className="w-16 h-16 text-[#6B6B8D]" />
                </div>
              </div>
              {/* Ticket notch circles */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#0A0B1E]" />
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-4 rounded-full bg-[#0A0B1E]" />
            </div>

            <h2 className="text-white text-[18px] font-semibold mb-2">
              No tickets yet
            </h2>
            <p className="text-[#A1A1C7] text-[14px] mb-1 text-center">
              Forward confirmation emails to
            </p>
            <button className="text-[#00D4FF] text-[14px] font-mono mb-6">
              tickets@sticket.in
            </button>
            <button className="text-[#A1A1C7] text-[14px] underline">
              How it works
            </button>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="absolute bottom-0 left-0 right-0 bg-[#12132D] border-t border-[#2A2B4D] px-6 py-4">
        <div className="flex items-center justify-around">
          <button
            onClick={() => onNavigate?.('home')}
            className="flex flex-col items-center gap-1 text-[#6B6B8D]"
          >
            <Home className="w-6 h-6" />
            <span className="text-[10px]">Home</span>
          </button>
          <button
            onClick={() => onNavigate?.('search')}
            className="flex flex-col items-center gap-1 text-[#6B6B8D]"
          >
            <Search className="w-6 h-6" />
            <span className="text-[10px]">Search</span>
          </button>
          <button
            onClick={() => onNavigate?.('wallet')}
            className="flex flex-col items-center gap-1 text-[#00D4FF]"
          >
            <TicketIcon className="w-6 h-6" />
            <span className="text-[10px]">Wallet</span>
          </button>
          <button
            onClick={() => onNavigate?.('profile')}
            className="flex flex-col items-center gap-1 text-[#6B6B8D]"
          >
            <User className="w-6 h-6" />
            <span className="text-[10px]">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
