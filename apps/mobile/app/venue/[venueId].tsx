// Venue entity page — header (name, city · capacity, rating stars) +
// segmented tabs: Info (practical cards) / Seat views / Tips.
//
// APIs: GET /venues/:id (detail incl. ratings summary) ·
// GET /venues/:id/seat-views · GET/POST /venues/:id/tips ·
// POST/DELETE /venues/:id/tips/:tipId/upvote.

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { EntityNav } from '../../components/entity/EntityChrome';
import { Chip, QuietEmpty, SectionLabel, StarRow } from '../../components/entity/EntityBits';
import {
  EntityError,
  EntityPageSkeleton,
  ShimmerBlock,
} from '../../components/entity/EntityStates';
import { formatScore } from '../../components/entity/format';
import { SeatSectionSheet } from '../../components/entity/SeatSectionSheet';
import { TipsList } from '../../components/entity/TipsList';
import { QASection } from '../../components/venue-qa/QASection';
import { PillButton } from '../../components/ui/PillButton';
import { SpringPressable } from '../../components/ui/SpringPressable';
import { SeatBowl } from '../../components/venue/SeatBowl';

import { useSeatViews } from '../../hooks/useSeatViews';
import { useVenue } from '../../hooks/useVenue';
import { useVenueQuestions } from '../../hooks/useVenueQuestions';
import { useVenueTips } from '../../hooks/useVenueTips';
import type { EventSeatSection } from '../../lib/api/events';
import { durations, haptics, tearIn } from '../../lib/motion';
import { useSafeBack } from '../../lib/navigation/safeNavigation';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import type { VenueDetails } from '../../types/venue';

type VenueTab = 'info' | 'seats' | 'tips' | 'qa';

const RATING_ROWS: { key: keyof VenueDetails['ratings']; label: string }[] = [
  { key: 'sound', label: 'Sound' },
  { key: 'sightlines', label: 'Sightlines' },
  { key: 'drinks', label: 'Drinks' },
  { key: 'staff', label: 'Staff' },
  { key: 'access', label: 'Getting in' },
];

function mapsUrl(venue: VenueDetails): string {
  const query = encodeURIComponent(
    [venue.name, venue.address, venue.city, venue.state, venue.country]
      .filter(Boolean)
      .join(', '),
  );
  if (Platform.OS === 'ios') return `http://maps.apple.com/?q=${query}`;
  if (Platform.OS === 'android') return `geo:0,0?q=${query}`;
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export default function VenueScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const goBack = useSafeBack();
  const { tokens } = useTheme();
  const { venueId } = useLocalSearchParams<{ venueId: string }>();
  const id = venueId ? String(venueId) : '';

  const { venue, loading, error, refetch } = useVenue(id);
  const seatViewsState = useSeatViews(id);
  const tipsState = useVenueTips(id);
  const qaState = useVenueQuestions(id);

  const [tab, setTab] = useState<VenueTab>('info');
  const [tipsAutoFocus, setTipsAutoFocus] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [openSeatSection, setOpenSeatSection] = useState<EventSeatSection | null>(null);

  // The bowl wants the same shape the event page's seat-sections endpoint
  // returns; the venue's seat views are a flat, un-grouped list, so group
  // them by section here. No per-view rating at this level, so avgRating
  // stays null (SeatSectionSheet already treats that as "no rating yet").
  const seatSectionsForBowl = useMemo<EventSeatSection[]>(() => {
    const bySection = new Map<string, EventSeatSection>();
    for (const view of seatViewsState.seatViews) {
      const existing = bySection.get(view.section);
      const photo = { id: view.id, photoUrl: view.photoUrl, thumbnailUrl: view.thumbnailUrl };
      if (existing) {
        existing.photoCount += 1;
        existing.photos.push(photo);
      } else {
        bySection.set(view.section, {
          section: view.section,
          photoCount: 1,
          avgRating: null,
          photos: [photo],
        });
      }
    }
    return Array.from(bySection.values());
  }, [seatViewsState.seatViews]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetch(), seatViewsState.refresh(), tipsState.refresh(), qaState.refresh()]);
    } finally {
      setRefreshing(false);
    }
  };

  // The single highest-upvoted tip — surfaced as the TOP TIP card.
  const topTip = useMemo(() => {
    if (!tipsState.tips.length) return null;
    return tipsState.tips.reduce(
      (best, tip) => (tip.upvotes > best.upvotes ? tip : best),
      tipsState.tips[0],
    );
  }, [tipsState.tips]);

  // Overall rating = mean of the non-null category averages.
  const overallRating = useMemo(() => {
    if (!venue) return null;
    const values = RATING_ROWS.map((r) => venue.ratings[r.key]).filter(
      (v): v is number => typeof v === 'number' && Number.isFinite(v),
    );
    if (!values.length) return null;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }, [venue]);

  const styles = useThemedStyles((t) => ({
    screen: { flex: 1, backgroundColor: t.colors.bg },
    content: { paddingHorizontal: t.density.pad },
    name: {
      fontSize: 24,
      fontWeight: '800',
      letterSpacing: -0.4,
      color: t.colors.fg,
      marginTop: 14,
      lineHeight: 29,
    },
    metaLine: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 11.5,
      letterSpacing: 0.4,
      color: t.colors.mute,
      marginTop: 8,
      textTransform: 'uppercase',
    },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
    ratingCount: {
      fontFamily: t.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 11,
      color: t.colors.mute,
    },
    noRatings: { fontSize: 12.5, color: t.colors.muteSoft, marginTop: 10 },
    // Mono stat hairline row (§2) — rating / capacity / seat photos.
    statRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 16,
      marginTop: 12,
      paddingVertical: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.line,
    },
    statCell: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    statVal: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 11.5,
      fontWeight: '600',
      color: t.colors.text,
    },
    statLbl: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 11.5,
      fontWeight: '600',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
    },
    // Seat browser rows — SEC mono + rating + photo count + thumb.
    seatBrowser: { marginTop: 4 },
    seatRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 8,
    },
    seatThumb: {
      width: 52,
      height: 52,
      borderRadius: t.radius.md,
      backgroundColor: t.colors.card2,
    },
    seatRowBody: { flex: 1, minWidth: 0, gap: 3 },
    seatRowTitle: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 13,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: t.colors.text,
    },
    seatRowRating: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    seatRowRatingText: {
      fontFamily: t.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 11,
      color: t.colors.mute,
    },
    seatRowCount: {
      fontFamily: t.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 10.5,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
    },
    // TOP TIP card + ▲ upvote block.
    topTipEyebrow: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10.5,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
      marginBottom: 8,
    },
    topTipRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
    topTipText: { fontSize: 14, color: t.colors.text, lineHeight: 20 },
    topTipMeta: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10,
      letterSpacing: 0.5,
      color: t.colors.muteSoft,
      marginTop: 6,
    },
    upvoteBlock: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      minWidth: 44,
      borderRadius: t.radius.md,
      backgroundColor: t.colors.card2,
      paddingVertical: 8,
    },
    upvoteCount: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 12,
      color: t.colors.text,
    },
    tabRow: { flexDirection: 'row', gap: 8, marginTop: 20, marginBottom: 20 },
    card: {
      backgroundColor: t.colors.card,
      borderRadius: t.radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.hairline,
      padding: t.density.cardPad,
      marginBottom: 10,
    },
    cardRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    cardBody: { flex: 1, gap: 3 },
    cardTitle: { fontSize: 14, fontWeight: '600', color: t.colors.fg },
    cardText: { fontSize: 13, color: t.colors.mute, lineHeight: 19 },
    cardMono: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 16,
      color: t.colors.fg,
    },
    showsCount: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 11.5,
      letterSpacing: 0.5,
      color: t.colors.mute,
    },
    breakdownRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
    },
    breakdownLabel: { fontSize: 13.5, fontWeight: '400', color: t.colors.text },
    breakdownRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    breakdownScore: {
      fontFamily: t.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 11.5,
      color: t.colors.mute,
      minWidth: 24,
      textAlign: 'right',
    },
    ctaCard: {
      backgroundColor: t.colors.card2,
      borderRadius: t.radius.lg,
      padding: t.density.cardPad,
      alignItems: 'flex-start',
      gap: 10,
      marginBottom: 10,
    },
    seatGridSkeleton: { flexDirection: 'row', gap: 10 },
    seatBowlWrap: { marginBottom: t.spacing.lg },
  }));

  if (loading && !venue) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ paddingTop: insets.top }}>
          <EntityNav onBack={goBack} />
        </View>
        <EntityPageSkeleton hero={false} />
      </View>
    );
  }

  if (error || !venue) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <EntityError
          title="Couldn't load this venue"
          message={error}
          onRetry={() => void refetch()}
          onBack={goBack}
        />
      </View>
    );
  }

  const cityLine = [venue.city, venue.state].filter(Boolean).join(', ');
  const hasPracticalInfo = Boolean(venue.address || venue.capacity);

  const openMaps = () => {
    void Linking.openURL(mapsUrl(venue)).catch(() => haptics.error());
  };

  const goToTipsComposer = () => {
    setTipsAutoFocus(true);
    setTab('tips');
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={{ paddingTop: insets.top }}>
        <EntityNav onBack={goBack} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void handleRefresh()}
              tintColor={tokens.colors.mute}
              colors={[tokens.colors.fg]}
              progressBackgroundColor={tokens.colors.card2}
            />
          }
        >
          <View style={styles.content}>
            {/* ── Header — title + mono stat row (rating / capacity / seat photos) ── */}
            <Text style={styles.name}>{venue.name}</Text>
            <Text style={styles.metaLine}>{cityLine}</Text>
            <View style={styles.statRow}>
              {overallRating != null ? (
                <View style={styles.statCell}>
                  <Ionicons name="star" size={11} color={tokens.colors.fg} />
                  <Text style={styles.statVal}>{formatScore(overallRating)}</Text>
                  <Text style={styles.statLbl}>
                    {venue.ratings.totalRatings > 0
                      ? `(${venue.ratings.totalRatings})`
                      : 'RATING'}
                  </Text>
                </View>
              ) : null}
              {venue.capacity ? (
                <View style={styles.statCell}>
                  <Text style={styles.statVal}>{venue.capacity.toLocaleString()}</Text>
                  <Text style={styles.statLbl}>CAP</Text>
                </View>
              ) : null}
              <View style={styles.statCell}>
                <Text style={styles.statVal}>{seatViewsState.seatViews.length}</Text>
                <Text style={styles.statLbl}>
                  {seatViewsState.seatViews.length === 1 ? 'SEAT PHOTO' : 'SEAT PHOTOS'}
                </Text>
              </View>
            </View>

            {/* ── Tabs ── */}
            <View style={styles.tabRow}>
              <Chip label="Info" active={tab === 'info'} onPress={() => setTab('info')} />
              <Chip label="Seat views" active={tab === 'seats'} onPress={() => setTab('seats')} />
              <Chip label="Tips" active={tab === 'tips'} onPress={() => setTab('tips')} />
              <Chip label="Q&A" active={tab === 'qa'} onPress={() => setTab('qa')} />
            </View>

            {/* ── INFO ── */}
            {tab === 'info' ? (
              <View>
                <Animated.View entering={FadeInDown.duration(240)}>
                  <SpringPressable
                    haptic="light"
                    onPress={openMaps}
                    accessibilityRole="button"
                    accessibilityLabel="Open in Maps"
                    style={styles.card}
                  >
                    <View style={styles.cardRow}>
                      <Ionicons name="location-outline" size={20} color={tokens.colors.mute} />
                      <View style={styles.cardBody}>
                        <Text style={styles.cardTitle}>
                          {venue.address || `${venue.name}, ${cityLine}`}
                        </Text>
                        <Text style={styles.cardText}>Open in Maps</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={15} color={tokens.colors.muteSoft} />
                    </View>
                  </SpringPressable>
                </Animated.View>

                {/* ── All shows here · N → ── */}
                <Animated.View entering={FadeInDown.delay(20).duration(240)}>
                  <SpringPressable
                    haptic="light"
                    onPress={() =>
                      router.push({
                        pathname: '/venue/shows/[venueId]',
                        params: { venueId: id, venueName: venue.name },
                      })
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`All shows here, ${venue.totalShows} shows`}
                    style={styles.card}
                  >
                    <View style={styles.cardRow}>
                      <Ionicons name="calendar-outline" size={20} color={tokens.colors.mute} />
                      <View style={styles.cardBody}>
                        <Text style={styles.cardTitle}>All shows here</Text>
                        <Text style={styles.cardText}>Every night on the books, past and next</Text>
                      </View>
                      {venue.totalShows > 0 ? (
                        <Text style={styles.showsCount}>{venue.totalShows}</Text>
                      ) : null}
                      <Ionicons name="chevron-forward" size={15} color={tokens.colors.muteSoft} />
                    </View>
                  </SpringPressable>
                </Animated.View>

                {venue.capacity ? (
                  <Animated.View entering={FadeInDown.delay(40).duration(240)} style={styles.card}>
                    <View style={styles.cardRow}>
                      <Ionicons name="people-outline" size={20} color={tokens.colors.mute} />
                      <View style={styles.cardBody}>
                        <Text style={styles.cardText}>Capacity</Text>
                        <Text style={styles.cardMono}>{venue.capacity.toLocaleString()}</Text>
                      </View>
                    </View>
                  </Animated.View>
                ) : null}

                {/* ── TOP TIP card + ▲ upvote block ── */}
                {topTip ? (
                  <Animated.View
                    entering={FadeInDown.delay(60).duration(240)}
                    style={styles.card}
                  >
                    <Text style={styles.topTipEyebrow}>Top tip</Text>
                    <View style={styles.topTipRow}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.topTipText}>{topTip.text}</Text>
                        <Text style={styles.topTipMeta}>
                          @{topTip.user.username} · {topTip.category.toUpperCase()}
                        </Text>
                      </View>
                      <SpringPressable
                        haptic="light"
                        onPress={() => tipsState.toggleUpvote(topTip.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`Upvote tip, ${topTip.upvotes} upvotes`}
                        accessibilityState={{ selected: topTip.userUpvoted }}
                        style={styles.upvoteBlock}
                      >
                        <Ionicons
                          name="caret-up"
                          size={16}
                          color={topTip.userUpvoted ? tokens.colors.fg : tokens.colors.mute}
                        />
                        <Text
                          style={[
                            styles.upvoteCount,
                            topTip.userUpvoted
                              ? { color: tokens.colors.fg, fontFamily: tokens.fontFamilies.monoBold }
                              : null,
                          ]}
                        >
                          {topTip.upvotes}
                        </Text>
                      </SpringPressable>
                    </View>
                  </Animated.View>
                ) : null}

                {venue.ratings.totalRatings > 0 ? (
                  <Animated.View entering={FadeInDown.delay(80).duration(240)} style={styles.card}>
                    <SectionLabel>Crowd ratings</SectionLabel>
                    {RATING_ROWS.map((row) => {
                      const value = venue.ratings[row.key];
                      if (typeof value !== 'number') return null;
                      return (
                        <View key={row.key} style={styles.breakdownRow}>
                          <Text style={styles.breakdownLabel}>{row.label}</Text>
                          <View style={styles.breakdownRight}>
                            <StarRow value={value} size={11} />
                            <Text style={styles.breakdownScore}>{formatScore(value)}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </Animated.View>
                ) : null}

                {!hasPracticalInfo ? (
                  <Animated.View
                    entering={FadeInDown.delay(120).duration(240)}
                    style={styles.ctaCard}
                  >
                    <Text style={styles.cardTitle}>Know this venue?</Text>
                    <Text style={styles.cardText}>
                      We don't have practical details for this spot yet. Help the next crowd out
                      with a tip — parking, entry, where to stand.
                    </Text>
                    <PillButton
                      title="Add a tip"
                      variant="secondary"
                      springFeedback
                      haptic="light"
                      onPress={goToTipsComposer}
                    />
                  </Animated.View>
                ) : null}
              </View>
            ) : null}

            {/* ── SEAT VIEWS — bowl (C24) + section-row seat browser ── */}
            {tab === 'seats' ? (
              seatViewsState.loading && seatViewsState.seatViews.length === 0 ? (
                <View style={styles.seatGridSkeleton}>
                  <View style={{ flex: 1, gap: 8 }}>
                    <ShimmerBlock height={120} borderRadius={tokens.radius.md} />
                    <ShimmerBlock width="60%" height={11} borderRadius={6} />
                  </View>
                  <View style={{ flex: 1, gap: 8 }}>
                    <ShimmerBlock height={120} borderRadius={tokens.radius.md} />
                    <ShimmerBlock width="60%" height={11} borderRadius={6} />
                  </View>
                </View>
              ) : seatSectionsForBowl.length > 0 ? (
                <>
                  <View style={styles.seatBowlWrap}>
                    <SeatBowl sections={seatSectionsForBowl} onPressSection={setOpenSeatSection} />
                  </View>
                  <View style={styles.seatBrowser}>
                    {seatSectionsForBowl.map((sec, i) => {
                      const thumb = sec.photos[0]?.thumbnailUrl ?? sec.photos[0]?.photoUrl;
                      return (
                        <Animated.View
                          key={sec.section}
                          entering={tearIn(Math.min(i, 8) * durations.stagger)}
                        >
                          <SpringPressable
                            haptic="light"
                            onPress={() => setOpenSeatSection(sec)}
                            accessibilityRole="button"
                            accessibilityLabel={`Section ${sec.section}, ${sec.photoCount} photos`}
                            style={styles.seatRow}
                          >
                            <Image
                              source={{ uri: thumb }}
                              style={styles.seatThumb}
                              contentFit="cover"
                              transition={80}
                              cachePolicy="memory-disk"
                            />
                            <View style={styles.seatRowBody}>
                              <Text style={styles.seatRowTitle} numberOfLines={1}>
                                SEC {sec.section}
                              </Text>
                              {sec.avgRating != null && Number.isFinite(sec.avgRating) ? (
                                <View style={styles.seatRowRating}>
                                  <StarRow value={sec.avgRating} size={11} />
                                  <Text style={styles.seatRowRatingText}>
                                    {formatScore(sec.avgRating)}
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                            <Text style={styles.seatRowCount}>
                              {sec.photoCount} {sec.photoCount === 1 ? 'PHOTO' : 'PHOTOS'}
                            </Text>
                            <Ionicons
                              name="chevron-forward"
                              size={15}
                              color={tokens.colors.muteSoft}
                            />
                          </SpringPressable>
                        </Animated.View>
                      );
                    })}
                  </View>
                </>
              ) : (
                <QuietEmpty text="No seat views yet — snap the view from your seat when you log a show." />
              )
            ) : null}

            {/* ── TIPS ── */}
            {tab === 'tips' ? (
              tipsState.loading && tipsState.tips.length === 0 ? (
                <View style={{ gap: 10 }}>
                  <ShimmerBlock height={120} borderRadius={tokens.radius.lg} />
                  <ShimmerBlock height={72} borderRadius={tokens.radius.lg} />
                  <ShimmerBlock height={72} borderRadius={tokens.radius.lg} />
                </View>
              ) : (
                <TipsList
                  tips={tipsState.tips}
                  onUpvote={tipsState.toggleUpvote}
                  onAdd={tipsState.addTip}
                  autoFocusComposer={tipsAutoFocus}
                />
              )
            ) : null}

            {/* ── Q&A ── */}
            {tab === 'qa' ? (
              <QASection
                questions={qaState.questions}
                loading={qaState.loading}
                error={qaState.error}
                onAsk={qaState.askQuestion}
                onAnswer={qaState.answerQuestion}
                onToggleUpvote={qaState.toggleUpvote}
                onRetry={qaState.refresh}
              />
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <SeatSectionSheet section={openSeatSection} onClose={() => setOpenSeatSection(null)} />
    </View>
  );
}
