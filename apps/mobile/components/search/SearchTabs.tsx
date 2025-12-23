import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { SearchResults, SearchTab } from '../../types/search';
import { colors, radius, spacing } from '../../lib/theme';

interface SearchTabsProps {
  activeTab: SearchTab;
  onChangeTab: (tab: SearchTab) => void;
  results: SearchResults;
}

const TABS: { key: SearchTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'artists', label: 'Artists' },
  { key: 'venues', label: 'Venues' },
  { key: 'events', label: 'Events' },
  { key: 'users', label: 'People' },
];

export function SearchTabs({ activeTab, onChangeTab, results }: SearchTabsProps) {
  const getCount = (tab: SearchTab): number => {
    switch (tab) {
      case 'artists':
        return results.artists.length;
      case 'venues':
        return results.venues.length;
      case 'events':
        return results.events.length;
      case 'users':
        return results.users.length;
      case 'all':
        return results.totalCount;
      default:
        return 0;
    }
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.container}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        const count = getCount(tab.key);

        return (
          <Pressable
            key={tab.key}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => onChangeTab(tab.key)}
            accessibilityRole="button"
          >
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
            {count > 0 && (
              <View style={[styles.badge, isActive && styles.badgeActive]}>
                <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>{count > 99 ? '99+' : count}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  tabActive: {
    backgroundColor: colors.brandPurple,
    borderColor: colors.brandPurple,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.textPrimary,
  },
  badge: {
    backgroundColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textTertiary,
  },
  badgeTextActive: {
    color: colors.textPrimary,
  },
});



