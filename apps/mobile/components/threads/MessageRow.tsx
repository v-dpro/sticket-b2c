// MessageRow — the quiet chat/thread message row shared by the thread page
// and the party group chat. Avatar 28 · @username mono 10 muteSoft · body
// 14.5/400 with @mentions at ink weight · mono age on the right (which
// briefly swaps to "REPORTED" as toast-lite report feedback).
//
// Long-press is optional — the thread page wires it to the report sheet;
// the party chat leaves it off.

import React from 'react';
import { Pressable, Text, View, type StyleProp, type TextStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { durations, tearIn } from '../../lib/motion';
import { useThemedStyles } from '../../lib/theme-context';
import { monoDate } from '../entity/format';
import { Avatar } from '../ui/Avatar';

export type MessageAuthor = {
  id: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
};

/** ISO → "NOW" / "5M AGO" / "2H AGO" / "3D AGO" / "JUL 14" (older). */
export function monoAge(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const minutes = Math.floor((Date.now() - t) / 60_000);
  if (minutes < 1) return 'NOW';
  if (minutes < 60) return `${minutes}M AGO`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}H AGO`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}D AGO`;
  return monoDate(iso);
}

const MENTION_RE = /(@\w+)/g;

/** Body text with @mentions rendered at ink weight. No linking v1. */
export function MentionText({
  text,
  style,
  mentionStyle,
}: {
  text: string;
  style?: StyleProp<TextStyle>;
  mentionStyle?: StyleProp<TextStyle>;
}) {
  const parts = text.split(MENTION_RE);
  return (
    <Text style={style}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          // Odd indices are the captured @mentions (String.split with a
          // capturing group interleaves them).
          <Text key={i} style={mentionStyle}>
            {part}
          </Text>
        ) : (
          part
        ),
      )}
    </Text>
  );
}

type MessageRowProps = {
  author: MessageAuthor;
  text: string;
  createdAt: string;
  /** Row index — drives the tearIn stagger. */
  index?: number;
  /** Swaps the mono age for a brief "REPORTED" (report feedback). */
  reported?: boolean;
  onLongPress?: () => void;
};

export function MessageRow({
  author,
  text,
  createdAt,
  index = 0,
  reported = false,
  onLongPress,
}: MessageRowProps) {
  const styles = useThemedStyles((t) => ({
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8 },
    body: { flex: 1, minWidth: 0 },
    metaRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
    username: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10,
      letterSpacing: 0.5,
      color: t.colors.muteSoft,
      flexShrink: 1,
    },
    age: {
      fontFamily: t.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 10,
      letterSpacing: 0.5,
      color: t.colors.muteSoft,
    },
    ageReported: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 10,
      letterSpacing: 0.5,
      color: t.colors.fg,
    },
    text: { fontSize: 14.5, fontWeight: '400', color: t.colors.text, lineHeight: 20, marginTop: 3 },
    mention: { fontWeight: '700', color: t.colors.fg },
  }));

  return (
    <Animated.View entering={tearIn(Math.min(index, 8) * durations.stagger)}>
      <Pressable
        onLongPress={onLongPress}
        disabled={!onLongPress}
        accessibilityLabel={`Message from ${author.displayName ?? author.username}`}
        style={styles.row}
      >
        <Avatar uri={author.avatarUrl} name={author.displayName ?? author.username} size={28} />
        <View style={styles.body}>
          <View style={styles.metaRow}>
            <Text style={styles.username} numberOfLines={1}>
              @{author.username}
            </Text>
            <Text style={reported ? styles.ageReported : styles.age}>
              {reported ? 'REPORTED' : monoAge(createdAt)}
            </Text>
          </View>
          <MentionText text={text} style={styles.text} mentionStyle={styles.mention} />
        </View>
      </Pressable>
    </Animated.View>
  );
}
