import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

import type { UserProfile } from '../../types/profile';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

interface ProfileHeaderProps {
  profile: UserProfile;
  onEditPress?: () => void;
  onFollowPress?: () => void;
  onFollowersPress?: () => void;
  onFollowingPress?: () => void;
  isFollowing?: boolean;
  followLoading?: boolean;
  /**
   * A15: one-line taste overlap shown under the Follow button while not yet
   * following (e.g. "You both saw 2 of the same shows"). Omitted when null.
   */
  tasteReason?: string | null;
}

export function ProfileHeader({
  profile,
  onEditPress,
  onFollowPress,
  onFollowersPress,
  onFollowingPress,
  isFollowing,
  followLoading,
  tasteReason,
}: ProfileHeaderProps) {
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    container: {
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 16,
    },
    avatarContainer: {
      position: 'relative',
      marginBottom: 16,
    },
    avatarRing: {
      width: 96,
      height: 96,
      borderRadius: 48,
      padding: 3,
    },
    avatarInnerImage: {
      width: '100%',
      height: '100%',
      borderRadius: 45,
    },
    avatarInnerPlaceholder: {
      width: '100%',
      height: '100%',
      borderRadius: 45,
      backgroundColor: t.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      fontSize: 36,
      fontWeight: 'bold',
      color: t.colors.fg,
    },
    editAvatarButton: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: t.colors.inverseBg,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: t.colors.ink,
    },
    displayName: {
      fontSize: 24,
      fontWeight: 'bold',
      color: t.colors.textHi,
      marginBottom: 4,
    },
    username: {
      fontSize: 14,
      color: t.colors.textLo,
      marginBottom: 8,
    },
    bio: {
      fontSize: 14,
      color: t.colors.textMid,
      textAlign: 'center',
      marginBottom: 8,
      lineHeight: 20,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    location: {
      fontSize: 14,
      color: t.colors.textLo,
      marginLeft: 4,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: 16,
    },
    statItem: {
      alignItems: 'center',
      marginHorizontal: 16,
    },
    statValue: {
      fontSize: 20,
      fontWeight: 'bold',
      color: t.colors.textHi,
    },
    statLabel: {
      fontSize: 12,
      color: t.colors.textLo,
      marginTop: 2,
    },
    editButton: {
      paddingHorizontal: 32,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      backgroundColor: t.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    editButtonText: {
      fontSize: 14,
      fontWeight: '500',
      color: t.colors.textHi,
    },
    followButton: {
      borderRadius: 20,
      overflow: 'hidden',
      minWidth: 120,
      alignItems: 'center',
      justifyContent: 'center',
    },
    followGradient: {
      paddingHorizontal: 32,
      paddingVertical: 10,
      alignItems: 'center',
    },
    followButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: t.colors.onAccent, // over accent gradient
    },
    followingButton: {
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      paddingHorizontal: 32,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    followingButtonText: {
      fontSize: 14,
      fontWeight: '500',
      color: t.colors.textMid,
      textAlign: 'center',
    },
    tasteReason: {
      marginTop: 8,
      fontSize: 12,
      fontWeight: '400',
      color: t.colors.mute,
      textAlign: 'center',
    },
  }));

  return (
    <View style={styles.container}>
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        <LinearGradient colors={[...tokens.gradients.rainbow]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatarRing}>
          {profile.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.avatarInnerImage} />
          ) : (
            <View style={styles.avatarInnerPlaceholder}>
              <Text style={styles.avatarText}>{(profile.displayName || profile.username).charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </LinearGradient>
        {profile.isOwnProfile && (
          <Pressable style={styles.editAvatarButton} onPress={onEditPress}>
            <Ionicons name="camera" size={16} color={tokens.colors.onAccent} />
          </Pressable>
        )}
      </View>

      {/* Name & Username */}
      <Text style={styles.displayName}>{profile.displayName || profile.username}</Text>
      <Text style={styles.username}>@{profile.username}</Text>

      {/* Bio */}
      {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

      {/* Location */}
      {profile.city ? (
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color={tokens.colors.textLo} />
          <Text style={styles.location}>{profile.city}</Text>
        </View>
      ) : null}

      {/* Stats Row — absent on restricted (private) profile payloads. */}
      {profile.stats ? (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.stats.shows}</Text>
            <Text style={styles.statLabel}>Shows</Text>
          </View>
          <Pressable style={styles.statItem} onPress={onFollowersPress}>
            <Text style={styles.statValue}>{profile.stats.followers}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </Pressable>
          <Pressable style={styles.statItem} onPress={onFollowingPress}>
            <Text style={styles.statValue}>{profile.stats.following}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Action Button */}
      {profile.isOwnProfile ? (
        <Pressable style={styles.editButton} onPress={onEditPress}>
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </Pressable>
      ) : (
        <>
          <Pressable style={[styles.followButton, isFollowing ? styles.followingButton : null]} onPress={onFollowPress} disabled={followLoading}>
            {isFollowing ? (
              <Text style={styles.followingButtonText}>Following</Text>
            ) : (
              // C1 zero accent: Follow is the mono ink-inversion pill.
              <View style={[styles.followGradient, { backgroundColor: tokens.colors.inverseBg }]}>
                <Text style={[styles.followButtonText, { color: tokens.colors.inverseFg }]}>Follow</Text>
              </View>
            )}
          </Pressable>
          {/* A15: taste reason — only while not yet following */}
          {!isFollowing && tasteReason ? (
            <Text style={styles.tasteReason} numberOfLines={1}>
              {tasteReason}
            </Text>
          ) : null}
        </>
      )}
    </View>
  );
}
