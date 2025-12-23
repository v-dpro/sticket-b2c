import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

import type { UserProfile } from '../../types/profile';
import { gradients } from '../../lib/theme';

interface ProfileHeaderProps {
  profile: UserProfile;
  onEditPress?: () => void;
  onFollowPress?: () => void;
  onFollowersPress?: () => void;
  onFollowingPress?: () => void;
  isFollowing?: boolean;
  followLoading?: boolean;
}

export function ProfileHeader({
  profile,
  onEditPress,
  onFollowPress,
  onFollowersPress,
  onFollowingPress,
  isFollowing,
  followLoading,
}: ProfileHeaderProps) {
  return (
    <View style={styles.container}>
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        <LinearGradient colors={[...gradients.rainbow]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatarRing}>
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
            <Ionicons name="camera" size={16} color="#FFFFFF" />
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
          <Ionicons name="location-outline" size={14} color="#6B6B8D" />
          <Text style={styles.location}>{profile.city}</Text>
        </View>
      ) : null}

      {/* Stats Row */}
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

      {/* Action Button */}
      {profile.isOwnProfile ? (
        <Pressable style={styles.editButton} onPress={onEditPress}>
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </Pressable>
      ) : (
        <Pressable style={[styles.followButton, isFollowing ? styles.followingButton : null]} onPress={onFollowPress} disabled={followLoading}>
          {isFollowing ? (
            <Text style={styles.followingButtonText}>Following</Text>
          ) : (
            <LinearGradient colors={['#8B5CF6', '#E879F9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.followGradient}>
              <Text style={styles.followButtonText}>Follow</Text>
            </LinearGradient>
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: '#1A1A2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#8B5CF6',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#0A0B1E',
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    color: '#6B6B8D',
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    color: '#A0A0B8',
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
    color: '#6B6B8D',
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
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B6B8D',
    marginTop: 2,
  },
  editButton: {
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2D2D4A',
    backgroundColor: '#1A1A2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
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
    color: '#FFFFFF',
  },
  followingButton: {
    backgroundColor: '#1A1A2E',
    borderWidth: 1,
    borderColor: '#2D2D4A',
    paddingHorizontal: 32,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followingButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#A0A0B8',
    textAlign: 'center',
  },
});





