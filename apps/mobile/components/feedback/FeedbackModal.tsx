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
              <Ionicons name="close" size={22} color={colors.textLo} />
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
                    color={active ? colors.brandPurple : colors.textLo}
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
            placeholderTextColor={colors.textLo}
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
            {sending ? <ActivityIndicator color={colors.textHi} /> : <Text style={styles.submitText}>Submit</Text>}
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
    backgroundColor: colors.elevated,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
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
    color: colors.textHi,
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
    backgroundColor: colors.ink,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  typeChipActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.18)',
    borderColor: colors.brandPurple,
  },
  typeText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textLo,
  },
  typeTextActive: {
    color: colors.brandPurple,
  },
  input: {
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.textHi,
    fontSize: 15,
    height: 140,
    borderWidth: 1,
    borderColor: colors.hairline,
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
    color: colors.textHi,
  },
});



