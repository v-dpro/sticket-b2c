import React from 'react';
import { Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, fonts, gradients, radius, spacing } from '../../lib/theme';
import { MonoLabel } from '../../components/ui/MonoLabel';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
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

          {/* Wordmark */}
          <Text style={styles.wordmark}>sticket.</Text>
        </View>

        {/* Tagline */}
        <MonoLabel size={13} color={colors.brandCyan} style={styles.tagline}>
          a place for shows.
        </MonoLabel>

        {/* Description */}
        <Text style={styles.description}>Concerts. Together.</Text>
      </View>

      {/* Bottom Buttons */}
      <View style={styles.bottomContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.getStartedButton,
            pressed && { transform: [{ scale: 0.97 }] },
          ]}
          onPress={() => router.push('/(auth)/sign-up')}
        >
          <Text style={styles.getStartedText}>Get started →</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoBorder: {
    width: 100,
    height: 100,
    borderRadius: 25,
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
    borderRadius: 22,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 56,
    height: 56,
  },
  wordmark: {
    fontSize: 54,
    fontWeight: '400',
    letterSpacing: -1,
    color: colors.textHi,
  },
  tagline: {
    letterSpacing: 1.5,
    marginBottom: spacing.md,
  },
  description: {
    fontSize: 15,
    color: colors.textMid,
    textAlign: 'center',
  },
  bottomContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  getStartedButton: {
    width: '100%',
    height: 46,
    borderRadius: 999,
    backgroundColor: colors.pink,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  getStartedText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  loginLinkText: {
    fontSize: fonts.bodySmall,
    color: colors.textMid,
  },
  loginLinkHighlight: {
    color: colors.brandCyan,
    fontWeight: '600',
  },
});
