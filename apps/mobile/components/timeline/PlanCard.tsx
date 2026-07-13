// PlanCard — an upcoming plan (ticket / interested / tracking) above the
// Today divider. PLANS ARE NOT STUBS (C3): a DASHED tokens.colors.dash
// border — the memory isn't real yet, so no notches, no perforation.
// Two bodies: the compact text row (profile timelines), and — when the
// deck passes `photoAspect` and cover art exists — a full PHOTO card
// (event ?? tour ?? artist image) so every night on the wheel has a
// picture. Countdown rides top-right like a score; dashed border stays.

import React from 'react';
import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import type { TimelineUpcomingItem } from '../../lib/api/timeline';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { SpringPressable } from '../ui/SpringPressable';
import { countdownLabel, daysUntil, formatShortDate } from './format';

type PlanCardProps = {
  item: TimelineUpcomingItem;
  onPress: () => void;
  /** Deck-provided: render the full photo body at this width/height ratio. */
  photoAspect?: number;
};

const INTENT_LABEL: Record<TimelineUpcomingItem['type'], string | null> = {
  ticket: null, // tickets are the default plan — no eyebrow noise
  interested: 'INTERESTED',
  tracking: 'TRACKING',
  party: 'PARTY',
};

/** The party line under a plan: "PARTY · 11 GOING · REQUEST TO JOIN". */
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

export function PlanCard({ item, onPress, photoAspect }: PlanCardProps) {
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    card: {
      backgroundColor: t.colors.card,
      borderRadius: t.radius.card, // 16
      // Dashed = planned, not yet lived (C3). The dedicated dash token
      // reads clearly against both card fills.
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: t.colors.dash,
      paddingHorizontal: t.density.cardPad,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    intent: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 9,
      fontWeight: '600',
      letterSpacing: 1.5,
      color: t.colors.muteSoft,
      marginBottom: 3,
    },
    name: {
      fontSize: 17,
      fontWeight: '700',
      color: t.colors.fg,
    },
    meta: {
      fontFamily: t.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 10.5,
      fontWeight: '600',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
      marginTop: 4,
    },
    countdown: {
      fontFamily: t.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    // ── Photo body (deck) ──
    photoCard: {
      borderRadius: t.radius.card,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: t.colors.dash,
      overflow: 'hidden',
      backgroundColor: t.colors.card,
    },
    photo: { width: '100%', height: '100%' },
    photoScrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' },
    photoOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      justifyContent: 'space-between',
      padding: 18,
    },
    photoCountdown: {
      fontFamily: t.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 24,
      fontWeight: '700',
      letterSpacing: 1,
      color: '#FFFFFF',
      textAlign: 'right',
    },
    photoName: { fontSize: 24, fontWeight: '800', letterSpacing: -0.4, color: '#FFFFFF' },
    photoMeta: {
      fontFamily: t.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 10.5,
      fontWeight: '600',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.72)',
      marginTop: 5,
    },
  }));

  const intent = INTENT_LABEL[item.type];
  const isToday = daysUntil(item.date) === 0;

  if (photoAspect && item.event.imageUrl) {
    const metaBits = [item.event.venue.name, formatShortDate(item.event.date)];
    return (
      <SpringPressable
        onPress={onPress}
        haptic="light"
        accessibilityRole="button"
        accessibilityLabel={`${item.event.name}, ${countdownLabel(item.date)}`}
        style={styles.photoCard}
      >
        <View style={{ aspectRatio: photoAspect }}>
          <Image
            source={{ uri: item.event.imageUrl }}
            style={styles.photo}
            contentFit="cover"
            transition={80}
            cachePolicy="memory-disk"
            recyclingKey={item.id}
          />
          <LinearGradient
            colors={['rgba(11,11,16,0)', 'rgba(11,11,16,0.88)']}
            style={styles.photoScrim}
            pointerEvents="none"
          />
          <View style={styles.photoOverlay} pointerEvents="none">
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[styles.intent, { color: 'rgba(255,255,255,0.72)' }]}>
                {intent ?? 'TICKETED'}
              </Text>
              <Text style={styles.photoCountdown}>{isToday ? 'TONIGHT' : countdownLabel(item.date)}</Text>
            </View>
            <View>
              <Text style={styles.photoName} numberOfLines={2}>
                {item.event.name}
              </Text>
              <Text style={styles.photoMeta} numberOfLines={1}>
                {metaBits.filter(Boolean).join(' · ')}
              </Text>
              {item.party ? (
                <Text style={[styles.photoMeta, { color: '#FFFFFF' }]} numberOfLines={1}>
                  {partyLine(item.party)}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      </SpringPressable>
    );
  }

  return (
    <SpringPressable
      onPress={onPress}
      haptic="light"
      accessibilityRole="button"
      accessibilityLabel={`${item.event.name}, ${countdownLabel(item.date)}`}
      style={styles.card}
    >
      <View style={{ flex: 1 }}>
        {intent ? <Text style={styles.intent}>{intent}</Text> : null}
        <Text style={styles.name} numberOfLines={2}>
          {item.event.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {item.event.venue.name} · {formatShortDate(item.event.date)}
        </Text>
        {item.party ? (
          <Text style={[styles.meta, { color: tokens.colors.fg }]} numberOfLines={1}>
            {partyLine(item.party)}
          </Text>
        ) : null}
      </View>
      <Text
        style={[
          styles.countdown,
          // "today" is the active state — weight, not hue (C1: accent = ink).
          { color: isToday ? tokens.colors.accent : tokens.colors.fg, fontWeight: isToday ? '800' : '600' },
        ]}
      >
        {countdownLabel(item.date)}
      </Text>
    </SpringPressable>
  );
}
