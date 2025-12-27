import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Screen } from '../../components/ui/Screen';
import { apiClient } from '../../lib/api/client';
import { isAdminUser } from '../../lib/admin/isAdmin';
import { colors, radius, spacing } from '../../lib/theme';
import { useSession } from '../../hooks/useSession';
import { useSafeBack } from '../../lib/navigation/safeNavigation';

type AdminUserRow = {
  id: string;
  email?: string;
  username?: string;
  status?: 'ACTIVE' | 'BANNED';
};

export default function AdminUsersScreen() {
  const router = useRouter();
  const goBack = useSafeBack();
  const { user } = useSession();

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<AdminUserRow[]>([]);

  const allowed = isAdminUser(user);

  const canSearch = useMemo(() => query.trim().length >= 2, [query]);

  useEffect(() => {
    if (!allowed) return;
    if (!canSearch) {
      setItems([]);
      return;
    }

    let mounted = true;
    setLoading(true);

    const t = setTimeout(() => {
      apiClient
        .get('/admin/users', { params: { q: query.trim() } })
        .then((res) => {
          if (!mounted) return;
          setItems((res.data?.users ?? res.data ?? []) as AdminUserRow[]);
        })
        .catch(() => {
          if (!mounted) return;
          setItems([]);
        })
        .finally(() => {
          if (!mounted) return;
          setLoading(false);
        });
    }, 250);

    return () => {
      mounted = false;
      clearTimeout(t);
    };
  }, [allowed, canSearch, query]);

  const onBanToggle = async (u: AdminUserRow) => {
    try {
      const action = u.status === 'BANNED' ? 'unban' : 'ban';
      await apiClient.post(`/admin/users/${u.id}/${action}`);
      Alert.alert('Done', `User ${action}ned.`);
      setItems((prev) => prev.map((x) => (x.id === u.id ? { ...x, status: action === 'ban' ? 'BANNED' : 'ACTIVE' } : x)));
    } catch {
      Alert.alert('Failed', 'Could not update user.');
    }
  };

  if (!allowed) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <Pressable onPress={goBack} style={styles.backButton} accessibilityRole="button">
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.title}>Users</Text>
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
        <Text style={styles.title}>Users</Text>
        <View style={{ width: 40 }} />
      </View>

      <TextInput
        style={styles.search}
        placeholder="Search by email or username (min 2 chars)…"
        placeholderTextColor={colors.textTertiary}
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brandPurple} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          ListEmptyComponent={
            <Text style={styles.empty}>{canSearch ? 'No users found.' : 'Type at least 2 characters to search.'}</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{item.username || item.email || item.id}</Text>
                <Text style={styles.rowSub}>{item.email ?? item.id}</Text>
              </View>
              <Pressable
                style={[styles.action, item.status === 'BANNED' ? styles.unban : styles.ban]}
                onPress={() => void onBanToggle(item)}
                accessibilityRole="button"
              >
                <Text style={styles.actionText}>{item.status === 'BANNED' ? 'Unban' : 'Ban'}</Text>
              </Pressable>
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
  denied: {
    marginTop: spacing.lg,
    color: colors.textTertiary,
    fontWeight: '800',
    textAlign: 'center',
  },
  search: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.md,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  rowTitle: {
    color: colors.textPrimary,
    fontWeight: '900',
    fontSize: 14,
  },
  rowSub: {
    marginTop: 2,
    color: colors.textTertiary,
    fontWeight: '800',
    fontSize: 12,
  },
  action: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  ban: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: colors.error,
  },
  unban: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: colors.success,
  },
  actionText: {
    color: colors.textPrimary,
    fontWeight: '900',
    fontSize: 12,
  },
});



