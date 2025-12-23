import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { VenueRatingsSummary } from '../../types/venue';

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
    const color = value >= 4 ? '#22C55E' : value >= 3 ? '#F59E0B' : '#EF4444';

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

      <View style={styles.ratingsGrid}>
        {RATING_CATEGORIES.map(({ key, label, icon }) => {
          const value = ratings[key as keyof VenueRatingsSummary] as number | null;

          return (
            <View key={key} style={styles.ratingItem}>
              <View style={styles.ratingHeader}>
                <Ionicons name={icon as any} size={16} color="#8B5CF6" />
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

      <Pressable style={styles.rateButton} onPress={onRatePress}>
        <Ionicons name={userHasRated ? 'create-outline' : 'star-outline'} size={18} color="#8B5CF6" />
        <Text style={styles.rateButtonText}>{userHasRated ? 'Update Your Ratings' : 'Rate This Venue'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2D2D4A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  count: {
    fontSize: 12,
    color: '#6B6B8D',
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
    color: '#A0A0B8',
  },
  ratingBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#2D2D4A',
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
    color: '#FFFFFF',
    width: 32,
    textAlign: 'right',
  },
  noRating: {
    flex: 1,
    fontSize: 12,
    color: '#6B6B8D',
    fontStyle: 'italic',
    marginLeft: 12,
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#8B5CF6',
    gap: 8,
  },
  rateButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8B5CF6',
  },
});



