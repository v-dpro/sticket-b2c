// CityConfirmChip — A2: city folded into the radar as a small inline confirm
// chip ("LA · CHANGE"), no dedicated blocking screen. Uses the profile city
// when set (inferred), else opens a one-tap city picker sheet that reuses the
// set-city input logic (store setCity + best-effort profile persist).
// Skipping city is allowed — the chip is never a gate.

import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { updateProfile } from '../../lib/api/profile';
import { haptics } from '../../lib/motion';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { useSession } from '../../hooks/useSession';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { PillButton } from '../ui/PillButton';
import { SpringPressable } from '../ui/SpringPressable';

export function CityConfirmChip() {
  const { tokens } = useTheme();
  const { profile } = useSession();
  const storeCity = useOnboardingStore((s) => s.city);
  const setCity = useOnboardingStore((s) => s.setCity);

  // Inferred: onboarding store first (a fresh confirm), else profile.
  const city = storeCity ?? profile?.city ?? null;

  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const trimmed = value.trim();

  const styles = useThemedStyles((t) => ({
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      alignSelf: 'flex-start',
      height: 32,
      paddingHorizontal: 13,
      borderRadius: t.radius.full,
      backgroundColor: t.colors.card2,
      borderWidth: 1,
      borderColor: t.colors.hairline,
    },
    chipCity: { fontSize: 13, fontWeight: '600', color: t.colors.fg },
    chipUnset: { fontSize: 13, fontWeight: '600', color: t.colors.mute },
    chipAction: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 9,
      fontWeight: '600',
      letterSpacing: 1.2,
      color: t.colors.mute,
    },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: {
      backgroundColor: t.colors.bg,
      borderTopLeftRadius: t.radius.xl,
      borderTopRightRadius: t.radius.xl,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      paddingHorizontal: t.density.pad,
      paddingTop: 18,
      paddingBottom: 28,
      gap: 10,
    },
    grabber: {
      alignSelf: 'center',
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: t.colors.line,
      marginBottom: 8,
    },
    sheetTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4, color: t.colors.fg },
    sheetSub: { fontSize: 14, fontWeight: '400', color: t.colors.mute, lineHeight: 20, marginBottom: 6 },
    field: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      height: 54,
      paddingHorizontal: 14,
      borderRadius: t.radius.lg,
      borderWidth: 1,
      borderColor: t.colors.line,
      backgroundColor: t.colors.card,
    },
    fieldFocused: { borderColor: t.colors.accent },
    input: { flex: 1, fontSize: 16, fontWeight: '500', color: t.colors.fg, padding: 0 },
    buttons: { gap: 10, marginTop: 6 },
  }));

  const openSheet = () => {
    setValue(city ?? '');
    setOpen(true);
  };

  const save = () => {
    if (!trimmed) return;
    setCity(trimmed);
    // Server persist is a nice-to-have; the store already carries the city.
    void updateProfile({ city: trimmed }).catch(() => {});
    haptics.light();
    setOpen(false);
  };

  return (
    <>
      <SpringPressable
        onPress={openSheet}
        haptic="light"
        accessibilityRole="button"
        accessibilityLabel={city ? `Your city is ${city}. Change city` : 'Set your city'}
        style={styles.chip}
      >
        <Ionicons name="location-outline" size={14} color={tokens.colors.mute} />
        {city ? (
          <>
            <Text style={styles.chipCity} numberOfLines={1}>
              {city}
            </Text>
            <Text style={styles.chipAction}>· CHANGE</Text>
          </>
        ) : (
          <>
            <Text style={styles.chipUnset}>Set your city</Text>
            <Text style={styles.chipAction}>· OPTIONAL</Text>
          </>
        )}
      </SpringPressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1, justifyContent: 'flex-end' }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable
            style={styles.backdrop}
            accessibilityRole="button"
            accessibilityLabel="Close city picker"
            onPress={() => setOpen(false)}
          />
          <View style={styles.sheet}>
            <View style={styles.grabber} />
            <Text style={styles.sheetTitle}>Where do you catch shows?</Text>
            <Text style={styles.sheetSub}>
              We use your city to surface nearby shows and local presales. Optional.
            </Text>
            <View style={[styles.field, focused && styles.fieldFocused]}>
              <Ionicons name="location-outline" size={20} color={tokens.colors.mute} />
              <TextInput
                style={styles.input}
                placeholder="City"
                placeholderTextColor={tokens.colors.textLo}
                selectionColor={tokens.colors.accent}
                value={value}
                onChangeText={setValue}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                autoFocus
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={save}
              />
            </View>
            <View style={styles.buttons}>
              <PillButton
                title="Save city"
                size="lg"
                springFeedback
                haptic="light"
                disabled={!trimmed}
                onPress={save}
              />
              <PillButton
                title="Not now"
                variant="ghost"
                size="lg"
                springFeedback
                onPress={() => setOpen(false)}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
