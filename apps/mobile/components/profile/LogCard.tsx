import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { format } from 'date-fns';

import type { LogEntry } from '../../types/profile';

interface LogCardProps {
  log: LogEntry;
  onPress: () => void;
}

export function LogCard({ log, onPress }: LogCardProps) {
  const { event, rating, photos, _count } = log;
  const formattedDate = format(new Date(event.date), 'MMM d, yyyy');

  return (
    <Pressable style={styles.container} onPress={onPress}>
      {/* Photo or Artist Image */}
      <View style={styles.imageContainer}>
        {photos.length > 0 ? (
          <Image source={{ uri: photos[0].thumbnailUrl || photos[0].photoUrl }} style={styles.image} />
        ) : event.artist.imageUrl ? (
          <Image source={{ uri: event.artist.imageUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Ionicons name="musical-notes" size={24} color="#6B6B8D" />
          </View>
        )}

        {/* Photo count badge */}
        {photos.length > 1 ? (
          <View style={styles.photoBadge}>
            <Ionicons name="images" size={12} color="#FFFFFF" />
            <Text style={styles.photoCount}>{photos.length}</Text>
          </View>
        ) : null}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.artistName}>{event.artist.name}</Text>
        <Text style={styles.venueName}>{event.venue.name}</Text>
        <Text style={styles.date}>{formattedDate}</Text>

        {/* Bottom row */}
        <View style={styles.bottomRow}>
          {rating ? (
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={14} color="#F59E0B" />
              <Text style={styles.rating}>{rating}</Text>
            </View>
          ) : null}

          {_count && _count.comments > 0 ? (
            <View style={styles.commentContainer}>
              <Ionicons name="chatbubble-outline" size={14} color="#6B6B8D" />
              <Text style={styles.commentCount}>{_count.comments}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={20} color="#6B6B8D" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  image: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  imagePlaceholder: {
    backgroundColor: '#2D2D4A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 2,
  },
  photoCount: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  artistName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  venueName: {
    fontSize: 14,
    color: '#A0A0B8',
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
    color: '#6B6B8D',
    marginBottom: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
  },
  commentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentCount: {
    fontSize: 12,
    color: '#6B6B8D',
  },
});




