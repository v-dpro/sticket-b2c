import { Stack, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Screen } from '../../../components/ui/Screen';
import { SectionHead } from '../../../components/ui/SectionHead';
import { Eyebrow } from '../../../components/ui/Eyebrow';
import { colors, spacing, fonts, radius } from '../../../lib/theme';
import { useDiscovery } from '../../../hooks/useDiscovery';
import { usePresales } from '../../../hooks/usePresales';
import { ComingUpSection } from '../../../components/discover/ComingUpSection';
import { FriendsGoingSection } from '../../../components/discover/FriendsGoingSection';
import { PopularSection } from '../../../components/discover/PopularSection';
import { FloatingLogButton } from '../../../components/discover/FloatingLogButton';
import { NotificationBellButton } from '../../../components/notifications/NotificationBellButton';

function PresalesPreview() {
  const router = useRouter();
  const { presales } = usePresales();
  const upcoming = presales.slice(0, 3);

  if (!upcoming.length) return null;

  return (
    <View style={styles.section}>
      <SectionHead
        eyebrow="PRESALES"
        title="Upcoming Presales"
        accentColor={colors.brandCyan}
        action={{ label: 'See all', onPress: () => router.push('/presales') }}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presalesRow}>
        {upcoming.map((p) => (
          <Pressable
            key={p.id}
            style={styles.presalePreviewCard}
            onPress={() => router.push(`/presales/${p.id}`)}
            accessibilityRole="button"
          >
            <Text style={styles.presaleArtist} numberOfLines={1}>
              {p.artistName}
            </Text>
            <Text style={styles.presaleMeta} numberOfLines={1}>
              {p.venueName} • {p.venueCity}
            </Text>
            <View style={styles.presaleBadge}>
              <Text style={styles.presaleBadgeText}>{p.presaleType}</Text>
            </View>
            {p.code ? (
              <Text style={styles.presaleCode} numberOfLines={1}>
                Code: {p.code}
              </Text>
            ) : null}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

export default function DiscoverScreen() {
  const router = useRouter();
  const { data, loading, refreshing, error, refresh, city } = useDiscovery();

  if (loading && !data) {
    return (
      <Screen padded={false}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brandPurple} />
          <Text style={styles.mutedText}>Loading your feed…</Text>
        </View>
      </Screen>
    );
  }

  if (error && !data) {
    return (
      <Screen padded={false}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={[styles.mutedText, { textAlign: 'center', marginTop: 12 }]}>{error}</Text>
          <Pressable onPress={refresh} style={styles.retryButton}>
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const comingUp = data?.comingUp ?? [];
  const friendsGoing = data?.friendsGoing ?? [];
  const popular = data?.popular ?? [];
  const isEmpty = !comingUp.length && !friendsGoing.length && !popular.length;

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={{ flex: 1, backgroundColor: colors.ink }}>
        <View style={styles.header}>
          <View>
            <Eyebrow text={`FOR YOU · ${city ?? 'NYC'}`} color={colors.brandCyan} />
            <Text style={styles.headerTitle}>Shows worth{'\n'}crossing town for</Text>
          </View>
          <View style={styles.headerIcons}>
            <NotificationBellButton />
          </View>
        </View>

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <Pressable
            style={styles.searchBar}
            onPress={() => router.push('/search')}
            accessibilityRole="button"
          >
            <Ionicons name="search-outline" size={18} color={colors.textLo} />
            <Text style={styles.searchPlaceholder}>Artists, venues, cities…</Text>
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brandCyan} colors={[colors.brandCyan]} />}
        >
          <ComingUpSection events={comingUp} />
          <PresalesPreview />
          <FriendsGoingSection events={friendsGoing} />
          <PopularSection events={popular} city={city} />

          {isEmpty && (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Ionicons name="musical-notes" size={48} color={colors.brandPurple} />
              </View>
              <Text style={styles.emptyTitle}>No shows yet</Text>
              <Text style={styles.emptyText}>
                Start following artists (or connect Spotify) and we'll surface upcoming concerts here.
              </Text>

              <Pressable
                style={styles.emptyButton}
                onPress={() => router.push('/(tabs)/search')}
                accessibilityRole="button"
              >
                <Text style={styles.emptyButtonText}>Find Artists</Text>
              </Pressable>

              <Pressable
                style={styles.emptyButtonSecondary}
                onPress={() => router.push('/settings/connected-services')}
                accessibilityRole="button"
              >
                <Text style={styles.emptyButtonSecondaryText}>Connect Spotify</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>

        <FloatingLogButton />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '400',
    letterSpacing: -0.8,
    color: colors.textHi,
    marginTop: 6,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingHorizontal: spacing.md,
    height: 42,
    gap: 10,
  },
  searchPlaceholder: {
    fontSize: fonts.body,
    color: colors.textLo,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.ink,
  },
  mutedText: {
    marginTop: 12,
    fontSize: fonts.body,
    color: colors.textMid,
  },
  retryButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    backgroundColor: colors.brandPurple,
    borderRadius: radius.sm,
  },
  retryText: {
    color: colors.textHi,
    fontSize: fonts.body,
    fontWeight: '800',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing['2xl'],
    marginTop: spacing.lg,
  },
  emptyIcon: {
    marginBottom: spacing.md,
  },
  emptyTitle: {
    marginTop: spacing.md,
    fontSize: fonts.h4,
    fontWeight: '900',
    color: colors.textHi,
  },
  emptyText: {
    marginTop: 10,
    fontSize: fonts.bodySmall,
    color: colors.textMid,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  emptyButton: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    backgroundColor: colors.brandPurple,
    borderRadius: 10,
    minWidth: 160,
    alignItems: 'center',
  },
  emptyButtonText: {
    color: colors.textHi,
    fontSize: fonts.body,
    fontWeight: '700',
  },
  emptyButtonSecondary: {
    marginTop: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: 10,
    minWidth: 160,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  emptyButtonSecondaryText: {
    color: colors.textMid,
    fontSize: fonts.body,
    fontWeight: '600',
  },
  section: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  presalesRow: {
    gap: 12,
  },
  presalePreviewCard: {
    width: 220,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  presaleArtist: {
    color: colors.textHi,
    fontSize: 15,
    fontWeight: '800',
  },
  presaleMeta: {
    marginTop: spacing.xs,
    color: colors.textMid,
    fontSize: fonts.caption,
  },
  presaleBadge: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.elevated,
  },
  presaleBadgeText: {
    color: colors.textHi,
    fontSize: 11,
    fontWeight: '700',
  },
  presaleCode: {
    marginTop: 10,
    color: colors.brandCyan,
    fontSize: fonts.caption,
    fontWeight: '700',
  },
});
