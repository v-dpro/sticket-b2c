import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  SectionList,
  FlatList,
  StyleSheet,
  RefreshControl,
  Pressable,
  Image,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { differenceInDays, parseISO, format } from 'date-fns';

import { Screen } from '../../components/ui/Screen';
import { Eyebrow } from '../../components/ui/Eyebrow';
import { MonoLabel } from '../../components/ui/MonoLabel';
import { TicketStub } from '../../components/ui/TicketStub';
import { EmailInstructions } from '../../components/wallet/EmailInstructions';
import { EmptyWallet } from '../../components/wallet/EmptyWallet';
import { WalletSkeleton } from '../../components/wallet/WalletSkeleton';
import { useTickets } from '../../hooks/useTickets';
import { colors, spacing, radius } from '../../lib/theme';
import type { Ticket, TicketGroup } from '../../types/ticket';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type TabType = 'upcoming' | 'past' | 'selling';

const TABS: { key: TabType; label: string }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
  { key: 'selling', label: 'Selling' },
];

export default function WalletScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const { upcomingGroups, pastGroups, loading, refreshing, refresh } = useTickets();

  // Derive selling tickets from upcoming
  const sellingGroups = upcomingGroups
    .map((g) => ({
      ...g,
      tickets: g.tickets.filter((t) => t.status === 'SELLING' || t.status === 'SOLD'),
    }))
    .filter((g) => g.tickets.length > 0);

  const groups =
    activeTab === 'upcoming'
      ? upcomingGroups
      : activeTab === 'past'
        ? pastGroups
        : sellingGroups;

  const isEmpty = groups.length === 0;

  // Sliding indicator animation
  const slideAnim = useRef(new Animated.Value(0)).current;
  const trackWidth = useRef(0);
  const tabIndex = TABS.findIndex((t) => t.key === activeTab);

  useEffect(() => {
    const tabW = trackWidth.current / TABS.length;
    Animated.spring(slideAnim, {
      toValue: tabIndex * tabW,
      useNativeDriver: true,
      tension: 300,
      friction: 30,
    }).start();
  }, [tabIndex]);

  const handleAddTicket = () => {
    router.push('/wallet/add-ticket');
  };

  const handleTabPress = (tab: TabType) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveTab(tab);
  };

  // --- Upcoming ticket row ---
  const renderUpcomingItem = ({ item }: { item: Ticket }) => {
    const eventDate = parseISO(item.event.date);
    const daysUntil = differenceInDays(eventDate, new Date());
    const isUpcoming = daysUntil >= 0;

    const handlePress = () => {
      router.push(`/wallet/${item.id}`);
    };

    return (
      <Pressable style={styles.ticketRow} onPress={handlePress}>
        {/* Cover image */}
        <View style={styles.ticketImageWrap}>
          {item.event.artist.imageUrl ? (
            <Image source={{ uri: item.event.artist.imageUrl }} style={styles.ticketImage} />
          ) : (
            <View style={[styles.ticketImage, styles.ticketImagePlaceholder]}>
              <Ionicons name="musical-notes" size={22} color={colors.warning} />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.ticketInfo}>
          {isUpcoming && daysUntil <= 30 && (
            <MonoLabel size={10} color={colors.warning}>
              {daysUntil === 0 ? 'TODAY' : daysUntil === 1 ? 'IN 1D' : `IN ${daysUntil}D`}
            </MonoLabel>
          )}
          <Text style={styles.ticketArtist} numberOfLines={1}>
            {item.event.artist.name}
          </Text>
          <Text style={styles.ticketMeta} numberOfLines={1}>
            {item.event.venue.name} · {format(eventDate, 'MMM d')}
          </Text>
        </View>

        {/* Chevron */}
        <Ionicons name="chevron-forward" size={18} color={colors.textLo} />
      </Pressable>
    );
  };

  const renderSectionHeader = ({ section }: { section: TicketGroup }) => (
    <View style={styles.sectionHeader}>
      <MonoLabel size={10} color={colors.textLo}>
        {section.date}
      </MonoLabel>
    </View>
  );

  // --- Past tickets (collectible stubs) ---
  const allPastTickets = pastGroups.flatMap((g) => g.tickets);

  const renderPastStub = ({ item }: { item: Ticket }) => {
    const eventDate = parseISO(item.event.date);
    const handlePress = () => {
      router.push(`/wallet/${item.id}`);
    };

    return (
      <Pressable style={styles.stubWrap} onPress={handlePress}>
        <TicketStub
          artist={item.event.artist.name}
          venue={item.event.venue.name}
          city={item.event.venue.city}
          date={format(eventDate, 'MMM d, yyyy')}
          section={item.section}
          row={item.row}
          seat={item.seat}
        />
      </Pressable>
    );
  };

  if (loading) {
    return (
      <Screen padded={false}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.container}>
          <View style={styles.header}>
            <Eyebrow text="THE WALLET" color={colors.warning} />
            <Text style={styles.title}>Your ticket drawer</Text>
          </View>
          <WalletSkeleton />
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Eyebrow text="THE WALLET" color={colors.warning} />
            <Text style={styles.title}>Your ticket drawer</Text>
          </View>
          <Pressable style={styles.addButton} onPress={handleAddTicket} accessibilityRole="button">
            <Ionicons name="add" size={22} color={colors.warning} />
          </Pressable>
        </View>

        {/* Segmented Control */}
        <View style={styles.segmentedWrap}>
          <View
            style={styles.segmentedTrack}
            onLayout={(e) => {
              const w = e.nativeEvent.layout.width;
              trackWidth.current = w;
              // Jump to correct position without animation on first layout
              const tabW = w / TABS.length;
              slideAnim.setValue(tabIndex * tabW);
            }}
          >
            {/* Sliding active indicator */}
            <Animated.View
              style={[
                styles.segmentedIndicator,
                {
                  transform: [{ translateX: slideAnim }],
                  width: `${100 / TABS.length}%` as unknown as number,
                },
              ]}
            />
            {TABS.map((tab, i) => (
              <Pressable
                key={tab.key}
                style={styles.segmentedTab}
                onPress={() => handleTabPress(tab.key)}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.segmentedLabel,
                    activeTab === tab.key && styles.segmentedLabelActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Content */}
        {activeTab === 'past' ? (
          // Past: 2-column grid of collectible stubs
          allPastTickets.length === 0 ? (
            <View style={styles.emptyPast}>
              <Ionicons name="time-outline" size={48} color={colors.hairline} />
              <Text style={styles.emptyText}>No past tickets</Text>
            </View>
          ) : (
            <FlatList
              data={allPastTickets}
              keyExtractor={(item) => item.id}
              renderItem={renderPastStub}
              numColumns={2}
              columnWrapperStyle={styles.stubRow}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.warning} />
              }
              ListFooterComponent={<View style={{ height: 100 }} />}
            />
          )
        ) : isEmpty ? (
          <View style={styles.emptyContainer}>
            {activeTab === 'upcoming' ? (
              <>
                <EmptyWallet />
                <EmailInstructions />
              </>
            ) : (
              <View style={styles.emptyPast}>
                <Ionicons name="pricetag-outline" size={48} color={colors.hairline} />
                <Text style={styles.emptyText}>No tickets for sale</Text>
              </View>
            )}
          </View>
        ) : (
          <SectionList
            sections={groups.map((g) => ({ ...g, data: g.tickets }))}
            keyExtractor={(item) => item.id}
            renderItem={renderUpcomingItem}
            renderSectionHeader={renderSectionHeader}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.warning} />
            }
            stickySectionHeadersEnabled={false}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={activeTab === 'upcoming' ? <EmailInstructions /> : null}
            ListFooterComponent={<View style={{ height: 100 }} />}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ink,
  },

  // --- Header ---
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: 56,
    paddingBottom: spacing.md,
    backgroundColor: colors.ink,
  },
  title: {
    fontSize: 34,
    fontWeight: '400',
    letterSpacing: -0.8,
    color: colors.textHi,
    marginTop: 4,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(245,158,11,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // --- Segmented Control ---
  segmentedWrap: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  segmentedTrack: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 999,
    height: 36,
    position: 'relative',
    overflow: 'hidden',
  },
  segmentedIndicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 3,
    backgroundColor: colors.warning,
    borderRadius: 999,
  },
  segmentedTab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  segmentedLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMid,
  },
  segmentedLabelActive: {
    color: colors.ink,
  },

  // --- Section headers ---
  sectionHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.ink,
  },

  // --- Upcoming ticket row ---
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 12,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  ticketImageWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  ticketImage: {
    width: 56,
    height: 56,
  },
  ticketImagePlaceholder: {
    backgroundColor: 'rgba(245,158,11,0.10)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ticketInfo: {
    flex: 1,
    marginLeft: 12,
    gap: 2,
    minWidth: 0,
  },
  ticketArtist: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textHi,
  },
  ticketMeta: {
    fontSize: 11.5,
    color: colors.textMid,
  },

  // --- Past stubs (2-col grid) ---
  stubRow: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  stubWrap: {
    flex: 1,
  },

  // --- List ---
  listContent: {
    paddingTop: spacing.sm,
  },

  // --- Empty states ---
  emptyContainer: {
    flex: 1,
  },
  emptyPast: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textLo,
  },
});
