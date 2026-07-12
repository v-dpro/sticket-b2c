// TipsList — venue tips: inline composer (category + text) on top,
// upvotable tip cards below. Wired to the existing tips API via
// callbacks from the venue page.

import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import type { VenueTip } from '../../types/venue';
import { durations, haptics } from '../../lib/motion';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { PillButton } from '../ui/PillButton';
import { SpringPressable } from '../ui/SpringPressable';
import { Chip, QuietEmpty } from './EntityBits';
import { monoDate } from './format';

const CATEGORIES: VenueTip['category'][] = ['general', 'parking', 'food', 'seating', 'entry'];

type TipsListProps = {
  tips: VenueTip[];
  onUpvote: (tipId: string) => void;
  onAdd: (text: string, category: string) => Promise<boolean>;
  autoFocusComposer?: boolean;
};

export function TipsList({ tips, onUpvote, onAdd, autoFocusComposer = false }: TipsListProps) {
  const [draft, setDraft] = useState('');
  const [category, setCategory] = useState<VenueTip['category']>('general');
  const [submitting, setSubmitting] = useState(false);
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    composer: {
      backgroundColor: t.colors.card,
      borderRadius: t.radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.hairline,
      padding: 14,
      gap: 10,
      marginBottom: 16,
    },
    input: {
      minHeight: 56,
      fontSize: 14,
      color: t.colors.text,
      textAlignVertical: 'top',
      padding: 0,
    },
    composerFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1 },
    tipCard: {
      backgroundColor: t.colors.card,
      borderRadius: t.radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.hairline,
      padding: 14,
      flexDirection: 'row',
      gap: 12,
      marginBottom: 8,
    },
    tipBody: { flex: 1, gap: 6 },
    tipText: { fontSize: 14, color: t.colors.text, lineHeight: 20 },
    tipMeta: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10,
      letterSpacing: 0.5,
      color: t.colors.muteSoft,
    },
    categoryTag: {
      alignSelf: 'flex-start',
      backgroundColor: t.colors.card2,
      borderRadius: t.radius.full,
      paddingHorizontal: 9,
      paddingVertical: 3,
    },
    categoryTagText: {
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: t.colors.mute,
    },
    upvote: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      minWidth: 40,
      borderRadius: t.radius.md,
      backgroundColor: t.colors.card2,
      paddingVertical: 8,
    },
    upvoteCount: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 12,
      color: t.colors.text,
    },
  }));

  const trimmed = draft.trim();
  const canPost = trimmed.length > 2 && !submitting;

  const handlePost = async () => {
    if (!canPost) return;
    setSubmitting(true);
    try {
      const ok = await onAdd(trimmed, category);
      if (ok) {
        setDraft('');
        setCategory('general');
        haptics.medium();
      } else {
        haptics.error();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View>
      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Know this venue? Drop a tip for the next crowd…"
          placeholderTextColor={tokens.colors.muteSoft}
          style={styles.input}
          multiline
          maxLength={400}
          autoFocus={autoFocusComposer}
          accessibilityLabel="Write a venue tip"
        />
        <View style={styles.composerFooter}>
          <View style={styles.categoryRow}>
            {CATEGORIES.map((cat) => (
              <Chip
                key={cat}
                label={cat}
                active={category === cat}
                onPress={() => setCategory(cat)}
                style={{ height: 26, paddingHorizontal: 10 }}
              />
            ))}
          </View>
          <PillButton
            title={submitting ? 'Posting…' : 'Post'}
            size="sm"
            springFeedback
            haptic="light"
            disabled={!canPost}
            onPress={() => void handlePost()}
          />
        </View>
      </View>

      {tips.length === 0 ? (
        <QuietEmpty text="No tips yet. First in? Tell everyone where to park." />
      ) : (
        tips.map((tip, i) => (
          <Animated.View
            key={tip.id}
            entering={FadeInDown.delay(Math.min(i, 8) * durations.stagger).duration(240)}
            style={styles.tipCard}
          >
            <View style={styles.tipBody}>
              <View style={styles.categoryTag}>
                <Text style={styles.categoryTagText}>{tip.category}</Text>
              </View>
              <Text style={styles.tipText}>{tip.text}</Text>
              <Text style={styles.tipMeta}>
                @{tip.user.username} · {monoDate(tip.createdAt).toUpperCase()}
              </Text>
            </View>
            <SpringPressable
              onPress={() => {
                // light tick comes from SpringPressable's default haptic
                onUpvote(tip.id);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Upvote tip, ${tip.upvotes} upvotes`}
              accessibilityState={{ selected: tip.userUpvoted }}
              style={styles.upvote}
            >
              <Ionicons
                name="arrow-up"
                size={15}
                color={tip.userUpvoted ? tokens.colors.accent : tokens.colors.mute}
              />
              <Text
                style={[
                  styles.upvoteCount,
                  tip.userUpvoted ? { color: tokens.colors.accent } : null,
                ]}
              >
                {tip.upvotes}
              </Text>
            </SpringPressable>
          </Animated.View>
        ))
      )}
    </View>
  );
}
