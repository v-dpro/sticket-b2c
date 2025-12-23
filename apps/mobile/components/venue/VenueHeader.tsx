import React from 'react';
import { Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');
const HEADER_HEIGHT = 280;

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
  const location = [city, state, country].filter(Boolean).join(', ');

  return (
    <View style={styles.container}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.backgroundImage} />
      ) : (
        <View style={[styles.backgroundImage, styles.placeholderBg]}>
          <Ionicons name="business" size={64} color="#2D2D4A" />
        </View>
      )}

      <LinearGradient
        colors={['rgba(10, 11, 30, 0.3)', 'rgba(10, 11, 30, 0.9)', '#0A0B1E']}
        style={styles.gradient}
      />

      <View style={styles.topBar}>
        <Pressable onPress={onBackPress} style={styles.iconButton}>
          <BlurView intensity={50} style={styles.blurButton}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </BlurView>
        </Pressable>
        <Pressable onPress={onSharePress} style={styles.iconButton}>
          <BlurView intensity={50} style={styles.blurButton}>
            <Ionicons name="share-outline" size={22} color="#FFFFFF" />
          </BlurView>
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="business" size={32} color="#8B5CF6" />
        </View>

        <Text style={styles.name}>{name}</Text>

        <View style={styles.locationRow}>
          <Ionicons name="location" size={16} color="#00D4FF" />
          <Text style={styles.location}>{location}</Text>
        </View>

        {capacity ? (
          <View style={styles.capacityBadge}>
            <Ionicons name="people" size={14} color="#A0A0B8" />
            <Text style={styles.capacityText}>{capacity.toLocaleString()} capacity</Text>
          </View>
        ) : null}
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
    backgroundColor: '#1A1A2E',
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
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  location: {
    fontSize: 14,
    color: '#A0A0B8',
    marginLeft: 6,
  },
  capacityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  capacityText: {
    fontSize: 12,
    color: '#A0A0B8',
  },
});



