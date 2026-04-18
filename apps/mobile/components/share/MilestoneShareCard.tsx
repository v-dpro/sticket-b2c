import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../lib/theme';

interface MilestoneShareCardProps {
  badgeName: string;
  badgeIcon: string;
  badgeColor: string;
  description: string;
  username: string;
}

export function MilestoneShareCard({ badgeName, badgeIcon, badgeColor, description, username }: MilestoneShareCardProps) {
  return (
    <View style={styles.card}>
      <LinearGradient colors={[`${badgeColor}40`, colors.background]} style={styles.background} />

      <View style={styles.header}>
        <View style={styles.logo}>
          <Ionicons name="ticket" size={16} color={colors.brandPurple} />
          <Text style={styles.logoText}>sticket</Text>
        </View>
      </View>

      <View style={styles.badgeSection}>
        <View style={[styles.badgeIcon, { borderColor: badgeColor }]}
        >
          <Ionicons name={badgeIcon as any} size={48} color={badgeColor} />
        </View>

        <Text style={styles.unlocked}>🎉 Badge Unlocked!</Text>
        <Text style={[styles.badgeName, { color: badgeColor }]}>{badgeName}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>

      <View style={styles.userSection}>
        <Text style={styles.username}>@{username}</Text>
      </View>

      <Text style={styles.footer}>Track your concerts at sticket.in</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 350,
    height: 450,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.background,
    padding: 24,
    justifyContent: 'space-between',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  badgeSection: {
    alignItems: 'center',
  },
  badgeIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  unlocked: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  badgeName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  userSection: {
    alignItems: 'center',
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.brandPurple,
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.textTertiary,
  },
});



