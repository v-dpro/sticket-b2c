import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Screen } from '../../components/ui/Screen';
import { colors, fonts, radius, spacing } from '../../lib/theme';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const requirements = useMemo(
    () => [
      { text: 'At least 8 characters', met: newPassword.length >= 8 },
      { text: 'Contains a number', met: /\d/.test(newPassword) },
      { text: 'Contains uppercase & lowercase', met: /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword) },
    ],
    [newPassword]
  );

  const passwordsMatch = Boolean(newPassword) && newPassword === confirmPassword;
  const allMet = requirements.every((r) => r.met);
  const canSubmit = allMet && passwordsMatch;

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.container}>
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button">
          <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.h1}>New password</Text>
          <Text style={styles.subhead}>Create a new password for your account</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="New Password"
            placeholder="••••••••"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />

          <Input
            label="Confirm Password"
            placeholder="••••••••"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={confirmPassword && !passwordsMatch ? "Passwords don't match" : undefined}
          />

          <View style={styles.requirementsCard}>
            <Text style={styles.requirementsTitle}>Password must contain:</Text>
            <View style={{ gap: spacing.sm }}>
              {requirements.map((req) => (
                <View key={req.text} style={styles.reqRow}>
                  <View style={[styles.reqDot, req.met && styles.reqDotMet]}>
                    {req.met ? <Ionicons name="checkmark" size={12} color={colors.textPrimary} /> : null}
                  </View>
                  <Text style={[styles.reqText, req.met ? styles.reqTextMet : styles.reqTextUnmet]}>{req.text}</Text>
                </View>
              ))}
            </View>
          </View>

          <Button
            title="Reset Password"
            onPress={() => {
              // UI-only; token + API integration later.
              router.replace('/(auth)/sign-in');
            }}
            disabled={!canSubmit}
            fullWidth
          />
        </View>
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
  subhead: {
    color: colors.textSecondary,
    fontSize: fonts.body,
    lineHeight: 22,
  },
  form: {
    gap: spacing.sm,
  },
  requirementsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  requirementsTitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: fonts.medium,
    marginBottom: spacing.md,
  },
  reqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reqDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reqDotMet: {
    backgroundColor: colors.success,
  },
  reqText: {
    fontSize: fonts.caption,
  },
  reqTextMet: {
    color: colors.success,
  },
  reqTextUnmet: {
    color: colors.textMuted,
  },
});



