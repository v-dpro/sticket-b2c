// FriendsSheet — bottom sheet listing a profile's FRIENDS (degree-1 people
// they follow). Opened from the masthead "N FRIENDS" stat. Rows: avatar +
// displayName + "@username · N SHOWS", tappable → /profile/[id] (or the You
// tab for self). Data from GET /users/:id/friends, which returns [] when the
// profile is restricted — so the row count matches the tapped stat.
//
// Renders in the shared BottomSheet shell (swipe-down / backdrop to dismiss),
// mirroring LikersSheet. Monochrome, mono for the handle line (C11).

import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { getUserFriends, type ProfileFriend } from '../../lib/api/profile';
import { haptics } from '../../lib/motion';
import type { ThemeTokens } from '../../lib/theme';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { Avatar } from '../ui/Avatar';
import { BottomSheet } from '../ui/BottomSheet';

interface FriendsSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Whose friends to list. */
  userId: string;
  /** Viewer id — a self row routes to the You tab instead of a profile. */
  currentUserId?: string;
  /** Count from the masthead (stats.following) for the header label. */
  totalCount?: number;
}

export function FriendsSheet({ visible, onClose, userId, currentUserId, totalCount }: FriendsSheetProps) {
  const router = useRouter();
  const { tokens } = useTheme();
  const c = tokens.colors;
  const styles = useThemedStyles(buildStyles);

  const [friends, setFriends] = useState<ProfileFriend[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Reset the cached page when the target profile changes.
  useEffect(() => {
    setFriends([]);
    setLoaded(false);
  }, [userId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setFriends(await getUserFriends(userId, { limit: 100 }));
      setLoaded(true);
    } catch {
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [userId]);

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
    ({ item }: { item: ProfileFriend }) => {
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
              {item.showCount > 0 ? ` · ${item.showCount} SHOWS` : ''}
            </Text>
          </View>
        </Pressable>
      );
    },
    [currentUserId, openUser, styles.handle, styles.name, styles.row, styles.rowBody],
  );

  return (
    <BottomSheet visible={visible} onClose={onClose} accessibilityLabel="Friends">
      <View style={styles.headerRow}>
        <Text style={styles.title}>Friends</Text>
        {totalCount ? <Text style={styles.count}>{totalCount}</Text> : null}
      </View>

      {loading && friends.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={c.mute} />
        </View>
      ) : friends.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>No friends yet</Text>
        </View>
      ) : (
        <FlatList
          data={friends}
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
      color: tokens.colors.mute,
    },
  });
