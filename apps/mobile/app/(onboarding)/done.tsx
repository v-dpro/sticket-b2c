import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../components/ui/Screen';
import { colors, accentSets, spacing, radius, shadows, fontFamilies } from '../../lib/theme';
import { Confetti } from '../../components/ui/Confetti';
import { updateProfile } from '../../lib/local/repo/profileRepo';
import { useSession } from '../../hooks/useSession';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { useStamp } from '../../lib/motion';

export default function DoneOnboarding() {
  const router = useRouter();
  const { user, refresh } = useSession();
  const completeOnboarding = useOnboardingStore((s) => s.completeOnboarding);
  const [isSaving, setIsSaving] = useState(false);

  // ── Stamp animation ──
  const stamp = useStamp(true, 200);

  // ── Content pop-in ──
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(24)).current;

  // ── Badge card ──
  const badgeScale = useRef(new Animated.Value(0.9)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;

  // ── CTA ──
  const ctaOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Content slides in after stamp lands
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
    }, 600);

    // Badge card pops in
    const badgeTimer = setTimeout(() => {
      Animated.parallel([
        Animated.spring(badgeScale, {
          toValue: 1,
          stiffness: 220,
          damping: 18,
          useNativeDriver: true,
        }),
        Animated.timing(badgeOpacity, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }, 900);

    // CTA fades in last
    const ctaTimer = setTimeout(() => {
      Animated.timing(ctaOpacity, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }, 1200);

    return () => {
      clearTimeout(contentTimer);
      clearTimeout(badgeTimer);
      clearTimeout(ctaTimer);
    };
  }, []);

  const finish = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await updateProfile(user.id, { onboardingCompleted: true });
      await completeOnboarding();
      await refresh();
      router.replace('/(tabs)/feed');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Screen padded={false}>
      <View style={styles.container}>
        {/* Confetti burst */}
        <Confetti active={true} originY={0.35} />

        {/* Center content */}
        <View style={styles.center}>
          {/* WELCOME IN stamp */}
          <Animated.View
            style={[
              styles.stampContainer,
              {
                opacity: stamp.opacity,
                transform: stamp.transform as any,
              },
            ]}
          >
            <Text style={styles.stampText}>WELCOME IN</Text>
          </Animated.View>

          {/* Headline */}
          <Animated.View
            style={{
              opacity: contentOpacity,
              transform: [{ translateY: contentTranslateY }],
            }}
          >
            <Text style={styles.headline}>We gave you a{'\n'}head start.</Text>
          </Animated.View>

          {/* Badge card */}
          <Animated.View
            style={[
              styles.badgeCard,
              {
                opacity: badgeOpacity,
                transform: [{ scale: badgeScale }],
              },
            ]}
          >
            <Text style={styles.badgeEmoji}>&#x1F525;</Text>
            <View style={styles.badgeTextBlock}>
              <Text style={styles.badgeTitle}>FIRST STREAK &middot; UNLOCKED</Text>
              <Text style={styles.badgeDescription}>3-month grace streak</Text>
            </View>
          </Animated.View>
        </View>

        {/* CTA */}
        <Animated.View style={[styles.footer, { opacity: ctaOpacity }]}>
          <Pressable
            onPress={finish}
            disabled={isSaving}
            style={({ pressed }) => [
              styles.ctaButton,
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
              isSaving && { opacity: 0.6 },
            ]}
            accessibilityRole="button"
          >
            <Text style={styles.ctaText}>
              {isSaving ? 'Finishing...' : 'Enter sticket \u2192'}
            </Text>
          </Pressable>
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
    gap: spacing.xl,
  },
  stampContainer: {
    borderWidth: 2,
    borderColor: accentSets.cyan.hex,
    borderRadius: radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  stampText: {
    fontFamily: fontFamilies.monoBold,
    fontSize: 20,
    color: accentSets.cyan.hex,
    letterSpacing: 3,
  },
  headline: {
    fontFamily: fontFamilies.displayItalic,
    fontSize: 36,
    letterSpacing: -0.8,
    color: colors.textHi,
    textAlign: 'center',
    lineHeight: 42,
  },
  badgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: accentSets.cyan.soft,
    borderWidth: 1,
    borderColor: accentSets.cyan.line,
    borderRadius: radius.md,
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 14,
    alignSelf: 'stretch',
  },
  badgeEmoji: {
    fontSize: 28,
  },
  badgeTextBlock: {
    flex: 1,
    gap: 2,
  },
  badgeTitle: {
    fontFamily: fontFamilies.uiBold,
    fontSize: 12,
    color: accentSets.cyan.hex,
    letterSpacing: 1,
  },
  badgeDescription: {
    fontFamily: fontFamilies.monoSemi,
    fontSize: 12.5,
    color: colors.textMid,
  },
  footer: {
    paddingBottom: spacing.xl,
  },
  ctaButton: {
    backgroundColor: accentSets.cyan.hex,
    paddingVertical: 16,
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
});
