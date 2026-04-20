import React, { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { colors, accentSets, radius, fontFamilies } from '../../lib/theme';
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

export function TipsSection({ tips, onUpvote, onAddTipPress }: TipsSectionProps) {
  const [filter, setFilter] = useState<string | null>(null);

  const categories = useMemo(() => [...new Set(tips.map((t) => t.category))], [tips]);

  const filteredTips = useMemo(() => (filter ? tips.filter((t) => t.category === filter) : tips), [tips, filter]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionLabel}>INSIDER TIPS</Text>
        <Pressable style={styles.addButton} onPress={onAddTipPress}>
          <Ionicons name="add" size={18} color={accentSets.cyan.hex} />
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
                size={12}
                color={filter === cat ? colors.ink : colors.textLo}
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
          <Ionicons name="bulb-outline" size={32} color={colors.textLo} />
          <Text style={styles.emptyText}>No tips yet. Be the first!</Text>
        </View>
      ) : (
        <View style={styles.tipsList}>
          {filteredTips.map((tip) => (
            <View key={tip.id} style={styles.tipRow}>
              {/* Avatar */}
              {tip.user.avatarUrl ? (
                <Image source={{ uri: tip.user.avatarUrl }} style={styles.tipAvatar} />
              ) : (
                <View style={[styles.tipAvatar, styles.tipAvatarPlaceholder]}>
                  <Text style={styles.tipAvatarInitial}>
                    {(tip.user.username || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}

              <View style={styles.tipContent}>
                <View style={styles.tipMeta}>
                  <Text style={styles.tipUser}>@{tip.user.username}</Text>
                </View>
                <Text style={styles.tipText}>{tip.text}</Text>
              </View>

              <Pressable style={styles.upvoteButton} onPress={() => onUpvote(tip.id)}>
                <Ionicons
                  name={tip.userUpvoted ? 'arrow-up-circle' : 'arrow-up-circle-outline'}
                  size={18}
                  color={tip.userUpvoted ? accentSets.cyan.hex : colors.textLo}
                />
                <Text style={[styles.upvoteCount, tip.userUpvoted && styles.upvoteCountActive]}>
                  {tip.upvotes}
                </Text>
              </Pressable>
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
    marginBottom: 10,
  },
  sectionLabel: {
    fontFamily: fontFamilies.monoMedium,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 2,
    color: colors.textLo,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addText: {
    fontSize: 13,
    color: accentSets.cyan.hex,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 6,
    flexWrap: 'wrap',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    gap: 4,
  },
  filterChipActive: {
    backgroundColor: accentSets.cyan.hex,
    borderColor: accentSets.cyan.hex,
  },
  filterText: {
    fontSize: 11,
    color: colors.textMid,
  },
  filterTextActive: {
    color: colors.ink,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 28,
    marginHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textLo,
    marginTop: 8,
  },
  tipsList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tipRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: 12,
  },
  tipAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 10,
  },
  tipAvatarPlaceholder: {
    backgroundColor: colors.elevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipAvatarInitial: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMid,
  },
  tipContent: {
    flex: 1,
  },
  tipMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  tipUser: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textHi,
  },
  tipRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  tipRatingText: {
    fontSize: 10,
    color: colors.warning,
    fontWeight: '600',
  },
  tipText: {
    fontSize: 13.5,
    color: colors.textMid,
    lineHeight: 13.5 * 1.4,
  },
  upvoteButton: {
    alignItems: 'center',
    marginLeft: 8,
    gap: 2,
  },
  upvoteCount: {
    fontSize: 11,
    color: colors.textLo,
  },
  upvoteCountActive: {
    color: accentSets.cyan.hex,
  },
});
