// MemoryRailCard — mini photo card (~240×300) for the memory viewer's
// "MORE FROM {EVENT}" horizontal rail. Same embedded chrome as the featured
// card at smaller type: solid author pill (top-left), mono score chip 12
// (top-right), artist 15/800 + venue·date mono on the bottom scrim.
// Tap → the rail card becomes the featured card (handled by the route).

import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

import type { FeedItem } from '../../types/feed';
import type { ThemeTokens } from '../../lib/theme';
import { useThemedStyles } from '../../lib/theme-context';
import { Avatar } from '../ui/Avatar';
import { SpringPressable } from '../ui/SpringPressable';
import { formatMemoryDate, formatMemoryScore } from './format';

export const RAIL_CARD_WIDTH = 240;
export const RAIL_CARD_HEIGHT = 300;
export const RAIL_CARD_GAP = 12;

/** Best still image for a rail card — video posters over raw video URLs. */
function railPoster(item: FeedItem): string | undefined {
  const p = item.log.photos?.[0];
  if (p) {
    return p.mediaKind === 'video'
      ? p.thumbUrl || p.thumbnailUrl || undefined
      : p.thumbnailUrl || p.photoUrl;
  }
  return item.event.artist.imageUrl || undefined;
}

interface MemoryRailCardProps {
  item: FeedItem;
  onPress: (item: FeedItem) => void;
}

export const MemoryRailCard = memo(function MemoryRailCard({ item, onPress }: MemoryRailCardProps) {
  const styles = useThemedStyles(buildStyles);

  const poster = railPoster(item);
  const score =
    typeof item.log.rating === 'number' && item.log.rating > 0 ? item.log.rating : null;

  return (
    <SpringPressable
      style={styles.card}
      onPress={() => onPress(item)}
      haptic="none" // the route's swap handler fires its own light tick
      accessibilityRole="button"
      accessibilityLabel={`Memory by @${item.user.username} — ${item.event.artist.name}`}
    >
      {poster ? (
        <Image
          source={{ uri: poster }}
          style={styles.media}
          contentFit="cover"
          transition={80}
          cachePolicy="memory-disk"
          recyclingKey={item.log.id}
        />
      ) : (
        <View style={styles.mediaFallback}>
          <Ionicons name="musical-notes" size={30} color="rgba(255,255,255,0.28)" />
        </View>
      )}

      {/* Scrims — same over-photo treatment as the featured card */}
      <LinearGradient
        colors={['rgba(11,11,16,0.55)', 'transparent']}
        style={styles.scrimTop}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['transparent', 'rgba(11,11,16,0.92)']}
        style={styles.scrimBottom}
        pointerEvents="none"
      />

      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.overlayTop}>
          <View style={styles.authorPill}>
            <Avatar
              uri={item.user.avatarUrl}
              name={item.user.displayName || item.user.username}
              size={16}
            />
            <Text style={styles.authorName} numberOfLines={1}>
              {item.user.username}
            </Text>
          </View>
          {score != null ? (
            <View style={styles.scoreChip}>
              <Text style={styles.scoreText}>{formatMemoryScore(score)}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.overlayBottom}>
          <Text style={styles.artistName} numberOfLines={2}>
            {item.event.artist.name}
          </Text>
          <Text style={styles.venueDate} numberOfLines={1}>
            {`${item.event.venue.name} · ${formatMemoryDate(item.event.date)}`}
          </Text>
        </View>
      </View>
    </SpringPressable>
  );
});

const buildStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    card: {
      width: RAIL_CARD_WIDTH,
      height: RAIL_CARD_HEIGHT,
      borderRadius: 18,
      overflow: 'hidden',
      backgroundColor: tokens.colors.card2,
    },
    media: {
      ...StyleSheet.absoluteFillObject,
    },
    mediaFallback: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: '#17171E',
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrimTop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '30%',
    },
    scrimBottom: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: '55%',
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      padding: 12,
      justifyContent: 'space-between',
    },
    overlayTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 8,
    },
    // Solid (non-blurred) mini pill — a rail of BlurViews is a perf trap.
    authorPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingLeft: 3,
      paddingRight: 9,
      paddingVertical: 3,
      borderRadius: tokens.radius.full,
      backgroundColor: 'rgba(11,11,16,0.5)',
      flexShrink: 1,
    },
    authorName: {
      fontSize: 10,
      fontWeight: '600',
      color: '#FFFFFF',
      flexShrink: 1,
    },
    scoreChip: {
      minWidth: 26,
      paddingHorizontal: 6,
      height: 22,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.16)',
      backgroundColor: 'rgba(11,11,16,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    scoreText: {
      fontFamily: tokens.fontFamilies.monoBold,
      fontVariant: ['tabular-nums'],
      fontSize: 12,
      color: '#FFFFFF',
    },
    overlayBottom: {
      alignItems: 'flex-start',
    },
    artistName: {
      fontSize: 15,
      fontWeight: '800',
      letterSpacing: -0.2,
      lineHeight: 18,
      color: '#FFFFFF',
    },
    venueDate: {
      fontFamily: tokens.fontFamilies.monoSemi,
      fontSize: 9,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.82)',
      marginTop: 4,
    },
  });
