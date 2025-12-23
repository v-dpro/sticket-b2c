import { Stack, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Screen } from '../components/ui/Screen';
import { colors, radius, spacing } from '../lib/theme';
import { useNotificationPrefs } from '../hooks/useNotificationPrefs';

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { prefs, loading, saving, updatePref } = useNotificationPrefs();

  if (loading) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brandPurple} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button">
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Notification Settings</Text>
        {saving ? <ActivityIndicator size="small" color={colors.brandPurple} /> : <View style={{ width: 20 }} />}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.masterToggle}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.masterLabel}>Push Notifications</Text>
              <Text style={styles.masterDescription}>Receive notifications on your device</Text>
            </View>
            <Switch
              value={prefs.pushEnabled}
              onValueChange={(value) => void updatePref('pushEnabled', value)}
              trackColor={{ false: colors.border, true: colors.brandPurple }}
              thumbColor={colors.textPrimary}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Social</Text>

          <SettingRow
            label="New followers"
            description="When someone follows you"
            value={prefs.follows}
            onChange={(value) => void updatePref('follows', value)}
            disabled={!prefs.pushEnabled}
          />
          <SettingRow
            label="Comments"
            description="When someone comments on your log"
            value={prefs.comments}
            onChange={(value) => void updatePref('comments', value)}
            disabled={!prefs.pushEnabled}
          />
          <SettingRow
            label="Tags"
            description="When someone tags you in a log"
            value={prefs.tags}
            onChange={(value) => void updatePref('tags', value)}
            disabled={!prefs.pushEnabled}
          />
          <SettingRow
            label="Was there too"
            description="When someone marks they were at your show"
            value={prefs.wasThere}
            onChange={(value) => void updatePref('wasThere', value)}
            disabled={!prefs.pushEnabled}
          />
          <SettingRow
            label="Friend activity"
            description="When friends log new shows"
            value={prefs.friendLogged}
            onChange={(value) => void updatePref('friendLogged', value)}
            disabled={!prefs.pushEnabled}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shows & Tickets</Text>

          <SettingRow
            label="Artist announcements"
            description="When artists you follow announce shows"
            value={prefs.artistAnnouncements}
            onChange={(value) => void updatePref('artistAnnouncements', value)}
            disabled={!prefs.pushEnabled}
          />
          <SettingRow
            label="Tickets on sale"
            description="When tickets go on sale for shows you’re interested in"
            value={prefs.ticketsOnSale}
            onChange={(value) => void updatePref('ticketsOnSale', value)}
            disabled={!prefs.pushEnabled}
          />
          <SettingRow
            label="Show reminders"
            description="Reminder the day before your shows"
            value={prefs.showReminders}
            onChange={(value) => void updatePref('showReminders', value)}
            disabled={!prefs.pushEnabled}
          />
          <SettingRow
            label="Post-show prompts"
            description="Reminder to log after attending a show"
            value={prefs.postShowPrompts}
            onChange={(value) => void updatePref('postShowPrompts', value)}
            disabled={!prefs.pushEnabled}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Email</Text>

          <View style={styles.emailOptions}>
            <EmailOption label="No emails" selected={prefs.emailDigest === 'none'} onSelect={() => void updatePref('emailDigest', 'none')} />
            <EmailOption label="Daily" selected={prefs.emailDigest === 'daily'} onSelect={() => void updatePref('emailDigest', 'daily')} />
            <EmailOption label="Weekly" selected={prefs.emailDigest === 'weekly'} onSelect={() => void updatePref('emailDigest', 'weekly')} />
          </View>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </Screen>
  );
}

function SettingRow({
  label,
  description,
  value,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.settingRow, disabled ? styles.settingDisabled : null]}>
      <View style={styles.settingInfo}>
        <Text style={[styles.settingLabel, disabled ? styles.textDisabled : null]}>{label}</Text>
        <Text style={[styles.settingDescription, disabled ? styles.textDisabled : null]}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.brandPurple }}
        thumbColor={colors.textPrimary}
        disabled={disabled}
      />
    </View>
  );
}

function EmailOption({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Pressable style={[styles.emailOption, selected ? styles.emailOptionSelected : null]} onPress={onSelect} accessibilityRole="button">
      <Text style={[styles.emailOptionText, selected ? styles.emailOptionTextSelected : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: spacing.lg,
    paddingBottom: 12,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: spacing.lg,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  masterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  masterLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  masterDescription: {
    fontSize: 13,
    color: colors.textTertiary,
    marginTop: 2,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingDisabled: {
    opacity: 0.5,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  settingDescription: {
    fontSize: 13,
    color: colors.textTertiary,
    marginTop: 2,
  },
  textDisabled: {
    color: colors.textTertiary,
  },
  emailOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  emailOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emailOptionSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderColor: colors.brandPurple,
  },
  emailOptionText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  emailOptionTextSelected: {
    color: colors.brandPurple,
  },
});



