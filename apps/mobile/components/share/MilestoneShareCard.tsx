import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

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
      <LinearGradient colors={[`${badgeColor}40`, '#0A0B1E']} style={styles.background} />

      <View style={styles.header}>
        <View style={styles.logo}>
          <Ionicons name="ticket" size={16} color="#8B5CF6" />
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
    backgroundColor: '#0A0B1E',
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
    color: '#FFFFFF',
  },
  badgeSection: {
    alignItems: 'center',
  },
  badgeIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    backgroundColor: '#1A1A2E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  unlocked: {
    fontSize: 14,
    color: '#A0A0B8',
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
    color: '#6B6B8D',
    textAlign: 'center',
  },
  userSection: {
    alignItems: 'center',
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#6B6B8D',
  },
});



