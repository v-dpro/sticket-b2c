import React from 'react';
import { Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { format } from 'date-fns';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');
const HEADER_HEIGHT = 300;

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
  const dt = new Date(date);
  const formattedDate = format(dt, 'EEEE, MMMM d, yyyy');
  const formattedTime = format(dt, 'h:mm a');
  const isPast = dt < new Date();

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

      {/* Gradient Overlay */}
      <LinearGradient
        colors={['rgba(10, 11, 30, 0.3)', 'rgba(10, 11, 30, 0.9)', '#0A0B1E']}
        style={styles.gradient}
      />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <Pressable onPress={onBackPress} style={styles.iconButton}>
          <BlurView intensity={50} style={styles.blurButton}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </BlurView>
        </Pressable>
        {shareButton ? (
          shareButton
        ) : (
          <Pressable onPress={onSharePress} style={styles.iconButton} accessibilityRole="button">
            <BlurView intensity={50} style={styles.blurButton}>
              <Ionicons name="share-outline" size={22} color="#FFFFFF" />
            </BlurView>
          </Pressable>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Date Badge */}
        <View style={styles.dateBadge}>
          <Text style={styles.dateText}>{formattedDate}</Text>
          {!isPast && <Text style={styles.timeText}>{formattedTime}</Text>}
        </View>

        {/* Artist Name */}
        <Text style={styles.artistName}>{artistName}</Text>

        {/* Venue */}
        <View style={styles.venueRow}>
          <Ionicons name="location" size={16} color="#A0A0B8" />
          <Text style={styles.venueName}>{venueName}</Text>
          <Text style={styles.venueCity}> • {venueCity}</Text>
        </View>

        {/* Status Badge */}
        {isPast ? (
          <View style={styles.statusBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#22C55E" />
            <Text style={styles.statusText}>Past Event</Text>
          </View>
        ) : (
          <View style={[styles.statusBadge, styles.upcomingBadge]}>
            <Ionicons name="calendar" size={14} color="#00D4FF" />
            <Text style={[styles.statusText, styles.upcomingText]}>Upcoming</Text>
          </View>
        )}
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
    left: 16,
    right: 16,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateText: {
    fontSize: 14,
    color: '#00D4FF',
    fontWeight: '500',
  },
  timeText: {
    fontSize: 14,
    color: '#A0A0B8',
    marginLeft: 8,
  },
  artistName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  venueName: {
    fontSize: 14,
    color: '#A0A0B8',
    marginLeft: 6,
  },
  venueCity: {
    fontSize: 14,
    color: '#6B6B8D',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  upcomingBadge: {
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
  },
  statusText: {
    fontSize: 12,
    color: '#22C55E',
    fontWeight: '500',
  },
  upcomingText: {
    color: '#00D4FF',
  },
});



