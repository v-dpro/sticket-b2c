import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { SpringPressable } from '../components/ui/SpringPressable';
import { getFollowing, type FollowUserListItem } from '../lib/api/profile';
import { useSession } from '../hooks/useSession';
import { useSafeBack } from '../lib/navigation/safeNavigation';
import { useTheme, useThemedStyles } from '../lib/theme-context';

function UserRow({ item, onPress }: { item: FollowUserListItem; onPress: () => void }) {
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
    avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: t.colors.hairline },
    avatarPlaceholder: { backgroundColor: t.colors.card2, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: t.colors.fg, fontWeight: '700' },
    displayName: { color: t.colors.fg, fontSize: 14, fontWeight: '600' },
    username: { color: t.colors.mute, fontSize: 12, marginTop: 2 },
  }));

  return (
    <SpringPressable style={styles.row} onPress={onPress} haptic="light" accessibilityRole="button">
      {item.avatarUrl ? (
        <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarText}>{(item.displayName || item.username).charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.displayName} numberOfLines={1}>
          {item.displayName || item.username}
        </Text>
        <Text style={styles.username} numberOfLines={1}>
          @{item.username}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={tokens.colors.muteSoft} />
    </SpringPressable>
  );
}

export default function FollowingScreen() {
  const router = useRouter();
  const goBack = useSafeBack();
  const { tokens } = useTheme();
  const { user } = useSession();
  const { userId } = useLocalSearchParams<{ userId?: string }>();

  const targetUserId = useMemo(() => userId || user?.id || '', [userId, user?.id]);

  const [items, setItems] = useState<FollowUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const styles = useThemedStyles((t) => ({
    container: { flex: 1, backgroundColor: t.colors.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    backButton: { padding: 8 },
    headerTitle: { fontSize: 16, fontWeight: '700', color: t.colors.fg },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    separator: { height: 1, backgroundColor: t.colors.hairline, marginLeft: 16 + 44 + 12 },
    empty: { paddingVertical: 48, alignItems: 'center', gap: 12 },
    emptyText: { color: t.colors.mute },
  }));

  const load = useCallback(async () => {
    if (!targetUserId) return;
    setLoading(true);
    try {
      const data = await getFollowing(targetUserId, { limit: 50, offset: 0 });
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const onPressUser = (id: string) => {
    router.push({ pathname: '/profile/[id]', params: { id } });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <SpringPressable onPress={goBack} haptic="light" style={styles.backButton} accessibilityRole="button">
          <Ionicons name="arrow-back" size={24} color={tokens.colors.fg} />
        </SpringPressable>
        <Text style={styles.headerTitle}>Following</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={tokens.colors.mute} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => <UserRow item={item} onPress={() => onPressUser(item.id)} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.colors.mute} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="person-add-outline" size={48} color={tokens.colors.muteSoft} />
              <Text style={styles.emptyText}>Not following anyone yet</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
