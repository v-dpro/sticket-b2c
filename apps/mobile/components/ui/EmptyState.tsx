import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, gradients, spacing, radius } from '../../lib/theme';

type LegacyProps = { title: string; message?: string };

type NewProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState(props: LegacyProps | NewProps) {
  // Backwards-compatible support: EmptyState({ title, message })
  if (!('icon' in props)) {
    return (
      <View style={styles.legacyContainer}>
        <Text style={styles.legacyTitle}>{props.title}</Text>
        {props.message ? <Text style={styles.legacyMessage}>{props.message}</Text> : null}
      </View>
    );
  }

  const { icon, title, description, actionLabel, onAction } = props;

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <LinearGradient colors={gradients.accent} style={styles.iconGradient}>
          <Ionicons name={icon} size={40} color="#FFFFFF" />
        </LinearGradient>
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>

      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]} accessibilityRole="button">
          <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.actionGradient}>
            <Text style={styles.actionText}>{actionLabel}</Text>
          </LinearGradient>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  legacyContainer: {
    padding: 16,
    gap: 6,
    alignItems: 'center',
  },
  legacyTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  legacyMessage: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  container: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    paddingHorizontal: spacing.xl,
  },
  iconContainer: {
    marginBottom: spacing.lg,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  actionButton: {
    marginTop: spacing.xl,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  actionButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  actionGradient: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});




