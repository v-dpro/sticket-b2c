// WereHereSheet — bottom sheet listing who was at the show behind a memory
// post. Opened from the over-photo facepile on FeedCard v3 / the memory
// viewer's featured card. Rows: avatar + displayName + @username, tappable
// → /profile/[id] (or /(tabs)/you for self). Attendees come from
// GET /logs/:id (othersWhoWent + taggedFriends, deduped) — no pagination yet.
//
// Renders in the shared BottomSheet shell (swipe-down / backdrop to
// dismiss; template: LikersSheet). Fully tokenized via useTheme();
// monochrome, mono for the count label and the per-row handle line (C11).

import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { getLogDetail } from '../../lib/api/feed';
import { haptics } from '../../lib/motion';
import type { ThemeTokens } from '../../lib/theme';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { Avatar } from '../ui/Avatar';
import { BottomSheet } from '../ui/BottomSheet';

type WereHereUser = {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
};

interface WereHereSheetProps {
  visible: boolean;
  onClose: () => void;
  logId: string;
  /** Viewer id — a self row routes to the You tab instead of a profile. */
  currentUserId?: string;
  /** Total was-there count (from the card) for the header label. */
  totalCount: number;
}

export function WereHereSheet({ visible, onClose, logId, currentUserId, totalCount }: WereHereSheetProps) {
  const router = useRouter();
  const { tokens } = useTheme();
  const c = tokens.colors;
  const styles = useThemedStyles(buildStyles);

  const [users, setUsers] = useState<WereHereUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Reset the cached list whenever the target post changes.
  useEffect(() => {
    setUsers([]);
    setLoaded(false);
  }, [logId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const detail = await getLogDetail(logId);
      const seen = new Set<string>();
      const merged: WereHereUser[] = [];
      for (const u of [...(detail.othersWhoWent ?? []), ...(detail.log.taggedFriends ?? [])]) {
        if (seen.has(u.id)) continue;
        seen.add(u.id);
        merged.push({ id: u.id, username: u.username, avatarUrl: u.avatarUrl });
      }
      setUsers(merged);
      setLoaded(true);
    } catch {
      // non-fatal — sheet shows the empty/loaded state
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [logId]);

  // Fetch the first time the sheet opens for a post.
  useEffect(() => {
    if (visible && !loaded && !loading) void load();
  }, [visible, loaded, loading, load]);

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
    ({ item }: { item: WereHereUser }) => {
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
    <BottomSheet visible={visible} onClose={onClose} accessibilityLabel="Were here">
      <View style={styles.headerRow}>
        <Text style={styles.title}>Were here</Text>
        {totalCount > 0 ? <Text style={styles.count}>{totalCount}</Text> : null}
      </View>

      {loading && users.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={c.mute} />
        </View>
      ) : users.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>No one else logged this show</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(u) => u.id}
          renderItem={renderRow}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}
    </BottomSheet>
  );
}

const buildStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
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
      fontSize: 15,
      fontWeight: '700',
      color: tokens.colors.fg,
    },
    // Mono data line (C11) — attendees payload carries no show counts,
    // so the second line is the mono handle.
    handle: {
      fontFamily: tokens.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 10.5,
      fontWeight: '600',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: tokens.colors.muteSoft,
      marginTop: 2,
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
  });
