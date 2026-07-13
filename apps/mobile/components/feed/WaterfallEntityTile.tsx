// WaterfallEntityTile — compact discovery tiles woven into the feed
// waterfall (C22), one per 5-6 crowd tiles. Rendered straight from the
// explore payload (lib/api/explore). Plain card, no stub construction —
// C3: entities aren't something you attended. Media block (or a big
// initial), kind eyebrow, name, one mono meta line; taps route to the
// entity screen.

import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';

import type {
  ExploreRisingArtist,
  ExploreSpotlightTour,
  ExploreTrendingEvent,
  ExploreVenue,
} from '../../lib/api/explore';
import type { ThemeTokens } from '../../lib/theme';
import { useThemedStyles } from '../../lib/theme-context';
import { SpringPressable } from '../ui/SpringPressable';

export type WaterfallEntity =
  | { kind: 'event'; data: ExploreTrendingEvent }
  | { kind: 'artist'; data: ExploreRisingArtist }
  | { kind: 'venue'; data: ExploreVenue }
  | { kind: 'tour'; data: ExploreSpotlightTour };

/** Stable list key — kind-prefixed so cross-section id collisions can't. */
export function entityKey(entity: WaterfallEntity): string {
  return `${entity.kind}-${entity.data.id}`;
}

// Media block is 4:3 (h = 0.75w); the text chrome below is fixed-height
// (single-line name + meta), so the estimate stays honest.
const MEDIA_RATIO = 0.75; // height/width
const TEXT_BLOCK_HEIGHT = 68;

/** Estimated tile height at `columnWidth` — drives the masonry accounting. */
export function estimateEntityTileHeight(columnWidth: number): number {
  return Math.round(columnWidth * MEDIA_RATIO) + TEXT_BLOCK_HEIGHT;
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** ISO date → "JUL 18" (meta line; the strip uppercases itself anyway). */
function shortDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function describe(entity: WaterfallEntity): {
  name: string;
  imageUrl: string | null;
  meta: string;
  href: string;
} {
  switch (entity.kind) {
    case 'event': {
      const e = entity.data;
      return {
        name: e.name,
        imageUrl: e.imageUrl ?? e.artist.imageUrl ?? e.crowdPhotos[0] ?? null,
        meta: [shortDate(e.date), e.venue.city].filter(Boolean).join(' · '),
        href: `/event/${e.id}`,
      };
    }
    case 'artist': {
      const a = entity.data;
      return {
        name: a.name,
        imageUrl: a.imageUrl ?? null,
        meta: `${a.followerCount} ${a.followerCount === 1 ? 'FOLLOWER' : 'FOLLOWERS'}`,
        href: `/artist/${a.id}`,
      };
    }
    case 'venue': {
      const v = entity.data;
      return {
        name: v.name,
        imageUrl: v.imageUrl ?? null,
        meta: [v.city, `${v.eventCount} ${v.eventCount === 1 ? 'SHOW' : 'SHOWS'}`]
          .filter(Boolean)
          .join(' · '),
        href: `/venue/${v.id}`,
      };
    }
    case 'tour': {
      const t = entity.data;
      return {
        name: t.name,
        imageUrl: t.imageUrl ?? null,
        meta: `${t.artistName} · ${t.eventCount} ${t.eventCount === 1 ? 'SHOW' : 'SHOWS'}`,
        href: `/tour/${t.id}`,
      };
    }
  }
}

export const WaterfallEntityTile = memo(function WaterfallEntityTile({
  entity,
}: {
  entity: WaterfallEntity;
}) {
  const router = useRouter();
  const styles = useThemedStyles(buildStyles);
  const { name, imageUrl, meta, href } = describe(entity);

  return (
    <SpringPressable
      haptic="light"
      style={styles.card}
      onPress={() => router.push(href)}
      accessibilityRole="button"
      accessibilityLabel={`${entity.kind}: ${name}`}
    >
      <View style={styles.mediaBox}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.media}
            contentFit="cover"
            transition={80}
            cachePolicy="memory-disk"
            recyclingKey={entityKey(entity)}
          />
        ) : (
          <View style={styles.initialBox}>
            <Text style={styles.initial}>{name.slice(0, 1).toUpperCase()}</Text>
          </View>
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.eyebrow}>{entity.kind.toUpperCase()}</Text>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {meta}
        </Text>
      </View>
    </SpringPressable>
  );
});

const buildStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    card: {
      backgroundColor: tokens.colors.card,
      borderRadius: tokens.radius.card,
      borderWidth: 1,
      borderColor: tokens.colors.hairline,
      overflow: 'hidden',
    },
    mediaBox: {
      width: '100%',
      aspectRatio: 1 / MEDIA_RATIO,
      backgroundColor: tokens.colors.card2,
    },
    media: {
      width: '100%',
      height: '100%',
    },
    initialBox: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    initial: {
      fontSize: 30,
      fontWeight: '800',
      color: tokens.colors.muteSoft,
    },
    /* Text chrome — TEXT_BLOCK_HEIGHT tracks this stack. */
    body: {
      paddingHorizontal: 11,
      paddingTop: 9,
      paddingBottom: 11,
    },
    eyebrow: {
      fontFamily: tokens.fontFamilies.monoSemi,
      fontSize: 9,
      fontWeight: '600',
      letterSpacing: 1.2,
      color: tokens.colors.muteSoft,
    },
    name: {
      fontSize: 13.5,
      fontWeight: '700',
      letterSpacing: -0.2,
      color: tokens.colors.fg,
      marginTop: 3,
    },
    meta: {
      fontFamily: tokens.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 10,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      color: tokens.colors.mute,
      marginTop: 4,
    },
  });
