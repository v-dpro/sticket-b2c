import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

// Fixed-dark share poster: content sits over a hero image + a hardcoded dark
// scrim gradient and is captured to a shareable image, so its palette stays
// theme-independent (fixed dark-palette values), not the active app theme.

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
      {artistImage ? <Image source={{ uri: artistImage }} style={styles.backgroundImage} /> : <LinearGradient colors={['#45E3FF', '#6366F1', '#0B0B10']} style={styles.backgroundGradient} />}

      <LinearGradient colors={['transparent', 'rgba(10, 11, 30, 0.8)', 'rgba(10, 11, 30, 0.95)']} style={styles.overlay} />

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.logo}>
            <Ionicons name="ticket" size={16} color="#7C5CFF" />
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
              <Ionicons name="people" size={16} color="#45E3FF" />
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
    backgroundColor: '#0B0B10',
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
    color: '#E8E8EE',
  },
  info: {
    gap: 4,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    color: '#45E3FF',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  artistName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#E8E8EE',
  },
  venue: {
    fontSize: 18,
    color: '#A7A7B4',
  },
  location: {
    fontSize: 14,
    color: '#5A5A6C',
    marginTop: 4,
  },
  friendsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  friendsText: {
    color: '#A7A7B4',
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
    color: '#7C5CFF',
  },
  wasHere: {
    fontSize: 14,
    color: '#5A5A6C',
  },
});



