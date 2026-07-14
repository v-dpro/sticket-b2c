// PresalesSection — the star of the planning hub. Presales grouped into
// THIS WEEK / UPCOMING, each an INFORMATIONAL row: artist (+ tour), the
// presale NAME, the exact WINDOW in mono, the general ON-SALE date, the show
// line (venue · city · date), and a Get tickets / Sign up CTA. Imminent
// (live or <48h) rows carry an fg border + live/countdown chip.
//
// Compliance: a presale CODE is never rendered — the API never sends one, and
// there is no copy-code affordance anywhere on this surface.

import React, { useMemo } from 'react';
import { Linking, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import type { ExplorePresale } from '../../lib/api/explore';
import { haptics } from '../../lib/motion';
import { buildTicketLink } from '../../lib/tickets/affiliate';
import { useThemedStyles } from '../../lib/theme-context';
import { PillButton } from '../ui/PillButton';
import { SpringPressable } from '../ui/SpringPressable';
import { onsaleLine, presaleCountdown, presaleTiming, showLine } from './format';

const WEEK_MS = 7 * 86400000;
const IMMINENT_MS = 48 * 3600000;

type PresalesSectionProps = {
  presales: ExplorePresale[];
};

export function PresalesSection({ presales }: PresalesSectionProps) {
  const router = useRouter();
  const styles = useStyles();

  const { thisWeek, upcoming } = useMemo(() => {
    const now = Date.now();
    const weekOut = now + WEEK_MS;
    const sorted = [...presales].sort(
      (a, b) => new Date(a.presaleStart).getTime() - new Date(b.presaleStart).getTime(),
    );
    const week: ExplorePresale[] = [];
    const later: ExplorePresale[] = [];
    for (const p of sorted) {
      const start = new Date(p.presaleStart).getTime();
      if (Number.isNaN(start) || start <= weekOut) week.push(p);
      else later.push(p);
    }
    return { thisWeek: week, upcoming: later };
  }, [presales]);

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

      {thisWeek.length > 0 ? (
        <>
          <Text style={styles.groupLabel}>This week</Text>
          {thisWeek.map((p) => (
            <PresaleRow key={p.id} presale={p} styles={styles} router={router} />
          ))}
        </>
      ) : null}

      {upcoming.length > 0 ? (
        <>
          <Text style={[styles.groupLabel, styles.groupLabelSpaced]}>Upcoming</Text>
          {upcoming.map((p) => (
            <PresaleRow key={p.id} presale={p} styles={styles} router={router} />
          ))}
        </>
      ) : null}
    </View>
  );
}

type RowProps = {
  presale: ExplorePresale;
  styles: ReturnType<typeof useStyles>;
  router: ReturnType<typeof useRouter>;
};

function PresaleRow({ presale, styles, router }: RowProps) {
  const start = new Date(presale.presaleStart).getTime();
  const countdown = presaleCountdown(presale.presaleStart);
  const isLive = countdown === 'LIVE';
  const imminent = isLive || (!Number.isNaN(start) && start - Date.now() < IMMINENT_MS);

  const window = presaleTiming(presale.presaleStart, presale.presaleEnd);
  const onsale = onsaleLine(presale.onsaleStart);
  const show = showLine(presale.venueName, presale.venueCity, presale.eventDate);
  // TM presale names often carry a trailing "Onsale"/"Presale" ("VIP Packages
  // Onsale") — strip it so we don't render "VIP Packages Onsale presale".
  const type = `${presale.presaleType.replace(/\s*(on\s*sale|pre\s*sale)\s*$/i, '').trim()} presale`;

  // CTA: ticket link (affiliate-wrapped) → signup link → presale detail.
  const hasTicket = Boolean(presale.ticketUrl);
  const hasSignup = !hasTicket && Boolean(presale.signupUrl);
  const ctaLabel = hasTicket ? 'Get tickets' : hasSignup ? 'Sign up' : 'Details';

  const openCta = () => {
    haptics.light();
    if (presale.ticketUrl) {
      const url = buildTicketLink('ticketmaster', {
        query: `${presale.artistName} ${presale.venueCity}`,
        directUrl: presale.ticketUrl,
      });
      void Linking.openURL(url).catch(() => router.push(`/presales/${presale.id}`));
    } else if (presale.signupUrl) {
      void Linking.openURL(presale.signupUrl).catch(() => router.push(`/presales/${presale.id}`));
    } else {
      router.push(`/presales/${presale.id}`);
    }
  };

  return (
    <View style={[styles.row, imminent && styles.rowImminent]}>
      <SpringPressable
        haptic="light"
        onPress={() => router.push(`/presales/${presale.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`${presale.artistName} ${presale.presaleType} presale, ${window}`}
        style={styles.rowTop}
      >
        <View style={styles.rowBody}>
          <Text style={styles.title} numberOfLines={1}>
            {presale.artistName}
            {presale.tourName ? ` — ${presale.tourName}` : ''}
          </Text>
          <Text style={styles.type} numberOfLines={1}>
            {type}
          </Text>
          <Text style={styles.window} numberOfLines={1}>
            {window}
          </Text>
          {onsale ? (
            <Text style={styles.subMono} numberOfLines={1}>
              {onsale}
            </Text>
          ) : null}
          {show ? (
            <Text style={styles.subMono} numberOfLines={1}>
              {show}
            </Text>
          ) : null}
        </View>
        {isLive ? (
          <View style={styles.liveChip}>
            <Text style={styles.liveChipText}>LIVE</Text>
          </View>
        ) : (
          <Text style={styles.countdown}>{countdown}</Text>
        )}
      </SpringPressable>
      <View style={styles.actions}>
        <View style={{ flex: 1 }} />
        <PillButton
          title={ctaLabel}
          variant={imminent ? 'primary' : 'secondary'}
          size="sm"
          springFeedback
          haptic="none"
          onPress={openCta}
        />
      </View>
    </View>
  );
}

function useStyles() {
  return useThemedStyles((t) => ({
    head: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      paddingHorizontal: t.density.pad,
      marginBottom: 4,
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
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
      paddingHorizontal: t.density.pad,
      marginTop: 10,
      marginBottom: 8,
    },
    groupLabelSpaced: { marginTop: 18 },
    row: {
      marginHorizontal: t.density.pad,
      marginBottom: 10,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 12,
      borderRadius: t.radius.card,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      backgroundColor: t.colors.card,
      gap: 10,
    },
    rowImminent: { borderWidth: 1.5, borderColor: t.colors.fg },
    rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    rowBody: { flex: 1, minWidth: 0, gap: 3 },
    title: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2, color: t.colors.fg },
    type: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: t.colors.mute,
    },
    window: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 12,
      letterSpacing: 0.3,
      color: t.colors.text,
      marginTop: 1,
    },
    subMono: {
      fontFamily: t.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 10.5,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
    },
    countdown: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 11,
      letterSpacing: 0.5,
      color: t.colors.fg,
    },
    liveChip: {
      alignItems: 'center',
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: t.radius.sm,
      backgroundColor: t.colors.inverseBg,
    },
    liveChipText: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 10,
      letterSpacing: 0.5,
      color: t.colors.inverseFg,
    },
    actions: { flexDirection: 'row', alignItems: 'center' },
  }));
}
