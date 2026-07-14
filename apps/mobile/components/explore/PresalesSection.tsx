// PresalesSection — the star of the planning hub. Per the design system
// (Explore: "PRESALES THIS WEEK (bordered list)", compact rows): a dense
// bordered LIST, not tall cards. Each row is one artist — a recognition
// thumbnail, the artist + presale type + venue city, and a RIGHT-rail close
// readout that counts down to the window closing (ticking HH:MM:SS in the last
// day). Imminent rows (closing < 3 days) carry an fg border so urgency reads at
// a glance instead of every card looking identical. Sorted soonest-closing
// first; tap a row for the full presale detail (where Get tickets lives).
//
// Compliance: a presale CODE is never rendered — the API never sends one.

import React, { useEffect, useMemo, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import type { ExplorePresale } from '../../lib/api/explore';
import { useThemedStyles } from '../../lib/theme-context';
import { SpringPressable } from '../ui/SpringPressable';
import { presaleClose } from './format';

// A TIGHT set on the hub — presales are one beat in a big/small stream, not a
// wall that buries the trending hero and event cards below. "All" opens the
// full per-show list.
const MAX_ROWS = 3;

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

type PresalesSectionProps = {
  presales: ExplorePresale[];
};

export function PresalesSection({ presales }: PresalesSectionProps) {
  const router = useRouter();
  const styles = useStyles();

  const rows = useMemo(() => {
    const end = (p: ExplorePresale) => (p.presaleEnd ? new Date(p.presaleEnd).getTime() : Infinity);
    return [...presales].sort((a, b) => end(a) - end(b)).slice(0, MAX_ROWS);
  }, [presales]);

  // Only spin a 1s timer if a shown row closes within the day.
  const anyTicking = useMemo(
    () => rows.some((p) => p.presaleEnd && new Date(p.presaleEnd).getTime() - Date.now() < 86400000),
    [rows],
  );
  const now = useNow(anyTicking);

  if (presales.length === 0) return null;

  return (
    <View>
      <View style={styles.head}>
        <Text style={styles.sectionTitle}>Presales</Text>
        <SpringPressable
          haptic="light"
          onPress={() => router.push('/presales')}
          accessibilityRole="button"
          accessibilityLabel="All presales"
        >
          <Text style={styles.link}>All</Text>
        </SpringPressable>
      </View>
      <Text style={styles.groupLabel}>Live now · closing soonest</Text>

      <View style={styles.list}>
        {rows.map((p) => (
          <PresaleRow key={p.id} presale={p} styles={styles} router={router} now={now} />
        ))}
      </View>
    </View>
  );
}

type RowProps = {
  presale: ExplorePresale;
  styles: ReturnType<typeof useStyles>;
  router: ReturnType<typeof useRouter>;
  now: number;
};

function PresaleRow({ presale, styles, router, now }: RowProps) {
  const close = presaleClose(presale.presaleEnd, now);
  // TM presale names often trail with "Onsale"/"Presale"; strip so the subline
  // reads "OFFICIAL PLATINUM · LAS VEGAS", not "…Onsale presale · Las Vegas".
  const type = presale.presaleType.replace(/\s*(on\s*sale|pre\s*sale)\s*$/i, '').trim();
  // City leads — for a planning app the location is the datum that must never
  // truncate away; the (often long) presale type trails and clips gracefully.
  const sub = [presale.venueCity, type].filter(Boolean).join(' · ');

  return (
    <SpringPressable
      haptic="light"
      onPress={() => router.push(`/presales/${presale.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${presale.artistName} presale, ${close.eyebrow} ${close.value}`}
      style={[styles.row, close.ticking && styles.rowImminent]}
    >
      {presale.artistImageUrl ? (
        <Image source={{ uri: presale.artistImageUrl }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]}>
          <Text style={styles.thumbInitial}>{presale.artistName.slice(0, 1).toUpperCase()}</Text>
        </View>
      )}

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {presale.artistName}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {sub}
        </Text>
      </View>

      <View style={styles.right}>
        <Text style={[styles.eyebrow, close.imminent && styles.eyebrowImminent]}>{close.eyebrow}</Text>
        <Text
          style={[styles.value, close.imminent && styles.valueImminent, close.ticking && styles.valueTicking]}
          numberOfLines={1}
        >
          {close.value}
        </Text>
      </View>
    </SpringPressable>
  );
}

function useStyles() {
  return useThemedStyles((t) => ({
    head: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      paddingHorizontal: t.density.pad,
      marginBottom: 2,
    },
    sectionTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4, color: t.colors.fg },
    link: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 11,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.mute,
    },
    groupLabel: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 10.5,
      fontWeight: '600',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
      paddingHorizontal: t.density.pad,
      marginBottom: 10,
    },
    list: { paddingHorizontal: t.density.pad, gap: 8 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: t.radius.card,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      backgroundColor: t.colors.card,
    },
    rowImminent: { borderWidth: 1.5, borderColor: t.colors.fg },
    thumb: { width: 48, height: 48, borderRadius: 10, backgroundColor: t.colors.card2 },
    thumbFallback: { alignItems: 'center', justifyContent: 'center' },
    thumbInitial: { fontSize: 18, fontWeight: '800', color: t.colors.muteSoft },
    body: { flex: 1, minWidth: 0, gap: 3 },
    title: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2, color: t.colors.fg },
    sub: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10.5,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
    },
    right: { alignItems: 'flex-end', gap: 2, minWidth: 74 },
    eyebrow: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 8.5,
      letterSpacing: 1,
      color: t.colors.muteSoft,
    },
    eyebrowImminent: { color: t.colors.mute },
    value: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 13,
      letterSpacing: 0.3,
      color: t.colors.text,
    },
    valueImminent: { color: t.colors.fg, fontWeight: '700' },
    valueTicking: { fontFamily: t.fontFamilies.monoBold, letterSpacing: 0.5 },
  }));
}
