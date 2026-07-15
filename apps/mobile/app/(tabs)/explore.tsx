// Explore — the heart of the app (batch 5, C14): an Instagram-Explore-energy
// mixed discovery stream for finding, following, and planning shows.
//
// Header ("Explore" + omnisearch pill) over the repeating STANZA — rail →
// full-width spotlight → crowd mosaic — assembled by ExploreStream from one
// GET /explore payload. Monochrome chrome, mono data lines, plain entity
// cards (C3), tear-in section entrances.

import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExploreStream, ExploreStreamSkeleton } from '../../components/explore/ExploreStream';
import { ErrorState } from '../../components/ui/ErrorState';
import { PillButton } from '../../components/ui/PillButton';
import { SpringPressable } from '../../components/ui/SpringPressable';
import { getExplore, type ExploreData } from '../../lib/api/explore';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

function isEmpty(data: ExploreData): boolean {
  return (
    data.presales.length === 0 &&
    data.thisWeekend.length === 0 &&
    data.friendGravity.length === 0 &&
    data.trendingEvents.length === 0 &&
    data.risingArtists.length === 0 &&
    data.spotlightTours.length === 0 &&
    data.venues.length === 0 &&
    data.crowdPosts.length === 0
  );
}

export default function ExploreScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    safe: { flex: 1, backgroundColor: t.colors.bg },
    header: {
      paddingHorizontal: t.density.pad,
      paddingTop: 10,
      paddingBottom: t.density.gap,
      gap: t.density.gap,
    },
    title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, color: t.colors.fg },
    searchBar: {
      height: 46,
      borderRadius: t.radius.full,
      backgroundColor: t.colors.card,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 16,
      ...t.shadows.card,
    },
    searchHint: { fontSize: 15, color: t.colors.mute },
    scrollContent: { paddingTop: 4, paddingBottom: 120 },
    empty: {
      marginHorizontal: t.density.pad,
      marginTop: 30,
      padding: t.density.cardPad,
      borderRadius: t.radius.lg,
      backgroundColor: t.colors.card,
      alignItems: 'center',
      gap: 10,
      ...t.shadows.card,
    },
    emptyTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2, color: t.colors.fg },
    emptyText: { fontSize: 14, color: t.colors.textSoft, textAlign: 'center', lineHeight: 20 },
    emptyActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  }));

  const [data, setData] = useState<ExploreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await getExplore());
      setError(false);
    } catch {
      // Keep any previously loaded stream on refresh failures.
      setError(true);
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Explore</Text>
        <SpringPressable
          haptic="light"
          onPress={() => router.push('/search')}
          accessibilityRole="search"
          accessibilityLabel="Search artists, venues, and shows"
          style={styles.searchBar}
        >
          <Ionicons name="search" size={18} color={tokens.colors.mute} />
          <Text style={styles.searchHint}>Artists, venues, shows</Text>
        </SpringPressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={tokens.colors.mute}
            colors={[tokens.colors.fg]}
            progressBackgroundColor={tokens.colors.card2}
          />
        }
      >
        {loading ? (
          <ExploreStreamSkeleton />
        ) : error && !data ? (
          <ErrorState
            title="Couldn't load Explore"
            message="Check your connection and try again."
            onRetry={refresh}
          />
        ) : data && !isEmpty(data) ? (
          <ExploreStream data={data} />
        ) : (
          <View style={styles.empty}>
            <Ionicons name="ticket-outline" size={26} color={tokens.colors.mute} />
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptyText}>
              Explore fills in as shows get logged. Log a show you&apos;ve been to, or search for
              an artist to start tracking your next one.
            </Text>
            <View style={styles.emptyActions}>
              <PillButton
                title="Log a show"
                variant="primary"
                springFeedback
                onPress={() => router.push('/log/search')}
              />
              <PillButton
                title="Search"
                variant="secondary"
                springFeedback
                onPress={() => router.push('/search')}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
