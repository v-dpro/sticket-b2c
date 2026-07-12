import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '../../components/ui/Avatar';
import { MonoLabel } from '../../components/ui/MonoLabel';
import { PillButton } from '../../components/ui/PillButton';
import { StubDetailsRow, StubPerforation } from '../../components/ui/Stub';
import { useSession } from '../../hooks/useSession';
import { useSafeBack } from '../../lib/navigation/safeNavigation';
import { haptics } from '../../lib/motion';
import { apiClient } from '../../lib/api/client';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlannedShow {
  id: string;
  name: string;
  date: string;
  doorsTime?: string;
  imageUrl?: string;
  ticketUrl?: string;

  artist: {
    id: string;
    name: string;
    imageUrl?: string;
  };

  venue: {
    id: string;
    name: string;
    city: string;
    state?: string;
  };

  // Ticket info
  ticket?: {
    section?: string;
    row?: string;
    seat?: string;
    appUrl?: string;
  } | null;

  // Presale
  presale?: {
    info: string;
    code?: string;
    startsAt?: string;
  } | null;

  // Friends
  friendsGoing: {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
    status: 'going' | 'interested' | 'maybe';
  }[];

  // Weather
  weather?: {
    emoji: string;
    tempF: number;
    condition: string;
  } | null;

  // Setlist predictions
  setlistPredictions?: {
    songName: string;
    probability: number;
  }[] | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeCountdown(targetIso: string): { value: string; unit: string } | null {
  const target = new Date(targetIso);
  if (Number.isNaN(target.getTime())) return null;
  const now = Date.now();
  const diff = target.getTime() - now;
  if (diff <= 0) return null;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 0) return { value: String(days), unit: days === 1 ? 'DAY' : 'DAYS' };

  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours > 0) return { value: String(hours), unit: hours === 1 ? 'HOUR' : 'HOURS' };

  const minutes = Math.floor(diff / (1000 * 60));
  return { value: String(Math.max(1, minutes)), unit: minutes === 1 ? 'MINUTE' : 'MINUTES' };
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PlannedShowCard() {
  const router = useRouter();
  const goBack = useSafeBack();
  const insets = useSafeAreaInsets();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { user } = useSession();

  const id = String(eventId || '');

  const [show, setShow] = useState<PlannedShow | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spoilerRevealed, setSpoilerRevealed] = useState(false);

  const fetchShow = useCallback(async () => {
    if (!id) return;
    try {
      const res = await apiClient.get(`/events/${id}`);
      setShow(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to load show');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchShow();
  }, [fetchShow]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchShow();
    setRefreshing(false);
  };

  const countdown = useMemo(() => {
    if (!show?.date) return null;
    return computeCountdown(show.date);
  }, [show?.date]);

  const presaleCountdown = useMemo(() => {
    if (!show?.presale?.startsAt) return null;
    return computeCountdown(show.presale.startsAt);
  }, [show?.presale?.startsAt]);

  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => {
    return {
      container: {
        flex: 1,
        backgroundColor: t.colors.bg,
      },
      center: {
        flex: 1,
        backgroundColor: t.colors.bg,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
      },
      errorText: {
        color: t.colors.mute,
        fontSize: 14,
        textAlign: 'center',
      },

      // Hero
      hero: {
        height: 260,
        justifyContent: 'flex-end',
        backgroundColor: t.colors.card2,
      },
      heroInitial: {
        fontSize: 220,
        fontWeight: '900',
        color: t.colors.line, // faint watermark on the card2 fallback
        position: 'absolute',
        top: -20,
        right: -10,
        lineHeight: 260,
      },
      backBtn: {
        position: 'absolute',
        left: 16,
        width: 36,
        height: 36,
        borderRadius: t.radius.full,
        backgroundColor: t.colors.card2,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
      },
      heroBottom: {
        paddingHorizontal: 16,
        paddingBottom: 20,
      },
      // Over-photo text rides the literal scrim (fixed light ink); the
      // photo-less fallback uses theme tokens so both modes stay legible.
      heroArtistOnPhoto: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -0.4,
        color: '#FFFFFF',
      },
      heroArtistOnCard: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -0.4,
        color: t.colors.fg,
      },
      heroVenueOnPhoto: {
        fontSize: 14,
        color: '#C9C9D4',
        marginTop: 4,
      },
      heroVenueOnCard: {
        fontSize: 14,
        color: t.colors.mute,
        marginTop: 4,
      },
      heroDateOnPhoto: {
        fontFamily: t.fontFamilies.mono,
        fontSize: 11,
        color: '#C9C9D4',
        letterSpacing: 1,
        marginTop: 6,
        textTransform: 'uppercase',
      },
      heroDateOnCard: {
        fontFamily: t.fontFamilies.mono,
        fontSize: 11,
        color: t.colors.muteSoft,
        letterSpacing: 1,
        marginTop: 6,
        textTransform: 'uppercase',
      },

      // Countdown — plain card (a plan, not a stub); digits mono ink.
      countdownCard: {
        marginHorizontal: 16,
        marginTop: 16,
        backgroundColor: t.colors.card,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: t.colors.hairline,
        borderRadius: t.radius.card,
        padding: 14,
        alignItems: 'center',
      },
      countdownRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginTop: 4,
        gap: 6,
      },
      countdownValue: {
        fontFamily: t.fontFamilies.monoBold,
        fontSize: 40,
        color: t.colors.fg,
        fontVariant: ['tabular-nums'],
        letterSpacing: -0.5,
      },
      countdownUnit: {
        fontFamily: t.fontFamilies.monoSemi,
        fontSize: 12,
        color: t.colors.muteSoft,
        letterSpacing: 1.5,
      },
      doorsText: {
        fontFamily: t.fontFamilies.mono,
        fontSize: 10,
        color: t.colors.muteSoft,
        marginTop: 6,
        letterSpacing: 1,
        textTransform: 'uppercase',
      },

      // Sections
      section: {
        paddingHorizontal: 16,
        paddingTop: 24,
        paddingBottom: 8,
      },

      // Ticket — the user HOLDS this, so it gets the stub construction (C3).
      ticketStub: {
        marginTop: 12,
        backgroundColor: t.colors.card,
        borderWidth: 1,
        borderColor: t.colors.line,
        borderRadius: t.radius.stub,
        overflow: 'hidden',
        ...t.shadows.card,
      },
      ticketStubBody: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: t.density.cardPad,
        paddingTop: 16,
        paddingBottom: 12,
      },
      ticketIcon: {
        width: 42,
        height: 42,
        borderRadius: t.radius.md,
        backgroundColor: t.colors.card2,
        alignItems: 'center',
        justifyContent: 'center',
      },
      ticketLabel: {
        fontFamily: t.fontFamilies.monoSemi,
        fontSize: 12,
        color: t.colors.fg,
        letterSpacing: 1,
      },
      ticketStubFooter: {
        paddingHorizontal: t.density.cardPad,
        paddingVertical: 10,
      },

      // Presale — a future thing: dashed tokens.colors.dash borders.
      presaleInfoBox: {
        marginTop: 10,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: t.colors.dash,
        borderRadius: t.radius.card,
        padding: 14,
      },
      presaleInfoText: {
        fontSize: 14,
        color: t.colors.text,
        lineHeight: 20,
      },
      presaleCodeBox: {
        marginTop: 10,
        alignSelf: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: t.colors.line,
        borderRadius: t.radius.chip,
        paddingHorizontal: 16,
        paddingVertical: 10,
      },
      presaleCode: {
        fontFamily: t.fontFamilies.monoBold,
        fontSize: 12,
        color: t.colors.fg,
        letterSpacing: 3,
        marginTop: 6,
      },

      // Friends
      friendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 14,
      },
      friendName: {
        fontSize: 14,
        fontWeight: '600',
        color: t.colors.text,
      },
      friendStatus: {
        fontFamily: t.fontFamilies.mono,
        fontSize: 9.5,
        color: t.colors.muteSoft,
        letterSpacing: 1,
        marginTop: 2,
      },
      messageBtn: {
        borderWidth: 1,
        borderColor: t.colors.line,
        borderRadius: t.radius.full,
        paddingHorizontal: 14,
        paddingVertical: 6,
      },
      messageBtnText: {
        fontFamily: t.fontFamilies.monoSemi,
        fontSize: 10,
        color: t.colors.fg,
        letterSpacing: 1,
      },

      // Weather
      weatherRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        gap: 12,
      },
      weatherEmoji: {
        fontSize: 40,
      },
      weatherTemp: {
        fontFamily: t.fontFamilies.monoSemi,
        fontVariant: ['tabular-nums'],
        fontSize: 22,
        color: t.colors.fg,
      },
      weatherCondition: {
        fontFamily: t.fontFamilies.mono,
        fontSize: 10,
        color: t.colors.muteSoft,
        letterSpacing: 1,
        textTransform: 'uppercase',
      },

      // Setlist predictions
      setlistList: {
        marginTop: 12,
      },
      setlistItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: t.colors.hairline,
      },
      setlistNum: {
        fontFamily: t.fontFamilies.mono,
        fontSize: 12,
        color: t.colors.muteSoft,
        width: 28,
      },
      setlistSong: {
        flex: 1,
        fontSize: 14,
        color: t.colors.text,
      },
      setlistPct: {
        fontFamily: t.fontFamilies.monoSemi,
        fontVariant: ['tabular-nums'],
        fontSize: 11,
        color: t.colors.fg,
      },

      // Spoiler box
      spoilerBox: {
        marginTop: 12,
        backgroundColor: t.colors.card,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: t.colors.hairline,
        borderRadius: t.radius.card,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      },
      spoilerText: {
        fontSize: 13,
        color: t.colors.mute,
        fontWeight: '500',
      },
    };
  });

  // ── Loading / Error ─────────────────────────────────────────────────
  if (loading && !show) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={tokens.colors.mute} />
      </View>
    );
  }

  if (error || !show) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorText}>{error ?? 'Show not found'}</Text>
        <Pressable onPress={goBack} style={{ marginTop: 16 }}>
          <Text style={{ color: tokens.colors.fg, fontSize: 14, fontWeight: '600' }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const artistInitial = (show.artist.name?.[0] ?? 'S').toUpperCase();
  const hasHeroPhoto = Boolean(show.imageUrl);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={tokens.colors.mute}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ─────────────────────────────────────────────── */}
        <View style={styles.hero}>
          {hasHeroPhoto ? (
            <>
              <Image
                source={{ uri: show.imageUrl }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={80}
                cachePolicy="memory-disk"
              />
              {/* Scrim — fixed dark scrim over the hero image only */}
              <LinearGradient
                colors={['transparent', 'rgba(11,11,16,0.9)']}
                locations={[0.3, 1]}
                style={StyleSheet.absoluteFill}
              />
            </>
          ) : (
            // Photo-less fallback — flat card2 field with a faint watermark.
            <Text style={styles.heroInitial}>{artistInitial}</Text>
          )}
          {/* Back */}
          <Pressable
            onPress={goBack}
            style={[styles.backBtn, { top: insets.top + 8 }]}
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={20} color={tokens.colors.fg} />
          </Pressable>
          {/* Bottom info */}
          <View style={styles.heroBottom}>
            <Text style={hasHeroPhoto ? styles.heroArtistOnPhoto : styles.heroArtistOnCard}>
              {show.artist.name}
            </Text>
            <Text style={hasHeroPhoto ? styles.heroVenueOnPhoto : styles.heroVenueOnCard}>
              {show.venue.name} {'\u00B7'} {show.venue.city}
              {show.venue.state ? `, ${show.venue.state}` : ''}
            </Text>
            <Text style={hasHeroPhoto ? styles.heroDateOnPhoto : styles.heroDateOnCard}>
              {formatDate(show.date)}
            </Text>
          </View>
        </View>

        {/* ── Countdown ──────────────────────────────────────── */}
        {countdown && (
          <View style={styles.countdownCard}>
            <MonoLabel size={9.5} color={tokens.colors.muteSoft}>SHOW IN</MonoLabel>
            <View style={styles.countdownRow}>
              <Text style={styles.countdownValue}>{countdown.value}</Text>
              <Text style={styles.countdownUnit}>{countdown.unit}</Text>
            </View>
            {show.doorsTime ? (
              <Text style={styles.doorsText}>
                Doors {show.doorsTime}
              </Text>
            ) : null}
          </View>
        )}

        {/* ── Presale countdown (if presale has not started) ── */}
        {presaleCountdown && show.presale && (
          <View style={styles.countdownCard}>
            <MonoLabel size={9.5} color={tokens.colors.muteSoft}>TICKETS DROP IN</MonoLabel>
            <View style={styles.countdownRow}>
              <Text style={styles.countdownValue}>{presaleCountdown.value}</Text>
              <Text style={styles.countdownUnit}>{presaleCountdown.unit}</Text>
            </View>
          </View>
        )}

        {/* ── Your Ticket ────────────────────────────────────── */}
        {show.ticket && (
          <View style={styles.section}>
            {/* A held ticket gets the stub construction (C3). */}
            <MonoLabel size={10}>YOUR TICKET</MonoLabel>
            <View style={styles.ticketStub}>
              <View style={styles.ticketStubBody}>
                <View style={styles.ticketIcon}>
                  <Ionicons name="ticket" size={22} color={tokens.colors.fg} />
                </View>
                <View style={{ flex: 1 }}>
                  {show.ticket.section ? (
                    <Text style={styles.ticketLabel}>
                      SEC {show.ticket.section}
                      {show.ticket.row ? ` \u00B7 ROW ${show.ticket.row}` : ''}
                      {show.ticket.seat ? ` \u00B7 SEAT ${show.ticket.seat}` : ''}
                    </Text>
                  ) : (
                    <Text style={styles.ticketLabel}>GENERAL ADMISSION</Text>
                  )}
                </View>
                {show.ticket.appUrl ? (
                  <PillButton
                    title="Open app"
                    size="sm"
                    variant="primary"
                    onPress={() => {
                      // Open ticket app link
                      Linking.openURL(show.ticket!.appUrl!).catch(() => {});
                    }}
                  />
                ) : null}
              </View>
              <StubPerforation notchColor={tokens.colors.bg} />
              <View style={styles.ticketStubFooter}>
                <StubDetailsRow
                  left={`${show.venue.name} \u00B7 ${show.venue.city}`}
                  right="ADMIT 01"
                />
              </View>
            </View>
          </View>
        )}

        {/* ── Presale Info ───────────────────────────────────── */}
        {show.presale && !presaleCountdown && (
          <View style={styles.section}>
            <MonoLabel size={10}>PRESALE</MonoLabel>
            <View style={styles.presaleInfoBox}>
              <Text style={styles.presaleInfoText}>{show.presale.info}</Text>
            </View>
            {show.presale.code ? (
              <View style={styles.presaleCodeBox}>
                <MonoLabel size={9.5} color={tokens.colors.muteSoft}>CODE</MonoLabel>
                <Text style={styles.presaleCode}>{show.presale.code}</Text>
              </View>
            ) : null}
          </View>
        )}

        {/* ── Friends Going ──────────────────────────────────── */}
        {show.friendsGoing?.length > 0 && (
          <View style={styles.section}>
            <MonoLabel size={10}>FRIENDS GOING</MonoLabel>
            {show.friendsGoing.map((f) => (
              <Pressable
                key={f.id}
                style={styles.friendRow}
                onPress={() => { haptics.light(); router.push(`/profile/${f.id}`); }}
              >
                <Avatar uri={f.avatarUrl} name={f.displayName ?? f.username} size={34} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.friendName}>{f.displayName ?? f.username}</Text>
                  <Text style={styles.friendStatus}>{f.status.toUpperCase()}</Text>
                </View>
                <Pressable
                  style={styles.messageBtn}
                  onPress={() => {
                    // Navigate to direct message or profile
                    haptics.light();
                    router.push(`/profile/${f.id}`);
                  }}
                >
                  <Text style={styles.messageBtnText}>MESSAGE</Text>
                </Pressable>
              </Pressable>
            ))}
          </View>
        )}

        {/* ── Weather ────────────────────────────────────────── */}
        {show.weather && (
          <View style={styles.section}>
            <MonoLabel size={10}>WEATHER</MonoLabel>
            <View style={styles.weatherRow}>
              <Text style={styles.weatherEmoji}>{show.weather.emoji}</Text>
              <Text style={styles.weatherTemp}>{show.weather.tempF}\u00B0</Text>
              <Text style={styles.weatherCondition}>{show.weather.condition}</Text>
            </View>
          </View>
        )}

        {/* ── Setlist Predictions (SpoilerBox) ───────────────── */}
        {show.setlistPredictions && show.setlistPredictions.length > 0 && (
          <View style={styles.section}>
            <MonoLabel size={10}>EXPECT TO HEAR</MonoLabel>
            {spoilerRevealed ? (
              <View style={styles.setlistList}>
                {show.setlistPredictions.map((song, i) => (
                  <View key={song.songName} style={styles.setlistItem}>
                    <Text style={styles.setlistNum}>{i + 1}.</Text>
                    <Text style={styles.setlistSong}>{song.songName}</Text>
                    <Text style={styles.setlistPct}>{Math.round(song.probability * 100)}%</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Pressable style={styles.spoilerBox} onPress={() => setSpoilerRevealed(true)}>
                <Ionicons name="eye-off" size={24} color={tokens.colors.muteSoft} />
                <Text style={styles.spoilerText}>Tap to reveal predictions</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* ── Ticket link (bottom CTA) ───────────────────────── */}
        {show.ticketUrl && !show.ticket && (
          <View style={[styles.section, { alignItems: 'center', paddingBottom: 8 }]}>
            <PillButton
              title="Get tickets"
              variant="primary"
              size="lg"
              onPress={() => {
                Linking.openURL(show.ticketUrl!).catch(() => {});
              }}
            />
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

