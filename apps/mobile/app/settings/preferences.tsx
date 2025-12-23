import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { SettingsSection } from '../../components/settings';
import { Screen } from '../../components/ui/Screen';
import { useSettings } from '../../hooks/useSettings';
import { colors, radius, spacing } from '../../lib/theme';

export default function PreferencesScreen() {
  const router = useRouter();
  const { settings, updateSetting, saving } = useSettings();

  const [homeCity, setHomeCity] = useState(settings.homeCity ?? '');
  const [distanceUnit, setDistanceUnit] = useState(settings.distanceUnit);

  useEffect(() => {
    setHomeCity(settings.homeCity ?? '');
    setDistanceUnit(settings.distanceUnit);
  }, [settings.distanceUnit, settings.homeCity]);

  const canSave = useMemo(() => {
    return homeCity.trim() !== (settings.homeCity ?? '') || distanceUnit !== settings.distanceUnit;
  }, [distanceUnit, homeCity, settings.distanceUnit, settings.homeCity]);

  const onSave = async () => {
    try {
      await Promise.all([
        homeCity.trim() !== (settings.homeCity ?? '') ? updateSetting('homeCity', homeCity.trim()) : Promise.resolve(),
        distanceUnit !== settings.distanceUnit ? updateSetting('distanceUnit', distanceUnit) : Promise.resolve(),
      ]);
      Alert.alert('Saved', 'Your preferences have been updated.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || e?.message || 'Failed to save preferences');
    }
  };

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button">
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Preferences</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <SettingsSection title="Home City">
          <View style={styles.inputRow}>
            <Ionicons name="location" size={18} color={colors.brandPurple} />
            <TextInput
              style={styles.input}
              placeholder="e.g. New York"
              placeholderTextColor={colors.textTertiary}
              value={homeCity}
              onChangeText={setHomeCity}
              autoCapitalize="words"
              returnKeyType="done"
            />
          </View>
        </SettingsSection>

        <SettingsSection title="Distance Units">
          <View style={styles.segmentRow}>
            <Pressable
              style={[styles.segment, distanceUnit === 'miles' && styles.segmentSelected]}
              onPress={() => setDistanceUnit('miles')}
              accessibilityRole="button"
            >
              <Text style={[styles.segmentText, distanceUnit === 'miles' && styles.segmentTextSelected]}>Miles</Text>
            </Pressable>
            <Pressable
              style={[styles.segment, distanceUnit === 'km' && styles.segmentSelected]}
              onPress={() => setDistanceUnit('km')}
              accessibilityRole="button"
            >
              <Text style={[styles.segmentText, distanceUnit === 'km' && styles.segmentTextSelected]}>Kilometers</Text>
            </Pressable>
          </View>
        </SettingsSection>

        <Pressable
          style={[styles.saveButton, (!canSave || saving) && styles.saveButtonDisabled]}
          onPress={() => void onSave()}
          disabled={!canSave || saving}
          accessibilityRole="button"
        >
          {saving ? <ActivityIndicator color={colors.textPrimary} /> : <Text style={styles.saveText}>Save</Text>}
        </Pressable>

        <View style={{ height: 80 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: spacing.lg,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    height: 44,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  segmentRow: {
    flexDirection: 'row',
    padding: 8,
    gap: 8,
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundAlt,
  },
  segmentSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderColor: colors.brandPurple,
  },
  segmentText: {
    color: colors.textSecondary,
    fontWeight: '800',
    fontSize: 13,
  },
  segmentTextSelected: {
    color: colors.brandPurple,
  },
  saveButton: {
    marginTop: spacing.lg,
    marginHorizontal: 16,
    backgroundColor: colors.brandPurple,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
});



