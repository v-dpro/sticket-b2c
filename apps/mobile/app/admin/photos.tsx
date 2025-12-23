import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../components/ui/Screen';
import { apiClient } from '../../lib/api/client';
import { isAdminUser } from '../../lib/admin/isAdmin';
import { colors, radius, spacing } from '../../lib/theme';
import { useSession } from '../../hooks/useSession';

type PhotoRow = {
  id: string;
  photoUrl?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt?: string;
  userEmail?: string;
};

export default function AdminPhotosScreen() {
  const router = useRouter();
  const { user } = useSession();
  const allowed = isAdminUser(user);

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<PhotoRow[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/photos');
      setItems((res.data?.photos ?? res.data ?? []) as PhotoRow[]);
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

  const update = async (id: string, action: 'approve' | 'reject') => {
    try {
      await apiClient.post(`/admin/photos/${id}/${action}`);
      setItems((prev) => prev.map((p) => (p.id === id ? { ...p, status: action === 'approve' ? 'APPROVED' : 'REJECTED' } : p)));
    } catch {
      Alert.alert('Failed', 'Could not update photo.');
    }
  };

  if (!allowed) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button">
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.title}>Photos</Text>
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
        <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button">
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Photos</Text>
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
          ListEmptyComponent={<Text style={styles.empty}>No photos (or endpoint not set up yet).</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.userEmail ?? 'Photo'}</Text>
                <Text style={styles.cardSub}>Status: {item.status ?? 'PENDING'}</Text>
                {!!item.photoUrl && <Text style={styles.cardSub}>URL: {item.photoUrl}</Text>}
              </View>

              <View style={styles.actionsCol}>
                <Pressable
                  style={[styles.action, styles.approve, (item.status ?? 'PENDING') === 'APPROVED' && styles.actionDisabled]}
                  onPress={() => void update(item.id, 'approve')}
                  disabled={(item.status ?? 'PENDING') === 'APPROVED'}
                  accessibilityRole="button"
                >
                  <Text style={styles.actionText}>Approve</Text>
                </Pressable>
                <Pressable
                  style={[styles.action, styles.reject, (item.status ?? 'PENDING') === 'REJECTED' && styles.actionDisabled]}
                  onPress={() => void update(item.id, 'reject')}
                  disabled={(item.status ?? 'PENDING') === 'REJECTED'}
                  accessibilityRole="button"
                >
                  <Text style={styles.actionText}>Reject</Text>
                </Pressable>
              </View>
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
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontWeight: '900',
    fontSize: 14,
  },
  cardSub: {
    marginTop: 2,
    color: colors.textTertiary,
    fontWeight: '800',
    fontSize: 12,
  },
  actionsCol: {
    gap: spacing.sm,
    justifyContent: 'center',
  },
  action: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  approve: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: colors.success,
  },
  reject: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: colors.error,
  },
  actionDisabled: {
    opacity: 0.6,
  },
  actionText: {
    color: colors.textPrimary,
    fontWeight: '900',
    fontSize: 12,
  },
});



