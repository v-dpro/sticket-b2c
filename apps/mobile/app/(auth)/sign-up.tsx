// Sign up — email/username/password on card2 fields, live password
// checklist, terms agreement, monochrome buttons. Wired to the existing
// session store.

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
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

const schema = z
  .object({
    email: z.string().email('Enter a valid email'),
    username: z.string().min(3, 'At least 3 characters').max(20, 'Max 20 characters'),
    password: z.string().min(8, 'At least 8 characters'),
    confirmPassword: z.string().min(8, 'At least 8 characters'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

export default function SignUpScreen() {
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
    checklist: { gap: 6, paddingHorizontal: 4, marginTop: -4 },
    checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    checkText: { fontSize: 12, color: t.colors.mute },
    checkTextMet: { color: t.colors.success },
    termsRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      marginTop: 2,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 7,
      borderWidth: 1.5,
      borderColor: t.colors.line,
      backgroundColor: t.colors.card2,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    checkboxChecked: {
      backgroundColor: t.colors.inverseBg,
      borderColor: t.colors.inverseBg,
    },
    termsText: { flex: 1, fontSize: 13, lineHeight: 19, color: t.colors.mute },
    termsLink: { fontWeight: '600', color: t.colors.fg },
    dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 6 },
    dividerLine: { flex: 1, height: 1, backgroundColor: t.colors.hairline },
    dividerText: { fontSize: 12, color: t.colors.muteSoft },
    footer: { alignItems: 'center', paddingVertical: 14 },
    footerText: { fontSize: 14, color: t.colors.mute },
    footerLink: { fontWeight: '600', color: t.colors.fg },
  }));

  const [authError, setAuthError] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const signUp = useSessionStore((s) => s.signUp);
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
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', username: '', password: '', confirmPassword: '' },
    mode: 'onSubmit',
  });

  const password = watch('password');
  const requirements = useMemo(
    () => [
      { text: 'At least 8 characters', met: password.length >= 8 },
      { text: 'Contains a number', met: /\d/.test(password) },
      { text: 'Upper & lower case', met: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    ],
    [password]
  );

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

          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Every show you&apos;ve seen, in one place.</Text>

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
            name="username"
            render={({ field: { onChange, onBlur, value } }) => (
              <AuthField
                label="Username"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
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
              <View style={{ gap: 10 }}>
                <AuthField
                  label="Password"
                  placeholder="••••••••"
                  secureTextEntry
                  autoComplete="new-password"
                  returnKeyType="next"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  error={errors.password?.message}
                />
                {value ? (
                  <View style={styles.checklist}>
                    {requirements.map((req) => (
                      <View key={req.text} style={styles.checkRow}>
                        <Ionicons
                          name={req.met ? 'checkmark-circle' : 'ellipse-outline'}
                          size={14}
                          color={req.met ? tokens.colors.success : tokens.colors.muteSoft}
                        />
                        <Text style={[styles.checkText, req.met && styles.checkTextMet]}>{req.text}</Text>
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
              <AuthField
                label="Confirm password"
                placeholder="••••••••"
                secureTextEntry
                autoComplete="new-password"
                returnKeyType="go"
                onSubmitEditing={() => void handleSubmit(onSubmit)()}
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.confirmPassword?.message}
              />
            )}
          />

          <SpringPressable
            onPress={() => setAgreedToTerms((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreedToTerms }}
            style={styles.termsRow}
          >
            <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
              {agreedToTerms ? (
                <Ionicons name="checkmark" size={14} color={tokens.colors.inverseFg} />
              ) : null}
            </View>
            <Text style={styles.termsText}>
              I agree to the{' '}
              <Text style={styles.termsLink} onPress={() => router.push('/legal/terms')}>
                Terms
              </Text>{' '}
              and{' '}
              <Text style={styles.termsLink} onPress={() => router.push('/legal/privacy')}>
                Privacy Policy
              </Text>
            </Text>
          </SpringPressable>

          <PillButton
            title={busy ? 'Creating account…' : 'Create account'}
            size="lg"
            springFeedback
            haptic="light"
            disabled={!agreedToTerms || busy}
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
            onPress={() => router.push('/(auth)/sign-in')}
            accessibilityRole="button"
            accessibilityLabel="Sign in"
            style={styles.footer}
          >
            <Text style={styles.footerText}>
              Already have an account? <Text style={styles.footerLink}>Sign in</Text>
            </Text>
          </SpringPressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
