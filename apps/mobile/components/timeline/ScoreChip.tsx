// ScoreChip — small mono score pill on timeline log cards.
// card2 fill, fg numeral; the numeral goes accent when score ≥ 9
// (accent = small usages only, per the design mandate).

import React from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '../../lib/theme-context';
import { formatScore } from './format';

type ScoreChipProps = {
  score: number;
};

export function ScoreChip({ score }: ScoreChipProps) {
  const { tokens } = useTheme();
  const c = tokens.colors;
  const hot = score >= 9;

  return (
    <View
      style={{
        backgroundColor: c.card2,
        borderRadius: tokens.radius.sm,
        paddingHorizontal: 8,
        height: 24,
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontFamily: tokens.fontFamilies.mono,
          fontVariant: ['tabular-nums'],
          fontSize: 12,
          fontWeight: '600',
          color: hot ? c.accent : c.fg,
        }}
      >
        {formatScore(score)}
      </Text>
    </View>
  );
}
