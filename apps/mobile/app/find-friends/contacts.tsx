import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ContactCard } from '../../components/friends/ContactCard';
import { useContactsSync } from '../../hooks/useContactsSync';
import { colors } from '../../lib/theme';

export default function FindFriendsContactsScreen() {
  const router = useRouter();
  const { matches, loading, error, sync, updateFollowStatus } = useContactsSync();

  useEffect(() => {
    // Auto-trigger once when opened.
    void sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Contacts</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
        <Pressable style={styles.syncButton} onPress={() => void sync()} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.brandCyan} /> : <Text style={styles.syncButtonText}>Sync Contacts</Text>}
        </Pressable>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}>
        {matches.map((contact) => (
          <ContactCard key={contact.id} contact={contact} onFollowChange={updateFollowStatus} />
        ))}
        {!loading && matches.length === 0 ? (
          <Text style={{ color: colors.textTertiary, textAlign: 'center', paddingTop: 24 }}>
            No matches found from your contacts yet.
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  syncButton: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.brandCyan,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17, 10, 58, 0.35)',
  },
  syncButtonText: { color: colors.brandCyan, fontSize: 16, fontWeight: '800' },
  error: { color: colors.error, marginTop: 10, textAlign: 'center' },
});




