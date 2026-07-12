// SeatSectionSheet — bottom sheet opened from a seat-section tile on the
// event page. Header: section name (800) + monochrome star readout of the
// section's average rating. Body: 3-column photo grid; tapping a photo
// opens the shared full-screen PhotoLightbox.
//
// Follows the app's Modal-sheet pattern (see LikersSheet / ShareSheet):
// blurred backdrop, slide-up card panel, grabber. Fully tokenized.

import React, { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import Animated from 'react-native-reanimated';

import type { EventSeatSection, SeatSectionPhoto } from '../../lib/api/events';
import { durations, tearIn } from '../../lib/motion';
import type { ThemeTokens } from '../../lib/theme';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { PhotoLightbox } from '../event/PhotoLightbox';
import { StarRow } from './EntityBits';
import { formatScore } from './format';

interface SeatSectionSheetProps {
  section: EventSeatSection | null;
  onClose: () => void;
}

export function SeatSectionSheet({ section, onClose }: SeatSectionSheetProps) {
  const { tokens } = useTheme();
  const styles = useThemedStyles(buildStyles);
  const [lightboxPhoto, setLightboxPhoto] = useState<SeatSectionPhoto | null>(null);

  const close = () => {
    setLightboxPhoto(null);
    onClose();
  };

  const renderPhoto = ({ item, index }: { item: SeatSectionPhoto; index: number }) => (
    <Animated.View
      entering={tearIn(Math.min(index, 8) * durations.stagger)}
      style={styles.cell}
    >
      <Pressable
        onPress={() => setLightboxPhoto(item)}
        accessibilityRole="imagebutton"
        accessibilityLabel={`Seat view photo ${index + 1}`}
      >
        <Image
          source={{ uri: item.thumbnailUrl ?? item.photoUrl }}
          style={styles.photo}
          contentFit="cover"
          transition={80}
          cachePolicy="memory-disk"
          recyclingKey={item.id}
        />
      </Pressable>
    </Animated.View>
  );

  return (
    <Modal visible={!!section} transparent animationType="slide" onRequestClose={close}>
      <Pressable
        style={styles.backdrop}
        onPress={close}
        accessibilityRole="button"
        accessibilityLabel="Close"
      >
        <BlurView
          intensity={18}
          tint={tokens.mode === 'dark' ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      </Pressable>

      <View style={styles.sheet}>
        <View style={styles.grabber} />
        {section ? (
          <>
            <View style={styles.headerRow}>
              <Text style={styles.title} numberOfLines={1}>
                {section.section}
              </Text>
              {section.avgRating != null && Number.isFinite(section.avgRating) ? (
                <View style={styles.ratingRow}>
                  <StarRow value={section.avgRating} size={12} />
                  <Text style={styles.ratingText}>{formatScore(section.avgRating)}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.countLine}>
              {section.photoCount} {section.photoCount === 1 ? 'PHOTO' : 'PHOTOS'} FROM THIS
              SECTION
            </Text>

            <FlatList
              data={section.photos}
              keyExtractor={(p) => p.id}
              renderItem={renderPhoto}
              numColumns={3}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <Text style={styles.empty}>No photos from this section yet.</Text>
              }
            />
          </>
        ) : null}

        <PhotoLightbox
          photo={
            lightboxPhoto
              ? { photoUrl: lightboxPhoto.photoUrl, section: section?.section }
              : null
          }
          onClose={() => setLightboxPhoto(null)}
        />
      </View>
    </Modal>
  );
}

const buildStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
    },
    sheet: {
      backgroundColor: tokens.colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 10,
      paddingBottom: 32,
      maxHeight: '72%',
      borderTopWidth: 1,
      borderColor: tokens.colors.hairline,
    },
    grabber: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: tokens.colors.line,
      alignSelf: 'center',
      marginBottom: 14,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingHorizontal: 20,
    },
    title: {
      flex: 1,
      minWidth: 0,
      fontSize: 18,
      fontWeight: '800',
      letterSpacing: -0.3,
      color: tokens.colors.fg,
    },
    ratingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    ratingText: {
      fontFamily: tokens.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 11.5,
      color: tokens.colors.mute,
    },
    countLine: {
      fontFamily: tokens.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 10,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: tokens.colors.mute,
      paddingHorizontal: 20,
      marginTop: 4,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: tokens.colors.hairline,
    },
    listContent: {
      paddingHorizontal: 18,
      paddingTop: 12,
    },
    cell: {
      width: '33.333%',
      padding: 2,
    },
    photo: {
      width: '100%',
      aspectRatio: 1,
      borderRadius: tokens.radius.sm,
      backgroundColor: tokens.colors.card2,
    },
    empty: {
      fontSize: 13,
      color: tokens.colors.mute,
      paddingVertical: 24,
      textAlign: 'center',
    },
  });
