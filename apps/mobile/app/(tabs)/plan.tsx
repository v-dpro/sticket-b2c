// app/(tabs)/plan.tsx — THE PLANNING HQ. Presales moved here out of You,
// joined by the parties world (Partiful energy): PRESALES = tracked
// presales with live countdowns + the ticketed/interested agenda;
// PARTIES = hosting / going / invited + join requests to approve.

import React, { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';

import { durations, haptics } from '../../lib/motion';
import { useThemedStyles } from '../../lib/theme-context';

import { PartiesTab } from '../../components/plan/PartiesTab';
import { PresalesTab } from '../../components/you/PresalesTab';
import { SpringPressable } from '../../components/ui/SpringPressable';

type PlanTab = 'presales' | 'parties';

const TABS: { key: PlanTab; label: string }[] = [
  { key: 'presales', label: 'PRESALES' },
  { key: 'parties', label: 'PARTIES' },
];

export default function PlanScreen() {
  const [tab, setTab] = useState<PlanTab>('presales');

  const styles = useThemedStyles((t) => ({
    screen: { flex: 1, backgroundColor: t.colors.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: t.density.pad,
      paddingTop: 10,
      paddingBottom: 6,
    },
    title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, color: t.colors.fg },
    tabBar: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: t.density.pad,
      paddingTop: 6,
      paddingBottom: 4,
    },
    tabPill: {
      paddingVertical: 7,
      paddingHorizontal: 14,
      borderRadius: t.radius.full,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      backgroundColor: t.colors.card,
    },
    tabPillActive: { backgroundColor: t.colors.inverseBg, borderColor: t.colors.inverseBg },
    tabText: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 11,
      letterSpacing: 1,
      color: t.colors.mute,
    },
    tabTextActive: { color: t.colors.inverseFg },
    scrollContent: { paddingBottom: 120 },
  }));

  const body = useMemo(
    () => (tab === 'presales' ? <PresalesTab /> : <PartiesTab />),
    [tab],
  );

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Plan</Text>
      </View>
      <View style={styles.tabBar}>
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <SpringPressable
              key={t.key}
              haptic="none"
              onPress={() => {
                if (t.key !== tab) {
                  haptics.light();
                  setTab(t.key);
                }
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={t.label}
              style={[styles.tabPill, active ? styles.tabPillActive : null]}
            >
              <Text style={[styles.tabText, active ? styles.tabTextActive : null]}>{t.label}</Text>
            </SpringPressable>
          );
        })}
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View key={tab} entering={FadeIn.duration(durations.fadeThrough)}>
          {body}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
