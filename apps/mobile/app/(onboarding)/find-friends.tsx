import * as Contacts from 'expo-contacts';
import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { ProgressDots } from '../../components/onboarding/ProgressDots';
import { Button } from '../../components/ui/Button';
import { Screen } from '../../components/ui/Screen';
import { colors, spacing } from '../../lib/theme';

type SuggestedFriend = {
  id: string;
  name: string;
  subtitle: string;
};

function toStableId(text: string) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function FindFriendsOnboarding() {
  const router = useRouter();

  const [isSyncing, setIsSyncing] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedFriend[]>([]);
  const [followedIds, setFollowedIds] = useState<Set<string>>(() => new Set());

  const followedCount = followedIds.size;

  const listEmptyText = useMemo(() => {
    if (isSyncing) return 'Looking through your contacts…';
    if (suggestions.length > 0) return null;
    return 'Sync your contacts to find friends already on Sticket.';
  }, [isSyncing, suggestions.length]);

  const toggleFollow = (id: string) => {
    setFollowedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const syncContacts = async () => {
    setIsSyncing(true);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Allow contacts access to find friends.');
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Emails, Contacts.Fields.PhoneNumbers],
      });

      const usable = data
        .map((c) => {
          const name = c.name?.trim();
          const email = c.emails?.[0]?.email?.trim();
          const phone = c.phoneNumbers?.[0]?.number?.trim();
          if (!name || (!email && !phone)) return null;
          return {
            id: toStableId(`${name}-${email ?? phone ?? ''}`) || `contact-${c.id}`,
            name,
            subtitle: email ?? phone ?? 'Contact',
          } satisfies SuggestedFriend;
        })
        .filter(Boolean) as SuggestedFriend[];

      const deduped = Array.from(new Map(usable.map((u) => [u.id, u])).values()).slice(0, 20);
      setSuggestions(deduped);

      Alert.alert('Contacts synced', deduped.length ? `Found ${deduped.length} potential friends.` : 'No contacts with email/phone found.');
    } catch (e) {
      Alert.alert('Error', 'Failed to sync contacts.');
    } finally {
      setIsSyncing(false);
    }
  };

  const skip = () => {
    router.push('/(onboarding)/done');
  };

  const continueNext = () => {
    router.push('/(onboarding)/done');
  };

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <View style={{ width: 60 }} />
        <ProgressDots total={4} current={3} />
        <Pressable onPress={skip} hitSlop={10}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      <View style={{ flex: 1, paddingTop: spacing.xl, gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <Text style={{ color: colors.textPrimary, fontSize: 28, fontWeight: '800' }}>Find friends</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 16 }}>See what shows your friends are going to.</Text>
        </View>

        <Pressable style={styles.syncButton} onPress={syncContacts} disabled={isSyncing}>
          {isSyncing ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.syncButtonText}>Sync Contacts</Text>
          )}
        </Pressable>

        <View style={{ flex: 1, gap: 8 }}>
          {listEmptyText ? <Text style={{ color: colors.textTertiary }}>{listEmptyText}</Text> : null}

          {suggestions.map((u) => {
            const isFollowing = followedIds.has(u.id);
            return (
              <View key={u.id} style={styles.card}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '700' }}>{u.name}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{u.subtitle}</Text>
                </View>

                <Pressable
                  style={[styles.followButton, isFollowing && styles.followingButton]}
                  onPress={() => toggleFollow(u.id)}
                >
                  <Text style={[styles.followText, isFollowing && styles.followingText]}>
                    {isFollowing ? 'Following' : 'Follow'}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>

        <View style={{ marginTop: 'auto', gap: spacing.sm }}>
          <Button label={followedCount ? `Continue (${followedCount} followed)` : 'Continue'} onPress={continueNext} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  skipText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  syncButton: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00D4FF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17, 10, 58, 0.35)',
  },
  syncButtonText: {
    color: '#00D4FF',
    fontSize: 16,
    fontWeight: '700',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(17, 10, 58, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.18)',
  },
  followButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#8B5CF6',
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  followText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  followingText: {
    color: colors.textSecondary,
  },
});




