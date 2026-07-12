// InviteFriendsSheet — host-only bottom sheet for inviting people to a
// party. Candidates come from the friend-suggestions API (mutuals /
// same-show people); when that returns nothing, falls back to the user's
// followers. A search field (users search API) finds anyone else.
// Multi-select → POST /parties/:id/invite via the onInvite callback.
//
// Follows the app's Modal-sheet pattern (SeatSectionSheet / LikersSheet):
// blurred backdrop, slide-up card panel, grabber. Fully tokenized.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import Animated from 'react-native-reanimated';

import { useSession } from '../../hooks/useSession';
import { getSuggestions, searchUsers } from '../../lib/api/friends';
import { getFollowers } from '../../lib/api/users';
import { durations, haptics, tearIn } from '../../lib/motion';
import type { ThemeTokens } from '../../lib/theme';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { Avatar } from '../ui/Avatar';
import { PillButton } from '../ui/PillButton';
import { SpringPressable } from '../ui/SpringPressable';

type Candidate = {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
};

interface InviteFriendsSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Sends the invites (POST /parties/:id/invite). Should throw on failure. */
  onInvite: (userIds: string[]) => Promise<void>;
  /** User ids that already have a membership row — hidden from the list. */
  excludeIds: string[];
}

export function InviteFriendsSheet({
  visible,
  onClose,
  onInvite,
  excludeIds,
}: InviteFriendsSheetProps) {
  const { tokens } = useTheme();
  const styles = useThemedStyles(buildStyles);
  const { user } = useSession();

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Candidate[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);

  const excluded = useMemo(() => new Set(excludeIds), [excludeIds]);

  // Load candidates when the sheet opens: suggestions first (mutuals /
  // same-show people), followers as the fallback.
  useEffect(() => {
    if (!visible) return;
    let alive = true;
    setLoading(true);
    setSelected(new Set());
    setQuery('');
    setResults(null);

    const load = async () => {
      let people: Candidate[] = [];
      try {
        const suggestions = await getSuggestions({ limit: 30 });
        people = suggestions.map((s) => ({
          id: s.id,
          username: s.username,
          displayName: s.displayName,
          avatarUrl: s.avatarUrl,
        }));
      } catch {
        // fall through to followers
      }
      if (people.length === 0 && user?.id) {
        try {
          const followers = await getFollowers(user.id, { limit: 50 });
          people = followers.map((f) => ({
            id: f.id,
            username: f.username,
            displayName: f.displayName,
            avatarUrl: f.avatarUrl,
          }));
        } catch {
          // both sources failed — the empty state explains search still works
        }
      }
      if (alive) {
        setCandidates(people);
        setLoading(false);
      }
    };
    void load();

    return () => {
      alive = false;
    };
  }, [visible, user?.id]);

  // Debounced user search for anyone not in the suggestion list.
  useEffect(() => {
    if (!visible) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      searchUsers(q, { limit: 20 })
        .then((rows) =>
          setResults(
            rows.map((r) => ({
              id: r.id,
              username: r.username,
              displayName: r.displayName,
              avatarUrl: r.avatarUrl,
            })),
          ),
        )
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [query, visible]);

  const shown = useMemo(() => {
    const source = results ?? candidates;
    const seen = new Set<string>();
    return source.filter((p) => {
      if (excluded.has(p.id) || p.id === user?.id || seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [results, candidates, excluded, user?.id]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleInvite = async () => {
    if (selected.size === 0 || sending) return;
    setSending(true);
    try {
      await onInvite(Array.from(selected));
      haptics.success();
      onClose();
    } catch {
      haptics.error();
    } finally {
      setSending(false);
    }
  };

  const renderRow = ({ item, index }: { item: Candidate; index: number }) => {
    const isSelected = selected.has(item.id);
    return (
      <Animated.View entering={tearIn(Math.min(index, 8) * durations.stagger)}>
        <SpringPressable
          haptic="light"
          onPress={() => toggle(item.id)}
          accessibilityRole="button"
          accessibilityLabel={`Invite ${item.displayName ?? item.username}`}
          accessibilityState={{ selected: isSelected }}
          style={styles.personRow}
        >
          <Avatar uri={item.avatarUrl} name={item.displayName ?? item.username} size={36} />
          <View style={styles.personBody}>
            <Text style={styles.personName} numberOfLines={1}>
              {item.displayName ?? item.username}
            </Text>
            <Text style={styles.personUsername} numberOfLines={1}>
              @{item.username}
            </Text>
          </View>
          <View style={[styles.checkCircle, isSelected && styles.checkCircleOn]}>
            {isSelected ? (
              <Ionicons name="checkmark" size={13} color={tokens.colors.inverseFg} />
            ) : null}
          </View>
        </SpringPressable>
      </Animated.View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
      >
        <BlurView
          intensity={18}
          tint={tokens.mode === 'dark' ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      </Pressable>

      <View style={styles.sheet}>
        <View style={styles.grabber} />
        <Text style={styles.title}>Invite friends</Text>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={14} color={tokens.colors.muteSoft} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search people…"
            placeholderTextColor={tokens.colors.muteSoft}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searching ? <ActivityIndicator size="small" color={tokens.colors.mute} /> : null}
        </View>

        {loading && !results ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={tokens.colors.mute} />
          </View>
        ) : (
          <FlatList
            data={shown}
            keyExtractor={(p) => p.id}
            renderItem={renderRow}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={styles.empty}>
                {results
                  ? 'No one matched that search.'
                  : 'No suggestions yet — search for people to invite.'}
              </Text>
            }
          />
        )}

        <View style={styles.footer}>
          <PillButton
            title={
              sending
                ? 'Inviting…'
                : selected.size > 0
                  ? `Invite ${selected.size}`
                  : 'Invite'
            }
            variant="primary"
            size="lg"
            springFeedback
            haptic="medium"
            disabled={selected.size === 0 || sending}
            onPress={() => void handleInvite()}
          />
        </View>
      </View>
    </Modal>
  );
}

const buildStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    backdrop: { flex: 1 },
    sheet: {
      backgroundColor: tokens.colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 10,
      paddingBottom: 24,
      height: '72%',
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
    title: {
      fontSize: 18,
      fontWeight: '800',
      letterSpacing: -0.3,
      color: tokens.colors.fg,
      paddingHorizontal: 20,
    },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: 20,
      marginTop: 12,
      marginBottom: 4,
      paddingHorizontal: 12,
      borderRadius: tokens.radius.md,
      backgroundColor: tokens.colors.card2,
      height: 40,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: tokens.colors.fg,
      paddingVertical: 0,
    },
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    listContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
    personRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 9,
    },
    personBody: { flex: 1, minWidth: 0 },
    personName: { fontSize: 14, fontWeight: '600', color: tokens.colors.fg },
    personUsername: {
      fontFamily: tokens.fontFamilies.mono,
      fontSize: 10.5,
      letterSpacing: 0.4,
      color: tokens.colors.mute,
      marginTop: 1,
    },
    checkCircle: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: tokens.colors.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkCircleOn: {
      backgroundColor: tokens.colors.inverseBg,
      borderColor: tokens.colors.inverseBg,
    },
    empty: {
      fontSize: 13,
      color: tokens.colors.mute,
      textAlign: 'center',
      paddingVertical: 28,
      lineHeight: 19,
    },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: tokens.colors.hairline,
    },
  });
