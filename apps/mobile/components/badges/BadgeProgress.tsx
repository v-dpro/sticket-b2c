import React from 'react';
import { Text, View } from 'react-native';

import type { BadgeProgress as BadgeProgressType } from '../../types/badge';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { getRarityColor } from './BadgeIcon';

export function BadgeProgress({ progress }: { progress: BadgeProgressType }) {
  const { tokens } = useTheme();
  const c = getRarityColor(tokens.colors, progress.badge.rarity);

  const styles = useThemedStyles((t) => ({
    container: { gap: 8 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    label: { color: t.colors.mute, fontSize: 12, fontWeight: '600' },
    value: { fontFamily: t.fontFamilies.monoBold, color: t.colors.fg, fontSize: 12, fontWeight: '700' },
    track: { height: 8, borderRadius: 999, backgroundColor: t.colors.card2, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 999 },
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
        <View style={[styles.fill, { width: `${progress.percentage}%`, backgroundColor: c }]} />
      </View>
    </View>
  );
}
