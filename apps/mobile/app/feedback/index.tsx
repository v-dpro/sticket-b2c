import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';

import { Screen } from '../../components/ui/Screen';
import { submitFeedback, type FeedbackType } from '../../lib/api/feedback';
import { radius, spacing } from '../../lib/theme';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { useSession } from '../../hooks/useSession';
import { useSafeBack } from '../../lib/navigation/safeNavigation';

export default function FeedbackScreen() {
  const router = useRouter();
  const { user } = useSession();
  const goBack = useSafeBack();
  const { tokens } = useTheme();

  const [type, setType] = useState<FeedbackType>('bug');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const styles = useThemedStyles((t) => ({
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
      color: t.colors.textHi,
    },
    subtitle: {
      marginTop: spacing.sm,
      marginBottom: spacing.md,
      fontSize: 14,
      fontWeight: '700',
      color: t.colors.textMid,
      lineHeight: 20,
    },
    typeRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    typeChip: {
      flex: 1,
      backgroundColor: t.colors.inkAlt,
      borderRadius: radius.md,
      paddingVertical: 10,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: t.colors.hairline,
    },
    typeChipActive: {
      borderColor: t.colors.line,
      backgroundColor: 'rgba(139, 92, 246, 0.18)',
    },
    typeText: {
      fontSize: 13,
      fontWeight: '900',
      color: t.colors.textLo,
    },
    typeTextActive: {
      color: t.colors.fg,
    },
    input: {
      backgroundColor: t.colors.inkAlt,
      borderRadius: radius.md,
      padding: spacing.md,
      color: t.colors.textHi,
      fontSize: 15,
      height: 180,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      marginBottom: spacing.md,
    },
    submit: {
      backgroundColor: t.colors.inverseBg,
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
      color: t.colors.textHi,
    },
  }));

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
      goBack();
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
        <Pressable onPress={goBack} style={styles.backButton} accessibilityRole="button">
          <Ionicons name="arrow-back" size={22} color={tokens.colors.textHi} />
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
        placeholderTextColor={tokens.colors.textLo}
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
        {sending ? <ActivityIndicator color={tokens.colors.textHi} /> : <Text style={styles.submitText}>Submit</Text>}
      </Pressable>

      <View style={{ height: spacing.lg }} />
    </Screen>
  );
}



