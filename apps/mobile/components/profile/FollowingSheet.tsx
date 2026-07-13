// FollowingSheet — bottom sheet listing who/what a profile FOLLOWS. Opened
// from the masthead "N FOLLOWING" stat. There is no venue-follow model, so
// this is an ARTISTS section only: avatar + name, tappable → /artist/:id.
// Data from GET /users/:id/following-artists (returns [] when restricted, so
// the row count matches the tapped stat).
//
// Renders in the shared BottomSheet shell (swipe-down / backdrop to dismiss),
// mirroring FriendsSheet / LikersSheet.

import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { getUserFollowingArtists, type FollowedArtist } from '../../lib/api/profile';
import { haptics } from '../../lib/motion';
import type { ThemeTokens } from '../../lib/theme';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { Avatar } from '../ui/Avatar';
import { BottomSheet } from '../ui/BottomSheet';

interface FollowingSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Whose follows to list. */
  userId: string;
  /** Count from the masthead (stats.followingArtists) for the header label. */
  totalCount?: number;
}

export function FollowingSheet({ visible, onClose, userId, totalCount }: FollowingSheetProps) {
  const router = useRouter();
  const { tokens } = useTheme();
  const c = tokens.colors;
  const styles = useThemedStyles(buildStyles);

  const [artists, setArtists] = useState<FollowedArtist[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setArtists([]);
    setLoaded(false);
  }, [userId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setArtists(await getUserFollowingArtists(userId, { limit: 200 }));
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

  const openArtist = useCallback(
    (id: string) => {
      haptics.light();
      onClose();
      router.push(`/artist/${id}`);
    },
    [onClose, router],
  );

  const renderRow = useCallback(
    ({ item }: { item: FollowedArtist }) => (
      <Pressable
        onPress={() => openArtist(item.id)}
        style={styles.row}
        accessibilityRole="button"
        accessibilityLabel={`View ${item.name}`}
      >
        <Avatar uri={item.imageUrl} name={item.name} size={40} />
        <View style={styles.rowBody}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.handle} numberOfLines={1}>
            ARTIST
          </Text>
        </View>
      </Pressable>
    ),
    [openArtist, styles.handle, styles.name, styles.row, styles.rowBody],
  );

  return (
    <BottomSheet visible={visible} onClose={onClose} accessibilityLabel="Following">
      <View style={styles.headerRow}>
        <Text style={styles.title}>Following</Text>
        {totalCount ? <Text style={styles.count}>{totalCount}</Text> : null}
      </View>

      {loading && artists.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={c.mute} />
        </View>
      ) : artists.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>Not following any artists yet</Text>
        </View>
      ) : (
        <FlatList
          data={artists}
          keyExtractor={(a) => a.id}
          renderItem={renderRow}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={<Text style={styles.sectionLabel}>Artists</Text>}
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
      paddingBottom: 6,
    },
    sectionLabel: {
      fontFamily: tokens.fontFamilies.monoSemi,
      fontSize: 11,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: tokens.colors.muteSoft,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 6,
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
