import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { SettingsRow, SettingsSection, SettingsToggle } from '../../components/settings';
import { SpringPressable } from '../../components/ui/SpringPressable';
import { useSettings } from '../../hooks/useSettings';
import type { VisibilityOption } from '../../types/settings';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { useSafeBack } from '../../lib/navigation/safeNavigation';

const VISIBILITY_OPTIONS: Array<{ value: VisibilityOption; label: string; icon: string }> = [
  { value: 'public', label: 'Everyone', icon: 'globe' },
  { value: 'friends', label: 'Friends Only', icon: 'people' },
  { value: 'private', label: 'Only Me', icon: 'lock-closed' },
];

export default function PrivacySettingsScreen() {
  const router = useRouter();
  const { settings, updateSetting, saving } = useSettings();
  const goBack = useSafeBack();
  const { tokens } = useTheme();

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
    description: {
      fontSize: 13,
      color: t.colors.mute,
      lineHeight: 18,
      paddingHorizontal: t.density.pad,
      marginTop: t.spacing.lg,
    },
  }));

  const showVisibilityPicker = (title: string, currentValue: VisibilityOption, onSelect: (value: VisibilityOption) => void) => {
    Alert.alert(
      title,
      'Who can see this?',
      VISIBILITY_OPTIONS.map((option) => ({
        text: `${option.label}${currentValue === option.value ? ' ✓' : ''}`,
        onPress: () => onSelect(option.value),
      }))
    );
  };

  const getVisibilityLabel = (value: VisibilityOption) => {
    return VISIBILITY_OPTIONS.find((o) => o.value === value)?.label || 'Unknown';
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <SpringPressable onPress={goBack} haptic="light" style={styles.backButton} accessibilityRole="button">
          <Ionicons name="arrow-back" size={22} color={tokens.colors.fg} />
        </SpringPressable>
        <Text style={styles.title}>Privacy</Text>
        {saving ? <Ionicons name="sync" size={18} color={tokens.colors.mute} /> : <View style={{ width: 20 }} />}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <SettingsSection title="Profile">
          <SettingsRow
            icon="person"
            label="Profile Visibility"
            value={getVisibilityLabel(settings.profileVisibility)}
            onPress={() =>
              showVisibilityPicker('Profile Visibility', settings.profileVisibility, (value) => void updateSetting('profileVisibility', value))
            }
          />
          <SettingsRow
            icon="musical-notes"
            label="Show Activity"
            value={getVisibilityLabel(settings.activityVisibility)}
            onPress={() =>
              showVisibilityPicker('Activity Visibility', settings.activityVisibility, (value) => void updateSetting('activityVisibility', value))
            }
            isLast
          />
        </SettingsSection>

        <Text style={styles.description}>
          Profile visibility controls who can see your profile. Activity visibility controls who can see your concert logs and feed activity.
        </Text>

        <SettingsSection title="Discovery">
          <SettingsToggle
            icon="search"
            label="Show in Suggestions"
            description="Let others find you in friend suggestions"
            value={settings.showInSuggestions}
            onValueChange={(value) => void updateSetting('showInSuggestions', value)}
          />
          <SettingsToggle
            icon="pricetag"
            label="Allow Tagging"
            description="Let friends tag you in their concert logs"
            value={settings.allowTagging}
            onValueChange={(value) => void updateSetting('allowTagging', value)}
            isLast
          />
        </SettingsSection>

        <SettingsSection title="Blocked">
          <SettingsRow icon="ban" iconColor={tokens.colors.error} label="Blocked Users" onPress={() => router.push('/settings/blocked-users')} isLast />
        </SettingsSection>

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
