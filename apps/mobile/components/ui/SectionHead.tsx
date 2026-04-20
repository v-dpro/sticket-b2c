import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, fontFamilies } from '../../lib/theme';
import { Eyebrow } from './Eyebrow';

type SectionHeadProps = {
  eyebrow: string;
  title: string;
  accentColor?: string;
  action?: { label: string; onPress: () => void };
};

export function SectionHead({ eyebrow, title, accentColor = colors.brandCyan, action }: SectionHeadProps) {
  return (
    <View style={styles.container}>
      <Eyebrow text={eyebrow} color={accentColor} />
      <View style={styles.row}>
        <Text style={styles.title}>{title}</Text>
        {action && (
          <Pressable onPress={action.onPress} hitSlop={8}>
            <Text style={[styles.action, { color: colors.textMid }]}>{action.label} →</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  title: {
    fontFamily: fontFamilies.displayItalic,
    fontSize: 26,
    fontWeight: '400',
    letterSpacing: -0.5,
    color: colors.textHi,
    marginTop: 4,
  },
  action: {
    fontFamily: fontFamilies.ui,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
