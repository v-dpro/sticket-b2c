// app/(tabs)/you.tsx — THE TRACKING HUB. The timeline moved to its own tab;
// You is where you track and follow: compact profile header, then subtabs —
// ARTISTS (followed artists as collectibles with seen-counts), PRESALES
// (alerts + the ticketed/interested agenda), COLLECTION (artists × counts,
// venues visited, cities reached).

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';

import { getUserStats } from '../../lib/api/profile';
import { durations, haptics } from '../../lib/motion';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { useSession } from '../../hooks/useSession';
import type { ProfileStats } from '../../types/profile';

import { TimelineHeader } from '../../components/timeline/TimelineHeader';
import { ArtistsTab } from '../../components/you/ArtistsTab';
import { CollectionTab } from '../../components/you/CollectionTab';
import { PresalesTab } from '../../components/you/PresalesTab';
import { SpringPressable } from '../../components/ui/SpringPressable';

type YouTab = 'artists' | 'presales' | 'collection';

const TABS: { key: YouTab; label: string }[] = [
  { key: 'artists', label: 'ARTISTS' },
  { key: 'presales', label: 'PRESALES' },
  { key: 'collection', label: 'COLLECTION' },
];

export default function YouScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const { user, profile } = useSession();
  const userId = user?.id ?? null;

  const [tab, setTab] = useState<YouTab>('artists');
  const [stats, setStats] = useState<ProfileStats | null>(null);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    getUserStats(userId)
      .then((s) => {
        if (alive) setStats(s);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [userId]);

  const styles = useThemedStyles((t) => ({
    screen: { flex: 1, backgroundColor: t.colors.bg },
    tabBar: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: t.density.pad,
      paddingTop: 12,
      paddingBottom: 4,
    },
    tabPill: {
      paddingVertical: 7,
      paddingHorizontal: 14,
      borderRadius: t.radius.full,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      backgroundColor: t.colors.card,
    },
    tabPillActive: {
      backgroundColor: t.colors.inverseBg,
      borderColor: t.colors.inverseBg,
    },
    tabText: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 11,
      letterSpacing: 1,
      color: t.colors.mute,
    },
    tabTextActive: { color: t.colors.inverseFg },
    scrollContent: { paddingBottom: 120 },
  }));

  const openSettings = useCallback(() => router.push('/settings'), [router]);
  const openEditProfile = useCallback(() => router.push('/edit-profile'), [router]);
  const openLogFlow = useCallback(() => router.push('/log/search'), [router]);

  // ProfileStats has no avg — the header renders "—" for null.
  const avgScore = null;

  const body = useMemo(() => {
    switch (tab) {
      case 'artists':
        return <ArtistsTab />;
      case 'presales':
        return <PresalesTab />;
      case 'collection':
        return <CollectionTab />;
    }
  }, [tab]);

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <TimelineHeader
        displayName={profile?.displayName ?? profile?.username ?? 'You'}
        username={profile?.username ?? null}
        city={profile?.city ?? null}
        avatarUrl={profile?.avatarUrl ?? null}
        stats={{
          shows: stats?.shows ?? null,
          artists: stats?.artists ?? null,
          venues: stats?.venues ?? null,
          avgScore,
        }}
        onSettings={openSettings}
        onEdit={openEditProfile}
        onLog={openLogFlow}
      />

      {/* Subtabs — mono pills, active = ink inversion. */}
      <View style={styles.tabBar}>
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <SpringPressable
              key={t.key}
              haptic="none"
              onPress={() => {
                if (t.key !== tab) {
                  haptics.light();
                  setTab(t.key);
                }
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={t.label}
              style={[styles.tabPill, active ? styles.tabPillActive : null]}
            >
              <Text style={[styles.tabText, active ? styles.tabTextActive : null]}>{t.label}</Text>
            </SpringPressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* In-place view swap — fade is the right move here. */}
        <Animated.View key={tab} entering={FadeIn.duration(durations.fadeThrough)}>
          {body}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
