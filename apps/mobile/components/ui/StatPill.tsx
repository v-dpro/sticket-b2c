import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { colors } from '../../lib/theme';
import { MonoLabel } from './MonoLabel';

type StatPillProps = {
  value: number | string;
  label: string;
  color?: string;
  style?: ViewStyle;
};

export function StatPill({
  value,
  label,
  color = colors.textHi,
  style,
}: StatPillProps) {
  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <MonoLabel size={9} color={colors.textLo}>
        {label}
      </MonoLabel>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
});
