// FriendGravityList — "YOUR PEOPLE ARE EYEING": upcoming shows the viewer's
// 2-hop graph marked interested that aren't on the viewer's radar yet. The
// decide-stage nudge, promoted from the event page to a first-class Explore
// section. Rows mirror EventMediumCard's geometry with the facepile +
// "N FRIENDS EYEING" line carrying the signal. Tap → /event/[id].

import React from 'react';
import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

import type { ExploreFriendGravity } from '../../lib/api/explore';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { DegreeFacepile } from '../ui/DegreeFacepile';
import { SpringPressable } from '../ui/SpringPressable';
import { monoDate } from './format';

type FriendGravityListProps = {
  items: ExploreFriendGravity[];
};

export function FriendGravityList({ items }: FriendGravityListProps) {
  const router = useRouter();
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    head: { paddingHorizontal: t.density.pad, marginBottom: 10 },
    title: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
    },
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
      width: 56,
      height: 56,
      borderRadius: t.radius.md,
      backgroundColor: t.colors.card2,
    },
    imageFallback: { alignItems: 'center', justifyContent: 'center' },
    body: { flex: 1, minWidth: 0, gap: 3 },
    name: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2, color: t.colors.fg },
    meta: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
    },
    signalRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
    signal: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 1,
      color: t.colors.fg,
    },
  }));

  if (items.length === 0) return null;

  return (
    <View>
      <View style={styles.head}>
        <Text style={styles.title}>Your people are eyeing</Text>
      </View>
      {items.slice(0, 5).map((item) => {
        const imageUrl = item.imageUrl ?? item.artist.imageUrl;
        return (
          <SpringPressable
            key={item.id}
            haptic="light"
            onPress={() => router.push(`/event/${item.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`${item.artist.name} at ${item.venue.name} — ${item.friendCount} friends interested`}
            style={styles.card}
          >
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={styles.image}
                contentFit="cover"
                transition={80}
                cachePolicy="memory-disk"
                recyclingKey={item.id}
              />
            ) : (
              <View style={[styles.image, styles.imageFallback]}>
                <Ionicons name="musical-notes-outline" size={20} color={tokens.colors.mute} />
              </View>
            )}
            <View style={styles.body}>
              <Text style={styles.name} numberOfLines={1}>
                {item.artist.name || item.name}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {[item.venue.name, item.venue.city, monoDate(item.date)].filter(Boolean).join(' · ')}
              </Text>
              <View style={styles.signalRow}>
                <DegreeFacepile
                  people={item.friendsInterested}
                  size={18}
                  max={3}
                  surfaceColor={tokens.colors.card}
                />
                <Text style={styles.signal} numberOfLines={1}>
                  {item.friendCount} FRIEND{item.friendCount === 1 ? '' : 'S'} EYEING
                </Text>
              </View>
            </View>
          </SpringPressable>
        );
      })}
    </View>
  );
}
