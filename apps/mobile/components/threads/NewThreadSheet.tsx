// NewThreadSheet — the "Start a thread" composer for a tour, in the shared
// BottomSheet shell. Title (required) + optional first message → Post.
// `onCreate` should throw on failure (the sheet shows an inline error and
// stays open); on success it resets, ticks haptics.success, and closes.

import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';

import { haptics } from '../../lib/motion';
import type { ThemeTokens } from '../../lib/theme';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { BottomSheet } from '../ui/BottomSheet';
import { PillButton } from '../ui/PillButton';

interface NewThreadSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Creates the thread (POST /tours/:id/threads). Should throw on failure. */
  onCreate: (input: { title: string; text?: string }) => Promise<void>;
}

export function NewThreadSheet({ visible, onClose, onCreate }: NewThreadSheetProps) {
  const { tokens } = useTheme();
  const styles = useThemedStyles(buildStyles);

  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [failed, setFailed] = useState(false);

  const handlePost = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || posting) return;
    setPosting(true);
    setFailed(false);
    try {
      const trimmedText = text.trim();
      await onCreate({ title: trimmedTitle, ...(trimmedText ? { text: trimmedText } : {}) });
      haptics.success();
      setTitle('');
      setText('');
      onClose();
    } catch {
      haptics.error();
      setFailed(true);
    } finally {
      setPosting(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      maxHeightRatio={0.9}
      accessibilityLabel="Start a thread"
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Text style={styles.title}>Start a thread</Text>

        <View style={styles.fields}>
          <TextInput
            style={styles.titleInput}
            placeholder="What's the question?"
            placeholderTextColor={tokens.colors.muteSoft}
            value={title}
            onChangeText={setTitle}
            maxLength={140}
            autoFocus
          />
          <TextInput
            style={styles.textInput}
            placeholder="Say more (optional)…"
            placeholderTextColor={tokens.colors.muteSoft}
            value={text}
            onChangeText={setText}
            maxLength={1000}
            multiline
          />
          {failed ? <Text style={styles.error}>Couldn't post that — try again.</Text> : null}
        </View>

        <View style={styles.footer}>
          <PillButton
            title={posting ? 'Posting…' : 'Post'}
            variant="primary"
            size="lg"
            springFeedback
            haptic="medium"
            disabled={!title.trim() || posting}
            onPress={() => void handlePost()}
          />
        </View>
      </KeyboardAvoidingView>
    </BottomSheet>
  );
}

const buildStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    title: {
      fontSize: 18,
      fontWeight: '800',
      letterSpacing: -0.3,
      color: tokens.colors.fg,
      paddingHorizontal: 20,
    },
    fields: { paddingHorizontal: 20, marginTop: 14, gap: 10 },
    titleInput: {
      backgroundColor: tokens.colors.card2,
      borderRadius: tokens.radius.md,
      paddingHorizontal: 14,
      height: 44,
      fontSize: 15,
      fontWeight: '600',
      color: tokens.colors.fg,
    },
    textInput: {
      backgroundColor: tokens.colors.card2,
      borderRadius: tokens.radius.md,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 12,
      minHeight: 84,
      fontSize: 14,
      color: tokens.colors.fg,
      textAlignVertical: 'top',
    },
    error: { fontSize: 12.5, color: tokens.colors.error, lineHeight: 18 },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 14,
    },
  });
