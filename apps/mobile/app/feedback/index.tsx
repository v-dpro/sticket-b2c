import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Screen } from '../../components/ui/Screen';
import { submitFeedback, type FeedbackType } from '../../lib/api/feedback';
import { colors, radius, spacing } from '../../lib/theme';
import { useSession } from '../../hooks/useSession';

export default function FeedbackScreen() {
  const router = useRouter();
  const { user } = useSession();

  const [type, setType] = useState<FeedbackType>('bug');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const placeholder = useMemo(() => {
    if (type === 'bug') return 'Describe the bug you encountered…';
    if (type === 'feature') return 'Describe the feature you’d like…';
    return 'What’s on your mind?';
  }, [type]);

  const onSubmit = async () => {
    if (!message.trim()) {
      Alert.alert('Missing message', 'Please enter your feedback.');
      return;
    }

    setSending(true);
    try {
      await submitFeedback({ type, message: message.trim(), userId: user?.id, email: user?.email, path: '/feedback' });
      Alert.alert('Thank you!', 'Your feedback has been submitted.');
      setMessage('');
      router.back();
    } catch {
      Alert.alert('Couldn\'t send', 'Failed to submit feedback. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button">
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Feedback</Text>
        <View style={{ width: 40 }} />
      </View>

      <Text style={styles.subtitle}>Tell us what’s working and what’s not. This goes straight to the team.</Text>

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
        numberOfLines={8}
      />

      <Pressable
        style={[styles.submit, sending && styles.submitDisabled]}
        onPress={() => void onSubmit()}
        disabled={sending}
        accessibilityRole="button"
      >
        {sending ? <ActivityIndicator color={colors.textPrimary} /> : <Text style={styles.submitText}>Submit</Text>}
      </Pressable>

      <View style={{ height: spacing.lg }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  subtitle: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    lineHeight: 20,
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  typeChip: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeChipActive: {
    borderColor: colors.brandPurple,
    backgroundColor: 'rgba(139, 92, 246, 0.18)',
  },
  typeText: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.textTertiary,
  },
  typeTextActive: {
    color: colors.brandPurple,
  },
  input: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: 15,
    height: 180,
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



