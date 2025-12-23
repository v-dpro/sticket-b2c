import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';

interface ShareSheetProps {
  visible: boolean;
  onClose: () => void;
  onShareInstagram: () => void;
  onShareTwitter: () => void;
  onCopyLink: () => void;
  onShareMore: () => void;
  onSaveImage: () => void;
}

export function ShareSheet({
  visible,
  onClose,
  onShareInstagram,
  onShareTwitter,
  onCopyLink,
  onShareMore,
  onSaveImage,
}: ShareSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <BlurView intensity={20} style={StyleSheet.absoluteFill} />
      </Pressable>

      <View style={styles.sheet}>
        <View style={styles.handle} />

        <Text style={styles.title}>Share</Text>

        <View style={styles.options}>
          <Pressable style={styles.option} onPress={onShareInstagram} accessibilityRole="button">
            <View style={[styles.iconContainer, { backgroundColor: '#E1306C20' }]}>
              <Ionicons name="logo-instagram" size={24} color="#E1306C" />
            </View>
            <Text style={styles.optionLabel}>Instagram</Text>
          </Pressable>

          <Pressable style={styles.option} onPress={onShareTwitter} accessibilityRole="button">
            <View style={[styles.iconContainer, { backgroundColor: '#1DA1F220' }]}>
              <Ionicons name="logo-twitter" size={24} color="#1DA1F2" />
            </View>
            <Text style={styles.optionLabel}>Twitter</Text>
          </Pressable>

          <Pressable style={styles.option} onPress={onCopyLink} accessibilityRole="button">
            <View style={[styles.iconContainer, { backgroundColor: '#8B5CF620' }]}>
              <Ionicons name="link" size={24} color="#8B5CF6" />
            </View>
            <Text style={styles.optionLabel}>Copy Link</Text>
          </Pressable>

          <Pressable style={styles.option} onPress={onSaveImage} accessibilityRole="button">
            <View style={[styles.iconContainer, { backgroundColor: '#22C55E20' }]}>
              <Ionicons name="download" size={24} color="#22C55E" />
            </View>
            <Text style={styles.optionLabel}>Save</Text>
          </Pressable>

          <Pressable style={styles.option} onPress={onShareMore} accessibilityRole="button">
            <View style={[styles.iconContainer, { backgroundColor: '#6B6B8D20' }]}>
              <Ionicons name="ellipsis-horizontal" size={24} color="#6B6B8D" />
            </View>
            <Text style={styles.optionLabel}>More</Text>
          </Pressable>
        </View>

        <Pressable style={styles.cancelButton} onPress={onClose} accessibilityRole="button">
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#1A1A2E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#3A3B5D',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 24,
  },
  options: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  option: {
    alignItems: 'center',
    width: 60,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionLabel: {
    fontSize: 12,
    color: '#A0A0B8',
  },
  cancelButton: {
    backgroundColor: '#0A0B1E',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});



