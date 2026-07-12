// CoAuthorSheet — the friend picker for "Post together". A multi-select
// bottom sheet over the "Make it a memory" step: rows are the people the
// viewer follows (their people), each a tappable avatar row with a check.
// Confirming returns the chosen people to memory.tsx, which invites them as
// co-authors on Post. Nothing here is required — the sheet is skippable.
//
// Renders in the shared BottomSheet shell (swipe-down / backdrop to
// dismiss), fully tokenized (both modes), mono reserved for counts.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { getFollowing, type FollowUserListItem } from '../../../lib/api/profile';
import { haptics } from '../../../lib/motion';
import type { ThemeTokens } from '../../../lib/theme';
import { useTheme, useThemedStyles } from '../../../lib/theme-context';
import { Avatar } from '../../ui/Avatar';
import { BottomSheet } from '../../ui/BottomSheet';
import { SpringPressable } from '../../ui/SpringPressable';

export type CoAuthorPerson = {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
};

type CoAuthorSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** Viewer id — the source of the "your people" (following) list. */
  currentUserId?: string;
  /** Ids already chosen, so the sheet reopens with them checked. */
  selectedIds: string[];
  /** Confirmed selection, in list order. */
  onConfirm: (people: CoAuthorPerson[]) => void;
};

export function CoAuthorSheet({ visible, onClose, currentUserId, selectedIds, onConfirm }: CoAuthorSheetProps) {
  const { tokens } = useTheme();
  const c = tokens.colors;
  const styles = useThemedStyles(buildStyles);

  const [people, setPeople] = useState<FollowUserListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedIds));

  // Re-seed the local selection from the parent each time the sheet opens.
  useEffect(() => {
    if (visible) setSelected(new Set(selectedIds));
    // selectedIds is a fresh array per render; keying on `visible` is intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const load = useCallback(async () => {
    if (!currentUserId) {
      setLoaded(true);
      return;
    }
    setLoading(true);
    try {
      const res = await getFollowing(currentUserId, { limit: 100 });
      setPeople(res);
      setLoaded(true);
    } catch {
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (visible && !loaded && !loading) void load();
  }, [visible, loaded, loading, load]);

  const toggle = useCallback((id: string) => {
    haptics.light();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const confirm = useCallback(() => {
    haptics.medium();
    const chosen = people.filter((p) => selected.has(p.id)).map((p) => ({
      id: p.id,
      username: p.username,
      displayName: p.displayName,
      avatarUrl: p.avatarUrl,
    }));
    onConfirm(chosen);
    onClose();
  }, [onClose, onConfirm, people, selected]);

  const count = selected.size;
  const confirmLabel = useMemo(() => (count > 0 ? `Add ${count}` : 'Done'), [count]);

  const renderRow = useCallback(
    ({ item }: { item: FollowUserListItem }) => {
      const on = selected.has(item.id);
      return (
        <Pressable
          onPress={() => toggle(item.id)}
          style={styles.row}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: on }}
          accessibilityLabel={`Co-author with @${item.username}`}
        >
          <Avatar uri={item.avatarUrl} name={item.displayName || item.username} size={40} />
          <View style={styles.rowBody}>
            <Text style={styles.name} numberOfLines={1}>
              {item.displayName || item.username}
            </Text>
            <Text style={styles.handle} numberOfLines={1}>
              @{item.username}
            </Text>
          </View>
          <View style={[styles.check, on ? styles.checkOn : styles.checkOff]}>
            {on ? <Ionicons name="checkmark" size={15} color={c.inverseFg} /> : null}
          </View>
        </Pressable>
      );
    },
    [c.inverseFg, selected, styles, toggle],
  );

  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeightRatio={0.78} accessibilityLabel="Post together">
      <View style={styles.headerRow}>
        <Text style={styles.title}>Post together</Text>
        {count > 0 ? <Text style={styles.count}>{count}</Text> : null}
      </View>
      <Text style={styles.subtitle}>They’ll be asked to co-sign — it lands on their timeline too.</Text>

      {loading && people.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={c.mute} />
        </View>
      ) : people.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>No one to add yet. Follow the people you go to shows with.</Text>
        </View>
      ) : (
        <FlatList
          data={people}
          keyExtractor={(u) => u.id}
          renderItem={renderRow}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}

      <View style={styles.footer}>
        <SpringPressable
          onPress={confirm}
          haptic="none"
          accessibilityRole="button"
          accessibilityLabel={confirmLabel}
          style={styles.confirmBtn}
        >
          <Text style={styles.confirmText}>{confirmLabel}</Text>
        </SpringPressable>
      </View>
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
    subtitle: {
      fontSize: 12.5,
      fontWeight: '400',
      color: tokens.colors.mute,
      paddingHorizontal: 20,
      paddingTop: 4,
      paddingBottom: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: tokens.colors.hairline,
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
    check: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkOn: {
      backgroundColor: tokens.colors.inverseBg,
    },
    checkOff: {
      borderWidth: 1.5,
      borderColor: tokens.colors.line,
    },
    center: {
      paddingVertical: 40,
      paddingHorizontal: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    empty: {
      fontSize: 13,
      fontWeight: '400',
      color: tokens.colors.mute,
      textAlign: 'center',
    },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: tokens.colors.hairline,
    },
    confirmBtn: {
      height: 46,
      borderRadius: 999,
      backgroundColor: tokens.colors.inverseBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    confirmText: {
      fontSize: 15,
      fontWeight: '600',
      color: tokens.colors.inverseFg,
    },
  });
