import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import Ionicons from '@expo/vector-icons/Ionicons';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMemo, useState } from 'react';
import { z } from 'zod';

import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Screen } from '../../components/ui/Screen';
import { colors, fonts, radius, spacing } from '../../lib/theme';
import { useSessionStore } from '../../stores/sessionStore';

const schema = z
  .object({
    email: z.string().email('Enter a valid email'),
    username: z.string().min(3, 'Username must be at least 3 characters').max(20, 'Username is too long'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Password must be at least 8 characters'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

export default function SignUpScreen() {
  const router = useRouter();
  const [authError, setAuthError] = useState<string | null>(null);
  const signUp = useSessionStore((s) => s.signUp);
  const storeError = useSessionStore((s) => s.error);
  const isLoading = useSessionStore((s) => s.isLoading);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', username: '', password: '', confirmPassword: '' },
    mode: 'onSubmit',
  });

  const onSubmit = async (values: FormValues) => {
    setAuthError(null);
    await signUp(values.email, values.password, values.username);
    const { user, error } = useSessionStore.getState();
    if (user) {
      router.replace('/');
      return;
    }
    setAuthError(error ?? 'Sign up failed');
  };

  const password = watch('password');
  const requirements = useMemo(
    () => [
      { text: 'At least 8 characters', met: password.length >= 8 },
      { text: 'Contains a number', met: /\d/.test(password) },
      { text: 'Contains uppercase & lowercase', met: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    ],
    [password]
  );

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Logo */}
          <View style={styles.logoWrap}>
            <View style={styles.logoCircle}>
              <Ionicons name="musical-notes" size={40} color={colors.textPrimary} />
            </View>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.h1}>Create account</Text>
            <Text style={styles.subhead}>Start tracking your concert journey</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {authError || storeError ? <Text style={styles.errorText}>{authError ?? storeError}</Text> : null}

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Email"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  placeholder="your@email.com"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  error={errors.email?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="username"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Username"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="username"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={(t) => onChange(t.toLowerCase().replace(/\s/g, ''))}
                  error={errors.username?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={{ marginBottom: spacing.lg }}>
                  <Input
                    label="Password"
                    placeholder="••••••••"
                    secureTextEntry
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    error={errors.password?.message}
                  />

                  {value ? (
                    <View style={styles.requirementsInline}>
                      {requirements.map((req) => (
                        <View key={req.text} style={styles.reqRow}>
                          <View style={[styles.reqDot, req.met && styles.reqDotMet]}>
                            {req.met ? <Ionicons name="checkmark" size={10} color={colors.textPrimary} /> : null}
                          </View>
                          <Text style={[styles.reqText, req.met ? styles.reqTextMet : styles.reqTextUnmet]}>{req.text}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              )}
            />

            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Confirm Password"
                  placeholder="••••••••"
                  secureTextEntry
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  error={errors.confirmPassword?.message}
                />
              )}
            />

            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: agreedToTerms }}
              onPress={() => setAgreedToTerms((v) => !v)}
              style={({ pressed }) => [styles.termsRow, pressed && styles.pressed]}
            >
              <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
                {agreedToTerms ? <Ionicons name="checkmark" size={14} color={colors.textPrimary} /> : null}
              </View>
              <Text style={styles.termsText}>
                I agree to the <Text style={styles.termsLink}>Terms</Text> and <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </Pressable>

            <Button
              title="Create account"
              loading={isSubmitting || isLoading}
              disabled={!agreedToTerms || isSubmitting || isLoading}
              onPress={handleSubmit(onSubmit)}
              fullWidth
            />

            <Text style={styles.footer}>
              Already have an account?{' '}
              <Link href="/(auth)/sign-in" style={styles.footerLink}>
                Log in
              </Link>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: 64,
    paddingBottom: spacing['3xl'],
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  h1: {
    color: colors.textPrimary,
    fontSize: fonts.h1,
    fontWeight: fonts.bold,
    textAlign: 'center',
  },
  subhead: {
    color: colors.textSecondary,
    fontSize: fonts.body,
    textAlign: 'center',
  },
  form: {
    gap: spacing.sm,
  },
  errorText: {
    color: colors.error,
    fontSize: fonts.bodySmall,
    marginBottom: spacing.sm,
  },
  requirementsInline: {
    marginTop: -spacing.sm,
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  reqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reqDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reqDotMet: {
    backgroundColor: colors.success,
  },
  reqText: {
    fontSize: 12,
  },
  reqTextMet: {
    color: colors.success,
  },
  reqTextUnmet: {
    color: colors.textMuted,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.brandPurple,
    borderColor: colors.brandPurple,
  },
  termsText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: fonts.bodySmall,
    lineHeight: 20,
  },
  termsLink: {
    color: colors.brandCyan,
    fontWeight: fonts.semibold,
  },
  pressed: {
    opacity: 0.85,
  },
  footer: {
    color: colors.textSecondary,
    fontSize: fonts.bodySmall,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  footerLink: {
    color: colors.brandCyan,
    fontWeight: fonts.semibold,
  },
});


