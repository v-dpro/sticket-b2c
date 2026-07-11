import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { PillButton } from '../../components/ui/PillButton';
import { Input } from '../../components/ui/Input';
import { Screen } from '../../components/ui/Screen';
import { fonts, radius, spacing } from '../../lib/theme';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { useSafeBack } from '../../lib/navigation/safeNavigation';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const goBack = useSafeBack();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    container: {
      flex: 1,
      paddingHorizontal: spacing.xl,
      paddingTop: 64,
      paddingBottom: spacing['3xl'],
    },
    back: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.xl,
    },
    backText: {
      color: t.colors.textMid,
      fontSize: fonts.bodySmall,
      fontWeight: fonts.medium,
    },
    header: {
      marginBottom: spacing.xl,
      gap: spacing.sm,
    },
    h1: {
      color: t.colors.textHi,
      fontSize: 30,
      fontWeight: '800',
      letterSpacing: -0.6,
    },
    h2: {
      color: t.colors.textHi,
      fontSize: 24,
      fontWeight: '800',
      letterSpacing: -0.5,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    subhead: {
      color: t.colors.textMid,
      fontSize: 14,
      lineHeight: 22,
    },
    form: {
      gap: spacing.lg,
    },
    success: {
      flex: 1,
      alignItems: 'center',
      paddingTop: spacing['2xl'],
    },
    successIconWrap: {
      width: 96,
      height: 96,
      borderRadius: radius.full,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xl,
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.hairline,
    },
    successText: {
      color: t.colors.textMid,
      fontSize: fonts.body,
      textAlign: 'center',
    },
    successEmail: {
      color: t.colors.textHi,
      fontSize: fonts.body,
      fontWeight: fonts.semibold,
      marginTop: spacing.sm,
      marginBottom: spacing.xl,
      textAlign: 'center',
    },
    muted: {
      color: t.colors.textMuted,
      fontSize: fonts.bodySmall,
      textAlign: 'center',
      marginBottom: spacing.xl,
      lineHeight: 20,
    },
    sendAgain: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    sendAgainText: {
      color: t.colors.textHi,
      fontSize: fonts.body,
      fontWeight: fonts.semibold,
    },
  }));

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.container}>
        <Pressable onPress={goBack} style={styles.back} accessibilityRole="button">
          <Ionicons name="arrow-back" size={20} color={tokens.colors.textMid} />
          <Text style={styles.backText}>Back to Login</Text>
        </Pressable>

        {!sent ? (
          <>
            <View style={styles.header}>
              <Text style={styles.h1}>Reset password.</Text>
              <Text style={styles.subhead}>Enter your email and we&apos;ll send you a link to reset your password</Text>
            </View>

            <View style={styles.form}>
              <Input label="Email" placeholder="your@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
              <PillButton
                title="Send reset link"
                size="lg"
                springFeedback
                haptic="light"
                onPress={() => {
                  // UI-only; integrate with API/email service later.
                  setSent(true);
                }}
              />
            </View>
          </>
        ) : (
          <View style={styles.success}>
            <View style={styles.successIconWrap}>
              <Ionicons name="mail-outline" size={40} color={tokens.colors.textMid} />
            </View>

            <Text style={styles.h2}>Check your email</Text>
            <Text style={styles.successText}>We sent a password reset link to</Text>
            <Text style={styles.successEmail}>{email || 'your@email.com'}</Text>
            <Text style={styles.muted}>Didn&apos;t receive the email? Check your spam folder or try again</Text>

            <Pressable onPress={() => setSent(false)} style={styles.sendAgain} accessibilityRole="button">
              <Text style={styles.sendAgainText}>Send again</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Screen>
  );
}


