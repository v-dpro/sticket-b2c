import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { colors, accentSets, radius, fontFamilies } from '../../lib/theme';
import type { UserVenueShow } from '../../types/venue';

interface YourVenueHistoryProps {
  showCount: number;
  firstShow?: UserVenueShow;
  lastShow?: UserVenueShow;
  onSeeAllPress: () => void;
}

export function YourVenueHistory({ showCount, firstShow, lastShow, onSeeAllPress }: YourVenueHistoryProps) {
  if (showCount === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionLabel}>YOUR SHOWS</Text>
        <View style={styles.emptyCard}>
          <Ionicons name="ticket-outline" size={28} color={colors.textLo} />
          <Text style={styles.emptyTitle}>You haven't been here yet</Text>
          <Text style={styles.emptySubtitle}>Check out upcoming shows below!</Text>
        </View>
      </View>
    );
  }

  // Collect shows to display as MiniShowRows
  const shows: UserVenueShow[] = [];
  if (firstShow) shows.push(firstShow);
  if (lastShow && lastShow.eventId !== firstShow?.eventId) shows.push(lastShow);

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>YOU'VE BEEN HERE {showCount}x</Text>

      <View style={styles.showList}>
        {shows.map((show) => (
          <Pressable key={show.eventId} style={styles.showRow} onPress={onSeeAllPress}>
            <View style={[styles.showCover, styles.showCoverPlaceholder]}>
              <Ionicons name="musical-notes" size={18} color={colors.textLo} />
            </View>
            <View style={styles.showInfo}>
              <Text style={styles.showArtist} numberOfLines={1}>{show.artistName}</Text>
            </View>
            <Text style={styles.showDate}>{format(new Date(show.date), 'MMM d, yyyy')}</Text>
          </Pressable>
        ))}
      </View>

      {showCount > 2 ? (
        <Pressable style={styles.seeAllButton} onPress={onSeeAllPress}>
          <Text style={styles.seeAllText}>See all {showCount} shows</Text>
          <Ionicons name="chevron-forward" size={14} color={accentSets.cyan.hex} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionLabel: {
    fontFamily: fontFamilies.monoMedium,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 2,
    color: colors.textLo,
    marginBottom: 10,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 28,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textHi,
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textMid,
    marginTop: 4,
  },
  showList: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    overflow: 'hidden',
  },
  showRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  showCover: {
    width: 44,
    height: 44,
    borderRadius: 6,
  },
  showCoverPlaceholder: {
    backgroundColor: colors.elevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  showInfo: {
    flex: 1,
    marginLeft: 12,
  },
  showArtist: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textHi,
    marginBottom: 2,
  },
  showVenue: {
    fontSize: 12,
    color: colors.textLo,
  },
  showDate: {
    fontFamily: fontFamilies.mono,
    fontSize: 10,
    color: colors.textLo,
    letterSpacing: 0.5,
  },
  seeAllButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    marginTop: 6,
  },
  seeAllText: {
    fontSize: 13,
    color: accentSets.cyan.hex,
  },
});
