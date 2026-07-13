// AttendeesSheet — the Facepile Taste Popup. Hold or tap the "were there"
// facepile on a post to see who's in it: avatar, NAME, and the degree
// word (FRIEND / FRIENDS+). Once GET /users/taste-match resolves, a big mono
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
import type { WhoSawAttendedEvent } from '../../lib/api/whoSaw';
import type { ThemeTokens } from '../../lib/theme';
import { useThemedStyles } from '../../lib/theme-context';
import { monoDate } from '../entity/format';
import { Avatar } from '../ui/Avatar';
import { BottomSheet } from '../ui/BottomSheet';
import { Skeleton } from '../ui/Skeleton';
import { SpringPressable } from '../ui/SpringPressable';
import type { FacePerson } from '../ui/DegreeFacepile';

/** Feed tiles pass plain FacePersons; the tour page's carry attendedEvents. */
type AttendeePerson = FacePerson & { attendedEvents?: WhoSawAttendedEvent[] };

interface AttendeesSheetProps {
  visible: boolean;
  onClose: () => void;
  /** The tile's were-there people — same array DegreeFacepile renders. */
  people: AttendeePerson[];
  /**
   * 'tour' lists each person's attended shows ("VENUE · JUN 27") under
   * their name — tour page only. Default rendering is unchanged.
   */
  variant?: 'tour';
  /** Poster of the memory (names the WENT WITH section). */
  posterName?: string;
  /** Joint-post co-authors — the poster's own crew at the show. */
  coAuthors?: AttendeePerson[];
}

const AVATAR_SIZE = 44;
const RING_WIDTH = 2;

export function AttendeesSheet({
  visible,
  onClose,
  people,
  variant,
  posterName,
  coAuthors,
}: AttendeesSheetProps) {
  const router = useRouter();
  const styles = useThemedStyles(buildStyles);

  // Two rooms: the poster's own crew (co-authors) first, then everyone
  // else who was at the show.
  const crew = useMemo(() => coAuthors ?? [], [coAuthors]);
  const others = useMemo(() => {
    if (crew.length === 0) return people;
    const crewIds = new Set(crew.map((p) => p.id));
    return people.filter((p) => !crewIds.has(p.id));
  }, [people, crew]);
  const rows = useMemo<({ type: 'label'; key: string; text: string } | { type: 'person'; key: string; p: AttendeePerson })[]>(
    () =>
      crew.length > 0
        ? [
            { type: 'label' as const, key: 'l-with', text: `WENT WITH ${(posterName ?? 'THEM').toUpperCase()}` },
            ...crew.map((p) => ({ type: 'person' as const, key: `c-${p.id}`, p })),
            ...(others.length > 0
              ? [{ type: 'label' as const, key: 'l-also', text: 'ALSO THERE' }]
              : []),
            ...others.map((p) => ({ type: 'person' as const, key: `o-${p.id}`, p })),
          ]
        : people.map((p) => ({ type: 'person' as const, key: `o-${p.id}`, p })),
    [crew, others, people, posterName],
  );
  const ids = useMemo(
    () => [...crew, ...people].map((p) => p.id).filter((v, i, a) => a.indexOf(v) === i),
    [crew, people],
  );
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
    ({ item }: { item: AttendeePerson }) => {
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
            <Text style={styles.personName} numberOfLines={1}>
              {item.displayName || item.username}
            </Text>
            <Text style={styles.degreeWord}>{isFriend ? 'FRIEND' : 'FRIENDS+'}</Text>
            {variant === 'tour' && item.attendedEvents?.length ? (
              <View style={styles.showList}>
                {item.attendedEvents.map((ev) => (
                  <Text key={ev.eventId} style={styles.showLine} numberOfLines={1}>
                    {ev.venueName.toUpperCase()} · {monoDate(ev.date)}
                  </Text>
                ))}
              </View>
            ) : null}
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
    [loading, taste, openProfile, styles, variant],
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
        data={rows}
        keyExtractor={(r) => r.key}
        renderItem={({ item: r }) =>
          r.type === 'label' ? (
            <Text style={styles.sectionLabel}>{r.text}</Text>
          ) : (
            renderRow({ item: r.p })
          )
        }
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
    sectionLabel: {
      fontFamily: tokens.fontFamilies.mono,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 1.2,
      color: tokens.colors.muteSoft,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 2,
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
      gap: 2,
    },
    personName: {
      fontSize: 15,
      fontWeight: '700',
      color: tokens.colors.fg,
    },
    degreeWord: {
      fontFamily: tokens.fontFamilies.mono,
      fontSize: 10.5,
      fontWeight: '600',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: tokens.colors.mute,
    },
    showList: {
      marginTop: 3,
      gap: 2,
    },
    showLine: {
      fontFamily: tokens.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 10,
      letterSpacing: 0.5,
      color: tokens.colors.muteSoft,
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
