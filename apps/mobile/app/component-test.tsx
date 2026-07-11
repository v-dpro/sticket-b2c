// Component test / design-system proof screen.
// Verifies the "Encore, muted" token system: theme-mode toggle, swatch
// grid, and the monochrome button variants — in both modes.

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatusPill } from '../components/shared/StatusPill';
import { TierBadge } from '../components/shared/TierBadge';
import { CodeDisplay } from '../components/shared/CodeDisplay';
import { SignupWarning } from '../components/shared/SignupWarning';
import { TimelineCard } from '../components/concert-life/TimelineCard';
import { FeedTabBar } from '../components/feed/FeedTabBar';
import { PillButton } from '../components/ui/PillButton';
import { useTheme, useThemedStyles, type ThemePreference } from '../lib/theme-context';
import type { ThemeTokens } from '../lib/theme';

const MODES: ThemePreference[] = ['system', 'dark', 'light'];

function Swatch({ name, value, tokens }: { name: string; value: string; tokens: ThemeTokens }) {
  return (
    <View style={{ width: 104 }}>
      <View
        style={{
          height: 44,
          borderRadius: tokens.radius.sm,
          backgroundColor: value,
          borderWidth: 1,
          borderColor: tokens.colors.line,
        }}
      />
      <Text style={{ color: tokens.colors.text, fontSize: 11, fontWeight: '600', marginTop: 4 }}>
        {name}
      </Text>
      <Text style={{ color: tokens.colors.mute, fontSize: 10 }}>{value}</Text>
    </View>
  );
}

export default function ComponentTestScreen() {
  const [feedTab, setFeedTab] = React.useState<'friends' | 'discover'>('friends');
  const { tokens, mode, resolvedMode, setMode } = useTheme();

  const styles = useThemedStyles((t) => ({
    container: {
      flex: 1,
      backgroundColor: t.colors.bg,
    },
    content: {
      padding: 24,
      gap: 16,
      paddingBottom: 60,
    },
    title: {
      fontSize: 28,
      fontWeight: '900' as const,
      color: t.colors.fg,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 12,
      color: t.colors.mute,
      marginBottom: 12,
    },
    section: {
      fontSize: 14,
      fontWeight: '700' as const,
      color: t.colors.accent,
      marginTop: 16,
      marginBottom: 8,
    },
    row: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: 8,
      alignItems: 'center' as const,
    },
    segment: {
      flexDirection: 'row' as const,
      backgroundColor: t.colors.card2,
      borderRadius: t.radius.full,
      padding: 3,
      alignSelf: 'flex-start' as const,
    },
    segmentItem: {
      paddingVertical: 7,
      paddingHorizontal: 16,
      borderRadius: t.radius.full,
    },
    segmentItemActive: {
      backgroundColor: t.colors.inverseBg,
    },
    segmentLabel: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: t.colors.mute,
      textTransform: 'capitalize' as const,
    },
    segmentLabelActive: {
      color: t.colors.inverseFg,
    },
  }));

  const c = tokens.colors;

  const coreSwatches: Array<[string, string]> = [
    ['bg', c.bg],
    ['card', c.card],
    ['card2', c.card2],
    ['line', c.line],
    ['fg (ink)', c.fg],
    ['text', c.text],
    ['textSoft', c.textSoft],
    ['mute', c.mute],
    ['muteSoft', c.muteSoft],
    ['accent', c.accent],
    ['inverseBg', c.inverseBg],
    ['success', c.success],
    ['warning', c.warning],
    ['error', c.error],
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Design System</Text>
        <Text style={styles.subtitle}>
          mode: {mode} · resolved: {resolvedMode}
        </Text>

        <Text style={styles.section}>Theme mode</Text>
        <View style={styles.segment}>
          {MODES.map((m) => {
            const active = mode === m;
            return (
              <Pressable
                key={m}
                onPress={() => setMode(m)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.segmentItem, active && styles.segmentItemActive]}
              >
                <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>{m}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.section}>Core swatches</Text>
        <View style={styles.row}>
          {coreSwatches.map(([name, value]) => (
            <Swatch key={name} name={name} value={value} tokens={tokens} />
          ))}
        </View>

        <Text style={styles.section}>Accent sets</Text>
        <View style={styles.row}>
          {(Object.keys(tokens.accentSets) as Array<keyof typeof tokens.accentSets>).map((name) => (
            <Swatch key={name} name={name} value={tokens.accentSets[name].hex} tokens={tokens} />
          ))}
        </View>

        <Text style={styles.section}>Brand gradient (reserved)</Text>
        <View style={styles.row}>
          {tokens.gradients.brand.map((stop) => (
            <Swatch key={stop} name="stop" value={stop} tokens={tokens} />
          ))}
        </View>

        <Text style={styles.section}>PillButton — monochrome variants</Text>
        <View style={styles.row}>
          <PillButton title="Primary" variant="primary" onPress={() => {}} />
          <PillButton title="Secondary" variant="secondary" onPress={() => {}} />
          <PillButton title="Ghost" variant="ghost" onPress={() => {}} />
        </View>
        <View style={styles.row}>
          <PillButton title="Primary lg" variant="primary" size="lg" onPress={() => {}} springFeedback haptic="light" />
          <PillButton title="Secondary sm" variant="secondary" size="sm" onPress={() => {}} />
          <PillButton title="Disabled" variant="primary" onPress={() => {}} disabled />
        </View>
        <View style={styles.row}>
          <PillButton title="legacy solid" variant="solid" onPress={() => {}} />
          <PillButton title="legacy mono" variant="mono" onPress={() => {}} />
          <PillButton title="legacy accentGhost" variant="accentGhost" onPress={() => {}} />
        </View>

        <Text style={styles.section}>StatusPill</Text>
        <View style={styles.row}>
          <StatusPill type="ticket" label="Ticket" />
          <StatusPill type="presale" label="Verified Fan" />
          <StatusPill type="upcoming" label="Jan 15" />
          <StatusPill type="tracking" label="Watching" />
        </View>

        <Text style={styles.section}>TierBadge</Text>
        <View style={styles.row}>
          <TierBadge size="small" />
          <TierBadge size="medium" />
        </View>

        <Text style={styles.section}>CodeDisplay</Text>
        <CodeDisplay code="SWIFTIE2025" />

        <Text style={styles.section}>SignupWarning</Text>
        <SignupWarning deadline="Jan 10" />

        <Text style={styles.section}>FeedTabBar</Text>
        <FeedTabBar activeTab={feedTab} onTabChange={setFeedTab} />

        <Text style={styles.section}>TimelineCard - Log</Text>
        <TimelineCard
          type="log"
          artist="Taylor Swift"
          venue="SoFi Stadium"
          city="Los Angeles"
          date="Dec 15, 2024"
          rating={5}
          note="Cried during All Too Well. Worth it."
        />

        <Text style={styles.section}>TimelineCard - Ticket</Text>
        <TimelineCard
          type="ticket"
          artist="The Weeknd"
          venue="Madison Square Garden"
          city="New York"
          date="Jan 20, 2025"
          section="102"
          row="A"
          seat="12"
          isToday
        />

        <Text style={styles.section}>TimelineCard - Tracking</Text>
        <TimelineCard type="tracking" artist="Billie Eilish" venue="Barclays Center" city="Brooklyn" date="Feb 14, 2025" maxPrice="250" />

        <Text style={styles.section}>TimelineCard - Presale</Text>
        <TimelineCard
          type="presale"
          artist="Beyoncé"
          venue="MetLife Stadium"
          city="East Rutherford"
          date="Jan 15, 2025"
          presaleType="Verified Fan"
          presaleCode="BEYHIVE25"
          presaleDeadline="Jan 10"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
