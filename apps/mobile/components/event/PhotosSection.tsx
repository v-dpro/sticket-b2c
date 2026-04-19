import React, { useState } from 'react';
import { Dimensions, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { EventPhoto } from '../../types/event';
import { PhotoLightbox } from './PhotoLightbox';
import { colors, radius } from '../../lib/theme';

const { width } = Dimensions.get('window');
const GRID_GAP = 4;
const GRID_PADDING = 16;
const PHOTO_SIZE = (width - GRID_PADDING * 2 - GRID_GAP * 2) / 3;
const monoFont = Platform.select({ ios: 'Menlo', android: 'monospace' }) ?? 'monospace';

interface PhotosSectionProps {
  photos: EventPhoto[];
  onLoadMore: () => void;
  hasMore: boolean;
}

export function PhotosSection({ photos, onLoadMore, hasMore }: PhotosSectionProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<EventPhoto | null>(null);

  if (photos.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={[styles.sectionLabel, { paddingHorizontal: GRID_PADDING }]}>PHOTOS</Text>
        <View style={styles.emptyContainer}>
          <Ionicons name="camera-outline" size={32} color={colors.textLo} />
          <Text style={styles.emptyText}>No photos yet</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionLabel}>PHOTOS</Text>
        <Text style={styles.count}>{photos.length}</Text>
      </View>

      <View style={styles.grid}>
        {photos.slice(0, 9).map((photo, index) => (
          <Pressable key={photo.id} style={styles.photoContainer} onPress={() => setSelectedPhoto(photo)}>
            <Image source={{ uri: photo.thumbnailUrl || photo.photoUrl }} style={styles.photo} />
            {index === 8 && photos.length > 9 ? (
              <View style={styles.moreOverlay}>
                <Text style={styles.moreText}>+{photos.length - 9}</Text>
              </View>
            ) : null}
          </Pressable>
        ))}
      </View>

      {hasMore ? (
        <Pressable style={styles.loadMoreButton} onPress={onLoadMore}>
          <Text style={styles.loadMoreText}>Load more photos</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.brandCyan} />
        </Pressable>
      ) : null}

      <PhotoLightbox photo={selectedPhoto} onClose={() => setSelectedPhoto(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: GRID_PADDING,
    marginBottom: 10,
    gap: 8,
  },
  sectionLabel: {
    fontFamily: monoFont,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 2,
    color: colors.textLo,
  },
  count: {
    fontSize: 12,
    color: colors.textLo,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 28,
    marginHorizontal: GRID_PADDING,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textLo,
    marginTop: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: GRID_PADDING,
    gap: GRID_GAP,
  },
  photoContainer: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 4,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  moreOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textHi,
  },
  loadMoreButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    marginHorizontal: GRID_PADDING,
    marginTop: 6,
  },
  loadMoreText: {
    color: colors.brandCyan,
    fontSize: 13,
  },
});
