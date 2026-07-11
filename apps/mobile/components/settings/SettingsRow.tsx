import React from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { SpringPressable } from '../ui/SpringPressable';

type SettingsRowProps = {
  icon?: string;
  /** Optional icon tint. Defaults to a monochrome chip. */
  iconColor?: string;
  label: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  isLast?: boolean;
};

export function SettingsRow({
  icon,
  iconColor,
  label,
  value,
  onPress,
  showChevron = true,
  isLast = false,
}: SettingsRowProps) {
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: t.density.cardPad,
    },
    border: {
      borderBottomWidth: 1,
      borderBottomColor: t.colors.hairline,
    },
    iconContainer: {
      width: 32,
      height: 32,
      borderRadius: t.radius.sm,
      backgroundColor: t.colors.card2,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    label: {
      flex: 1,
      fontSize: 15,
      color: t.colors.fg,
      fontWeight: '600',
    },
    value: {
      fontSize: 13,
      color: t.colors.mute,
      marginRight: 8,
      fontWeight: '400',
    },
  }));

  const content = (
    <View style={[styles.container, !isLast && styles.border]}>
      {icon ? (
        <View
          style={[styles.iconContainer, iconColor ? { backgroundColor: `${iconColor}20` } : null]}
        >
          <Ionicons name={icon as any} size={18} color={iconColor ?? tokens.colors.fg} />
        </View>
      ) : null}

      <Text style={styles.label}>{label}</Text>

      {value ? <Text style={styles.value}>{value}</Text> : null}

      {showChevron && onPress ? (
        <Ionicons name="chevron-forward" size={18} color={tokens.colors.muteSoft} />
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <SpringPressable onPress={onPress} haptic="light" accessibilityRole="button">
        {content}
      </SpringPressable>
    );
  }

  return content;
}
