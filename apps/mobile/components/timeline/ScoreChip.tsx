// ScoreChip — small bordered mono score stamp (the flat ScoreStamp look for
// legacy call sites): 1.5px fg border, no fill, mono digits. C1 zero accent —
// the score is ink at every value; intensity reads from the number itself.

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

  return (
    <View
      style={{
        borderWidth: 1.5,
        borderColor: c.fg,
        borderRadius: tokens.radius.chip, // 10
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
          fontWeight: '700',
          color: c.fg,
        }}
      >
        {formatScore(score)}
      </Text>
    </View>
  );
}
