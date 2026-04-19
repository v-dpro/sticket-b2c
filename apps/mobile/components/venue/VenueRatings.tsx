import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, accentSets, radius } from '../../lib/theme';
import type { VenueRatingsSummary } from '../../types/venue';

const monoFont = Platform.select({ ios: 'Menlo', android: 'monospace' }) ?? 'monospace';

interface VenueRatingsProps {
  ratings: VenueRatingsSummary;
  userHasRated: boolean;
  onRatePress: () => void;
}

const RATING_CATEGORIES = [
  { key: 'sound', label: 'Sound', icon: 'volume-high' },
  { key: 'sightlines', label: 'Sightlines', icon: 'eye' },
  { key: 'drinks', label: 'Drinks', icon: 'beer' },
  { key: 'staff', label: 'Staff', icon: 'people' },
  { key: 'access', label: 'Access', icon: 'walk' },
] as const;

export function VenueRatings({ ratings, userHasRated, onRatePress }: VenueRatingsProps) {
  const renderRatingBar = (value: number | null) => {
    if (value === null) return null;

    const percentage = (value / 5) * 100;
    const color = value >= 4 ? colors.success : value >= 3 ? colors.warning : colors.error;

    return (
      <View style={styles.ratingBar}>
        <View style={[styles.ratingFill, { width: `${percentage}%`, backgroundColor: color }]} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Venue Ratings</Text>
        <Text style={styles.count}>{ratings.totalRatings} ratings</Text>
      </View>

      <View style={styles.ratingsCard}><View style={styles.ratingsGrid}>
        {RATING_CATEGORIES.map(({ key, label, icon }) => {
          const value = ratings[key as keyof VenueRatingsSummary] as number | null;

          return (
            <View key={key} style={styles.ratingItem}>
              <View style={styles.ratingHeader}>
                <Ionicons name={icon as any} size={16} color={colors.brandPurple} />
                <Text style={styles.ratingLabel}>{label}</Text>
              </View>

              {value !== null ? (
                <>
                  {renderRatingBar(value)}
                  <Text style={styles.ratingValue}>{value.toFixed(1)}</Text>
                </>
              ) : (
                <Text style={styles.noRating}>No ratings yet</Text>
              )}
            </View>
          );
        })}
      </View>

      </View><Pressable style={styles.rateButton} onPress={onRatePress}>
        <Ionicons name={userHasRated ? 'create-outline' : 'star-outline'} size={18} color={colors.brandPurple} />
        <Text style={styles.rateButtonText}>{userHasRated ? 'Update Your Ratings' : 'Rate This Venue'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontFamily: monoFont,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 2,
    color: colors.textLo,
    textTransform: 'uppercase',
  },
  count: {
    fontSize: 11,
    color: colors.textLo,
  },
  ratingsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: 14,
  },
  ratingsGrid: {
    gap: 12,
  },
  ratingItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 100,
    gap: 6,
  },
  ratingLabel: {
    fontSize: 13,
    color: colors.textMid,
  },
  ratingBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.hairline,
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  ratingFill: {
    height: '100%',
    borderRadius: 4,
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textHi,
    width: 32,
    textAlign: 'right',
  },
  noRating: {
    flex: 1,
    fontSize: 12,
    color: colors.textLo,
    fontStyle: 'italic',
    marginLeft: 12,
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    height: 40,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: colors.hairline,
    gap: 6,
  },
  rateButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMid,
  },
});



