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
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { EntityNav } from '../../components/entity/EntityChrome';
import { Chip, SectionLabel, StarRow } from '../../components/entity/EntityBits';
import {
  EntityError,
  EntityPageSkeleton,
  ShimmerBlock,
} from '../../components/entity/EntityStates';
import { formatScore } from '../../components/entity/format';
import { SeatViewsGrid } from '../../components/entity/SeatViewsGrid';
import { TipsList } from '../../components/entity/TipsList';
import { QASection } from '../../components/venue-qa/QASection';
import { PillButton } from '../../components/ui/PillButton';
import { SpringPressable } from '../../components/ui/SpringPressable';

import { useSeatViews } from '../../hooks/useSeatViews';
import { useVenue } from '../../hooks/useVenue';
import { useVenueQuestions } from '../../hooks/useVenueQuestions';
import { useVenueTips } from '../../hooks/useVenueTips';
import { haptics } from '../../lib/motion';
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

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetch(), seatViewsState.refresh(), tipsState.refresh(), qaState.refresh()]);
    } finally {
      setRefreshing(false);
    }
  };

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
            {/* ── Header ── */}
            <Text style={styles.name}>{venue.name}</Text>
            <Text style={styles.metaLine}>
              {cityLine}
              {venue.capacity ? ` · CAP ${venue.capacity.toLocaleString()}` : ''}
            </Text>
            {overallRating != null ? (
              <View style={styles.ratingRow}>
                <StarRow value={overallRating} />
                <Text style={styles.ratingCount}>
                  {formatScore(overallRating)} ({venue.ratings.totalRatings})
                </Text>
              </View>
            ) : (
              <Text style={styles.noRatings}>No ratings yet</Text>
            )}

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

            {/* ── SEAT VIEWS ── */}
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
              ) : (
                <SeatViewsGrid seatViews={seatViewsState.seatViews} />
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
    </View>
  );
}
