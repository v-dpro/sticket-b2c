import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { PillButton } from '../../components/ui/PillButton';
import { Input } from '../../components/ui/Input';
import { Screen } from '../../components/ui/Screen';
import { fonts, radius, spacing } from '../../lib/theme';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { useSafeBack } from '../../lib/navigation/safeNavigation';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const goBack = useSafeBack();
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
    subhead: {
      color: t.colors.textMid,
      fontSize: fonts.body,
      lineHeight: 22,
    },
    form: {
      gap: spacing.sm,
    },
    requirementsCard: {
      backgroundColor: t.colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      padding: spacing.lg,
      marginBottom: spacing.lg,
    },
    requirementsTitle: {
      color: t.colors.textMid,
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
      backgroundColor: t.colors.hairline,
      alignItems: 'center',
      justifyContent: 'center',
    },
    reqDotMet: {
      backgroundColor: t.colors.success,
    },
    reqText: {
      fontSize: fonts.caption,
    },
    reqTextMet: {
      color: t.colors.success,
    },
    reqTextUnmet: {
      color: t.colors.textMuted,
    },
  }));

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.container}>
        <Pressable onPress={goBack} style={styles.back} accessibilityRole="button">
          <Ionicons name="arrow-back" size={20} color={tokens.colors.textMid} />
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
                    {req.met ? <Ionicons name="checkmark" size={12} color={tokens.colors.textHi} /> : null}
                  </View>
                  <Text style={[styles.reqText, req.met ? styles.reqTextMet : styles.reqTextUnmet]}>{req.text}</Text>
                </View>
              ))}
            </View>
          </View>

          <PillButton
            title="Reset password"
            size="lg"
            springFeedback
            haptic="light"
            onPress={() => {
              // UI-only; token + API integration later.
              router.replace('/(auth)/sign-in');
            }}
            disabled={!canSubmit}
          />
        </View>
      </View>
    </Screen>
  );
}



