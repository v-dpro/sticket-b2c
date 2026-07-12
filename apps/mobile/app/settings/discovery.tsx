// app/settings/discovery.tsx — DISCOVERY DIALS: "How people find you."
//
// Three cards: same-show matching radius, taste-matching radius, and the
// public-galleries toggle. Hydrates from GET /auth/me, writes via
// PATCH /users/me/discovery (optimistic + revert on error). The footer is a
// live-computed plain-language readout of the three dials.

import { Stack } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Chip } from '../../components/entity/EntityBits';
import { SpringPressable } from '../../components/ui/SpringPressable';
import { useDiscoverySettings } from '../../hooks/useDiscoverySettings';
import { haptics } from '../../lib/motion';
import { useSafeBack } from '../../lib/navigation/safeNavigation';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import type { DiscoveryRadius, DiscoverySettings } from '../../types/settings';

const RADIUS_OPTIONS: Array<{ value: DiscoveryRadius; label: string }> = [
  { value: 'OFF', label: 'Off' },
  { value: 'FRIENDS', label: 'Friends' },
  { value: 'FOF', label: 'Friends of friends' },
  { value: 'EVERYONE', label: 'Everyone' },
];

const RADIUS_WHO: Record<DiscoveryRadius, string> = {
  OFF: 'no one',
  FRIENDS: 'friends',
  FOF: 'friends of friends',
  EVERYONE: 'everyone',
};

// Live-computed plain-language readout of the three dials.
function exposureSummary(settings: DiscoverySettings): string {
  const sameShow =
    settings.sameShowRadius === 'OFF'
      ? 'no one can see you were at the same shows'
      : `${RADIUS_WHO[settings.sameShowRadius]} can see you were at the same shows`;

  const taste =
    settings.tasteRadius === 'OFF'
      ? 'your taste suggestions are off'
      : `your taste suggestions reach ${RADIUS_WHO[settings.tasteRadius]}`;

  const galleries = settings.showInGalleries
    ? 'your public memories appear in event galleries'
    : 'your public memories stay out of event galleries';

  return `Right now: ${sameShow} · ${taste} · ${galleries}.`;
}

export default function DiscoveryDialsScreen() {
  const goBack = useSafeBack();
  const { tokens } = useTheme();
  const { settings, saving, update } = useDiscoverySettings();

  const styles = useThemedStyles((t) => ({
    screen: { flex: 1, backgroundColor: t.colors.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: t.density.pad,
      paddingTop: t.spacing.md,
      paddingBottom: 12,
    },
    backButton: { width: 40, height: 40, justifyContent: 'center' },
    title: { fontSize: 20, fontWeight: '800', color: t.colors.fg, letterSpacing: -0.3 },
    scrollView: { flex: 1 },
    intro: {
      fontSize: 13,
      color: t.colors.mute,
      lineHeight: 18,
      paddingHorizontal: t.density.pad,
      marginBottom: t.spacing.md,
    },
    card: {
      backgroundColor: t.colors.card,
      borderRadius: t.radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.hairline,
      padding: t.density.cardPad,
      marginHorizontal: t.density.pad,
      marginBottom: 12,
      gap: 12,
    },
    cardLabel: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 11,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: t.colors.fg,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    helper: { fontSize: 13, color: t.colors.mute, lineHeight: 18 },
    toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    toggleTextWrap: { flex: 1, gap: 4 },
    footer: {
      marginHorizontal: t.density.pad,
      marginTop: t.spacing.sm,
      marginBottom: t.spacing.xl,
      padding: t.density.cardPad,
      backgroundColor: t.colors.card2,
      borderRadius: t.radius.lg,
      gap: 6,
    },
    footerEyebrow: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      color: t.colors.mute,
    },
    footerText: { fontSize: 13.5, color: t.colors.text, lineHeight: 20 },
  }));

  const handleGalleriesToggle = (value: boolean) => {
    // Switch has no built-in press haptic (unlike SpringPressable) — tick it here.
    haptics.light();
    void update('showInGalleries', value);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <SpringPressable onPress={goBack} haptic="light" style={styles.backButton} accessibilityRole="button">
          <Ionicons name="arrow-back" size={22} color={tokens.colors.fg} />
        </SpringPressable>
        <Text style={styles.title}>How people find you</Text>
        {saving ? <Ionicons name="sync" size={18} color={tokens.colors.mute} /> : <View style={{ width: 20 }} />}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          These dials control who can match with you around shows — not what you post, just who's allowed to
          notice.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Same-show matching</Text>
          <View style={styles.chipRow}>
            {RADIUS_OPTIONS.map((opt) => (
              <Chip
                key={opt.value}
                label={opt.label}
                active={settings.sameShowRadius === opt.value}
                onPress={() => void update('sameShowRadius', opt.value)}
              />
            ))}
          </View>
          <Text style={styles.helper}>
            Matches you with people who logged the exact same show — no messages, just a quiet "you were both
            there."
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Taste matching</Text>
          <View style={styles.chipRow}>
            {RADIUS_OPTIONS.map((opt) => (
              <Chip
                key={opt.value}
                label={opt.label}
                active={settings.tasteRadius === opt.value}
                onPress={() => void update('tasteRadius', opt.value)}
              />
            ))}
          </View>
          <Text style={styles.helper}>
            Lets people with similar taste see you in taste-based suggestions, even if you've never crossed paths.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleTextWrap}>
              <Text style={styles.cardLabel}>Appear in event galleries</Text>
              <Text style={styles.helper}>Your public memories show on event pages</Text>
            </View>
            <Switch
              value={settings.showInGalleries}
              onValueChange={handleGalleriesToggle}
              trackColor={{ false: tokens.colors.card2, true: tokens.colors.success }}
              thumbColor={tokens.colors.white}
              ios_backgroundColor={tokens.colors.card2}
              accessibilityLabel="Appear in event galleries"
            />
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerEyebrow}>In plain English</Text>
          <Text style={styles.footerText}>{exposureSummary(settings)}</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
