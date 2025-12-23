import React from 'react';
import { ArrowLeft, Trophy, Flame, Map, Music, Target, Lock } from 'lucide-react';

interface Badge {
  id: number;
  name: string;
  description: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  points: number;
  earned: boolean;
  progress?: number;
  total?: number;
  dateEarned?: string;
  category: string;
}

interface BadgesScreenProps {
  onBack?: () => void;
  onBadgeClick?: (badge: Badge) => void;
}

const badges: Badge[] = [
  {
    id: 1,
    name: 'First Show',
    description: 'Log your first concert',
    rarity: 'common',
    points: 10,
    earned: true,
    dateEarned: 'Dec 15, 2024',
    category: 'Milestones',
  },
  {
    id: 2,
    name: '10 Shows',
    description: 'Log 10 concerts',
    rarity: 'uncommon',
    points: 25,
    earned: true,
    dateEarned: 'Dec 20, 2024',
    category: 'Milestones',
  },
  {
    id: 3,
    name: '50 Shows',
    description: 'Log 50 concerts',
    rarity: 'rare',
    points: 100,
    earned: false,
    progress: 24,
    total: 50,
    category: 'Milestones',
  },
  {
    id: 4,
    name: 'Concert Streak',
    description: 'Attend shows 3 months in a row',
    rarity: 'uncommon',
    points: 50,
    earned: false,
    progress: 2,
    total: 3,
    category: 'Streaks',
  },
  {
    id: 5,
    name: 'Superfan',
    description: 'See the same artist 5 times',
    rarity: 'epic',
    points: 200,
    earned: true,
    dateEarned: 'Jan 5, 2025',
    category: 'Loyalty',
  },
  {
    id: 6,
    name: 'Globe Trotter',
    description: 'Attend shows in 10 different cities',
    rarity: 'rare',
    points: 150,
    earned: false,
    progress: 6,
    total: 10,
    category: 'Traveler',
  },
  {
    id: 7,
    name: 'Genre Explorer',
    description: 'See artists from 10 different genres',
    rarity: 'rare',
    points: 100,
    earned: false,
    progress: 7,
    total: 10,
    category: 'Explorer',
  },
  {
    id: 8,
    name: 'Stadium Master',
    description: 'Attend 5 stadium shows',
    rarity: 'epic',
    points: 250,
    earned: false,
    progress: 3,
    total: 5,
    category: 'Venue',
  },
];

const getRarityColor = (rarity: string) => {
  switch (rarity) {
    case 'common':
      return 'text-[#6B6B8D]';
    case 'uncommon':
      return 'text-[#22C55E]';
    case 'rare':
      return 'text-[#00D4FF]';
    case 'epic':
      return 'text-[#8B5CF6]';
    case 'legendary':
      return 'text-[#F59E0B]';
    default:
      return 'text-[#6B6B8D]';
  }
};

const getRarityBg = (rarity: string) => {
  switch (rarity) {
    case 'common':
      return 'from-[#6B6B8D]/20 to-[#6B6B8D]/5';
    case 'uncommon':
      return 'from-[#22C55E]/20 to-[#22C55E]/5';
    case 'rare':
      return 'from-[#00D4FF]/20 to-[#00D4FF]/5';
    case 'epic':
      return 'from-[#8B5CF6]/20 to-[#8B5CF6]/5';
    case 'legendary':
      return 'from-[#F59E0B]/20 to-[#F59E0B]/5';
    default:
      return 'from-[#2A2B4D] to-[#12132D]';
  }
};

export function BadgesScreen({ onBack, onBadgeClick }: BadgesScreenProps) {
  const earnedCount = badges.filter((b) => b.earned).length;
  const totalPoints = badges
    .filter((b) => b.earned)
    .reduce((sum, b) => sum + b.points, 0);

  const categories = Array.from(new Set(badges.map((b) => b.category)));

  return (
    <div className="w-[390px] h-[844px] bg-[#0A0B1E] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-6 pt-12 pb-6">
        <button
          onClick={onBack}
          className="mb-4 flex items-center gap-2 text-[#A1A1C7] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-[14px] font-medium">Back</span>
        </button>
        <h1 className="text-white text-[28px] font-bold mb-4">Badges</h1>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#12132D] rounded-xl p-4 text-center">
            <p className="text-[#6B6B8D] text-[12px] mb-1">Earned</p>
            <p className="text-white text-[24px] font-bold">{earnedCount}</p>
          </div>
          <div className="bg-[#12132D] rounded-xl p-4 text-center">
            <p className="text-[#6B6B8D] text-[12px] mb-1">Remaining</p>
            <p className="text-white text-[24px] font-bold">
              {badges.length - earnedCount}
            </p>
          </div>
          <div className="bg-[#12132D] rounded-xl p-4 text-center">
            <p className="text-[#6B6B8D] text-[12px] mb-1">Points</p>
            <p className="text-[#8B5CF6] text-[24px] font-bold">{totalPoints}</p>
          </div>
        </div>
      </div>

      {/* Badges List */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {categories.map((category) => (
          <section key={category} className="mb-6">
            <h2 className="text-white text-[18px] font-bold mb-3">
              {category}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {badges
                .filter((b) => b.category === category)
                .map((badge) => (
                  <button
                    key={badge.id}
                    onClick={() => onBadgeClick?.(badge)}
                    className={`p-4 rounded-xl bg-gradient-to-br ${getRarityBg(
                      badge.rarity
                    )} ${
                      !badge.earned ? 'opacity-60' : ''
                    } transition-all hover:scale-105`}
                  >
                    {/* Badge Icon */}
                    <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-[#12132D] flex items-center justify-center relative">
                      {badge.earned ? (
                        <Trophy
                          className={`w-8 h-8 ${getRarityColor(badge.rarity)}`}
                        />
                      ) : (
                        <Lock className="w-8 h-8 text-[#6B6B8D]" />
                      )}
                    </div>

                    {/* Badge Name */}
                    <h3 className="text-white font-semibold text-[13px] mb-1 text-center">
                      {badge.name}
                    </h3>

                    {/* Progress or Rarity */}
                    {badge.earned ? (
                      <p
                        className={`text-[11px] font-medium text-center capitalize ${getRarityColor(
                          badge.rarity
                        )}`}
                      >
                        {badge.rarity}
                      </p>
                    ) : badge.progress !== undefined && badge.total ? (
                      <div className="mt-2">
                        <div className="flex justify-between text-[10px] text-[#6B6B8D] mb-1">
                          <span>{badge.progress}</span>
                          <span>{badge.total}</span>
                        </div>
                        <div className="h-1.5 bg-[#2A2B4D] rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${getRarityBg(
                              badge.rarity
                            ).replace('/20', '').replace('/5', '')}`}
                            style={{
                              width: `${(badge.progress / badge.total) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ) : null}
                  </button>
                ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
