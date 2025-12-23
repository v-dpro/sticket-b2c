import { create } from 'zustand';

import type { DiscoveryData } from '../types/event';

type DiscoveryState = {
  dataByCity: Record<string, DiscoveryData | undefined>;
  lastUpdatedAtByCity: Record<string, number | undefined>;
  setCityData: (city: string, data: DiscoveryData) => void;
  clear: () => void;
};

export const useDiscoveryStore = create<DiscoveryState>((set) => ({
  dataByCity: {},
  lastUpdatedAtByCity: {},

  setCityData: (city, data) =>
    set((state) => ({
      dataByCity: { ...state.dataByCity, [city]: data },
      lastUpdatedAtByCity: { ...state.lastUpdatedAtByCity, [city]: Date.now() },
    })),

  clear: () => set({ dataByCity: {}, lastUpdatedAtByCity: {} }),
}));




