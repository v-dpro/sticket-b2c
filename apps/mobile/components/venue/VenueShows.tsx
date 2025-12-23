import React from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import type { VenueShow } from '../../types/venue';

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
            ListFooterComponent={pastLoading ? <View style={styles.footer}><ActivityIndicator size="small" color="#8B5CF6" /></View> : null}
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
                    <Ionicons name="people" size={12} color="#6B6B8D" />
                    <Text style={styles.secondaryText}>{item.logCount} logged</Text>
                  </View>
                </View>

                {item.userLogged ? (
                  <View style={styles.loggedBadge}>
                    <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
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
    color: '#FFFFFF',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  upcomingCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 16,
    width: 220,
    borderWidth: 1,
    borderColor: '#2D2D4A',
  },
  dateBadge: {
    backgroundColor: '#8B5CF6',
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
    color: '#FFFFFF',
    textAlign: 'center',
  },
  showInfo: {
    flex: 1,
  },
  primaryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  secondaryText: {
    fontSize: 12,
    color: '#6B6B8D',
  },
  showRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2D2D4A',
  },
  dateColumn: {
    width: 48,
    alignItems: 'center',
    marginRight: 12,
  },
  dateMonthSmall: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8B5CF6',
    textTransform: 'uppercase',
  },
  dateDaySmall: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  dateYearSmall: {
    fontSize: 10,
    color: '#6B6B8D',
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
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  logButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
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
    color: '#00D4FF',
  },
});



