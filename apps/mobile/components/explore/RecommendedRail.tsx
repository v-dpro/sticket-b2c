// RecommendedRail — "FOR YOU", a horizontal rail of upcoming shows by artists
// the viewer actually listens to (Spotify top artists) or follows. Each card is
// a show poster + artist + date/venue + a CONCRETE reason chip ("YOU LISTEN" /
// "YOU FOLLOW") — never a vague "recommended for you". Tap → the event page.
//
// This is the taste-driven beat of the C14 stream; sits after the trending hero.

import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

import type { ExploreRecommended } from '../../lib/api/explore';
import { monoDate } from './format';
import { useThemedStyles } from '../../lib/theme-context';
import { SpringPressable } from '../ui/SpringPressable';

type RecommendedRailProps = { items: ExploreRecommended[] };

export function RecommendedRail({ items }: RecommendedRailProps) {
  const router = useRouter();
  const styles = useStyles();

  if (items.length === 0) return null;

  return (
    <View>
      <View style={styles.head}>
        <Text style={styles.sectionTitle}>For you</Text>
        <Text style={styles.eyebrow}>Shows from your Spotify</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
        decelerationRate="fast"
        snapToInterval={216}
        snapToAlignment="start"
      >
        {items.map((it) => (
          <RecommendedCard key={it.eventId} item={it} styles={styles} router={router} />
        ))}
      </ScrollView>
    </View>
  );
}

type CardProps = {
  item: ExploreRecommended;
  styles: ReturnType<typeof useStyles>;
  router: ReturnType<typeof useRouter>;
};

function RecommendedCard({ item, styles, router }: CardProps) {
  const media = item.imageUrl || item.artistImageUrl || undefined;
  const reason = item.reason === 'follow' ? 'You follow' : 'You listen';
  const meta = [monoDate(item.date), item.venueCity].filter(Boolean).join(' · ');

  return (
    <SpringPressable
      haptic="light"
      onPress={() => router.push(`/event/${item.eventId}`)}
      accessibilityRole="button"
      accessibilityLabel={`${item.artistName} at ${item.venueName}, ${reason}`}
      style={styles.card}
    >
      <View style={styles.media}>
        {media ? (
          <Image source={{ uri: media }} style={styles.img} contentFit="cover" transition={160} />
        ) : (
          <View style={[styles.img, styles.imgFallback]}>
            <Text style={styles.imgInitial}>{item.artistName.slice(0, 1).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.reasonChip}>
          <Text style={styles.reasonText}>{reason}</Text>
        </View>
      </View>
      <View style={styles.body}>
        {/* Artist + venue are their own tap targets → their pages; the rest of
            the card opens the event. (Text onPress wins the touch over the
            parent Pressable, so taps don't double-fire.) */}
        <Text
          style={styles.title}
          numberOfLines={1}
          suppressHighlighting
          onPress={() => router.push(`/artist/${item.artistId}`)}
        >
          {item.artistName}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {meta}
        </Text>
        <Text
          style={styles.venue}
          numberOfLines={1}
          suppressHighlighting
          onPress={() => router.push(`/venue/${item.venueId}`)}
        >
          {item.venueName}
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
    },
    rail: { paddingHorizontal: t.density.pad, gap: 12 },
    card: {
      width: 204,
      borderRadius: t.radius.card,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      backgroundColor: t.colors.card,
      overflow: 'hidden',
    },
    media: { width: '100%', height: 132, backgroundColor: t.colors.card2 },
    img: { width: '100%', height: '100%' },
    imgFallback: { alignItems: 'center', justifyContent: 'center' },
    imgInitial: { fontSize: 34, fontWeight: '800', color: t.colors.muteSoft },
    reasonChip: {
      position: 'absolute',
      top: 8,
      left: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: t.radius.chip,
      backgroundColor: 'rgba(0,0,0,0.62)',
    },
    reasonText: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 9,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: '#FFFFFF',
    },
    body: { paddingHorizontal: 12, paddingVertical: 11, gap: 3 },
    title: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2, color: t.colors.fg },
    meta: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 11,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      color: t.colors.text,
    },
    venue: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
    },
  }));
}
