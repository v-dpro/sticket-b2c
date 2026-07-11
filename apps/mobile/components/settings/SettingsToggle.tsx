import React from 'react';
import { Switch, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme, useThemedStyles } from '../../lib/theme-context';

type SettingsToggleProps = {
  icon?: string;
  /** Optional icon tint. Defaults to a monochrome chip. */
  iconColor?: string;
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  isLast?: boolean;
};

export function SettingsToggle({
  icon,
  iconColor,
  label,
  description,
  value,
  onValueChange,
  disabled = false,
  isLast = false,
}: SettingsToggleProps) {
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
    disabled: {
      opacity: 0.5,
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
    textContainer: {
      flex: 1,
      marginRight: 12,
    },
    label: {
      fontSize: 15,
      color: t.colors.fg,
      fontWeight: '600',
    },
    labelDisabled: {
      color: t.colors.mute,
    },
    description: {
      fontSize: 13,
      color: t.colors.mute,
      marginTop: 2,
    },
  }));

  return (
    <View style={[styles.container, !isLast && styles.border, disabled && styles.disabled]}>
      {icon ? (
        <View
          style={[styles.iconContainer, iconColor ? { backgroundColor: `${iconColor}20` } : null]}
        >
          <Ionicons name={icon as any} size={18} color={iconColor ?? tokens.colors.fg} />
        </View>
      ) : null}

      <View style={styles.textContainer}>
        <Text style={[styles.label, disabled && styles.labelDisabled]}>{label}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>

      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: tokens.colors.card2, true: tokens.colors.success }}
        thumbColor={tokens.colors.white}
        ios_backgroundColor={tokens.colors.card2}
        disabled={disabled}
      />
    </View>
  );
}
