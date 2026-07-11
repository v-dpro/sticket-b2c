import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme, useThemedStyles } from '../../lib/theme-context';

type LegacyProps = { title: string; message?: string };

type NewProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState(props: LegacyProps | NewProps) {
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    legacyContainer: {
      padding: 16,
      gap: 6,
      alignItems: 'center',
    },
    legacyTitle: {
      color: t.colors.textHi,
      fontSize: 16,
      fontWeight: '700',
    },
    legacyMessage: {
      color: t.colors.textMid,
      textAlign: 'center',
    },
    container: {
      alignItems: 'center',
      paddingVertical: t.spacing['2xl'],
      paddingHorizontal: t.spacing.xl,
    },
    iconContainer: {
      marginBottom: t.spacing.lg,
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
      color: t.colors.textHi,
      marginBottom: t.spacing.sm,
      textAlign: 'center',
    },
    description: {
      fontSize: 15,
      color: t.colors.textMid,
      textAlign: 'center',
      lineHeight: 22,
      maxWidth: 280,
    },
    actionButton: {
      marginTop: t.spacing.xl,
      borderRadius: t.radius.lg,
      overflow: 'hidden',
    },
    actionButtonPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.98 }],
    },
    actionGradient: {
      paddingHorizontal: t.spacing.xl,
      paddingVertical: t.spacing.md,
      borderRadius: t.radius.lg,
    },
    actionText: {
      fontSize: 16,
      fontWeight: '700',
      color: t.colors.textHi,
    },
  }));

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
        <LinearGradient colors={tokens.gradients.accent} style={styles.iconGradient}>
          <Ionicons name={icon} size={40} color={tokens.colors.textHi} />
        </LinearGradient>
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>

      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]} accessibilityRole="button">
          <LinearGradient colors={tokens.gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.actionGradient}>
            <Text style={styles.actionText}>{actionLabel}</Text>
          </LinearGradient>
        </Pressable>
      ) : null}
    </View>
  );
}
