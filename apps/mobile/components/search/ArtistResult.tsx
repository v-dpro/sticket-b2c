import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

import type { ArtistResult as ArtistResultType } from '../../types/search';
import { colors, spacing } from '../../lib/theme';

interface ArtistResultProps {
  artist: ArtistResultType;
  onPress?: () => void;
}

export function ArtistResult({ artist, onPress }: ArtistResultProps) {
  const router = useRouter();

  const handlePress = () => {
    onPress?.();
    router.push(`/artist/${artist.id}`);
  };

  return (
    <Pressable style={styles.container} onPress={handlePress} accessibilityRole="button">
      {artist.imageUrl ? (
        <Image source={{ uri: artist.imageUrl }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Ionicons name="person" size={22} color={colors.brandPurple} />
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {artist.name}
        </Text>
        {artist.genres?.length ? (
          <Text style={styles.genres} numberOfLines={1}>
            {artist.genres.slice(0, 3).join(' • ')}
          </Text>
        ) : null}

        {typeof artist.upcomingEventCount === 'number' && artist.upcomingEventCount > 0 ? (
          <View style={styles.upcomingBadge}>
            <Ionicons name="calendar" size={10} color={colors.success} />
            <Text style={styles.upcomingText}>{artist.upcomingEventCount} upcoming</Text>
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
    borderRadius: 24,
    marginRight: spacing.md - 4,
  },
  imagePlaceholder: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
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
  genres: {
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



