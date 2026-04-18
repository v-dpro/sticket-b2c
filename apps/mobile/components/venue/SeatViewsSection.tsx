import React, { useMemo, useState } from 'react';
import { Dimensions, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SeatView } from '../../types/venue';
import { colors } from '../../lib/theme';

const { width } = Dimensions.get('window');
const PHOTO_SIZE = (width - 48 - 16) / 3;

interface SeatViewsSectionProps {
  seatViews: SeatView[];
  sections: string[];
  onAddPress: () => void;
}

export function SeatViewsSection({ seatViews, sections, onAddPress }: SeatViewsSectionProps) {
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<SeatView | null>(null);

  const filteredViews = useMemo(() => {
    return selectedSection ? seatViews.filter((v) => v.section === selectedSection) : seatViews;
  }, [seatViews, selectedSection]);

  if (seatViews.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Seat Views</Text>
          <Pressable style={styles.addButton} onPress={onAddPress}>
            <Ionicons name="camera" size={18} color={colors.brandPurple} />
            <Text style={styles.addText}>Add View</Text>
          </Pressable>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="camera-outline" size={40} color={colors.textTertiary} />
          <Text style={styles.emptyText}>No seat views yet</Text>
          <Text style={styles.emptySubtext}>Share photos from your seat to help others!</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Seat Views</Text>
        <Pressable style={styles.addButton} onPress={onAddPress}>
          <Ionicons name="camera" size={18} color={colors.brandPurple} />
          <Text style={styles.addText}>Add View</Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sectionFilter}>
        <Pressable
          style={[styles.sectionChip, !selectedSection && styles.sectionChipActive]}
          onPress={() => setSelectedSection(null)}
        >
          <Text style={[styles.sectionText, !selectedSection && styles.sectionTextActive]}>All Sections</Text>
        </Pressable>
        {sections.map((section) => (
          <Pressable
            key={section}
            style={[styles.sectionChip, selectedSection === section && styles.sectionChipActive]}
            onPress={() => setSelectedSection(section)}
          >
            <Text style={[styles.sectionText, selectedSection === section && styles.sectionTextActive]}>{section}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.photoGrid}>
        {filteredViews.slice(0, 6).map((view) => (
          <Pressable key={view.id} style={styles.photoContainer} onPress={() => setSelectedImage(view)}>
            <Image source={{ uri: view.thumbnailUrl || view.photoUrl }} style={styles.photo} />
            <View style={styles.photoLabel}>
              <Text style={styles.photoSection}>{view.section}</Text>
              {view.row ? <Text style={styles.photoRow}>Row {view.row}</Text> : null}
            </View>
          </Pressable>
        ))}
      </View>

      {filteredViews.length > 6 ? (
        <Pressable style={styles.seeAllButton}>
          <Text style={styles.seeAllText}>See all {filteredViews.length} photos</Text>
        </Pressable>
      ) : null}

      <Modal visible={!!selectedImage} transparent animationType="fade" onRequestClose={() => setSelectedImage(null)}>
        <View style={styles.lightbox}>
          <Pressable style={styles.closeButton} onPress={() => setSelectedImage(null)}>
            <Ionicons name="close" size={28} color={colors.textPrimary} />
          </Pressable>

          {selectedImage ? (
            <>
              <Image source={{ uri: selectedImage.photoUrl }} style={styles.lightboxImage} resizeMode="contain" />
              <View style={styles.lightboxInfo}>
                <Text style={styles.lightboxSection}>
                  Section {selectedImage.section}
                  {selectedImage.row ? ` • Row ${selectedImage.row}` : ''}
                </Text>
                <Text style={styles.lightboxUser}>by @{selectedImage.user.username}</Text>
              </View>
            </>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addText: {
    fontSize: 14,
    color: colors.brandPurple,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    marginHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textTertiary,
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 4,
  },
  sectionFilter: {
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  sectionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionChipActive: {
    backgroundColor: colors.brandPurple,
    borderColor: colors.brandPurple,
  },
  sectionText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  sectionTextActive: {
    color: colors.textPrimary,
    fontWeight: '500',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
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
  photoLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 4,
  },
  photoSection: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  photoRow: {
    fontSize: 9,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  seeAllButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  seeAllText: {
    fontSize: 14,
    color: colors.brandCyan,
  },
  lightbox: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  lightboxImage: {
    width,
    height: width,
  },
  lightboxInfo: {
    position: 'absolute',
    bottom: 80,
    alignItems: 'center',
  },
  lightboxSection: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  lightboxUser: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
});



