// MonthMarker — "JUL 2026" mono label + hairline rule between month buckets.

import React from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '../../lib/theme-context';

type MonthMarkerProps = {
  label: string; // already formatted, e.g. "JUL 2026"
};

export function MonthMarker({ label }: MonthMarkerProps) {
  const { tokens } = useTheme();
  const c = tokens.colors;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Text
        style={{
          fontFamily: tokens.fontFamilies.mono,
          fontVariant: ['tabular-nums'],
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 1.5,
          color: c.mute,
        }}
      >
        {label}
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: c.hairline }} />
    </View>
  );
}
