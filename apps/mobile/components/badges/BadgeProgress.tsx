import React from 'react';
import { Text, View } from 'react-native';

import type { BadgeProgress as BadgeProgressType } from '../../types/badge';
import { useThemedStyles } from '../../lib/theme-context';

export function BadgeProgress({ progress }: { progress: BadgeProgressType }) {
  const styles = useThemedStyles((t) => ({
    container: { gap: 8 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    label: { color: t.colors.mute, fontSize: 12, fontWeight: '600' },
    value: { fontFamily: t.fontFamilies.monoBold, color: t.colors.fg, fontSize: 12, fontWeight: '700' },
    track: { height: 8, borderRadius: 999, backgroundColor: t.colors.card2, overflow: 'hidden' },
    // Mono ink fill (C10) — progress is weight, not hue.
    fill: { height: '100%', borderRadius: 999, backgroundColor: t.colors.fg },
  }));

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>Progress</Text>
        <Text style={styles.value}>
          {progress.current}/{progress.target}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress.percentage}%` }]} />
      </View>
    </View>
  );
}
