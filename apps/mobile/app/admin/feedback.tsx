import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../components/ui/Screen';
import { apiClient } from '../../lib/api/client';
import { isAdminUser } from '../../lib/admin/isAdmin';
import { colors, radius, spacing } from '../../lib/theme';
import { useSession } from '../../hooks/useSession';
import { useSafeBack } from '../../lib/navigation/safeNavigation';

type FeedbackRow = {
  id: string;
  type?: string;
  message?: string;
  createdAt?: string;
  email?: string;
  userId?: string;
};

export default function AdminFeedbackScreen() {
  const router = useRouter();
  const goBack = useSafeBack();
  const { user } = useSession();
  const allowed = isAdminUser(user);

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<FeedbackRow[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/feedback');
      setItems((res.data?.feedback ?? res.data ?? []) as FeedbackRow[]);
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

  if (!allowed) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <Pressable onPress={goBack} style={styles.backButton} accessibilityRole="button">
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.title}>Feedback</Text>
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
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Feedback</Text>
        <Pressable onPress={() => void load()} style={styles.refresh} accessibilityRole="button">
          <Ionicons name="refresh" size={20} color={colors.textPrimary} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brandPurple} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          ListEmptyComponent={<Text style={styles.empty}>No feedback (or endpoint not set up yet).</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{(item.type ?? 'feedback').toUpperCase()}</Text>
              {!!item.email && <Text style={styles.meta}>{item.email}</Text>}
              {!!item.userId && <Text style={styles.meta}>user: {item.userId}</Text>}
              <Text style={styles.message}>{item.message ?? ''}</Text>
            </View>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
    color: colors.textPrimary,
  },
  refresh: {
    width: 40,
    height: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  denied: {
    marginTop: spacing.lg,
    color: colors.textTertiary,
    fontWeight: '800',
    textAlign: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    color: colors.textTertiary,
    fontWeight: '800',
    textAlign: 'center',
    paddingTop: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardTitle: {
    color: colors.brandPurple,
    fontWeight: '900',
    fontSize: 12,
    marginBottom: 6,
  },
  meta: {
    color: colors.textTertiary,
    fontWeight: '800',
    fontSize: 12,
  },
  message: {
    marginTop: spacing.sm,
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 20,
  },
});



