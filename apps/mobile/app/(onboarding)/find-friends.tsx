// ONBOARDING · FIND FRIENDS — A4: OPTIONAL (résumé lane), no longer a gate.
// Reached from the radar's "Find your people" tertiary and from the feed's
// empty state; Done/Skip pop back to wherever the user came from. Contact-
// sync value prop + suggested users: suggestions load on mount
// (/users/suggestions); "Sync contacts" runs the existing contacts wiring
// (useContactsSync → /users/contacts-sync). Follow pills → /users/:id/follow.

import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PillButton } from '../../components/ui/PillButton';
import { SpringPressable } from '../../components/ui/SpringPressable';
import { followUser } from '../../lib/api/profile';
import { durations } from '../../lib/motion';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { useContactsSync } from '../../hooks/useContactsSync';
import { useSuggestions } from '../../hooks/useSuggestions';

type Row = { id: string; name: string; subtitle: string; avatarUrl?: string };

function FollowRow({
  row,
  followed,
  onFollow,
  onOpen,
}: {
  row: Row;
  followed: boolean;
  onFollow: () => void;
  onOpen: () => void;
}) {
  const { tokens } = useTheme();
  const c = tokens.colors;
  const initial = row.name.trim()[0]?.toUpperCase() ?? '?';

  return (
    <SpringPressable
      onPress={onOpen}
      accessibilityRole="button"
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}
    >
      {row.avatarUrl ? (
        <Image source={{ uri: row.avatarUrl }} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.card2 }} />
      ) : (
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: c.card2,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '700', color: c.mute }}>{initial}</Text>
        </View>
      )}

      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '700', color: c.fg }}>
          {row.name}
        </Text>
        <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '400', color: c.mute }}>
          {row.subtitle}
        </Text>
      </View>

      <SpringPressable
        onPress={onFollow}
        haptic="light"
        accessibilityRole="button"
        accessibilityLabel={followed ? 'Following' : 'Follow'}
        style={{
          height: 34,
          paddingHorizontal: 16,
          borderRadius: 999,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: followed ? c.card2 : c.inverseBg,
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: '600', color: followed ? c.text : c.inverseFg }}>
          {followed ? 'Following' : 'Follow'}
        </Text>
      </SpringPressable>
    </SpringPressable>
  );
}

export default function FindFriendsOnboarding() {
  const router = useRouter();
  const { tokens } = useTheme();

  const { suggestions, loading: suggestionsLoading } = useSuggestions();
  const { matches, loading: syncing, sync } = useContactsSync();

  const [followedIds, setFollowedIds] = useState<Set<string>>(() => new Set());

  const rows: Row[] = useMemo(() => {
    const seen = new Set<string>();
    const out: Row[] = [];
    for (const m of matches) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      out.push({
        id: m.id,
        name: m.displayName || m.username,
        subtitle: m.contactName ? `${m.contactName} · in your contacts` : `@${m.username}`,
        avatarUrl: m.avatarUrl,
      });
    }
    for (const s of suggestions) {
      if (seen.has(s.id)) continue;
      seen.add(s.id);
      out.push({
        id: s.id,
        name: s.displayName || s.username,
        subtitle: s.mutualFriends ? `${s.mutualFriends} mutual friends` : `@${s.username}`,
        avatarUrl: s.avatarUrl,
      });
    }
    return out.slice(0, 20);
  }, [matches, suggestions]);

  const followedCount = followedIds.size;
  const listLoading = suggestionsLoading && matches.length === 0;

  const toggleFollow = (id: string) => {
    const already = followedIds.has(id);
    setFollowedIds((prev) => {
      const next = new Set(prev);
      if (already) next.delete(id);
      else next.add(id);
      return next;
    });
    if (!already) void followUser(id).catch(() => {});
  };

  const styles = useThemedStyles((t) => ({
    safe: { flex: 1, backgroundColor: t.colors.bg },
    header: { paddingHorizontal: t.density.pad, paddingTop: 8, paddingBottom: 4 },
    body: { paddingHorizontal: t.density.pad, paddingTop: 24, gap: 12 },
    title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5, color: t.colors.fg },
    subtitle: { fontSize: 15, fontWeight: '400', color: t.colors.mute, lineHeight: 21, marginBottom: 4 },
    sectionLabel: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 1.6,
      textTransform: 'uppercase',
      color: t.colors.mute,
      marginTop: 6,
    },
    empty: { fontSize: 14, fontWeight: '400', color: t.colors.mute, paddingVertical: 20, textAlign: 'center' },
    footer: { paddingHorizontal: t.density.pad, paddingTop: 12, paddingBottom: 12, gap: 10 },
  }));

  // Optional screen — leave the way you came in (radar, feed empty state, …).
  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/home');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Animated.Text entering={FadeInDown.duration(300)} style={styles.title}>
          Find your people
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(60).duration(300)} style={styles.subtitle}>
          Follow friends to see the shows they’re going to and the ones they loved.
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(120).duration(300)}>
          <PillButton
            title={syncing ? 'Syncing contacts…' : 'Sync contacts'}
            variant="secondary"
            size="lg"
            springFeedback
            haptic="light"
            disabled={syncing}
            icon={
              syncing ? (
                <ActivityIndicator size="small" color={tokens.colors.text} />
              ) : (
                <Ionicons name="people-outline" size={18} color={tokens.colors.text} />
              )
            }
            onPress={() => void sync()}
          />
        </Animated.View>

        <Text style={styles.sectionLabel}>
          {matches.length > 0 ? 'From your contacts' : 'Suggested for you'}
        </Text>

        {listLoading ? (
          <View style={{ paddingVertical: 24, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={tokens.colors.mute} />
          </View>
        ) : rows.length === 0 ? (
          <Text style={styles.empty}>Sync your contacts to find friends already on Sticket.</Text>
        ) : (
          rows.map((row, i) => (
            <Animated.View key={row.id} entering={FadeInDown.delay(Math.min(i, 10) * durations.stagger).duration(260)}>
              <FollowRow
                row={row}
                followed={followedIds.has(row.id)}
                onFollow={() => toggleFollow(row.id)}
                onOpen={() => router.push({ pathname: '/profile/[id]', params: { id: row.id } })}
              />
            </Animated.View>
          ))
        )}
      </ScrollView>

      <View style={styles.footer}>
        <PillButton
          title={followedCount ? `Done · following ${followedCount}` : 'Done'}
          size="lg"
          springFeedback
          haptic="light"
          onPress={close}
        />
        {followedCount === 0 ? (
          <PillButton
            title="Skip for now"
            variant="ghost"
            size="lg"
            springFeedback
            onPress={close}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}
