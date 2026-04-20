import { Link, Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Image, Text, View, StyleSheet, Animated, Easing, Pressable } from 'react-native';

import { Screen } from '../../components/ui/Screen';
import { colors, accentSets, spacing, radius, shadows, fontFamilies } from '../../lib/theme';
import { useOnboardingStore } from '../../stores/onboardingStore';
const TAGLINE = 'CONCERTS. TOGETHER.';
const TAGLINE_SPEED = 38; // ms per character

export default function WelcomeOnboarding() {
  const router = useRouter();
  const markWelcomeSeen = useOnboardingStore((s) => s.markWelcomeSeen);

  // ── Logo entrance: scale(2) rotate(-20deg) → scale(1) rotate(0deg) ──
  const logoScale = useRef(new Animated.Value(2)).current;
  const logoRotate = useRef(new Animated.Value(-20)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  // ── Pulse ring ──
  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.6)).current;

  // ── Content fade-in (wordmark, tagline, description, CTA) ──
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(18)).current;

  // ── Typed tagline ──
  const [typedCount, setTypedCount] = useState(0);

  useEffect(() => {
    // 1. Logo entrance — 540ms spring
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        stiffness: 160,
        damping: 16,
        mass: 0.9,
        useNativeDriver: true,
      }),
      Animated.spring(logoRotate, {
        toValue: 0,
        stiffness: 160,
        damping: 16,
        mass: 0.9,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Pulse ring loop (starts after logo lands)
    const pulseTimer = setTimeout(() => {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulseScale, {
              toValue: 1.6,
              duration: 1800,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseScale, {
              toValue: 1,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(pulseOpacity, {
              toValue: 0,
              duration: 1800,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseOpacity, {
              toValue: 0.6,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ).start();
    }, 500);

    // 3. Content slides in after logo
    const contentTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(contentTranslateY, {
          toValue: 0,
          stiffness: 180,
          damping: 22,
          useNativeDriver: true,
        }),
      ]).start();
    }, 540);

    // 4. Typed tagline starts after content is visible
    const typeStart = setTimeout(() => {
      let i = 0;
      const typeInterval = setInterval(() => {
        i += 1;
        setTypedCount(i);
        if (i >= TAGLINE.length) clearInterval(typeInterval);
      }, TAGLINE_SPEED);
      return () => clearInterval(typeInterval);
    }, 900);

    return () => {
      clearTimeout(pulseTimer);
      clearTimeout(contentTimer);
      clearTimeout(typeStart);
    };
  }, []);

  const logoRotateStr = logoRotate.interpolate({
    inputRange: [-20, 0],
    outputRange: ['-20deg', '0deg'],
  });

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.container}>
        {/* Center content */}
        <View style={styles.center}>
          {/* Logo + Pulse ring */}
          <View style={styles.logoArea}>
            {/* Pulse ring */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.pulseRing,
                {
                  transform: [{ scale: pulseScale }],
                  opacity: pulseOpacity,
                },
              ]}
            />

            {/* Logo */}
            <Animated.View
              style={[
                styles.logoWrap,
                {
                  opacity: logoOpacity,
                  transform: [{ scale: logoScale }, { rotate: logoRotateStr }],
                },
              ]}
            >
              <Image
                source={require('../../assets/brand-logo.png')}
                style={styles.logo}
                resizeMode="contain"
                accessibilityLabel="Sticket logo"
              />
            </Animated.View>
          </View>

          {/* Wordmark + tagline + description */}
          <Animated.View
            style={[
              styles.textBlock,
              {
                opacity: contentOpacity,
                transform: [{ translateY: contentTranslateY }],
              },
            ]}
          >
            <Text style={styles.wordmark}>sticket.</Text>

            <Text style={styles.tagline}>
              {TAGLINE.slice(0, typedCount)}
              {typedCount < TAGLINE.length && (
                <Text style={styles.cursor}>|</Text>
              )}
            </Text>

            <Text style={styles.description}>
              Log the shows. Find your people.{'\n'}Build a life soundtrack that's actually shared.
            </Text>
          </Animated.View>
        </View>

        {/* Bottom CTA */}
        <Animated.View
          style={[
            styles.cta,
            {
              opacity: contentOpacity,
              transform: [{ translateY: contentTranslateY }],
            },
          ]}
        >
          <Pressable
            style={({ pressed }) => [
              styles.ctaButton,
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
            onPress={() => {
              markWelcomeSeen();
              router.push('/(onboarding)/select-artists');
            }}
            accessibilityRole="button"
          >
            <Text style={styles.ctaText}>Get started &rarr;</Text>
          </Pressable>

          <Text style={styles.loginText}>
            Already have an account?{' '}
            <Link href="/(auth)/sign-in" style={styles.loginLink}>
              Log in
            </Link>
          </Text>
        </Animated.View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['3xl'],
    paddingBottom: spacing['3xl'],
    justifyContent: 'space-between',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoArea: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  pulseRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: accentSets.cyan.hex,
  },
  logoWrap: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 120,
    height: 120,
  },
  textBlock: {
    alignItems: 'center',
    gap: spacing.md,
  },
  wordmark: {
    fontFamily: fontFamilies.displayItalic,
    color: colors.textHi,
    fontSize: 54,
    letterSpacing: -1,
  },
  tagline: {
    color: accentSets.cyan.hex,
    fontSize: 13,
    fontFamily: fontFamilies.monoBold,
    letterSpacing: 2.5,
    textAlign: 'center',
  },
  cursor: {
    color: accentSets.cyan.hex,
    fontFamily: fontFamilies.monoBold,
  },
  description: {
    fontFamily: fontFamilies.ui,
    color: colors.textMid,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  cta: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  ctaButton: {
    backgroundColor: accentSets.cyan.hex,
    paddingVertical: 16,
    paddingHorizontal: spacing.xl,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  ctaText: {
    fontFamily: fontFamilies.uiBold,
    color: '#FFFFFF',
    fontSize: 15,
  },
  loginText: {
    color: colors.textMid,
    fontSize: 14,
    textAlign: 'center',
  },
  loginLink: {
    color: accentSets.cyan.hex,
    fontWeight: '600',
  },
});
