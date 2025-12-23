import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
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
  parking: '#00D4FF',
  food: '#F59E0B',
  seating: '#8B5CF6',
  entry: '#22C55E',
  general: '#6B6B8D',
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
          <Ionicons name="add" size={20} color="#8B5CF6" />
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
                color={filter === cat ? '#FFFFFF' : CATEGORY_COLORS[cat] || '#6B6B8D'}
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
          <Ionicons name="bulb-outline" size={40} color="#6B6B8D" />
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
                    color={tip.userUpvoted ? '#8B5CF6' : '#6B6B8D'}
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
    color: '#FFFFFF',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addText: {
    fontSize: 14,
    color: '#8B5CF6',
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
    backgroundColor: '#1A1A2E',
    gap: 4,
  },
  filterChipActive: {
    backgroundColor: '#8B5CF6',
  },
  filterText: {
    fontSize: 12,
    color: '#A0A0B8',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    marginHorizontal: 16,
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B6B8D',
    marginTop: 8,
  },
  tipsList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  tipCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2D2D4A',
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
    color: '#6B6B8D',
  },
  tipText: {
    fontSize: 14,
    color: '#FFFFFF',
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
    color: '#6B6B8D',
  },
  upvoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  upvoteCount: {
    fontSize: 12,
    color: '#6B6B8D',
  },
  upvoteCountActive: {
    color: '#8B5CF6',
  },
});



