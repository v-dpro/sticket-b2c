import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  Pressable,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { colors } from '../../lib/theme';

const { width } = Dimensions.get('window');
const HEADER_HEIGHT = 320;

interface ArtistHeaderProps {
  name: string;
  imageUrl?: string;
  genres: string[];
  isFollowing: boolean;
  followLoading: boolean;
  spotifyUrl?: string;
  appleMusicUrl?: string;
  onBackPress: () => void;
  onFollowPress: () => void;
  onSharePress: () => void;
}

export function ArtistHeader({
  name,
  imageUrl,
  genres,
  isFollowing,
  followLoading,
  spotifyUrl,
  appleMusicUrl,
  onBackPress,
  onFollowPress,
  onSharePress,
}: ArtistHeaderProps) {
  const handleSpotifyPress = () => {
    if (spotifyUrl) Linking.openURL(spotifyUrl);
  };

  const handleAppleMusicPress = () => {
    if (appleMusicUrl) Linking.openURL(appleMusicUrl);
  };

  return (
    <View style={styles.container}>
      {/* Background Image */}
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.backgroundImage} />
      ) : (
        <View style={[styles.backgroundImage, styles.placeholderBg]} />
      )}

      {/* Gradient Overlay */}
      <LinearGradient
        colors={['rgba(10, 11, 30, 0.2)', 'rgba(10, 11, 30, 0.8)', colors.ink]}
        style={styles.gradient}
      />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <Pressable onPress={onBackPress} style={styles.iconButton}>
          <BlurView intensity={50} style={styles.blurButton}>
            <Ionicons name="arrow-back" size={22} color={colors.textHi} />
          </BlurView>
        </Pressable>
        <Pressable onPress={onSharePress} style={styles.iconButton}>
          <BlurView intensity={50} style={styles.blurButton}>
            <Ionicons name="share-outline" size={22} color={colors.textHi} />
          </BlurView>
        </Pressable>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Artist Avatar */}
        {imageUrl && <Image source={{ uri: imageUrl }} style={styles.avatar} />}

        {/* Name */}
        <Text style={styles.name}>{name}</Text>

        {/* Genres */}
        {genres.length > 0 && (
          <Text style={styles.genres}>{genres.slice(0, 3).join(' • ')}</Text>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          {/* Follow Button */}
          <Pressable
            style={[styles.followButton, isFollowing && styles.followingButton]}
            onPress={onFollowPress}
            disabled={followLoading}
          >
            {isFollowing ? (
              <>
                <Ionicons name="notifications" size={18} color={colors.brandPurple} />
                <Text style={styles.followingText}>Following</Text>
              </>
            ) : (
              <LinearGradient
                colors={[colors.brandPurple, colors.brandPink]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.followGradient}
              >
                <Ionicons
                  name="notifications-outline"
                  size={18}
                  color={colors.textHi}
                />
                <Text style={styles.followText}>Follow</Text>
              </LinearGradient>
            )}
          </Pressable>

          {/* Streaming Links */}
          <View style={styles.streamingLinks}>
            {spotifyUrl && (
              <Pressable
                style={styles.streamingButton}
                onPress={handleSpotifyPress}
              >
                <FontAwesome name="spotify" size={22} color="#1DB954" />
              </Pressable>
            )}
            {appleMusicUrl && (
              <Pressable
                style={styles.streamingButton}
                onPress={handleAppleMusicPress}
              >
                <Ionicons name="logo-apple" size={24} color="#FC3C44" />
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: HEADER_HEIGHT,
    width,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width,
    height: HEADER_HEIGHT,
  },
  placeholderBg: {
    backgroundColor: colors.surface,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  blurButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  content: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: colors.brandPurple,
    marginBottom: 16,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textHi,
    textAlign: 'center',
    marginBottom: 4,
  },
  genres: {
    fontSize: 14,
    color: colors.textMid,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  followButton: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  followGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 6,
  },
  followText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textHi,
  },
  followingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 1,
    borderColor: colors.brandPurple,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 6,
  },
  followingText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brandPurple,
  },
  streamingLinks: {
    flexDirection: 'row',
    gap: 8,
  },
  streamingButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.hairline,
  },
});



