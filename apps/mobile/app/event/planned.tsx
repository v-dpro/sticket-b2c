import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '../../components/ui/Avatar';
import { MonoLabel } from '../../components/ui/MonoLabel';
import { PillButton } from '../../components/ui/PillButton';
import { useSession } from '../../hooks/useSession';
import { useSafeBack } from '../../lib/navigation/safeNavigation';
import { apiClient } from '../../lib/api/client';
import { colors, accentSets, radius, spacing, fonts } from '../../lib/theme';

const monoFont = Platform.select({ ios: 'Menlo', android: 'monospace' }) ?? 'monospace';
const accent = accentSets.cyan;

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

  // ── Loading / Error ─────────────────────────────────────────────────
  if (loading && !show) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={accent.hex} />
      </View>
    );
  }

  if (error || !show) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorText}>{error ?? 'Show not found'}</Text>
        <Pressable onPress={goBack} style={{ marginTop: 16 }}>
          <Text style={{ color: accent.hex, fontSize: 14, fontWeight: '600' }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const artistInitial = (show.artist.name?.[0] ?? 'S').toUpperCase();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={accent.hex} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ─────────────────────────────────────────────── */}
        <View style={styles.hero}>
          {show.imageUrl ? (
            <View style={StyleSheet.absoluteFill}>
              {/* Using a gradient placeholder behind the image */}
              <LinearGradient
                colors={[accentSets.purple.hex, accentSets.cyan.hex]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Image
                source={{ uri: show.imageUrl }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
            </View>
          ) : (
            <LinearGradient
              colors={[accentSets.purple.hex, colors.ink]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            >
              <Text style={styles.heroInitial}>{artistInitial}</Text>
            </LinearGradient>
          )}
          {/* Scrim */}
          <LinearGradient
            colors={['transparent', 'rgba(11,11,20,0.9)']}
            locations={[0.3, 1]}
            style={StyleSheet.absoluteFill}
          />
          {/* Back */}
          <Pressable
            onPress={goBack}
            style={[styles.backBtn, { top: insets.top + 8 }]}
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={20} color={colors.textHi} />
          </Pressable>
          {/* Bottom info */}
          <View style={styles.heroBottom}>
            <Text style={styles.heroArtist}>{show.artist.name}</Text>
            <Text style={styles.heroVenue}>
              {show.venue.name} {'\u00B7'} {show.venue.city}
              {show.venue.state ? `, ${show.venue.state}` : ''}
            </Text>
            <Text style={styles.heroDate}>{formatDate(show.date)}</Text>
          </View>
        </View>

        {/* ── Countdown ──────────────────────────────────────── */}
        {countdown && (
          <View style={styles.countdownCard}>
            <MonoLabel size={9.5} color={colors.textLo}>SHOW IN</MonoLabel>
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
            <MonoLabel size={9.5} color={colors.textLo}>TICKETS DROP IN</MonoLabel>
            <View style={styles.countdownRow}>
              <Text style={styles.countdownValue}>{presaleCountdown.value}</Text>
              <Text style={styles.countdownUnit}>{presaleCountdown.unit}</Text>
            </View>
          </View>
        )}

        {/* ── Your Ticket ────────────────────────────────────── */}
        {show.ticket && (
          <View style={styles.section}>
            <MonoLabel size={10} color={accent.hex}>YOUR TICKET</MonoLabel>
            <View style={styles.ticketRow}>
              <View style={styles.ticketIcon}>
                <Ionicons name="ticket" size={22} color={accent.hex} />
              </View>
              <View style={{ flex: 1 }}>
                {show.ticket.section ? (
                  <Text style={styles.ticketLabel}>
                    SEC {show.ticket.section}
                    {show.ticket.row ? ` \u00B7 ROW ${show.ticket.row}` : ''}
                    {show.ticket.seat ? ` \u00B7 SEAT ${show.ticket.seat}` : ''}
                  </Text>
                ) : (
                  <Text style={styles.ticketLabel}>General Admission</Text>
                )}
              </View>
              {show.ticket.appUrl ? (
                <PillButton
                  title="OPEN APP"
                  size="sm"
                  variant="solid"
                  accentColor={accent.hex}
                  onPress={() => {
                    // Open ticket app link
                    Linking.openURL(show.ticket!.appUrl!).catch(() => {});
                  }}
                />
              ) : null}
            </View>
          </View>
        )}

        {/* ── Presale Info ───────────────────────────────────── */}
        {show.presale && !presaleCountdown && (
          <View style={styles.section}>
            <MonoLabel size={10} color={accent.hex}>PRESALE</MonoLabel>
            <View style={styles.presaleInfoBox}>
              <Text style={styles.presaleInfoText}>{show.presale.info}</Text>
            </View>
            {show.presale.code ? (
              <View style={styles.presaleCodeBox}>
                <MonoLabel size={9.5} color={colors.textLo}>CODE</MonoLabel>
                <Text style={styles.presaleCode}>{show.presale.code}</Text>
              </View>
            ) : null}
          </View>
        )}

        {/* ── Friends Going ──────────────────────────────────── */}
        {show.friendsGoing?.length > 0 && (
          <View style={styles.section}>
            <MonoLabel size={10} color={accent.hex}>FRIENDS GOING</MonoLabel>
            {show.friendsGoing.map((f) => (
              <Pressable
                key={f.id}
                style={styles.friendRow}
                onPress={() => router.push(`/profile/${f.id}`)}
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
            <MonoLabel size={10} color={accent.hex}>WEATHER</MonoLabel>
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
            <MonoLabel size={10} color={accent.hex}>EXPECT TO HEAR</MonoLabel>
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
                <Ionicons name="eye-off" size={24} color={colors.textMuted} />
                <Text style={styles.spoilerText}>Tap to reveal predictions</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* ── Ticket link (bottom CTA) ───────────────────────── */}
        {show.ticketUrl && !show.ticket && (
          <View style={[styles.section, { alignItems: 'center', paddingBottom: 8 }]}>
            <PillButton
              title="GET TICKETS"
              variant="solid"
              size="lg"
              accentColor={accent.hex}
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

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  center: {
    flex: 1,
    backgroundColor: colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  errorText: {
    color: colors.textMid,
    fontSize: 14,
    textAlign: 'center',
  },

  // Hero
  hero: {
    height: 260,
    justifyContent: 'flex-end',
  },
  heroInitial: {
    fontSize: 220,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.08)',
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
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  heroBottom: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  heroArtist: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroVenue: {
    fontSize: 14,
    color: colors.textMid,
    marginTop: 4,
  },
  heroDate: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: 11,
    color: colors.textLo,
    letterSpacing: 1,
    marginTop: 6,
    textTransform: 'uppercase',
  },

  // Countdown
  countdownCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
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
    fontSize: 40,
    fontWeight: '700',
    color: accent.hex,
    fontVariant: ['tabular-nums'],
  },
  countdownUnit: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: 12,
    fontWeight: '600',
    color: colors.textLo,
    letterSpacing: 1.5,
  },
  doorsText: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: 10,
    color: colors.textMuted,
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

  // Ticket
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  ticketIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: accent.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketLabel: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: 12,
    fontWeight: '600',
    color: colors.textHi,
    letterSpacing: 1,
  },

  // Presale
  presaleInfoBox: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: accent.soft,
    borderRadius: radius.md,
    padding: 14,
  },
  presaleInfoText: {
    fontSize: 14,
    color: colors.textHi,
    lineHeight: 20,
  },
  presaleCodeBox: {
    marginTop: 10,
    backgroundColor: colors.ink,
    borderWidth: 1,
    borderColor: accent.line,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    padding: 14,
    alignItems: 'center',
  },
  presaleCode: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: 12,
    fontWeight: '700',
    color: accent.hex,
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
    color: colors.textHi,
  },
  friendStatus: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: 9.5,
    color: colors.textLo,
    letterSpacing: 1,
    marginTop: 2,
  },
  messageBtn: {
    borderWidth: 1,
    borderColor: accent.hex,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  messageBtnText: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: 10,
    fontWeight: '600',
    color: accent.hex,
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
    fontSize: 22,
    fontWeight: '700',
    color: colors.textHi,
  },
  weatherCondition: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: 10,
    color: colors.textLo,
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
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  setlistNum: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: 12,
    color: colors.textMuted,
    width: 28,
  },
  setlistSong: {
    flex: 1,
    fontSize: 14,
    color: colors.textHi,
  },
  setlistPct: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: 11,
    color: accent.hex,
    fontWeight: '600',
  },

  // Spoiler box
  spoilerBox: {
    marginTop: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  spoilerText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
});
