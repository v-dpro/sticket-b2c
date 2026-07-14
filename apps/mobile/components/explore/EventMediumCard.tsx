// EventMediumCard — the medium trending-event row that closes the stanza
// (C14): image left 72px, mono date, name 15/700, venue mono, small
// DegreeFacepile. Plain card (C3). Tap → /event/[id].

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

import type { ExploreTrendingEvent } from '../../lib/api/explore';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { DegreeFacepile } from '../ui/DegreeFacepile';
import { SpringPressable } from '../ui/SpringPressable';
import { monoDate } from './format';

type EventMediumCardProps = {
  event: ExploreTrendingEvent;
};

export function EventMediumCard({ event }: EventMediumCardProps) {
  const router = useRouter();
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    card: {
      marginHorizontal: t.density.pad,
      marginBottom: 8,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderRadius: t.radius.card,
      backgroundColor: t.colors.card,
      borderWidth: 1,
      borderColor: t.colors.hairline,
    },
    image: {
      width: 72,
      height: 72,
      borderRadius: t.radius.md,
      backgroundColor: t.colors.card2,
    },
    imageFallback: { alignItems: 'center', justifyContent: 'center' },
    body: { flex: 1, minWidth: 0, gap: 3 },
    date: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
    },
    name: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2, color: t.colors.fg },
    venue: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
    },
  }));

  const imageUrl = event.imageUrl ?? event.artist.imageUrl;

  return (
    <SpringPressable
      haptic="light"
      onPress={() => router.push(`/event/${event.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${event.artist.name} at ${event.venue.name}, ${monoDate(event.date)}`}
      style={styles.card}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          contentFit="cover"
          transition={80}
          cachePolicy="memory-disk"
          recyclingKey={event.id}
        />
      ) : (
        <View style={[styles.image, styles.imageFallback]}>
          <Ionicons name="musical-notes-outline" size={22} color={tokens.colors.mute} />
        </View>
      )}
      <View style={styles.body}>
        <Text style={styles.date} numberOfLines={1}>
          {monoDate(event.date)}
        </Text>
        <Text
          style={styles.name}
          numberOfLines={1}
          suppressHighlighting
          onPress={event.artist.id ? () => router.push(`/artist/${event.artist.id}`) : undefined}
        >
          {event.artist.name || event.name}
        </Text>
        <Text
          style={styles.venue}
          numberOfLines={1}
          suppressHighlighting
          onPress={event.venue.id ? () => router.push(`/venue/${event.venue.id}`) : undefined}
        >
          {[event.venue.name, event.venue.city].filter(Boolean).join(' · ')}
        </Text>
      </View>
      {event.friendsWent.length > 0 ? (
        <DegreeFacepile
          people={event.friendsWent}
          size={20}
          max={3}
          surfaceColor={tokens.colors.card}
        />
      ) : null}
    </SpringPressable>
  );
}
