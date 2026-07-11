import { Stack } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { SettingsSection } from '../../components/settings';
import { PillButton } from '../../components/ui/PillButton';
import { SpringPressable } from '../../components/ui/SpringPressable';
import { useSettings } from '../../hooks/useSettings';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { useSafeBack } from '../../lib/navigation/safeNavigation';

export default function PreferencesScreen() {
  const { settings, updateSetting, saving } = useSettings();
  const goBack = useSafeBack();
  const { tokens } = useTheme();

  const [homeCity, setHomeCity] = useState(settings.homeCity ?? '');
  const [distanceUnit, setDistanceUnit] = useState(settings.distanceUnit);

  useEffect(() => {
    setHomeCity(settings.homeCity ?? '');
    setDistanceUnit(settings.distanceUnit);
  }, [settings.distanceUnit, settings.homeCity]);

  const canSave = useMemo(() => {
    return homeCity.trim() !== (settings.homeCity ?? '') || distanceUnit !== settings.distanceUnit;
  }, [distanceUnit, homeCity, settings.distanceUnit, settings.homeCity]);

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
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 12,
      paddingHorizontal: t.density.cardPad,
    },
    input: {
      flex: 1,
      height: 44,
      color: t.colors.fg,
      fontSize: 15,
      fontWeight: '600',
    },
    segmentRow: { flexDirection: 'row', padding: t.spacing.sm, gap: 8 },
    segment: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      borderRadius: t.radius.md,
      backgroundColor: t.colors.card2,
    },
    segmentSelected: { backgroundColor: t.colors.inverseBg },
    segmentText: { color: t.colors.text, fontWeight: '600', fontSize: 13 },
    segmentTextSelected: { color: t.colors.inverseFg },
    saveWrap: { marginTop: t.spacing.lg, paddingHorizontal: t.density.pad },
  }));

  const onSave = async () => {
    try {
      await Promise.all([
        homeCity.trim() !== (settings.homeCity ?? '') ? updateSetting('homeCity', homeCity.trim()) : Promise.resolve(),
        distanceUnit !== settings.distanceUnit ? updateSetting('distanceUnit', distanceUnit) : Promise.resolve(),
      ]);
      Alert.alert('Saved', 'Your preferences have been updated.', [{ text: 'OK', onPress: goBack }]);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || e?.message || 'Failed to save preferences');
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <SpringPressable onPress={goBack} haptic="light" style={styles.backButton} accessibilityRole="button">
          <Ionicons name="arrow-back" size={22} color={tokens.colors.fg} />
        </SpringPressable>
        <Text style={styles.title}>Preferences</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <SettingsSection title="Home City">
          <View style={styles.inputRow}>
            <Ionicons name="location" size={18} color={tokens.colors.mute} />
            <TextInput
              style={styles.input}
              placeholder="e.g. New York"
              placeholderTextColor={tokens.colors.muteSoft}
              value={homeCity}
              onChangeText={setHomeCity}
              autoCapitalize="words"
              returnKeyType="done"
            />
          </View>
        </SettingsSection>

        <SettingsSection title="Distance Units">
          <View style={styles.segmentRow}>
            <SpringPressable
              style={[styles.segment, distanceUnit === 'miles' && styles.segmentSelected]}
              onPress={() => setDistanceUnit('miles')}
              haptic="light"
              accessibilityRole="button"
            >
              <Text style={[styles.segmentText, distanceUnit === 'miles' && styles.segmentTextSelected]}>Miles</Text>
            </SpringPressable>
            <SpringPressable
              style={[styles.segment, distanceUnit === 'km' && styles.segmentSelected]}
              onPress={() => setDistanceUnit('km')}
              haptic="light"
              accessibilityRole="button"
            >
              <Text style={[styles.segmentText, distanceUnit === 'km' && styles.segmentTextSelected]}>Kilometers</Text>
            </SpringPressable>
          </View>
        </SettingsSection>

        <View style={styles.saveWrap}>
          <PillButton
            title={saving ? 'Saving…' : 'Save'}
            variant="primary"
            size="lg"
            onPress={() => void onSave()}
            disabled={!canSave || saving}
            springFeedback
            haptic="medium"
          />
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
