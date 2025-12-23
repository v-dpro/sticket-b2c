import React from 'react';

import type { Badge, BadgeProgress } from '../../types/badge';
import { BadgeCard } from './BadgeCard';

export function LockedBadge({ badge, progress, onPress }: { badge: Badge; progress?: BadgeProgress; onPress?: () => void }) {
  return <BadgeCard badge={badge} earned={false} progress={progress} onPress={onPress} />;
}



