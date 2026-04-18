import { Stack, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Screen } from '../../../components/ui/Screen';
import { EmptyState } from '../../../components/ui/EmptyState';
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
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>🎟️ Upcoming Presales</Text>
        <Pressable onPress={() => router.push('/presales')} accessibilityRole="button">
          <Text style={styles.seeAll}>See all</Text>
        </Pressable>
      </View>

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

      <View style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Discover</Text>
          <View style={styles.headerIcons}>
            <Pressable onPress={() => router.push('/search')} style={styles.iconButton} accessibilityRole="button">
              <Ionicons name="search-outline" size={24} color={colors.textPrimary} />
            </Pressable>
            <NotificationBellButton />
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brandPurple} colors={[colors.brandPurple]} />}
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
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: fonts.h2,
    fontWeight: fonts.black,
    color: colors.textPrimary,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: spacing.sm,
    position: 'relative',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  mutedText: {
    marginTop: 12,
    fontSize: fonts.body,
    color: colors.textSecondary,
  },
  retryButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    backgroundColor: colors.brandPurple,
    borderRadius: radius.sm,
  },
  retryText: {
    color: colors.textPrimary,
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
    fontWeight: fonts.black,
    color: colors.textPrimary,
  },
  emptyText: {
    marginTop: 10,
    fontSize: fonts.bodySmall,
    color: colors.textSecondary,
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
    color: colors.textPrimary,
    fontSize: fonts.body,
    fontWeight: fonts.bold,
  },
  emptyButtonSecondary: {
    marginTop: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: 10,
    minWidth: 160,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyButtonSecondaryText: {
    color: colors.textSecondary,
    fontSize: fonts.body,
    fontWeight: fonts.semibold,
  },
  primaryButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    backgroundColor: colors.brandCyan,
    borderRadius: 10,
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: fonts.body,
    fontWeight: fonts.black,
  },
  section: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  sectionHeader: {
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: fonts.body,
    fontWeight: fonts.black,
    color: colors.textPrimary,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: fonts.bold,
    color: colors.brandCyan,
  },
  presalesRow: {
    paddingHorizontal: spacing.md,
    gap: 12,
  },
  presalePreviewCard: {
    width: 220,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presaleArtist: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  presaleMeta: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: fonts.caption,
  },
  presaleBadge: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
  },
  presaleBadgeText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: fonts.bold,
  },
  presaleCode: {
    marginTop: 10,
    color: colors.brandCyan,
    fontSize: fonts.caption,
    fontWeight: fonts.bold,
  },
});
