import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '../../lib/theme';
import { Eyebrow } from './Eyebrow';

type SectionHeadProps = {
  eyebrow: string;
  title: string;
  accentColor?: string;
  action?: { label: string; onPress: () => void };
};

export function SectionHead({
  eyebrow,
  title,
  accentColor = colors.brandCyan,
  action,
}: SectionHeadProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.left}>
          <Eyebrow text={eyebrow} color={accentColor} />
          <Text style={styles.title}>{title}</Text>
        </View>
        {action && (
          <Pressable onPress={action.onPress} hitSlop={8}>
            <Text style={[styles.action, { color: accentColor }]}>
              {action.label}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  left: {
    flex: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '400',
    letterSpacing: -0.5,
    color: colors.textHi,
    marginTop: 4,
  },
  action: {
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontVariant: ['tabular-nums'],
  },
});
