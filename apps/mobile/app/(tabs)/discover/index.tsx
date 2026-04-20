import { useMemo } from 'react';
import { Stack, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { format } from 'date-fns';

import { Screen } from '../../../components/ui/Screen';
import { AvatarStack } from '../../../components/ui/AvatarStack';
import { colors, accentSets, spacing, radius, fontFamilies } from '../../../lib/theme';
import { useDiscovery } from '../../../hooks/useDiscovery';
import { usePresales } from '../../../hooks/usePresales';
import type { PresaleItem } from '../../../hooks/usePresales';
import type { Event } from '../../../types/event';
import { FloatingLogButton } from '../../../components/discover/FloatingLogButton';
import { NotificationBellButton } from '../../../components/notifications/NotificationBellButton';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const accent = accentSets.cyan;
const CARD_WIDTH = 220;
const CARD_GAP = 12;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simple hash from a string to pick a gradient for artwork placeholders. */
function hashColor(str: string): [string, string] {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = str.charCodeAt(i) + ((h << 5) - h);
  }
  const palettes: [string, string][] = [
    ['#6366F1', '#8B5CF6'],
    ['#EC4899', '#F43F5E'],
    ['#14B8A6', '#06B6D4'],
    ['#F59E0B', '#EF4444'],
    ['#8B5CF6', '#EC4899'],
    ['#3B82F6', '#6366F1'],
  ];
  return palettes[Math.abs(h) % palettes.length];
}

function formatPresaleDate(iso: string): { month: string; day: string } {
  const d = new Date(iso);
  return { month: format(d, 'MMM').toUpperCase(), day: format(d, 'd') };
}

// ---------------------------------------------------------------------------
// PresaleStub — ticket-stub card
// ---------------------------------------------------------------------------

function PresaleStub({ presale }: { presale: PresaleItem }) {
  const { month, day } = useMemo(() => formatPresaleDate(presale.presaleStart), [presale.presaleStart]);

  const handleCopy = async () => {
    if (presale.code) {
      await Clipboard.setStringAsync(presale.code);
    }
  };

  return (
    <View style={stubStyles.card}>
      {/* Torn top edge — dashed border approximation */}
      <View style={stubStyles.tornEdge} />

      {/* Top section */}
      <View style={stubStyles.topSection}>
        <View style={{ flex: 1 }}>
          <Text style={stubStyles.eyebrow}>
            ⚡ PRESALE · {presale.presaleType.toUpperCase()}
          </Text>
          <Text style={stubStyles.artistName} numberOfLines={2}>
            {presale.artistName}
          </Text>
          <Text style={stubStyles.venue} numberOfLines={1}>
            {presale.venueName}
          </Text>
        </View>
        <View style={stubStyles.dateBlock}>
          <Text style={stubStyles.opensLabel}>OPENS</Text>
          <Text style={stubStyles.dateMonth}>{month}</Text>
          <Text style={stubStyles.dateDay}>{day}</Text>
        </View>
      </View>

      {/* Perforation divider */}
      <View style={stubStyles.perforationRow}>
        <View style={stubStyles.circleLeft} />
        <View style={stubStyles.dashedLine} />
        <View style={stubStyles.circleRight} />
      </View>

      {/* Bottom section */}
      <View style={stubStyles.bottomSection}>
        <View style={{ flex: 1 }}>
          <Text style={stubStyles.codeLabel}>CODE</Text>
          <Text style={stubStyles.codeValue}>{presale.code ?? '—'}</Text>
        </View>
        {presale.code && (
          <Pressable style={stubStyles.copyButton} onPress={handleCopy} accessibilityRole="button">
            <Text style={stubStyles.copyButtonText}>COPY CODE →</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const stubStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.paper,
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 20,
    marginBottom: 16,
  },
  tornEdge: {
    height: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(11,11,20,0.08)',
    borderStyle: 'dashed',
  },
  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 18,
  },
  eyebrow: {
    fontFamily: fontFamilies.mono,
    fontSize: 10,
    letterSpacing: 2,
    color: '#88aa66',
    marginBottom: 6,
  },
  artistName: {
    fontSize: 28,
    fontWeight: '400',
    color: colors.ink,
    letterSpacing: -0.6,
    lineHeight: 29.4, // 28 * 1.05
  },
  venue: {
    fontSize: 12,
    color: '#555555',
    marginTop: 4,
  },
  dateBlock: {
    alignItems: 'center',
    marginLeft: 12,
  },
  opensLabel: {
    fontFamily: fontFamilies.mono,
    fontSize: 9,
    color: '#88aa66',
    letterSpacing: 1,
    marginBottom: 2,
  },
  dateMonth: {
    fontFamily: fontFamilies.mono,
    fontSize: 11,
    color: colors.ink,
    letterSpacing: 1,
  },
  dateDay: {
    fontFamily: fontFamilies.monoBold,
    fontSize: 18,
    color: colors.ink,
  },
  perforationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 16,
    marginHorizontal: -8,
  },
  circleLeft: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.ink,
  },
  dashedLine: {
    flex: 1,
    height: 1,
    borderWidth: 0,
    borderTopWidth: 1,
    borderColor: colors.ink,
    borderStyle: 'dashed',
    opacity: 0.25,
  },
  circleRight: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.ink,
  },
  bottomSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  codeLabel: {
    fontFamily: fontFamilies.mono,
    fontSize: 9,
    color: '#888888',
    letterSpacing: 1,
  },
  codeValue: {
    fontFamily: fontFamilies.monoBold,
    fontSize: 18,
    color: colors.ink,
    letterSpacing: 2,
    marginTop: 2,
  },
  copyButton: {
    backgroundColor: colors.ink,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  copyButtonText: {
    fontFamily: fontFamilies.monoBold,
    fontSize: 11,
    color: colors.textHi,
  },
});

// ---------------------------------------------------------------------------
// SectionHead (inline redesign version)
// ---------------------------------------------------------------------------

function SectionHeadRedesign({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={sectionHeadStyles.container}>
      <View style={sectionHeadStyles.row}>
        <View style={{ flex: 1 }}>
          <Text style={sectionHeadStyles.eyebrow}>{eyebrow}</Text>
          <Text style={sectionHeadStyles.title}>{title}</Text>
        </View>
        {action && (
          <Pressable onPress={action.onPress} hitSlop={8}>
            <Text style={sectionHeadStyles.action}>{action.label}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const sectionHeadStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  eyebrow: {
    fontFamily: fontFamilies.monoSemi,
    fontSize: 10.5,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: accent.hex,
  },
  title: {
    fontSize: 26,
    fontWeight: '400',
    letterSpacing: -0.5,
    color: colors.textHi,
    marginTop: 4,
  },
  action: {
    fontFamily: fontFamilies.monoSemi,
    fontSize: 10.5,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: accent.hex,
  },
});

// ---------------------------------------------------------------------------
// UpcomingCard — horizontal scroll card
// ---------------------------------------------------------------------------

function UpcomingCard({ event }: { event: Event }) {
  const router = useRouter();
  const gradientColors = useMemo(() => hashColor(event.artist.name), [event.artist.name]);
  const dateLabel = useMemo(() => format(new Date(event.date), 'MMM d, yyyy').toUpperCase(), [event.date]);

  return (
    <Pressable
      style={upcomingStyles.card}
      onPress={() => router.push(`/event/${event.id}`)}
      accessibilityRole="button"
    >
      {/* Artwork area — 4:3 ratio */}
      <View style={upcomingStyles.artworkContainer}>
        {event.artist.imageUrl ? (
          <Image source={{ uri: event.artist.imageUrl }} style={upcomingStyles.artwork} />
        ) : event.imageUrl ? (
          <Image source={{ uri: event.imageUrl }} style={upcomingStyles.artwork} />
        ) : (
          <View style={[upcomingStyles.artwork, { backgroundColor: gradientColors[0] }]}>
            <Text style={upcomingStyles.artworkInitial}>{event.artist.name.charAt(0)}</Text>
          </View>
        )}
      </View>

      {/* Info area */}
      <View style={upcomingStyles.info}>
        <Text style={upcomingStyles.date}>{dateLabel}</Text>
        <Text style={upcomingStyles.artist} numberOfLines={1}>{event.artist.name}</Text>
        <Text style={upcomingStyles.venue} numberOfLines={1}>{event.venue.name}</Text>
      </View>
    </Pressable>
  );
}

const upcomingStyles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    flexShrink: 0,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  artworkContainer: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 0.75, // 4:3 ratio
  },
  artwork: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  artworkInitial: {
    fontSize: 48,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.3)',
  },
  info: {
    padding: 12,
  },
  date: {
    fontFamily: fontFamilies.mono,
    fontSize: 9.5,
    color: accent.hex,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  artist: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textHi,
    marginTop: 4,
  },
  venue: {
    fontSize: 11,
    color: colors.textMid,
    marginTop: 3,
  },
});

// ---------------------------------------------------------------------------
// FriendsGoingRow
// ---------------------------------------------------------------------------

function FriendsGoingRow({ event }: { event: Event }) {
  const router = useRouter();
  const gradientColors = useMemo(() => hashColor(event.artist.name), [event.artist.name]);
  const dateLabel = useMemo(() => format(new Date(event.date), 'MMM d'), [event.date]);

  const avatars = useMemo(
    () =>
      (event.friendsGoing ?? []).map((f) => ({
        uri: f.avatarUrl ?? null,
        name: f.username,
      })),
    [event.friendsGoing],
  );

  const friendCount = event.friendsGoingCount ?? avatars.length;

  return (
    <Pressable
      style={friendRowStyles.card}
      onPress={() => router.push(`/event/${event.id}`)}
      accessibilityRole="button"
    >
      {/* Left artwork */}
      <View style={friendRowStyles.artworkContainer}>
        {event.artist.imageUrl ? (
          <Image source={{ uri: event.artist.imageUrl }} style={friendRowStyles.artwork} />
        ) : (
          <View style={[friendRowStyles.artwork, { backgroundColor: gradientColors[0] }]}>
            <Text style={friendRowStyles.artworkInitial}>{event.artist.name.charAt(0)}</Text>
          </View>
        )}
      </View>

      {/* Middle info */}
      <View style={friendRowStyles.middle}>
        <Text style={friendRowStyles.artist} numberOfLines={1}>{event.artist.name}</Text>
        <Text style={friendRowStyles.meta} numberOfLines={1}>
          {event.venue.name} · {dateLabel}
        </Text>
        {avatars.length > 0 && (
          <View style={{ marginTop: 6 }}>
            <AvatarStack avatars={avatars} max={4} size={18} />
          </View>
        )}
      </View>

      {/* Right badge */}
      {friendCount > 0 && (
        <View style={friendRowStyles.badge}>
          <Text style={friendRowStyles.badgeText}>+{friendCount}</Text>
          <Text style={friendRowStyles.badgeLabel}>friends{'\n'}going</Text>
        </View>
      )}
    </Pressable>
  );
}

const friendRowStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.md,
    marginBottom: 10,
    marginHorizontal: 20,
  },
  artworkContainer: {
    width: 52,
    height: 52,
    borderRadius: 8,
    overflow: 'hidden',
  },
  artwork: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  artworkInitial: {
    fontSize: 22,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.4)',
  },
  middle: {
    flex: 1,
  },
  artist: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textHi,
  },
  meta: {
    fontSize: 11,
    color: colors.textMid,
    marginTop: 2,
  },
  badge: {
    alignItems: 'center',
  },
  badgeText: {
    fontFamily: fontFamilies.monoBold,
    fontSize: 10,
    color: accent.hex,
    letterSpacing: 0.6,
  },
  badgeLabel: {
    fontFamily: fontFamilies.mono,
    fontSize: 9,
    color: accent.hex,
    letterSpacing: 0.4,
    textAlign: 'center',
    lineHeight: 12,
  },
});

// ---------------------------------------------------------------------------
// DiscoverScreen
// ---------------------------------------------------------------------------

export default function DiscoverScreen() {
  const router = useRouter();
  const { data, loading, refreshing, error, refresh, city } = useDiscovery();
  const { presales } = usePresales();

  // Take the first presale for the stub card
  const featuredPresale = presales.length > 0 ? presales[0] : null;

  // Loading state
  if (loading && !data) {
    return (
      <Screen padded={false}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={accent.hex} />
          <Text style={styles.mutedText}>Loading your feed…</Text>
        </View>
      </Screen>
    );
  }

  // Error state
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
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerEyebrow}>FOR YOU · {(city ?? 'NYC').toUpperCase()}</Text>
            <Text style={styles.headerTitle}>Shows worth crossing town for</Text>
          </View>
          <View style={styles.headerIcons}>
            <NotificationBellButton />
          </View>
        </View>

        {/* Search bar — pill shaped */}
        <Pressable
          style={styles.searchBar}
          onPress={() => router.push('/search')}
          accessibilityRole="button"
        >
          <Ionicons name="search-outline" size={16} color={colors.textMid} />
          <Text style={styles.searchPlaceholder}>Artists, venues, cities…</Text>
        </Pressable>

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={accent.hex}
              colors={[accent.hex]}
            />
          }
        >
          {/* Presale Stub */}
          {featuredPresale && <PresaleStub presale={featuredPresale} />}

          {/* Coming Up — horizontal scroll */}
          {comingUp.length > 0 && (
            <View style={{ marginTop: 8, marginBottom: 24 }}>
              <SectionHeadRedesign
                eyebrow="Coming up"
                title="In your orbit"
                action={{ label: 'All', onPress: () => router.push('/search') }}
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={CARD_WIDTH + CARD_GAP}
                decelerationRate="fast"
                contentContainerStyle={styles.horizontalScroll}
              >
                {comingUp.map((event) => (
                  <View key={event.id} style={{ marginRight: CARD_GAP }}>
                    <UpcomingCard event={event} />
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Friends Going */}
          {friendsGoing.length > 0 && (
            <View style={{ marginBottom: 24 }}>
              <SectionHeadRedesign
                eyebrow="Your people going"
                title="Friends are going to"
              />
              {friendsGoing.map((event) => (
                <FriendsGoingRow key={event.id} event={event} />
              ))}
            </View>
          )}

          {/* Popular — reuse FriendsGoingRow style for now */}
          {popular.length > 0 && (
            <View style={{ marginBottom: 140 }}>
              <SectionHeadRedesign
                eyebrow={`Popular in ${city ?? 'NYC'}`}
                title="Buzzing near you"
              />
              {popular.map((event) => (
                <FriendsGoingRow key={event.id} event={event} />
              ))}
            </View>
          )}

          {/* Empty state */}
          {isEmpty && (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Ionicons name="musical-notes" size={48} color={accent.hex} />
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

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  headerEyebrow: {
    fontFamily: fontFamilies.mono,
    fontSize: 10.5,
    color: accent.hex,
    letterSpacing: 2,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '400',
    color: colors.textHi,
    letterSpacing: -0.8,
    marginTop: 2,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 999,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    paddingVertical: 11,
    paddingHorizontal: 14,
    gap: 10,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 13,
    color: colors.textLo,
  },
  horizontalScroll: {
    paddingHorizontal: 20,
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
    fontSize: 15,
    color: colors.textMid,
  },
  retryButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    backgroundColor: accent.hex,
    borderRadius: radius.sm,
  },
  retryText: {
    color: colors.ink,
    fontSize: 15,
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
    fontSize: 20,
    fontWeight: '900',
    color: colors.textHi,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
    color: colors.textMid,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  emptyButton: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    backgroundColor: accent.hex,
    borderRadius: 10,
    minWidth: 160,
    alignItems: 'center',
  },
  emptyButtonText: {
    color: colors.ink,
    fontSize: 15,
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
    fontSize: 15,
    fontWeight: '600',
  },
});
