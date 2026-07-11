import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, isToday, isTomorrow } from 'date-fns';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { SpringPressable } from '../../components/ui/SpringPressable';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { usePresales, type PresaleItem } from '../../hooks/usePresales';

function Shimmer({ width, height, borderRadius, style }: { width: number | `${number}%`; height: number; borderRadius?: number; style?: object }) {
  const { tokens } = useTheme();
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true);
  }, [progress]);
  const pulse = useAnimatedStyle(() => ({ opacity: interpolate(progress.value, [0, 1], [0.4, 0.9]) }));
  return (
    <Animated.View
      style={[{ width, height, borderRadius: borderRadius ?? tokens.radius.sm, backgroundColor: tokens.colors.card2 }, pulse, style]}
    />
  );
}

function PresaleCard({ presale, onToggleAlert }: { presale: PresaleItem; onToggleAlert: () => void }) {
  const router = useRouter();
  const { tokens } = useTheme();
  const startDate = new Date(presale.presaleStart);
  const isStartingSoon = startDate.getTime() - Date.now() < 24 * 60 * 60 * 1000;
  const hasStarted = startDate < new Date();

  const styles = useThemedStyles((t) => ({
    card: {
      backgroundColor: t.colors.card,
      borderRadius: t.radius.lg,
      padding: t.spacing.lg,
      borderWidth: 1,
      borderColor: t.colors.hairline,
    },
    cardUrgent: { borderColor: t.colors.warning, borderWidth: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: t.spacing.sm },
    cardHeaderLeft: { flex: 1 },
    artistName: { fontSize: 17, fontWeight: '800', color: t.colors.fg },
    tourName: { fontSize: 13, color: t.colors.mute, marginTop: 2 },
    alertButton: { padding: 8, marginRight: -8, marginTop: -8 },
    venueRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: t.spacing.md },
    venueText: { fontSize: 13, color: t.colors.mute },
    presaleInfo: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
    presaleTypeBadge: { backgroundColor: t.colors.card2, paddingHorizontal: 10, paddingVertical: 4, borderRadius: t.radius.full },
    presaleTypeBadgeLive: { backgroundColor: t.isDark ? 'rgba(48,209,88,0.16)' : 'rgba(52,199,89,0.14)' },
    presaleTypeText: { fontFamily: t.fontFamilies.mono, fontSize: 11, fontWeight: '600', color: t.colors.text, textTransform: 'uppercase', letterSpacing: 0.5 },
    timeText: { fontFamily: t.fontFamilies.mono, fontSize: 13, fontWeight: '600', color: t.colors.mute },
    timeTextLive: { color: t.colors.success },
    codeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.sm,
      marginTop: t.spacing.md,
      paddingTop: t.spacing.md,
      borderTopWidth: 1,
      borderTopColor: t.colors.hairline,
    },
    codeLabel: { fontSize: 13, color: t.colors.mute },
    codeBadge: { backgroundColor: t.colors.card2, paddingHorizontal: 12, paddingVertical: 6, borderRadius: t.radius.sm },
    codeText: { fontFamily: t.fontFamilies.monoBold, fontSize: 14, fontWeight: '700', color: t.colors.fg },
    signupWarning: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.sm,
      marginTop: t.spacing.md,
      padding: t.spacing.sm,
      backgroundColor: t.isDark ? 'rgba(245,166,35,0.12)' : 'rgba(180,83,9,0.10)',
      borderRadius: t.radius.sm,
    },
    signupText: { fontSize: 13, color: t.colors.warning, fontWeight: '600' },
  }));

  const getTimeLabel = () => {
    if (hasStarted) return 'Live Now';
    if (isToday(startDate)) return `Today at ${format(startDate, 'h:mm a')}`;
    if (isTomorrow(startDate)) return `Tomorrow at ${format(startDate, 'h:mm a')}`;
    return format(startDate, "MMM d 'at' h:mm a");
  };

  return (
    <SpringPressable
      style={[styles.card, isStartingSoon && styles.cardUrgent]}
      onPress={() => router.push(`/presales/${presale.id}`)}
      haptic="light"
      accessibilityRole="button"
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.artistName}>{presale.artistName}</Text>
          {presale.tourName ? <Text style={styles.tourName}>{presale.tourName}</Text> : null}
        </View>
        <SpringPressable onPress={onToggleAlert} haptic="light" style={styles.alertButton} accessibilityRole="button">
          <Ionicons
            name={presale.hasAlert ? 'notifications' : 'notifications-outline'}
            size={20}
            color={presale.hasAlert ? tokens.colors.accent : tokens.colors.muteSoft}
          />
        </SpringPressable>
      </View>

      <View style={styles.venueRow}>
        <Ionicons name="location-outline" size={14} color={tokens.colors.mute} />
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
          <Ionicons name="alert-circle" size={16} color={tokens.colors.warning} />
          <Text style={styles.signupText}>Signup required by {format(new Date(presale.signupDeadline), 'MMM d')}</Text>
        </View>
      ) : null}
    </SpringPressable>
  );
}

export default function PresalesScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'my-artists' | 'my-alerts'>('upcoming');
  const { presales, myArtistPresales, myAlerts, loading, refreshing, refresh, toggleAlert } = usePresales();

  const styles = useThemedStyles((t) => ({
    screen: { flex: 1, backgroundColor: t.colors.bg },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: t.density.pad,
      paddingTop: t.spacing.md,
      paddingBottom: t.spacing.md,
    },
    title: { fontSize: 28, fontWeight: '800', color: t.colors.fg, letterSpacing: -0.5 },
    searchButton: { padding: 8 },
    tabs: { flexDirection: 'row', paddingHorizontal: t.density.pad, marginBottom: t.spacing.md, gap: t.spacing.sm },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: t.colors.card2, borderRadius: t.radius.md },
    tabActive: { backgroundColor: t.colors.inverseBg },
    tabText: { fontSize: 13, fontWeight: '600', color: t.colors.mute },
    tabTextActive: { color: t.colors.inverseFg },
    list: { padding: t.density.pad, gap: t.spacing.md },
    skeletonCard: {
      backgroundColor: t.colors.card,
      borderRadius: t.radius.lg,
      padding: t.spacing.lg,
      borderWidth: 1,
      borderColor: t.colors.hairline,
    },
    empty: { alignItems: 'center', paddingVertical: 64, paddingHorizontal: 32, gap: 10 },
    emptyIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: t.colors.card2,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: t.colors.fg },
    emptyDesc: { fontSize: 14, color: t.colors.mute, textAlign: 'center', lineHeight: 20 },
  }));

  const data = {
    upcoming: presales,
    'my-artists': myArtistPresales,
    'my-alerts': myAlerts,
  }[activeTab];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Text style={styles.title}>Presales</Text>
        <SpringPressable onPress={() => router.push('/presales/search')} haptic="light" style={styles.searchButton} accessibilityRole="button">
          <Ionicons name="search" size={24} color={tokens.colors.fg} />
        </SpringPressable>
      </View>

      <View style={styles.tabs}>
        {[
          { key: 'upcoming', label: 'Upcoming' },
          { key: 'my-artists', label: 'My Artists' },
          { key: 'my-alerts', label: 'My Alerts' },
        ].map((tab) => (
          <SpringPressable
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key as any)}
            haptic="light"
            accessibilityRole="button"
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </SpringPressable>
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
            tintColor={tokens.colors.mute}
            colors={[tokens.colors.accent]}
          />
        }
        ListEmptyComponent={() => {
          if (loading) {
            return (
              <View style={{ gap: tokens.spacing.md }}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={styles.skeletonCard}>
                    <Shimmer width="60%" height={18} />
                    <Shimmer width="80%" height={12} style={{ marginTop: 10 }} />
                    <Shimmer width={120} height={22} borderRadius={999} style={{ marginTop: 14 }} />
                  </View>
                ))}
              </View>
            );
          }

          return (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="ticket-outline" size={32} color={tokens.colors.fg} />
              </View>
              <Text style={styles.emptyTitle}>No Presales</Text>
              <Text style={styles.emptyDesc}>
                {activeTab === 'my-artists'
                  ? 'Follow artists to see their presales'
                  : activeTab === 'my-alerts'
                    ? 'Set alerts on presales to track them'
                    : 'Check back soon for upcoming presales'}
              </Text>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}
