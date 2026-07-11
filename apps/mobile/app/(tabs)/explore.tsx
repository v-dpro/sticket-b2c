// Explore — find your next show.
//
// Search hand-off + "Upcoming in your city" (discover feed) + "Presales
// this week". Monochrome chrome, cards float on elevation, data via the
// existing discovery/presales endpoints.

import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import {
  Image,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PillButton } from '../../components/ui/PillButton';
import { SpringPressable } from '../../components/ui/SpringPressable';
import { Skeleton } from '../../components/ui/Skeleton';
import { useDiscovery } from '../../hooks/useDiscovery';
import { usePresales, type PresaleItem } from '../../hooks/usePresales';
import { durations } from '../../lib/motion';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import type { Event } from '../../types/event';

function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function presaleDayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((new Date(d).setHours(0, 0, 0, 0) - today.getTime()) / 86400000);
  if (diff <= 0) return 'NOW';
  if (diff === 1) return 'TMRW';
  return d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
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
    title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.6, color: t.colors.fg },
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
    scrollContent: { paddingBottom: 120 },
    section: { marginTop: 10, marginBottom: 14 },
    sectionHead: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      paddingHorizontal: t.density.pad,
      marginBottom: 10,
    },
    sectionTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3, color: t.colors.fg },
    sectionMeta: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 11,
      letterSpacing: 1,
      color: t.colors.mute,
    },
    sectionLink: { fontSize: 13, fontWeight: '600', color: t.colors.mute },
    row: {
      minHeight: t.density.rowH,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: t.density.pad,
      paddingVertical: 8,
    },
    rowImage: {
      width: 52,
      height: 52,
      borderRadius: t.radius.md,
      backgroundColor: t.colors.card2,
    },
    rowImageFallback: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowBody: { flex: 1, minWidth: 0, gap: 2 },
    rowTitle: { fontSize: 15, fontWeight: '600', color: t.colors.text },
    rowMeta: { fontSize: 13, color: t.colors.mute },
    dateChip: {
      minWidth: 52,
      alignItems: 'center',
      paddingVertical: 5,
      paddingHorizontal: 8,
      borderRadius: t.radius.sm,
      backgroundColor: t.colors.card2,
    },
    dateChipText: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 11,
      letterSpacing: 0.5,
      color: t.colors.text,
    },
    empty: {
      marginHorizontal: t.density.pad,
      padding: t.density.cardPad,
      borderRadius: t.radius.lg,
      backgroundColor: t.colors.card,
      alignItems: 'center',
      gap: 8,
      ...t.shadows.card,
    },
    emptyText: { fontSize: 14, color: t.colors.textSoft, textAlign: 'center', lineHeight: 20 },
    skeletonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: t.density.pad,
      paddingVertical: 10,
    },
  }));

  const { data, city, loading: discoverLoading, refreshing, refresh } = useDiscovery();
  const { presales, loading: presalesLoading } = usePresales();

  const cityEvents: Event[] = useMemo(() => {
    const comingUp = data?.comingUp ?? [];
    if (comingUp.length > 0) return comingUp.slice(0, 6);
    return (data?.popular ?? []).slice(0, 6);
  }, [data]);

  const weekPresales: PresaleItem[] = useMemo(() => {
    const now = Date.now();
    const weekOut = now + 7 * 86400000;
    return presales
      .filter((p) => {
        const start = new Date(p.presaleStart).getTime();
        if (Number.isNaN(start)) return false;
        const end = p.presaleEnd ? new Date(p.presaleEnd).getTime() : start;
        // Live now, or starting within the next 7 days.
        return start <= weekOut && (Number.isNaN(end) ? start >= now : end >= now);
      })
      .sort((a, b) => new Date(a.presaleStart).getTime() - new Date(b.presaleStart).getTime())
      .slice(0, 5);
  }, [presales]);

  const renderEventRow = (event: Event, index: number) => (
    <Animated.View key={event.id} entering={FadeInDown.delay(index * durations.stagger).duration(240)}>
      <SpringPressable
        haptic="light"
        onPress={() => router.push(`/event/${event.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`${event.artist?.name ?? event.name}, ${event.venue?.name ?? ''}`}
        style={styles.row}
      >
        {event.imageUrl || event.artist?.imageUrl ? (
          <Image source={{ uri: event.imageUrl ?? event.artist?.imageUrl }} style={styles.rowImage} />
        ) : (
          <View style={[styles.rowImage, styles.rowImageFallback]}>
            <Ionicons name="musical-notes-outline" size={20} color={tokens.colors.mute} />
          </View>
        )}
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {event.artist?.name ?? event.name}
          </Text>
          <Text style={styles.rowMeta} numberOfLines={1}>
            {event.venue?.name}
            {event.venue?.name ? ' · ' : ''}
            {formatEventDate(event.date)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={tokens.colors.muteSoft} />
      </SpringPressable>
    </Animated.View>
  );

  const renderPresaleRow = (presale: PresaleItem, index: number) => (
    <Animated.View key={presale.id} entering={FadeInDown.delay(index * durations.stagger).duration(240)}>
      <SpringPressable
        haptic="light"
        onPress={() => router.push(`/presales/${presale.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`${presale.artistName} presale`}
        style={styles.row}
      >
        <View style={styles.dateChip}>
          <Text style={styles.dateChipText}>{presaleDayLabel(presale.presaleStart)}</Text>
        </View>
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {presale.artistName}
          </Text>
          <Text style={styles.rowMeta} numberOfLines={1}>
            {presale.venueName} · {presale.venueCity}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={tokens.colors.muteSoft} />
      </SpringPressable>
    </Animated.View>
  );

  const rowSkeleton = (key: number) => (
    <View key={key} style={styles.skeletonRow}>
      <Skeleton width={52} height={52} borderRadius={tokens.radius.md} />
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton width="65%" height={14} borderRadius={7} />
        <Skeleton width="45%" height={11} borderRadius={6} />
      </View>
    </View>
  );

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
        {/* Upcoming in your city */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Upcoming in your city</Text>
            <Text style={styles.sectionMeta}>{city.toUpperCase()}</Text>
          </View>

          {discoverLoading ? (
            <>{[0, 1, 2, 3].map(rowSkeleton)}</>
          ) : cityEvents.length > 0 ? (
            cityEvents.map(renderEventRow)
          ) : (
            <View style={styles.empty}>
              <Ionicons name="location-outline" size={24} color={tokens.colors.mute} />
              <Text style={styles.emptyText}>
                Nothing on the radar in {city} yet. Search for a show to get things going.
              </Text>
              <PillButton
                title="Search shows"
                variant="secondary"
                springFeedback
                onPress={() => router.push('/search')}
              />
            </View>
          )}
        </View>

        {/* Presales this week */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Presales this week</Text>
            <SpringPressable onPress={() => router.push('/presales')} accessibilityRole="button" accessibilityLabel="All presales">
              <Text style={styles.sectionLink}>All presales</Text>
            </SpringPressable>
          </View>

          {presalesLoading ? (
            <>{[0, 1, 2].map(rowSkeleton)}</>
          ) : weekPresales.length > 0 ? (
            weekPresales.map(renderPresaleRow)
          ) : (
            <View style={styles.empty}>
              <Ionicons name="ticket-outline" size={24} color={tokens.colors.mute} />
              <Text style={styles.emptyText}>
                No presales in the next seven days. Follow artists and we&apos;ll flag their next drop.
              </Text>
              <PillButton
                title="Browse all presales"
                variant="secondary"
                springFeedback
                onPress={() => router.push('/presales')}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
