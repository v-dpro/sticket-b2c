import React from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import type { VenueShow } from '../../types/venue';
import { colors, accentSets, radius } from '../../lib/theme';

const monoFont = Platform.select({ ios: 'Menlo', android: 'monospace' }) ?? 'monospace';

interface VenueShowsProps {
  upcoming: VenueShow[];
  past: VenueShow[];
  pastLoading: boolean;
  pastHasMore: boolean;
  onLoadMorePast: () => void;
  onShowPress: (eventId: string) => void;
  onLogPress: (show: VenueShow) => void;
}

export function VenueShows({ upcoming, past, pastLoading, pastHasMore, onLoadMorePast, onShowPress, onLogPress }: VenueShowsProps) {
  return (
    <View style={styles.container}>
      {/* Upcoming shows */}
      {upcoming.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{upcoming.length} UPCOMING SHOWS</Text>

          <View style={styles.card}>
            {upcoming.map((show, i) => (
              <Pressable
                key={show.id}
                style={[styles.upcomingRow, i < upcoming.length - 1 && styles.rowBorder]}
                onPress={() => onShowPress(show.id)}
              >
                <View style={styles.dateCol}>
                  <Text style={styles.dateMonth}>{format(new Date(show.date), 'MMM').toUpperCase()}</Text>
                  <Text style={styles.dateDay}>{format(new Date(show.date), 'd')}</Text>
                </View>

                <View style={styles.showInfo}>
                  <Text style={styles.artistName} numberOfLines={1}>{show.artist.name}</Text>
                  <Text style={styles.showMeta} numberOfLines={1}>
                    {format(new Date(show.date), 'EEE, MMM d')}
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={16} color={colors.textLo} />
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {/* Past shows */}
      {past.length || pastLoading ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PAST SHOWS</Text>

          <FlatList
            data={past}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            onEndReached={onLoadMorePast}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              pastLoading ? (
                <View style={styles.footer}>
                  <ActivityIndicator size="small" color={accentSets.cyan.hex} />
                </View>
              ) : null
            }
            renderItem={({ item, index }) => (
              <Pressable
                style={[styles.pastRow, index < past.length - 1 && styles.rowBorderSurface]}
                onPress={() => onShowPress(item.id)}
              >
                <View style={styles.dateColPast}>
                  <Text style={styles.dateMono}>
                    {format(new Date(item.date), 'MMM d').toUpperCase()}
                  </Text>
                  <Text style={styles.dateYear}>{format(new Date(item.date), 'yyyy')}</Text>
                </View>

                <View style={styles.showInfo}>
                  <Text style={styles.artistName} numberOfLines={1}>{item.artist.name}</Text>
                  <View style={styles.statsRow}>
                    <Ionicons name="people" size={11} color={colors.textLo} />
                    <Text style={styles.showMeta}>{item.logCount} logged</Text>
                  </View>
                </View>

                {item.userLogged ? (
                  <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                ) : (
                  <Pressable
                    style={styles.logButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      onLogPress(item);
                    }}
                  >
                    <Text style={styles.logButtonText}>Log</Text>
                  </Pressable>
                )}
              </Pressable>
            )}
          />

          {pastHasMore && !pastLoading ? (
            <Pressable style={styles.loadMoreButton} onPress={onLoadMorePast}>
              <Text style={styles.loadMoreText}>Load more</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionLabel: {
    fontFamily: monoFont,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 2,
    color: colors.textLo,
    marginBottom: 10,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    overflow: 'hidden',
  },
  upcomingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  rowBorderSurface: {
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  dateCol: {
    width: 44,
    alignItems: 'center',
    marginRight: 12,
  },
  dateMonth: {
    fontFamily: monoFont,
    fontSize: 9,
    fontWeight: '600',
    color: accentSets.cyan.hex,
    letterSpacing: 1,
  },
  dateDay: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textHi,
  },
  dateColPast: {
    width: 44,
    marginRight: 12,
  },
  dateMono: {
    fontFamily: monoFont,
    fontSize: 10,
    fontWeight: '500',
    color: colors.textLo,
    letterSpacing: 0.5,
  },
  dateYear: {
    fontFamily: monoFont,
    fontSize: 9,
    color: colors.textLo,
  },
  showInfo: {
    flex: 1,
  },
  artistName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textHi,
    marginBottom: 2,
  },
  showMeta: {
    fontSize: 12,
    color: colors.textLo,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  logButton: {
    backgroundColor: accentSets.cyan.hex,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  logButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.ink,
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  loadMoreButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  loadMoreText: {
    fontSize: 13,
    color: accentSets.cyan.hex,
  },
});
