// Sign in — email/password on card2 fields, monochrome buttons,
// social sign-in below. Wired to the existing session store.

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { AuthField } from '../../components/auth/AuthField';
import { PillButton } from '../../components/ui/PillButton';
import { SpringPressable } from '../../components/ui/SpringPressable';
import { useSocialAuth } from '../../hooks/useSocialAuth';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { useSessionStore } from '../../stores/sessionStore';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type FormValues = z.infer<typeof schema>;

export default function SignInScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    safe: { flex: 1, backgroundColor: t.colors.bg },
    content: {
      paddingHorizontal: t.density.pad,
      paddingBottom: 48,
      gap: t.density.gap,
    },
    backRow: { paddingVertical: 12, alignSelf: 'flex-start' },
    title: {
      fontSize: 30,
      fontWeight: '800',
      letterSpacing: -0.6,
      color: t.colors.fg,
    },
    subtitle: { fontSize: 14, color: t.colors.textSoft, marginTop: -6 },
    error: { fontSize: 13, color: t.colors.error },
    forgotRow: { alignSelf: 'flex-end', marginTop: -4 },
    forgotText: { fontSize: 13, fontWeight: '600', color: t.colors.mute },
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginVertical: 6,
    },
    dividerLine: { flex: 1, height: 1, backgroundColor: t.colors.hairline },
    dividerText: { fontSize: 12, color: t.colors.muteSoft },
    footer: {
      alignItems: 'center',
      paddingVertical: 14,
    },
    footerText: { fontSize: 14, color: t.colors.mute },
    footerLink: { fontWeight: '600', color: t.colors.fg },
  }));

  const [authError, setAuthError] = useState<string | null>(null);
  const signIn = useSessionStore((s) => s.signIn);
  const isLoading = useSessionStore((s) => s.isLoading);

  const {
    showAppleButton,
    appleLoading,
    signInWithApple,
    showGoogleButton,
    googleLoading,
    signInWithGoogle,
    error: socialError,
  } = useSocialAuth({ onSuccess: () => router.replace('/') });

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

  const busy = isSubmitting || isLoading;
  const displayError = authError ?? socialError;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <SpringPressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/welcome'))}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={styles.backRow}
          >
            <Ionicons name="chevron-back" size={24} color={tokens.colors.fg} />
          </SpringPressable>

          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Pick up where your last show left off.</Text>

          {displayError ? <Text style={styles.error}>{displayError}</Text> : null}

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <AuthField
                label="Email"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                keyboardType="email-address"
                returnKeyType="next"
                placeholder="you@example.com"
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
              <AuthField
                label="Password"
                placeholder="••••••••"
                secureTextEntry
                autoComplete="password"
                returnKeyType="go"
                onSubmitEditing={() => void handleSubmit(onSubmit)()}
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.password?.message}
              />
            )}
          />

          <SpringPressable
            onPress={() => router.push('/(auth)/forgot-password')}
            accessibilityRole="button"
            accessibilityLabel="Forgot password"
            style={styles.forgotRow}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </SpringPressable>

          <PillButton
            title={busy ? 'Signing in…' : 'Sign in'}
            size="lg"
            springFeedback
            haptic="light"
            disabled={busy}
            icon={busy ? <ActivityIndicator size="small" color={tokens.colors.inverseFg} /> : undefined}
            onPress={handleSubmit(onSubmit)}
          />

          {showAppleButton || showGoogleButton ? (
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>
          ) : null}

          {showAppleButton ? (
            <PillButton
              title="Continue with Apple"
              variant="secondary"
              size="lg"
              springFeedback
              haptic="light"
              disabled={appleLoading}
              icon={
                appleLoading ? (
                  <ActivityIndicator size="small" color={tokens.colors.text} />
                ) : (
                  <Ionicons name="logo-apple" size={18} color={tokens.colors.text} />
                )
              }
              onPress={() => void signInWithApple()}
            />
          ) : null}

          {showGoogleButton ? (
            <PillButton
              title="Continue with Google"
              variant="secondary"
              size="lg"
              springFeedback
              haptic="light"
              disabled={googleLoading}
              icon={
                googleLoading ? (
                  <ActivityIndicator size="small" color={tokens.colors.text} />
                ) : (
                  <Ionicons name="logo-google" size={17} color={tokens.colors.text} />
                )
              }
              onPress={signInWithGoogle}
            />
          ) : null}

          <SpringPressable
            onPress={() => router.push('/(auth)/sign-up')}
            accessibilityRole="button"
            accessibilityLabel="Create an account"
            style={styles.footer}
          >
            <Text style={styles.footerText}>
              New here? <Text style={styles.footerLink}>Create an account</Text>
            </Text>
          </SpringPressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
