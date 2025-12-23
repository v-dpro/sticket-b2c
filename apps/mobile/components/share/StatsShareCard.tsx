import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

interface StatsShareCardProps {
  username: string;
  avatar?: string;
  showCount: number;
  artistCount: number;
  venueCount: number;
  topArtist?: string;
}

export function StatsShareCard({ username, avatar, showCount, artistCount, venueCount, topArtist }: StatsShareCardProps) {
  return (
    <View style={styles.card}>
      <LinearGradient colors={['#1a1b3d', '#0A0B1E']} style={styles.background} />

      <View style={styles.header}>
        <View style={styles.logo}>
          <Ionicons name="ticket" size={16} color="#8B5CF6" />
          <Text style={styles.logoText}>sticket</Text>
        </View>
      </View>

      <View style={styles.userSection}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={32} color="#6B6B8D" />
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

const styles = StyleSheet.create({
  card: {
    width: 350,
    height: 450,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#0A0B1E',
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
    color: '#FFFFFF',
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
    backgroundColor: '#1A1A2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B6B8D',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
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
    color: '#8B5CF6',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B6B8D',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#2D2D4A',
  },
  topArtist: {
    alignItems: 'center',
    marginBottom: 24,
  },
  topLabel: {
    fontSize: 12,
    color: '#6B6B8D',
    marginBottom: 4,
  },
  topValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#6B6B8D',
  },
});



