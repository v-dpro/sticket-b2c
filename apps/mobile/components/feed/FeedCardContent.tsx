import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { format } from 'date-fns';

import { colors } from '../../lib/theme';

interface FeedCardContentProps {
  event: {
    id: string;
    name: string;
    date: string;
    artist: {
      id: string;
      name: string;
      imageUrl?: string;
    };
    venue: {
      id: string;
      name: string;
      city: string;
    };
  };
  rating?: number;
  note?: string;
  onEventPress: () => void;
  onArtistPress: () => void;
  onVenuePress: () => void;
}

export function FeedCardContent({ event, rating, note, onEventPress, onArtistPress, onVenuePress }: FeedCardContentProps) {
  return (
    <View style={styles.container}>
      <View style={styles.eventRow}>
        <Pressable onPress={onArtistPress} accessibilityRole="button">
          {event.artist.imageUrl ? (
            <Image source={{ uri: event.artist.imageUrl }} style={styles.artistImage} />
          ) : (
            <View style={[styles.artistImage, styles.imagePlaceholder]}>
              <Ionicons name="musical-notes" size={22} color={colors.brandPurple} />
            </View>
          )}
        </Pressable>

        <View style={styles.eventInfo}>
          <Text style={styles.action}>was at</Text>

          <Pressable onPress={onArtistPress} accessibilityRole="button">
            <Text style={styles.artistName} numberOfLines={1}>
              {event.artist.name}
            </Text>
          </Pressable>

          <View style={styles.venueRow}>
            <Pressable onPress={onVenuePress} accessibilityRole="button">
              <Text style={styles.venueName} numberOfLines={1}>
                {event.venue.name}
              </Text>
            </Pressable>
            <Text style={styles.dot}> • </Text>
            <Text style={styles.city} numberOfLines={1}>
              {event.venue.city}
            </Text>
          </View>

          <Pressable onPress={onEventPress} accessibilityRole="button">
            <Text style={styles.date}>{format(new Date(event.date), 'EEEE, MMM d, yyyy')}</Text>
          </Pressable>
        </View>

        {typeof rating === 'number' ? (
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={14} color={colors.warning} />
            <Text style={styles.ratingText}>{rating.toFixed(1).replace(/\.0$/, '')}</Text>
          </View>
        ) : null}
      </View>

      {note ? (
        <View style={styles.noteContainer}>
          <Text style={styles.note} numberOfLines={3}>
            {note}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  artistImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: colors.surfaceElevated,
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  eventInfo: {
    flex: 1,
    minWidth: 0,
  },
  action: {
    fontSize: 12,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  artistName: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    marginTop: 2,
  },
  venueName: {
    fontSize: 14,
    color: colors.brandCyan,
  },
  dot: {
    color: colors.textTertiary,
  },
  city: {
    fontSize: 14,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  date: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 4,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.warning,
  },
  noteContainer: {
    marginTop: 12,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  note: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});



