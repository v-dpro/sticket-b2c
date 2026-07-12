import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ContactCard } from '../../components/friends/ContactCard';
import { useContactsSync } from '../../hooks/useContactsSync';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { useSafeBack } from '../../lib/navigation/safeNavigation';

export default function FindFriendsContactsScreen() {
  const router = useRouter();
  const goBack = useSafeBack();
  const { matches, loading, error, sync, updateFollowStatus } = useContactsSync();
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    container: { flex: 1, backgroundColor: t.colors.ink },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    backButton: { width: 40, height: 40, justifyContent: 'center' },
    title: { fontSize: 18, fontWeight: '800', color: t.colors.textHi },
    syncButton: {
      height: 52,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.colors.line,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(17, 10, 58, 0.35)',
    },
    syncButtonText: { color: t.colors.fg, fontSize: 16, fontWeight: '800' },
    error: { color: t.colors.error, marginTop: 10, textAlign: 'center' },
  }));

  useEffect(() => {
    // Auto-trigger once when opened.
    void sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backButton} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={tokens.colors.textHi} />
        </Pressable>
        <Text style={styles.title}>Contacts</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
        <Pressable style={styles.syncButton} onPress={() => void sync()} disabled={loading}>
          {loading ? <ActivityIndicator color={tokens.colors.mute} /> : <Text style={styles.syncButtonText}>Sync Contacts</Text>}
        </Pressable>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}>
        {matches.map((contact) => (
          <ContactCard key={contact.id} contact={contact} onFollowChange={updateFollowStatus} />
        ))}
        {!loading && matches.length === 0 ? (
          <Text style={{ color: tokens.colors.textLo, textAlign: 'center', paddingTop: 24 }}>
            No matches found from your contacts yet.
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}




