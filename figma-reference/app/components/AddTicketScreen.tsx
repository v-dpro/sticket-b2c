import React from 'react';
import { ArrowLeft, Search, Calendar as CalendarIcon, MapPin, Music } from 'lucide-react';

interface AddTicketScreenProps {
  onBack?: () => void;
  onAddTicket?: (ticket: any) => void;
}

export function AddTicketScreen({ onBack, onAddTicket }: AddTicketScreenProps) {
  const [activeTab, setActiveTab] = React.useState<'search' | 'manual'>('search');
  const [searchQuery, setSearchQuery] = React.useState('');
  
  // Manual entry state
  const [artistName, setArtistName] = React.useState('');
  const [venueName, setVenueName] = React.useState('');
  const [date, setDate] = React.useState('');
  const [section, setSection] = React.useState('');
  const [row, setRow] = React.useState('');
  const [seat, setSeat] = React.useState('');
  const [isGA, setIsGA] = React.useState(false);
  const [barcode, setBarcode] = React.useState('');

  const searchResults = searchQuery ? [
    {
      id: 1,
      artist: 'The Weeknd',
      venue: 'SoFi Stadium',
      date: 'Feb 10, 2025',
      city: 'Inglewood, CA',
    },
    {
      id: 2,
      artist: 'The Weeknd',
      venue: 'Madison Square Garden',
      date: 'Feb 15, 2025',
      city: 'New York, NY',
    },
  ] : [];

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddTicket?.({
      artistName,
      venueName,
      date,
      section: isGA ? 'GA' : section,
      row,
      seat,
      barcode,
    });
  };

  return (
    <div className="w-[390px] h-[844px] bg-[#0A0B1E] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-6 pt-12 pb-4">
        <button
          onClick={onBack}
          className="mb-4 flex items-center gap-2 text-[#A1A1C7] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-[14px] font-medium">Back</span>
        </button>
        <h1 className="text-white text-[28px] font-bold">Add Ticket</h1>
      </div>

      {/* Tabs */}
      <div className="px-6 mb-4">
        <div className="flex gap-2 p-1 bg-[#12132D] rounded-lg">
          <button
            onClick={() => setActiveTab('search')}
            className={`flex-1 py-2 rounded-md font-medium text-[14px] transition-colors ${
              activeTab === 'search'
                ? 'bg-[#8B5CF6] text-white'
                : 'text-[#A1A1C7]'
            }`}
          >
            Search Event
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-2 rounded-md font-medium text-[14px] transition-colors ${
              activeTab === 'manual'
                ? 'bg-[#8B5CF6] text-white'
                : 'text-[#A1A1C7]'
            }`}
          >
            Manual Entry
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {activeTab === 'search' ? (
          <>
            {/* Search Tab */}
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B6B8D]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for an event..."
                className="w-full pl-12 pr-4 py-4 bg-[#12132D] border border-[#2A2B4D] rounded-xl text-white placeholder:text-[#6B6B8D] focus:outline-none focus:border-[#8B5CF6] transition-colors"
              />
            </div>

            {searchResults.length > 0 ? (
              <div className="space-y-3">
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => {}}
                    className="w-full p-4 bg-[#12132D] rounded-xl hover:bg-[#1A1B3D] transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-lg bg-[#1A1B3D] flex items-center justify-center flex-shrink-0">
                        <Music className="w-6 h-6 text-[#8B5CF6]" />
                      </div>
                      <div className="flex-1 text-left">
                        <h3 className="text-white font-bold text-[15px] mb-1">
                          {result.artist}
                        </h3>
                        <div className="flex items-center gap-2 text-[#A1A1C7] text-[13px] mb-0.5">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{result.venue}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[#6B6B8D] text-[12px]">
                          <CalendarIcon className="w-3.5 h-3.5" />
                          <span>{result.date}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : searchQuery ? (
              <div className="text-center py-12">
                <p className="text-[#6B6B8D] text-[14px]">
                  No events found. Try manual entry instead.
                </p>
              </div>
            ) : (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-[#6B6B8D] mx-auto mb-4" />
                <p className="text-[#6B6B8D] text-[14px]">
                  Search for your event to add ticket details
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Manual Tab */}
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-[#A1A1C7] text-[14px] font-medium mb-2">
                  Artist Name
                </label>
                <input
                  type="text"
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  placeholder="Who are you seeing?"
                  className="w-full px-4 py-4 bg-[#12132D] border border-[#2A2B4D] rounded-xl text-white placeholder:text-[#6B6B8D] focus:outline-none focus:border-[#8B5CF6] transition-colors"
                />
              </div>

              <div>
                <label className="block text-[#A1A1C7] text-[14px] font-medium mb-2">
                  Venue Name
                </label>
                <input
                  type="text"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  placeholder="Where is the show?"
                  className="w-full px-4 py-4 bg-[#12132D] border border-[#2A2B4D] rounded-xl text-white placeholder:text-[#6B6B8D] focus:outline-none focus:border-[#8B5CF6] transition-colors"
                />
              </div>

              <div>
                <label className="block text-[#A1A1C7] text-[14px] font-medium mb-2">
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-4 bg-[#12132D] border border-[#2A2B4D] rounded-xl text-white focus:outline-none focus:border-[#8B5CF6] transition-colors"
                />
              </div>

              {/* GA Toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isGA}
                  onChange={(e) => setIsGA(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-12 h-7 rounded-full transition-colors ${
                    isGA ? 'bg-[#8B5CF6]' : 'bg-[#2A2B4D]'
                  }`}
                >
                  <div
                    className={`w-6 h-6 mt-0.5 rounded-full bg-white transition-transform ${
                      isGA ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </div>
                <span className="text-white text-[15px]">General Admission</span>
              </label>

              {!isGA && (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[#A1A1C7] text-[14px] font-medium mb-2">
                      Section
                    </label>
                    <input
                      type="text"
                      value={section}
                      onChange={(e) => setSection(e.target.value)}
                      placeholder="102"
                      className="w-full px-4 py-4 bg-[#12132D] border border-[#2A2B4D] rounded-xl text-white placeholder:text-[#6B6B8D] focus:outline-none focus:border-[#8B5CF6] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[#A1A1C7] text-[14px] font-medium mb-2">
                      Row
                    </label>
                    <input
                      type="text"
                      value={row}
                      onChange={(e) => setRow(e.target.value)}
                      placeholder="A"
                      className="w-full px-4 py-4 bg-[#12132D] border border-[#2A2B4D] rounded-xl text-white placeholder:text-[#6B6B8D] focus:outline-none focus:border-[#8B5CF6] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[#A1A1C7] text-[14px] font-medium mb-2">
                      Seat
                    </label>
                    <input
                      type="text"
                      value={seat}
                      onChange={(e) => setSeat(e.target.value)}
                      placeholder="5"
                      className="w-full px-4 py-4 bg-[#12132D] border border-[#2A2B4D] rounded-xl text-white placeholder:text-[#6B6B8D] focus:outline-none focus:border-[#8B5CF6] transition-colors"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[#A1A1C7] text-[14px] font-medium mb-2">
                  Barcode (Optional)
                </label>
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Enter barcode number"
                  className="w-full px-4 py-4 bg-[#12132D] border border-[#2A2B4D] rounded-xl text-white placeholder:text-[#6B6B8D] focus:outline-none focus:border-[#8B5CF6] transition-colors font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-xl bg-gradient-to-r from-[#00D4FF] via-[#8B5CF6] to-[#E879F9] text-white font-semibold text-[15px] shadow-lg shadow-[#8B5CF6]/30"
              >
                Add Ticket
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
