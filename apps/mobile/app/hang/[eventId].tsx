import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '../../components/ui/Avatar';
import { MonoLabel } from '../../components/ui/MonoLabel';
import { useSession } from '../../hooks/useSession';
import { useSafeBack } from '../../lib/navigation/safeNavigation';
import { apiClient } from '../../lib/api/client';
import { colors, accentSets, radius, spacing, fonts } from '../../lib/theme';

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

const monoFont = Platform.select({ ios: 'Menlo', android: 'monospace' }) ?? 'monospace';
const accent = accentSets.cyan;

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
  const router = useRouter();
  const goBack = useSafeBack();
  const insets = useSafeAreaInsets();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { user, profile } = useSession();

  const id = String(eventId || '');

  const [hang, setHang] = useState<HangData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [rsvp, setRsvp] = useState<RsvpStatus | null>(null);
  const flatListRef = useRef<FlatList>(null);

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
        <ActivityIndicator size="large" color={accent.hex} />
      </View>
    );
  }

  if (error || !hang) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorText}>{error ?? 'Hang not found'}</Text>
        <Pressable onPress={goBack} style={{ marginTop: 16 }}>
          <Text style={{ color: accent.hex, fontSize: 14, fontWeight: '600' }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  // ── Render helpers ──────────────────────────────────────────────────

  const renderHero = () => (
    <View style={styles.hero}>
      {hang.coverImageUrl ? (
        <Image source={{ uri: hang.coverImageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <LinearGradient
          colors={[accentSets.purple.hex, accentSets.cyan.hex]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      {/* Gradient scrim */}
      <LinearGradient
        colors={['transparent', 'rgba(11,11,20,0.85)']}
        style={StyleSheet.absoluteFill}
      />
      {/* Back button */}
      <Pressable
        onPress={goBack}
        style={[styles.backBtn, { top: insets.top + 8 }]}
        accessibilityRole="button"
      >
        <Ionicons name="arrow-back" size={20} color={colors.textHi} />
      </Pressable>
      {/* Pill label */}
      <View style={styles.heroPill}>
        <Text style={styles.heroPillText}>HANG{' \u00B7 '}{formatDate(hang.date)}</Text>
      </View>
      {/* Title */}
      <Text style={styles.heroTitle}>{hang.title}</Text>
    </View>
  );

  const renderHostRow = () => (
    <View style={styles.hostRow}>
      <Avatar uri={hang.host.avatarUrl} name={hang.host.displayName ?? hang.host.username} size={32} />
      <View style={{ marginLeft: 10 }}>
        <MonoLabel size={9.5} color={colors.textLo}>HOSTED BY</MonoLabel>
        <Text style={styles.hostName}>{hang.host.displayName ?? hang.host.username}</Text>
      </View>
    </View>
  );

  const renderRsvpButtons = () => {
    if (isHost) return null;
    const buttons: { status: RsvpStatus; label: string }[] = [
      { status: 'going', label: "\u2713 I'm in" },
      { status: 'maybe', label: '? Maybe' },
      { status: 'cant', label: "\u2717 Can't" },
    ];
    return (
      <View style={styles.rsvpRow}>
        {buttons.map((b) => {
          const active = rsvp === b.status;
          return (
            <Pressable
              key={b.status}
              onPress={() => handleRsvp(b.status)}
              style={[
                styles.rsvpBtn,
                active ? styles.rsvpBtnActive : styles.rsvpBtnInactive,
              ]}
            >
              <Text
                style={[
                  styles.rsvpText,
                  { color: active ? '#FFFFFF' : colors.textHi },
                ]}
              >
                {b.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  };

  const renderVibe = () => {
    if (!hang.vibe) return null;
    return (
      <View style={styles.section}>
        <MonoLabel size={10} color={accent.hex}>THE VIBE</MonoLabel>
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
        <MonoLabel size={10} color={accent.hex}>THE PLAN</MonoLabel>
        {hang.plan.map((item) => (
          <View key={item.id} style={styles.planItem}>
            <View style={styles.planIcon}>
              <Text style={{ fontSize: 18 }}>{item.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.planLabel}>{item.label}</Text>
              {item.time ? (
                <Text style={styles.planMeta}>{item.time}</Text>
              ) : null}
              {item.location ? (
                <Text style={styles.planMeta}>{item.location}</Text>
              ) : null}
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderGuestList = () => (
    <View style={styles.section}>
      <MonoLabel size={10} color={accent.hex}>
        {`${guestCounts.going} GOING \u00B7 ${guestCounts.maybe} MAYBE \u00B7 ${guestCounts.noReply} NO REPLY`}
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
              <View key={g.id} style={[styles.guestChip, { borderColor: colors.hairline }]}>
                <Avatar uri={g.avatarUrl} name={g.displayName ?? g.username} size={26} />
                <Text style={[styles.guestName, { color: colors.textMid }]}>
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
        <MonoLabel size={10} color={accent.hex}>CHAT</MonoLabel>
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
            placeholderTextColor={colors.textMuted}
            style={styles.composerText}
            multiline
            maxLength={2000}
          />
        </View>
        <Pressable
          onPress={handleSend}
          disabled={!canSend || sending}
          style={[
            styles.sendBtn,
            { backgroundColor: canSend ? accent.hex : colors.elevated },
          ]}
        >
          {sending ? (
            <ActivityIndicator size="small" color={colors.ink} />
          ) : (
            <Ionicons name="send" size={16} color={canSend ? colors.ink : colors.textMuted} />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
    height: 220,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 20,
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
  heroPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
    marginBottom: 8,
  },
  heroPillText: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: colors.textHi,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Host
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  hostName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textHi,
    marginTop: 2,
  },

  // RSVP
  rsvpRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  rsvpBtn: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  rsvpBtnActive: {
    backgroundColor: accent.hex,
  },
  rsvpBtnInactive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  rsvpText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Sections
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },

  // Vibe
  vibeBox: {
    marginTop: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.md,
    padding: 14,
  },
  vibeText: {
    fontSize: 14,
    color: colors.textHi,
    lineHeight: 20,
  },

  // Plan
  planItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  planIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: accent.soft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  planLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textHi,
  },
  planMeta: {
    fontSize: 12,
    color: colors.textLo,
    marginTop: 2,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },

  // Guests
  guestChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  guestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingRight: 12,
    paddingLeft: 3,
    paddingVertical: 3,
    gap: 6,
    borderWidth: 1,
    borderColor: accent.line,
  },
  guestName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textHi,
  },

  // Messages
  msgRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginBottom: 2,
    borderRadius: radius.sm,
  },
  msgUser: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textHi,
  },
  msgTime: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: 9.5,
    color: colors.textLo,
  },
  msgText: {
    fontSize: 13.5,
    color: colors.textMid,
    lineHeight: 19,
    marginTop: 2,
  },

  // Composer
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    gap: 10,
  },
  composerInput: {
    flex: 1,
    backgroundColor: colors.elevated,
    borderRadius: radius.full,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 38,
    justifyContent: 'center',
  },
  composerText: {
    color: colors.textHi,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
