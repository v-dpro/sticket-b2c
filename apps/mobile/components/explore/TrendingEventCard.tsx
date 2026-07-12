// TrendingEventCard — the full-width EVENT spotlight of the stanza (C14).
// Media on top (photo or StripeField ticket-stock block) carrying the mono
// date block (top-left) and a bare mono log-count stat (top-right, the
// BareScore body language on media). Card surface below: artist 20/800,
// venue mono, "FROM THE CROWD" thumbnail strip, then DegreeFacepile +
// concrete mono caption ("DIEGO GOING · 6 INTERESTED") with the Interested
// pill right. Plain card, never a stub (C3). Tap → /event/[id].

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

import type { ExploreTrendingEvent } from '../../lib/api/explore';
import { useInterested } from '../../hooks/useInterested';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { DegreeFacepile } from '../ui/DegreeFacepile';
import { PillButton } from '../ui/PillButton';
import { SpringPressable } from '../ui/SpringPressable';
import { StripeField } from '../ui/Stub';
import { crowdCaption, dateBlock, isUpcoming, monoDate } from './format';

// Over-photo constants — theme-independent on media (over-photo fg is white).
const OVERLAY_MUTE = '#C9C9D4';
const DATE_CHIP_BORDER = 'rgba(255,255,255,0.85)';

type TrendingEventCardProps = {
  event: ExploreTrendingEvent;
};

export function TrendingEventCard({ event }: TrendingEventCardProps) {
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
      aspectRatio: 1.6,
      backgroundColor: t.colors.card2,
    },
    photo: { ...StyleSheet.absoluteFillObject },
    mediaChrome: {
      ...StyleSheet.absoluteFillObject,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    dateChip: {
      borderWidth: 1.5,
      borderRadius: t.radius.chip,
      paddingVertical: 6,
      paddingHorizontal: 10,
      alignItems: 'center',
      gap: 1,
    },
    dateChipText: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1,
    },
    statBlock: { alignItems: 'flex-end' },
    statDigits: {
      fontFamily: t.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 30,
      fontWeight: '700',
      letterSpacing: -0.5,
    },
    statLabel: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 9,
      fontWeight: '600',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      marginTop: 1,
    },
    body: { padding: t.density.cardPad, gap: 6 },
    title: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4, color: t.colors.fg },
    venue: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 10.5,
      fontWeight: '600',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
    },
    crowdStrip: { marginTop: 8, gap: 6 },
    crowdLabel: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 9,
      fontWeight: '600',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
    },
    crowdThumbs: { flexDirection: 'row', gap: 6 },
    crowdThumb: {
      width: 48,
      height: 48,
      borderRadius: t.radius.sm,
      backgroundColor: t.colors.card2,
    },
    footer: {
      marginTop: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
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

  const { isInterested, toggle, loading } = useInterested(event.id);

  const imageUrl = event.imageUrl ?? event.artist.imageUrl;
  const hasPhoto = Boolean(imageUrl);
  // Media chrome ink: white over photos (A19), theme ink over stripe stock.
  const chromeInk = hasPhoto ? '#FFFFFF' : tokens.colors.fg;
  const chromeMute = hasPhoto ? OVERLAY_MUTE : tokens.colors.muteSoft;
  const statShadow = hasPhoto
    ? {
        textShadowColor: 'rgba(11,11,16,0.45)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 8,
      }
    : null;

  const date = dateBlock(event.date);
  const caption = crowdCaption(
    event.friendsWent,
    isUpcoming(event.date) ? 'GOING' : 'WENT',
    event.interestedCount > 0 ? `${event.interestedCount} INTERESTED` : null,
  );

  return (
    <SpringPressable
      haptic="light"
      onPress={() => router.push(`/event/${event.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${event.artist.name} at ${event.venue.name}, ${monoDate(event.date)}, trending`}
      style={styles.card}
    >
      <View style={styles.media}>
        {hasPhoto ? (
          <Image
            source={{ uri: imageUrl! }}
            style={styles.photo}
            contentFit="cover"
            transition={80}
            cachePolicy="memory-disk"
            recyclingKey={event.id}
          />
        ) : (
          <StripeField />
        )}
        <View style={styles.mediaChrome} pointerEvents="none">
          {date ? (
            <View style={[styles.dateChip, { borderColor: hasPhoto ? DATE_CHIP_BORDER : tokens.colors.fg }]}>
              <Text style={[styles.dateChipText, { color: chromeInk }]}>{date.month}</Text>
              <Text style={[styles.dateChipText, { color: chromeInk }]}>{date.day}</Text>
            </View>
          ) : (
            <View />
          )}
          {event.logCount > 0 ? (
            <View style={styles.statBlock}>
              <Text style={[styles.statDigits, { color: chromeInk }, statShadow]}>{event.logCount}</Text>
              <Text style={[styles.statLabel, { color: chromeMute }, statShadow]}>Logs</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {event.artist.name || event.name}
        </Text>
        <Text style={styles.venue} numberOfLines={1}>
          {[event.venue.name, event.venue.city].filter(Boolean).join(' · ')}
        </Text>

        {event.crowdPhotos.length > 0 ? (
          <View style={styles.crowdStrip}>
            <Text style={styles.crowdLabel}>From the crowd</Text>
            <View style={styles.crowdThumbs}>
              {event.crowdPhotos.slice(0, 3).map((url, i) => (
                <Image
                  key={`${url}-${i}`}
                  source={{ uri: url }}
                  style={styles.crowdThumb}
                  contentFit="cover"
                  transition={80}
                  cachePolicy="memory-disk"
                />
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.footer}>
          <DegreeFacepile
            people={event.friendsWent}
            size={24}
            surfaceColor={tokens.colors.card}
          />
          {caption ? (
            <Text style={styles.caption} numberOfLines={1}>
              {caption}
            </Text>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          <PillButton
            title={isInterested ? 'Interested ✓' : 'Interested'}
            variant={isInterested ? 'primary' : 'secondary'}
            size="sm"
            springFeedback
            disabled={loading}
            onPress={toggle}
          />
        </View>
      </View>
    </SpringPressable>
  );
}
