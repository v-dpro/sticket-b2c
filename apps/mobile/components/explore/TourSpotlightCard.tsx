// TourSpotlightCard — the full-width TOUR spotlight of the stanza (C14).
// Media (photo or StripeField stock), tour name 20/800, mono stats line
// ("OLIVIA RODRIGO · 12 SHOWS · AVG 8.4"), DegreeFacepile + concrete mono
// caption. The explore payload carries no tour crowd photos, so the crowd
// strip is skipped per spec. Plain card (C3). Tap → /tour/[id].

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

import type { ExploreSpotlightTour } from '../../lib/api/explore';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { formatScore } from '../timeline/format';
import { DegreeFacepile } from '../ui/DegreeFacepile';
import { SpringPressable } from '../ui/SpringPressable';
import { StripeField } from '../ui/Stub';
import { crowdCaption } from './format';

const OVERLAY_MUTE = '#C9C9D4';

type TourSpotlightCardProps = {
  tour: ExploreSpotlightTour;
};

export function TourSpotlightCard({ tour }: TourSpotlightCardProps) {
  const router = useRouter();
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    card: {
      marginHorizontal: t.density.pad,
      borderRadius: t.radius.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.hairline,
      backgroundColor: t.colors.card,
      overflow: 'hidden',
      ...t.shadows.card,
    },
    media: {
      width: '100%',
      aspectRatio: 2.1,
      backgroundColor: t.colors.card2,
    },
    photo: { ...StyleSheet.absoluteFillObject },
    eyebrowWrap: { position: 'absolute', top: 12, left: 14 },
    eyebrow: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 9,
      fontWeight: '600',
      letterSpacing: 1.4,
      textTransform: 'uppercase',
    },
    body: { padding: t.density.cardPad, gap: 6 },
    title: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4, color: t.colors.fg },
    stats: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 10.5,
      fontWeight: '600',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
    },
    footer: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
    caption: {
      flex: 1,
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.mute,
    },
  }));

  const hasPhoto = Boolean(tour.imageUrl);
  const stats = [
    tour.artistName,
    `${tour.eventCount} ${tour.eventCount === 1 ? 'SHOW' : 'SHOWS'}`,
    typeof tour.avgScore === 'number' ? `AVG ${formatScore(tour.avgScore)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const caption = crowdCaption(tour.friendsWent, 'WENT');

  return (
    <SpringPressable
      haptic="light"
      onPress={() => router.push(`/tour/${tour.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${tour.name} by ${tour.artistName}, tour spotlight`}
      style={styles.card}
    >
      <View style={styles.media}>
        {hasPhoto ? (
          <Image
            source={{ uri: tour.imageUrl! }}
            style={styles.photo}
            contentFit="cover"
            transition={80}
            cachePolicy="memory-disk"
            recyclingKey={tour.id}
          />
        ) : (
          <StripeField />
        )}
        <View style={styles.eyebrowWrap} pointerEvents="none">
          <Text style={[styles.eyebrow, { color: hasPhoto ? OVERLAY_MUTE : tokens.colors.muteSoft }]}>
            Tour spotlight
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {tour.name}
        </Text>
        <Text style={styles.stats} numberOfLines={1}>
          {stats}
        </Text>
        {tour.friendsWent.length > 0 ? (
          <View style={styles.footer}>
            <DegreeFacepile people={tour.friendsWent} size={24} surfaceColor={tokens.colors.card} />
            {caption ? (
              <Text style={styles.caption} numberOfLines={1}>
                {caption}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </SpringPressable>
  );
}
