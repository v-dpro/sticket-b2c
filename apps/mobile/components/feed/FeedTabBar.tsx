import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../lib/theme';

export type FeedTab = 'friends' | 'discover';

interface FeedTabBarProps {
  activeTab: FeedTab;
  onTabChange: (tab: FeedTab) => void;
}

export function FeedTabBar({ activeTab, onTabChange }: FeedTabBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.tabActive]}
          onPress={() => onTabChange('friends')}
          activeOpacity={0.85}
        >
          <Ionicons name="people" size={18} color={activeTab === 'friends' ? colors.textPrimary : colors.textTertiary} />
          <Text style={[styles.tabText, activeTab === 'friends' && styles.tabTextActive]}>Friends</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'discover' && styles.tabActive]}
          onPress={() => onTabChange('discover')}
          activeOpacity={0.85}
        >
          <Ionicons name="globe" size={18} color={activeTab === 'discover' ? colors.textPrimary : colors.textTertiary} />
          <Text style={[styles.tabText, activeTab === 'discover' && styles.tabTextActive]}>Discover</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 4,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: colors.surfaceElevated,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textTertiary,
  },
  tabTextActive: {
    color: colors.textPrimary,
  },
});


