import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../lib/theme';

interface EventShareCardProps {
  artistName: string;
  artistImage?: string;
  venueName: string;
  venueCity: string;
  date: string;
  friendsGoing?: number;
  username: string;
}

export function EventShareCard({ artistName, artistImage, venueName, venueCity, date, friendsGoing, username }: EventShareCardProps) {
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <View style={styles.card}>
      {artistImage ? <Image source={{ uri: artistImage }} style={styles.backgroundImage} /> : <LinearGradient colors={[colors.brandCyan, '#6366F1', colors.ink]} style={styles.backgroundGradient} />}

      <LinearGradient colors={['transparent', 'rgba(10, 11, 30, 0.8)', 'rgba(10, 11, 30, 0.95)']} style={styles.overlay} />

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.logo}>
            <Ionicons name="ticket" size={16} color={colors.brandPurple} />
            <Text style={styles.logoText}>sticket</Text>
          </View>
        </View>

        <View style={styles.info}>
          <Text style={styles.kicker}>Upcoming event</Text>
          <Text style={styles.artistName}>{artistName}</Text>
          <Text style={styles.venue}>{venueName}</Text>
          <Text style={styles.location}>
            {venueCity} • {formattedDate}
          </Text>

          {typeof friendsGoing === 'number' ? (
            <View style={styles.friendsRow}>
              <Ionicons name="people" size={16} color={colors.brandCyan} />
              <Text style={styles.friendsText}>{friendsGoing} friends going</Text>
            </View>
          ) : null}

          <View style={styles.footer}>
            <Text style={styles.username}>@{username}</Text>
            <Text style={styles.wasHere}>invited you</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 350,
    height: 450,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.ink,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  logoText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textHi,
  },
  info: {
    gap: 4,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brandCyan,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  artistName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.textHi,
  },
  venue: {
    fontSize: 18,
    color: colors.textMid,
  },
  location: {
    fontSize: 14,
    color: colors.textLo,
    marginTop: 4,
  },
  friendsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  friendsText: {
    color: colors.textMid,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 6,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brandPurple,
  },
  wasHere: {
    fontSize: 14,
    color: colors.textLo,
  },
});



