import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { accentSets, colors, radius } from '../../lib/theme';

export type FeedTab = 'friends' | 'discover';

interface FeedTabBarProps {
  activeTab: FeedTab;
  onTabChange: (tab: FeedTab) => void;
}

const MONO_FONT = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });
const accent = accentSets.cyan;

const TABS: { key: FeedTab; label: string }[] = [
  { key: 'friends', label: 'Friends' },
  { key: 'discover', label: 'Public' },
];

export function FeedTabBar({ activeTab, onTabChange }: FeedTabBarProps) {
  return (
    <View style={styles.track}>
      {TABS.map((tab) => {
        const active = activeTab === tab.key;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onTabChange(tab.key)}
            style={({ pressed }) => [
              styles.pill,
              active && styles.pillActive,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text
              style={[
                styles.pillText,
                active && styles.pillTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    padding: 4,
    backgroundColor: colors.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  pillActive: {
    backgroundColor: accent.hex,
  },
  pillText: {
    fontFamily: MONO_FONT,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMid,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  pillTextActive: {
    color: colors.ink,
  },
});
