import React, { useState } from 'react';
import { Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { EventPhoto } from '../../types/event';
import { PhotoLightbox } from './PhotoLightbox';

const { width } = Dimensions.get('window');
const PHOTO_SIZE = (width - 48) / 3;

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
        <Text style={styles.title}>Photos</Text>
        <View style={styles.emptyContainer}>
          <Ionicons name="camera-outline" size={40} color="#6B6B8D" />
          <Text style={styles.emptyText}>No photos yet</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Photos</Text>
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
          <Ionicons name="chevron-forward" size={16} color="#00D4FF" />
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
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  count: {
    fontSize: 14,
    color: '#6B6B8D',
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    marginHorizontal: 16,
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B6B8D',
    marginTop: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 4,
  },
  photoContainer: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  moreOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  loadMoreButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 8,
  },
  loadMoreText: {
    color: '#00D4FF',
    fontSize: 14,
  },
});



