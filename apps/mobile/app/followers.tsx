import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { getFollowers, type FollowUserListItem } from '../lib/api/profile';
import { useSession } from '../hooks/useSession';

function UserRow({ item, onPress }: { item: FollowUserListItem; onPress: () => void }) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
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
      <Ionicons name="chevron-forward" size={18} color="#6B6B8D" />
    </Pressable>
  );
}

export default function FollowersScreen() {
  const router = useRouter();
  const { user } = useSession();
  const { userId } = useLocalSearchParams<{ userId?: string }>();

  const targetUserId = useMemo(() => userId || user?.id || '', [userId, user?.id]);

  const [items, setItems] = useState<FollowUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!targetUserId) return;
    setLoading(true);
    try {
      const data = await getFollowers(targetUserId, { limit: 50, offset: 0 });
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
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Followers</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => <UserRow item={item} onPress={() => onPressUser(item.id)} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color="#6B6B8D" />
              <Text style={styles.emptyText}>No followers yet</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0B1E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#2D2D4A',
  },
  avatarPlaceholder: {
    backgroundColor: '#1A1A2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#8B5CF6',
    fontWeight: '700',
  },
  displayName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  username: {
    color: '#6B6B8D',
    fontSize: 12,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: '#2D2D4A',
    marginLeft: 16 + 44 + 12,
  },
  empty: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    color: '#6B6B8D',
  },
});




