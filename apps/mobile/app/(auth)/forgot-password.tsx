import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Screen } from '../../components/ui/Screen';
import { colors, fonts, radius, spacing } from '../../lib/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.container}>
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button">
          <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
          <Text style={styles.backText}>Back to Login</Text>
        </Pressable>

        {!sent ? (
          <>
            <View style={styles.header}>
              <Text style={styles.h1}>Reset password</Text>
              <Text style={styles.subhead}>Enter your email and we&apos;ll send you a link to reset your password</Text>
            </View>

            <View style={styles.form}>
              <Input label="Email" placeholder="your@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
              <Button
                title="Send Reset Link"
                onPress={() => {
                  // UI-only; integrate with API/email service later.
                  setSent(true);
                }}
                fullWidth
              />
            </View>
          </>
        ) : (
          <View style={styles.success}>
            <View style={styles.successIconWrap}>
              <LinearGradient
                colors={[`${colors.brandCyan}33`, `${colors.brandPurple}33`, `${colors.brandPink}33`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Ionicons name="mail" size={44} color={colors.brandPurple} />
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

const styles = StyleSheet.create({
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
    color: colors.textSecondary,
    fontSize: fonts.bodySmall,
    fontWeight: fonts.medium,
  },
  header: {
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  h1: {
    color: colors.textPrimary,
    fontSize: fonts.h1,
    fontWeight: fonts.bold,
  },
  h2: {
    color: colors.textPrimary,
    fontSize: fonts.h2,
    fontWeight: fonts.bold,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subhead: {
    color: colors.textSecondary,
    fontSize: fonts.body,
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  successText: {
    color: colors.textSecondary,
    fontSize: fonts.body,
    textAlign: 'center',
  },
  successEmail: {
    color: colors.textPrimary,
    fontSize: fonts.body,
    fontWeight: fonts.semibold,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  muted: {
    color: colors.textMuted,
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
    color: colors.brandCyan,
    fontSize: fonts.body,
    fontWeight: fonts.semibold,
  },
});


