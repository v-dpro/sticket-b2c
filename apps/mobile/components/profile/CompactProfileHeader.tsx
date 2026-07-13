// CompactProfileHeader — the other-user profile's tight masthead.
// The timeline below is the hero, so this stays ~150px tall: avatar,
// name + @username, the Follow pill, one mono stats line (SHOWS ·
// ARTISTS · VENUES), optional two-line bio. Zero accent — Follow is the
// ink-inversion pill, Following the quiet card2 pill. Tolerates the
// server's restricted payload (no stats/bio) by simply omitting lines.

import React from 'react';
import { Text, View } from 'react-native';
import { Image } from 'expo-image';

import type { UserProfile } from '../../types/profile';
import { useThemedStyles } from '../../lib/theme-context';
import { PillButton } from '../ui/PillButton';
import { SpringPressable } from '../ui/SpringPressable';

type CompactProfileHeaderProps = {
  profile: UserProfile;
  isFollowing: boolean;
  followLoading?: boolean;
  onFollowPress: () => void;
  /** Tap the FRIENDS stat → open the friends sheet. */
  onFriendsPress?: () => void;
  /** Tap the FOLLOWING stat → open the followed-artists sheet. */
  onFollowingPress?: () => void;
};

export function CompactProfileHeader({
  profile,
  isFollowing,
  followLoading,
  onFollowPress,
  onFriendsPress,
  onFollowingPress,
}: CompactProfileHeaderProps) {
  const styles = useThemedStyles((t) => ({
    container: {
      paddingHorizontal: t.density.pad,
      paddingTop: 8,
      paddingBottom: 12,
      gap: 10,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: t.colors.card2,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarInitial: { fontSize: 22, fontWeight: '700', color: t.colors.mute },
    names: { flex: 1, minWidth: 0, gap: 3 },
    displayName: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3, color: t.colors.fg },
    username: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 0.8,
      color: t.colors.muteSoft,
    },
    statsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
    statsLine: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 11,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.mute,
    },
    // Tappable counts read as ink (no accent) — a hair brighter than the
    // static SHOWS count to signal they're interactive.
    statsLink: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 11,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.fg,
    },
    statsDot: { color: t.colors.muteSoft },
    bio: { fontSize: 13, lineHeight: 18, color: t.colors.mute },
  }));

  const name = profile.displayName || profile.username;
  const stats = profile.stats;
  // "Friends" = the degree-1 people this user follows; the server's
  // stats.following counts exactly that set, so it matches the friends sheet.
  const friendsCount = stats?.following ?? 0;
  // followingArtists isn't on the shared ProfileStats type yet — read it
  // defensively so the count matches the following-artists sheet.
  const followingCount = (stats as { followingArtists?: number } | undefined)?.followingArtists ?? 0;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {profile.avatarUrl ? (
          <Image
            source={{ uri: profile.avatarUrl }}
            style={styles.avatar}
            contentFit="cover"
            transition={80}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.names}>
          <Text style={styles.displayName} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.username} numberOfLines={1}>
            @{profile.username}
          </Text>
        </View>
        {!profile.isOwnProfile ? (
          <PillButton
            title={isFollowing ? 'Following' : 'Follow'}
            variant={isFollowing ? 'secondary' : 'primary'}
            size="sm"
            disabled={followLoading}
            springFeedback
            haptic="light"
            onPress={onFollowPress}
          />
        ) : null}
      </View>

      {stats ? (
        <View style={styles.statsRow}>
          <Text style={styles.statsLine}>{`${stats.shows} SHOWS`}</Text>
          <Text style={[styles.statsLine, styles.statsDot]}>{'  ·  '}</Text>
          <SpringPressable
            haptic="light"
            onPress={onFriendsPress}
            disabled={!onFriendsPress}
            accessibilityRole="button"
            accessibilityLabel={`${friendsCount} friends`}
          >
            <Text style={styles.statsLink}>{`${friendsCount} FRIENDS`}</Text>
          </SpringPressable>
          <Text style={[styles.statsLine, styles.statsDot]}>{'  ·  '}</Text>
          <SpringPressable
            haptic="light"
            onPress={onFollowingPress}
            disabled={!onFollowingPress}
            accessibilityRole="button"
            accessibilityLabel={`${followingCount} following`}
          >
            <Text style={styles.statsLink}>{`${followingCount} FOLLOWING`}</Text>
          </SpringPressable>
        </View>
      ) : null}

      {profile.bio ? (
        <Text style={styles.bio} numberOfLines={2}>
          {profile.bio}
        </Text>
      ) : null}
    </View>
  );
}
