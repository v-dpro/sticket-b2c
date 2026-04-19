import React from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import type { VenueShow } from '../../types/venue';
import { colors } from '../../lib/theme';

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
      {upcoming.length ? (
        <View style={{ marginTop: 24 }}>
          <Text style={styles.title}>Upcoming Shows</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {upcoming.map((show) => (
              <Pressable key={show.id} style={styles.upcomingCard} onPress={() => onShowPress(show.id)}>
                <View style={styles.dateBadge}>
                  <Text style={styles.dateMonth}>{format(new Date(show.date), 'MMM').toUpperCase()}</Text>
                  <Text style={styles.dateDay}>{format(new Date(show.date), 'd')}</Text>
                </View>

                <View style={styles.showInfo}>
                  <Text style={styles.primaryName} numberOfLines={1}>
                    {show.artist.name}
                  </Text>
                  <Text style={styles.secondaryText} numberOfLines={1}>
                    {format(new Date(show.date), 'EEE, MMM d')} 
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {past.length || pastLoading ? (
        <View style={{ marginTop: 24 }}>
          <Text style={styles.title}>Past Shows</Text>

          <FlatList
            data={past}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
            onEndReached={onLoadMorePast}
            onEndReachedThreshold={0.5}
            ListFooterComponent={pastLoading ? <View style={styles.footer}><ActivityIndicator size="small" color={colors.brandPurple} /></View> : null}
            renderItem={({ item }) => (
              <Pressable style={styles.showRow} onPress={() => onShowPress(item.id)}>
                <View style={styles.dateColumn}>
                  <Text style={styles.dateMonthSmall}>{format(new Date(item.date), 'MMM')}</Text>
                  <Text style={styles.dateDaySmall}>{format(new Date(item.date), 'd')}</Text>
                  <Text style={styles.dateYearSmall}>{format(new Date(item.date), 'yyyy')}</Text>
                </View>

                <View style={styles.rowInfo}>
                  <Text style={styles.primaryName} numberOfLines={1}>
                    {item.artist.name}
                  </Text>
                  <View style={styles.statsRow}>
                    <Ionicons name="people" size={12} color={colors.textLo} />
                    <Text style={styles.secondaryText}>{item.logCount} logged</Text>
                  </View>
                </View>

                {item.userLogged ? (
                  <View style={styles.loggedBadge}>
                    <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                  </View>
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
  container: {
    marginTop: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textHi,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  upcomingCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    width: 220,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  dateBadge: {
    backgroundColor: colors.brandPurple,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  dateMonth: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  dateDay: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textHi,
    textAlign: 'center',
  },
  showInfo: {
    flex: 1,
  },
  primaryName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textHi,
    marginBottom: 2,
  },
  secondaryText: {
    fontSize: 12,
    color: colors.textLo,
  },
  showRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  dateColumn: {
    width: 48,
    alignItems: 'center',
    marginRight: 12,
  },
  dateMonthSmall: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.brandPurple,
    textTransform: 'uppercase',
  },
  dateDaySmall: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textHi,
  },
  dateYearSmall: {
    fontSize: 10,
    color: colors.textLo,
  },
  rowInfo: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  loggedBadge: {
    padding: 8,
  },
  logButton: {
    backgroundColor: colors.brandPurple,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  logButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textHi,
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  loadMoreButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  loadMoreText: {
    fontSize: 14,
    color: colors.brandCyan,
  },
});



