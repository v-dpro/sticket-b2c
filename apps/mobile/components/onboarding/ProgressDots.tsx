// ProgressDots — themed onboarding step indicator. Elongated active dot,
// accent fill for completed steps, plus an optional mono step counter.

import React from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '../../lib/theme-context';

interface ProgressDotsProps {
  total: number;
  /** Zero-based index of the current step. */
  current: number;
  /** Show the "0N / 0M" mono counter. Default true. */
  showCount?: boolean;
}

export function ProgressDots({ total, current, showCount = true }: ProgressDotsProps) {
  const { tokens } = useTheme();
  const c = tokens.colors;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={`dot-${i}`}
            style={{
              height: 6,
              width: i === current ? 22 : 6,
              borderRadius: 3,
              backgroundColor: i <= current ? c.accent : c.line,
            }}
          />
        ))}
      </View>
      {showCount ? (
        <Text
          style={{
            fontFamily: tokens.fontFamilies.mono,
            fontSize: 11,
            fontWeight: '600',
            letterSpacing: 1,
            color: c.mute,
          }}
        >
          {String(current + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </Text>
      ) : null}
    </View>
  );
}
