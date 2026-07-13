import React from 'react';
import { Text, View } from 'react-native';

import type { BadgeProgress as BadgeProgressType } from '../../types/badge';
import { useThemedStyles } from '../../lib/theme-context';

export function BadgeProgress({ progress }: { progress: BadgeProgressType }) {
  const styles = useThemedStyles((t) => ({
    container: { gap: 8 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    label: { color: t.colors.mute, fontSize: 12, fontWeight: '600' },
    // Exact distance — the locked badge's "N TO GO" (C11 — no percent rings).
    distance: {
      fontFamily: t.fontFamilies.monoBold,
      fontVariant: ['tabular-nums'],
      color: t.colors.fg,
      fontSize: 15,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    value: {
      fontFamily: t.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      color: t.colors.muteSoft,
      fontSize: 11,
      letterSpacing: 0.6,
    },
  }));

  const toGo = Math.max(0, progress.target - progress.current);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.distance}>{toGo} TO GO</Text>
        <Text style={styles.value}>
          {progress.current}/{progress.target}
        </Text>
      </View>
    </View>
  );
}
