import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { useRouter, Stack } from 'expo-router';
import React from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { DangerButton, ServiceConnection, SettingsRow, SettingsSection } from '../../components/settings';
import { SpringPressable } from '../../components/ui/SpringPressable';
import { useAccountActions } from '../../hooks/useAccountActions';
import { useSettings } from '../../hooks/useSettings';
import { useSession } from '../../hooks/useSession';
import { isAdminUser } from '../../lib/admin/isAdmin';
import { useTheme, useThemedStyles, type ThemePreference } from '../../lib/theme-context';
import { useSafeBack } from '../../lib/navigation/safeNavigation';

const APPEARANCE_OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: 'system', label: 'System' },
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
];

function AppearancePicker() {
  const { mode, setMode } = useTheme();
  const styles = useThemedStyles((t) => ({
    row: {
      flexDirection: 'row',
      gap: 8,
      padding: t.spacing.sm,
    },
    segment: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      borderRadius: t.radius.md,
      backgroundColor: t.colors.card2,
    },
    segmentSelected: {
      backgroundColor: t.colors.inverseBg,
    },
    text: {
      color: t.colors.text,
      fontWeight: '600',
      fontSize: 13,
    },
    textSelected: {
      color: t.colors.inverseFg,
    },
  }));

  return (
    <View style={styles.row}>
      {APPEARANCE_OPTIONS.map((opt) => {
        const active = mode === opt.value;
        return (
          <SpringPressable
            key={opt.value}
            onPress={() => setMode(opt.value)}
            haptic="light"
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.segment, active && styles.segmentSelected]}
          >
            <Text style={[styles.text, active && styles.textSelected]}>{opt.label}</Text>
          </SpringPressable>
        );
      })}
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const goBack = useSafeBack();
  const { tokens } = useTheme();
  const { user } = useSession();
  const { settings, refresh } = useSettings();
  const { logout, loading: logoutLoading } = useAccountActions();

  const appVersion = (Constants.expoConfig as any)?.version || '1.0.0';

  const styles = useThemedStyles((t) => ({
    screen: {
      flex: 1,
      backgroundColor: t.colors.bg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: t.density.pad,
      paddingTop: t.spacing.md,
      paddingBottom: 12,
    },
    backButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
    },
    title: {
      fontSize: 34,
      fontWeight: '800',
      letterSpacing: -0.6,
      color: t.colors.fg,
    },
    scrollView: {
      flex: 1,
    },
    version: {
      alignItems: 'center',
      marginTop: t.spacing.xl,
      paddingBottom: t.spacing.lg,
    },
    versionText: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 12,
      color: t.colors.mute,
      fontWeight: '500',
    },
    versionSubtext: {
      fontSize: 12,
      color: t.colors.muteSoft,
      marginTop: 4,
      fontWeight: '400',
    },
  }));

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => void logout() },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <SpringPressable onPress={goBack} haptic="light" style={styles.backButton} accessibilityRole="button">
          <Ionicons name="arrow-back" size={22} color={tokens.colors.fg} />
        </SpringPressable>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <SettingsSection title="Account">
          <SettingsRow icon="person" label="Edit Profile" onPress={() => router.push('/edit-profile')} />
          <SettingsRow icon="mail" label="Email" value={user?.email} onPress={() => router.push('/settings/change-email')} />
          <SettingsRow icon="lock-closed" label="Password" value="••••••••" onPress={() => router.push('/settings/change-password')} isLast />
        </SettingsSection>

        <SettingsSection title="Appearance">
          <AppearancePicker />
        </SettingsSection>

        <SettingsSection title="Connected Services">
          <ServiceConnection
            service="spotify"
            name="Spotify"
            icon="logo-spotify"
            iconColor="#1DB954"
            connected={settings.spotifyConnected}
            username={settings.spotifyUsername}
            onRefresh={refresh}
          />
          <ServiceConnection
            service="apple_music"
            name="Apple Music"
            icon="musical-notes"
            iconColor="#FA243C"
            connected={settings.appleMusicConnected}
            onRefresh={refresh}
            isLast
          />
        </SettingsSection>

        <SettingsSection title="Privacy">
          <SettingsRow icon="eye" label="Privacy Settings" onPress={() => router.push('/settings/privacy')} />
          <SettingsRow icon="locate" label="How people find you" onPress={() => router.push('/settings/discovery')} isLast />
        </SettingsSection>

        <SettingsSection title="Notifications">
          <SettingsRow icon="notifications" label="Notification Preferences" onPress={() => router.push('/notification-settings')} isLast />
        </SettingsSection>

        <SettingsSection title="Preferences">
          <SettingsRow icon="location" label="Home City" value={settings.homeCity || 'Not set'} onPress={() => router.push('/settings/preferences')} />
          <SettingsRow
            icon="speedometer"
            label="Distance Unit"
            value={settings.distanceUnit === 'miles' ? 'Miles' : 'Kilometers'}
            onPress={() => router.push('/settings/preferences')}
            isLast
          />
        </SettingsSection>

        <SettingsSection title="Data">
          <SettingsRow icon="download" label="Export My Data" onPress={() => router.push('/settings/export-data')} />
          <SettingsRow
            icon="trash"
            label="Clear Cache"
            onPress={() => {
              Alert.alert('Clear Cache', 'Cache cleared successfully!');
            }}
            isLast
          />
        </SettingsSection>

        <SettingsSection title="Support">
          <SettingsRow icon="help-circle" label="Help & FAQ" onPress={() => void Linking.openURL('https://sticket.in/help')} />
          <SettingsRow icon="chatbubble-ellipses" label="Send Feedback" onPress={() => router.push('/feedback')} />
          <SettingsRow icon="bug" label="Report a Bug" onPress={() => void Linking.openURL('mailto:support@sticket.in?subject=Bug Report')} />
          <SettingsRow icon="star" label="Rate Sticket" onPress={() => void Linking.openURL('https://apps.apple.com/app/sticket')} isLast />
        </SettingsSection>

        {isAdminUser(user) ? (
          <SettingsSection title="Admin">
            <SettingsRow icon="shield" label="Admin Panel" onPress={() => router.push('/admin')} isLast />
          </SettingsSection>
        ) : null}

        {__DEV__ ? (
          <SettingsSection title="Developer">
            <SettingsRow icon="color-palette" label="Figma Screens" onPress={() => router.push('/(figma)')} isLast />
          </SettingsSection>
        ) : null}

        <SettingsSection title="Legal">
          <SettingsRow icon="document-text" label="Terms of Service" onPress={() => router.push('/legal/terms')} />
          <SettingsRow icon="shield-checkmark" label="Privacy Policy" onPress={() => router.push('/legal/privacy')} />
          <SettingsRow icon="code" label="Open Source Licenses" onPress={() => router.push('/settings/licenses')} isLast />
        </SettingsSection>

        <View style={{ marginTop: tokens.spacing.xl }}>
          <DangerButton icon="log-out" label="Log Out" onPress={handleLogout} loading={logoutLoading} />
        </View>

        <View style={{ marginTop: tokens.spacing.md }}>
          <DangerButton icon="trash" label="Delete Account" onPress={() => router.push('/settings/delete-account')} isDestructive />
        </View>

        <View style={styles.version}>
          <Text style={styles.versionText}>Sticket v{appVersion}</Text>
          <Text style={styles.versionSubtext}>Made with love for live music fans</Text>
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
