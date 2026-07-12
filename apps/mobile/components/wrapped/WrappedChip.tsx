// components/wrapped/WrappedChip.tsx — the timeline entry point for Wrapped.
//
// Slim monochrome pill ("✦ ’26 WRAPPED") rendered by app/(tabs)/you.tsx
// directly under the AgendaPin, only once the current year has ≥3 logged
// shows. Secondary and subtle by design — the celebration (and the
// sanctioned gradient) lives inside /wrapped, not on the timeline.

import React from 'react';
import { Text, View } from 'react-native';

import { useThemedStyles } from '../../lib/theme-context';
import { SpringPressable } from '../ui/SpringPressable';

export function WrappedChip({ year, onPress }: { year: number; onPress: () => void }) {
  const styles = useThemedStyles((t) => ({
    row: {
      paddingHorizontal: t.density.pad,
      paddingTop: 10,
      flexDirection: 'row',
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 30,
      paddingHorizontal: 13,
      borderRadius: t.radius.full,
      backgroundColor: t.colors.card2,
      borderWidth: 1,
      borderColor: t.colors.hairline,
    },
    label: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 2,
      color: t.colors.text,
    },
  }));

  const yy = String(year).slice(-2);

  return (
    <View style={styles.row}>
      <SpringPressable
        onPress={onPress}
        haptic="light"
        accessibilityRole="button"
        accessibilityLabel={`Open your ${year} Wrapped`}
        style={styles.pill}
      >
        <Text style={styles.label}>{`✦ ’${yy} WRAPPED`}</Text>
      </SpringPressable>
    </View>
  );
}
