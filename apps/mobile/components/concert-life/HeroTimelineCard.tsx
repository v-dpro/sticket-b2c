import React from 'react';
import { Image, ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, radius, spacing } from '../../lib/theme';

type HeroTimelineCardProps = {
  // Core
  artist: string;
  tour?: string | null;
  venue: string;
  city: string;
  date: Date;
  imageUrl?: string | null;

  // Badges
  showUpcomingPill?: boolean;

  // Log extras
  rating?: number | null;
  note?: string | null;
  likesCount?: number;
  commentsCount?: number;
  isLiked?: boolean;

  // Handlers
  onPress?: () => void;
  onToggleLike?: () => void;
  onPressComments?: () => void;
  onPressShare?: () => void;
};

function formatChipDate(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function HeroTimelineCard({
  artist,
  tour,
  venue,
  city,
  date,
  imageUrl,
  showUpcomingPill = false,
  rating,
  note,
  likesCount = 0,
  commentsCount = 0,
  isLiked = false,
  onPress,
  onToggleLike,
  onPressComments,
  onPressShare,
}: HeroTimelineCardProps) {
  return (
    <View style={styles.shell}>
      <Pressable onPress={onPress} style={styles.heroPressable} accessibilityRole="button">
        <ImageBackground source={imageUrl ? { uri: imageUrl } : undefined} style={styles.hero} imageStyle={styles.heroImage}>
          {/* Fallback when no image */}
          {!imageUrl ? <View style={styles.heroFallback} /> : null}

          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.9)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.heroOverlay}
          />

          {showUpcomingPill ? (
            <View style={styles.upcomingPill}>
              <Text style={styles.upcomingPillText}>UPCOMING</Text>
            </View>
          ) : null}

          <View style={styles.dateChip}>
            <Text style={styles.dateChipText}>{formatChipDate(date)}</Text>
          </View>

          <View style={styles.heroInfo}>
            <Text style={styles.heroArtist} numberOfLines={1}>
              {artist}
            </Text>
            {tour ? (
              <Text style={styles.heroTour} numberOfLines={1}>
                {tour}
              </Text>
            ) : null}
            <View style={styles.heroVenueRow}>
              <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.75)" />
              <Text style={styles.heroVenueText} numberOfLines={1}>
                {venue}, {city}
              </Text>
            </View>
          </View>
        </ImageBackground>
      </Pressable>

      <View style={styles.footer}>
        {typeof rating === 'number' ? (
          <View style={styles.ratingRow}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Ionicons key={i} name="star" size={16} color={i < Math.round(rating) ? colors.gold : '#3D3D5C'} />
            ))}
          </View>
        ) : null}

        {note ? (
          <Text style={styles.note} numberOfLines={2}>
            “{note}”
          </Text>
        ) : null}

        <View style={styles.actionsRow}>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onToggleLike?.();
            }}
            style={styles.actionButton}
            accessibilityRole="button"
          >
            <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={20} color={isLiked ? colors.pink : colors.textTertiary} />
            {likesCount > 0 ? <Text style={[styles.actionCount, isLiked && { color: colors.pink }]}>{likesCount}</Text> : null}
          </Pressable>

          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onPressComments?.();
            }}
            style={styles.actionButton}
            accessibilityRole="button"
          >
            <Ionicons name="chatbubble-outline" size={20} color={colors.textTertiary} />
            {commentsCount > 0 ? <Text style={styles.actionCount}>{commentsCount}</Text> : null}
          </Pressable>

          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onPressShare?.();
            }}
            style={[styles.actionButton, { marginLeft: 'auto' }]}
            accessibilityRole="button"
          >
            <Ionicons name="share-social-outline" size={20} color={colors.textTertiary} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  heroPressable: {
    width: '100%',
  },
  hero: {
    height: 260,
    width: '100%',
    justifyContent: 'flex-end',
  },
  heroImage: {
    resizeMode: 'cover',
  },
  heroFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surfaceElevated,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  heroInfo: {
    padding: spacing.lg,
  },
  heroArtist: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  heroTour: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  heroVenueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroVenueText: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  dateChip: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  dateChipText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  upcomingPill: {
    position: 'absolute',
    top: 16,
    left: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 212, 255, 0.9)',
  },
  upcomingPillText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  footer: {
    padding: spacing.lg,
    gap: 10,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 2,
  },
  note: {
    color: colors.textPrimary,
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionCount: {
    color: colors.textTertiary,
    fontSize: 13,
    fontWeight: '700',
  },
});


