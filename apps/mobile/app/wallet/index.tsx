import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  SectionList,
  FlatList,
  RefreshControl,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { differenceInDays, parseISO, format } from 'date-fns';

import { MonoLabel } from '../../components/ui/MonoLabel';
import { StubDetailsRow, StubPerforation } from '../../components/ui/Stub';
import { SpringPressable } from '../../components/ui/SpringPressable';
import { EmailInstructions } from '../../components/wallet/EmailInstructions';
import { EmptyWallet } from '../../components/wallet/EmptyWallet';
import { WalletSkeleton } from '../../components/wallet/WalletSkeleton';
import { useTickets } from '../../hooks/useTickets';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
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

/** "SEC 112 · ROW 8 · SEAT 4" for the stub's mono details strip. */
function seatLine(ticket: Ticket): string {
  if (ticket.isGeneralAdmission) return 'GENERAL ADMISSION';
  const parts = [
    ticket.section ? `SEC ${ticket.section}` : null,
    ticket.row ? `ROW ${ticket.row}` : null,
    ticket.seat ? `SEAT ${ticket.seat}` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : 'GENERAL ADMISSION';
}

function WalletHeader({ onBack, onAdd }: { onBack: () => void; onAdd?: () => void }) {
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: t.density.pad,
      paddingTop: t.spacing.md,
      paddingBottom: t.spacing.md,
      gap: 8,
    },
    backButton: { width: 36, height: 36, alignItems: 'flex-start', justifyContent: 'center' },
    titleWrap: { flex: 1 },
    eyebrow: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 2,
      textTransform: 'uppercase',
      color: t.colors.mute,
      marginBottom: 2,
    },
    title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, color: t.colors.fg },
    addButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: t.colors.card2,
      justifyContent: 'center',
      alignItems: 'center',
    },
  }));

  return (
    <View style={styles.header}>
      <SpringPressable onPress={onBack} haptic="light" hitSlop={8} accessibilityRole="button" accessibilityLabel="Back" style={styles.backButton}>
        <Ionicons name="chevron-back" size={24} color={tokens.colors.fg} />
      </SpringPressable>
      <View style={styles.titleWrap}>
        <Text style={styles.eyebrow}>The Wallet</Text>
        <Text style={styles.title}>Your ticket drawer</Text>
      </View>
      {onAdd ? (
        <SpringPressable style={styles.addButton} onPress={onAdd} haptic="light" accessibilityRole="button" accessibilityLabel="Add ticket">
          <Ionicons name="add" size={22} color={tokens.colors.fg} />
        </SpringPressable>
      ) : null}
    </View>
  );
}

export default function WalletScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
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

  const styles = useThemedStyles((t) => ({
    screen: { flex: 1, backgroundColor: t.colors.bg },
    container: { flex: 1, backgroundColor: t.colors.bg },
    segmentedWrap: {
      paddingHorizontal: t.density.pad,
      marginBottom: t.spacing.md,
    },
    segmentedTrack: {
      flexDirection: 'row',
      backgroundColor: t.colors.card2,
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
      backgroundColor: t.colors.inverseBg,
      borderRadius: 999,
    },
    segmentedTab: { flex: 1, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
    segmentedLabel: { fontSize: 13, fontWeight: '600', color: t.colors.mute },
    segmentedLabelActive: { color: t.colors.inverseFg },
    sectionHeader: {
      paddingHorizontal: t.density.pad,
      paddingVertical: t.spacing.sm,
      backgroundColor: t.colors.bg,
    },
    // Held tickets are STUBS (C3): card bg + radius.stub + perforation
    // separating the event header from the SEC/ROW/SEAT mono strip.
    ticketStub: {
      backgroundColor: t.colors.card,
      borderRadius: t.radius.stub,
      marginHorizontal: t.density.pad,
      marginBottom: t.spacing.sm,
      ...t.shadows.card,
    },
    ticketHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      paddingBottom: 10,
    },
    ticketImageWrap: { width: 48, height: 48, borderRadius: t.radius.sm, overflow: 'hidden' },
    ticketImage: { width: 48, height: 48 },
    ticketImagePlaceholder: {
      backgroundColor: t.colors.card2,
      justifyContent: 'center',
      alignItems: 'center',
    },
    ticketInfo: { flex: 1, marginLeft: 12, gap: 3, minWidth: 0 },
    ticketArtist: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2, color: t.colors.fg },
    ticketMeta: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 10.5,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
    },
    ticketDetails: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12 },
    stubRow: { paddingHorizontal: t.density.pad, gap: t.spacing.sm, marginBottom: t.spacing.sm },
    stubWrap: { flex: 1 },
    // Past collectible stubs (2-col grid) — same construction, compact.
    pastStub: {
      flex: 1,
      backgroundColor: t.colors.card,
      borderRadius: t.radius.stub,
      ...t.shadows.card,
    },
    pastStubTop: { padding: 14, paddingBottom: 12 },
    pastStubDate: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 9.5,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
      marginBottom: 6,
    },
    pastStubArtist: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2, color: t.colors.fg },
    pastStubVenue: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 9.5,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
      marginTop: 5,
    },
    pastStubMeta: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 12 },
    listContent: { paddingTop: t.spacing.sm },
    emptyContainer: { flex: 1 },
    emptyPast: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: t.spacing.sm },
    emptyText: { fontSize: 16, color: t.colors.mute },
  }));

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
      <SpringPressable style={styles.ticketStub} onPress={handlePress} haptic="light" accessibilityRole="button">
        {/* Event header */}
        <View style={styles.ticketHeader}>
          <View style={styles.ticketImageWrap}>
            {item.event.artist.imageUrl ? (
              <Image source={{ uri: item.event.artist.imageUrl }} style={styles.ticketImage} />
            ) : (
              <View style={[styles.ticketImage, styles.ticketImagePlaceholder]}>
                <Ionicons name="musical-notes" size={22} color={tokens.colors.mute} />
              </View>
            )}
          </View>

          <View style={styles.ticketInfo}>
            <Text style={styles.ticketArtist} numberOfLines={1}>
              {item.event.artist.name}
            </Text>
            <Text style={styles.ticketMeta} numberOfLines={1}>
              {item.event.venue.name} · {format(eventDate, 'MMM d')}
            </Text>
          </View>

          {isUpcoming && daysUntil <= 30 && (
            <MonoLabel size={10} color={tokens.colors.fg}>
              {daysUntil === 0 ? 'TODAY' : daysUntil === 1 ? 'IN 1D' : `IN ${daysUntil}D`}
            </MonoLabel>
          )}
        </View>

        {/* The tear line — held tickets get the stub construction (C3). */}
        <StubPerforation notchColor={tokens.colors.bg} />

        {/* Ticket meta strip */}
        <View style={styles.ticketDetails}>
          <StubDetailsRow left={seatLine(item)} right="ADMIT 01" />
        </View>
      </SpringPressable>
    );
  };

  const renderSectionHeader = ({ section }: { section: TicketGroup }) => (
    <View style={styles.sectionHeader}>
      <MonoLabel size={10} color={tokens.colors.mute}>
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
      <SpringPressable style={styles.stubWrap} onPress={handlePress} haptic="light" accessibilityRole="button">
        <View style={styles.pastStub}>
          <View style={styles.pastStubTop}>
            <Text style={styles.pastStubDate} numberOfLines={1}>
              {format(eventDate, 'MMM d, yyyy')}
            </Text>
            <Text style={styles.pastStubArtist} numberOfLines={2}>
              {item.event.artist.name}
            </Text>
            <Text style={styles.pastStubVenue} numberOfLines={1}>
              {item.event.venue.name}
              {item.event.venue.city ? ` · ${item.event.venue.city}` : ''}
            </Text>
          </View>
          <StubPerforation notchColor={tokens.colors.bg} />
          <View style={styles.pastStubMeta}>
            <StubDetailsRow left={seatLine(item)} />
          </View>
        </View>
      </SpringPressable>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.container}>
          <WalletHeader onBack={() => router.back()} />
          <WalletSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <WalletHeader onBack={() => router.back()} onAdd={handleAddTicket} />

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
            {TABS.map((tab) => (
              <SpringPressable
                key={tab.key}
                style={styles.segmentedTab}
                onPress={() => handleTabPress(tab.key)}
                haptic="light"
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
              </SpringPressable>
            ))}
          </View>
        </View>

        {/* Content */}
        {activeTab === 'past' ? (
          // Past: 2-column grid of collectible stubs
          allPastTickets.length === 0 ? (
            <View style={styles.emptyPast}>
              <Ionicons name="time-outline" size={48} color={tokens.colors.muteSoft} />
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
                <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={tokens.colors.mute} />
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
                <Ionicons name="pricetag-outline" size={48} color={tokens.colors.muteSoft} />
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
              <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={tokens.colors.mute} />
            }
            stickySectionHeadersEnabled={false}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={activeTab === 'upcoming' ? <EmailInstructions /> : null}
            ListFooterComponent={<View style={{ height: 100 }} />}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
