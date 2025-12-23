import React from 'react';
import { Dimensions, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { EventPhoto } from '../../types/event';

const { width } = Dimensions.get('window');

interface PhotoLightboxProps {
  photo: EventPhoto | null;
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
              {photo.section ? <Text style={styles.sectionText}>Section {photo.section}</Text> : null}
            </View>
          </>
        ) : null}
      </View>
    </Modal>
  );
}

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
    backgroundColor: '#2D2D4A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6B6B8D',
  },
  userName: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  sectionText: {
    fontSize: 12,
    color: '#6B6B8D',
    marginTop: 4,
  },
});



