import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { Eyebrow } from './Eyebrow';

type SectionHeadProps = {
  eyebrow: string;
  title: string;
  accentColor?: string;
  action?: { label: string; onPress: () => void };
};

export function SectionHead({ eyebrow, title, accentColor, action }: SectionHeadProps) {
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    container: {
      paddingHorizontal: 20,
      marginBottom: 14,
      marginTop: 28,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
    },
    // System stack — the serif/grotesk families were removed from the font
    // gate (font diet); this component has no live screen usages.
    title: {
      fontSize: 26,
      fontWeight: '400',
      letterSpacing: -0.5,
      color: t.colors.textHi,
      marginTop: 4,
    },
    action: {
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 0.3,
    },
  }));

  return (
    <View style={styles.container}>
      <Eyebrow text={eyebrow} color={accentColor ?? tokens.colors.brandCyan} />
      <View style={styles.row}>
        <Text style={styles.title}>{title}</Text>
        {action && (
          <Pressable onPress={action.onPress} hitSlop={8}>
            <Text style={[styles.action, { color: tokens.colors.textMid }]}>{action.label} →</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
