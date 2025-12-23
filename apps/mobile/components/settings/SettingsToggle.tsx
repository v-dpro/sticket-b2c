import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { colors } from '../../lib/theme';

type SettingsToggleProps = {
  icon?: string;
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
  iconColor = colors.brandPurple,
  label,
  description,
  value,
  onValueChange,
  disabled = false,
  isLast = false,
}: SettingsToggleProps) {
  return (
    <View style={[styles.container, !isLast && styles.border, disabled && styles.disabled]}>
      {icon ? (
        <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
          <Ionicons name={icon as any} size={18} color={iconColor} />
        </View>
      ) : null}

      <View style={styles.textContainer}>
        <Text style={[styles.label, disabled && styles.labelDisabled]}>{label}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>

      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.brandPurple }}
        thumbColor={colors.textPrimary}
        disabled={disabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  border: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  disabled: {
    opacity: 0.5,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
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
    color: colors.textPrimary,
    fontWeight: '700',
  },
  labelDisabled: {
    color: colors.textTertiary,
  },
  description: {
    fontSize: 13,
    color: colors.textTertiary,
    marginTop: 2,
  },
});



