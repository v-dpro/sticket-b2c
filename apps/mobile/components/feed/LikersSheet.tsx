// LikersSheet — bottom sheet listing who liked a post. Opened from the
// "Liked by …" row on any FeedCard (own or others'). Rows: avatar +
// displayName + @username, tappable → /profile/[id] (or /(tabs)/you for
// self). Likers come from GET /logs/:id/likes with cursor pagination.
//
// Follows the app's Modal-sheet pattern (see ShareSheet): blurred backdrop,
// slide-up card panel. Fully tokenized via useTheme(); monochrome, mono
// reserved for the count label.

import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';

import { getLogLikes, type LogLikeUser } from '../../lib/api/feed';
import { haptics } from '../../lib/motion';
import type { ThemeTokens } from '../../lib/theme';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { Avatar } from '../ui/Avatar';

const PAGE = 30;

interface LikersSheetProps {
  visible: boolean;
  onClose: () => void;
  logId: string;
  /** Viewer id — a self row routes to the You tab instead of a profile. */
  currentUserId?: string;
  /** Total like count (from the card) for the header label. */
  totalCount: number;
}

export function LikersSheet({ visible, onClose, logId, currentUserId, totalCount }: LikersSheetProps) {
  const router = useRouter();
  const { tokens } = useTheme();
  const c = tokens.colors;
  const styles = useThemedStyles(buildStyles);

  const [likers, setLikers] = useState<LogLikeUser[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Reset cached page whenever the target post changes.
  useEffect(() => {
    setLikers([]);
    setCursor(null);
    setLoaded(false);
  }, [logId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getLogLikes(logId, { limit: PAGE });
      setLikers(res.likes.map((l) => l.user));
      setCursor(res.nextCursor ?? null);
      setLoaded(true);
    } catch {
      // non-fatal — sheet shows the empty/loaded state
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [logId]);

  // Fetch the first page the first time the sheet opens for a post.
  useEffect(() => {
    if (visible && !loaded && !loading) void load();
  }, [visible, loaded, loading, load]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !cursor) return;
    setLoadingMore(true);
    try {
      const res = await getLogLikes(logId, { limit: PAGE, cursor });
      setLikers((prev) => [...prev, ...res.likes.map((l) => l.user)]);
      setCursor(res.nextCursor ?? null);
    } catch {
      // silent
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, logId]);

  const openUser = useCallback(
    (id: string) => {
      haptics.light();
      onClose();
      if (currentUserId && id === currentUserId) router.push('/(tabs)/you');
      else router.push({ pathname: '/profile/[id]', params: { id } });
    },
    [currentUserId, onClose, router],
  );

  const renderRow = useCallback(
    ({ item }: { item: LogLikeUser }) => {
      const isSelf = Boolean(currentUserId && item.id === currentUserId);
      return (
        <Pressable
          onPress={() => openUser(item.id)}
          style={styles.row}
          accessibilityRole="button"
          accessibilityLabel={`View @${item.username}'s profile`}
        >
          <Avatar uri={item.avatarUrl} name={item.displayName || item.username} size={40} />
          <View style={styles.rowBody}>
            <Text style={styles.name} numberOfLines={1}>
              {isSelf ? 'You' : item.displayName || item.username}
            </Text>
            <Text style={styles.handle} numberOfLines={1}>
              @{item.username}
            </Text>
          </View>
        </Pressable>
      );
    },
    [currentUserId, openUser, styles.handle, styles.name, styles.row, styles.rowBody],
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
        <BlurView intensity={18} tint={tokens.mode === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      </Pressable>

      <View style={styles.sheet}>
        <View style={styles.grabber} />
        <View style={styles.headerRow}>
          <Text style={styles.title}>Liked by</Text>
          {totalCount > 0 ? <Text style={styles.count}>{totalCount}</Text> : null}
        </View>

        {loading && likers.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="small" color={c.mute} />
          </View>
        ) : likers.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.empty}>No likes yet</Text>
          </View>
        ) : (
          <FlatList
            data={likers}
            keyExtractor={(u) => u.id}
            renderItem={renderRow}
            onEndReached={() => void loadMore()}
            onEndReachedThreshold={0.5}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.footer}>
                  <ActivityIndicator size="small" color={c.mute} />
                </View>
              ) : null
            }
          />
        )}
      </View>
    </Modal>
  );
}

const buildStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
    },
    sheet: {
      backgroundColor: tokens.colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 10,
      paddingBottom: 32,
      maxHeight: '72%',
      borderTopWidth: 1,
      borderColor: tokens.colors.hairline,
    },
    grabber: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: tokens.colors.line,
      alignSelf: 'center',
      marginBottom: 14,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 20,
      paddingBottom: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: tokens.colors.hairline,
    },
    title: {
      fontSize: 16,
      fontWeight: '800',
      letterSpacing: -0.2,
      color: tokens.colors.fg,
    },
    count: {
      fontFamily: tokens.fontFamilies.monoSemi,
      fontSize: 12,
      color: tokens.colors.mute,
      marginTop: 1,
    },
    listContent: {
      paddingVertical: 6,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 20,
      paddingVertical: 9,
    },
    rowBody: {
      flex: 1,
    },
    name: {
      fontSize: 14,
      fontWeight: '700',
      color: tokens.colors.fg,
    },
    handle: {
      fontSize: 12,
      fontWeight: '400',
      color: tokens.colors.mute,
      marginTop: 1,
    },
    center: {
      paddingVertical: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    empty: {
      fontSize: 13,
      fontWeight: '400',
      color: tokens.colors.mute,
    },
    footer: {
      paddingVertical: 16,
    },
  });
