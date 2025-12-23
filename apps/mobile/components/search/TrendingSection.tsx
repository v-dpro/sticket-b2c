import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

import type { TrendingData } from '../../types/search';
import { colors, radius, spacing } from '../../lib/theme';

interface TrendingSectionProps {
  data: TrendingData;
  onSearchSelect: (query: string) => void;
}

export function TrendingSection({ data, onSearchSelect }: TrendingSectionProps) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {data.artists.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trending Artists</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.artistScroll}>
            {data.artists.map((artist) => (
              <Pressable
                key={artist.id}
                style={styles.artistCard}
                onPress={() => router.push(`/artist/${artist.id}`)}
                accessibilityRole="button"
              >
                {artist.imageUrl ? (
                  <Image source={{ uri: artist.imageUrl }} style={styles.artistImage} />
                ) : (
                  <View style={[styles.artistImage, styles.artistPlaceholder]}>
                    <Ionicons name="person" size={22} color={colors.brandPurple} />
                  </View>
                )}
                <Text style={styles.artistName} numberOfLines={1}>
                  {artist.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {data.searches.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Popular Searches</Text>
          <View style={styles.searchTags}>
            {data.searches.map((query, index) => (
              <Pressable
                key={`${query}-${index}`}
                style={styles.searchTag}
                onPress={() => onSearchSelect(query)}
                accessibilityRole="button"
              >
                <Ionicons name="trending-up" size={14} color={colors.brandPurple} />
                <Text style={styles.searchTagText}>{query}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.lg - 8,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm + 4,
  },
  artistScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm + 4,
  },
  artistCard: {
    width: 82,
    alignItems: 'center',
  },
  artistImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: spacing.sm,
  },
  artistPlaceholder: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  artistName: {
    fontSize: 12,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  searchTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md - 4,
    paddingVertical: spacing.sm,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchTagText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});



