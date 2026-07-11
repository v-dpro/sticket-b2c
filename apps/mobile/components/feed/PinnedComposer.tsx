// PinnedComposer — sticky composer at the bottom of each ShowCard
// (SCREENS.md §1.9): viewer avatar + input + Post button, enter-to-post.
// On post: input clears, comment count SpringNumber-bumps in the parent,
// and the new comment pops in at the top of the list.

import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';

import type { ThemeTokens } from '../../lib/theme';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { haptics } from '../../lib/motion';
import { Avatar } from '../ui/Avatar';
import { SpringPressable } from '../ui/SpringPressable';

export type PinnedComposerHandle = {
  focus: () => void;
};

interface PinnedComposerProps {
  avatarUrl?: string | null;
  name?: string | null;
  /** Returns true when the comment was posted. */
  onSubmit: (text: string) => Promise<boolean>;
}

export const PinnedComposer = forwardRef<PinnedComposerHandle, PinnedComposerProps>(
  function PinnedComposer({ avatarUrl, name, onSubmit }, ref) {
    const { tokens } = useTheme();
    const c = tokens.colors;
    const styles = useThemedStyles(buildStyles);

    // Structurally typed — RN 0.81's generated TextInputInstance type
    // isn't re-exported, so we only keep what we call.
    const inputRef = useRef<{ focus: () => void } | null>(null);
    const [text, setText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
    }));

    const handleSubmit = useCallback(async () => {
      const trimmed = text.trim();
      if (!trimmed || submitting) return;
      setSubmitting(true);
      try {
        const ok = await onSubmit(trimmed);
        if (ok) {
          setText('');
          haptics.light();
        } else {
          haptics.error();
        }
      } finally {
        setSubmitting(false);
      }
    }, [onSubmit, submitting, text]);

    const canPost = text.trim().length > 0 && !submitting;

    return (
      <View style={styles.container}>
        <Avatar uri={avatarUrl} name={name} size={28} />
        <TextInput
          ref={(r) => {
            inputRef.current = r;
          }}
          style={styles.input}
          placeholder="add a comment…"
          placeholderTextColor={c.muteSoft}
          value={text}
          onChangeText={setText}
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={handleSubmit}
          blurOnSubmit={false}
          accessibilityLabel="Add a comment"
        />
        <SpringPressable
          onPress={handleSubmit}
          disabled={!canPost}
          shakeWhenDisabled={false}
          style={styles.postBtn}
          accessibilityRole="button"
          accessibilityLabel="Post comment"
        >
          {submitting ? (
            <ActivityIndicator size="small" color={c.fg} />
          ) : (
            <Text style={[styles.postText, !canPost && styles.postTextDisabled]}>Post</Text>
          )}
        </SpringPressable>
      </View>
    );
  },
);

const buildStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: tokens.colors.hairline,
    },
    input: {
      flex: 1,
      fontSize: 13,
      fontWeight: '400',
      color: tokens.colors.fg,
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: tokens.colors.card2,
      borderRadius: tokens.radius.full,
      borderWidth: 1,
      borderColor: tokens.colors.hairline,
    },
    postBtn: {
      paddingHorizontal: 6,
      paddingVertical: 6,
      minWidth: 36,
      alignItems: 'center',
    },
    postText: {
      fontSize: 13,
      fontWeight: '700',
      color: tokens.colors.fg,
    },
    postTextDisabled: {
      color: tokens.colors.muteSoft,
      fontWeight: '600',
    },
  });
