// app/(tabs)/plan.tsx — THE PLANNING HQ, top to bottom: YOUR SHOWS (your
// upcoming ticketed nights, each with a live countdown + a REMIND ME switch),
// then PARTIES (the Partiful lane — hosting / going / invited + join requests),
// then PRESALES (tracked presales with live countdowns + the ticketed/
// interested agenda). One scroll, three stacked sections.

import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';

import { durations } from '../../lib/motion';
import { useThemedStyles } from '../../lib/theme-context';

import { YourShowsSection } from '../../components/plan/YourShowsSection';
import { FriendOverlapSection } from '../../components/plan/FriendOverlapSection';
import { PartiesTab } from '../../components/plan/PartiesTab';
import { PresalesTab } from '../../components/you/PresalesTab';
import { EventPickerSheet } from '../../components/party/EventPickerSheet';
import { PillButton } from '../../components/ui/PillButton';

export default function PlanScreen() {
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);
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
    title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5, color: t.colors.fg },
    sectionLabel: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 11,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
      paddingHorizontal: t.density.pad,
      marginTop: 24,
      marginBottom: 10,
    },
    scrollContent: { paddingBottom: 120 },
  }));

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Plan</Text>
        {/* §4 Plan header — the primary create affordance for a party. */}
        <PillButton
          title="+ Party"
          variant="primary"
          size="sm"
          springFeedback
          haptic="medium"
          onPress={() => setPickerOpen(true)}
        />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeIn.duration(durations.fadeThrough)}>
          <YourShowsSection />

          {/* WITH FRIENDS — overlap radar; renders nothing without overlap. */}
          <FriendOverlapSection />

          <Text style={styles.sectionLabel}>Parties</Text>
          <PartiesTab />

          <Text style={styles.sectionLabel}>Presales</Text>
          <PresalesTab />
        </Animated.View>
      </ScrollView>

      <EventPickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(event) => {
          setPickerOpen(false);
          router.push({
            pathname: '/party/create',
            params: { eventId: event.id, eventName: event.name, eventDate: event.date },
          });
        }}
      />
    </SafeAreaView>
  );
}
