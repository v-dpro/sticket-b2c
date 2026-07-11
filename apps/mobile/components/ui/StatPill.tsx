import React from 'react';
import { View, Text, type ViewStyle } from 'react-native';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
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
  color,
  style,
}: StatPillProps) {
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    container: {
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.hairline,
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
  }));

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.value, { color: color ?? tokens.colors.textHi }]}>{value}</Text>
      <MonoLabel size={9} color={tokens.colors.textLo}>
        {label}
      </MonoLabel>
    </View>
  );
}
