// RoundDots — compare-loop progress: filled dots for finished rounds, an
// accent dot for the current one, hollow dots ahead. Grows past the base
// count if a placement takes extra rounds.

import { View } from 'react-native';

import { useTheme } from '../../lib/theme-context';

type RoundDotsProps = {
  /** Current round, 1-based. */
  round: number;
  /** Baseline dot count; extends automatically when round exceeds it. */
  base?: number;
};

export function RoundDots({ round, base = 5 }: RoundDotsProps) {
  const { tokens } = useTheme();
  const c = tokens.colors;
  const total = Math.max(base, round);

  return (
    <View style={{ flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center' }}>
      {Array.from({ length: total }, (_, i) => {
        const done = i < round - 1;
        const active = i === round - 1;
        return (
          <View
            key={i}
            style={{
              width: active ? 7 : 6,
              height: active ? 7 : 6,
              borderRadius: 4,
              backgroundColor: done ? c.fg : active ? c.accent : c.line,
            }}
          />
        );
      })}
    </View>
  );
}
