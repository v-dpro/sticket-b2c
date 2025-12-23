import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';

import { submitFeedback, type FeedbackType } from '../../lib/api/feedback';
import { colors, radius, spacing } from '../../lib/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  defaultType?: FeedbackType;
  context?: {
    userId?: string;
    email?: string;
    path?: string;
  };
};

export function FeedbackModal({ visible, onClose, defaultType = 'bug', context }: Props) {
  const [type, setType] = useState<FeedbackType>(defaultType);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const placeholder = useMemo(() => {
    if (type === 'bug') return 'Describe the bug you encountered…';
    if (type === 'feature') return 'Describe the feature you’d like…';
    return 'What’s on your mind?';
  }, [type]);

  const handleSubmit = async () => {
    if (!message.trim()) {
      Alert.alert('Missing message', 'Please enter your feedback.');
      return;
    }

    setSending(true);
    try {
      await submitFeedback({
        type,
        message: message.trim(),
        userId: context?.userId,
        email: context?.email,
        path: context?.path,
      });

      Alert.alert('Thank you!', 'Your feedback has been submitted.');
      setMessage('');
      onClose();
    } catch (err) {
      Alert.alert('Couldn\'t send', 'Failed to submit feedback. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <BlurView intensity={80} style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Send Feedback</Text>
            <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button">
              <Ionicons name="close" size={22} color={colors.textTertiary} />
            </Pressable>
          </View>

          <View style={styles.typeRow}>
            {(['bug', 'feature', 'other'] as const).map((t) => {
              const active = type === t;
              return (
                <Pressable
                  key={t}
                  style={[styles.typeChip, active && styles.typeChipActive]}
                  onPress={() => setType(t)}
                  accessibilityRole="button"
                >
                  <Ionicons
                    name={t === 'bug' ? 'bug' : t === 'feature' ? 'bulb' : 'chatbubble'}
                    size={15}
                    color={active ? colors.brandPurple : colors.textTertiary}
                  />
                  <Text style={[styles.typeText, active && styles.typeTextActive]}>
                    {t === 'bug' ? 'Bug' : t === 'feature' ? 'Feature' : 'Other'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor={colors.textTertiary}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={6}
          />

          <Pressable
            style={[styles.submit, sending && styles.submitDisabled]}
            onPress={() => void handleSubmit()}
            disabled={sending}
            accessibilityRole="button"
          >
            {sending ? <ActivityIndicator color={colors.textPrimary} /> : <Text style={styles.submitText}>Submit</Text>}
          </Pressable>
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  typeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeChipActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.18)',
    borderColor: colors.brandPurple,
  },
  typeText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textTertiary,
  },
  typeTextActive: {
    color: colors.brandPurple,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: 15,
    height: 140,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  submit: {
    backgroundColor: colors.brandPurple,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitDisabled: {
    opacity: 0.7,
  },
  submitText: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.textPrimary,
  },
});



