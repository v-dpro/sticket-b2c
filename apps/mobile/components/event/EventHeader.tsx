// EventHeader — hero-image header. Everything below renders over the hero
// photo + dark scrim, so text/icons/scrim colors are intentionally FIXED
// light-on-dark (not theme tokens) to stay legible in both light and dark mode.

import React from 'react';
import { Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fontFamilies } from '../../lib/theme';

const { width } = Dimensions.get('window');
const HEADER_HEIGHT = 260;

interface EventHeaderProps {
  imageUrl?: string;
  artistName: string;
  artistImageUrl?: string;
  venueName: string;
  venueCity: string;
  date: string;
  onBackPress: () => void;
  onSharePress?: () => void;
  shareButton?: React.ReactNode;
}

export function EventHeader({
  imageUrl,
  artistName,
  artistImageUrl,
  venueName,
  venueCity,
  date,
  onBackPress,
  onSharePress,
  shareButton,
}: EventHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* Background Image */}
      {imageUrl || artistImageUrl ? (
        <Image
          source={{ uri: imageUrl || artistImageUrl }}
          style={styles.backgroundImage}
          blurRadius={2}
        />
      ) : (
        <View style={[styles.backgroundImage, styles.placeholderBg]} />
      )}

      {/* Gradient scrim — fixed dark for legibility over hero image */}
      <LinearGradient
        colors={['rgba(11,11,20,0.15)', 'rgba(11,11,20,0.72)', '#0B0B10']}
        locations={[0, 0.55, 1]}
        style={styles.gradient}
      />

      {/* Top bar: back + share */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={onBackPress} style={styles.circleButton} accessibilityRole="button">
          <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
        </Pressable>

        {shareButton ? (
          shareButton
        ) : onSharePress ? (
          <Pressable onPress={onSharePress} style={styles.circleButton} accessibilityRole="button">
            <Ionicons name="share-outline" size={18} color="#FFFFFF" />
          </Pressable>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>

      {/* Hero content */}
      <View style={styles.content}>
        <Text style={styles.eyebrowLabel}>EVENT</Text>
        <Text style={styles.eventName} numberOfLines={2}>{artistName}</Text>
        <Text style={styles.subtitle}>{venueName} &middot; {venueCity}</Text>
      </View>
    </View>
  );
}

// NOTE: colors are intentionally FIXED (not theme tokens) — everything here
// renders over the hero image + dark scrim, so it must read as light-on-dark
// in both light and dark mode.
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
    backgroundColor: '#16161E',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  circleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
  },
  eyebrowLabel: {
    fontFamily: fontFamilies.monoSemi,
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 2,
    color: '#45E3FF',
    marginBottom: 6,
  },
  eventName: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 40,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#A7A7B4',
  },
});
