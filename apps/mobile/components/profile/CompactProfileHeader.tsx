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

type CompactProfileHeaderProps = {
  profile: UserProfile;
  isFollowing: boolean;
  followLoading?: boolean;
  onFollowPress: () => void;
};

export function CompactProfileHeader({
  profile,
  isFollowing,
  followLoading,
  onFollowPress,
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
    statsLine: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 11,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.mute,
    },
    bio: { fontSize: 13, lineHeight: 18, color: t.colors.mute },
  }));

  const name = profile.displayName || profile.username;
  const stats = profile.stats;

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
        <Text style={styles.statsLine} numberOfLines={1}>
          {`${stats.shows} SHOWS · ${stats.artists} ARTISTS · ${stats.venues} VENUES`}
        </Text>
      ) : null}

      {profile.bio ? (
        <Text style={styles.bio} numberOfLines={2}>
          {profile.bio}
        </Text>
      ) : null}
    </View>
  );
}
