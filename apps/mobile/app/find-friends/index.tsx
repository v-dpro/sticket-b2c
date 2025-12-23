import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ContactCard } from '../../components/friends/ContactCard';
import { EmptySearch } from '../../components/friends/EmptySearch';
import { InviteButton } from '../../components/friends/InviteButton';
import { QRCodeDisplay } from '../../components/friends/QRCodeDisplay';
import { QRCodeScanner } from '../../components/friends/QRCodeScanner';
import { SuggestionCard } from '../../components/friends/SuggestionCard';
import { UserSearchInput } from '../../components/friends/UserSearchInput';
import { UserSearchResult } from '../../components/friends/UserSearchResult';
import { useContactsSync } from '../../hooks/useContactsSync';
import { useSuggestions } from '../../hooks/useSuggestions';
import { useUserSearch } from '../../hooks/useUserSearch';
import { colors, radius } from '../../lib/theme';

export default function FindFriendsScreen() {
  const router = useRouter();

  const { query, setQuery, results, loading: searchLoading, searched, updateFollowStatus: updateSearchFollowStatus, clear } =
    useUserSearch();

  const {
    suggestions,
    loading: suggestionsLoading,
    updateFollowStatus: updateSuggestionFollowStatus,
    dismiss,
  } = useSuggestions();

  const {
    matches: contactMatches,
    loading: contactsLoading,
    sync: syncContacts,
    updateFollowStatus: updateContactFollowStatus,
  } = useContactsSync();

  const [showQRCode, setShowQRCode] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const isSearching = query.trim().length > 0;

  const renderSearchEmpty = useMemo(() => {
    if (searchLoading) {
      return (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.brandPurple} />
        </View>
      );
    }
    return <EmptySearch query={query} searched={searched} />;
  }, [query, searched, searchLoading]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Find Friends</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
        <UserSearchInput value={query} onChangeText={setQuery} onClear={clear} autoFocus={false} />
      </View>

      {isSearching ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <UserSearchResult user={item} onFollowChange={updateSearchFollowStatus} />}
          ListEmptyComponent={renderSearchEmpty}
          contentContainerStyle={results.length === 0 ? styles.emptyList : undefined}
          keyboardShouldPersistTaps="handled"
        />
      ) : (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
          <View style={styles.quickActions}>
            <Pressable style={styles.quickAction} onPress={() => setShowQRCode(true)}>
              <View style={styles.quickActionIcon}>
                <Ionicons name="qr-code" size={24} color={colors.brandPurple} />
              </View>
              <Text style={styles.quickActionText}>My QR Code</Text>
            </Pressable>

            <Pressable style={styles.quickAction} onPress={() => setShowScanner(true)}>
              <View style={styles.quickActionIcon}>
                <Ionicons name="scan" size={24} color={colors.brandPurple} />
              </View>
              <Text style={styles.quickActionText}>Scan Code</Text>
            </Pressable>

            <Pressable style={styles.quickAction} onPress={() => void syncContacts()} disabled={contactsLoading}>
              <View style={styles.quickActionIcon}>
                {contactsLoading ? (
                  <ActivityIndicator color={colors.brandPurple} />
                ) : (
                  <Ionicons name="people" size={24} color={colors.brandPurple} />
                )}
              </View>
              <Text style={styles.quickActionText}>Contacts</Text>
            </Pressable>
          </View>

          {contactMatches.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>From Your Contacts</Text>
              <View style={{ paddingHorizontal: 16, gap: 10 }}>
                {contactMatches.map((contact) => (
                  <ContactCard key={contact.id} contact={contact} onFollowChange={updateContactFollowStatus} />
                ))}
              </View>
            </View>
          ) : null}

          {suggestionsLoading ? (
            <View style={{ paddingVertical: 12 }}>
              <ActivityIndicator color={colors.brandPurple} />
            </View>
          ) : suggestions.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>People You Might Know</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsScroll}>
                {suggestions.map((suggestion) => (
                  <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    onFollowChange={updateSuggestionFollowStatus}
                    onDismiss={dismiss}
                  />
                ))}
              </ScrollView>
            </View>
          ) : null}

          <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
            <InviteButton />
          </View>
        </ScrollView>
      )}

      <Modal
        visible={showQRCode}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowQRCode(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowQRCode(false)} hitSlop={10}>
              <Text style={styles.modalClose}>Done</Text>
            </Pressable>
          </View>
          <QRCodeDisplay />
        </SafeAreaView>
      </Modal>

      <Modal visible={showScanner} animationType="slide" onRequestClose={() => setShowScanner(false)}>
        <QRCodeScanner onClose={() => setShowScanner(false)} />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  emptyList: {
    flexGrow: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    marginHorizontal: 16,
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.lg,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickAction: {
    alignItems: 'center',
    padding: 8,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  suggestionsScroll: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalClose: {
    fontSize: 16,
    color: colors.brandPurple,
    fontWeight: '800',
  },
});




