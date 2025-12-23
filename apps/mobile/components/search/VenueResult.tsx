import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

import type { VenueResult as VenueResultType } from '../../types/search';
import { colors, spacing } from '../../lib/theme';

interface VenueResultProps {
  venue: VenueResultType;
  onPress?: () => void;
}

export function VenueResult({ venue, onPress }: VenueResultProps) {
  const router = useRouter();

  const handlePress = () => {
    onPress?.();
    router.push(`/venue/${venue.id}`);
  };

  return (
    <Pressable style={styles.container} onPress={handlePress} accessibilityRole="button">
      {venue.imageUrl ? (
        <Image source={{ uri: venue.imageUrl }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Ionicons name="location" size={20} color={colors.brandCyan} />
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {venue.name}
        </Text>
        <Text style={styles.location} numberOfLines={1}>
          {venue.city}
          {venue.state ? `, ${venue.state}` : ''}
        </Text>
        {typeof venue.upcomingEventCount === 'number' && venue.upcomingEventCount > 0 ? (
          <View style={styles.upcomingBadge}>
            <Ionicons name="calendar" size={10} color={colors.success} />
            <Text style={styles.upcomingText}>{venue.upcomingEventCount} upcoming shows</Text>
          </View>
        ) : null}
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  image: {
    width: 48,
    height: 48,
    borderRadius: 10,
    marginRight: spacing.md - 4,
  },
  imagePlaceholder: {
    backgroundColor: 'rgba(0, 212, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  location: {
    fontSize: 13,
    color: colors.textTertiary,
    marginTop: 2,
  },
  upcomingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  upcomingText: {
    fontSize: 11,
    color: colors.success,
    fontWeight: '600',
  },
});



