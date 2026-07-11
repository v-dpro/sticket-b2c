import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import type { SearchResults, SearchTab } from '../../types/search';
import { radius, spacing } from '../../lib/theme';
import { useThemedStyles } from '../../lib/theme-context';

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
  const styles = useThemedStyles((t) => ({
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
      backgroundColor: t.colors.inkAlt,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      gap: 6,
    },
    tabActive: {
      backgroundColor: t.colors.brandPurple,
      borderColor: t.colors.brandPurple,
    },
    tabText: {
      fontSize: 14,
      fontWeight: '600',
      color: t.colors.textMid,
    },
    tabTextActive: {
      color: t.colors.onAccent, // over the purple-filled active tab
    },
    badge: {
      backgroundColor: t.colors.hairline,
      borderRadius: radius.full,
      paddingHorizontal: 8,
      paddingVertical: 2,
      minWidth: 20,
      alignItems: 'center',
    },
    badgeActive: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)', // white scrim over the purple active tab
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: t.colors.textLo,
    },
    badgeTextActive: {
      color: t.colors.onAccent, // over the purple-filled active tab
    },
  }));

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
