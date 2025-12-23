import React, { useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useConcertLife } from '../../../hooks/useConcertLife';
import { TimelineCard } from '../../../components/concert-life/TimelineCard';
import { colors, gradients } from '../../../lib/theme';
import { HeroTimelineCard } from '../../../components/concert-life/HeroTimelineCard';

type UpcomingItem = any & { itemType: 'ticket' | 'tracking' | 'presale' };

function isTodayISO(dateStr: string): boolean {
  const date = new Date(dateStr);
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

function startOfTodayLocal() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function TimelineRail() {
  return (
    <LinearGradient
      colors={gradients.rainbow}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.timelineLine}
    />
  );
}

function MonthDot() {
  return (
    <LinearGradient
      colors={gradients.primary}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.monthDot}
    />
  );
}

export default function MyConcertLifeScreen() {
  const router = useRouter();
  const { data, loading, refreshing, refresh, error } = useConcertLife();
  const [liked, setLiked] = useState<Record<string, boolean>>({});

  const pastLogs = data?.pastLogs ?? [];
  const upcomingLogs = (data as any)?.upcomingLogs ?? [];
  const upcomingTickets = data?.upcomingTickets ?? [];
  const tracking = data?.tracking ?? [];
  const presaleAlerts = data?.presaleAlerts ?? [];
  const stats = data?.stats;

  const allForwardItems: any[] = useMemo(() => {
    const items: any[] = [
      ...upcomingLogs.map((l: any) => ({ ...l, itemType: 'log' as const })),
      ...upcomingTickets.map((t: any) => ({ ...t, itemType: 'ticket' as const })),
      ...tracking.map((t: any) => ({ ...t, itemType: 'tracking' as const })),
      ...presaleAlerts.map((p: any) => ({ ...p, itemType: 'presale' as const })),
    ];
    return items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [presaleAlerts, tracking, upcomingLogs, upcomingTickets]);

  const { todayItems, futureItems } = useMemo(() => {
    const start = startOfTodayLocal().getTime();
    const end = start + 24 * 60 * 60 * 1000;
    const todayItems = allForwardItems.filter((i) => {
      const t = new Date(i.date).getTime();
      return t >= start && t < end;
    });
    const futureItems = allForwardItems.filter((i) => new Date(i.date).getTime() >= end);
    return { todayItems, futureItems };
  }, [allForwardItems]);

  const groupedPastLogs = useMemo(() => {
    return pastLogs.reduce((acc: Record<string, any[]>, log: any) => {
      const date = new Date(log.event.date);
      const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      if (!acc[monthYear]) acc[monthYear] = [];
      acc[monthYear].push(log);
      return acc;
    }, {});
  }, [pastLogs]);

  // Match Figma: single continuous timeline (no Past/Today/Future toggles).
  // Includes: past logs + future-dated logs + tickets + tracking + presales, grouped by month.
  const groupedAllTimelineItems = useMemo(() => {
    const items: any[] = [
      ...pastLogs.map((l: any) => ({ ...l, itemType: 'log' as const })),
      ...allForwardItems,
    ];
    // Sort by date DESC to match the visual ordering in Figma (future months at top).
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return items.reduce((acc: Record<string, any[]>, item: any) => {
      const date = new Date(item.date);
      const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      if (!acc[monthYear]) acc[monthYear] = [];
      acc[monthYear].push(item);
      return acc;
    }, {});
  }, [allForwardItems, pastLogs]);

  const artistsCount = useMemo(() => {
    const all = [...pastLogs, ...allForwardItems];
    const keys = all
      .map((x: any) => x?.event?.artist?.id ?? x?.event?.artist?.name ?? x?.artistName)
      .filter(Boolean) as string[];
    return new Set(keys).size;
  }, [allForwardItems, pastLogs]);

  const upcomingCount = useMemo(() => {
    // Count unique upcoming events (tickets/logs/tracking) excluding presales.
    const start = startOfTodayLocal().getTime();
    const ids = allForwardItems
      .filter((i: any) => new Date(i.date).getTime() >= start)
      .filter((i: any) => i.itemType !== 'presale')
      .map((i: any) => i?.event?.id)
      .filter(Boolean) as string[];
    return new Set(ids).size;
  }, [allForwardItems]);

  const renderHeroForItem = (item: any) => {
    const event = item.event;
    const artist = event?.artist?.name || item.artistName || 'Unknown';
    const venue = event?.venue?.name || item.venueName || 'Venue';
    const city = event?.venue?.city || item.venueCity || '';
    const date = new Date(item.date);
    const tour = item.itemType === 'presale' ? item.tourName : event?.name;
    const imageUrl = (item.itemType === 'log' && Array.isArray(item.photos) ? item.photos[0] : null) ?? event?.imageUrl ?? event?.artist?.imageUrl ?? null;

    const isUpcoming = new Date(item.date).getTime() >= startOfTodayLocal().getTime();
    const showUpcomingPill = isUpcoming;

    // Use existing list-style card for presales/tracking (no strong hero visuals).
    const shouldUseHero = item.itemType === 'ticket' || item.itemType === 'log';

    if (!shouldUseHero) {
      return (
        <TimelineCard
          type={item.itemType === 'presale' ? 'presale' : item.itemType}
          artist={artist}
          venue={venue}
          city={city}
          date={date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          section={item.section}
          row={item.row}
          seat={item.seat}
          maxPrice={item.maxPrice}
          presaleType={item.presaleType}
          presaleCode={item.code}
          presaleDeadline={item.signupDeadline}
          isToday={isTodayISO(item.date)}
          onPress={() => {
            if (item.itemType === 'presale') router.push(`/presales/${item.id}`);
            else if (item.itemType === 'log') router.push(`/log/${item.id}`);
            else if (item.event?.id) router.push(`/event/${item.event.id}`);
          }}
        />
      );
    }

    const idKey = `${item.itemType}-${item.id}`;
    const isLiked = liked[idKey] ?? false;

    return (
      <HeroTimelineCard
        artist={artist}
        tour={tour}
        venue={venue}
        city={city}
        date={date}
        imageUrl={imageUrl}
        showUpcomingPill={showUpcomingPill}
        rating={item.itemType === 'log' ? item.rating : null}
        note={item.itemType === 'log' ? item.note : null}
        likesCount={item.itemType === 'log' ? Number(item.wasThereCount ?? 0) : 0}
        commentsCount={item.itemType === 'log' ? Number(item.commentCount ?? 0) : 0}
        isLiked={isLiked}
        onPress={() => {
          if (item.itemType === 'log') router.push(`/log/${item.id}`);
          else if (item.event?.id) router.push(`/event/${item.event.id}`);
        }}
        onToggleLike={() => setLiked((prev) => ({ ...prev, [idKey]: !isLiked }))}
        onPressComments={() => {
          if (item.itemType === 'log') router.push(`/log/${item.id}`);
          else if (item.event?.id) router.push(`/event/${item.event.id}`);
        }}
        onPressShare={() => {
          // Placeholder until we decide what share UX should be here.
          if (item.itemType === 'log') router.push(`/log/${item.id}`);
          else if (item.event?.id) router.push(`/event/${item.event.id}`);
        }}
      />
    );
  };

  const showEmptyToday = !loading && todayItems.length === 0;
  const showEmptyFuture = !loading && futureItems.length === 0;
  const showEmptyPast = !loading && pastLogs.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>My Concert Life</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/wallet')} activeOpacity={0.8}>
            <Ionicons name="ticket-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/notifications')} activeOpacity={0.8}>
            <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats?.totalShows || 0}</Text>
            <Text style={styles.statLabel}>Shows</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{upcomingCount}</Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{artistsCount}</Text>
            <Text style={styles.statLabel}>Artists</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#00D4FF" />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.loadingText}>Loading…</Text>
          </View>
        ) : error ? (
          <View style={styles.emptyState}>
            <Ionicons name="alert-circle-outline" size={64} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>Couldn’t load your timeline</Text>
            <Text style={styles.emptyText}>{error}</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={refresh} activeOpacity={0.85}>
              <Text style={styles.emptyButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : Object.keys(groupedAllTimelineItems).length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="musical-notes-outline" size={64} color="#6B6B8D" />
            <Text style={styles.emptyTitle}>No concert activity yet</Text>
            <Text style={styles.emptyText}>Log a show, add a ticket, or track an event</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => router.push('/(tabs)/discover')} activeOpacity={0.85}>
              <Text style={styles.emptyButtonText}>Find Shows</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.timeline}>
            <TimelineRail />

            {Object.entries(groupedAllTimelineItems).map(([monthYear, items]) => (
              <View key={monthYear}>
                <View style={styles.monthHeader}>
                  <View style={styles.dotColumn}>
                    <MonthDot />
                  </View>
                  <View style={styles.monthLine} />
                  <Text style={styles.monthText}>{monthYear}</Text>
                  <View style={styles.monthLine} />
                </View>

                {(items as any[]).map((item) => {
                  const itemDate = new Date(item.date).getTime();
                  const isUpcoming = itemDate >= startOfTodayLocal().getTime();
                  const dotStyle = isUpcoming ? styles.dotCyan : styles.dotPurple;

                  return (
                    <View key={`${item.itemType}-${item.id}`} style={styles.timelineRow}>
                    <View style={styles.dotColumn}>
                        <View style={[styles.timelineDot, dotStyle]} />
                    </View>
                    <View style={styles.rowContent}>
                        {renderHeroForItem(item)}
                    </View>
                  </View>
                  );
                })}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  loadingContainer: {
    paddingTop: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#A0A0B8',
    fontSize: 14,
    fontWeight: '600',
  },
  timeline: {
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: 20,
    top: 0,
    bottom: 0,
    width: 2,
  },
  dotColumn: {
    width: 40,
    alignItems: 'center',
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.background,
    zIndex: 1,
  },
  rowContent: {
    flex: 1,
  },
  dotSuccess: {
    backgroundColor: '#22C55E',
  },
  dotCyan: {
    backgroundColor: '#00D4FF',
  },
  dotWarning: {
    backgroundColor: '#F59E0B',
  },
  dotPurple: {
    backgroundColor: '#8B5CF6',
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    marginTop: 10,
  },
  monthDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.background,
    zIndex: 1,
  },
  monthLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  monthText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brandCyan,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#A0A0B8',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#8B5CF6',
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});


