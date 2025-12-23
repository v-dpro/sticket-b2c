import React from 'react';
import { Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoPlaceholder}>
            <Image
              source={require('../../assets/brand-logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
              accessibilityLabel="Sticket logo"
            />
          </View>
          <Text style={styles.appName}>STICKET</Text>
        </View>

        {/* Tagline */}
        <Text style={styles.tagline}>Never miss a show</Text>
        <Text style={styles.subtitle}>Your whole concert life in one place</Text>

        {/* Features */}
        <View style={styles.features}>
          <FeatureItem icon="🎵" text="Discover shows you’ll love" />
          <FeatureItem icon="🎫" text="Manage all your tickets" />
          <FeatureItem icon="📸" text="Log and share your experiences" />
        </View>
      </View>

      {/* Bottom Buttons */}
      <View style={styles.bottomContainer}>
        <Pressable
          style={({ pressed }) => [styles.getStartedButton, pressed && styles.buttonPressed]}
          onPress={() => router.push('/(auth)/sign-up')}
        >
          <LinearGradient
            colors={['#8B5CF6', '#E879F9']}
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
    backgroundColor: '#0A0B1E',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: '#1A1A2E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  logoImage: {
    width: 70,
    height: 70,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  tagline: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#A0A0B8',
    textAlign: 'center',
    marginBottom: 48,
    maxWidth: Math.min(width - 48, 360),
  },
  features: {
    width: '100%',
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2D2D4A',
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  bottomContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  getStartedButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  gradient: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  getStartedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  loginLinkText: {
    fontSize: 14,
    color: '#A0A0B8',
  },
  loginLinkHighlight: {
    color: '#00D4FF',
    fontWeight: '600',
  },
});




