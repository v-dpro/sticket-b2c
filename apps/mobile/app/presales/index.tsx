import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, isToday, isTomorrow } from 'date-fns';

import { Screen } from '../../components/ui/Screen';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { colors, spacing, radius } from '../../lib/theme';
import { usePresales, type PresaleItem } from '../../hooks/usePresales';

function PresaleCard({ presale, onToggleAlert }: { presale: PresaleItem; onToggleAlert: () => void }) {
  const router = useRouter();
  const startDate = new Date(presale.presaleStart);
  const isStartingSoon = startDate.getTime() - Date.now() < 24 * 60 * 60 * 1000;
  const hasStarted = startDate < new Date();

  const getTimeLabel = () => {
    if (hasStarted) return 'Live Now';
    if (isToday(startDate)) return `Today at ${format(startDate, 'h:mm a')}`;
    if (isTomorrow(startDate)) return `Tomorrow at ${format(startDate, 'h:mm a')}`;
    return format(startDate, "MMM d 'at' h:mm a");
  };

  return (
    <Pressable
      style={[styles.card, isStartingSoon && styles.cardUrgent]}
      onPress={() => router.push(`/presales/${presale.id}`)}
      accessibilityRole="button"
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.artistName}>{presale.artistName}</Text>
          {presale.tourName ? <Text style={styles.tourName}>{presale.tourName}</Text> : null}
        </View>
        <Pressable onPress={onToggleAlert} style={styles.alertButton} accessibilityRole="button">
          <Ionicons
            name={presale.hasAlert ? 'notifications' : 'notifications-outline'}
            size={20}
            color={presale.hasAlert ? colors.brandCyan : colors.textTertiary}
          />
        </Pressable>
      </View>

      <View style={styles.venueRow}>
        <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
        <Text style={styles.venueText}>
          {presale.venueName}, {presale.venueCity}
        </Text>
      </View>

      <View style={styles.presaleInfo}>
        <View style={[styles.presaleTypeBadge, hasStarted && styles.presaleTypeBadgeLive]}>
          <Text style={styles.presaleTypeText}>{presale.presaleType}</Text>
        </View>
        <Text style={[styles.timeText, hasStarted && styles.timeTextLive]}>{getTimeLabel()}</Text>
      </View>

      {presale.code ? (
        <View style={styles.codeRow}>
          <Text style={styles.codeLabel}>Code:</Text>
          <View style={styles.codeBadge}>
            <Text style={styles.codeText}>{presale.code}</Text>
          </View>
        </View>
      ) : null}

      {presale.signupUrl && presale.signupDeadline ? (
        <View style={styles.signupWarning}>
          <Ionicons name="alert-circle" size={16} color={colors.warning} />
          <Text style={styles.signupText}>Signup required by {format(new Date(presale.signupDeadline), 'MMM d')}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export default function PresalesScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'my-artists' | 'my-alerts'>('upcoming');
  const { presales, myArtistPresales, myAlerts, loading, refreshing, refresh, toggleAlert } = usePresales();

  const data = {
    upcoming: presales,
    'my-artists': myArtistPresales,
    'my-alerts': myAlerts,
  }[activeTab];

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Text style={styles.title}>Presales</Text>
        <Pressable onPress={() => router.push('/presales/search')} style={styles.searchButton} accessibilityRole="button">
          <Ionicons name="search" size={24} color={colors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.tabs}>
        {[
          { key: 'upcoming', label: 'Upcoming' },
          { key: 'my-artists', label: 'My Artists' },
          { key: 'my-alerts', label: 'My Alerts' },
        ].map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key as any)}
            accessibilityRole="button"
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PresaleCard presale={item} onToggleAlert={() => toggleAlert(item.id, item.hasAlert)} />}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || loading}
            onRefresh={refresh}
            tintColor={colors.brandPurple}
            colors={[colors.brandPurple]}
          />
        }
        ListEmptyComponent={() => {
          if (loading) {
            return (
              <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.md }}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={styles.card}>
                    <Skeleton width="60%" height={18} />
                    <Skeleton width="80%" height={12} style={{ marginTop: 10 }} />
                    <Skeleton width={120} height={22} borderRadius={999} style={{ marginTop: 14 }} />
                  </View>
                ))}
              </View>
            );
          }

          return (
            <EmptyState
              icon="ticket-outline"
              title="No Presales"
              description={
                activeTab === 'my-artists'
                  ? 'Follow artists to see their presales'
                  : activeTab === 'my-alerts'
                    ? 'Set alerts on presales to track them'
                    : 'Check back soon for upcoming presales'
              }
            />
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  searchButton: {
    padding: 8,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
  },
  tabActive: {
    backgroundColor: colors.brandPurple,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textTertiary,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  list: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardUrgent: {
    borderColor: colors.warning,
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  artistName: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  tourName: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  alertButton: {
    padding: 8,
    marginRight: -8,
    marginTop: -8,
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.md,
  },
  venueText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  presaleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  presaleTypeBadge: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  presaleTypeBadgeLive: {
    backgroundColor: colors.success,
  },
  presaleTypeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.brandCyan,
  },
  timeTextLive: {
    color: colors.success,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  codeLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  codeBadge: {
    backgroundColor: colors.brandPurple,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  codeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'monospace',
  },
  signupWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: radius.sm,
  },
  signupText: {
    fontSize: 13,
    color: colors.warning,
    fontWeight: '600',
  },
});


