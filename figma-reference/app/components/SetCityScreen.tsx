import React from 'react';
import { MapPin, Search } from 'lucide-react';

interface City {
  id: number;
  name: string;
  state: string;
  country: string;
}

interface SetCityScreenProps {
  onContinue?: (city: City) => void;
  onBack?: () => void;
}

const popularCities: City[] = [
  { id: 1, name: 'Los Angeles', state: 'CA', country: 'USA' },
  { id: 2, name: 'New York', state: 'NY', country: 'USA' },
  { id: 3, name: 'Chicago', state: 'IL', country: 'USA' },
  { id: 4, name: 'Nashville', state: 'TN', country: 'USA' },
  { id: 5, name: 'Austin', state: 'TX', country: 'USA' },
  { id: 6, name: 'Seattle', state: 'WA', country: 'USA' },
];

export function SetCityScreen({ onContinue, onBack }: SetCityScreenProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCity, setSelectedCity] = React.useState<City | null>(null);
  const [searchResults, setSearchResults] = React.useState<City[]>([]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.length > 0) {
      const results = popularCities.filter(
        (city) =>
          city.name.toLowerCase().includes(query.toLowerCase()) ||
          city.state.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const handleCitySelect = (city: City) => {
    setSelectedCity(city);
    setSearchQuery(`${city.name}, ${city.state}`);
    setSearchResults([]);
  };

  return (
    <div className="w-[390px] h-[844px] bg-[#0A0B1E] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-6 pt-16 pb-8">
        <h1 className="text-white text-[32px] font-bold mb-3">
          Where do you live?
        </h1>
        <p className="text-[#A1A1C7] text-[16px]">
          We'll find shows near you
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 overflow-y-auto">
        {/* Search Input */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B6B8D]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search for your city"
            className="w-full pl-12 pr-4 py-4 bg-[#12132D] border border-[#2A2B4D] rounded-xl text-white placeholder:text-[#6B6B8D] focus:outline-none focus:border-[#8B5CF6] transition-colors"
          />
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mb-6 bg-[#12132D] rounded-xl overflow-hidden">
            {searchResults.map((city) => (
              <button
                key={city.id}
                onClick={() => handleCitySelect(city)}
                className="w-full px-4 py-4 flex items-center gap-3 hover:bg-[#1A1B3D] transition-colors border-b border-[#2A2B4D] last:border-b-0"
              >
                <MapPin className="w-5 h-5 text-[#6B6B8D]" />
                <div className="text-left">
                  <p className="text-white font-semibold text-[15px]">
                    {city.name}
                  </p>
                  <p className="text-[#6B6B8D] text-[13px]">
                    {city.state}, {city.country}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Popular Cities */}
        {searchResults.length === 0 && (
          <>
            <h2 className="text-[#A1A1C7] text-[14px] font-semibold mb-3">
              Popular Cities
            </h2>
            <div className="flex flex-wrap gap-2 mb-6">
              {popularCities.map((city) => (
                <button
                  key={city.id}
                  onClick={() => handleCitySelect(city)}
                  className="px-4 py-2 bg-[#12132D] border border-[#2A2B4D] rounded-full text-[#A1A1C7] text-[14px] font-medium hover:border-[#8B5CF6] hover:text-[#8B5CF6] transition-colors"
                >
                  {city.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Continue Button */}
      <div className="p-6">
        <button
          onClick={() => selectedCity && onContinue?.(selectedCity)}
          disabled={!selectedCity}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-[#00D4FF] via-[#8B5CF6] to-[#E879F9] text-white font-semibold text-[15px] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#8B5CF6]/30"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
