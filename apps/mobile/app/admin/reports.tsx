import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from 'react-native';

import { Screen } from '../../components/ui/Screen';
import { apiClient } from '../../lib/api/client';
import { isAdminUser } from '../../lib/admin/isAdmin';
import { radius, spacing } from '../../lib/theme';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { useSession } from '../../hooks/useSession';
import { useSafeBack } from '../../lib/navigation/safeNavigation';

type ReportRow = {
  id: string;
  reason?: string;
  status?: 'OPEN' | 'RESOLVED';
  createdAt?: string;
  reporterEmail?: string;
  targetUserEmail?: string;
};

export default function AdminReportsScreen() {
  const router = useRouter();
  const goBack = useSafeBack();
  const { user } = useSession();
  const allowed = isAdminUser(user);
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
    },
    backButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
    },
    title: {
      fontSize: 18,
      fontWeight: '900',
      color: t.colors.textHi,
    },
    refresh: {
      width: 40,
      height: 40,
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    denied: {
      marginTop: spacing.lg,
      color: t.colors.textLo,
      fontWeight: '800',
      textAlign: 'center',
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    empty: {
      color: t.colors.textLo,
      fontWeight: '800',
      textAlign: 'center',
      paddingTop: spacing.lg,
    },
    card: {
      flexDirection: 'row',
      gap: spacing.sm,
      alignItems: 'center',
      backgroundColor: t.colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    cardTitle: {
      color: t.colors.textHi,
      fontWeight: '900',
      fontSize: 14,
    },
    cardSub: {
      marginTop: 2,
      color: t.colors.textLo,
      fontWeight: '800',
      fontSize: 12,
    },
    action: {
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      borderRadius: radius.md,
      backgroundColor: 'rgba(34, 197, 94, 0.15)',
      borderWidth: 1,
      borderColor: t.colors.success,
    },
    actionDisabled: {
      opacity: 0.6,
    },
    actionText: {
      color: t.colors.textHi,
      fontWeight: '900',
      fontSize: 12,
    },
  }));

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ReportRow[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/reports');
      setItems((res.data?.reports ?? res.data ?? []) as ReportRow[]);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!allowed) return;
    void load();
  }, [allowed]);

  const resolve = async (id: string) => {
    try {
      await apiClient.post(`/admin/reports/${id}/resolve`);
      setItems((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'RESOLVED' } : r)));
    } catch {
      Alert.alert('Failed', 'Could not resolve report.');
    }
  };

  if (!allowed) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <Pressable onPress={goBack} style={styles.backButton} accessibilityRole="button">
            <Ionicons name="arrow-back" size={22} color={tokens.colors.textHi} />
          </Pressable>
          <Text style={styles.title}>Reports</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.denied}>Not authorized.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backButton} accessibilityRole="button">
          <Ionicons name="arrow-back" size={22} color={tokens.colors.textHi} />
        </Pressable>
        <Text style={styles.title}>Reports</Text>
        <Pressable onPress={() => void load()} style={styles.refresh} accessibilityRole="button">
          <Ionicons name="refresh" size={20} color={tokens.colors.textHi} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={tokens.colors.brandPurple} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          ListEmptyComponent={<Text style={styles.empty}>No reports (or endpoint not set up yet).</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.reason ?? 'Report'}</Text>
                <Text style={styles.cardSub}>Status: {item.status ?? 'OPEN'}</Text>
                {!!item.targetUserEmail && <Text style={styles.cardSub}>Target: {item.targetUserEmail}</Text>}
                {!!item.reporterEmail && <Text style={styles.cardSub}>Reporter: {item.reporterEmail}</Text>}
              </View>
              <Pressable
                style={[styles.action, (item.status ?? 'OPEN') === 'RESOLVED' && styles.actionDisabled]}
                onPress={() => void resolve(item.id)}
                disabled={(item.status ?? 'OPEN') === 'RESOLVED'}
                accessibilityRole="button"
              >
                <Text style={styles.actionText}>{(item.status ?? 'OPEN') === 'RESOLVED' ? 'Resolved' : 'Resolve'}</Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </Screen>
  );
}



