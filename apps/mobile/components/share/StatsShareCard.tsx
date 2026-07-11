import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

interface StatsShareCardProps {
  username: string;
  avatar?: string;
  showCount: number;
  artistCount: number;
  venueCount: number;
  topArtist?: string;
}

export function StatsShareCard({ username, avatar, showCount, artistCount, venueCount, topArtist }: StatsShareCardProps) {
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    card: {
      width: 350,
      height: 450,
      borderRadius: 24,
      overflow: 'hidden',
      backgroundColor: t.colors.ink,
      padding: 24,
    },
    background: {
      ...StyleSheet.absoluteFillObject,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: 24,
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
    userSection: {
      alignItems: 'center',
      marginBottom: 32,
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      marginBottom: 12,
    },
    avatarPlaceholder: {
      backgroundColor: t.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    username: {
      fontSize: 20,
      fontWeight: 'bold',
      color: t.colors.textHi,
    },
    subtitle: {
      fontSize: 14,
      color: t.colors.textLo,
      marginTop: 4,
    },
    statsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      backgroundColor: t.colors.surface,
      borderRadius: 16,
      paddingVertical: 20,
      marginBottom: 24,
    },
    statItem: {
      alignItems: 'center',
      flex: 1,
    },
    statValue: {
      fontSize: 28,
      fontWeight: 'bold',
      color: t.colors.brandPurple,
    },
    statLabel: {
      fontSize: 12,
      color: t.colors.textLo,
      marginTop: 4,
    },
    statDivider: {
      width: 1,
      height: 40,
      backgroundColor: t.colors.hairline,
    },
    topArtist: {
      alignItems: 'center',
      marginBottom: 24,
    },
    topLabel: {
      fontSize: 12,
      color: t.colors.textLo,
      marginBottom: 4,
    },
    topValue: {
      fontSize: 18,
      fontWeight: '600',
      color: t.colors.textHi,
    },
    footer: {
      textAlign: 'center',
      fontSize: 12,
      color: t.colors.textLo,
    },
  }));

  return (
    <View style={styles.card}>
      <LinearGradient colors={[tokens.colors.elevated, tokens.colors.ink]} style={styles.background} />

      <View style={styles.header}>
        <View style={styles.logo}>
          {/* sticket brand mark — fixed */}
          <Ionicons name="ticket" size={16} color="#7C5CFF" />
          <Text style={styles.logoText}>sticket</Text>
        </View>
      </View>

      <View style={styles.userSection}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={32} color={tokens.colors.textLo} />
          </View>
        )}
        <Text style={styles.username}>@{username}</Text>
        <Text style={styles.subtitle}>Concert Stats</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{showCount}</Text>
          <Text style={styles.statLabel}>Shows</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{artistCount}</Text>
          <Text style={styles.statLabel}>Artists</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{venueCount}</Text>
          <Text style={styles.statLabel}>Venues</Text>
        </View>
      </View>

      {topArtist ? (
        <View style={styles.topArtist}>
          <Text style={styles.topLabel}>Most Seen Artist</Text>
          <Text style={styles.topValue}>{topArtist}</Text>
        </View>
      ) : null}

      <Text style={styles.footer}>sticket.in/@{username}</Text>
    </View>
  );
}
