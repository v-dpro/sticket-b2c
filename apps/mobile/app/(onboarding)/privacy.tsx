import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ProgressDots } from '../../components/onboarding/ProgressDots';
import { Screen } from '../../components/ui/Screen';
import { colors, radius, spacing, accentSets, fontFamilies } from '../../lib/theme';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

type VisibilityOption = 'public' | 'taste_matches' | 'friends_only';

const OPTIONS: { id: VisibilityOption; title: string; description: string }[] = [
  {
    id: 'public',
    title: 'Public',
    description: 'Anyone on Sticket can see your profile and discover you.',
  },
  {
    id: 'taste_matches',
    title: 'Taste matches',
    description: 'Only people with overlapping music taste will see you in Discover.',
  },
  {
    id: 'friends_only',
    title: 'Friends only',
    description:
      'You won\u2019t appear in Discover. Only people you add as friends can see your profile.',
  },
];

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function PrivacyScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<VisibilityOption>('public');

  const handleContinue = () => {
    // TODO: persist visibility setting to store / API
    router.push('/(onboarding)/done');
  };

  return (
    <Screen>
      <View style={styles.container}>
        {/* Progress */}
        <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
          <ProgressDots total={6} current={4} />
        </View>

        {/* Header */}
        <Text style={styles.title}>Who sees you?</Text>
        <Text style={styles.subtitle}>
          The other side of orbit — control your discoverability.
        </Text>

        {/* Radio stack */}
        <View style={styles.radioStack}>
          {OPTIONS.map((opt, index) => {
            const isSelected = selected === opt.id;
            const isLast = index === OPTIONS.length - 1;

            return (
              <React.Fragment key={opt.id}>
                <Pressable
                  style={[styles.radioRow, isSelected && styles.radioRowSelected]}
                  onPress={() => setSelected(opt.id)}
                >
                  {/* Radio circle */}
                  <View
                    style={[
                      styles.radioCircle,
                      isSelected ? styles.radioCircleSelected : styles.radioCircleUnselected,
                    ]}
                  >
                    {isSelected && <View style={styles.radioInner} />}
                  </View>

                  {/* Text */}
                  <View style={styles.radioTextBlock}>
                    <Text style={styles.radioTitle}>{opt.title}</Text>
                    <Text style={styles.radioDescription}>{opt.description}</Text>
                  </View>
                </Pressable>

                {!isLast && <View style={styles.divider} />}
              </React.Fragment>
            );
          })}
        </View>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Continue */}
        <Pressable style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueText}>Almost done →</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  title: {
    fontFamily: fontFamilies.displayItalic,
    fontSize: 38,
    color: colors.textHi,
    letterSpacing: -0.8,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMid,
    lineHeight: 20,
    marginBottom: spacing.xl,
  },

  // Radio stack
  radioStack: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    gap: 12,
  },
  radioRowSelected: {
    backgroundColor: accentSets.cyan.soft,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.hairline,
  },

  // Radio circle
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioCircleUnselected: {
    borderWidth: 2,
    borderColor: colors.line,
  },
  radioCircleSelected: {
    borderWidth: 7,
    borderColor: accentSets.cyan.hex,
  },
  radioInner: {
    // The thick border already creates the "filled" look
  },

  // Radio text
  radioTextBlock: {
    flex: 1,
    gap: 2,
  },
  radioTitle: {
    fontFamily: fontFamilies.uiBold,
    fontSize: 15,
    color: colors.textHi,
  },
  radioDescription: {
    fontFamily: fontFamilies.ui,
    fontSize: 12.5,
    color: colors.textMid,
    lineHeight: 12.5 * 1.4,
  },

  // Continue
  continueButton: {
    backgroundColor: accentSets.cyan.hex,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  continueText: {
    fontFamily: fontFamilies.uiBold,
    fontSize: 16,
    color: colors.ink,
  },
});
