import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

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
      {artistImage ? <Image source={{ uri: artistImage }} style={styles.backgroundImage} /> : <LinearGradient colors={['#00D4FF', '#6366F1', '#0A0B1E']} style={styles.backgroundGradient} />}

      <LinearGradient colors={['transparent', 'rgba(10, 11, 30, 0.8)', 'rgba(10, 11, 30, 0.95)']} style={styles.overlay} />

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.logo}>
            <Ionicons name="ticket" size={16} color="#8B5CF6" />
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
              <Ionicons name="people" size={16} color="#00D4FF" />
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
    backgroundColor: '#0A0B1E',
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
    color: '#FFFFFF',
  },
  info: {
    gap: 4,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00D4FF',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  artistName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  venue: {
    fontSize: 18,
    color: '#A0A0B8',
  },
  location: {
    fontSize: 14,
    color: '#6B6B8D',
    marginTop: 4,
  },
  friendsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  friendsText: {
    color: '#A0A0B8',
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
    color: '#8B5CF6',
  },
  wasHere: {
    fontSize: 14,
    color: '#6B6B8D',
  },
});



