import React from 'react';
import { Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, accentSets, radius, fontFamilies } from '../../lib/theme';

const { width } = Dimensions.get('window');
const HEADER_HEIGHT = 260;

interface VenueHeaderProps {
  name: string;
  imageUrl?: string;
  city: string;
  state?: string;
  country: string;
  capacity?: number;
  onBackPress: () => void;
  onSharePress: () => void;
}

export function VenueHeader({
  name,
  imageUrl,
  city,
  state,
  country,
  capacity,
  onBackPress,
  onSharePress,
}: VenueHeaderProps) {
  const insets = useSafeAreaInsets();
  const neighborhood = [city, state].filter(Boolean).join(', ');

  return (
    <View style={styles.container}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.backgroundImage} />
      ) : (
        <View style={[styles.backgroundImage, styles.placeholderBg]}>
          <Ionicons name="business" size={56} color={colors.hairline} />
        </View>
      )}

      <LinearGradient
        colors={['rgba(11,11,20,0.15)', 'rgba(11,11,20,0.72)', colors.ink]}
        locations={[0, 0.55, 1]}
        style={styles.gradient}
      />

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={onBackPress} style={styles.circleButton} accessibilityRole="button">
          <Ionicons name="arrow-back" size={18} color={colors.textHi} />
        </Pressable>
        <Pressable onPress={onSharePress} style={styles.circleButton} accessibilityRole="button">
          <Ionicons name="share-outline" size={18} color={colors.textHi} />
        </Pressable>
      </View>

      {/* Hero content */}
      <View style={styles.content}>
        <Text style={styles.eyebrowLabel}>VENUE</Text>
        <Text style={styles.name} numberOfLines={2}>{name}</Text>
        <View style={styles.subtitleRow}>
          <Text style={styles.subtitle}>{neighborhood}</Text>
          {capacity ? (
            <View style={styles.capacityBadge}>
              <Ionicons name="people" size={11} color={colors.textMid} />
              <Text style={styles.capacityText}>{capacity.toLocaleString()}</Text>
            </View>
          ) : null}
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
    justifyContent: 'center',
    alignItems: 'center',
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
    color: accentSets.cyan.hex,
    marginBottom: 6,
  },
  name: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.textHi,
    lineHeight: 40,
    marginBottom: 6,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMid,
  },
  capacityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  capacityText: {
    fontSize: 11,
    color: colors.textMid,
    fontWeight: '500',
  },
});
