import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useConcertLife } from '../../../hooks/useConcertLife';
import { colors, radius, fonts, spacing, accentSets, fontFamilies } from '../../../lib/theme';
import { Eyebrow } from '../../../components/ui/Eyebrow';
import { MonoLabel } from '../../../components/ui/MonoLabel';
import { ScreenTitle } from '../../../components/ui/ScreenTitle';

// ─── Helpers ──────────────────────────────────────────────

function startOfTodayLocal() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysUntil(dateStr: string): number {
  const now = startOfTodayLocal().getTime();
  const target = new Date(dateStr).getTime();
  return Math.max(0, Math.ceil((target - now) / (1000 * 60 * 60 * 24)));
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function hueFromName(name: string): number {
  return (name.charCodeAt(0) * 11) % 360;
}

// ─── Types ────────────────────────────────────────────────

type ShowStatus = 'ticketed' | 'planned';

interface UpcomingShow {
  id: string;
  status: ShowStatus;
  artistName: string;
  venueName: string;
  venueCity: string;
  date: string;
  imageUrl: string | null;
  ticketApp?: string;
  section?: string;
  row?: string;
  seat?: string;
  eventId?: string;
  tourName?: string;
}

// ─── NextShowHero ─────────────────────────────────────────

function NextShowHero({ show }: { show: UpcomingShow }) {
  const days = daysUntil(show.date);

  return (
    <View style={heroStyles.wrapper}>
      <View style={heroStyles.container}>
        {show.imageUrl ? (
          <Image source={{ uri: show.imageUrl }} style={heroStyles.bgImage} />
        ) : (
          <View style={[heroStyles.bgImage, { backgroundColor: colors.elevated }]} />
        )}
        <LinearGradient
          colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.75)']}
          style={heroStyles.gradient}
        />

        {/* Top row — NEXT SHOW pill */}
        <View style={heroStyles.topRow}>
          <View style={heroStyles.nextShowPill}>
            <View style={heroStyles.accentDot} />
            <Text style={heroStyles.nextShowText}>NEXT SHOW</Text>
          </View>
        </View>

        {/* Bottom content */}
        <View style={heroStyles.bottomContent}>
          {/* Countdown */}
          <View style={heroStyles.countdownRow}>
            <Text style={heroStyles.countdownNumber}>{days}</Text>
            <Text style={heroStyles.countdownLabel}>DAYS</Text>
          </View>

          {/* Artist */}
          <Text style={heroStyles.artistName} numberOfLines={1}>
            {show.artistName}
          </Text>

          {/* Venue + date */}
          <Text style={heroStyles.venueDateText} numberOfLines={1}>
            {show.venueName}{show.venueCity ? `, ${show.venueCity}` : ''} · {formatDateShort(show.date)}
          </Text>

          {/* Bottom row — ticket app + seat */}
          <View style={heroStyles.bottomRow}>
            {show.ticketApp ? (
              <View style={heroStyles.ticketAppPill}>
                <Text style={heroStyles.ticketAppText}>{show.ticketApp}</Text>
              </View>
            ) : null}
            {show.section || show.row || show.seat ? (
              <Text style={heroStyles.seatText}>
                {[show.section && `Sec ${show.section}`, show.row && `Row ${show.row}`, show.seat && `Seat ${show.seat}`]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

const heroStyles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  container: {
    minHeight: 280,
    borderRadius: radius.lg,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 12,
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    resizeMode: 'cover',
  } as any,
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  topRow: {
    padding: 14,
  },
  nextShowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
  },
  accentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: accentSets.purple.hex,
    shadowColor: accentSets.purple.hex,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  nextShowText: {
    fontFamily: fontFamilies.monoBold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: '#FFFFFF',
  },
  bottomContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 18,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 4,
  },
  countdownNumber: {
    fontFamily: fontFamilies.displayItalic,
    fontSize: 72,
    letterSpacing: -3,
    color: '#FFFFFF',
    lineHeight: 72,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  countdownLabel: {
    fontFamily: fontFamilies.monoBold,
    fontSize: 12,
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.8)',
  },
  artistName: {
    fontFamily: fontFamilies.displayItalic,
    fontSize: 26,
    letterSpacing: -0.5,
    color: '#FFFFFF',
    marginBottom: 2,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  venueDateText: {
    fontFamily: fontFamilies.ui,
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  ticketAppPill: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  ticketAppText: {
    fontFamily: fontFamilies.monoSemi,
    fontSize: 9.5,
    letterSpacing: 1,
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  seatText: {
    fontFamily: fontFamilies.mono,
    fontSize: 9.5,
    letterSpacing: 0.5,
    color: 'rgba(255,255,255,0.7)',
  },
});

// ─── TicketedRow ──────────────────────────────────────────

function TicketedRow({ show, onPress }: { show: UpcomingShow; onPress: () => void }) {
  const days = daysUntil(show.date);

  return (
    <TouchableOpacity style={ticketedStyles.row} onPress={onPress} activeOpacity={0.7}>
      {show.imageUrl ? (
        <Image source={{ uri: show.imageUrl }} style={ticketedStyles.cover} />
      ) : (
        <View style={[ticketedStyles.cover, { backgroundColor: accentSets.purple.soft }]} />
      )}
      <View style={ticketedStyles.info}>
        <View style={ticketedStyles.topMeta}>
          <Text style={ticketedStyles.countdown}>IN {days}D</Text>
          <Text style={ticketedStyles.dateMono}>{formatDateShort(show.date).toUpperCase()}</Text>
        </View>
        <Text style={ticketedStyles.artist} numberOfLines={1}>
          {show.artistName}
        </Text>
        <Text style={ticketedStyles.venue} numberOfLines={1}>
          {show.venueName}
          {show.ticketApp ? ` · ${show.ticketApp}` : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const ticketedStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.md,
    padding: 10,
    marginBottom: 6,
    gap: 10,
  },
  cover: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  info: {
    flex: 1,
  },
  topMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  countdown: {
    fontFamily: fontFamilies.monoBold,
    fontSize: 9.5,
    letterSpacing: 1,
    color: accentSets.purple.hex,
  },
  dateMono: {
    fontFamily: fontFamilies.mono,
    fontSize: 9.5,
    letterSpacing: 0.5,
    color: colors.textLo,
  },
  artist: {
    fontFamily: fontFamilies.uiSemi,
    fontSize: 13.5,
    color: colors.textHi,
    marginBottom: 1,
  },
  venue: {
    fontFamily: fontFamilies.ui,
    fontSize: 11,
    color: colors.textLo,
  },
});

// ─── PlannedRow ───────────────────────────────────────────

function PlannedRow({ show, onPress }: { show: UpcomingShow; onPress: () => void }) {
  const hue = hueFromName(show.artistName);
  const initial = show.artistName.charAt(0).toUpperCase();

  return (
    <TouchableOpacity style={plannedStyles.row} onPress={onPress} activeOpacity={0.7}>
      <LinearGradient
        colors={[`hsl(${hue}, 55%, 40%)`, `hsl(${hue}, 55%, 25%)`]}
        style={plannedStyles.avatar}
      >
        <Text style={plannedStyles.initial}>{initial}</Text>
      </LinearGradient>
      <View style={plannedStyles.info}>
        <View style={plannedStyles.topMeta}>
          <View style={plannedStyles.plannedBadge}>
            <Text style={plannedStyles.plannedBadgeText}>PLANNED</Text>
          </View>
        </View>
        <Text style={plannedStyles.artist} numberOfLines={1}>
          {show.artistName}
        </Text>
        <Text style={plannedStyles.venue} numberOfLines={1}>
          {show.venueName} · {formatDateShort(show.date)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const plannedStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    padding: 10,
    marginBottom: 6,
    gap: 10,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontSize: 28,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
  },
  info: {
    flex: 1,
  },
  topMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  plannedBadge: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  plannedBadgeText: {
    fontFamily: fontFamilies.monoBold,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.textMid,
  },
  artist: {
    fontFamily: fontFamilies.uiSemi,
    fontSize: 13.5,
    color: colors.textHi,
    marginBottom: 1,
  },
  venue: {
    fontFamily: fontFamilies.ui,
    fontSize: 11,
    color: colors.textLo,
  },
});

// ─── OnSaleRow ────────────────────────────────────────────

function OnSaleRow({ item, onRemind }: { item: any; onRemind?: () => void }) {
  const days = daysUntil(item.date || item.signupDeadline);
  const saleDate = item.signupDeadline || item.date;

  return (
    <View style={onSaleStyles.row}>
      <View style={onSaleStyles.topMeta}>
        <View style={onSaleStyles.onSaleBadge}>
          <Text style={onSaleStyles.onSaleBadgeText}>ON SALE IN {days}D</Text>
        </View>
        <Text style={onSaleStyles.saleDateMono}>{formatDateShort(saleDate).toUpperCase()}</Text>
      </View>
      <Text style={onSaleStyles.artist} numberOfLines={1}>
        {item.artistName || item.event?.artist?.name || item.tourName || 'Unknown'}
      </Text>
      <Text style={onSaleStyles.venue} numberOfLines={1}>
        {item.venueName || item.event?.venue?.name || 'Venue'} · {formatDate(item.date)}
      </Text>
      {onRemind && (
        <TouchableOpacity style={onSaleStyles.remindButton} onPress={onRemind} activeOpacity={0.7}>
          <Text style={onSaleStyles.remindButtonText}>Remind me</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const onSaleStyles = StyleSheet.create({
  row: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 6,
  },
  topMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  onSaleBadge: {
    backgroundColor: accentSets.purple.soft,
    borderWidth: 1,
    borderColor: accentSets.purple.line,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  onSaleBadgeText: {
    fontFamily: fontFamilies.monoBold,
    fontSize: 9,
    letterSpacing: 1,
    color: accentSets.purple.hex,
  },
  saleDateMono: {
    fontFamily: fontFamilies.mono,
    fontSize: 9.5,
    letterSpacing: 0.5,
    color: colors.textLo,
  },
  artist: {
    fontFamily: fontFamilies.uiSemi,
    fontSize: 13.5,
    color: colors.textHi,
    marginBottom: 2,
  },
  venue: {
    fontFamily: fontFamilies.ui,
    fontSize: 12,
    color: colors.textLo,
    marginBottom: 8,
  },
  remindButton: {
    alignSelf: 'flex-start',
    backgroundColor: accentSets.purple.hex,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  remindButtonText: {
    fontFamily: fontFamilies.uiSemi,
    fontSize: 12,
    color: '#FFFFFF',
  },
});

// ─── SectionLabel ─────────────────────────────────────────

function SectionLabel({ label, action, onAction }: { label: string; action?: string; onAction?: () => void }) {
  return (
    <View style={sectionStyles.container}>
      <Text style={sectionStyles.label}>{label}</Text>
      {action && onAction && (
        <TouchableOpacity onPress={onAction} activeOpacity={0.7}>
          <Text style={sectionStyles.action}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginBottom: 10,
    marginTop: 24,
  },
  label: {
    fontFamily: fontFamilies.monoSemi,
    fontSize: 11,
    letterSpacing: 2.2,
    color: colors.textLo,
  },
  action: {
    fontFamily: fontFamilies.monoBold,
    fontSize: 10.5,
    letterSpacing: 1.5,
    color: accentSets.purple.hex,
  },
});

// ─── Main Screen ──────────────────────────────────────────

export default function UpcomingScreen() {
  const router = useRouter();
  const { data, loading, refreshing, refresh, error } = useConcertLife();

  const upcomingTickets = data?.upcomingTickets ?? [];
  const tracking = data?.tracking ?? [];
  const presaleAlerts = data?.presaleAlerts ?? [];
  const upcomingLogs = (data as any)?.upcomingLogs ?? [];

  // Map data into unified UpcomingShow list
  const { ticketedShows, plannedShows, onSaleItems } = useMemo(() => {
    const today = startOfTodayLocal().getTime();

    const ticketed: UpcomingShow[] = [
      ...upcomingTickets
        .filter((t: any) => new Date(t.date).getTime() >= today)
        .map((t: any) => ({
          id: t.id,
          status: 'ticketed' as const,
          artistName: t.event?.artist?.name || t.artistName || 'Unknown',
          venueName: t.event?.venue?.name || t.venueName || 'Venue',
          venueCity: t.event?.venue?.city || t.venueCity || '',
          date: t.date,
          imageUrl: t.event?.imageUrl || t.event?.artist?.imageUrl || null,
          ticketApp: t.ticketApp || undefined,
          section: t.section,
          row: t.row,
          seat: t.seat,
          eventId: t.event?.id,
        })),
      ...upcomingLogs
        .filter((l: any) => new Date(l.date).getTime() >= today)
        .map((l: any) => ({
          id: l.id,
          status: 'ticketed' as const,
          artistName: l.event?.artist?.name || l.artistName || 'Unknown',
          venueName: l.event?.venue?.name || l.venueName || 'Venue',
          venueCity: l.event?.venue?.city || l.venueCity || '',
          date: l.date,
          imageUrl: l.event?.imageUrl || l.event?.artist?.imageUrl || null,
          eventId: l.event?.id,
        })),
    ];

    ticketed.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const planned: UpcomingShow[] = tracking
      .filter((t: any) => new Date(t.date).getTime() >= today)
      .map((t: any) => ({
        id: t.id,
        status: 'planned' as const,
        artistName: t.event?.artist?.name || t.artistName || 'Unknown',
        venueName: t.event?.venue?.name || t.venueName || 'Venue',
        venueCity: t.event?.venue?.city || t.venueCity || '',
        date: t.date,
        imageUrl: t.event?.imageUrl || t.event?.artist?.imageUrl || null,
        eventId: t.event?.id,
      }))
      .sort((a: UpcomingShow, b: UpcomingShow) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const onSale = presaleAlerts
      .filter((p: any) => new Date(p.date).getTime() >= today)
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return { ticketedShows: ticketed, plannedShows: planned, onSaleItems: onSale };
  }, [upcomingTickets, upcomingLogs, tracking, presaleAlerts]);

  const totalShowCount = ticketedShows.length + plannedShows.length;
  const heroShow = ticketedShows[0] || null;
  const remainingTicketed = ticketedShows.slice(1);

  const navigateToShow = (show: UpcomingShow) => {
    if (show.eventId) {
      router.push(`/event/${show.eventId}`);
    }
  };

  const isEmpty = !loading && totalShowCount === 0 && onSaleItems.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <ScreenTitle
        eyebrow="UPCOMING"
        eyebrowColor={colors.brandPurple}
        title="What's ahead"
        right={<Text style={styles.showCount}>{totalShowCount} SHOWS</Text>}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={accentSets.purple.hex} />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={accentSets.purple.hex} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : error ? (
          <View style={styles.emptyState}>
            <Ionicons name="alert-circle-outline" size={64} color={colors.textLo} />
            <Text style={styles.emptyTitle}>Couldn't load your plans</Text>
            <Text style={styles.emptyText}>{error}</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={refresh} activeOpacity={0.85}>
              <Text style={styles.emptyButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : isEmpty ? (
          <View style={styles.emptyState}>
            <Ionicons name="musical-notes-outline" size={64} color={colors.textLo} />
            <Text style={styles.emptyTitle}>No upcoming plans</Text>
            <Text style={styles.emptyText}>
              Add tickets for your shows or track events you're interested in
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/(tabs)/discover')}
              activeOpacity={0.85}
            >
              <Text style={styles.emptyButtonText}>Find Shows</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* NextShowHero */}
            {heroShow && <NextShowHero show={heroShow} />}

            {/* TICKETED section (remaining) */}
            {remainingTicketed.length > 0 && (
              <>
                <SectionLabel label="TICKETED" />
                <View style={styles.sectionContent}>
                  {remainingTicketed.map((show) => (
                    <TicketedRow key={`ticketed-${show.id}`} show={show} onPress={() => navigateToShow(show)} />
                  ))}
                </View>
              </>
            )}

            {/* PLANNED section */}
            {plannedShows.length > 0 && (
              <>
                <SectionLabel
                  label="PLANNED"
                  action="+ ADD"
                  onAction={() => router.push('/(tabs)/discover')}
                />
                <View style={styles.sectionContent}>
                  {plannedShows.map((show) => (
                    <PlannedRow key={`planned-${show.id}`} show={show} onPress={() => navigateToShow(show)} />
                  ))}
                </View>
              </>
            )}

            {/* ON SALE THIS WEEK section */}
            {onSaleItems.length > 0 && (
              <>
                <SectionLabel label="ON SALE THIS WEEK" />
                <View style={styles.sectionContent}>
                  {onSaleItems.map((item: any) => (
                    <OnSaleRow
                      key={`presale-${item.id}`}
                      item={item}
                      onRemind={() => {
                        if (item.id) router.push(`/presales/${item.id}`);
                      }}
                    />
                  ))}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Main Styles ──────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  showCount: {
    fontFamily: fontFamilies.monoSemi,
    fontSize: 11,
    color: colors.textMid,
    letterSpacing: 1,
    marginBottom: 6,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 120,
  },
  sectionContent: {
    paddingHorizontal: 18,
  },
  loadingContainer: {
    paddingTop: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: colors.textMid,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textHi,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMid,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: accentSets.purple.hex,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textHi,
  },
});
