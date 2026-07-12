// VenueSpotlightCard — the full-width VENUE card of the stanza (C14).
// Intel-first, no hero media: StripeField ticket-stock texture behind
// name 20/800, city mono, and "N UPCOMING" mono; a small photo thumb
// rides right when the venue has one. Plain card (C3). Tap → /venue/[id].

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

import type { ExploreVenue } from '../../lib/api/explore';
import { useThemedStyles } from '../../lib/theme-context';
import { SpringPressable } from '../ui/SpringPressable';
import { StripeField } from '../ui/Stub';

type VenueSpotlightCardProps = {
  venue: ExploreVenue;
};

export function VenueSpotlightCard({ venue }: VenueSpotlightCardProps) {
  const router = useRouter();
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
    inner: {
      padding: t.density.cardPad,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    body: { flex: 1, minWidth: 0, gap: 5 },
    eyebrow: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 9,
      fontWeight: '600',
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
    },
    name: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4, color: t.colors.fg },
    meta: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 10.5,
      fontWeight: '600',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
    },
    thumb: {
      width: 64,
      height: 64,
      borderRadius: t.radius.md,
      backgroundColor: t.colors.card2,
    },
  }));

  const meta = [venue.city, `${venue.eventCount} UPCOMING`].filter(Boolean).join(' · ');

  return (
    <SpringPressable
      haptic="light"
      onPress={() => router.push(`/venue/${venue.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${venue.name}, ${venue.city}, ${venue.eventCount} upcoming shows`}
      style={styles.card}
    >
      <StripeField />
      <View style={styles.inner}>
        <View style={styles.body}>
          <Text style={styles.eyebrow}>Venue spotlight</Text>
          <Text style={styles.name} numberOfLines={1}>
            {venue.name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        </View>
        {venue.imageUrl ? (
          <Image
            source={{ uri: venue.imageUrl }}
            style={styles.thumb}
            contentFit="cover"
            transition={80}
            cachePolicy="memory-disk"
            recyclingKey={venue.id}
          />
        ) : null}
      </View>
    </SpringPressable>
  );
}
