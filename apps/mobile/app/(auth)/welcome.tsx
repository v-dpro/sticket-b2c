import React from 'react';
import { Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, fonts, gradients, radius, spacing } from '../../lib/theme';
import { GradientText } from '../../components/ui/GradientText';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Ambient glow */}
        <View style={styles.glowContainer}>
          <View style={[styles.glow, { backgroundColor: colors.brandCyan }]} />
          <View style={[styles.glow, styles.glowPurple, { backgroundColor: colors.brandPurple }]} />
          <View style={[styles.glow, styles.glowPink, { backgroundColor: colors.brandPink }]} />
        </View>

        {/* Logo */}
        <View style={styles.logoContainer}>
          <LinearGradient
            colors={gradients.rainbow}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoBorder}
          >
            <View style={styles.logoInner}>
              <Image
                source={require('../../assets/brand-logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
                accessibilityLabel="Sticket logo"
              />
            </View>
          </LinearGradient>
          <GradientText
            style={styles.appName}
          >
            STICKET
          </GradientText>
        </View>

        {/* Tagline */}
        <Text style={styles.tagline}>Never miss a show</Text>
        <Text style={styles.subtitle}>Your whole concert life in one place</Text>

        {/* Features */}
        <View style={styles.features}>
          <FeatureItem icon="🎵" text="Discover shows you'll love" />
          <FeatureItem icon="🎫" text="Manage all your tickets" />
          <FeatureItem icon="📸" text="Log and share your experiences" />
        </View>
      </View>

      {/* Bottom Buttons */}
      <View style={styles.bottomContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.getStartedButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={() => router.push('/(auth)/sign-up')}
        >
          <LinearGradient
            colors={gradients.accent}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradient}
          >
            <Text style={styles.getStartedText}>Get Started</Text>
          </LinearGradient>
        </Pressable>

        <Pressable style={styles.loginLink} onPress={() => router.push('/(auth)/sign-in')}>
          <Text style={styles.loginLinkText}>
            Already have an account? <Text style={styles.loginLinkHighlight}>Log in</Text>
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  glowContainer: {
    position: 'absolute',
    top: '20%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    opacity: 0.15,
  },
  glowPurple: {
    left: -40,
    top: -20,
  },
  glowPink: {
    right: -40,
    top: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoBorder: {
    width: 120,
    height: 120,
    borderRadius: 30,
    padding: 3,
    marginBottom: spacing.md,
    shadowColor: colors.brandPurple,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  logoInner: {
    flex: 1,
    borderRadius: 27,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 70,
    height: 70,
  },
  appName: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 6,
  },
  tagline: {
    fontSize: fonts.h3,
    fontWeight: fonts.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fonts.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 48,
    maxWidth: Math.min(width - 48, 360),
  },
  features: {
    width: '100%',
    gap: spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  featureText: {
    fontSize: fonts.body,
    color: colors.textPrimary,
  },
  bottomContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  getStartedButton: {
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
  gradient: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  getStartedText: {
    fontSize: fonts.body,
    fontWeight: fonts.semibold,
    color: colors.textPrimary,
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  loginLinkText: {
    fontSize: fonts.bodySmall,
    color: colors.textSecondary,
  },
  loginLinkHighlight: {
    color: colors.brandCyan,
    fontWeight: fonts.semibold,
  },
});
