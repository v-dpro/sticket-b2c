// Welcome — the front door.
//
// Near-black stage, brand-gradient mark (the one sanctioned gradient
// moment), 800-weight wordmark, one-line promise, monochrome button
// stack: Apple / Google (ink inversion + card2) and email.

import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Image, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PillButton } from '../../components/ui/PillButton';
import { SpringPressable } from '../../components/ui/SpringPressable';
import { useSocialAuth } from '../../hooks/useSocialAuth';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

export default function WelcomeScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    safe: { flex: 1, backgroundColor: t.colors.bg },
    hero: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      gap: 18,
    },
    mark: {
      width: 76,
      height: 76,
      borderRadius: t.radius.xl,
      alignItems: 'center',
      justifyContent: 'center',
      ...t.shadows.elevated,
    },
    markImage: { width: 44, height: 44 },
    wordmark: {
      fontSize: 44,
      fontWeight: '800',
      letterSpacing: -1.2,
      color: t.colors.fg,
    },
    promise: {
      fontSize: 16,
      color: t.colors.textSoft,
      textAlign: 'center',
      marginTop: -8,
    },
    stack: {
      paddingHorizontal: t.density.pad,
      paddingBottom: 12,
      gap: 10,
    },
    error: {
      fontSize: 13,
      color: t.colors.error,
      textAlign: 'center',
      marginBottom: 4,
    },
    signInRow: {
      alignItems: 'center',
      paddingVertical: 14,
    },
    signInText: { fontSize: 14, color: t.colors.mute },
    signInLink: { fontWeight: '600', color: t.colors.fg },
  }));

  const {
    showAppleButton,
    appleLoading,
    signInWithApple,
    showGoogleButton,
    googleLoading,
    signInWithGoogle,
    error,
  } = useSocialAuth({ onSuccess: () => router.replace('/') });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.hero}>
        <Animated.View entering={FadeInDown.duration(320)}>
          <LinearGradient
            colors={tokens.gradients.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.mark}
          >
            <Image
              source={require('../../assets/brand-logo.png')}
              style={styles.markImage}
              resizeMode="contain"
              accessibilityLabel="Sticket"
            />
          </LinearGradient>
        </Animated.View>
        <Animated.Text entering={FadeInDown.delay(60).duration(320)} style={styles.wordmark}>
          sticket
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(120).duration(320)} style={styles.promise}>
          Your live-events life.
        </Animated.Text>
      </View>

      <Animated.View entering={FadeInDown.delay(180).duration(320)} style={styles.stack}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {showAppleButton ? (
          <PillButton
            title={appleLoading ? 'Signing in…' : 'Continue with Apple'}
            size="lg"
            springFeedback
            haptic="light"
            disabled={appleLoading}
            icon={
              appleLoading ? (
                <ActivityIndicator size="small" color={tokens.colors.inverseFg} />
              ) : (
                <Ionicons name="logo-apple" size={18} color={tokens.colors.inverseFg} />
              )
            }
            onPress={() => void signInWithApple()}
          />
        ) : null}

        {showGoogleButton ? (
          <PillButton
            title={googleLoading ? 'Signing in…' : 'Continue with Google'}
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

        <PillButton
          title="Continue with email"
          variant={showAppleButton ? 'ghost' : 'primary'}
          size="lg"
          springFeedback
          haptic="light"
          onPress={() => router.push('/(auth)/sign-up')}
        />

        <SpringPressable
          onPress={() => router.push('/(auth)/sign-in')}
          accessibilityRole="button"
          accessibilityLabel="Sign in"
          style={styles.signInRow}
        >
          <Text style={styles.signInText}>
            Already have an account? <Text style={styles.signInLink}>Sign in</Text>
          </Text>
        </SpringPressable>
      </Animated.View>
    </SafeAreaView>
  );
}
