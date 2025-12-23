import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { RecentSearch } from '../../types/search';
import { colors, spacing } from '../../lib/theme';

interface RecentSearchesProps {
  searches: RecentSearch[];
  onSelect: (query: string) => void;
  onRemove: (query: string) => void;
  onClearAll: () => void;
}

export function RecentSearches({ searches, onSelect, onRemove, onClearAll }: RecentSearchesProps) {
  if (!searches.length) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recent</Text>
        <Pressable onPress={onClearAll} hitSlop={8} accessibilityRole="button">
          <Text style={styles.clearAll}>Clear all</Text>
        </Pressable>
      </View>

      {searches.map((search, index) => (
        <Pressable
          key={`${search.query}-${index}`}
          style={styles.item}
          onPress={() => onSelect(search.query)}
          accessibilityRole="button"
        >
          <Ionicons name="time-outline" size={18} color={colors.textTertiary} />
          <Text style={styles.query} numberOfLines={1}>
            {search.query}
          </Text>
          <Pressable onPress={() => onRemove(search.query)} hitSlop={8} style={styles.removeButton} accessibilityRole="button">
            <Ionicons name="close" size={18} color={colors.textTertiary} />
          </Pressable>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clearAll: {
    fontSize: 13,
    color: colors.brandPurple,
    fontWeight: '700',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    gap: 12,
  },
  query: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
  },
  removeButton: {
    padding: 4,
  },
});



