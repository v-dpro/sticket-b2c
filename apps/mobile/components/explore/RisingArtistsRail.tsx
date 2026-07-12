// RisingArtistsRail — "RISING WITH YOUR CROWD", the second utility rail of
// the stanza (C14). Circle avatar 56, name 14/700, and a CONCRETE mono
// reason line built from real data ("MAYA SAW LIVE" / "3 FRIENDS SAW" /
// "212 LOGS") — never "recommended for you". Track wires to the existing
// follow-artist API (lib/api/artists via useArtistFollow); card tap →
// /artist/[id].

import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

import type { ExploreRisingArtist } from '../../lib/api/explore';
import { useArtistFollow } from '../../hooks/useArtistFollow';
import { useThemedStyles } from '../../lib/theme-context';
import { PillButton } from '../ui/PillButton';
import { SpringPressable } from '../ui/SpringPressable';
import { risingReason } from './format';

type RisingArtistsRailProps = {
  artists: ExploreRisingArtist[];
};

function RisingArtistCard({ artist }: { artist: ExploreRisingArtist }) {
  const router = useRouter();
  const styles = useThemedStyles((t) => ({
    card: {
      width: 148,
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 14,
      gap: 8,
      borderRadius: t.radius.card,
      backgroundColor: t.colors.card,
      borderWidth: 1,
      borderColor: t.colors.hairline,
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: t.colors.card2,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitial: { fontSize: 22, fontWeight: '700', color: t.colors.mute },
    name: {
      fontSize: 14,
      fontWeight: '700',
      letterSpacing: -0.2,
      color: t.colors.fg,
      textAlign: 'center',
    },
    reason: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 9.5,
      fontWeight: '600',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
      textAlign: 'center',
    },
  }));

  const { isFollowing, toggleFollow, loading } = useArtistFollow(false);

  return (
    <SpringPressable
      haptic="light"
      onPress={() => router.push(`/artist/${artist.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${artist.name}, rising artist`}
      style={styles.card}
    >
      <View style={styles.avatar}>
        {artist.imageUrl ? (
          <Image
            source={{ uri: artist.imageUrl }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={80}
            cachePolicy="memory-disk"
            recyclingKey={artist.id}
          />
        ) : (
          <Text style={styles.avatarInitial}>{artist.name.slice(0, 1).toUpperCase()}</Text>
        )}
      </View>
      <View style={{ gap: 3, alignItems: 'center' }}>
        <Text style={styles.name} numberOfLines={1}>
          {artist.name}
        </Text>
        <Text style={styles.reason} numberOfLines={1}>
          {risingReason(artist.friendsWent, artist.logCount, artist.followerCount)}
        </Text>
      </View>
      <PillButton
        title={isFollowing ? 'Tracking' : 'Track'}
        variant={isFollowing ? 'primary' : 'secondary'}
        size="sm"
        springFeedback
        disabled={loading}
        onPress={() => toggleFollow(artist.id)}
      />
    </SpringPressable>
  );
}

export function RisingArtistsRail({ artists }: RisingArtistsRailProps) {
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
    rail: { paddingHorizontal: t.density.pad, gap: 8 },
  }));

  if (artists.length === 0) return null;

  return (
    <View>
      <View style={styles.head}>
        <Text style={styles.title}>Rising with your crowd</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
        {artists.slice(0, 10).map((artist) => (
          <RisingArtistCard key={artist.id} artist={artist} />
        ))}
      </ScrollView>
    </View>
  );
}
