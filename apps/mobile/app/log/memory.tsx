// LOG FLOW · STEP 5 — MAKE IT A MEMORY. Turns a scored log into a shared
// memory. Restructured for Phase A (A22 / A11 / A12):
//   · THE SHOW (required) — the media that IS the post; ≥1 item gates "Post".
//   · YOU + YOUR PEOPLE (optional) — a second, visually-separate add-grid.
//   · Caption (A11: photos before caption).
//   · One collapsed "Seat & venue ratings" accordion (all optional, unchanged).
//   · Visibility chips + a live plain-language exposure line (A12).
// "Post memory" batches the log edits into a single PATCH (with share:true) and
// fires venue rating/tip as best-effort side calls; "Skip" leaves the log
// logged-but-unshared.
//
// Route contract in: { logId, eventId?, eventName?, venueId?, venueName?,
//   section?, row?, seat? }. venueId/venueName and the seat/caption prefill
// self-resolve from GET /events/:id when not passed.

import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { clearMemoryDraft } from '../../components/log/memoryDraft';
import { FlowHeader } from '../../components/log/FlowHeader';
import { LogField } from '../../components/log/LogField';
import { CoAuthorSheet, type CoAuthorPerson } from '../../components/log/memory/CoAuthorSheet';
import { MemoryCard } from '../../components/log/memory/MemoryCard';
import { MemoryChip } from '../../components/log/memory/MemoryChip';
import { PhotoStrip, type PhotoItem } from '../../components/log/memory/PhotoStrip';
import { StarRow } from '../../components/log/memory/StarRow';
import { XpChip } from '../../components/log/memory/XpChip';
import { Avatar } from '../../components/ui/Avatar';
import { PillButton } from '../../components/ui/PillButton';
import { SpringPressable } from '../../components/ui/SpringPressable';
import { useSession } from '../../hooks/useSession';
import { useUserStats } from '../../hooks/useUserStats';
import { getErrorMessage } from '../../lib/api/errorUtils';
import { getEvent } from '../../lib/api/events';
import { inviteCoAuthors, updateLog, uploadLogPhoto } from '../../lib/api/logs';
import { submitSeatRating, submitVenueRatings, submitVenueTip, uploadSeatView } from '../../lib/api/venues';
import { haptics } from '../../lib/motion';
import { useTheme } from '../../lib/theme-context';
import type { EventDetails } from '../../types/event';
import type { VenueRatingsSubmission } from '../../types/venue';

type Visibility = 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
// Which add-grid a media item belongs to. Both upload through the same API;
// the split is purely presentational (A22).
type MediaSlot = 'show' | 'people';

const MAX_PHOTOS = 5;

const VENUE_TAGS = [
  { key: 'sound', label: 'Sound' },
  { key: 'sightlines', label: 'Sightlines' },
  { key: 'staff', label: 'Staff' },
  { key: 'parking', label: 'Parking' },
  { key: 'exit', label: 'Easy exit' },
] as const;

// Chip → venue-rating category. parking + easy exit both fold into `access`,
// the only logistics column the ratings API exposes (see final report).
const TAG_TO_CATEGORY: Record<string, keyof VenueRatingsSubmission> = {
  sound: 'sound',
  sightlines: 'sightlines',
  staff: 'staff',
  parking: 'access',
  exit: 'access',
};

const VIS_OPTIONS: { value: Visibility; label: string }[] = [
  { value: 'PUBLIC', label: '🌐 Public' },
  { value: 'FRIENDS', label: '👥 Friends' },
  { value: 'PRIVATE', label: '🔒 Private' },
];

function guessType(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic') return 'image/heic';
  return 'image/jpeg';
}

export default function LogMemory() {
  const router = useRouter();
  const { tokens } = useTheme();
  const c = tokens.colors;
  const pad = tokens.density.pad;

  const params = useLocalSearchParams<{
    logId?: string;
    eventId?: string;
    eventName?: string;
    venueId?: string;
    venueName?: string;
    section?: string;
    row?: string;
    seat?: string;
  }>();
  const logId = params.logId ? String(params.logId) : '';
  const eventId = params.eventId ? String(params.eventId) : '';
  const eventName = params.eventName ? String(params.eventName) : '';

  // Opening this screen means the memory is being handled now — retire any
  // pending "save for morning" draft (and its 10:00 reminder) for this log.
  useEffect(() => {
    if (logId) void clearMemoryDraft(logId);
  }, [logId]);

  // Friend count for the Friends-visibility exposure line (A12). Sourced from
  // the lightweight stats endpoint; the line degrades to "your friends" until
  // it resolves (or if it never does).
  const { user } = useSession();
  const { stats } = useUserStats(user?.id ?? '');
  const friendCount = stats?.followers ?? null;

  // Event fetch — fills venue identity + seat/caption prefill when the caller
  // didn't thread them. Never blocks the screen; fields just populate.
  const [event, setEvent] = useState<EventDetails | null>(null);
  useEffect(() => {
    if (!eventId) return;
    let alive = true;
    getEvent(eventId)
      .then((e) => {
        if (alive) setEvent(e);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [eventId]);

  const venueId = params.venueId ? String(params.venueId) : event?.venue?.id ?? '';
  const venueName = params.venueName ? String(params.venueName) : event?.venue?.name ?? '';

  // ── Editable state ──
  const [section, setSection] = useState(params.section ? String(params.section) : '');
  const [row, setRow] = useState(params.row ? String(params.row) : '');
  const [seat, setSeat] = useState(params.seat ? String(params.seat) : '');
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('PUBLIC');

  const [seatStars, setSeatStars] = useState(0);
  // Seat-view photo — the "snap the view from your seat" capture. When present,
  // it uploads via uploadSeatView carrying seatStars as the rating; without a
  // photo the stars fall back to the photo-less submitSeatRating call.
  const [seatPhoto, setSeatPhoto] = useState<{ uri: string; mimeType?: string; fileName?: string } | null>(null);

  // POST TOGETHER — co-authors invited on Post (optional, never blocks).
  const [coAuthors, setCoAuthors] = useState<CoAuthorPerson[]>([]);
  const [coAuthorSheetOpen, setCoAuthorSheetOpen] = useState(false);

  const [venueStars, setVenueStars] = useState(0);
  const [venueTags, setVenueTags] = useState<string[]>([]);
  const [venueTip, setVenueTip] = useState('');

  // Two separate add-grids (A22). Both upload via the same endpoint.
  const [showPhotos, setShowPhotos] = useState<PhotoItem[]>([]);
  const [peoplePhotos, setPeoplePhotos] = useState<PhotoItem[]>([]);
  const [xpEarned, setXpEarned] = useState<number | null>(null);

  const [ratingsOpen, setRatingsOpen] = useState(false);

  const [posting, setPosting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Prefill from the fetched log, once — only fields the user hasn't set.
  const prefilled = useRef(false);
  useEffect(() => {
    if (!event || prefilled.current) return;
    prefilled.current = true;
    const log = event.userLog;
    if (log) {
      setSection((s) => s || log.section || '');
      setRow((r) => r || log.row || '');
      setSeat((s) => s || log.seat || '');
      setCaption((n) => n || log.note || '');
    }
  }, [event]);

  const setterFor = (slot: MediaSlot) => (slot === 'show' ? setShowPhotos : setPeoplePhotos);
  const listFor = (slot: MediaSlot) => (slot === 'show' ? showPhotos : peoplePhotos);

  const uploading =
    showPhotos.some((p) => p.status === 'uploading') || peoplePhotos.some((p) => p.status === 'uploading');
  // A22 validation: the post requires at least one uploaded item in THE SHOW.
  const showHasMedia = showPhotos.some((p) => p.status === 'done');

  // ── Photos ──
  const uploadOne = async (slot: MediaSlot, item: PhotoItem) => {
    if (!logId) return;
    const setPhotos = setterFor(slot);
    try {
      const name = item.fileName || item.uri.split('/').pop() || 'photo.jpg';
      const type = item.mimeType || guessType(name);
      const res = await uploadLogPhoto(logId, { uri: item.uri, type, name });
      setPhotos((prev) => prev.map((p) => (p.key === item.key ? { ...p, status: 'done', remoteId: res.id } : p)));
      if (res.xpGain > 0) {
        setXpEarned(res.xpGain);
        haptics.success();
      }
    } catch {
      setPhotos((prev) => prev.map((p) => (p.key === item.key ? { ...p, status: 'error' } : p)));
    }
  };

  const pickPhotos = async (slot: MediaSlot) => {
    const remaining = MAX_PHOTOS - listFor(slot).length;
    if (remaining <= 0 || !logId) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.85,
    });
    if (res.canceled) return;
    const additions: PhotoItem[] = (res.assets ?? []).slice(0, remaining).map((a, i) => ({
      key: `${Date.now()}-${i}-${Math.random().toString(36).slice(2)}`,
      uri: a.uri,
      status: 'uploading',
      mimeType: a.mimeType,
      fileName: a.fileName ?? undefined,
    }));
    if (!additions.length) return;
    setterFor(slot)((prev) => [...prev, ...additions]);
    additions.forEach((item) => void uploadOne(slot, item));
  };

  const retryPhoto = (slot: MediaSlot, key: string) => {
    const item = listFor(slot).find((p) => p.key === key);
    if (!item) return;
    setterFor(slot)((prev) => prev.map((p) => (p.key === key ? { ...p, status: 'uploading' } : p)));
    void uploadOne(slot, { ...item, status: 'uploading' });
  };

  const dismissPhoto = (slot: MediaSlot, key: string) =>
    setterFor(slot)((prev) => prev.filter((p) => p.key !== key));

  // ── Seat-view photo (single) ──
  const pickSeatPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      quality: 0.85,
    });
    if (res.canceled) return;
    const a = res.assets?.[0];
    if (!a) return;
    haptics.light();
    setSeatPhoto({ uri: a.uri, mimeType: a.mimeType, fileName: a.fileName ?? undefined });
  };

  // ── Venue helpers ──
  const toggleTag = (key: string) =>
    setVenueTags((prev) => (prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]));

  const buildVenueRatings = (): VenueRatingsSubmission => {
    const ratings: VenueRatingsSubmission = {};
    if (venueStars <= 0) return ratings;
    // Endorsed tags get the overall stars; with no tags, apply as a blanket
    // overall across every column so the rating isn't silently dropped.
    const cats: (keyof VenueRatingsSubmission)[] = venueTags.length
      ? (venueTags.map((t) => TAG_TO_CATEGORY[t]).filter(Boolean) as (keyof VenueRatingsSubmission)[])
      : ['sound', 'sightlines', 'drinks', 'staff', 'access'];
    for (const cat of cats) ratings[cat] = venueStars;
    return ratings;
  };

  // Live, plain-language exposure line (A12).
  const exposureLine = (v: Visibility): string => {
    if (v === 'PUBLIC') return 'Right now: anyone on Sticket can see this.';
    if (v === 'PRIVATE') return 'Only you.';
    return typeof friendCount === 'number'
      ? `Right now: your ${friendCount} friends can see this.`
      : 'Right now: your friends can see this.';
  };

  const monoLineStyle = {
    fontFamily: tokens.fontFamilies.mono,
    fontSize: 11.5,
    fontWeight: '400' as const,
    color: c.mute,
    lineHeight: 16,
  };

  // ── Submit / skip ──
  const post = async () => {
    if (!logId || posting || uploading || !showHasMedia) return;
    setPosting(true);
    setErrorMsg(null);
    try {
      // One batched PATCH applies every log edit and shares it.
      await updateLog(logId, {
        section: section.trim() || null,
        row: row.trim() || null,
        seat: seat.trim() || null,
        note: caption.trim() || null,
        visibility,
        share: true,
      });

      // Venue rating + tip + seat rating + co-author invites: best-effort,
      // never block the (already shared) post.
      const tasks: Promise<unknown>[] = [];
      const ratings = buildVenueRatings();
      if (venueId && Object.keys(ratings).length) tasks.push(submitVenueRatings(venueId, ratings));
      if (venueId && venueTip.trim()) {
        tasks.push(submitVenueTip(venueId, { text: venueTip.trim(), category: 'general' }));
      }
      // Seat view: a photo carries the stars as its rating (uploadSeatView);
      // stars alone fall back to the photo-less submitSeatRating call.
      if (venueId && section.trim()) {
        if (seatPhoto) {
          tasks.push(
            uploadSeatView(venueId, {
              photo: { uri: seatPhoto.uri, type: seatPhoto.mimeType, name: seatPhoto.fileName },
              section: section.trim(),
              row: row.trim() || undefined,
              rating: seatStars > 0 ? seatStars : undefined,
              eventId: eventId || undefined,
            })
          );
        } else if (seatStars > 0) {
          tasks.push(
            submitSeatRating(venueId, {
              section: section.trim(),
              row: row.trim() || undefined,
              rating: seatStars,
              eventId: eventId || undefined,
            })
          );
        }
      }
      // POST TOGETHER — invite the chosen co-authors on this log.
      if (coAuthors.length) {
        tasks.push(inviteCoAuthors(logId, coAuthors.map((p) => p.id)));
      }
      if (tasks.length) await Promise.allSettled(tasks);

      haptics.success();
      router.replace('/(tabs)/you');
    } catch (e) {
      setErrorMsg(getErrorMessage(e));
      setPosting(false);
    }
  };

  const skip = () => {
    haptics.light();
    router.replace('/(tabs)/you');
  };

  const busy = posting || uploading;
  const canPost = Boolean(logId) && !busy && showHasMedia;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <FlowHeader icon="close" label={eventName || 'Memory'} onPress={skip} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: pad, paddingBottom: 40, gap: 16 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <View style={{ paddingTop: 6, paddingBottom: 2, gap: 6 }}>
            <Text style={{ color: c.fg, fontSize: 30, fontWeight: '800', letterSpacing: -0.5 }}>Make it a memory</Text>
            <Text style={{ color: c.mute, fontSize: 15, fontWeight: '400' }}>
              Lead with the show. Everything below it is optional.
            </Text>
          </View>

          {/* 1 · THE SHOW — required media (this IS the post) */}
          <MemoryCard
            eyebrow="The show"
            hint="At least one photo or video from the show. This is the post."
            right={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {xpEarned ? <XpChip amount={xpEarned} /> : null}
                <SectionBadge text="Required" required />
              </View>
            }
          >
            <PhotoStrip
              photos={showPhotos}
              canAdd={showPhotos.length < MAX_PHOTOS && Boolean(logId)}
              onAdd={() => pickPhotos('show')}
              onRetry={(key) => retryPhoto('show', key)}
              onDismiss={(key) => dismissPhoto('show', key)}
            />
          </MemoryCard>

          {/* 2 · YOU + YOUR PEOPLE — optional media */}
          <MemoryCard
            eyebrow="You + your people"
            hint="Faces are never required. Skipping changes nothing."
            right={<SectionBadge text="Optional" required={false} />}
          >
            <PhotoStrip
              photos={peoplePhotos}
              canAdd={peoplePhotos.length < MAX_PHOTOS && Boolean(logId)}
              onAdd={() => pickPhotos('people')}
              onRetry={(key) => retryPhoto('people', key)}
              onDismiss={(key) => dismissPhoto('people', key)}
            />
          </MemoryCard>

          {/* 2b · POST TOGETHER — co-authors (optional) */}
          <MemoryCard
            eyebrow="Post together"
            hint="Invite co-authors — this memory lands on their timeline too."
            right={<SectionBadge text="Optional" required={false} />}
          >
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {coAuthors.map((p) => (
                <SpringPressable
                  key={p.id}
                  onPress={() => {
                    haptics.light();
                    setCoAuthors((prev) => prev.filter((x) => x.id !== p.id));
                  }}
                  haptic="none"
                  accessibilityRole="button"
                  accessibilityLabel={`Remove @${p.username}`}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    height: 34,
                    paddingLeft: 5,
                    paddingRight: 10,
                    borderRadius: 999,
                    backgroundColor: c.card2,
                  }}
                >
                  <Avatar uri={p.avatarUrl} name={p.displayName || p.username} size={24} />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: c.fg }}>@{p.username}</Text>
                  <Ionicons name="close" size={13} color={c.mute} />
                </SpringPressable>
              ))}

              <SpringPressable
                onPress={() => {
                  haptics.light();
                  setCoAuthorSheetOpen(true);
                }}
                haptic="none"
                accessibilityRole="button"
                accessibilityLabel="Invite co-authors"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  height: 34,
                  paddingHorizontal: 14,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: c.line,
                  borderStyle: 'dashed',
                  backgroundColor: c.card2,
                }}
              >
                <Ionicons name="person-add-outline" size={15} color={c.mute} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: c.mute }}>
                  {coAuthors.length ? 'Add more' : 'Add people'}
                </Text>
              </SpringPressable>
            </View>
          </MemoryCard>

          {/* 3 · Caption (A11: photos before caption) */}
          <MemoryCard eyebrow="Caption" hint="One line you’ll want to read back later.">
            <LogField
              placeholder="Say something about the night…"
              value={caption}
              onChangeText={setCaption}
              multiline
              numberOfLines={3}
              maxLength={280}
              style={{ height: 88, paddingTop: 12, paddingBottom: 12, textAlignVertical: 'top' }}
            />
          </MemoryCard>

          {/* 4 · Seat & venue ratings — one collapsed accordion */}
          <View
            style={{
              backgroundColor: c.card,
              borderRadius: tokens.radius.xl,
              borderWidth: 1,
              borderColor: c.hairline,
              overflow: 'hidden',
            }}
          >
            <SpringPressable
              onPress={() => {
                // light tick comes from SpringPressable's default haptic
                setRatingsOpen((o) => !o);
              }}
              accessibilityRole="button"
              accessibilityState={{ expanded: ratingsOpen }}
              accessibilityLabel="Seat and venue ratings"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                padding: tokens.density.cardPad,
              }}
            >
              <View style={{ flex: 1, gap: 3 }}>
                <Text
                  style={{
                    fontFamily: tokens.fontFamilies.mono,
                    fontSize: 10.5,
                    fontWeight: '600',
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                    color: c.mute,
                  }}
                >
                  Seat & venue ratings
                </Text>
                <Text style={{ color: c.muteSoft, fontSize: 12.5, fontWeight: '400' }}>
                  Optional · helps people pick seats
                </Text>
              </View>
              <Ionicons name={ratingsOpen ? 'chevron-up' : 'chevron-down'} size={18} color={c.mute} />
            </SpringPressable>

            {ratingsOpen ? (
              <View
                style={{
                  paddingHorizontal: tokens.density.cardPad,
                  paddingBottom: tokens.density.cardPad,
                  gap: 20,
                }}
              >
                {/* Seat */}
                <View style={{ gap: 12 }}>
                  <Text
                    style={{
                      fontFamily: tokens.fontFamilies.mono,
                      fontSize: 10,
                      fontWeight: '600',
                      letterSpacing: 1.5,
                      textTransform: 'uppercase',
                      color: c.mute,
                    }}
                  >
                    Seat
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <LogField compact mono placeholder="Section" value={section} onChangeText={setSection} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <LogField compact mono placeholder="Row" value={row} onChangeText={setRow} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <LogField compact mono placeholder="Seat" value={seat} onChangeText={setSeat} />
                    </View>
                  </View>
                  <View style={{ gap: 8, marginTop: 2 }}>
                    <Text
                      style={{
                        fontFamily: tokens.fontFamilies.mono,
                        fontSize: 10,
                        fontWeight: '600',
                        letterSpacing: 1.5,
                        textTransform: 'uppercase',
                        color: c.mute,
                      }}
                    >
                      How was the view · helps people pick seats
                    </Text>
                    <StarRow value={seatStars} onChange={setSeatStars} disabled={!section.trim()} size={26} />
                    {!section.trim() ? (
                      <Text style={{ color: c.muteSoft, fontSize: 11.5, fontWeight: '400' }}>
                        add your section to rate the seat
                      </Text>
                    ) : null}
                  </View>

                  {/* Snap the view from your seat — pairs the photo with the stars */}
                  <View style={{ gap: 8, marginTop: 2 }}>
                    {seatPhoto ? (
                      <View
                        style={{
                          width: 96,
                          height: 96,
                          borderRadius: tokens.radius.md,
                          overflow: 'hidden',
                          backgroundColor: c.card2,
                        }}
                      >
                        <Image source={{ uri: seatPhoto.uri }} style={{ width: '100%', height: '100%' }} />
                        <SpringPressable
                          onPress={() => {
                            haptics.light();
                            setSeatPhoto(null);
                          }}
                          haptic="none"
                          accessibilityRole="button"
                          accessibilityLabel="Remove seat photo"
                          style={{
                            position: 'absolute',
                            top: 5,
                            right: 5,
                            width: 22,
                            height: 22,
                            borderRadius: 11,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: c.inverseBg,
                          }}
                        >
                          <Ionicons name="close" size={13} color={c.inverseFg} />
                        </SpringPressable>
                      </View>
                    ) : (
                      <SpringPressable
                        onPress={pickSeatPhoto}
                        disabled={!section.trim()}
                        haptic="none"
                        accessibilityRole="button"
                        accessibilityLabel="Snap the view from your seat"
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                          alignSelf: 'flex-start',
                          height: 40,
                          paddingHorizontal: 14,
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: c.line,
                          borderStyle: 'dashed',
                          backgroundColor: c.card2,
                          opacity: section.trim() ? 1 : 0.4,
                        }}
                      >
                        <Ionicons name="camera-outline" size={17} color={c.mute} />
                        <Text style={{ fontSize: 13, fontWeight: '600', color: c.mute }}>Snap the view from your seat</Text>
                      </SpringPressable>
                    )}
                  </View>
                </View>

                {/* Venue */}
                <View style={{ gap: 12 }}>
                  <Text
                    style={{
                      fontFamily: tokens.fontFamilies.mono,
                      fontSize: 10,
                      fontWeight: '600',
                      letterSpacing: 1.5,
                      textTransform: 'uppercase',
                      color: c.mute,
                    }}
                  >
                    {venueName || 'Venue'}
                  </Text>
                  <StarRow value={venueStars} onChange={setVenueStars} />
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 }}>
                    {VENUE_TAGS.map((t) => (
                      <MemoryChip
                        key={t.key}
                        label={t.label}
                        selected={venueTags.includes(t.key)}
                        onPress={() => toggleTag(t.key)}
                      />
                    ))}
                  </View>
                  <LogField
                    placeholder="One tip for the next person (optional)"
                    value={venueTip}
                    onChangeText={setVenueTip}
                    maxLength={140}
                    returnKeyType="done"
                  />
                </View>
              </View>
            ) : null}
          </View>

          {/* 5 · Visibility + live exposure line */}
          <MemoryCard eyebrow="Who sees this">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {VIS_OPTIONS.map((o) => (
                <MemoryChip
                  key={o.value}
                  label={o.label}
                  selected={visibility === o.value}
                  onPress={() => {
                    haptics.light();
                    setVisibility(o.value);
                  }}
                />
              ))}
            </View>
            <Text style={monoLineStyle}>{exposureLine(visibility)}</Text>
          </MemoryCard>

          {/* Footer */}
          <View style={{ gap: 12, marginTop: 4 }}>
            {errorMsg ? (
              <Text style={{ color: c.error, fontSize: 13, fontWeight: '400', textAlign: 'center' }}>{errorMsg}</Text>
            ) : null}

            {!showHasMedia ? (
              <Text style={{ color: c.muteSoft, fontSize: 12.5, fontWeight: '400', textAlign: 'center' }}>
                Add a photo or video from the show to post.
              </Text>
            ) : (
              <Text style={[monoLineStyle, { textAlign: 'center' }]}>{exposureLine(visibility)}</Text>
            )}

            <SpringPressable
              onPress={post}
              disabled={!canPost}
              haptic="medium"
              accessibilityRole="button"
              accessibilityLabel="Post memory"
              style={{
                height: 46,
                borderRadius: 999,
                backgroundColor: c.inverseBg,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                opacity: canPost ? 1 : 0.5,
              }}
            >
              {busy ? <ActivityIndicator size="small" color={c.inverseFg} /> : null}
              <Text style={{ color: c.inverseFg, fontSize: 15, fontWeight: '600' }}>
                {uploading ? 'Finishing uploads…' : posting ? 'Posting…' : 'Post memory'}
              </Text>
            </SpringPressable>

            <PillButton title="Skip" variant="ghost" size="lg" springFeedback onPress={skip} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <CoAuthorSheet
        visible={coAuthorSheetOpen}
        onClose={() => setCoAuthorSheetOpen(false)}
        currentUserId={user?.id}
        selectedIds={coAuthors.map((p) => p.id)}
        onConfirm={setCoAuthors}
      />
    </SafeAreaView>
  );
}

// Required (filled ink) / Optional (outlined, muted) section badge.
function SectionBadge({ text, required }: { text: string; required: boolean }) {
  const { tokens } = useTheme();
  const c = tokens.colors;
  return (
    <View
      style={{
        paddingHorizontal: 9,
        height: 22,
        borderRadius: 999,
        justifyContent: 'center',
        backgroundColor: required ? c.inverseBg : 'transparent',
        borderWidth: required ? 0 : 1,
        borderColor: c.line,
      }}
    >
      <Text
        style={{
          fontFamily: tokens.fontFamilies.mono,
          fontSize: 9.5,
          fontWeight: '600',
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          color: required ? c.inverseFg : c.mute,
        }}
      >
        {text}
      </Text>
    </View>
  );
}
