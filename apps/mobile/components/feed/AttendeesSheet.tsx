// AttendeesSheet — the Facepile Taste Popup. Hold or tap the "were there"
// facepile on a post to preview who's in it, without unmasking anyone:
// each row is an avatar + the degree word only (FRIEND / FRIENDS+), never
// a name or handle. Once GET /users/taste-match resolves, a big mono
// percentage + "TASTE MATCH" caption lands on the row (shimmer dashes
// while it's in flight; omitted entirely if the pair has no score).
// Tapping a row is still the fast path to stalking someone — it closes
// the sheet and pushes straight to their profile.
//
// Small by design (maxHeightRatio 0.5) — this is a teaser, not the full
// "N were here" roster (that's WereHereSheet, which keeps names). Renders
// in the shared BottomSheet shell; fully tokenized via useTheme(), mono
// data lines, zero accent hue (Scorecard Stub, C-series).

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { getTasteMatch } from '../../lib/api/tasteMatch';
import type { ThemeTokens } from '../../lib/theme';
import { useThemedStyles } from '../../lib/theme-context';
import { Avatar } from '../ui/Avatar';
import { BottomSheet } from '../ui/BottomSheet';
import { Skeleton } from '../ui/Skeleton';
import { SpringPressable } from '../ui/SpringPressable';
import type { FacePerson } from '../ui/DegreeFacepile';

interface AttendeesSheetProps {
  visible: boolean;
  onClose: () => void;
  /** The tile's were-there people — same array DegreeFacepile renders. */
  people: FacePerson[];
}

const AVATAR_SIZE = 44;
const RING_WIDTH = 2;

export function AttendeesSheet({ visible, onClose, people }: AttendeesSheetProps) {
  const router = useRouter();
  const styles = useThemedStyles(buildStyles);

  const ids = useMemo(() => people.map((p) => p.id), [people]);
  const idsKey = ids.join(',');

  const [taste, setTaste] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(false);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  // Fetch once per distinct roster, the first time the sheet opens for it.
  useEffect(() => {
    if (!visible || idsKey === loadedKey) return;
    if (ids.length === 0) {
      setTaste(new Map());
      setLoadedKey(idsKey);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const map = await getTasteMatch(ids);
      if (cancelled) return;
      setTaste(map);
      setLoadedKey(idsKey);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, ids, idsKey, loadedKey]);

  const openProfile = useCallback(
    (id: string) => {
      onClose();
      router.push(`/profile/${id}`);
    },
    [onClose, router],
  );

  const renderRow = useCallback(
    ({ item }: { item: FacePerson }) => {
      const isFriend = item.degree === 1;
      const pct = taste.get(item.id);
      return (
        <SpringPressable
          haptic="light"
          onPress={() => openProfile(item.id)}
          style={styles.row}
          accessibilityRole="button"
          accessibilityLabel={isFriend ? 'Friend — view profile' : 'Connection — view profile'}
        >
          <Avatar
            uri={item.avatarUrl}
            name={item.displayName || item.username}
            size={AVATAR_SIZE}
            style={isFriend ? styles.friendRing : undefined}
          />
          <View style={styles.rowBody}>
            <Text style={styles.degreeWord}>{isFriend ? 'FRIEND' : 'FRIENDS+'}</Text>
          </View>
          {loading ? (
            <View style={styles.statBlock}>
              <Skeleton width={34} height={15} borderRadius={4} />
              <Skeleton width={50} height={7} borderRadius={3} style={styles.statSkeletonGap} />
            </View>
          ) : pct != null ? (
            <View style={styles.statBlock}>
              <Text style={styles.pct}>{Math.round(pct)}%</Text>
              <Text style={styles.pctLabel}>TASTE MATCH</Text>
            </View>
          ) : null}
        </SpringPressable>
      );
    },
    [loading, taste, openProfile, styles],
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      maxHeightRatio={0.5}
      accessibilityLabel="Were there"
    >
      <View style={styles.headerRow}>
        <Text style={styles.title}>WERE THERE · {people.length}</Text>
      </View>
      <FlatList
        data={people}
        keyExtractor={(p) => p.id}
        renderItem={renderRow}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </BottomSheet>
  );
}

const buildStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    headerRow: {
      paddingHorizontal: 20,
      paddingBottom: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: tokens.colors.hairline,
    },
    title: {
      fontFamily: tokens.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 12.5,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: tokens.colors.fg,
    },
    listContent: {
      paddingVertical: 6,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    friendRing: {
      borderWidth: RING_WIDTH,
      borderColor: tokens.colors.fg,
    },
    rowBody: {
      flex: 1,
      justifyContent: 'center',
    },
    degreeWord: {
      fontFamily: tokens.fontFamilies.mono,
      fontSize: 10.5,
      fontWeight: '600',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: tokens.colors.mute,
    },
    statBlock: {
      alignItems: 'flex-end',
      minWidth: 64,
    },
    statSkeletonGap: {
      marginTop: 5,
    },
    pct: {
      fontFamily: tokens.fontFamilies.monoBold,
      fontVariant: ['tabular-nums'],
      fontSize: 18,
      letterSpacing: -0.2,
      color: tokens.colors.fg,
    },
    pctLabel: {
      fontFamily: tokens.fontFamilies.mono,
      fontSize: 8.5,
      fontWeight: '600',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: tokens.colors.muteSoft,
      marginTop: 1,
    },
  });
