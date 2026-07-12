// PhotoLightbox — full-screen photo modal on an intentionally BLACK backdrop.
// The backdrop and everything layered over it keep FIXED light-on-dark colors
// (not theme tokens) in both light and dark mode.

import React from 'react';
import { Dimensions, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

const { width } = Dimensions.get('window');

// Structural subset of EventPhoto — `user` is optional so authorless photos
// (e.g. per-section seat views) can reuse the same viewer.
export interface LightboxPhoto {
  photoUrl: string;
  user?: {
    username: string;
    avatarUrl?: string;
  };
  section?: string;
}

interface PhotoLightboxProps {
  photo: LightboxPhoto | null;
  onClose: () => void;
}

export function PhotoLightbox({ photo, onClose }: PhotoLightboxProps) {
  return (
    <Modal visible={!!photo} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.lightbox}>
        <Pressable style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </Pressable>

        {photo ? (
          <>
            <Image source={{ uri: photo.photoUrl }} style={styles.lightboxImage} resizeMode="contain" />
            <View style={styles.photoInfo}>
              {photo.user ? (
                <View style={styles.userInfo}>
                  {photo.user.avatarUrl ? (
                    <Image source={{ uri: photo.user.avatarUrl }} style={styles.userAvatar} />
                  ) : (
                    <View style={[styles.userAvatar, styles.avatarPlaceholder]}>
                      <Text style={styles.avatarText}>{photo.user.username.charAt(0)}</Text>
                    </View>
                  )}
                  <Text style={styles.userName}>@{photo.user.username}</Text>
                </View>
              ) : null}
              {photo.section ? <Text style={styles.sectionText}>Section {photo.section}</Text> : null}
            </View>
          </>
        ) : null}
      </View>
    </Modal>
  );
}

// NOTE: colors are intentionally FIXED — the lightbox sits on a black backdrop
// in every theme, so overlaid text/icons read as light-on-dark in both modes.
const styles = StyleSheet.create({
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
    width: width,
    height: width,
  },
  photoInfo: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  avatarPlaceholder: {
    backgroundColor: '#1C1C26',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#5A5A6C',
  },
  userName: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  sectionText: {
    fontSize: 12,
    color: '#5A5A6C',
    marginTop: 4,
  },
});
