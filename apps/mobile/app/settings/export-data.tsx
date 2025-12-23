import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Screen } from '../../components/ui/Screen';
import { exportUserData } from '../../lib/api/settings';
import { colors, radius, spacing } from '../../lib/theme';

export default function ExportDataScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onExport = async () => {
    setLoading(true);
    try {
      const res = await exportUserData();
      if (res.downloadUrl) {
        Alert.alert('Export ready', 'Tap OK to open your download link.', [
          {
            text: 'OK',
            onPress: () => {
              // eslint-disable-next-line no-void
              void (async () => {
                try {
                  const { openURL } = await import('expo-linking');
                  await openURL(res.downloadUrl!);
                } catch {
                  Alert.alert('Error', 'Could not open download link');
                }
              })();
            },
          },
        ]);
      } else {
        Alert.alert('Export requested', res.message || 'We’ll email you when your export is ready.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || e?.message || 'Failed to request export');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button">
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Export Data</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Request a copy of your data</Text>
          <Text style={styles.cardBody}>
            We’ll prepare a download that includes your profile, logs, photos, tickets, and settings.
          </Text>

          <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={() => void onExport()} disabled={loading} accessibilityRole="button">
            {loading ? <ActivityIndicator color={colors.textPrimary} /> : <Text style={styles.buttonText}>Export My Data</Text>}
          </Pressable>
        </View>

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
    paddingHorizontal: 16,
  },
  card: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '900',
  },
  cardBody: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  button: {
    marginTop: spacing.md,
    backgroundColor: colors.brandPurple,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '900',
  },
});



