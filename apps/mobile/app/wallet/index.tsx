import React, { useState } from 'react';
import { View, Text, SectionList, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '../../components/ui/Screen';
import { TicketCard } from '../../components/wallet/TicketCard';
import { EmailInstructions } from '../../components/wallet/EmailInstructions';
import { EmptyWallet } from '../../components/wallet/EmptyWallet';
import { WalletSkeleton } from '../../components/wallet/WalletSkeleton';
import { useTickets } from '../../hooks/useTickets';
import { colors, spacing, radius } from '../../lib/theme';
import type { Ticket, TicketGroup } from '../../types/ticket';

type TabType = 'upcoming' | 'past';

export default function WalletScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const { upcomingGroups, pastGroups, loading, refreshing, refresh } = useTickets();

  const groups = activeTab === 'upcoming' ? upcomingGroups : pastGroups;
  const isEmpty = groups.length === 0;

  const handleAddTicket = () => {
    router.push('/wallet/add-ticket');
  };

  const renderSectionHeader = ({ section }: { section: TicketGroup }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.date}</Text>
    </View>
  );

  const renderItem = ({ item }: { item: Ticket }) => <TicketCard ticket={item} />;

  if (loading) {
    return (
      <Screen padded={false}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Wallet</Text>
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
          <Text style={styles.title}>Wallet</Text>
          <Pressable style={styles.addButton} onPress={handleAddTicket} accessibilityRole="button">
            <Ionicons name="add" size={24} color={colors.brandPurple} />
          </Pressable>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
            onPress={() => setActiveTab('upcoming')}
            accessibilityRole="button"
          >
            <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>Upcoming</Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'past' && styles.tabActive]}
            onPress={() => setActiveTab('past')}
            accessibilityRole="button"
          >
            <Text style={[styles.tabText, activeTab === 'past' && styles.tabTextActive]}>Past</Text>
          </Pressable>
        </View>

        {/* Content */}
        {isEmpty ? (
          <View style={styles.emptyContainer}>
            {activeTab === 'upcoming' ? (
              <>
                <EmptyWallet />
                <EmailInstructions />
              </>
            ) : (
              <View style={styles.emptyPast}>
                <Ionicons name="time-outline" size={48} color={colors.border} />
                <Text style={styles.emptyText}>No past tickets</Text>
              </View>
            )}
          </View>
        ) : (
          <SectionList
            sections={groups.map((g) => ({ ...g, data: g.tickets }))}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brandPurple} />}
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
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: 50,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.brandPurple,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textTertiary,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  sectionHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContent: {
    paddingTop: spacing.sm,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyPast: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textTertiary,
    marginTop: spacing.sm,
  },
});



