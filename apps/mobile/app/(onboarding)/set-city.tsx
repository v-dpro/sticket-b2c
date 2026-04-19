import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, accentSets, spacing, radius, shadows } from '../../lib/theme';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { useSafeBack } from '../../lib/navigation/safeNavigation';

type OrbitOption = 'friends' | 'fof' | 'taste';

const ORBIT_OPTIONS: { key: OrbitOption; label: string; description: string }[] = [
  {
    key: 'friends',
    label: 'FRIENDS',
    description: 'Only people you follow. Tight circle, zero noise.',
  },
  {
    key: 'fof',
    label: 'FRIENDS+FOF',
    description: 'Friends and their friends. Wider net, still curated.',
  },
  {
    key: 'taste',
    label: 'TASTE GRAPH',
    description: 'Anyone who shares your music taste. Maximum discovery.',
  },
];

export default function SetCityOnboarding() {
  const router = useRouter();
  const goBack = useSafeBack();
  const [selected, setSelected] = useState<OrbitOption>('fof');

  const activeOption = ORBIT_OPTIONS.find((o) => o.key === selected)!;

  const onContinue = () => {
    // Store orbit preference (reusing city store slot or adding new field)
    router.push('/(onboarding)/done');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backButton} accessibilityRole="button">
          <Ionicons name="arrow-back" size={22} color={colors.textHi} />
        </Pressable>
      </View>

      <View style={styles.content}>
        {/* Title */}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Your orbit.</Text>
          <Text style={styles.subtitle}>How wide a net?</Text>
        </View>

        {/* Segmented control */}
        <View style={styles.segmentedTrack}>
          {ORBIT_OPTIONS.map((option) => {
            const isActive = selected === option.key;
            return (
              <Pressable
                key={option.key}
                onPress={() => setSelected(option.key)}
                style={[styles.segmentedItem, isActive && styles.segmentedItemActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
              >
                <Text
                  style={[
                    styles.segmentedLabel,
                    isActive ? styles.segmentedLabelActive : styles.segmentedLabelInactive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Description */}
        <Text style={styles.description}>{activeOption.description}</Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable
          onPress={onContinue}
          style={({ pressed }) => [
            styles.ctaButton,
            pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
          ]}
          accessibilityRole="button"
        >
          <Text style={styles.ctaText}>Looks good &rarr;</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  titleBlock: {
    marginBottom: spacing['2xl'],
  },
  title: {
    fontSize: 38,
    fontWeight: '400',
    letterSpacing: -0.8,
    color: colors.textHi,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMid,
  },
  segmentedTrack: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: 3,
    marginBottom: spacing.lg,
  },
  segmentedItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedItemActive: {
    backgroundColor: accentSets.cyan.hex,
  },
  segmentedLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  segmentedLabelActive: {
    color: '#FFFFFF',
  },
  segmentedLabelInactive: {
    color: colors.textMid,
  },
  description: {
    fontSize: 15,
    color: colors.textMid,
    lineHeight: 22,
  },
  footer: {
    padding: spacing.lg,
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
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
