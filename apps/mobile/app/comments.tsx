import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Avatar } from '../components/ui/Avatar';
import { Screen } from '../components/ui/Screen';
import { colors, fonts, radius, spacing, gradients } from '../lib/theme';
import { useSafeBack } from '../lib/navigation/safeNavigation';

type Comment = {
  id: string;
  author: { name: string; username: string; avatar?: string | null };
  text: string;
  timestamp: string;
  isOwn?: boolean;
};

export default function CommentsScreen() {
  const router = useRouter();
  const goBack = useSafeBack();
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>(() => [
    {
      id: '1',
      author: { name: 'Sarah Chen', username: '@sarahc', avatar: 'https://i.pravatar.cc/150?img=1' },
      text: 'So jealous! I wanted to go to this show so bad 😭',
      timestamp: '2h ago',
    },
    {
      id: '2',
      author: { name: 'Mike Torres', username: '@miket', avatar: 'https://i.pravatar.cc/150?img=2' },
      text: 'Amazing photos! That stage setup was insane',
      timestamp: '1h ago',
    },
    {
      id: '3',
      author: { name: 'You', username: '@you', avatar: 'https://i.pravatar.cc/150?img=5' },
      text: 'Thanks! It was such an incredible night',
      timestamp: '30m ago',
      isOwn: true,
    },
  ]);

  const logInfo = useMemo(() => ({ artist: 'The Weeknd', venue: 'SoFi Stadium', date: 'Dec 15, 2024' }), []);

  const canSend = commentText.trim().length > 0;

  const handleSend = () => {
    if (!canSend) return;
    const text = commentText.trim();
    setCommentText('');
    setComments((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        author: { name: 'You', username: '@you', avatar: null },
        text,
        timestamp: 'now',
        isOwn: true,
      },
    ]);
  };

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.back} accessibilityRole="button">
          <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.headerTitleRow}>
          <Ionicons name="chatbubble-ellipses" size={18} color={colors.textSecondary} />
          <Text style={styles.headerTitle}>Comments ({comments.length})</Text>
        </View>

        <Text style={styles.headerMeta}>
          {logInfo.artist} • {logInfo.venue} • {logInfo.date}
        </Text>
      </View>

      {/* List */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {comments.length ? (
          comments.map((c) => (
            <View key={c.id} style={styles.commentRow}>
              <Avatar uri={c.author.avatar} name={c.author.name} size={40} />
              <View style={{ flex: 1 }}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentName}>{c.author.name}</Text>
                  <Text style={styles.commentTime}>{c.timestamp}</Text>
                  {c.isOwn ? (
                    <Pressable
                      onPress={() => setComments((prev) => prev.filter((x) => x.id !== c.id))}
                      style={styles.deleteBtn}
                      accessibilityRole="button"
                    >
                      <Text style={styles.deleteText}>Delete</Text>
                    </Pressable>
                  ) : null}
                </View>
                <Text style={styles.commentText}>{c.text}</Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.empty}>
            <Ionicons name="chatbubbles" size={56} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No comments yet</Text>
            <Text style={styles.emptyText}>Be the first to comment</Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Input */}
      <View style={styles.inputBar}>
        <View style={styles.inputRow}>
          <View style={styles.youChip}>
            <Text style={styles.youChipText}>Y</Text>
          </View>

          <View style={styles.textAreaWrap}>
            <TextInput
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Add a comment…"
              placeholderTextColor={colors.textMuted}
              style={styles.textArea}
              multiline
            />
          </View>

          <Pressable onPress={handleSend} disabled={!canSend} accessibilityRole="button" style={({ pressed }) => [styles.sendBtn, pressed && styles.pressed, !canSend && styles.disabled]}>
            <LinearGradient colors={gradients.rainbow} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <Text style={styles.sendText}>Send</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  backText: {
    color: colors.textSecondary,
    fontSize: fonts.bodySmall,
    fontWeight: fonts.medium,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: fonts.h3,
    fontWeight: fonts.bold,
  },
  headerMeta: {
    color: colors.textMuted,
    fontSize: 13,
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: spacing.lg,
  },
  commentRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  commentName: {
    color: colors.textPrimary,
    fontSize: fonts.bodySmall,
    fontWeight: fonts.semibold,
  },
  commentTime: {
    color: colors.textMuted,
    fontSize: fonts.caption,
  },
  deleteBtn: {
    marginLeft: 'auto',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  deleteText: {
    color: colors.error,
    fontSize: fonts.caption,
    fontWeight: fonts.medium,
  },
  commentText: {
    color: colors.textSecondary,
    fontSize: fonts.bodySmall,
    lineHeight: 20,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: fonts.h4,
    fontWeight: fonts.semibold,
    marginTop: spacing.lg,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fonts.bodySmall,
    marginTop: spacing.sm,
  },
  inputBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.lg,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  youChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brandPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  youChipText: {
    color: colors.textPrimary,
    fontSize: fonts.bodySmall,
    fontWeight: fonts.bold,
  },
  textAreaWrap: {
    flex: 1,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  textArea: {
    color: colors.textPrimary,
    fontSize: fonts.bodySmall,
    minHeight: 24,
    maxHeight: 120,
  },
  sendBtn: {
    borderRadius: radius.full,
    overflow: 'hidden',
    paddingHorizontal: spacing.xl,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: {
    color: colors.textPrimary,
    fontSize: fonts.bodySmall,
    fontWeight: fonts.semibold,
  },
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.5,
  },
});



