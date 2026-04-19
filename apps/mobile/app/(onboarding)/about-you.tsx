import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { ProgressDots } from '../../components/onboarding/ProgressDots';
import { Screen } from '../../components/ui/Screen';
import { colors, radius, spacing, accentSets, fontFamilies } from '../../lib/theme';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1));
const YEARS = Array.from({ length: 80 }, (_, i) => String(new Date().getFullYear() - 16 - i));

const ETHNICITY_OPTIONS = [
  'Asian',
  'Black/African',
  'Hispanic/Latino',
  'Middle Eastern/N.African',
  'Native/Indigenous',
  'Pacific Islander',
  'South Asian',
  'Southeast Asian',
  'White/European',
  'Multiracial',
  'Prefer not to say',
];

const PRONOUN_OPTIONS = ['she/her', 'he/him', 'they/them', 'she/they', 'he/they', 'other'];

// ---------------------------------------------------------------------------
// Chip
// ---------------------------------------------------------------------------

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        selected ? styles.chipSelected : styles.chipUnselected,
      ]}
    >
      {selected && <Text style={styles.chipCheck}>✓ </Text>}
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Picker dropdown
// ---------------------------------------------------------------------------

function InlinePicker({
  placeholder,
  options,
  value,
  onSelect,
  flex,
}: {
  placeholder: string;
  options: string[];
  value: string;
  onSelect: (v: string) => void;
  flex?: number;
}) {
  const [open, setOpen] = useState(false);
  const filled = value !== '';

  return (
    <View style={[{ flex: flex ?? 1 }]}>
      <Pressable
        style={[styles.picker, filled && styles.pickerFilled]}
        onPress={() => setOpen((o) => !o)}
      >
        <Text style={[styles.pickerText, !filled && { color: colors.textLo }]}>
          {filled ? value : placeholder}
        </Text>
        <Text style={{ color: colors.textLo, fontSize: 10 }}>{open ? '▲' : '▼'}</Text>
      </Pressable>

      {open && (
        <ScrollView style={styles.dropdown} nestedScrollEnabled>
          {options.map((opt) => (
            <Pressable
              key={opt}
              style={styles.dropdownItem}
              onPress={() => {
                onSelect(opt);
                setOpen(false);
              }}
            >
              <Text style={[styles.dropdownText, opt === value && { color: accentSets.cyan.hex }]}>
                {opt}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function AboutYouScreen() {
  const router = useRouter();

  // Birthday
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [year, setYear] = useState('');

  // Location
  const [location, setLocation] = useState('');
  const [locationFocused, setLocationFocused] = useState(false);

  // Ethnicity (multi-select)
  const [ethnicities, setEthnicities] = useState<string[]>([]);

  // Optional section
  const [showOptional, setShowOptional] = useState(false);
  const [pronouns, setPronouns] = useState<string | null>(null);
  const [education, setEducation] = useState('');
  const [work, setWork] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);

  // Validation
  const canContinue = month !== '' && day !== '' && year !== '' && location.trim() !== '' && ethnicities.length > 0;

  const toggleEthnicity = (e: string) => {
    setEthnicities((prev) =>
      prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]
    );
  };

  const handleContinue = () => {
    // TODO: persist about-you data to store / API
    router.push('/(onboarding)/connect-spotify');
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: spacing.lg, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Progress */}
          <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
            <ProgressDots total={6} current={1} />
          </View>

          {/* Title */}
          <Text style={styles.title}>About you.</Text>
          <Text style={styles.subtitle}>
            A few basics. Kept private — used to match you with compatible people.
          </Text>

          {/* Birthday */}
          <Text style={styles.sectionLabel}>Birthday</Text>
          <View style={styles.pickerRow}>
            <InlinePicker placeholder="Month" options={MONTHS} value={month} onSelect={setMonth} flex={1.5} />
            <InlinePicker placeholder="Day" options={DAYS} value={day} onSelect={setDay} />
            <InlinePicker placeholder="Year" options={YEARS} value={year} onSelect={setYear} flex={1.2} />
          </View>

          {/* Location */}
          <Text style={styles.sectionLabel}>Location</Text>
          <View style={[styles.textInputWrap, locationFocused && styles.textInputFocused]}>
            <TextInput
              style={styles.textInput}
              placeholder="City, State or Country"
              placeholderTextColor={colors.textLo}
              selectionColor={accentSets.cyan.hex}
              value={location}
              onChangeText={setLocation}
              onFocus={() => setLocationFocused(true)}
              onBlur={() => setLocationFocused(false)}
              returnKeyType="done"
            />
          </View>

          {/* Ethnicity */}
          <Text style={styles.sectionLabel}>Ethnicity</Text>
          <View style={styles.chipWrap}>
            {ETHNICITY_OPTIONS.map((e) => (
              <Chip key={e} label={e} selected={ethnicities.includes(e)} onPress={() => toggleEthnicity(e)} />
            ))}
          </View>

          {/* Optional section */}
          <Pressable style={styles.addMoreButton} onPress={() => setShowOptional((o) => !o)}>
            <Text style={styles.addMoreText}>{showOptional ? '− HIDE EXTRAS' : '+ ADD MORE'}</Text>
          </Pressable>

          {showOptional && (
            <View style={{ gap: spacing.lg }}>
              {/* Pronouns */}
              <View>
                <Text style={styles.sectionLabel}>Pronouns</Text>
                <View style={styles.chipWrap}>
                  {PRONOUN_OPTIONS.map((p) => (
                    <Chip
                      key={p}
                      label={p}
                      selected={pronouns === p}
                      onPress={() => setPronouns(pronouns === p ? null : p)}
                    />
                  ))}
                </View>
              </View>

              {/* Education */}
              <View>
                <Text style={styles.sectionLabel}>Education</Text>
                <View style={styles.textInputWrap}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="School or degree"
                    placeholderTextColor={colors.textLo}
                    selectionColor={accentSets.cyan.hex}
                    value={education}
                    onChangeText={setEducation}
                    returnKeyType="done"
                  />
                </View>
              </View>

              {/* Work */}
              <View>
                <Text style={styles.sectionLabel}>Work</Text>
                <View style={styles.textInputWrap}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Job title or company"
                    placeholderTextColor={colors.textLo}
                    selectionColor={accentSets.cyan.hex}
                    value={work}
                    onChangeText={setWork}
                    returnKeyType="done"
                  />
                </View>
              </View>

              {/* Languages */}
              <View>
                <Text style={styles.sectionLabel}>Languages</Text>
                <View style={styles.textInputWrap}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Type and press enter"
                    placeholderTextColor={colors.textLo}
                    selectionColor={accentSets.cyan.hex}
                    returnKeyType="done"
                    onSubmitEditing={(e) => {
                      const val = e.nativeEvent.text.trim();
                      if (val && !languages.includes(val)) {
                        setLanguages((prev) => [...prev, val]);
                      }
                      // Clear isn't easily done with uncontrolled; keep it controlled
                    }}
                  />
                </View>
                {languages.length > 0 && (
                  <View style={[styles.chipWrap, { marginTop: 8 }]}>
                    {languages.map((lang) => (
                      <Chip
                        key={lang}
                        label={lang}
                        selected
                        onPress={() => setLanguages((prev) => prev.filter((l) => l !== lang))}
                      />
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Privacy notice */}
          <Text style={styles.privacyNotice}>
            🔒 We never show this publicly. Used for match signals only.
          </Text>

          {/* Continue */}
          <Pressable
            style={[styles.continueButton, !canContinue && styles.continueDisabled]}
            disabled={!canContinue}
            onPress={handleContinue}
          >
            <Text style={styles.continueText}>Continue</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  title: {
    fontFamily: fontFamilies.display,
    fontSize: 38,
    fontWeight: '700',
    color: colors.textHi,
    letterSpacing: -0.8,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMid,
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMid,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Pickers
  pickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.lg,
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  pickerFilled: {
    borderColor: accentSets.cyan.line,
  },
  pickerText: {
    fontSize: 14,
    color: colors.textHi,
  },
  dropdown: {
    maxHeight: 180,
    backgroundColor: colors.ink,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  dropdownText: {
    fontSize: 14,
    color: colors.textHi,
  },

  // Text inputs
  textInputWrap: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    marginBottom: spacing.lg,
  },
  textInputFocused: {
    borderColor: accentSets.cyan.line,
  },
  textInput: {
    height: 48,
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.textHi,
  },

  // Chips
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.lg,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  chipSelected: {
    backgroundColor: accentSets.cyan.hex,
  },
  chipUnselected: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.textHi,
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  chipCheck: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Optional toggle
  addMoreButton: {
    marginBottom: spacing.lg,
  },
  addMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: accentSets.cyan.hex,
  },

  // Privacy
  privacyNotice: {
    fontSize: 11,
    color: colors.textLo,
    textAlign: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },

  // Continue
  continueButton: {
    backgroundColor: accentSets.cyan.hex,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueDisabled: {
    opacity: 0.4,
  },
  continueText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
});
