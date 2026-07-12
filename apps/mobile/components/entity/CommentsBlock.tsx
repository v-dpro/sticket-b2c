// CommentsBlock — compact event comments: list + inline composer.
// Uses the existing event comments API via callbacks from the page.

import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import type { EventComment } from '../../types/event';
import { durations, haptics } from '../../lib/motion';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { SpringPressable } from '../ui/SpringPressable';
import { QuietEmpty } from './EntityBits';
import { monoDate } from './format';

type CommentsBlockProps = {
  comments: EventComment[];
  posting: boolean;
  onPost: (text: string) => Promise<boolean>;
};

export function CommentsBlock({ comments, posting, onPost }: CommentsBlockProps) {
  const [draft, setDraft] = useState('');
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    composer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: comments.length ? 14 : 10,
    },
    input: {
      flex: 1,
      minHeight: 40,
      backgroundColor: t.colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.hairline,
      borderRadius: t.radius.full,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 14,
      color: t.colors.text,
    },
    send: {
      width: 40,
      height: 40,
      borderRadius: t.radius.full,
      backgroundColor: t.colors.inverseBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendDisabled: { backgroundColor: t.colors.card2 },
    row: { flexDirection: 'row', gap: 10, paddingVertical: 8 },
    avatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: t.colors.card2,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarInitial: { fontSize: 11, fontWeight: '600', color: t.colors.mute },
    body: { flex: 1, gap: 2 },
    metaRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
    username: { fontSize: 13, fontWeight: '600', color: t.colors.fg },
    date: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10,
      letterSpacing: 0.5,
      color: t.colors.muteSoft,
    },
    text: { fontSize: 14, color: t.colors.textSoft, lineHeight: 20 },
  }));

  const trimmed = draft.trim();
  const canSend = trimmed.length > 0 && !posting;

  const handleSend = async () => {
    if (!canSend) return;
    const ok = await onPost(trimmed);
    if (ok) {
      setDraft('');
      haptics.medium();
    } else {
      haptics.error();
    }
  };

  return (
    <View>
      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Add a comment…"
          placeholderTextColor={tokens.colors.muteSoft}
          style={styles.input}
          editable={!posting}
          maxLength={500}
          accessibilityLabel="Add a comment"
        />
        <SpringPressable
          onPress={() => void handleSend()}
          disabled={!canSend}
          shakeWhenDisabled={false}
          accessibilityRole="button"
          accessibilityLabel="Post comment"
          style={[styles.send, !canSend && styles.sendDisabled]}
        >
          <Ionicons
            name="arrow-up"
            size={17}
            color={canSend ? tokens.colors.inverseFg : tokens.colors.muteSoft}
          />
        </SpringPressable>
      </View>

      {comments.length === 0 ? (
        <QuietEmpty text="No comments yet — say something about this night." />
      ) : (
        comments.map((comment, i) => (
          <Animated.View
            key={comment.id}
            entering={FadeInDown.delay(Math.min(i, 8) * durations.stagger).duration(240)}
            style={styles.row}
          >
            <View style={styles.avatar}>
              {comment.user.avatarUrl ? (
                <Image
                  source={{ uri: comment.user.avatarUrl }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                  transition={80}
                  cachePolicy="memory-disk"
                />
              ) : (
                <Text style={styles.avatarInitial}>
                  {(comment.user.username?.trim()?.[0] ?? '?').toUpperCase()}
                </Text>
              )}
            </View>
            <View style={styles.body}>
              <View style={styles.metaRow}>
                <Text style={styles.username} numberOfLines={1}>
                  {comment.user.displayName || comment.user.username}
                </Text>
                <Text style={styles.date}>{monoDate(comment.createdAt)}</Text>
              </View>
              <Text style={styles.text}>{comment.text}</Text>
            </View>
          </Animated.View>
        ))
      )}
    </View>
  );
}
