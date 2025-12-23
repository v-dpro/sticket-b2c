import { Link, Stack, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Image, Text, View, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Button } from '../../components/ui/Button';
import { Screen } from '../../components/ui/Screen';
import { colors, fonts, spacing, radius } from '../../lib/theme';
import { useOnboardingStore } from '../../stores/onboardingStore';

export default function WelcomeOnboarding() {
  const router = useRouter();
  const markWelcomeSeen = useOnboardingStore((s) => s.markWelcomeSeen);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.container}>
        {/* Glow behind logo */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.glow,
            {
              transform: [
                {
                  scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }),
                },
              ],
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }),
            },
          ]}
        >
          <LinearGradient
            colors={[`${colors.brandCyan}33`, `${colors.brandPurple}33`, `${colors.brandPink}33`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {/* Center content */}
        <View style={styles.center}>
          <View style={styles.logoWrap}>
            <Image source={require('../../assets/brand-logo.png')} style={styles.logo} resizeMode="contain" accessibilityLabel="Sticket logo" />
          </View>

          <Text style={styles.wordmark}>STICKET</Text>
          <Text style={styles.tagline}>Never miss a show</Text>
        </View>

        {/* Bottom CTA */}
        <View style={styles.cta}>
          <Button
            title="Get Started"
            onPress={() => {
              markWelcomeSeen();
              router.push('/(onboarding)/set-city');
            }}
            fullWidth
          />
          <Text style={styles.loginText}>
            Already have an account?{' '}
            <Link href="/(auth)/sign-in" style={styles.loginLink}>
              Log in
            </Link>
          </Text>
        </View>
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
  glow: {
    position: 'absolute',
    top: '28%',
    left: '50%',
    width: 300,
    height: 300,
    marginLeft: -150,
    marginTop: -150,
    borderRadius: 9999,
    overflow: 'hidden',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    width: 120,
    height: 120,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  logo: {
    width: 120,
    height: 120,
  },
  wordmark: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: fonts.bold,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  tagline: {
    color: colors.textSecondary,
    fontSize: fonts.body,
  },
  cta: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  loginText: {
    color: colors.textSecondary,
    fontSize: fonts.bodySmall,
    textAlign: 'center',
  },
  loginLink: {
    color: colors.brandCyan,
    fontWeight: fonts.semibold,
  },
});



