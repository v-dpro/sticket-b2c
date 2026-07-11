import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { PillButton } from '../../components/ui/PillButton';
import { SpringPressable } from '../../components/ui/SpringPressable';
import { exportUserData } from '../../lib/api/settings';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { useSafeBack } from '../../lib/navigation/safeNavigation';

export default function ExportDataScreen() {
  const goBack = useSafeBack();
  const { tokens } = useTheme();
  const [loading, setLoading] = useState(false);

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
    scrollView: { flex: 1, paddingHorizontal: t.density.pad },
    card: {
      marginTop: t.spacing.lg,
      backgroundColor: t.colors.card,
      borderRadius: t.radius.lg,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      padding: t.density.cardPad,
      gap: 10,
    },
    cardTitle: { color: t.colors.fg, fontSize: 16, fontWeight: '700' },
    cardBody: { color: t.colors.textSoft, fontSize: 14, fontWeight: '400', lineHeight: 20 },
    buttonWrap: { marginTop: t.spacing.md },
  }));

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
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <SpringPressable onPress={goBack} haptic="light" style={styles.backButton} accessibilityRole="button">
          <Ionicons name="arrow-back" size={22} color={tokens.colors.fg} />
        </SpringPressable>
        <Text style={styles.title}>Export Data</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Request a copy of your data</Text>
          <Text style={styles.cardBody}>
            We’ll prepare a download that includes your profile, logs, photos, tickets, and settings.
          </Text>

          <View style={styles.buttonWrap}>
            <PillButton
              title={loading ? 'Requesting…' : 'Export My Data'}
              variant="primary"
              size="lg"
              onPress={() => void onExport()}
              disabled={loading}
              springFeedback
              haptic="medium"
            />
          </View>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
