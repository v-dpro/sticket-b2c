import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ThemeTokens } from '../../lib/theme';
import { useThemedStyles } from '../../lib/theme-context';

export type FeedTab = 'friends' | 'discover';

interface FeedTabBarProps {
  activeTab: FeedTab;
  onTabChange: (tab: FeedTab) => void;
}

const TABS: { key: FeedTab; label: string }[] = [
  { key: 'friends', label: 'Friends' },
  { key: 'discover', label: 'Public' },
];

export function FeedTabBar({ activeTab, onTabChange }: FeedTabBarProps) {
  const styles = useThemedStyles(buildStyles);
  return (
    <View style={styles.track}>
      {TABS.map((tab) => {
        const active = activeTab === tab.key;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onTabChange(tab.key)}
            style={({ pressed }) => [styles.pill, active && styles.pillActive, pressed && { opacity: 0.85 }]}
          >
            <Text style={[styles.pillText, active && styles.pillTextActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const buildStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    track: {
      flexDirection: 'row',
      alignSelf: 'flex-start',
      padding: 4,
      backgroundColor: tokens.colors.card2,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: tokens.colors.hairline,
    },
    pill: {
      paddingVertical: 8,
      paddingHorizontal: 18,
      borderRadius: 999,
    },
    pillActive: {
      backgroundColor: tokens.colors.inverseBg,
    },
    pillText: {
      fontSize: 13,
      fontWeight: '600',
      color: tokens.colors.mute,
    },
    pillTextActive: {
      color: tokens.colors.inverseFg,
      fontWeight: '700',
    },
  });
