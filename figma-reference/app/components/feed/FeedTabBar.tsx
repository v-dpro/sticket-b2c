import React from 'react';
import { Users, Globe } from 'lucide-react';

export type FeedTab = 'friends' | 'discover';

interface FeedTabBarProps {
  activeTab: FeedTab;
  onTabChange: (tab: FeedTab) => void;
}

export function FeedTabBar({ activeTab, onTabChange }: FeedTabBarProps) {
  return (
    <div className="p-1 bg-[#1A1A2E] rounded-xl">
      <div className="grid grid-cols-2 gap-1">
        <button
          onClick={() => onTabChange('friends')}
          className={`py-3 rounded-lg flex items-center justify-center gap-2 font-bold text-[14px] transition-colors ${
            activeTab === 'friends'
              ? 'bg-[#252542] text-white'
              : 'text-[#6B6B8D]'
          }`}
        >
          <Users className="w-4.5 h-4.5" />
          Friends
        </button>
        <button
          onClick={() => onTabChange('discover')}
          className={`py-3 rounded-lg flex items-center justify-center gap-2 font-bold text-[14px] transition-colors ${
            activeTab === 'discover'
              ? 'bg-[#252542] text-white'
              : 'text-[#6B6B8D]'
          }`}
        >
          <Globe className="w-4.5 h-4.5" />
          Discover
        </button>
      </div>
    </div>
  );
}
