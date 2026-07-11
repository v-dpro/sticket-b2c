import React from 'react';
import { View, Text } from 'react-native';

import { useThemedStyles } from '../../lib/theme-context';

type Props = {
  eyebrow: string;
  title: string;
  eyebrowColor?: string;
  right?: React.ReactNode;
};

export function ScreenTitle({ eyebrow, title, eyebrowColor, right }: Props) {
  const styles = useThemedStyles((t) => ({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: t.density.pad,
      paddingTop: 56,
      paddingBottom: t.spacing.md,
    },
    eyebrow: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 2,
      textTransform: 'uppercase',
      color: t.colors.mute,
      marginBottom: 4,
    },
    title: {
      fontSize: 34,
      fontWeight: '800',
      letterSpacing: -0.8,
      color: t.colors.fg,
      lineHeight: 38,
    },
  }));

  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.eyebrow, eyebrowColor ? { color: eyebrowColor } : null]}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
      {right}
    </View>
  );
}
