import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Stack, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { z } from 'zod';

import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Screen } from '../../components/ui/Screen';
import { colors, fonts, radius, spacing } from '../../lib/theme';
import { useSessionStore } from '../../stores/sessionStore';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type FormValues = z.infer<typeof schema>;

export default function SignInScreen() {
  const router = useRouter();
  const [authError, setAuthError] = useState<string | null>(null);
  const signIn = useSessionStore((s) => s.signIn);
  const storeError = useSessionStore((s) => s.error);
  const isLoading = useSessionStore((s) => s.isLoading);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
    mode: 'onSubmit',
  });

  const onSubmit = async (values: FormValues) => {
    setAuthError(null);
    await signIn(values.email, values.password);
    const { user, error } = useSessionStore.getState();
    if (user) {
      router.replace('/');
      return;
    }
    setAuthError(error ?? 'Sign in failed');
  };

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoWrap}>
            <View style={styles.logoCircle}>
              <Ionicons name="musical-notes" size={40} color={colors.textPrimary} />
            </View>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.h1}>Welcome back</Text>
            <Text style={styles.subhead}>Log in to continue tracking your shows</Text>
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
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Password"
                  placeholder="••••••••"
                  secureTextEntry
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  error={errors.password?.message}
                />
              )}
            />

            <Pressable onPress={() => router.push('/(auth)/forgot-password')} style={styles.forgot} accessibilityRole="button">
              <Text style={styles.forgotText}>Forgot password?</Text>
            </Pressable>

            <Button
              title="Log In"
              loading={isSubmitting || isLoading}
              disabled={isSubmitting || isLoading}
              onPress={handleSubmit(onSubmit)}
              fullWidth
            />

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social */}
            <View style={styles.socialList}>
              <Pressable
                accessibilityRole="button"
                onPress={() => Alert.alert('Apple Sign In', 'Not wired up in this build yet.')}
                style={({ pressed }) => [styles.socialBtn, pressed && styles.pressed]}
              >
                <Ionicons name="logo-apple" size={20} color={colors.textPrimary} />
                <Text style={styles.socialText}>Continue with Apple</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => Alert.alert('Google Sign In', 'Not wired up in this build yet.')}
                style={({ pressed }) => [styles.socialBtn, pressed && styles.pressed]}
              >
                <Ionicons name="logo-google" size={20} color={colors.textPrimary} />
                <Text style={styles.socialText}>Continue with Google</Text>
              </Pressable>
            </View>

            {/* Sign up */}
            <Text style={styles.footer}>
              Don&apos;t have an account?{' '}
              <Link href="/(auth)/sign-up" style={styles.footerLink}>
                Sign Up
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
  forgot: {
    alignSelf: 'flex-end',
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  forgotText: {
    color: colors.brandCyan,
    fontSize: fonts.bodySmall,
    fontWeight: fonts.medium,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textMuted,
    fontSize: fonts.bodySmall,
  },
  socialList: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  socialBtn: {
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  socialText: {
    color: colors.textPrimary,
    fontSize: fonts.body,
    fontWeight: fonts.semibold,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  footer: {
    color: colors.textSecondary,
    fontSize: fonts.bodySmall,
    textAlign: 'center',
  },
  footerLink: {
    color: colors.brandCyan,
    fontWeight: fonts.semibold,
  },
});



