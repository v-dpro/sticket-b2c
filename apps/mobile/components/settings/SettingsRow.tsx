import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { colors } from '../../lib/theme';

type SettingsRowProps = {
  icon?: string;
  iconColor?: string;
  label: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  isLast?: boolean;
};

export function SettingsRow({
  icon,
  iconColor = colors.brandPurple,
  label,
  value,
  onPress,
  showChevron = true,
  isLast = false,
}: SettingsRowProps) {
  const content = (
    <View style={[styles.container, !isLast && styles.border]}>
      {icon ? (
        <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
          <Ionicons name={icon as any} size={18} color={iconColor} />
        </View>
      ) : null}

      <Text style={styles.label}>{label}</Text>

      {value ? <Text style={styles.value}>{value}</Text> : null}

      {showChevron && onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} /> : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button">
        {content}
      </Pressable>
    );
  }

  return content;
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
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  label: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  value: {
    fontSize: 13,
    color: colors.textTertiary,
    marginRight: 8,
    fontWeight: '700',
  },
});



