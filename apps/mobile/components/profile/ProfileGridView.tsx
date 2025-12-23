import React from 'react';
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { format } from 'date-fns';

import type { LogEntry } from '../../types/profile';
import { YearFilter } from './YearFilter';
import { colors } from '../../lib/theme';

interface ProfileGridViewProps {
  headerComponent?: React.ReactNode;
  logs: LogEntry[];
  years: number[];
  selectedYear: number | null;
  onYearSelect: (year: number | null) => void;
  onLogPress: (log: LogEntry) => void;
  onLoadMore: () => void;
  onRefresh: () => void;
  loading: boolean;
  hasMore: boolean;
}

export function ProfileGridView({
  headerComponent,
  logs,
  years,
  selectedYear,
  onYearSelect,
  onLogPress,
  onLoadMore,
  onRefresh,
  loading,
  hasMore,
}: ProfileGridViewProps) {
  const renderHeader = () => (
    <View>
      {headerComponent}
      <YearFilter years={years} selectedYear={selectedYear} onSelect={onYearSelect} />
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="images-outline" size={64} color={colors.textTertiary} />
      <Text style={styles.emptyTitle}>No photos yet</Text>
      <Text style={styles.emptyText}>Add photos to your show logs to build your grid.</Text>
    </View>
  );

  const renderFooter = () => {
    if (!hasMore) return null;
    return (
      <View style={styles.footer}>
        <Text style={styles.footerText}>Loading more...</Text>
      </View>
    );
  };

  return (
    <FlatList
      data={logs}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperStyle={styles.row}
      renderItem={({ item }) => {
        const imageUrl = item.photos?.[0]?.thumbnailUrl || item.photos?.[0]?.photoUrl || item.event.artist.imageUrl || undefined;
        const dateLabel = format(new Date(item.event.date), 'MMM d');

        return (
          <Pressable style={styles.tile} onPress={() => onLogPress(item)} accessibilityRole="button">
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.image} />
            ) : (
              <View style={[styles.image, styles.imagePlaceholder]}>
                <Ionicons name="musical-notes" size={22} color={colors.textTertiary} />
              </View>
            )}

            <View style={styles.overlayTopLeft}>
              <Text style={styles.overlayPillText}>{dateLabel}</Text>
            </View>

            {typeof item.rating === 'number' ? (
              <View style={styles.overlayTopRight}>
                <Ionicons name="star" size={12} color={colors.warning} />
                <Text style={styles.overlayPillText}>{item.rating.toFixed(1).replace(/\.0$/, '')}</Text>
              </View>
            ) : null}

            <View style={styles.caption}>
              <Text style={styles.captionTitle} numberOfLines={1}>
                {item.event.artist.name}
              </Text>
              <Text style={styles.captionSub} numberOfLines={1}>
                {item.event.venue.name}
              </Text>
            </View>
          </Pressable>
        );
      }}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={!loading ? renderEmpty : null}
      ListFooterComponent={renderFooter}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.5}
      refreshControl={<RefreshControl refreshing={loading && logs.length === 0} onRefresh={onRefresh} tintColor={colors.brandPurple} />}
      style={styles.list}
      contentContainerStyle={styles.listContent}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  row: {
    paddingHorizontal: 16,
    gap: 10,
  },
  tile: {
    flex: 1,
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 150,
  },
  imagePlaceholder: {
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayTopLeft: {
    position: 'absolute',
    left: 8,
    top: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  overlayTopRight: {
    position: 'absolute',
    right: 8,
    top: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  overlayPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  caption: {
    padding: 10,
  },
  captionTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  captionSub: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textTertiary,
    marginTop: 8,
    textAlign: 'center',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: colors.textTertiary,
  },
});



