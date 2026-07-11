import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

interface MilestoneShareCardProps {
  badgeName: string;
  badgeIcon: string;
  badgeColor: string;
  description: string;
  username: string;
}

export function MilestoneShareCard({ badgeName, badgeIcon, badgeColor, description, username }: MilestoneShareCardProps) {
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    card: {
      width: 350,
      height: 450,
      borderRadius: 24,
      overflow: 'hidden',
      backgroundColor: t.colors.ink,
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
      color: t.colors.textHi,
    },
    badgeSection: {
      alignItems: 'center',
    },
    badgeIcon: {
      width: 100,
      height: 100,
      borderRadius: 50,
      borderWidth: 3,
      backgroundColor: t.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
    },
    unlocked: {
      fontSize: 14,
      color: t.colors.textMid,
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
      color: t.colors.textLo,
      textAlign: 'center',
    },
    userSection: {
      alignItems: 'center',
    },
    username: {
      fontSize: 16,
      fontWeight: '600',
      color: t.colors.brandPurple,
    },
    footer: {
      textAlign: 'center',
      fontSize: 12,
      color: t.colors.textLo,
    },
  }));

  return (
    <View style={styles.card}>
      <LinearGradient colors={[`${badgeColor}40`, tokens.colors.ink]} style={styles.background} />

      <View style={styles.header}>
        <View style={styles.logo}>
          {/* sticket brand mark — fixed */}
          <Ionicons name="ticket" size={16} color="#7C5CFF" />
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
