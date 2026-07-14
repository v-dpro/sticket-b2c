// PresaleRail — presales as a HORIZONTAL, swipeable rail of poster cards
// (C14: the utility rail beat). One band instead of a screen-filling list:
// each card is an artist photo + name + city + a close-countdown that ticks
// (HH:MM:SS) in the final day. Imminent cards (closing < 24h) carry an fg
// border so urgency reads at a glance. Tap → presale detail.
//
// Compliance: a presale CODE is never rendered — the API never sends one.

import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

import type { ExplorePresale } from '../../lib/api/explore';
import { useThemedStyles } from '../../lib/theme-context';
import { SpringPressable } from '../ui/SpringPressable';
import { presaleClose } from './format';

const MAX_CARDS = 10;

/** Re-render every second only while something is actually ticking (< 24h). */
function useNow(ticking: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!ticking) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [ticking]);
  return now;
}

type PresaleRailProps = { presales: ExplorePresale[] };

export function PresaleRail({ presales }: PresaleRailProps) {
  const router = useRouter();
  const styles = useStyles();

  const cards = useMemo(() => {
    const end = (p: ExplorePresale) => (p.presaleEnd ? new Date(p.presaleEnd).getTime() : Infinity);
    return [...presales].sort((a, b) => end(a) - end(b)).slice(0, MAX_CARDS);
  }, [presales]);

  const anyTicking = useMemo(
    () => cards.some((p) => p.presaleEnd && new Date(p.presaleEnd).getTime() - Date.now() < 86400000),
    [cards],
  );
  const now = useNow(anyTicking);

  if (presales.length === 0) return null;

  return (
    <View>
      <View style={styles.head}>
        <View>
          <Text style={styles.sectionTitle}>Presales</Text>
          <Text style={styles.eyebrow}>Live now · closing soonest</Text>
        </View>
        <SpringPressable
          haptic="light"
          onPress={() => router.push('/presales')}
          accessibilityRole="button"
          accessibilityLabel="All presales"
        >
          <Text style={styles.link}>All</Text>
        </SpringPressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
        decelerationRate="fast"
        snapToInterval={188}
        snapToAlignment="start"
      >
        {cards.map((p) => (
          <PresaleCard key={p.id} presale={p} styles={styles} router={router} now={now} />
        ))}
      </ScrollView>
    </View>
  );
}

type CardProps = {
  presale: ExplorePresale;
  styles: ReturnType<typeof useStyles>;
  router: ReturnType<typeof useRouter>;
  now: number;
};

function PresaleCard({ presale, styles, router, now }: CardProps) {
  const close = presaleClose(presale.presaleEnd, now);

  return (
    <SpringPressable
      haptic="light"
      onPress={() => router.push(`/presales/${presale.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${presale.artistName} presale, ${close.eyebrow} ${close.value}`}
      style={[styles.card, close.ticking && styles.cardImminent]}
    >
      <View style={styles.media}>
        {presale.artistImageUrl ? (
          <Image source={{ uri: presale.artistImageUrl }} style={styles.img} contentFit="cover" transition={160} />
        ) : (
          <View style={[styles.img, styles.imgFallback]}>
            <Text style={styles.imgInitial}>{presale.artistName.slice(0, 1).toUpperCase()}</Text>
          </View>
        )}
      </View>
      <View style={styles.body}>
        {/* Artist name jumps to the artist page; the rest of the card opens the
            presale. Text onPress wins the touch, so taps don't double-fire. */}
        <Text
          style={styles.title}
          numberOfLines={1}
          suppressHighlighting
          onPress={presale.artistId ? () => router.push(`/artist/${presale.artistId}`) : undefined}
        >
          {presale.artistName}
        </Text>
        <Text style={styles.city} numberOfLines={1}>
          {presale.venueCity}
        </Text>
        <View style={styles.closeRow}>
          <Text style={[styles.closeEyebrow, close.imminent && styles.closeEyebrowOn]}>{close.eyebrow}</Text>
          <Text
            style={[styles.closeValue, close.imminent && styles.closeValueOn, close.ticking && styles.closeTicking]}
            numberOfLines={1}
          >
            {close.value}
          </Text>
        </View>
      </View>
    </SpringPressable>
  );
}

function useStyles() {
  return useThemedStyles((t) => ({
    head: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingHorizontal: t.density.pad,
      marginBottom: 12,
    },
    sectionTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4, color: t.colors.fg },
    eyebrow: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 10.5,
      fontWeight: '600',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
      marginTop: 2,
    },
    link: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 11,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.mute,
    },
    rail: { paddingHorizontal: t.density.pad, gap: 12 },
    card: {
      width: 176,
      borderRadius: t.radius.card,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      backgroundColor: t.colors.card,
      overflow: 'hidden',
    },
    cardImminent: { borderWidth: 1.5, borderColor: t.colors.fg },
    media: { width: '100%', height: 120, backgroundColor: t.colors.card2 },
    img: { width: '100%', height: '100%' },
    imgFallback: { alignItems: 'center', justifyContent: 'center' },
    imgInitial: { fontSize: 30, fontWeight: '800', color: t.colors.muteSoft },
    body: { paddingHorizontal: 12, paddingVertical: 11, gap: 3 },
    title: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2, color: t.colors.fg },
    city: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
    },
    closeRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 },
    closeEyebrow: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 8.5,
      letterSpacing: 1,
      color: t.colors.muteSoft,
    },
    closeEyebrowOn: { color: t.colors.mute },
    closeValue: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 13,
      letterSpacing: 0.3,
      color: t.colors.text,
    },
    closeValueOn: { color: t.colors.fg, fontWeight: '700' },
    closeTicking: { fontFamily: t.fontFamilies.monoBold, letterSpacing: 0.5 },
  }));
}
