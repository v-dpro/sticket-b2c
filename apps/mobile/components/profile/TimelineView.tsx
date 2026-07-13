import React from 'react';
import { RefreshControl, SectionList, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

import type { LogEntry } from '../../types/profile';
import type { TimelineUpcomingItem } from '../../lib/api/timeline';
import { YearFilter } from './YearFilter';
import { YearHeaderCard, type YearHeaderCardData } from './YearHeaderCard';
import { FeaturedLogCard } from './FeaturedLogCard';
import { CompactLogCard } from './CompactLogCard';
import { MilestoneCard, type Milestone } from './MilestoneCard';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { SpringPressable } from '../ui/SpringPressable';

interface TimelineViewProps {
  headerComponent?: React.ReactNode;
  logs: LogEntry[];
  years: number[];
  selectedYear: number | null;
  onYearSelect: (year: number | null) => void;
  onLogPress: (log: LogEntry) => void;
  onLoadMore: () => void;
  onRefresh: () => void;
  loading: boolean;
  hasMore: boolean;
  /**
   * A14: event ids the signed-in viewer has ALSO logged (only supplied when
   * viewing someone else's timeline). Matching entries get a "BOTH" chip.
   */
  sharedEventIds?: ReadonlySet<string>;
  /**
   * Upcoming plans for the profile being viewed. Optional and unwired at
   * the current call site (app/profile/[id].tsx only fetches past `logs`
   * via GET /users/:userId/logs — there's no upcoming-items endpoint for
   * other users yet) — the party chip below renders the moment a caller
   * supplies this.
   */
  upcoming?: TimelineUpcomingItem[];
}

/** Mirrors components/timeline/PlanCard.tsx's partyLine wording exactly. */
function partyLine(party: NonNullable<TimelineUpcomingItem['party']>): string {
  const state =
    party.myStatus === 'HOST'
      ? 'YOU HOST'
      : party.myStatus === 'GOING'
        ? "YOU'RE GOING"
        : party.myStatus === 'REQUESTED'
          ? 'REQUESTED'
          : party.myStatus === 'INVITED'
            ? 'INVITED'
            : 'TAP TO JOIN';
  return `${party.title.toUpperCase()} · ${party.goingCount} GOING · ${state}`;
}

type TimelineItem =
  | { key: string; type: 'featured'; log: LogEntry }
  | { key: string; type: 'pair'; left: LogEntry; right: LogEntry | null }
  | { key: string; type: 'milestone'; milestone: Milestone };

type TimelineSection = {
  year: number;
  header: YearHeaderCardData;
  data: TimelineItem[];
};

function isFeatured(log: LogEntry) {
  if (log.photos?.length) return true;
  if (typeof log.rating === 'number' && log.rating >= 4) return true;
  if (typeof log.note === 'string' && log.note.trim().length >= 60) return true;
  return false;
}

function buildSections(logs: LogEntry[]): TimelineSection[] {
  const byYear = new Map<number, LogEntry[]>();
  for (const l of logs) {
    const y = new Date(l.event.date).getFullYear();
    const arr = byYear.get(y) || [];
    arr.push(l);
    byYear.set(y, arr);
  }

  const years = [...byYear.keys()].sort((a, b) => b - a);
  const showCounts = years.map((y) => byYear.get(y)?.length || 0);
  const top = showCounts.length ? Math.max(...showCounts) : 0;

  return years.map((year) => {
    const yearLogs = byYear.get(year) || [];
    // Ensure date desc within year (pagination can append older logs).
    yearLogs.sort((a, b) => +new Date(b.event.date) - +new Date(a.event.date));

    const artists = new Set<string>();
    const venues = new Set<string>();
    for (const l of yearLogs) {
      artists.add(l.event.artist.id);
      venues.add(l.event.venue.id);
    }

    const showCount = yearLogs.length;
    const isTopYear = top > 0 && showCount === top;
    const header: YearHeaderCardData = {
      year,
      showCount,
      artistCount: artists.size,
      venueCount: venues.size,
      isTopYear,
      progress: top > 0 ? showCount / top : 0,
    };

    const items: TimelineItem[] = [];

    // Optional "top year" milestone banner.
    if (isTopYear && showCount >= 5) {
      items.push({
        key: `milestone_top_${year}`,
        type: 'milestone',
        milestone: {
          id: `top_${year}`,
          icon: 'sparkles',
          title: `Top year so far`,
          subtitle: `${showCount} shows logged`,
        },
      });
    }

    for (let i = 0; i < yearLogs.length; ) {
      const a = yearLogs[i];
      const aFeatured = isFeatured(a);

      if (aFeatured) {
        items.push({ key: `featured_${a.id}`, type: 'featured', log: a });
        i += 1;
        continue;
      }

      const b = yearLogs[i + 1];
      const bOk = b && !isFeatured(b);
      items.push({ key: `pair_${a.id}_${b?.id || 'x'}`, type: 'pair', left: a, right: bOk ? b : null });
      i += bOk ? 2 : 1;
    }

    return { year, header, data: items };
  });
}

export function TimelineView({
  headerComponent,
  logs,
  years,
  selectedYear,
  onYearSelect,
  onLogPress,
  onLoadMore,
  onRefresh,
  loading,
  hasMore,
  sharedEventIds,
  upcoming,
}: TimelineViewProps) {
  const router = useRouter();
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    list: {
      flex: 1,
    },
    listContent: {
      flexGrow: 1,
      paddingBottom: 100,
    },
    pairRow: {
      marginHorizontal: 16,
      marginBottom: 12,
      flexDirection: 'row',
      gap: 10,
    },
    upcomingSection: { marginHorizontal: 16, marginBottom: 12, gap: 8 },
    upcomingLabel: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 11,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
    },
    upcomingRow: {
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderRadius: t.radius.card,
      backgroundColor: t.colors.card,
      borderWidth: 1,
      borderColor: t.colors.hairline,
    },
    upcomingText: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 10.5,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: t.colors.fg,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 64,
      paddingHorizontal: 24,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: t.colors.textHi,
      marginTop: 16,
    },
    emptyText: {
      fontSize: 14,
      color: t.colors.textLo,
      marginTop: 8,
      textAlign: 'center',
    },
    footer: {
      padding: 16,
      alignItems: 'center',
    },
    footerText: {
      fontSize: 14,
      color: t.colors.textLo,
    },
  }));

  const sections = React.useMemo(() => buildSections(logs), [logs]);

  // Upcoming plans that carry a party — everything else on `upcoming` (bare
  // tickets/interested/tracking rows) has no chip to render here.
  const upcomingParties = React.useMemo(
    () => (upcoming ?? []).filter((item) => !!item.party),
    [upcoming]
  );

  const renderHeader = () => (
    <View>
      {headerComponent}
      {upcomingParties.length > 0 ? (
        <View style={styles.upcomingSection}>
          <Text style={styles.upcomingLabel}>Upcoming</Text>
          {upcomingParties.map((item) => (
            <SpringPressable
              key={item.id}
              haptic="light"
              onPress={() => router.push(`/party/${item.party!.id}`)}
              accessibilityRole="button"
              accessibilityLabel={partyLine(item.party!)}
              style={styles.upcomingRow}
            >
              <Text style={styles.upcomingText} numberOfLines={1}>
                {partyLine(item.party!)}
              </Text>
            </SpringPressable>
          ))}
        </View>
      ) : null}
      <YearFilter years={years} selectedYear={selectedYear} onSelect={onYearSelect} />
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="musical-notes-outline" size={64} color={tokens.colors.textLo} />
      <Text style={styles.emptyTitle}>No shows logged yet</Text>
      <Text style={styles.emptyText}>Start logging your concert experiences!</Text>
    </View>
  );

  const renderFooter = () => {
    if (!hasMore) return null;
    return (
      <View style={styles.footer}>
        <Text style={styles.footerText}>Loading more...</Text>
      </View>
    );
  };

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.key}
      renderItem={({ item }) => {
        switch (item.type) {
          case 'featured':
            return (
              <FeaturedLogCard
                log={item.log}
                onPress={() => onLogPress(item.log)}
                showBothMarker={sharedEventIds?.has(item.log.event.id)}
              />
            );
          case 'pair':
            return (
              <View style={styles.pairRow}>
                <CompactLogCard
                  log={item.left}
                  onPress={() => onLogPress(item.left)}
                  style={{ flex: 1 }}
                  showBothMarker={sharedEventIds?.has(item.left.event.id)}
                />
                {item.right ? (
                  <CompactLogCard
                    log={item.right}
                    onPress={() => onLogPress(item.right)}
                    style={{ flex: 1 }}
                    showBothMarker={sharedEventIds?.has(item.right.event.id)}
                  />
                ) : (
                  <View style={{ flex: 1 }} />
                )}
              </View>
            );
          case 'milestone':
            return <MilestoneCard milestone={item.milestone} />;
          default:
            return null;
        }
      }}
      renderSectionHeader={({ section }: { section: any }) => <YearHeaderCard data={section.header} />}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={!loading ? renderEmpty : null}
      ListFooterComponent={renderFooter}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.5}
      refreshControl={<RefreshControl refreshing={loading && logs.length === 0} onRefresh={onRefresh} tintColor={tokens.colors.mute} />}
      style={styles.list}
      contentContainerStyle={styles.listContent}
    />
  );
}





