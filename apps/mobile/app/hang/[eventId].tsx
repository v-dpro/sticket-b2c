import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '../../components/ui/Avatar';
import { MonoLabel } from '../../components/ui/MonoLabel';
import { SpringPressable } from '../../components/ui/SpringPressable';
import { useSession } from '../../hooks/useSession';
import { useSafeBack } from '../../lib/navigation/safeNavigation';
import { apiClient } from '../../lib/api/client';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RsvpStatus = 'going' | 'maybe' | 'cant';

interface HangHost {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
}

interface HangGuest {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  rsvp: RsvpStatus | 'invited';
}

interface PlanItem {
  id: string;
  icon: string;
  label: string;
  time?: string;
  location?: string;
}

interface HangMessage {
  id: string;
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  text: string;
  createdAt: string;
}

interface HangData {
  id: string;
  eventId: string;
  title: string;
  coverImageUrl?: string;
  date: string;
  vibe?: string;
  host: HangHost;
  plan: PlanItem[];
  guests: HangGuest[];
  messages: HangMessage[];
  userRsvp?: RsvpStatus | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d
    .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    .toUpperCase();
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const h = d.getHours();
  const m = d.getMinutes();
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, '0')} ${suffix}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HangPage() {
  const goBack = useSafeBack();
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { user } = useSession();

  const id = String(eventId || '');

  const [hang, setHang] = useState<HangData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [rsvp, setRsvp] = useState<RsvpStatus | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const styles = useThemedStyles((t) => ({
    container: { flex: 1, backgroundColor: t.colors.bg },
    center: { flex: 1, backgroundColor: t.colors.bg, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
    errorText: { color: t.colors.mute, fontSize: 14, textAlign: 'center' },

    // Hero
    hero: { height: 220, justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: 20 },
    backBtn: {
      position: 'absolute',
      left: 16,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.16)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    },
    heroPill: {
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: t.radius.full,
      backgroundColor: 'rgba(255,255,255,0.18)',
      overflow: 'hidden',
      marginBottom: 8,
    },
    heroPillText: { fontFamily: t.fontFamilies.mono, fontSize: 9.5, fontWeight: '600', letterSpacing: 1.5, color: '#FFFFFF', textTransform: 'uppercase' },
    heroTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },

    // Host
    hostRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: t.colors.hairline,
    },
    hostName: { fontSize: 14, fontWeight: '700', color: t.colors.fg, marginTop: 2 },

    // RSVP
    rsvpRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 10,
      borderBottomWidth: 1,
      borderBottomColor: t.colors.hairline,
    },
    rsvpBtn: { flex: 1, borderRadius: t.radius.md, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center' },
    rsvpBtnActive: { backgroundColor: t.colors.inverseBg },
    rsvpBtnInactive: { backgroundColor: t.colors.card, borderWidth: 1, borderColor: t.colors.hairline },
    rsvpText: { fontSize: 14, fontWeight: '600' },

    // Sections
    section: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 },

    // Vibe
    vibeBox: {
      marginTop: 10,
      backgroundColor: t.colors.card,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      borderRadius: t.radius.md,
      padding: 14,
    },
    vibeText: { fontSize: 14, color: t.colors.fg, lineHeight: 20 },

    // Plan
    planItem: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
    planIcon: {
      width: 36,
      height: 36,
      borderRadius: t.radius.sm,
      backgroundColor: t.colors.card2,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    planLabel: { fontSize: 14, fontWeight: '600', color: t.colors.fg },
    planMeta: { fontFamily: t.fontFamilies.mono, fontSize: 12, color: t.colors.muteSoft, marginTop: 2 },

    // Guests
    guestChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    guestChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.colors.card,
      borderRadius: t.radius.full,
      paddingRight: 12,
      paddingLeft: 3,
      paddingVertical: 3,
      gap: 6,
      borderWidth: 1,
      borderColor: t.colors.line,
    },
    guestName: { fontSize: 12, fontWeight: '600', color: t.colors.fg },

    // Messages
    msgRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: t.colors.card,
      marginHorizontal: 16,
      marginBottom: 2,
      borderRadius: t.radius.sm,
    },
    msgUser: { fontSize: 12, fontWeight: '700', color: t.colors.fg },
    msgTime: { fontFamily: t.fontFamilies.mono, fontSize: 9.5, color: t.colors.muteSoft },
    msgText: { fontSize: 13.5, color: t.colors.textSoft, lineHeight: 19, marginTop: 2 },

    // Composer
    composer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: 16,
      paddingTop: 10,
      backgroundColor: t.colors.card,
      borderTopWidth: 1,
      borderTopColor: t.colors.hairline,
      gap: 10,
    },
    composerInput: {
      flex: 1,
      backgroundColor: t.colors.card2,
      borderRadius: t.radius.full,
      paddingHorizontal: 16,
      paddingVertical: 8,
      minHeight: 38,
      justifyContent: 'center',
    },
    composerText: { color: t.colors.fg, fontSize: 14, maxHeight: 100 },
    sendBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  }));

  // ── Fetch hang data ─────────────────────────────────────────────────
  const fetchHang = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await apiClient.get(`/events/${id}/hang`);
      const data: HangData = res.data;
      setHang(data);
      setRsvp(data.userRsvp ?? null);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to load hang');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchHang();
  }, [fetchHang]);

  // ── RSVP ────────────────────────────────────────────────────────────
  const handleRsvp = async (status: RsvpStatus) => {
    if (rsvp === status) return;
    const prev = rsvp;
    setRsvp(status);
    try {
      await apiClient.post(`/events/${id}/hang/rsvp`, { status });
    } catch {
      setRsvp(prev);
    }
  };

  // ── Send message ────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = messageText.trim();
    if (!text || sending) return;
    setSending(true);
    setMessageText('');
    try {
      const res = await apiClient.post(`/events/${id}/hang/messages`, { text });
      const msg: HangMessage = res.data;
      setHang((prev) => (prev ? { ...prev, messages: [...prev.messages, msg] } : prev));
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      setMessageText(text);
    } finally {
      setSending(false);
    }
  };

  // ── Guest counts ────────────────────────────────────────────────────
  const guestCounts = {
    going: hang?.guests.filter((g) => g.rsvp === 'going').length ?? 0,
    maybe: hang?.guests.filter((g) => g.rsvp === 'maybe').length ?? 0,
    noReply: hang?.guests.filter((g) => g.rsvp === 'invited').length ?? 0,
  };

  const isHost = hang?.host.id === user?.id;

  // ── Loading / Error ─────────────────────────────────────────────────
  if (loading && !hang) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={tokens.colors.mute} />
      </View>
    );
  }

  if (error || !hang) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorText}>{error ?? 'Hang not found'}</Text>
        <SpringPressable onPress={goBack} haptic="light" style={{ marginTop: 16 }}>
          <Text style={{ color: tokens.colors.accent, fontSize: 14, fontWeight: '600' }}>Go Back</Text>
        </SpringPressable>
      </View>
    );
  }

  // ── Render helpers ──────────────────────────────────────────────────

  const renderHero = () => (
    <View style={styles.hero}>
      {hang.coverImageUrl ? (
        <Image source={{ uri: hang.coverImageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <LinearGradient
          colors={[tokens.colors.card2, tokens.colors.card]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      {/* Gradient scrim */}
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={StyleSheet.absoluteFill} />
      {/* Back button */}
      <SpringPressable
        onPress={goBack}
        haptic="light"
        style={[styles.backBtn, { top: insets.top + 8 }]}
        accessibilityRole="button"
      >
        <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
      </SpringPressable>
      {/* Pill label */}
      <View style={styles.heroPill}>
        <Text style={styles.heroPillText}>HANG{' · '}{formatDate(hang.date)}</Text>
      </View>
      {/* Title */}
      <Text style={styles.heroTitle}>{hang.title}</Text>
    </View>
  );

  const renderHostRow = () => (
    <View style={styles.hostRow}>
      <Avatar uri={hang.host.avatarUrl} name={hang.host.displayName ?? hang.host.username} size={32} />
      <View style={{ marginLeft: 10 }}>
        <MonoLabel size={9.5} color={tokens.colors.muteSoft}>HOSTED BY</MonoLabel>
        <Text style={styles.hostName}>{hang.host.displayName ?? hang.host.username}</Text>
      </View>
    </View>
  );

  const renderRsvpButtons = () => {
    if (isHost) return null;
    const buttons: { status: RsvpStatus; label: string }[] = [
      { status: 'going', label: "✓ I'm in" },
      { status: 'maybe', label: '? Maybe' },
      { status: 'cant', label: "✗ Can't" },
    ];
    return (
      <View style={styles.rsvpRow}>
        {buttons.map((b) => {
          const active = rsvp === b.status;
          return (
            <SpringPressable
              key={b.status}
              onPress={() => handleRsvp(b.status)}
              haptic="light"
              style={[styles.rsvpBtn, active ? styles.rsvpBtnActive : styles.rsvpBtnInactive]}
            >
              <Text style={[styles.rsvpText, { color: active ? tokens.colors.inverseFg : tokens.colors.fg }]}>
                {b.label}
              </Text>
            </SpringPressable>
          );
        })}
      </View>
    );
  };

  const renderVibe = () => {
    if (!hang.vibe) return null;
    return (
      <View style={styles.section}>
        <MonoLabel size={10} color={tokens.colors.mute}>THE VIBE</MonoLabel>
        <View style={styles.vibeBox}>
          <Text style={styles.vibeText}>{hang.vibe}</Text>
        </View>
      </View>
    );
  };

  const renderPlan = () => {
    if (!hang.plan?.length) return null;
    return (
      <View style={styles.section}>
        <MonoLabel size={10} color={tokens.colors.mute}>THE PLAN</MonoLabel>
        {hang.plan.map((item) => (
          <View key={item.id} style={styles.planItem}>
            <View style={styles.planIcon}>
              <Text style={{ fontSize: 18 }}>{item.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.planLabel}>{item.label}</Text>
              {item.time ? <Text style={styles.planMeta}>{item.time}</Text> : null}
              {item.location ? <Text style={styles.planMeta}>{item.location}</Text> : null}
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderGuestList = () => (
    <View style={styles.section}>
      <MonoLabel size={10} color={tokens.colors.mute}>
        {`${guestCounts.going} GOING · ${guestCounts.maybe} MAYBE · ${guestCounts.noReply} NO REPLY`}
      </MonoLabel>
      <View style={styles.guestChips}>
        {hang.guests
          .filter((g) => g.rsvp === 'going')
          .map((g) => (
            <View key={g.id} style={styles.guestChip}>
              <Avatar uri={g.avatarUrl} name={g.displayName ?? g.username} size={26} />
              <Text style={styles.guestName}>{g.displayName ?? g.username}</Text>
            </View>
          ))}
      </View>
      {guestCounts.maybe > 0 && (
        <View style={[styles.guestChips, { marginTop: 8 }]}>
          {hang.guests
            .filter((g) => g.rsvp === 'maybe')
            .map((g) => (
              <View key={g.id} style={[styles.guestChip, { borderColor: tokens.colors.hairline }]}>
                <Avatar uri={g.avatarUrl} name={g.displayName ?? g.username} size={26} />
                <Text style={[styles.guestName, { color: tokens.colors.mute }]}>
                  {g.displayName ?? g.username}
                </Text>
              </View>
            ))}
        </View>
      )}
    </View>
  );

  const renderMessageItem = ({ item }: { item: HangMessage }) => (
    <View style={styles.msgRow}>
      <Avatar uri={item.avatarUrl} name={item.displayName ?? item.username} size={28} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.msgUser}>{item.displayName ?? item.username}</Text>
          <Text style={styles.msgTime}>{formatTime(item.createdAt)}</Text>
        </View>
        <Text style={styles.msgText}>{item.text}</Text>
      </View>
    </View>
  );

  const headerComponent = () => (
    <View>
      {renderHero()}
      {renderHostRow()}
      {renderRsvpButtons()}
      {renderVibe()}
      {renderPlan()}
      {renderGuestList()}
      {/* Chat label */}
      <View style={[styles.section, { marginBottom: 4 }]}>
        <MonoLabel size={10} color={tokens.colors.mute}>CHAT</MonoLabel>
      </View>
    </View>
  );

  const canSend = messageText.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <FlatList
        ref={flatListRef}
        data={hang.messages}
        keyExtractor={(m) => m.id}
        renderItem={renderMessageItem}
        ListHeaderComponent={headerComponent}
        contentContainerStyle={{ paddingBottom: 8 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Composer */}
      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.composerInput}>
          <TextInput
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Message..."
            placeholderTextColor={tokens.colors.muteSoft}
            style={styles.composerText}
            multiline
            maxLength={2000}
          />
        </View>
        <SpringPressable
          onPress={handleSend}
          disabled={!canSend || sending}
          haptic="light"
          style={[styles.sendBtn, { backgroundColor: canSend ? tokens.colors.inverseBg : tokens.colors.card2 }]}
        >
          {sending ? (
            <ActivityIndicator size="small" color={tokens.colors.inverseFg} />
          ) : (
            <Ionicons name="send" size={16} color={canSend ? tokens.colors.inverseFg : tokens.colors.muteSoft} />
          )}
        </SpringPressable>
      </View>
    </KeyboardAvoidingView>
  );
}
