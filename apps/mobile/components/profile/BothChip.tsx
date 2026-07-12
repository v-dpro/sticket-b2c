// BothChip — small mono "BOTH" marker (Phase A14). Shown on another user's
// timeline entries when the signed-in viewer has logged the same event.
// Monochrome per the design bible: card2 fill, mute mono label.

import React from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useThemedStyles } from '../../lib/theme-context';

export function BothChip({ style }: { style?: StyleProp<ViewStyle> }) {
  const styles = useThemedStyles((t) => ({
    chip: {
      backgroundColor: t.colors.card2,
      borderRadius: 999,
      paddingHorizontal: 7,
      paddingVertical: 3,
      alignSelf: 'flex-start',
    },
    label: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 9,
      fontWeight: '600',
      letterSpacing: 1.2,
      color: t.colors.mute,
    },
  }));

  return (
    <View style={[styles.chip, style]} accessibilityLabel="You were both at this show">
      <Text style={styles.label}>BOTH</Text>
    </View>
  );
}
