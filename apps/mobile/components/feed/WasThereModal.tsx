import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { colors, radius } from '../../lib/theme';

export function WasThereModal({
  visible,
  onClose,
  onConfirm,
  loading,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <Ionicons name="checkmark-circle" size={22} color={colors.success} />
            <Text style={styles.title}>I was there too</Text>
          </View>
          <Text style={styles.body}>We’ll add this show to your history (if you haven’t logged it yet) and connect you to this post.</Text>

          <View style={styles.actions}>
            <Pressable style={[styles.button, styles.secondary]} onPress={onClose} accessibilityRole="button">
              <Text style={styles.secondaryText}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.primary, loading && { opacity: 0.7 }]} onPress={onConfirm} disabled={loading} accessibilityRole="button">
              <Text style={styles.primaryText}>{loading ? 'Saving…' : 'Confirm'}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  sheet: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  title: {
    color: colors.textPrimary,
    fontWeight: '900',
    fontSize: 16,
  },
  body: {
    color: colors.textSecondary,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryText: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  primary: {
    backgroundColor: colors.brandPurple,
  },
  primaryText: {
    color: colors.textPrimary,
    fontWeight: '800',
  },
});



