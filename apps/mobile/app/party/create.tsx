// Host a party — modal-feel creation form pushed from the event page's
// PARTIES section. Title (required), location, optional date/time,
// description, PUBLIC/INVITE visibility chips → POST /events/:id/parties,
// then replaces to the new party page.

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PillButton } from '../../components/ui/PillButton';
import { SpringPressable } from '../../components/ui/SpringPressable';
import { createParty, type PartyVisibility } from '../../lib/api/parties';
import { haptics } from '../../lib/motion';
import { useSafeBack } from '../../lib/navigation/safeNavigation';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

/** Date → "Sat, Jul 18 · 9:30 PM" for the picker row. */
function formatStartsAt(d: Date): string {
  const day = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${day} · ${time}`;
}

export default function CreatePartyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const goBack = useSafeBack();
  const { tokens } = useTheme();
  const params = useLocalSearchParams<{
    eventId: string;
    eventName?: string;
    eventDate?: string;
  }>();
  const eventId = params.eventId ? String(params.eventId) : '';
  const eventName = params.eventName ? String(params.eventName) : '';
  const eventDate = params.eventDate ? String(params.eventDate) : '';

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<PartyVisibility>('PUBLIC');
  const [startsAt, setStartsAt] = useState<Date | null>(null);
  // iOS shows one inline datetime spinner; Android chains date → time dialogs.
  const [pickerStage, setPickerStage] = useState<'closed' | 'date' | 'time'>('closed');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = title.trim().length > 0 && !submitting;

  // Seed the picker from the show date so hosts land near the right night.
  const seedDate = () => {
    if (startsAt) return startsAt;
    const seed = eventDate ? new Date(eventDate) : new Date();
    return Number.isNaN(seed.getTime()) ? new Date() : seed;
  };

  const openPicker = () => {
    if (!startsAt) setStartsAt(seedDate());
    setPickerStage('date');
  };

  const handleAndroidDate = (date?: Date) => {
    if (!date) {
      setPickerStage('closed');
      return;
    }
    setStartsAt((prev) => {
      const next = new Date(prev ?? seedDate());
      next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      return next;
    });
    setPickerStage('time');
  };

  const handleAndroidTime = (date?: Date) => {
    setPickerStage('closed');
    if (!date) return;
    setStartsAt((prev) => {
      const next = new Date(prev ?? seedDate());
      next.setHours(date.getHours(), date.getMinutes(), 0, 0);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!canSubmit || !eventId) return;
    setSubmitting(true);
    setError(null);
    try {
      const party = await createParty(eventId, {
        title: title.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        startsAt: startsAt ? startsAt.toISOString() : undefined,
        visibility,
      });
      haptics.success();
      router.replace({
        pathname: '/party/[id]',
        params: { id: party.id, eventName },
      });
    } catch {
      haptics.error();
      setError("Couldn't create the party — try again.");
      setSubmitting(false);
    }
  };

  const styles = useThemedStyles((t) => ({
    screen: { flex: 1, backgroundColor: t.colors.bg },
    grabber: {
      alignSelf: 'center',
      width: 38,
      height: 4,
      borderRadius: 2,
      backgroundColor: t.colors.line,
      marginTop: 8,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingHorizontal: t.density.pad,
      paddingTop: 8,
      paddingBottom: 4,
    },
    cancelButton: {
      minWidth: 36,
      height: 36,
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    cancelText: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
    },
    content: { paddingHorizontal: t.density.pad },
    eyebrow: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 11,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      color: t.colors.mute,
      marginTop: 10,
    },
    title: {
      fontSize: 24,
      fontWeight: '800',
      letterSpacing: -0.4,
      color: t.colors.fg,
      marginTop: 6,
      lineHeight: 29,
    },
    fieldLabel: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 11,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      color: t.colors.mute,
      marginTop: 24,
      marginBottom: 10,
    },
    input: {
      backgroundColor: t.colors.card,
      borderRadius: t.radius.md,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: t.colors.fg,
    },
    multiline: { height: 96, textAlignVertical: 'top' },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: t.colors.card,
      borderRadius: t.radius.md,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    dateValue: { fontSize: 16, color: t.colors.fg },
    datePlaceholder: { fontSize: 16, color: t.colors.muteSoft },
    clearRow: { alignSelf: 'flex-start', marginTop: 8 },
    clearText: { fontSize: 13, fontWeight: '600', color: t.colors.mute },
    pickerWrap: { alignItems: 'center', marginTop: 8, gap: 8 },
    chipRow: { flexDirection: 'row', gap: 10 },
    chip: {
      height: 34,
      paddingHorizontal: 16,
      borderRadius: t.radius.full,
      backgroundColor: t.colors.card2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipActive: { backgroundColor: t.colors.inverseBg },
    chipText: { fontSize: 13, fontWeight: '600', color: t.colors.mute },
    chipTextActive: { color: t.colors.inverseFg },
    visibilityHint: { fontSize: 12.5, color: t.colors.mute, marginTop: 10, lineHeight: 18 },
    error: { fontSize: 13, color: t.colors.error, marginTop: 16 },
    footer: {
      paddingHorizontal: t.density.pad,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: t.colors.hairline,
      backgroundColor: t.colors.bg,
    },
  }));

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />

      <View style={{ paddingTop: insets.top }}>
        {/* No top-left X — the modal dismisses with swipe-down (grabber hints
            it); Cancel keeps an explicit abandon-the-draft affordance. */}
        <View style={styles.grabber} />
        <View style={styles.header}>
          <SpringPressable
            onPress={goBack}
            haptic="light"
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            style={styles.cancelButton}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </SpringPressable>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          <View style={styles.content}>
            <Text style={styles.eyebrow}>Host a party</Text>
            {eventName ? (
              <Text style={styles.title} numberOfLines={2}>
                {eventName}
              </Text>
            ) : null}

            <Text style={styles.fieldLabel}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="Pre-show drinks, afters…"
              placeholderTextColor={tokens.colors.muteSoft}
              value={title}
              onChangeText={setTitle}
              maxLength={80}
              returnKeyType="next"
            />

            <Text style={styles.fieldLabel}>Location</Text>
            <TextInput
              style={styles.input}
              placeholder="Bar, address, meeting spot (optional)"
              placeholderTextColor={tokens.colors.muteSoft}
              value={location}
              onChangeText={setLocation}
            />

            <Text style={styles.fieldLabel}>Date & time</Text>
            <SpringPressable
              haptic="light"
              onPress={openPicker}
              accessibilityRole="button"
              accessibilityLabel="Pick a date and time"
              style={styles.dateRow}
            >
              {startsAt ? (
                <Text style={styles.dateValue}>{formatStartsAt(startsAt)}</Text>
              ) : (
                <Text style={styles.datePlaceholder}>Add a date & time (optional)</Text>
              )}
              <Ionicons name="calendar-outline" size={18} color={tokens.colors.mute} />
            </SpringPressable>
            {startsAt && pickerStage === 'closed' ? (
              <SpringPressable
                haptic="light"
                onPress={() => setStartsAt(null)}
                accessibilityRole="button"
                accessibilityLabel="Clear date and time"
                style={styles.clearRow}
              >
                <Text style={styles.clearText}>Clear</Text>
              </SpringPressable>
            ) : null}

            {pickerStage !== 'closed' && Platform.OS === 'ios' ? (
              <View style={styles.pickerWrap}>
                <DateTimePicker
                  value={startsAt ?? seedDate()}
                  mode="datetime"
                  display="spinner"
                  onChange={(_, date) => {
                    if (date) setStartsAt(date);
                  }}
                />
                <PillButton
                  title="Done"
                  variant="secondary"
                  size="sm"
                  springFeedback
                  haptic="light"
                  onPress={() => setPickerStage('closed')}
                />
              </View>
            ) : null}
            {pickerStage === 'date' && Platform.OS !== 'ios' ? (
              <DateTimePicker
                value={startsAt ?? seedDate()}
                mode="date"
                onChange={(_, date) => handleAndroidDate(date)}
              />
            ) : null}
            {pickerStage === 'time' && Platform.OS !== 'ios' ? (
              <DateTimePicker
                value={startsAt ?? seedDate()}
                mode="time"
                onChange={(_, date) => handleAndroidTime(date)}
              />
            ) : null}

            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="What's the plan? (optional)"
              placeholderTextColor={tokens.colors.muteSoft}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              maxLength={500}
            />

            <Text style={styles.fieldLabel}>Visibility</Text>
            <View style={styles.chipRow}>
              <SpringPressable
                haptic="light"
                onPress={() => setVisibility('PUBLIC')}
                accessibilityRole="button"
                accessibilityLabel="Public party"
                accessibilityState={{ selected: visibility === 'PUBLIC' }}
                style={[styles.chip, visibility === 'PUBLIC' && styles.chipActive]}
              >
                <Text
                  style={[styles.chipText, visibility === 'PUBLIC' && styles.chipTextActive]}
                >
                  Public
                </Text>
              </SpringPressable>
              <SpringPressable
                haptic="light"
                onPress={() => setVisibility('INVITE')}
                accessibilityRole="button"
                accessibilityLabel="Invite only party"
                accessibilityState={{ selected: visibility === 'INVITE' }}
                style={[styles.chip, visibility === 'INVITE' && styles.chipActive]}
              >
                <Text
                  style={[styles.chipText, visibility === 'INVITE' && styles.chipTextActive]}
                >
                  Invite only
                </Text>
              </SpringPressable>
            </View>
            <Text style={styles.visibilityHint}>
              {visibility === 'PUBLIC'
                ? 'Anyone at this show can find the party and request to join — you approve who gets in.'
                : 'Hidden from the event page. Only people you invite can see it.'}
            </Text>

            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          {submitting ? (
            <View style={{ height: 46, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="small" color={tokens.colors.mute} />
            </View>
          ) : (
            <PillButton
              title="Create party"
              variant="primary"
              size="lg"
              springFeedback
              haptic="medium"
              disabled={!canSubmit}
              onPress={() => void handleCreate()}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
