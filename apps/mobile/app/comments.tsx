import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '../components/ui/Avatar';
import { SpringPressable } from '../components/ui/SpringPressable';
import { useTheme, useThemedStyles } from '../lib/theme-context';
import { useSafeBack } from '../lib/navigation/safeNavigation';

type Comment = {
  id: string;
  author: { name: string; username: string; avatar?: string | null };
  text: string;
  timestamp: string;
  isOwn?: boolean;
};

export default function CommentsScreen() {
  const goBack = useSafeBack();
  const { tokens } = useTheme();
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

  const styles = useThemedStyles((t) => ({
    screen: { flex: 1, backgroundColor: t.colors.bg },
    header: {
      paddingHorizontal: t.spacing.xl,
      paddingTop: t.spacing.lg,
      paddingBottom: t.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: t.colors.hairline,
    },
    back: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm, marginBottom: t.spacing.lg },
    backText: { color: t.colors.mute, fontSize: 14, fontWeight: '500' },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm, marginBottom: t.spacing.sm },
    headerTitle: { color: t.colors.fg, fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
    headerMeta: { color: t.colors.muteSoft, fontSize: 13 },
    list: { paddingHorizontal: t.spacing.xl, paddingVertical: t.spacing.lg, gap: t.spacing.lg },
    commentRow: { flexDirection: 'row', gap: t.spacing.md },
    commentHeader: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm, marginBottom: t.spacing.xs },
    commentName: { color: t.colors.fg, fontSize: 14, fontWeight: '600' },
    commentTime: { color: t.colors.muteSoft, fontSize: 12 },
    deleteBtn: { marginLeft: 'auto', paddingHorizontal: t.spacing.sm, paddingVertical: t.spacing.xs },
    deleteText: { color: t.colors.error, fontSize: 12, fontWeight: '500' },
    commentText: { color: t.colors.textSoft, fontSize: 14, lineHeight: 20 },
    empty: { alignItems: 'center', paddingTop: 80 },
    emptyTitle: { color: t.colors.fg, fontSize: 20, fontWeight: '700', marginTop: t.spacing.lg },
    emptyText: { color: t.colors.muteSoft, fontSize: 14, marginTop: t.spacing.sm },
    inputBar: {
      backgroundColor: t.colors.card,
      borderTopWidth: 1,
      borderTopColor: t.colors.hairline,
      padding: t.spacing.lg,
    },
    inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: t.spacing.md },
    youChip: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.colors.inverseBg, alignItems: 'center', justifyContent: 'center' },
    youChipText: { color: t.colors.inverseFg, fontSize: 14, fontWeight: '700' },
    textAreaWrap: {
      flex: 1,
      borderRadius: t.radius.lg,
      backgroundColor: t.colors.card2,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      paddingHorizontal: t.spacing.lg,
      paddingVertical: t.spacing.md,
    },
    textArea: { color: t.colors.fg, fontSize: 14, minHeight: 24, maxHeight: 120 },
    sendBtn: {
      borderRadius: t.radius.full,
      backgroundColor: t.colors.inverseBg,
      paddingHorizontal: t.spacing.xl,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendText: { color: t.colors.inverseFg, fontSize: 14, fontWeight: '600' },
    disabled: { opacity: 0.4 },
  }));

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
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <SpringPressable onPress={goBack} haptic="light" style={styles.back} accessibilityRole="button">
          <Ionicons name="arrow-back" size={20} color={tokens.colors.mute} />
          <Text style={styles.backText}>Back</Text>
        </SpringPressable>

        <View style={styles.headerTitleRow}>
          <Ionicons name="chatbubble-ellipses" size={18} color={tokens.colors.mute} />
          <Text style={styles.headerTitle}>Comments ({comments.length})</Text>
        </View>

        <Text style={styles.headerMeta}>
          {logInfo.artist} • {logInfo.venue} • {logInfo.date}
        </Text>
      </View>

      {/* List */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {comments.length ? (
          comments.map((c) => (
            <View key={c.id} style={styles.commentRow}>
              <Avatar uri={c.author.avatar} name={c.author.name} size={40} />
              <View style={{ flex: 1 }}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentName}>{c.author.name}</Text>
                  <Text style={styles.commentTime}>{c.timestamp}</Text>
                  {c.isOwn ? (
                    <SpringPressable
                      onPress={() => setComments((prev) => prev.filter((x) => x.id !== c.id))}
                      haptic="light"
                      style={styles.deleteBtn}
                      accessibilityRole="button"
                    >
                      <Text style={styles.deleteText}>Delete</Text>
                    </SpringPressable>
                  ) : null}
                </View>
                <Text style={styles.commentText}>{c.text}</Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.empty}>
            <Ionicons name="chatbubbles" size={56} color={tokens.colors.muteSoft} />
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
              placeholderTextColor={tokens.colors.muteSoft}
              style={styles.textArea}
              multiline
            />
          </View>

          <SpringPressable onPress={handleSend} disabled={!canSend} haptic="light" accessibilityRole="button" style={[styles.sendBtn, !canSend && styles.disabled]}>
            <Text style={styles.sendText}>Send</Text>
          </SpringPressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
