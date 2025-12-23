import React from 'react';
import { Home, Music, Plus, Heart, User, Camera } from 'lucide-react';

export type TabType = 'feed' | 'life' | 'artists' | 'profile';

interface TabBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onCenterAction?: () => void;
  hasShowToday?: boolean;
}

export function TabBar({
  activeTab,
  onTabChange,
  onCenterAction,
  hasShowToday = false,
}: TabBarProps) {
  const tabs = [
    { id: 'feed' as TabType, label: 'Feed', Icon: Home },
    { id: 'life' as TabType, label: 'My Life', Icon: Music },
    { id: 'center' as const, label: '', Icon: Plus }, // Placeholder for center
    { id: 'artists' as TabType, label: 'Artists', Icon: Heart },
    { id: 'profile' as TabType, label: 'Profile', Icon: User },
  ];

  return (
    <div className="relative w-full h-20 bg-[#1A1A2E] border-t border-[#2D2D4A]">
      <div className="absolute inset-0 flex items-center justify-around px-4">
        {tabs.map((tab) => {
          if (tab.id === 'center') {
            return <div key="center" className="w-16" />; // Spacer for FAB
          }

          const isActive = activeTab === tab.id;
          const Icon = tab.Icon;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id as TabType)}
              className="flex flex-col items-center justify-center gap-1 min-w-[60px]"
            >
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
                  isActive ? 'bg-[#00D4FF]/12' : ''
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    isActive ? 'text-[#00D4FF]' : 'text-[#6B6B8D]'
                  }`}
                />
              </div>
              <span
                className={`text-[11px] font-bold ${
                  isActive ? 'text-[#00D4FF]' : 'text-[#6B6B8D]'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Center FAB */}
      <button
        onClick={onCenterAction}
        className="absolute left-1/2 -translate-x-1/2 -top-5 w-16 h-16 rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#00D4FF] border-3 border-[#0A0B1E] shadow-lg shadow-[#8B5CF6]/40 flex items-center justify-center"
        style={{ borderWidth: '3px' }}
      >
        {hasShowToday ? (
          <>
            <Camera className="w-7 h-7 text-white" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#22C55E] rounded-full border-2 border-[#0A0B1E]" />
          </>
        ) : (
          <Plus className="w-7 h-7 text-white" />
        )}
      </button>
    </div>
  );
}
