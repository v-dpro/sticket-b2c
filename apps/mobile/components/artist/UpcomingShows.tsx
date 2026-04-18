import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import type { ArtistShow } from '../../types/artist';
import { colors } from '../../lib/theme';

interface UpcomingShowsProps {
  shows: ArtistShow[];
  onShowPress: (showId: string) => void;
  onInterestedPress: (showId: string, current: boolean) => void;
}

export function UpcomingShows({ shows, onShowPress, onInterestedPress }: UpcomingShowsProps) {
  if (shows.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upcoming Shows</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {shows.map((show) => (
          <Pressable key={show.id} style={styles.showCard} onPress={() => onShowPress(show.id)}>
            {/* Date Badge */}
            <View style={styles.dateBadge}>
              <Text style={styles.dateMonth}>{format(new Date(show.date), 'MMM').toUpperCase()}</Text>
              <Text style={styles.dateDay}>{format(new Date(show.date), 'd')}</Text>
            </View>

            {/* Show Info */}
            <View style={styles.showInfo}>
              <Text style={styles.venueName} numberOfLines={1}>
                {show.venue.name}
              </Text>
              <Text style={styles.venueCity} numberOfLines={1}>
                {show.venue.city}{show.venue.state ? `, ${show.venue.state}` : ''}
              </Text>

              {show.friendsGoing > 0 && (
                <View style={styles.friendsBadge}>
                  <Ionicons name="people" size={12} color={colors.brandCyan} />
                  <Text style={styles.friendsText}>
                    {show.friendsGoing} friend{show.friendsGoing !== 1 ? 's' : ''} going
                  </Text>
                </View>
              )}
            </View>

            {/* Interested Button */}
            <Pressable
              style={[styles.interestedButton, show.isInterested && styles.interestedActive]}
              onPress={(e) => {
                e.stopPropagation();
                onInterestedPress(show.id, show.isInterested);
              }}
            >
              <Ionicons
                name={show.isInterested ? 'heart' : 'heart-outline'}
                size={18}
                color={show.isInterested ? colors.error : colors.textTertiary}
              />
            </Pressable>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  showCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    width: 200,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateBadge: {
    backgroundColor: colors.brandPurple,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  dateMonth: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  dateDay: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  showInfo: {
    flex: 1,
  },
  venueName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  venueCity: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  friendsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  friendsText: {
    fontSize: 11,
    color: colors.brandCyan,
  },
  interestedButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  interestedActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
});



