import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { SettingsRow, SettingsSection, SettingsToggle } from '../../components/settings';
import { SpringPressable } from '../../components/ui/SpringPressable';
import { useSettings } from '../../hooks/useSettings';
import {
  getPrivacyControls,
  updatePrivacyControls,
  type AudienceSetting,
  type LogVisibilityDefault,
  type PrivacyControls,
  type ProfileVisibility,
} from '../../lib/api/privacy';
import type { VisibilityOption } from '../../types/settings';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { useSafeBack } from '../../lib/navigation/safeNavigation';

const VISIBILITY_OPTIONS: Array<{ value: VisibilityOption; label: string; icon: string }> = [
  { value: 'public', label: 'Everyone', icon: 'globe' },
  { value: 'friends', label: 'Friends Only', icon: 'people' },
  { value: 'private', label: 'Only Me', icon: 'lock-closed' },
];

const PROFILE_VISIBILITY_OPTIONS: Array<{ value: ProfileVisibility; label: string }> = [
  { value: 'PUBLIC', label: 'Everyone' },
  { value: 'FRIENDS', label: 'Friends Only' },
  { value: 'PRIVATE', label: 'Only Me' },
];

const LOG_DEFAULT_OPTIONS: Array<{ value: LogVisibilityDefault; label: string }> = [
  { value: 'PUBLIC', label: 'Everyone' },
  { value: 'FRIENDS', label: 'Friends Only' },
];

const AUDIENCE_OPTIONS: Array<{ value: AudienceSetting; label: string }> = [
  { value: 'EVERYONE', label: 'Everyone' },
  { value: 'FRIENDS', label: 'Friends Only' },
  { value: 'NOBODY', label: 'No One' },
];

// Defaults mirror the server column defaults — everything open — so the
// screen renders something sane while GET /users/me/privacy is in flight.
const DEFAULT_PRIVACY: PrivacyControls = {
  profileVisibility: 'PUBLIC',
  defaultLogVisibility: 'PUBLIC',
  showTimeline: true,
  showCollection: true,
  showMapCities: true,
  allowPartyInvites: 'EVERYONE',
  allowMentions: 'EVERYONE',
  appearInTasteMatch: true,
};

// Optimistic per-key updates against /users/me/privacy with revert on
// failure — same shape as hooks/useSettings, kept local to this screen.
function usePrivacyControls() {
  const [privacy, setPrivacy] = useState<PrivacyControls>(DEFAULT_PRIVACY);
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const data = await getPrivacyControls();
      setPrivacy(data);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch privacy controls:', err);
    }
  }, []);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  const update = async <K extends keyof PrivacyControls>(key: K, value: PrivacyControls[K]) => {
    const old = { ...privacy };
    setPrivacy((p) => ({ ...p, [key]: value }));
    setSaving(true);
    try {
      const updated = await updatePrivacyControls({ [key]: value } as Partial<PrivacyControls>);
      setPrivacy(updated);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to update privacy controls:', err);
      setPrivacy(old);
    } finally {
      setSaving(false);
    }
  };

  return { privacy, saving, update };
}

export default function PrivacySettingsScreen() {
  const router = useRouter();
  const { settings, updateSetting, saving } = useSettings();
  const { privacy, saving: privacySaving, update: updatePrivacy } = usePrivacyControls();
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

  // One picker helper per option list — all use the same Alert pattern.
  const showPicker = <T extends string>(
    title: string,
    options: Array<{ value: T; label: string }>,
    currentValue: T,
    onSelect: (value: T) => void
  ) => {
    Alert.alert(
      title,
      'Who can see this?',
      options.map((option) => ({
        text: `${option.label}${currentValue === option.value ? ' ✓' : ''}`,
        onPress: () => onSelect(option.value),
      }))
    );
  };

  const labelFor = <T extends string>(options: Array<{ value: T; label: string }>, value: T) =>
    options.find((o) => o.value === value)?.label || 'Unknown';

  const isSaving = saving || privacySaving;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <SpringPressable onPress={goBack} haptic="light" style={styles.backButton} accessibilityRole="button">
          <Ionicons name="arrow-back" size={22} color={tokens.colors.fg} />
        </SpringPressable>
        <Text style={styles.title}>Privacy</Text>
        {isSaving ? <Ionicons name="sync" size={18} color={tokens.colors.mute} /> : <View style={{ width: 20 }} />}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <SettingsSection title="Profile">
          <SettingsRow
            icon="person"
            label="Profile Visibility"
            value={labelFor(PROFILE_VISIBILITY_OPTIONS, privacy.profileVisibility)}
            onPress={() =>
              showPicker('Profile Visibility', PROFILE_VISIBILITY_OPTIONS, privacy.profileVisibility, (value) =>
                void updatePrivacy('profileVisibility', value)
              )
            }
          />
          <SettingsRow
            icon="musical-notes"
            label="Show Activity"
            value={labelFor(VISIBILITY_OPTIONS, settings.activityVisibility)}
            onPress={() =>
              showPicker('Activity Visibility', VISIBILITY_OPTIONS, settings.activityVisibility, (value) =>
                void updateSetting('activityVisibility', value)
              )
            }
            isLast
          />
        </SettingsSection>

        <Text style={styles.description}>
          Profile visibility controls who can see your full profile — when it&apos;s limited, others only see your name and
          avatar. Activity visibility controls who can see your concert logs and feed activity.
        </Text>

        <SettingsSection title="Memories">
          <SettingsRow
            icon="ticket"
            label="New Memory Default"
            value={labelFor(LOG_DEFAULT_OPTIONS, privacy.defaultLogVisibility)}
            onPress={() =>
              showPicker('New Memory Default', LOG_DEFAULT_OPTIONS, privacy.defaultLogVisibility, (value) =>
                void updatePrivacy('defaultLogVisibility', value)
              )
            }
            isLast
          />
        </SettingsSection>

        <Text style={styles.description}>Who can see a new memory when you don&apos;t choose at log time.</Text>

        <SettingsSection title="Profile Sections">
          <SettingsToggle
            icon="calendar"
            label="Show Timeline"
            description="Let others see your show timeline"
            value={privacy.showTimeline}
            onValueChange={(value) => void updatePrivacy('showTimeline', value)}
          />
          <SettingsToggle
            icon="albums"
            label="Show Collection"
            description="Let others see your logged shows"
            value={privacy.showCollection}
            onValueChange={(value) => void updatePrivacy('showCollection', value)}
          />
          <SettingsToggle
            icon="map"
            label="Show Map & Cities"
            description="Let others see where you've seen shows"
            value={privacy.showMapCities}
            onValueChange={(value) => void updatePrivacy('showMapCities', value)}
            isLast
          />
        </SettingsSection>

        <SettingsSection title="Social">
          <SettingsRow
            icon="sparkles"
            label="Party Invites"
            value={labelFor(AUDIENCE_OPTIONS, privacy.allowPartyInvites)}
            onPress={() =>
              showPicker('Party Invites', AUDIENCE_OPTIONS, privacy.allowPartyInvites, (value) =>
                void updatePrivacy('allowPartyInvites', value)
              )
            }
          />
          <SettingsRow
            icon="at"
            label="Mentions"
            value={labelFor(AUDIENCE_OPTIONS, privacy.allowMentions)}
            onPress={() =>
              showPicker('Mentions', AUDIENCE_OPTIONS, privacy.allowMentions, (value) =>
                void updatePrivacy('allowMentions', value)
              )
            }
            isLast
          />
        </SettingsSection>

        <Text style={styles.description}>
          Mentions of you always stay in the text — this only controls who can send you a mention notification.
        </Text>

        <SettingsSection title="Discovery">
          <SettingsToggle
            icon="pulse"
            label="Appear in Taste Match"
            description="Let others see their taste match with you"
            value={privacy.appearInTasteMatch}
            onValueChange={(value) => void updatePrivacy('appearInTasteMatch', value)}
          />
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
