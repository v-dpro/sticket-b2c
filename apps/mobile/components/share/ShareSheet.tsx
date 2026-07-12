import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { BottomSheet } from '../ui/BottomSheet';

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
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    body: {
      paddingHorizontal: 24,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: t.colors.textHi,
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
      color: t.colors.textMid,
    },
    cancelButton: {
      backgroundColor: t.colors.ink,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    cancelText: {
      fontSize: 16,
      fontWeight: '500',
      color: t.colors.textHi,
    },
  }));

  return (
    <BottomSheet visible={visible} onClose={onClose} accessibilityLabel="Share">
      <View style={styles.body}>
        <Text style={styles.title}>Share</Text>

        <View style={styles.options}>
          <Pressable style={styles.option} onPress={onShareInstagram} accessibilityRole="button">
            {/* Instagram brand color — fixed */}
            <View style={[styles.iconContainer, { backgroundColor: '#E1306C20' }]}>
              <Ionicons name="logo-instagram" size={24} color="#E1306C" />
            </View>
            <Text style={styles.optionLabel}>Instagram</Text>
          </Pressable>

          <Pressable style={styles.option} onPress={onShareTwitter} accessibilityRole="button">
            {/* Twitter brand color — fixed */}
            <View style={[styles.iconContainer, { backgroundColor: '#1DA1F220' }]}>
              <Ionicons name="logo-twitter" size={24} color="#1DA1F2" />
            </View>
            <Text style={styles.optionLabel}>Twitter</Text>
          </Pressable>

          <Pressable style={styles.option} onPress={onCopyLink} accessibilityRole="button">
            <View style={[styles.iconContainer, { backgroundColor: '#8B5CF620' }]}>
              <Ionicons name="link" size={24} color={tokens.colors.mute} />
            </View>
            <Text style={styles.optionLabel}>Copy Link</Text>
          </Pressable>

          <Pressable style={styles.option} onPress={onSaveImage} accessibilityRole="button">
            <View style={[styles.iconContainer, { backgroundColor: '#22C55E20' }]}>
              <Ionicons name="download" size={24} color={tokens.colors.success} />
            </View>
            <Text style={styles.optionLabel}>Save</Text>
          </Pressable>

          <Pressable style={styles.option} onPress={onShareMore} accessibilityRole="button">
            <View style={[styles.iconContainer, { backgroundColor: '#6B6B8D20' }]}>
              <Ionicons name="ellipsis-horizontal" size={24} color={tokens.colors.textLo} />
            </View>
            <Text style={styles.optionLabel}>More</Text>
          </Pressable>
        </View>

        <Pressable style={styles.cancelButton} onPress={onClose} accessibilityRole="button">
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}
