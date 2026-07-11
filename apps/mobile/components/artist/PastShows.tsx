import React from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import type { ArtistShow } from '../../types/artist';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

interface PastShowsProps {
  shows: ArtistShow[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onShowPress: (showId: string) => void;
  onLogPress: (show: ArtistShow) => void;
}

export function PastShows({ shows, loading, hasMore, onLoadMore, onShowPress, onLogPress }: PastShowsProps) {
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    container: {
      marginTop: 24,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: t.colors.textHi,
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    listContent: {
      paddingHorizontal: 16,
    },
    showRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.colors.surface,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
    },
    dateColumn: {
      width: 48,
      alignItems: 'center',
      marginRight: 12,
    },
    dateMonth: {
      fontSize: 10,
      fontWeight: '600',
      color: t.colors.brandPurple,
      textTransform: 'uppercase',
    },
    dateDay: {
      fontSize: 18,
      fontWeight: 'bold',
      color: t.colors.textHi,
    },
    dateYear: {
      fontSize: 10,
      color: t.colors.textLo,
    },
    showInfo: {
      flex: 1,
    },
    venueName: {
      fontSize: 14,
      fontWeight: '500',
      color: t.colors.textHi,
      marginBottom: 2,
    },
    venueCity: {
      fontSize: 12,
      color: t.colors.textLo,
      marginBottom: 4,
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    statsText: {
      fontSize: 11,
      color: t.colors.textLo,
    },
    loggedBadge: {
      padding: 8,
    },
    logButton: {
      backgroundColor: t.colors.brandPurple,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 16,
    },
    logButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: t.colors.textHi,
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
      color: t.colors.brandCyan,
    },
  }));

  if (shows.length === 0 && !loading) {
    return null;
  }

  const renderItem = ({ item }: { item: ArtistShow }) => (
    <Pressable style={styles.showRow} onPress={() => onShowPress(item.id)}>
      {/* Date */}
      <View style={styles.dateColumn}>
        <Text style={styles.dateMonth}>{format(new Date(item.date), 'MMM')}</Text>
        <Text style={styles.dateDay}>{format(new Date(item.date), 'd')}</Text>
        <Text style={styles.dateYear}>{format(new Date(item.date), 'yyyy')}</Text>
      </View>

      {/* Show Info */}
      <View style={styles.showInfo}>
        <Text style={styles.venueName} numberOfLines={1}>
          {item.venue.name}
        </Text>
        <Text style={styles.venueCity} numberOfLines={1}>
          {item.venue.city}{item.venue.state ? `, ${item.venue.state}` : ''}
        </Text>

        <View style={styles.statsRow}>
          <Ionicons name="people" size={12} color={tokens.colors.textLo} />
          <Text style={styles.statsText}>{item.logCount} logged</Text>
        </View>
      </View>

      {/* Action */}
      {item.userLogged ? (
        <View style={styles.loggedBadge}>
          <Ionicons name="checkmark-circle" size={18} color={tokens.colors.success} />
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
  );

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={tokens.colors.brandPurple} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Past Shows</Text>

      <FlatList
        data={shows}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListFooterComponent={renderFooter}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.5}
        scrollEnabled={false}
        contentContainerStyle={styles.listContent}
      />

      {hasMore && !loading && (
        <Pressable style={styles.loadMoreButton} onPress={onLoadMore}>
          <Text style={styles.loadMoreText}>Load more</Text>
        </Pressable>
      )}
    </View>
  );
}
