import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import Ionicons from '@expo/vector-icons/Ionicons';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View, Alert, ActivityIndicator } from 'react-native';
import { useMemo, useState, useEffect } from 'react';
import { z } from 'zod';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Screen } from '../../components/ui/Screen';
import { colors, fonts, radius, spacing } from '../../lib/theme';
import { useSessionStore } from '../../stores/sessionStore';
import { apiClient } from '../../lib/api/client';
import * as SecureStore from '../../lib/storage/secureStore';
import { upsertUserFromRemote } from '../../lib/local/users';
import { ensureProfile, getProfile } from '../../lib/local/repo/profileRepo';
import { getLogCount } from '../../lib/local/repo/logsRepo';

WebBrowser.maybeCompleteAuthSession();

const SESSION_KEY = 'sticket.currentUserId';

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
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const signUp = useSessionStore((s) => s.signUp);
  const storeError = useSessionStore((s) => s.error);
  const isLoading = useSessionStore((s) => s.isLoading);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Check if Google auth is properly configured
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const isGoogleConfigured = Boolean(
    Platform.OS === 'ios' 
      ? iosClientId && webClientId && iosClientId !== 'not-configured' && webClientId !== 'not-configured'
      : webClientId && webClientId !== 'not-configured'
  );

  // Always call the hook (required by React rules), but provide placeholder values if not configured
  const [googleRequest, googleResponse, googlePromptAsync] = Google.useAuthRequest(
    Platform.OS === 'ios'
      ? {
          iosClientId: iosClientId || 'not-configured-placeholder',
          webClientId: webClientId || 'not-configured-placeholder',
        }
      : {
          webClientId: webClientId || 'not-configured-placeholder',
        }
  );

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setIsAppleAvailable);
    }
  }, []);

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      handleGoogleToken(googleResponse.authentication?.idToken);
    }
  }, [googleResponse]);

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

  const handleAppleSignIn = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Apple Sign In', 'Only available on iOS devices');
      return;
    }
    
    if (!isAppleAvailable) {
      Alert.alert('Apple Sign In', 'Apple Sign In is not available on this device.');
      return;
    }
    
    setAppleLoading(true);
    try {
      setAuthError(null);
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error('No identity token received');
      }

      // Send to backend
      const response = await apiClient.post('/auth/apple/callback', {
        identityToken: credential.identityToken,
        authorizationCode: credential.authorizationCode,
        fullName: credential.fullName,
        email: credential.email,
      });

      const { accessToken, refreshToken, user } = response.data;
      
      // Store tokens
      await SecureStore.setItemAsync('access_token', accessToken);
      await SecureStore.setItemAsync('refresh_token', refreshToken);
      await SecureStore.setItemAsync('auth_token', accessToken);

      const localUser = await upsertUserFromRemote({ id: user.id, email: user.email });
      await SecureStore.setItemAsync(SESSION_KEY, localUser.id);
      await ensureProfile(localUser.id);
      const profile = await getProfile(localUser.id);
      const logCount = await getLogCount(localUser.id);

      useSessionStore.setState({
        user: localUser,
        profile,
        hasLoggedFirstShow: logCount > 0,
        isLoading: false,
        error: null,
      });
      
      // Navigate to app
      router.replace('/');
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED' || error.code === 'ERR_CANCELED') {
        // User cancelled, do nothing
        return;
      }
      console.error('Apple Sign In error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Could not sign in with Apple';
      setAuthError(errorMessage);
      Alert.alert(
        'Sign In Failed',
        errorMessage
      );
    } finally {
      setAppleLoading(false);
    }
  };

  const handleGoogleToken = async (idToken: string | undefined) => {
    if (!idToken) return;
    
    setGoogleLoading(true);
    try {
      setAuthError(null);
      const response = await apiClient.post('/auth/google/callback', { idToken });
      
      const { accessToken, refreshToken, user } = response.data;
      
      await SecureStore.setItemAsync('access_token', accessToken);
      await SecureStore.setItemAsync('refresh_token', refreshToken);
      await SecureStore.setItemAsync('auth_token', accessToken);

      const localUser = await upsertUserFromRemote({ id: user.id, email: user.email });
      await SecureStore.setItemAsync(SESSION_KEY, localUser.id);
      await ensureProfile(localUser.id);
      const profile = await getProfile(localUser.id);
      const logCount = await getLogCount(localUser.id);

      useSessionStore.setState({
        user: localUser,
        profile,
        hasLoggedFirstShow: logCount > 0,
        isLoading: false,
        error: null,
      });
      
      router.replace('/');
    } catch (error: any) {
      console.error('Google Sign In error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Could not sign in with Google';
      setAuthError(errorMessage);
      Alert.alert(
        'Sign In Failed',
        errorMessage
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    if (!googleRequest) {
      Alert.alert('Google Sign In', 'Google Sign In is not configured');
      return;
    }
    googlePromptAsync();
  };

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

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social */}
            <View style={styles.socialList}>
              {Platform.OS === 'ios' && isAppleAvailable && (
                <Pressable
                  accessibilityRole="button"
                  onPress={handleAppleSignIn}
                  disabled={appleLoading}
                  style={({ pressed }) => [styles.socialBtn, pressed && styles.pressed, appleLoading && { opacity: 0.6 }]}
                >
                  {appleLoading ? (
                    <ActivityIndicator size="small" color={colors.textPrimary} />
                  ) : (
                    <>
                      <Ionicons name="logo-apple" size={20} color={colors.textPrimary} />
                      <Text style={styles.socialText}>Continue with Apple</Text>
                    </>
                  )}
                </Pressable>
              )}

              {isGoogleConfigured && (
                <Pressable
                  accessibilityRole="button"
                  onPress={handleGoogleSignIn}
                  disabled={googleLoading || !googleRequest}
                  style={({ pressed }) => [styles.socialBtn, pressed && styles.pressed, googleLoading && { opacity: 0.6 }]}
                >
                  {googleLoading ? (
                    <ActivityIndicator size="small" color={colors.textPrimary} />
                  ) : (
                    <>
                      <Ionicons name="logo-google" size={20} color={colors.textPrimary} />
                      <Text style={styles.socialText}>Continue with Google</Text>
                    </>
                  )}
                </Pressable>
              )}
            </View>

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


