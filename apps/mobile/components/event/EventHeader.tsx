import React from 'react';
import { Dimensions, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, accentSets, radius } from '../../lib/theme';

const { width } = Dimensions.get('window');
const HEADER_HEIGHT = 260;
const monoFont = Platform.select({ ios: 'Menlo', android: 'monospace' }) ?? 'monospace';

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

      {/* Gradient scrim */}
      <LinearGradient
        colors={['rgba(11,11,20,0.15)', 'rgba(11,11,20,0.72)', colors.ink]}
        locations={[0, 0.55, 1]}
        style={styles.gradient}
      />

      {/* Top bar: back + share */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={onBackPress} style={styles.circleButton} accessibilityRole="button">
          <Ionicons name="arrow-back" size={18} color={colors.textHi} />
        </Pressable>

        {shareButton ? (
          shareButton
        ) : onSharePress ? (
          <Pressable onPress={onSharePress} style={styles.circleButton} accessibilityRole="button">
            <Ionicons name="share-outline" size={18} color={colors.textHi} />
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
    fontFamily: monoFont,
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 2,
    color: accentSets.cyan.hex,
    marginBottom: 6,
  },
  eventName: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.textHi,
    lineHeight: 40,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMid,
  },
});
