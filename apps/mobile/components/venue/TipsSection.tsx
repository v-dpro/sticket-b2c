import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { colors } from '../../lib/theme';
import type { VenueTip } from '../../types/venue';

interface TipsSectionProps {
  tips: VenueTip[];
  onUpvote: (tipId: string) => void;
  onAddTipPress: () => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  parking: 'car',
  food: 'restaurant',
  seating: 'grid',
  entry: 'enter',
  general: 'information-circle',
};

const CATEGORY_COLORS: Record<string, string> = {
  parking: colors.brandCyan,
  food: colors.warning,
  seating: colors.brandPurple,
  entry: colors.success,
  general: colors.textLo,
};

export function TipsSection({ tips, onUpvote, onAddTipPress }: TipsSectionProps) {
  const [filter, setFilter] = useState<string | null>(null);

  const categories = useMemo(() => [...new Set(tips.map((t) => t.category))], [tips]);

  const filteredTips = useMemo(() => (filter ? tips.filter((t) => t.category === filter) : tips), [tips, filter]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tips</Text>
        <Pressable style={styles.addButton} onPress={onAddTipPress}>
          <Ionicons name="add" size={20} color={colors.brandPurple} />
          <Text style={styles.addText}>Add Tip</Text>
        </Pressable>
      </View>

      {categories.length > 1 ? (
        <View style={styles.filterRow}>
          <Pressable style={[styles.filterChip, !filter && styles.filterChipActive]} onPress={() => setFilter(null)}>
            <Text style={[styles.filterText, !filter && styles.filterTextActive]}>All</Text>
          </Pressable>
          {categories.map((cat) => (
            <Pressable
              key={cat}
              style={[styles.filterChip, filter === cat && styles.filterChipActive]}
              onPress={() => setFilter(cat)}
            >
              <Ionicons
                name={(CATEGORY_ICONS[cat] || 'information-circle') as any}
                size={14}
                color={filter === cat ? colors.textHi : CATEGORY_COLORS[cat] || colors.textLo}
              />
              <Text style={[styles.filterText, filter === cat && styles.filterTextActive]}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {filteredTips.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="bulb-outline" size={40} color={colors.textLo} />
          <Text style={styles.emptyText}>No tips yet. Be the first!</Text>
        </View>
      ) : (
        <View style={styles.tipsList}>
          {filteredTips.map((tip) => (
            <View key={tip.id} style={styles.tipCard}>
              <View style={styles.tipHeader}>
                <View style={[styles.categoryBadge, { backgroundColor: `${CATEGORY_COLORS[tip.category]}20` }]}>
                  <Ionicons name={CATEGORY_ICONS[tip.category] as any} size={12} color={CATEGORY_COLORS[tip.category]} />
                  <Text style={[styles.categoryText, { color: CATEGORY_COLORS[tip.category] }]}>{tip.category}</Text>
                </View>
                <Text style={styles.tipTime}>{formatDistanceToNow(new Date(tip.createdAt), { addSuffix: true })}</Text>
              </View>

              <Text style={styles.tipText}>{tip.text}</Text>

              <View style={styles.tipFooter}>
                <Text style={styles.tipAuthor}>@{tip.user.username}</Text>
                <Pressable style={styles.upvoteButton} onPress={() => onUpvote(tip.id)}>
                  <Ionicons
                    name={tip.userUpvoted ? 'arrow-up-circle' : 'arrow-up-circle-outline'}
                    size={20}
                    color={tip.userUpvoted ? colors.brandPurple : colors.textLo}
                  />
                  <Text style={[styles.upvoteCount, tip.userUpvoted && styles.upvoteCountActive]}>{tip.upvotes}</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textHi,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addText: {
    fontSize: 14,
    color: colors.brandPurple,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
    flexWrap: 'wrap',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surface,
    gap: 4,
  },
  filterChipActive: {
    backgroundColor: colors.brandPurple,
  },
  filterText: {
    fontSize: 12,
    color: colors.textMid,
  },
  filterTextActive: {
    color: colors.textHi,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    marginHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textLo,
    marginTop: 8,
  },
  tipsList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  tipCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  tipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  tipTime: {
    fontSize: 11,
    color: colors.textLo,
  },
  tipText: {
    fontSize: 14,
    color: colors.textHi,
    lineHeight: 20,
  },
  tipFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  tipAuthor: {
    fontSize: 12,
    color: colors.textLo,
  },
  upvoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  upvoteCount: {
    fontSize: 12,
    color: colors.textLo,
  },
  upvoteCountActive: {
    color: colors.brandPurple,
  },
});



